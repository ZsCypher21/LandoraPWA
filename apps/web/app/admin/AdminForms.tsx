"use client";

import { useActionState, useId, useState } from "react";
import { changeUserRole, decideVerification, type FormState } from "@/app/actions";
import { MIN_REASON_LENGTH } from "@/lib/mock-store";
import { ROLE_LABELS, assignableRoles, type AccountRole } from "@/lib/roles";

const IDLE: FormState = { status: "idle" };

function Result({ state }: { state: FormState }) {
  return (
    <p role="status" className={`text-sm ${state.status === "error" ? "text-bad-700" : "text-brand-700"}`}>
      {state.status === "ok" ? state.message : state.status === "error" ? state.error : ""}
    </p>
  );
}

function Reason({ id, placeholder }: { id: string; placeholder: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        Reason <span className="font-normal text-muted">(kept in the audit log)</span>
      </label>
      <textarea id={id} name="reason" required minLength={MIN_REASON_LENGTH} maxLength={500} rows={2} placeholder={placeholder} className="field py-2" />
    </div>
  );
}

export interface UserOption {
  userId: string;
  name: string;
  role: AccountRole;
  hasAgency: boolean;
}

/** Platform admins only (FR-ACC-002): change a user's role, with a mandatory reason. */
export function RoleChangeForm({ users }: { users: UserOption[] }) {
  const [state, action, pending] = useActionState(changeUserRole, IDLE);
  const [userId, setUserId] = useState(users[0]?.userId ?? "");
  const id = useId();
  const user = users.find((u) => u.userId === userId);
  const options = assignableRoles(user?.hasAgency ?? false);

  if (users.length === 0) return <p className="text-sm text-muted">No users to manage.</p>;
  return (
    <form action={action} className="card flex flex-col gap-3 p-4 sm:p-5">
      <h3 className="font-bold">Change a role</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-user`} className="text-sm font-medium">
            User
          </label>
          <select id={`${id}-user`} name="userId" value={userId} onChange={(e) => setUserId(e.target.value)} className="field">
            {users.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.name} ({ROLE_LABELS[u.role]})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-role`} className="text-sm font-medium">
            New role
          </label>
          <select key={userId} id={`${id}-role`} name="role" defaultValue={options.find((r) => r !== user?.role) ?? options[0]} className="field">
            {options.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-muted">{user?.hasAgency ? "Agency staff can be an agent or an agency admin." : "People outside an agency can be a buyer, moderator or platform admin."}</p>
      <Reason id={`${id}-reason`} placeholder="For example: approved by the agency principal on 28 Oct, ticket 123." />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : "Change role"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

/** Platform admins only (FR-AGT-001): approve a time-limited exception or reject verification. */
export function VerificationForm({ agentId, agentName, minDate }: { agentId: string; agentName: string; minDate: string }) {
  const [state, action, pending] = useActionState(decideVerification, IDLE);
  const [decision, setDecision] = useState<"exception_approved" | "rejected">("exception_approved");
  const id = useId();
  return (
    <form action={action} className="mt-3 flex flex-col gap-3 border-t border-line pt-3" aria-label={`Decide verification for ${agentName}`}>
      <input type="hidden" name="agentId" value={agentId} />
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="sr-only">Decision</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="decision" value="exception_approved" checked={decision === "exception_approved"} onChange={() => setDecision("exception_approved")} />
          Approve an exception
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="decision" value="rejected" checked={decision === "rejected"} onChange={() => setDecision("rejected")} />
          Reject
        </label>
      </fieldset>
      {decision === "exception_approved" && (
        <div className="flex flex-col gap-1 sm:max-w-xs">
          <label htmlFor={`${id}-expiry`} className="text-sm font-medium">
            Exception expires on
          </label>
          <input id={`${id}-expiry`} type="date" name="expiresOn" min={minDate} required className="field" />
        </div>
      )}
      <Reason id={`${id}-reason`} placeholder="For example: licence register lookup delayed; principal confirmed licence by phone." />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : decision === "exception_approved" ? "Approve exception" : "Reject verification"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}
