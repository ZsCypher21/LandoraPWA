import type { Metadata } from "next";
import Link from "next/link";
import { FollowButton } from "@/components/social/FollowButton";
import { PostCard } from "@/components/social/PostCard";
import { suburbs } from "@/lib/data";
import { can } from "@/lib/roles";
import { currentViewer } from "@/lib/session";
import { followsOf, isFollowing, visiblePosts } from "@/lib/social";
import { feedFor, socialStore, suburbSnapshot, type FeedItem } from "@/lib/social-store";

export const metadata: Metadata = { title: "Community hub (preview)" };

const FEED_ICON: Record<FeedItem["kind"], string> = {
  post: "M4 4h16v12H5.2L4 17.2zm2 3v2h12V7zm0 4v2h8v-2z",
  inspection: "M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zm-2 8h14v10H5z",
  answer: "M12 3C6.5 3 2 6.6 2 11c0 2.2 1.1 4.2 3 5.6V21l4.1-2.3c.9.2 1.9.3 2.9.3 5.5 0 10-3.6 10-8s-4.5-8-10-8z",
  listing: "M12 3 2 11h3v9h5v-6h4v6h5v-9h3z",
};

function Feed({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="font-semibold">Your feed is empty</p>
        <p className="mt-1 text-sm text-muted">Follow a suburb below, or a home from its listing page, and updates will appear here.</p>
      </div>
    );
  }
  return (
    <ol className="card divide-y divide-line">
      {items.slice(0, 8).map((i) => (
        <li key={i.id}>
          <Link href={i.href} className="flex gap-3 p-4 transition hover:bg-brand-50/50">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor">
                <path d={FEED_ICON[i.kind]} />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-medium text-muted">{i.context}</span>
              <span className="block font-semibold leading-snug">{i.title}</span>
              <span className="mt-0.5 block truncate text-sm text-muted">{i.body}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default async function HubPage() {
  const viewer = await currentViewer();
  const store = socialStore();
  const userId = viewer.persona?.userId ?? "";
  const isBuyer = can(viewer.role, "social.follow");
  const list = suburbs();
  const names = new Map(list.map((s) => [s.id, s.name]));
  const latest = visiblePosts(store).filter((p) => p.kind === "market_wrap").slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="eyebrow">Community hub</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">What's happening in your suburbs</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Weekly market wraps, what buyers are saving and local tips, checked by Landora before they appear. Follow suburbs and homes to get updates. There are no open comments: questions go to the agent on each listing.
        </p>
      </header>

      {isBuyer && (
        <section aria-labelledby="feed-title" className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-2">
            <h2 id="feed-title" className="text-xl font-bold">
              Your feed
            </h2>
            <Link href="/hub/following" className="text-sm font-semibold text-brand-700 hover:underline">
              Manage {followsOf(store, userId).length} follows
            </Link>
          </div>
          <Feed items={feedFor(userId)} />
        </section>
      )}

      <section aria-labelledby="suburbs-title" className="flex flex-col gap-3">
        <h2 id="suburbs-title" className="text-xl font-bold">
          Suburb hubs
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const snap = suburbSnapshot(s.id);
            return (
              <li key={s.id} className="card flex items-center justify-between gap-3 p-4">
                <Link href={`/hub/${s.id}`} className="min-w-0 rounded-lg">
                  <span className="block font-display text-lg font-bold hover:text-brand-700">{s.name}</span>
                  <span className="block text-xs text-muted">
                    {s.postcode} · {snap.forSale} for sale · {snap.openHomes} open homes
                  </span>
                </Link>
                <FollowButton kind="suburb" targetId={s.id} label={s.name} following={isBuyer && isFollowing(store, userId, "suburb", s.id)} />
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="latest-title" className="flex flex-col gap-3">
        <h2 id="latest-title" className="text-xl font-bold">
          Latest market wraps
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {latest.map((p) => (
            <PostCard key={p.id} post={p} suburbName={names.get(p.suburbId)} />
          ))}
        </div>
      </section>
    </div>
  );
}
