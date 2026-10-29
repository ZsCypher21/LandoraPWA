import type { Metadata } from "next";
import Link from "next/link";
import { Empty, PUBLICATION, Pill, Section, VERIFICATION } from "@/components/console/Pill";
import { FeedRuns } from "@/components/console/FeedRuns";
import { PublishControls } from "@/components/console/PublishControls";
import { PageGuard } from "@/components/PageGuard";
import { agentConsoleData, type ConsoleListing } from "@/lib/console";
import { feedStamp, longDate, priceLabel } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";
import { currentViewer } from "@/lib/session";

export const metadata: Metadata = { title: "Agent console" };

const FILTERS = [
  { key: "action", label: "Needs action" },
  { key: "published", label: "Published" },
  { key: "all", label: "All" },
] as const;
type Filter = (typeof FILTERS)[number]["key"];
const PAGE = 20;

type Props = { searchParams: Promise<{ show?: string; all?: string }> };

export default async function AgentPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter: Filter = FILTERS.some((f) => f.key === params.show) ? (params.show as Filter) : "all";
  return (
    <PageGuard path="/agent" signIn={{ title: "Sign in to the agent console", body: "Agents and agency admins manage licence verification, feeds and listings here." }}>
      <AgentConsole filter={filter} showAll={params.all === "1"} />
    </PageGuard>
  );
}

function matches(l: ConsoleListing, filter: Filter): boolean {
  if (filter === "published") return l.status === "published";
  if (filter === "action") return l.status === "blocked" || l.status === "incomplete";
  return true;
}

function ListingRow({ l, showAgents }: { l: ConsoleListing; showAgents: boolean }) {
  const pill = PUBLICATION[l.status]!;
  return (
    <li className="card flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{l.address}</p>
          <p className="text-xs text-muted">
            {l.sourceListingId} · {priceLabel({ listingType: l.listingType, priceDisplay: l.priceDisplay, rentPerWeekAud: null })}
            {showAgents ? ` · ${l.agentNames.join(", ")}` : ""}
          </p>
        </div>
        <Pill tone={pill.tone}>{pill.label}</Pill>
      </div>
      {l.blocking.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Blocking checks">
          {l.blocking.map((b) => (
            <li key={b.ruleId} className="rounded-lg bg-bad-50 p-3 text-sm">
              <p className="font-semibold text-bad-700">
                <span aria-hidden="true">✗ </span>
                {b.title} <span className="font-normal">({b.ruleId})</span>
              </p>
              <p className="mt-0.5 text-ink/80">{b.reason}</p>
            </li>
          ))}
        </ul>
      )}
      {l.advisories.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm" aria-label="Advisories">
          {l.advisories.map((b) => (
            <li key={b.ruleId} className="text-warn-700">
              <span aria-hidden="true">! </span>
              <span className="font-semibold">{b.title}:</span> {b.reason}
            </li>
          ))}
        </ul>
      )}
      <PublishControls listingId={l.id} controls={l.controls} label={l.address} />
    </li>
  );
}

async function AgentConsole({ filter, showAll }: { filter: Filter; showAll: boolean }) {
  const viewer = await currentViewer();
  const data = agentConsoleData(viewer);
  if (!data) {
    return <Empty title="We couldn't load your console" body="Your agent record wasn't found in the dataset. Regenerate the synthetic data and try again." />;
  }

  const isAdmin = data.agencyAgents !== null;
  const latest = data.feedRuns.find((r) => r.file.startsWith("data/")) ?? data.feedRuns[0] ?? null;
  const counts = {
    published: data.listings.filter((l) => l.status === "published").length,
    action: data.listings.filter((l) => matches(l, "action")).length,
  };
  const shown = data.listings.filter((l) => matches(l, filter));
  const visible = showAll ? shown : shown.slice(0, PAGE);
  const verification = VERIFICATION[data.self.verification]!;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="eyebrow">{isAdmin ? "Agency console" : "Agent console"}</p>
        <h1 className="mt-1 text-3xl font-extrabold">{data.agency.name}</h1>
        <p className="mt-1 text-muted">
          {data.self.name} · {ROLE_LABELS[viewer.role]} · rules checked as of {longDate(data.asOf)}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="card p-5" aria-labelledby="licence-title">
          <h2 id="licence-title" className="eyebrow">
            Licence verification
          </h2>
          <div className="mt-2">
            <Pill tone={verification.tone}>{verification.label}</Pill>
          </div>
          <p className="mt-2 text-sm text-muted">
            {data.self.verification === "verified" || data.self.verification === "exception_approved"
              ? "You can publish listings that pass the publication checks (FR-AGT-001)."
              : "Publishing is off until a platform admin verifies your licence or approves an exception."}
          </p>
        </section>
        <section className="card p-5" aria-labelledby="feed-title">
          <h2 id="feed-title" className="eyebrow">
            REAXML feed
          </h2>
          {latest ? (
            <>
              <p className="mt-2 font-display text-2xl font-bold">
                {latest.accepted} of {latest.received} accepted
              </p>
              <p className="mt-1 text-sm text-muted">Last run {latest.runAt ? feedStamp(latest.runAt) : "time unknown"}</p>
              <a href="#feed" className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline">
                See all {data.feedRuns.length} runs
              </a>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">No runs yet. Connect your feed to start.</p>
          )}
        </section>
        <section className="card p-5" aria-labelledby="listings-title">
          <h2 id="listings-title" className="eyebrow">
            {isAdmin ? "Agency listings" : "My listings"}
          </h2>
          <p className="mt-2 font-display text-2xl font-bold">{counts.published} published</p>
          <p className="mt-1 text-sm text-muted">
            {counts.action === 0 ? "Nothing needs your attention." : `${counts.action} blocked by the publication checks.`}
          </p>
          {counts.action > 0 && (
            <Link href="/agent?show=action#listings" className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline">
              Review blocked listings
            </Link>
          )}
        </section>
      </div>

      {data.agencyAgents && (
        <Section id="agents" title="Agents" description="Everyone at your agency and where their licence verification stands.">
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Agent</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Verification</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Listings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.agencyAgents.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <span className="block font-semibold">{a.name}</span>
                      <span className="text-xs text-muted">{a.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={VERIFICATION[a.verification]!.tone}>{VERIFICATION[a.verification]!.label}</Pill>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{a.listingCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section
        id="listings"
        title={isAdmin ? "Listings across the agency" : "My listings"}
        description="Results from the QLD publication rule pack. Publish works only when every mandatory check passes."
      >
        <nav aria-label="Filter listings" className="mb-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const n = f.key === "all" ? data.listings.length : counts[f.key];
            return (
              <Link
                key={f.key}
                href={`/agent?show=${f.key}#listings`}
                aria-current={filter === f.key ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ${filter === f.key ? "bg-brand-600 text-white ring-brand-600" : "bg-surface text-ink ring-line hover:ring-brand-600"}`}
              >
                {f.label} ({n})
              </Link>
            );
          })}
        </nav>
        {visible.length === 0 ? (
          <Empty title={filter === "action" ? "Nothing is blocked" : "No listings here"} body={filter === "action" ? "Every listing passes the mandatory checks." : "Listings arrive from your REAXML feed."} />
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((l) => (
              <ListingRow key={l.id} l={l} showAgents={isAdmin} />
            ))}
          </ul>
        )}
        {visible.length < shown.length && (
          <Link href={`/agent?show=${filter}&all=1#listings`} className="btn btn-secondary mt-4 w-full">
            Show all {shown.length}
          </Link>
        )}
        <p className="mt-3 text-xs text-muted">
          Prototype: publish and unpublish change what buyers see on this server and go in the audit log. Data is synthetic. The rule pack is a draft awaiting compliance sign-off.
        </p>
      </Section>

      <Section id="feed" title="Feed runs" description="What each REAXML run delivered, and why any records were rejected.">
        <FeedRuns runs={data.feedRuns} />
      </Section>
    </div>
  );
}
