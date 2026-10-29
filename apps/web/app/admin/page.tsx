import type { Metadata } from "next";
import Link from "next/link";
import { Empty, Pill, Section, VERIFICATION } from "@/components/console/Pill";
import { FeedRuns } from "@/components/console/FeedRuns";
import { PageGuard } from "@/components/PageGuard";
import { adminData, type AdminData } from "@/lib/console";
import { longDate, stamp } from "@/lib/format";
import { ROLE_LABELS, can } from "@/lib/roles";
import { currentViewer } from "@/lib/session";
import { openReports, pendingQuestions } from "@/lib/social";
import { socialStore } from "@/lib/social-store";
import { RoleChangeForm, VerificationForm } from "./AdminForms";

export const metadata: Metadata = { title: "Admin console" };

export default function AdminPage() {
  return (
    <PageGuard path="/admin" signIn={{ title: "Sign in to the admin console", body: "Moderators and platform admins review users, agents, feeds and content here." }}>
      <AdminConsole />
    </PageGuard>
  );
}

const SECTIONS = [
  { id: "users", label: "Users" },
  { id: "agencies", label: "Agencies" },
  { id: "verification", label: "Verification" },
  { id: "feeds", label: "Feed failures" },
  { id: "moderation", label: "Moderation" },
  { id: "audit", label: "Audit log" },
] as const;

function daysBetween(fromIso: string, toDate: string): number {
  return Math.max(0, Math.floor((Date.parse(`${toDate}T23:59:59+10:00`) - Date.parse(`${fromIso}+10:00`)) / 86_400_000));
}

function Queues({ data, moderation }: { data: AdminData; moderation: number }) {
  const oldestFeed = data.feedFailures.reduce<string | null>((min, r) => (r.runAt && (!min || r.runAt < min) ? r.runAt : min), null);
  const queues = [
    { href: "#verification", label: "Verification", count: data.verificationQueue.length, note: "Submission dates aren't in the synthetic data" },
    { href: "#feeds", label: "Feed failures", count: data.feedFailures.length, note: oldestFeed ? `Oldest ${daysBetween(oldestFeed, data.asOf)} days` : "None" },
    { href: "#agencies", label: "Blocked listings", count: data.complianceBlocked, note: "Fail the QLD publication gate" },
    { href: "#moderation", label: "Moderation", count: moderation, note: moderation ? "Questions and reports (preview)" : "Nothing to review" },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Queues">
      {queues.map((q) => (
        <li key={q.label}>
          <a href={q.href} className="card block h-full p-4 transition hover:shadow-lift">
            <p className="eyebrow">{q.label}</p>
            <p className="mt-1 font-display text-3xl font-extrabold">{q.count}</p>
            <p className="mt-1 text-xs text-muted">{q.note}</p>
          </a>
        </li>
      ))}
    </ul>
  );
}

async function AdminConsole() {
  const viewer = await currentViewer();
  const data = adminData();
  const social = socialStore();
  const pending = pendingQuestions(social).length;
  const reports = openReports(social).length;
  const canChangeRoles = can(viewer.role, "admin.roles.change");
  const canDecide = can(viewer.role, "admin.verification.decide");
  const agencyName = (externalId: string | null) => data.agencies.find((a) => a.externalAgentId === externalId)?.name ?? "Unknown agency";

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="eyebrow">Admin console</p>
        <h1 className="mt-1 text-3xl font-extrabold">Platform overview</h1>
        <p className="mt-1 text-muted">
          {viewer.persona?.name} · {ROLE_LABELS[viewer.role]} · as of {longDate(data.asOf)}
        </p>
        {!canChangeRoles && (
          <p className="mt-3 rounded-xl bg-canvas p-3 text-sm text-muted">
            As a moderator you can review everything here and act on the moderation queue. Role changes and verification decisions need a platform admin.
          </p>
        )}
      </header>

      <Queues data={data} moderation={pending + reports} />

      <nav aria-label="Admin sections" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="block whitespace-nowrap rounded-full bg-surface px-3.5 py-1.5 text-sm font-medium ring-1 ring-line hover:ring-brand-600">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="users" title="Users and roles" description="Agents come from the synthetic dataset. The buyer and staff accounts are prototype personas.">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">User</th>
                <th scope="col" className="px-4 py-3 font-semibold">Role</th>
                <th scope="col" className="px-4 py-3 font-semibold">Agency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.users.map((u) => (
                <tr key={u.userId}>
                  <td className="px-4 py-2.5">
                    <span className="block font-semibold">{u.name}</span>
                    <span className="text-xs text-muted">{u.email}</span>
                  </td>
                  <td className="px-4 py-2.5">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-2.5 text-muted">{u.agencyName ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          {canChangeRoles ? (
            <RoleChangeForm users={data.users.map((u) => ({ userId: u.userId, name: u.name, role: u.role, hasAgency: u.agencyName !== null }))} />
          ) : (
            <p className="text-sm text-muted">Only a platform admin can change roles.</p>
          )}
        </div>
      </Section>

      <Section id="agencies" title="Agencies" description="Listings and publication-gate results per agency, with each agency's latest feed run.">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Agency</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Agents</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Listings</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Blocked</th>
                <th scope="col" className="px-4 py-3 font-semibold">Last feed run</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.agencies.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2.5">
                    <span className="block font-semibold">{a.name}</span>
                    <span className="text-xs text-muted">
                      {a.externalAgentId} · {a.verification}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{a.agentCount}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{a.listingCount}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${a.blockedCount ? "font-semibold text-bad-700" : ""}`}>{a.blockedCount}</td>
                  <td className="px-4 py-2.5 text-muted">{a.lastFeedRunAt ? stamp(`${a.lastFeedRunAt}+10:00`) : "No runs"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="verification" title="Verification exceptions" description="Agents waiting on a licence check, and agents publishing under an approved exception (FR-AGT-001).">
        {data.verificationQueue.length === 0 ? (
          <Empty title="No verification exceptions" body="Every agent's licence is verified." />
        ) : (
          <ul className="flex flex-col gap-3">
            {data.verificationQueue.map((a) => (
              <li key={a.id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{a.name}</p>
                    <p className="text-xs text-muted">
                      {a.agencyName} · {a.listingCount} listings
                    </p>
                  </div>
                  <Pill tone={VERIFICATION[a.verification]!.tone}>{VERIFICATION[a.verification]!.label}</Pill>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {a.decision
                    ? `${a.decision.expiresOn ? `Until ${longDate(a.decision.expiresOn)}. ` : ""}Reason: ${a.decision.reason}`
                    : a.verification === "pending"
                      ? "Their listings are blocked until a decision is made."
                      : "Exception recorded in the synthetic dataset. Its reason and expiry aren't in the data, so a platform admin should re-confirm it."}
                </p>
                {canDecide && <VerificationForm agentId={a.id} agentName={a.name} minDate={data.asOf} />}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="feeds" title="Feed failures" description="Runs where records were rejected or the file couldn't be read. Reprocessing arrives with the ingestion service (FR-FEED-002).">
        <FeedRuns runs={data.feedFailures} showAgency={agencyName} />
      </Section>

      <Section id="moderation" title="Moderation queue" description="Buyer Q&A (FR-QA-001) and the Suburb Hub (FR-HUB-001) are P1 features for MVP-2. This queue runs on sample content (ADR 0012).">
        <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-sm">
            <strong className="font-semibold">{pending}</strong> new {pending === 1 ? "question" : "questions"} waiting and <strong className="font-semibold">{reports}</strong> open {reports === 1 ? "report" : "reports"}.
          </p>
          <Link href="/hub/questions" className="btn btn-primary">
            Open the moderation queue
          </Link>
        </div>
      </Section>

      <Section id="audit" title="Audit log" description="Read-only. Every privileged action and refused attempt, newest first (FR-ADM-002).">
        {data.audit.length === 0 ? (
          <Empty title="No privileged actions yet" body="Publishing, role changes and verification decisions made in this prototype will appear here." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">When</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Who</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Action</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Target</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Change</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.audit.map((e) => (
                  <tr key={e.id} className={e.outcome === "denied" ? "bg-bad-50/50" : undefined}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">{stamp(e.occurredAt)}</td>
                    <td className="px-4 py-2.5">
                      {e.actorName}
                      <span className="block text-xs text-muted">{ROLE_LABELS[e.actorRole]}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="text-xs">{e.action}</code>
                      {e.outcome === "denied" && <span className="ml-1 text-xs font-semibold text-bad-700">Refused</span>}
                    </td>
                    <td className="px-4 py-2.5">{e.entityLabel}</td>
                    <td className="px-4 py-2.5 text-muted">{e.before || e.after ? `${e.before ?? "—"} → ${e.after ?? "—"}` : "—"}</td>
                    <td className="px-4 py-2.5 text-muted">{e.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-muted">Prototype: the log is kept in server memory and clears when the server restarts. Production writes the audit_log table, append-only, with export.</p>
      </Section>
    </div>
  );
}
