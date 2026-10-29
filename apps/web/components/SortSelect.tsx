"use client";

import { CRITERIA_FORM_ID, type Criteria } from "@/lib/criteria";

// Lives in the results toolbar but belongs to the filter form (via the form attribute), so a sort
// change keeps every other filter. Changing it applies straight away.
export function SortSelect({ value }: { value: Criteria["sort"] }) {
  return (
    <label className="relative flex items-center gap-2 text-sm">
      <span className="hidden text-muted sm:inline">Sort</span>
      <select
        name="sort"
        form={CRITERIA_FORM_ID}
        defaultValue={value === "newest" ? "" : value}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="field min-h-10 w-auto max-w-32 appearance-none truncate sm:max-w-none rounded-full py-0 pl-3.5 pr-9 font-medium"
        aria-label="Sort results"
      >
        {/* Newest is the default, so it stays out of the URL. */}
        <option value="">Newest</option>
        <option value="price_asc">Price, low to high</option>
        <option value="price_desc">Price, high to low</option>
      </select>
      <svg viewBox="0 0 20 20" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="currentColor" aria-hidden="true">
        <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" />
      </svg>
    </label>
  );
}
