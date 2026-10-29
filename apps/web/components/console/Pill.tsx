import type { ReactNode } from "react";

export type Tone = "good" | "warn" | "bad" | "neutral";

const TONES: Record<Tone, string> = {
  good: "bg-brand-50 text-brand-800 ring-brand-200",
  warn: "bg-warn-50 text-warn-700 ring-warn-700/20",
  bad: "bg-bad-50 text-bad-700 ring-bad-700/20",
  neutral: "bg-canvas text-muted ring-line",
};

/** Status label with colour as a supplement only: the text always says the state. */
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${TONES[tone]}`}>{children}</span>;
}

export const VERIFICATION: Record<string, { label: string; tone: Tone }> = {
  verified: { label: "Licence verified", tone: "good" },
  pending: { label: "Verification pending", tone: "warn" },
  exception_approved: { label: "Exception approved", tone: "warn" },
  rejected: { label: "Verification rejected", tone: "bad" },
};

export const PUBLICATION: Record<string, { label: string; tone: Tone }> = {
  published: { label: "Published", tone: "good" },
  unpublished: { label: "Unpublished", tone: "neutral" },
  blocked: { label: "Blocked", tone: "bad" },
  incomplete: { label: "Incomplete", tone: "warn" },
};

export const FEED: Record<string, { label: string; tone: Tone }> = {
  ok: { label: "Healthy", tone: "good" },
  partial: { label: "Some records rejected", tone: "warn" },
  failed: { label: "Failed", tone: "bad" },
};

export function Section({ id, title, description, children, action }: { id: string; title: string; description?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={`${id}-title`} className="text-xl font-bold">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-6 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}
