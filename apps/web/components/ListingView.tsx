import Link from "next/link";
import type { ReactNode } from "react";
import { BackLink } from "@/components/BackLink";
import { DisclosureBadge, ListingSpecs } from "@/components/ListingCard";
import { ListingGallery } from "@/components/ListingGallery";
import { ListingViewTracker } from "@/components/ListingViewTracker";
import { SaveButton } from "@/components/SaveButton";
import { ShareButton } from "@/components/ShareButton";
import { aud, day, featureLabel, longDate, priceLabel, time, typeLabel } from "@/lib/format";
import type { ListingDetail } from "@/lib/types";

// The buyer's listing page. The agent console's preview renders this same component (FR-AGT-003:
// preview is exactly the buyer view), with a preview banner in place of tracking and buyer actions.

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-display text-lg font-bold">{value}</dd>
    </div>
  );
}

function SourceNote({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs text-muted">{children}</p>;
}

export function ListingView({ listing: l, preview }: { listing: ListingDetail; preview?: ReactNode }) {
  return (
    <article className="flex flex-col gap-6">
      {preview ?? (
        <>
          <ListingViewTracker listingId={l.id} suburbId={l.suburbId} />
          <BackLink />
        </>
      )}

      <ListingGallery listing={l} />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className="font-display text-3xl font-extrabold tracking-tight">{priceLabel(l)}</p>
          <h1 className="font-sans text-base font-normal tracking-normal text-muted sm:text-lg">{l.displayAddress}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-medium">
            <ListingSpecs listing={l} />
          </div>
          <p className="mt-2 text-lg">{l.headline}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {l.disclosureReady && <DisclosureBadge />}
            {l.status === "under_offer" && <span className="rounded-full bg-warn-50 px-2 py-0.5 text-xs text-warn-700">Under offer</span>}
            <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium ring-1 ring-line">{typeLabel(l.listingType === "off_the_plan" ? "off_the_plan" : l.propertyType)}</span>
          </div>
        </div>
        {!preview && (
          <div className="flex shrink-0 gap-2">
            <SaveButton listingId={l.id} suburbId={l.suburbId} surface="listing_page" />
            <ShareButton listingId={l.id} title={l.displayAddress} />
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold">About this home</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-canvas p-4 sm:grid-cols-4">
              {l.propertyType !== "land" && <Fact label="Bedrooms" value={String(l.bedrooms)} />}
              {l.propertyType !== "land" && <Fact label="Bathrooms" value={String(l.bathrooms)} />}
              {l.propertyType !== "land" && <Fact label="Car spaces" value={String(l.carSpaces)} />}
              {l.landAreaM2 !== null && <Fact label="Land" value={`${l.landAreaM2} m²`} />}
              {l.buildingAreaM2 !== null && <Fact label="Building" value={`${l.buildingAreaM2} m²`} />}
              {l.bondAud !== null && <Fact label="Bond" value={aud(l.bondAud)} />}
              {l.availableFrom && <Fact label="Available" value={longDate(l.availableFrom)} />}
              {l.auctionAt && <Fact label="Auction" value={`${day(l.auctionAt)} ${time(l.auctionAt)}`} />}
            </dl>
            <p className="mt-4 whitespace-pre-line leading-relaxed">{l.description}</p>
            {l.features.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {l.features.map((f) => (
                  <li key={f} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">
                    {featureLabel(f)}
                  </li>
                ))}
              </ul>
            )}
            {l.offThePlan && (
              <p className="mt-3 text-sm">
                Off the plan: {l.offThePlan.stage}, estimated completion {longDate(l.offThePlan.estimatedCompletion)}, by {l.offThePlan.developerName}.
              </p>
            )}
            <SourceNote>
              Source: the listing agent's feed ({l.agencyName}, listing {l.sourceListingId}), updated {longDate(l.sourceModTime)}. Synthetic.
            </SourceNote>
          </section>

          {l.listingType !== "rent" && (
            <section className="card p-5 sm:p-6" aria-labelledby="value">
              <h2 id="value" className="text-lg font-bold">
                Price context
              </h2>
              <p className="mt-2 rounded-xl bg-warn-50 p-3 text-xs text-warn-700">
                Placeholder figures. Landora has no licensed valuation data yet, so these numbers are invented for the prototype and are not an estimate of this home's value.
              </p>
              {l.placeholderEstimate ? (
                <p className="mt-3 text-sm">
                  Placeholder estimate {aud(l.placeholderEstimate.lowAud)} to {aud(l.placeholderEstimate.highAud)} (confidence: {l.placeholderEstimate.confidence}).
                </p>
              ) : (
                <p className="mt-3 text-sm text-muted">No estimate is available for this property.</p>
              )}
              {l.placeholderSalesHistory.length > 0 && (
                <p className="mt-1 text-sm">
                  Previous sale (placeholder): {aud(l.placeholderSalesHistory[0]!.priceAud)} in {l.placeholderSalesHistory[0]!.date.slice(0, 4)}.
                </p>
              )}
              <SourceNote>Source: synthetic placeholder, standing in for licensed data, effective {l.placeholderEstimate ? longDate(l.placeholderEstimate.effectiveDate) : "n/a"}.</SourceNote>
            </section>
          )}

          {l.suburbStats && (
            <section className="card p-5 sm:p-6">
              <h2 className="text-lg font-bold">{l.suburb} at a glance</h2>
              <dl className="mt-4 grid grid-cols-3 gap-4 rounded-xl bg-canvas p-4">
                <Fact label="Median house (placeholder)" value={aud(l.suburbStats.medianHouseAud)} />
                <Fact label="12-month change (placeholder)" value={`${l.suburbStats.annualGrowthPct}%`} />
                <Fact label="Days on market (placeholder)" value={String(l.suburbStats.daysOnMarket)} />
              </dl>
              <SourceNote>Source: synthetic placeholder suburb statistics, effective {longDate(l.suburbStats.effectiveDate)}. School catchments are not available in the prototype.</SourceNote>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold">Inspections</h2>
            {l.inspections.length ? (
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {l.inspections.map((i) => (
                  <li key={i.startsAt} className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-700 shadow-sm" aria-hidden="true">
                      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor">
                        <path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zm-2 8h14v10H5z" />
                      </svg>
                    </span>
                    <span>
                      <span className="block font-semibold">{day(i.startsAt)}</span>
                      <span className="text-muted">
                        {time(i.startsAt)} to {time(i.endsAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">No open homes are scheduled. Contact the agent to arrange a time.</p>
            )}
            {l.inspections.length > 0 && (
              <Link href="/inspections" className="btn btn-secondary mt-3 w-full">
                Plan your inspections
              </Link>
            )}
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold">Agent</h2>
            <p className="text-sm text-muted">{l.agencyName}</p>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {l.agents.map((a) => (
                <li key={a.email} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800" aria-hidden="true">
                    {a.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <span>
                    <span className="block font-semibold">{a.name}</span>
                    <span className="text-muted">{a.phone}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">Contact details are fictional. Agent messaging arrives with listing Q&amp;A.</p>
          </section>

          {l.compliance && (
            <section className="card p-5 sm:p-6" aria-labelledby="disclosure">
              <h2 id="disclosure" className="text-lg font-bold">
                Seller disclosure
              </h2>
              {l.disclosureReady ? (
                <p className="mt-1 text-sm">The agent has confirmed the Queensland seller disclosure statement (Form 2) and required documents are ready. Ask the agent for a copy before you sign a contract.</p>
              ) : (
                <p className="mt-1 text-sm">Disclosure has not been confirmed for this listing. Ask the agent for the seller disclosure statement before you sign a contract.</p>
              )}
              <ul className="mt-3 flex flex-col gap-1.5 text-xs">
                {l.compliance.checks.map((c) => (
                  <li key={c.title} className="flex items-start gap-2">
                    <span
                      className={`mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        c.status === "pass" ? "bg-brand-100 text-brand-700" : c.status === "fail" ? "bg-bad-50 text-bad-700" : "bg-warn-50 text-warn-700"
                      }`}
                      aria-hidden="true"
                    >
                      {c.status === "pass" ? "✓" : c.status === "fail" ? "!" : "?"}
                    </span>
                    <span>
                      <span className="sr-only">{c.status === "pass" ? "Passed: " : c.status === "fail" ? "Failed: " : "Unknown: "}</span>
                      {c.title}
                      {c.platformPolicy ? <span className="text-muted"> (Landora policy)</span> : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <SourceNote>
                Checked by rule pack {l.compliance.packId} v{l.compliance.packVersion} ({l.compliance.packStatus}). This confirms the documents are ready, not what they say. It is not legal advice.
              </SourceNote>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
