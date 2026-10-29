import { stamp } from "@/lib/format";
import type { Question } from "@/lib/social";
import { ReportButton } from "./ReportButton";

/** A public question with its answer. The asker is always "A buyer" (SOC-P4); answers are labelled (SOC-M4). */
export function QuestionItem({ q, listingLabel }: { q: Question; listingLabel?: { href: string; text: string } }) {
  return (
    <li className="flex flex-col gap-2 py-4">
      {listingLabel && (
        <a href={listingLabel.href} className="text-xs font-semibold text-brand-700 hover:underline">
          {listingLabel.text}
        </a>
      )}
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">
          <span className="sr-only">Question: </span>“{q.text}”
        </p>
        <ReportButton target="question" targetId={q.id} />
      </div>
      <p className="text-xs text-muted">A buyer asked · {stamp(q.askedAt)}</p>
      {q.answer ? (
        <div className="rounded-xl bg-brand-50 p-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold text-brand-800">Answer from the agent, {q.answer.agentName}</p>
            <ReportButton target="answer" targetId={q.id} />
          </div>
          <p className="mt-1">{q.answer.text}</p>
          <p className="mt-1 text-xs text-muted">{stamp(q.answer.answeredAt)}</p>
        </div>
      ) : (
        <p className="text-xs text-muted">Waiting for the agent to answer.</p>
      )}
    </li>
  );
}
