import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowButton } from "@/components/social/FollowButton";
import { PostCard } from "@/components/social/PostCard";
import { QuestionItem } from "@/components/social/QuestionItem";
import { AS_OF, publishedListings, suburbs } from "@/lib/data";
import { aud } from "@/lib/format";
import { can } from "@/lib/roles";
import { currentViewer } from "@/lib/session";
import { isFollowing, publicQuestions, visiblePosts } from "@/lib/social";
import { socialStore, suburbSnapshot } from "@/lib/social-store";

type Params = { params: Promise<{ suburbId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { suburbId } = await params;
  const s = suburbs().find((x) => x.id === suburbId);
  return { title: s ? `${s.name} hub (preview)` : "Suburb hub" };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-display text-2xl font-extrabold">{value}</dd>
    </div>
  );
}

export default async function SuburbHubPage({ params }: Params) {
  const { suburbId } = await params;
  const suburb = suburbs().find((s) => s.id === suburbId);
  if (!suburb) notFound();
  const viewer = await currentViewer();
  const store = socialStore();
  const snap = suburbSnapshot(suburb.id);
  const posts = visiblePosts(store, suburb.id);
  const listings = new Map(publishedListings().filter((l) => l.suburbId === suburb.id).map((l) => [l.id, l]));
  const qa = publicQuestions(store).filter((q) => listings.has(q.listingId));
  const following = can(viewer.role, "social.follow") && isFollowing(store, viewer.persona?.userId ?? "", "suburb", suburb.id);

  return (
    <div className="flex flex-col gap-8">
      <Link href="/hub" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        <span aria-hidden="true">←</span> All suburb hubs
      </Link>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Suburb hub</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{suburb.name}</h1>
          <p className="mt-1 text-muted">QLD {suburb.postcode} · Sunshine Coast pilot</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FollowButton kind="suburb" targetId={suburb.id} label={suburb.name} following={following} />
          <Link href={`/search?suburb=${encodeURIComponent(suburb.name)}`} className="btn btn-primary min-h-10 px-4">
            See homes in {suburb.name}
          </Link>
        </div>
      </header>

      <section aria-labelledby="snapshot-title">
        <h2 id="snapshot-title" className="sr-only">
          Snapshot
        </h2>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="For sale" value={String(snap.forSale)} />
          <Stat label="For rent" value={String(snap.forRent)} />
          <Stat label="Open homes listed" value={String(snap.openHomes)} />
          <Stat label="Median displayed asking price" value={snap.medianAskingAud ? aud(snap.medianAskingAud) : "Not enough data"} />
        </dl>
        <p className="mt-2 text-xs text-muted">
          Counted from synthetic listings as of {AS_OF}. The median uses only the {snap.pricedCount} homes that show a price, so treat it as a rough guide, not a valuation.
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="posts-title" className="flex flex-col gap-3">
          <h2 id="posts-title" className="text-xl font-bold">
            From the hub
          </h2>
          {posts.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="font-semibold">No posts yet</p>
              <p className="mt-1 text-sm text-muted">The weekly market wrap for {suburb.name} appears here every Friday.</p>
            </div>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} />)
          )}
          <p className="text-xs text-muted">
            Hub posts come only from Landora and approved founding creators. Comments are off in this version, so there's nothing to wade through and nothing unchecked.
          </p>
        </section>

        <section aria-labelledby="qa-title" className="flex flex-col gap-3">
          <h2 id="qa-title" className="text-xl font-bold">
            Buyers asked agents
          </h2>
          <div className="card px-5">
            {qa.length === 0 ? (
              <p className="py-5 text-sm text-muted">No answered questions on {suburb.name} homes yet. Ask the agent from any listing page.</p>
            ) : (
              <ul className="divide-y divide-line">
                {qa.map((q) => (
                  <QuestionItem key={q.id} q={q} listingLabel={{ href: `/listing/${q.listingId}#questions`, text: listings.get(q.listingId)!.displayAddress }} />
                ))}
              </ul>
            )}
          </div>
          <p className="text-xs text-muted">Questions are about a specific home and are answered by its agent. Ask from the listing page.</p>
        </section>
      </div>
    </div>
  );
}
