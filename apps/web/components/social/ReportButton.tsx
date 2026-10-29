"use client";

import { useId, useState, useTransition } from "react";
import { reportAction } from "@/app/hub/actions";
import { can } from "@/lib/roles";
import { REPORT_REASONS, type ReportReason, type ReportTarget } from "@/lib/social";
import { useRole } from "../RoleContext";

/** Sends content to the Moderator queue (SOC-M5). Signed-in buyers only. */
export function ReportButton({ target, targetId }: { target: ReportTarget; targetId: string }) {
  const { role } = useRole();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("inaccurate");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const id = useId();
  if (!can(role, "content.report")) return null;
  if (result?.ok) {
    return (
      <p role="status" className="text-xs text-brand-700">
        {result.text}
      </p>
    );
  }

  return (
    <div className="text-xs">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={id} className="font-medium text-muted underline-offset-2 hover:text-bad-700 hover:underline">
        Report
      </button>
      {open && (
        <form
          id={id}
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await reportAction(target, targetId, reason);
              setResult({ ok: r.ok, text: r.ok ? r.message : r.error });
            });
          }}
          className="card mt-2 flex max-w-xs flex-col gap-2 p-3"
        >
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 font-semibold text-ink">Why are you reporting this?</legend>
            {(Object.keys(REPORT_REASONS) as ReportReason[]).map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm text-ink">
                <input type="radio" name={`${id}-reason`} value={r} checked={reason === r} onChange={() => setReason(r)} />
                {REPORT_REASONS[r]}
              </label>
            ))}
          </fieldset>
          <p className="text-muted">A moderator reviews every report. Your name isn't shown to the author.</p>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn btn-primary min-h-9 px-3 text-xs">
              {pending ? "Sending…" : "Send report"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary min-h-9 px-3 text-xs">
              Cancel
            </button>
          </div>
          {result && !result.ok && (
            <p role="alert" className="text-bad-700">
              {result.text}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
