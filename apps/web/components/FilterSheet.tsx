"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

// The search filters live in one panel. On desktop it sits beside the results and fits the viewport,
// with "Update results" pinned to its bottom edge. On phones it becomes a bottom sheet opened from the
// results toolbar, so results come first and the apply button is always in thumb reach.

interface SheetValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const SheetContext = createContext<SheetValue | null>(null);

function useSheet(): SheetValue {
  const value = useContext(SheetContext);
  if (!value) throw new Error("Filter sheet parts must be inside <FilterSheetProvider>");
  return value;
}

const DESKTOP = "(min-width: 64rem)";

export function FilterSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const value = useMemo(() => ({ open, setOpen, triggerRef }), [open]);
  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>;
}

/** Phone-only button in the results toolbar that opens the sheet. */
export function FilterTrigger({ activeCount }: { activeCount: number }) {
  const { open, setOpen, triggerRef } = useSheet();
  return (
    <button
      ref={triggerRef}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => setOpen(true)}
      className="btn btn-secondary min-h-10 shrink-0 px-3.5 lg:hidden"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
        <path d="M3 5h18v2H3zm3 6h12v2H6zm4 6h4v2h-4z" />
      </svg>
      Filters
      {activeCount > 0 && (
        <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[11px] leading-none text-white">
          {activeCount}
          <span className="sr-only"> active</span>
        </span>
      )}
    </button>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Leave unset fields out of the URL (?beds=3, not ?suburb=&beds=3&baths=&...). Runs before next/form reads the form. */
function omitEmptyFields(form: HTMLFormElement) {
  const empty = [...form.elements].filter(
    (el): el is HTMLInputElement | HTMLSelectElement =>
      (el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && el.type !== "checkbox" && el.type !== "radio")) && !el.disabled && el.value === "",
  );
  for (const el of empty) el.disabled = true;
  // Re-enable once the submission has been read, in case the form stays mounted.
  setTimeout(() => {
    for (const el of empty) el.disabled = false;
  });
}

export function FilterPanel({ activeCount, children }: { activeCount: number; children: ReactNode }) {
  const { open, setOpen, triggerRef } = useSheet();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, [setOpen, triggerRef]);

  // Desktop: size the panel to the visible part of the viewport, so "Update results" is on screen
  // before the panel has scrolled up to its sticky position as well as after.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const mq = window.matchMedia(DESKTOP);
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!mq.matches) {
          panel.style.maxHeight = "";
          return;
        }
        // Fit between the sticky offset (or wherever the panel currently starts) and the lower of the
        // viewport bottom and the end of the results column, so the panel never scrolls under the header.
        const aside = panel.parentElement;
        const stickyTop = aside ? parseFloat(getComputedStyle(aside).top) || 0 : 0;
        const top = Math.max(panel.getBoundingClientRect().top, stickyTop);
        const columnBottom = aside?.parentElement?.getBoundingClientRect().bottom ?? Infinity;
        const bottom = Math.min(window.innerHeight - 16, columnBottom);
        panel.style.maxHeight = `${Math.max(bottom - top, 240)}px`;
      });
    };
    fit();
    window.addEventListener("scroll", fit, { passive: true });
    window.addEventListener("resize", fit);
    mq.addEventListener("change", fit);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", fit);
      window.removeEventListener("resize", fit);
      mq.removeEventListener("change", fit);
    };
  }, []);

  // While the sheet is open: lock page scroll, move focus in, keep Tab inside, Escape closes.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    // The sheet only exists on phones; widening the window turns it back into the side panel.
    const mq = window.matchMedia(DESKTOP);
    const onWide = () => mq.matches && setOpen(false);

    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onWide);
    };
  }, [open, close, setOpen]);

  return (
    <>
      {open && <div className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-[2px] lg:hidden" aria-hidden="true" onClick={close} />}
      <div
        ref={panelRef}
        role={open ? "dialog" : "region"}
        aria-modal={open ? true : undefined}
        aria-labelledby={headingId}
        onSubmitCapture={(e) => omitEmptyFields(e.target as HTMLFormElement)}
        // Submitting navigates to the new results, so put the sheet away first.
        onSubmit={() => setOpen(false)}
        className={`card flex flex-col overflow-hidden lg:max-h-[calc(100dvh-6.5rem)] max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-50 max-lg:max-h-[88dvh] max-lg:rounded-b-none max-lg:border-x-0 max-lg:border-b-0 max-lg:shadow-lift ${
          open ? "max-lg:flex max-lg:animate-[sheet-up_200ms_ease-out]" : "max-lg:hidden"
        }`}
      >
        <span className="mx-auto mt-2 block h-1 w-10 shrink-0 rounded-full bg-line lg:hidden" aria-hidden="true" />
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 id={headingId} className="flex items-center gap-2 text-base font-bold">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="currentColor" aria-hidden="true">
              <path d="M3 5h18v2H3zm3 6h12v2H6zm4 6h4v2h-4z" />
            </svg>
            Filters
            {activeCount > 0 && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">{activeCount} active</span>}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z" />
            </svg>
            <span className="sr-only">Close filters</span>
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
