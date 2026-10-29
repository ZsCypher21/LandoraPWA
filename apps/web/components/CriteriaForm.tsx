import Form from "next/form";
import Link from "next/link";
import type { ReactNode } from "react";
import { CRITERIA_FORM_ID, PROPERTY_TYPE_OPTIONS, SEARCH_FEATURES, type Criteria } from "@/lib/criteria";
import { featureLabel } from "@/lib/format";

// The editable structured criteria (FR-SRCH-002). Submitting replaces any natural-language reading.
// next/form keeps it a plain GET form (works before JavaScript, shareable URL) with client-side navigation.

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className="flex flex-col gap-3 border-t border-line pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted" aria-hidden="true">
        {title}
      </p>
      {children}
    </div>
  );
}

function NumberSelect({ name, label, value, options }: { name: string; label: string; value: number | null; options: number[] }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <select name={name} defaultValue={value === null ? "" : String(value)} className="field">
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}+
          </option>
        ))}
      </select>
    </label>
  );
}


const CHIP =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 transition hover:border-brand-200 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700";

export function CriteriaForm({ criteria, suburbs }: { criteria: Criteria; suburbs: { name: string }[] }) {
  const rent = criteria.listingType === "rent";
  return (
    <Form id={CRITERIA_FORM_ID} action="/search" className="flex min-h-0 flex-1 flex-col" aria-label="Search criteria">
      {/* Fields scroll inside the panel; the actions below stay put. */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 py-4">
        <fieldset className="flex gap-1 rounded-full bg-canvas p-1">
          <legend className="sr-only">Buy or rent</legend>
          {(["buy", "rent"] as const).map((t) => (
            <label key={t} className="flex-1">
              <input type="radio" name="type" value={t} defaultChecked={criteria.listingType === t} className="peer sr-only" />
              <span className="block cursor-pointer rounded-full px-3 py-2 text-center text-sm font-semibold capitalize text-muted transition peer-checked:bg-surface peer-checked:text-brand-700 peer-checked:shadow-card peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-brand-600">
                {t}
              </span>
            </label>
          ))}
        </fieldset>

        <Group title="Where">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Suburb</span>
            <select name="suburb" defaultValue={criteria.suburbs[0] ?? ""} className="field">
              <option value="">All pilot suburbs</option>
              {suburbs.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            {criteria.suburbs.length > 1 && <span className="text-xs text-muted">Searching {criteria.suburbs.join(", ")}. Choosing here narrows to one.</span>}
          </label>
        </Group>

        <Group title="Home">
          <fieldset className="text-sm">
            <legend className="mb-1.5 font-medium">Property type</legend>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPE_OPTIONS.map((t) => (
                <label key={t} className={CHIP}>
                  <input type="checkbox" className="accent-brand-600" name="ptype" value={t} defaultChecked={criteria.propertyTypes.includes(t)} />
                  <span className="capitalize">{t}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-3 gap-2">
            <NumberSelect name="beds" label="Beds" value={criteria.minBeds} options={[1, 2, 3, 4, 5]} />
            <NumberSelect name="baths" label="Baths" value={criteria.minBaths} options={[1, 2, 3]} />
            <NumberSelect name="cars" label="Cars" value={criteria.minCars} options={[1, 2, 3]} />
          </div>
        </Group>

        <Group title={rent ? "Rent and land" : "Price and land"}>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Min {rent ? "$/week" : "price"}</span>
              <input name="min" type="number" inputMode="numeric" min={0} step={rent ? 10 : 10000} defaultValue={criteria.minPrice ?? ""} placeholder="Any" className="field" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Max {rent ? "$/week" : "price"}</span>
              <input name="max" type="number" inputMode="numeric" min={0} step={rent ? 10 : 10000} defaultValue={criteria.maxPrice ?? ""} placeholder="Any" className="field" />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Minimum land (m²)</span>
            <input name="land" type="number" inputMode="numeric" min={0} step={50} defaultValue={criteria.minLandM2 ?? ""} placeholder="Any" className="field" />
          </label>
        </Group>

        <Group title="Must have">
          <fieldset className="text-sm">
            <legend className="sr-only">Features</legend>
            <div className="flex flex-wrap gap-2">
              {SEARCH_FEATURES.map((f) => (
                <label key={f} className={CHIP}>
                  <input type="checkbox" className="accent-brand-600" name="feature" value={f} defaultChecked={criteria.features.includes(f)} />
                  {featureLabel(f)}
                </label>
              ))}
            </div>
          </fieldset>
        </Group>

        <Group title="More">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" name="sat" value="1" defaultChecked={criteria.inspectionSaturday} />
            Open for inspection this Saturday
          </label>
          {!rent && (
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" name="otp" value="0" defaultChecked={!criteria.includeOffThePlan} />
              Hide off-the-plan homes
            </label>
          )}
        </Group>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-line bg-surface px-4 py-3 shadow-[0_-4px_12px_rgb(15_26_23/0.05)]">
        <Link href={rent ? "/search?type=rent" : "/search"} className="btn px-3 text-muted hover:text-ink">
          Clear all
        </Link>
        <button type="submit" className="btn btn-primary flex-1">
          Update results
        </button>
      </div>
    </Form>
  );
}
