"use client";

import { useActionState, useId, useState } from "react";
import type { FormState } from "@/app/actions";
import { MIN_REASON_LENGTH } from "@/lib/mock-store";
import { answerQuestionAction, askQuestionAction, decideReportAction, moderateQuestionAction } from "./actions";

const IDLE: FormState = { status: "idle" };

function Result({ state }: { state: FormState }) {
  return (
    <p role="status" className={`text-sm ${state.status === "error" ? "text-bad-700" : "text-brand-700"}`}>
      {state.status === "ok" ? state.message : state.status === "error" ? state.error : ""}
    </p>
  );
}

/** Buyers ask the listing's agent (FR-QA-001). Held for moderation; no contact details (SOC-M3). */
export function AskForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState(askQuestionAction, IDLE);
  const id = useId();
  if (state.status === "ok") return <Result state={state} />;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="listingId" value={listingId} />
      <label htmlFor={id} className="text-sm font-semibold">
        Ask the agent about this home
      </label>
      <textarea id={id} name="question" required minLength={10} maxLength={300} rows={2} placeholder="For example: Is the back yard fully fenced?" aria-describedby={`${id}-hint`} className="field py-2" />
      <p id={`${id}-hint`} className="text-xs text-muted">
        Shown publicly as “A buyer” once a moderator approves it. Leave out phone numbers, emails and links.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Sending…" : "Send question"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

export function AnswerForm({ questionId }: { questionId: string }) {
  const [state, action, pending] = useActionState(answerQuestionAction, IDLE);
  const id = useId();
  if (state.status === "ok") return <Result state={state} />;
  return (
    <form action={action} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="questionId" value={questionId} />
      <label htmlFor={id} className="text-sm font-semibold">
        Your answer
      </label>
      <textarea id={id} name="answer" required maxLength={1000} rows={2} className="field py-2" />
      <p className="text-xs text-muted">Published straight away, labelled “Answer from the agent”. Stick to facts you can stand behind.</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Publishing…" : "Publish answer"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

function Reason({ id, required }: { id: string; required: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        Reason <span className="font-normal text-muted">({required ? "required, " : ""}kept in the audit log)</span>
      </label>
      <textarea id={id} name="reason" required={required} minLength={required ? MIN_REASON_LENGTH : undefined} maxLength={500} rows={2} className="field py-2" />
    </div>
  );
}

export function ModerateQuestionForm({ questionId }: { questionId: string }) {
  const [state, action, pending] = useActionState(moderateQuestionAction, IDLE);
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const id = useId();
  if (state.status === "ok") return <Result state={state} />;
  return (
    <form action={action} className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
      <input type="hidden" name="questionId" value={questionId} />
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="sr-only">Decision</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="decision" value="approve" checked={decision === "approve"} onChange={() => setDecision("approve")} />
          Approve
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="decision" value="reject" checked={decision === "reject"} onChange={() => setDecision("reject")} />
          Reject
        </label>
      </fieldset>
      {decision === "reject" && <Reason id={`${id}-reason`} required />}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : decision === "approve" ? "Approve question" : "Reject question"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

export function DecideReportForm({ reportId }: { reportId: string }) {
  const [state, action, pending] = useActionState(decideReportAction, IDLE);
  const [decision, setDecision] = useState<"remove" | "restore">("remove");
  const id = useId();
  if (state.status === "ok") return <Result state={state} />;
  return (
    <form action={action} className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
      <input type="hidden" name="reportId" value={reportId} />
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="sr-only">Decision</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="decision" value="remove" checked={decision === "remove"} onChange={() => setDecision("remove")} />
          Remove it
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="decision" value="restore" checked={decision === "restore"} onChange={() => setDecision("restore")} />
          Restore it (report not upheld)
        </label>
      </fieldset>
      <Reason id={`${id}-reason`} required />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : decision === "remove" ? "Remove" : "Restore"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}
