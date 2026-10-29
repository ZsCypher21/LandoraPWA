import type { Metadata } from "next";
import Link from "next/link";
import { RememberBackPath } from "@/components/BackLink";
import { CriteriaForm } from "@/components/CriteriaForm";
import { FilterPanel, FilterSheetProvider, FilterTrigger } from "@/components/FilterSheet";
import { ListingCard } from "@/components/ListingCard";
import { SearchBox } from "@/components/SearchBox";
import { SearchTracker } from "@/components/SearchTracker";
import { SortSelect } from "@/components/SortSelect";
import { criteriaFromParams, criteriaToParams, type Criteria } from "@/lib/criteria";
import { AS_OF, publishedListings, suburbs, toSummary } from "@/lib/data";
import { aud, featureLabel } from "@/lib/format";
import { parseIntent, type IntentResult } from "@/lib/intent";
import { refinements, search } from "@/lib/search";

export const metadata: Metadata = { title: "Search" };

const PAGE_SIZE = 24;

function chips(c: Criteria): string[] {
  const out: string[] = [c.listingType === "rent" ? "To rent" : "To buy"];
  if (c.suburbs.length) out.push(c.suburbs.join(" or "));
  if (c.propertyTypes.length) out.push(c.propertyTypes.join(" or "));
  if (c.minBeds !== null) out.push(`${c.minBeds}+ bed`);
  if (c.minBaths !== null) out.push(`${c.minBaths}+ bath`);
  if (c.minCars !== null) out.push(`${c.minCars}+ car`);
  const unit = c.listingType === "rent" ? "/wk" : "";
  if (c.minPrice !== null && c.maxPrice !== null) out.push(`${aud(c.minPrice)}–${aud(c.maxPrice)}${unit}`);
  else if (c.maxPrice !== null) out.push(`Up to ${aud(c.maxPrice)}${unit}`);
  else if (c.minPrice !== null) out.push(`From ${aud(c.minPrice)}${unit}`);
  if (c.minLandM2 !== null) out.push(`${c.minLandM2}+ m² land`);
  for (const f of c.features) out.push(featureLabel(f));
  if (c.inspectionSaturday) out.push("Open Saturday");
  if (!c.includeOffThePlan) out.push("No off-the-plan");
  return out;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 300) : "";
  const page = Math.max(1, Number(params.page) || 1);
  const suburbList = suburbs();

  let intent: IntentResult | null = null;
  let criteria: Criteria;
  if (q.trim()) {
    intent = parseIntent(q, suburbList.map((s) => s.name));
    criteria = intent.criteria;
  } else {
    criteria = criteriaFromParams(params);
  }

  const all = publishedListings().map(toSummary);
  const outcome = search(all, criteria, AS_OF);
  const shown = outcome.results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.ceil(outcome.total / PAGE_SIZE);
  const suggestions = outcome.total === 0 ? refinements(all, criteria, AS_OF) : [];
  const baseParams = criteriaToParams(criteria);
  const active = chips(criteria);
  // The buy/rent chip is always there, so it doesn't count as a filter.
  const activeCount = active.length - 1;
  const firstShown = (page - 1) * PAGE_SIZE + 1;

  return (
    <div className="flex flex-col gap-6">
      <SearchBox defaultValue={q} />

      {intent && (
        <section aria-labelledby="understood" className="card border-brand-100 bg-gradient-to-br from-white to-brand-50/60 p-4 sm:p-5">
          <h2 id="understood" className="flex items-center gap-2 text-sm font-bold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                <path d="m12 2 2.1 6.5H21l-5.5 4 2.1 6.5-5.6-4-5.5 4 2.1-6.5-5.6-4h6.9z" />
              </svg>
            </span>
            How we read your search
          </h2>
          {intent.understood.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {intent.understood.map((u) => (
                <li key={u.phrase + u.meaning} className="rounded-full bg-white px-3 py-1 text-sm font-medium text-brand-800 ring-1 ring-brand-200">
                  {u.meaning}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted">We couldn't pick out any criteria, so these are all homes for sale. Try mentioning a suburb, budget or number of bedrooms.</p>
          )}
          {intent.assumptions.length > 0 && (
            <div className="mt-3 text-sm">
              <p className="font-medium">Assumptions we made</p>
              <ul className="ml-5 list-disc text-muted">
                {intent.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {intent.clarifications.length > 0 && (
            <div className="mt-3 rounded-xl bg-warn-50 p-3 text-sm text-warn-700" role="status">
              <p className="font-medium">Can you clarify?</p>
              <ul className="ml-5 list-disc">
                {intent.clarifications.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {intent.unsupported.length > 0 && (
            <p className="mt-3 text-sm text-muted">
              We can't filter by {intent.unsupported.join(", ")} yet, so those parts of your search were not applied.
            </p>
          )}
          <p className="mt-3 text-xs text-muted">Edit the criteria to change anything we got wrong.</p>
        </section>
      )}

      <FilterSheetProvider>
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="contents lg:sticky lg:top-[5.25rem] lg:block lg:self-start">
            <FilterPanel activeCount={activeCount}>
              {/* Remount when the criteria change so the fields show what was just applied. */}
              <CriteriaForm key={baseParams.toString() + q} criteria={criteria} suburbs={suburbList} />
            </FilterPanel>
          </aside>

          <section aria-labelledby="results" className="min-w-0 lg:min-h-[calc(100dvh-6rem)]">
            <div className="sticky top-14 z-20 -mx-4 mb-4 flex items-center gap-2 border-b border-line/70 bg-canvas/90 px-4 py-2.5 backdrop-blur-md sm:top-16 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
              <h2 id="results" aria-live="polite" className="mr-auto whitespace-nowrap text-base font-bold sm:text-xl">
                {outcome.total === 0 ? "No matches" : `${outcome.total} home${outcome.total === 1 ? "" : "s"}`}
              </h2>
              <FilterTrigger activeCount={activeCount} />
              <SortSelect value={criteria.sort} />
            </div>
            <ul className="-mt-1 mb-4 flex flex-wrap gap-1.5" aria-label="Active criteria">
              {active.map((c) => (
                <li key={c} className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-line">
                  {c}
                </li>
              ))}
            </ul>

            {outcome.hiddenPriceExcluded > 0 && (
              <p className="mb-3 text-sm text-muted">
                {outcome.hiddenPriceExcluded} home{outcome.hiddenPriceExcluded === 1 ? " has" : "s have"} no published price and {outcome.hiddenPriceExcluded === 1 ? "isn't" : "aren't"} included in price-filtered results.{" "}
                <Link className="underline" href={`/search?${new URLSearchParams([...baseParams].filter(([k]) => k !== "min" && k !== "max"))}`}>
                  Show without a price filter
                </Link>
              </p>
            )}

            {outcome.total === 0 ? (
              <div className="card p-6 sm:p-8">
                <p>Nothing in the pilot area matches all of these criteria. We won't show homes that don't meet them.</p>
                {suggestions.length > 0 ? (
                  <>
                    <p className="mt-3 text-sm font-medium">Try relaxing one thing:</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {suggestions.map((s) => (
                        <li key={s.label}>
                          <Link href={`/search?${criteriaToParams(s.criteria)}`} className="inline-block rounded-full bg-brand-50 px-3.5 py-1.5 text-sm font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100">
                            {s.label} ({s.count})
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted">Try a different suburb or fewer must-haves.</p>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {shown.map((l) => (
                    <ListingCard key={l.id} listing={l} surface="search" />
                  ))}
                </div>
                {pages > 1 && (
                  <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-3 text-sm">
                    {page > 1 && (
                      <Link className="btn btn-secondary" href={`/search?${new URLSearchParams([...baseParams, ["page", String(page - 1)]])}`}>
                        Previous
                      </Link>
                    )}
                    <span className="text-muted">
                      {firstShown}–{firstShown + shown.length - 1} of {outcome.total}
                    </span>
                    {page < pages && (
                      <Link className="btn btn-secondary" href={`/search?${new URLSearchParams([...baseParams, ["page", String(page + 1)]])}`}>
                        Next
                      </Link>
                    )}
                  </nav>
                )}
              </>
            )}
          </section>
        </div>
      </FilterSheetProvider>
      <SearchTracker mode={intent ? "natural_language" : "filters"} resultCount={outcome.total} criteriaCount={activeCount} />
      <RememberBackPath />
    </div>
  );
}
