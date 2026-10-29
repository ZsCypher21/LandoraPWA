import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pill, VERIFICATION } from "@/components/console/Pill";
import { ListingCard } from "@/components/ListingCard";
import { FollowButton } from "@/components/social/FollowButton";
import { verificationOf } from "@/lib/console";
import { agencies, agents, publishedListings, toSummary } from "@/lib/data";
import { can } from "@/lib/roles";
import { currentViewer } from "@/lib/session";
import { isFollowing, publicQuestions } from "@/lib/social";
import { publishedScopes, socialStore } from "@/lib/social-store";

type Params = { params: Promise<{ agentId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { agentId } = await params;
  const a = agents().find((x) => x.id === agentId);
  return { title: a ? `${a.fullName} (preview)` : "Agent" };
}

/** A professional's public profile (SOC-P5). Agents advertise, so this is public; buyers' profiles are not. */
export default async function ProfessionalPage({ params }: Params) {
  const { agentId } = await params;
  const agent = agents().find((a) => a.id === agentId);
  if (!agent) notFound();
  const viewer = await currentViewer();
  const store = socialStore();
  const agency = agencies().find((x) => x.id === agent.agencyId);
  const status = VERIFICATION[verificationOf(agent.id)] ?? VERIFICATION.pending!;
  const theirs = new Set(publishedScopes().filter((r) => r.agentIds.includes(agent.id)).map((r) => r.id));
  const listings = publishedListings().filter((l) => theirs.has(l.id));
  const answered = publicQuestions(store).filter((q) => q.answer?.agentId === agent.id).length;
  const following = can(viewer.role, "social.follow") && isFollowing(store, viewer.persona?.userId ?? "", "agent", agent.id);

  return (
    <div className="flex flex-col gap-8">
      <Link href="/hub" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
        <span aria-hidden="true">←</span> Hub
      </Link>
      <header className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-800 font-display text-2xl font-bold text-white" aria-hidden="true">
            {agent.fullName.charAt(0)}
          </span>
          <div>
            <p className="eyebrow">Agent</p>
            <h1 className="mt-0.5 text-2xl font-extrabold">{agent.fullName}</h1>
            <p className="text-sm text-muted">{agency?.name ?? "Agency not listed"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill tone={status.tone}>{status.label}</Pill>
              <Pill tone="neutral">Synthetic agent</Pill>
            </div>
          </div>
        </div>
        <FollowButton kind="agent" targetId={agent.id} label={agent.fullName} following={following} />
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="card p-4">
          <dt className="text-xs text-muted">Homes on Landora</dt>
          <dd className="font-display text-2xl font-extrabold">{listings.length}</dd>
        </div>
        <div className="card p-4">
          <dt className="text-xs text-muted">Buyer questions answered</dt>
          <dd className="font-display text-2xl font-extrabold">{answered}</dd>
        </div>
      </dl>

      <section aria-labelledby="pro-listings" className="flex flex-col gap-3">
        <h2 id="pro-listings" className="text-xl font-bold">
          Homes from {agent.fullName.split(" ")[0]}
        </h2>
        {listings.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">No homes on Landora right now.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.slice(0, 6).map((l) => (
              <li key={l.id}>
                <ListingCard listing={toSummary(l)} surface="agent_profile" />
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-muted">The verified badge reflects the licence check (FR-AGT-001). Profiles for builders, brokers and other industry members arrive in phase two.</p>
    </div>
  );
}
