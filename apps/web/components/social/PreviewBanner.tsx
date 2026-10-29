/** Shown on every social screen (ADR 0012): this is a preview of MVP-2 work, on sample content. */
export function PreviewBanner() {
  return (
    <div role="note" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-dashed border-sun-400 bg-sun-50 px-4 py-3 text-sm text-sun-800">
      <span className="rounded-full bg-sun-400 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-ink">Preview</span>
      <span>
        The community hub is planned for <strong className="font-semibold">MVP-2 (P1)</strong>. Everything here is sample content, and changes reset when the server restarts.
      </span>
    </div>
  );
}

export function SampleTag() {
  return <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-muted ring-1 ring-line">Sample</span>;
}
