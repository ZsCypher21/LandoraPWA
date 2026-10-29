import type { Metadata } from "next";
import Link from "next/link";
import { PageGuard } from "@/components/PageGuard";
import { FollowButton } from "@/components/social/FollowButton";
import { agents, listingById, suburbs } from "@/lib/data";
import { currentViewer } from "@/lib/session";
import { defaultPrefs, followsOf, type Follow, type FollowKind } from "@/lib/social";
import { socialStore } from "@/lib/social-store";
import { PrefsForm } from "./PrefsForm";

export const metadata: Metadata = { title: "Following (preview)" };

export default function FollowingPage() {
  return (
    <PageGuard path="/hub/following" signIn={{ title: "Sign in to follow suburbs and homes", body: "Follow suburbs, homes and agents to get updates in your hub feed." }}>
      <Following />
    </PageGuard>
  );
}

interface Row {
  follow: Follow;
  label: string;
  detail: string;
  href: string;
}

function resolve(f: Follow): Row | null {
  if (f.kind === "suburb") {
    const s = suburbs().find((x) => x.id === f.targetId);
    return s ? { follow: f, label: s.name, detail: `QLD ${s.postcode}`, href: `/hub/${s.id}` } : null;
  }
  if (f.kind === "listing") {
    const l = listingById(f.targetId);
    // A home that's been unpublished drops out of the list rather than linking to nothing.
    return l ? { follow: f, label: l.displayAddress, detail: l.headline, href: `/listing/${l.id}` } : null;
  }
  const a = agents().find((x) => x.id === f.targetId);
  return a ? { follow: f, label: a.fullName, detail: "Agent", href: `/hub/pro/${a.id}` } : null;
}

const GROUPS: { kind: FollowKind; title: string; empty: string }[] = [
  { kind: "suburb", title: "Suburbs", empty: "Follow a suburb from the hub to get its weekly wrap." },
  { kind: "listing", title: "Homes", empty: "Follow a home from its listing page to hear about price, status and open-home changes." },
  { kind: "agent", title: "Agents", empty: "Follow an agent from their profile to see their new listings." },
];

async function Following() {
  const viewer = await currentViewer();
  const store = socialStore();
  const userId = viewer.persona!.userId;
  const rows = followsOf(store, userId).flatMap((f) => resolve(f) ?? []);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="eyebrow">Following</p>
        <h1 className="mt-1 text-3xl font-extrabold">What you follow</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Only you can see this list. Agents never see who follows their listings, and we don't use it for ads. The prototype starts with a few sample follows so the feed has something to show; real accounts start with none.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {GROUPS.map((g) => {
          const items = rows.filter((r) => r.follow.kind === g.kind);
          return (
            <section key={g.kind} aria-labelledby={`f-${g.kind}`} className="card p-5">
              <h2 id={`f-${g.kind}`} className="text-lg font-bold">
                {g.title} <span className="text-sm font-normal text-muted">({items.length})</span>
              </h2>
              {items.length === 0 ? (
                <p className="mt-2 text-sm text-muted">{g.empty}</p>
              ) : (
                <ul className="mt-2 divide-y divide-line">
                  {items.map((r) => (
                    <li key={r.follow.targetId} className="flex items-center justify-between gap-3 py-3">
                      <Link href={r.href} className="min-w-0">
                        <span className="block truncate font-semibold hover:text-brand-700">{r.label}</span>
                        <span className="block truncate text-xs text-muted">{r.detail}</span>
                      </Link>
                      <FollowButton kind={r.follow.kind} targetId={r.follow.targetId} label={r.label} following />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section aria-labelledby="notify-title" className="flex flex-col gap-3">
        <div>
          <h2 id="notify-title" className="text-xl font-bold">
            Notifications
          </h2>
          <p className="mt-0.5 text-sm text-muted">Email and push are off until you turn them on. Marketing is off everywhere by default. Push is a setting only in the prototype: nothing is sent.</p>
        </div>
        <PrefsForm initial={store.prefs.get(userId) ?? defaultPrefs()} />
      </section>
    </div>
  );
}
