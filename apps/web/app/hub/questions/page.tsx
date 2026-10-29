import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Pill, type Tone } from "@/components/console/Pill";
import { SignInPrompt } from "@/components/SignInPrompt";
import { evaluatedListings } from "@/lib/data";
import { stamp } from "@/lib/format";
import { mayActOn } from "@/lib/publication";
import { can } from "@/lib/roles";
import { currentViewer, type Viewer } from "@/lib/session";
import { REPORT_REASONS, openReports, pendingQuestions, questionsBy, type Question, type QuestionStatus } from "@/lib/social";
import { publishedScopes, socialStore } from "@/lib/social-store";
import { AnswerForm, DecideReportForm, ModerateQuestionForm } from "../QuestionForms";

export const metadata: Metadata = { title: "Questions (preview)" };

// One screen, three jobs, chosen by role: buyers track their questions, agents answer questions on
// listings they manage, moderators clear the queue (J3 step 8, J4 step 4). Each action re-checks on the server.

function listingLabels(): Map<string, { address: string; source: string }> {
  return new Map(
    evaluatedListings().map(({ raw }) => {
      const a = raw.address;
      return [raw.id, { address: `${a.unitNumber ? `${a.unitNumber}/` : ""}${a.streetNumber} ${a.streetName}, ${a.suburb}`, source: raw.sourceListingId }];
    }),
  );
}

const STATUS: Record<QuestionStatus, { label: string; tone: Tone }> = {
  pending: { label: "Waiting for moderation", tone: "warn" },
  published: { label: "Published", tone: "good" },
  rejected: { label: "Not approved", tone: "bad" },
  hidden: { label: "Hidden while reviewed", tone: "warn" },
  removed: { label: "Removed", tone: "bad" },
};

function Card({ q, label, children }: { q: Question; label: string; children?: ReactNode }) {
  return (
    <li className="card p-5">
      <Link href={`/listing/${q.listingId}#questions`} className="text-xs font-semibold text-brand-700 hover:underline">
        {label}
      </Link>
      <p className="mt-1 font-medium">“{q.text}”</p>
      <p className="mt-1 text-xs text-muted">Asked {stamp(q.askedAt)}</p>
      {children}
    </li>
  );
}

function BuyerView({ viewer }: { viewer: Viewer }) {
  const labels = listingLabels();
  const mine = questionsBy(socialStore(), viewer.persona!.userId);
  return (
    <section aria-labelledby="mine-title" className="flex flex-col gap-3">
      <h1 id="mine-title" className="text-3xl font-extrabold">
        Your questions
      </h1>
      <p className="max-w-2xl text-muted">Questions you've asked agents. They show publicly as “A buyer”, never your name.</p>
      {mine.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="font-semibold">You haven't asked anything yet</p>
          <p className="mt-1 text-sm text-muted">Open any listing and use “Ask the agent” near the bottom of the page.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {mine.map((q) => (
            <Card key={q.id} q={q} label={labels.get(q.listingId)?.address ?? "Listing"}>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill tone={STATUS[q.status].tone}>{STATUS[q.status].label}</Pill>
                {q.status === "published" && !q.answer && <span className="text-xs text-muted">Waiting for the agent</span>}
              </div>
              {q.answer && !q.answer.hidden && <p className="mt-2 rounded-xl bg-brand-50 p-3 text-sm">{q.answer.text}</p>}
            </Card>
          ))}
        </ul>
      )}
    </section>
  );
}

function AgentView({ viewer }: { viewer: Viewer }) {
  const store = socialStore();
  const labels = listingLabels();
  const scopes = new Map(publishedScopes().map((r) => [r.id, r]));
  const mine = store.questions.filter((q) => q.status === "published" && scopes.has(q.listingId) && mayActOn(viewer, scopes.get(q.listingId)!));
  const open = mine.filter((q) => !q.answer);
  const done = mine.filter((q) => q.answer);
  const agencyWide = viewer.role === "agency_admin";
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">Questions to answer</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Approved buyer questions on {agencyWide ? "your agency's" : "your"} listings. You don't see who asked: buyer details reach you only if they choose to contact you (FR-AGT-004).
        </p>
      </header>
      <section aria-labelledby="open-title" className="flex flex-col gap-3">
        <h2 id="open-title" className="text-xl font-bold">
          Open <span className="text-base font-normal text-muted">({open.length})</span>
        </h2>
        {open.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">Nothing waiting. New questions appear here once a moderator approves them.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {open.map((q) => (
              <Card key={q.id} q={q} label={`${labels.get(q.listingId)?.address ?? "Listing"} · ${labels.get(q.listingId)?.source ?? ""}`}>
                <p className="mt-1 text-xs text-muted">Asked by a buyer · identity not shared</p>
                <AnswerForm questionId={q.id} />
              </Card>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="done-title" className="flex flex-col gap-3">
        <h2 id="done-title" className="text-xl font-bold">
          Answered <span className="text-base font-normal text-muted">({done.length})</span>
        </h2>
        {done.length === 0 ? (
          <p className="text-sm text-muted">No answers yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {done.map((q) => (
              <Card key={q.id} q={q} label={labels.get(q.listingId)?.address ?? "Listing"}>
                <p className="mt-2 rounded-xl bg-brand-50 p-3 text-sm">
                  <span className="block text-xs font-semibold text-brand-800">{q.answer!.hidden ? "Hidden while a moderator reviews a report" : `Answer from ${q.answer!.agentName}`}</span>
                  {q.answer!.text}
                </p>
              </Card>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ModeratorView() {
  const store = socialStore();
  const labels = listingLabels();
  const pending = pendingQuestions(store);
  const reports = openReports(store);
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-extrabold">Moderation</h1>
        <p className="mt-1 max-w-2xl text-muted">New buyer questions wait here before anyone sees them. Reported questions and answers are hidden until you decide. Every decision goes to the audit log.</p>
      </header>
      <section aria-labelledby="pending-title" className="flex flex-col gap-3">
        <h2 id="pending-title" className="text-xl font-bold">
          New questions <span className="text-base font-normal text-muted">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">No questions waiting.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((q) => (
              <Card key={q.id} q={q} label={labels.get(q.listingId)?.address ?? "Listing"}>
                <p className="mt-1 text-xs text-muted">Check: about this home, no personal details, nothing abusive, nothing an agent couldn't answer.</p>
                <ModerateQuestionForm questionId={q.id} />
              </Card>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="reports-title" className="flex flex-col gap-3">
        <h2 id="reports-title" className="text-xl font-bold">
          Reports <span className="text-base font-normal text-muted">({reports.length})</span>
        </h2>
        {reports.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">No open reports.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reports.map((r) => {
              const q = r.target !== "post" ? store.questions.find((x) => x.id === r.targetId) : undefined;
              const post = r.target === "post" ? store.posts.find((p) => p.id === r.targetId) : undefined;
              const text = r.target === "post" ? post?.title : r.target === "answer" ? q?.answer?.text : q?.text;
              return (
                <li key={r.id} className="card p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="warn">Reported {r.target}</Pill>
                    <Pill tone="neutral">{REPORT_REASONS[r.reason]}</Pill>
                  </div>
                  <p className="mt-2 font-medium">“{text ?? "Content no longer exists"}”</p>
                  <p className="mt-1 text-xs text-muted">
                    {q ? `On ${labels.get(q.listingId)?.address ?? "a listing"} · ` : post ? "Hub post, still visible until you decide · " : ""}Reported {stamp(r.reportedAt)}
                  </p>
                  <DecideReportForm reportId={r.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default async function QuestionsPage() {
  const viewer = await currentViewer();
  if (viewer.role === "guest") return <SignInPrompt title="Sign in to see your questions" body="Questions you ask agents, and their answers, are kept here." />;
  if (can(viewer.role, "moderation.decide")) return <ModeratorView />;
  if (can(viewer.role, "qa.answer")) return <AgentView viewer={viewer} />;
  return <BuyerView viewer={viewer} />;
}
