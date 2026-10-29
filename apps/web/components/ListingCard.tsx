import Link from "next/link";
import type { ReactNode } from "react";
import { day, priceLabel, time, typeLabel } from "@/lib/format";
import type { ListingSummary } from "@/lib/types";
import { ListingImage } from "./ListingImage";
import { SaveButton } from "./SaveButton";

export function DisclosureBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700"
      title="The agent has confirmed the Queensland seller disclosure documents are ready"
    >
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true" fill="currentColor">
        <path d="M10 1.7 3.3 4.4v5c0 4.3 2.9 7.7 6.7 8.9 3.8-1.2 6.7-4.6 6.7-8.9v-5zm-1.2 11.7L5.6 10.2l1.2-1.2 2 2 4.4-4.4 1.2 1.2z" />
      </svg>
      Disclosure-ready
    </span>
  );
}

const SPEC_ICONS = {
  bed: "M3 7v11h2v-2h14v2h2v-6a3 3 0 0 0-3-3h-7v5H5V7zm5 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  bath: "M7 4a2 2 0 0 0-2 2v5H3v2a5 5 0 0 0 3 4.6V20h2v-2h8v2h2v-2.4a5 5 0 0 0 3-4.6v-2H7V6h2.5V5A1 1 0 0 0 7 4z",
  car: "M6.3 5 4 11v8h2v-2h12v2h2v-8l-2.3-6zm1.4 2h8.6l1.5 4H6.2zM7 13a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm10 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z",
  land: "M3 5v14h18V5zm2 2h14v10H5z",
} as const;

function Spec({ icon, children }: { icon: keyof typeof SPEC_ICONS; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted" fill="currentColor" aria-hidden="true">
        <path d={SPEC_ICONS[icon]} />
      </svg>
      {children}
    </span>
  );
}

export function ListingSpecs({ listing }: { listing: Pick<ListingSummary, "propertyType" | "bedrooms" | "bathrooms" | "carSpaces" | "landAreaM2"> }) {
  if (listing.propertyType === "land") return <Spec icon="land">{listing.landAreaM2 ?? "?"} m² land</Spec>;
  return (
    <>
      <Spec icon="bed">
        {listing.bedrooms}
        <span className="sr-only"> bedrooms</span>
      </Spec>
      <Spec icon="bath">
        {listing.bathrooms}
        <span className="sr-only"> bathrooms</span>
      </Spec>
      <Spec icon="car">
        {listing.carSpaces}
        <span className="sr-only"> car spaces</span>
      </Spec>
    </>
  );
}

export function ListingCard({ listing, surface }: { listing: ListingSummary; surface: string }) {
  const next = listing.inspections[0];
  return (
    <article className="group card relative flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative overflow-hidden">
        <ListingImage seed={listing.id} label={listing.displayAddress} propertyType={listing.propertyType} className="aspect-[4/3] w-full transition duration-300 group-hover:scale-[1.03]" />
        <div className="absolute right-3 top-3 z-10">
          <SaveButton listingId={listing.id} suburbId={listing.suburbId} surface={surface} variant="overlay" />
        </div>
        <div className="absolute left-3 top-3 z-10 flex gap-1.5">
          {listing.listingType === "off_the_plan" && <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold shadow-sm">Off the plan</span>}
          {listing.status === "under_offer" && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-warn-700 shadow-sm">Under offer</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="font-display text-lg font-bold tracking-tight">{priceLabel(listing)}</p>
        <h3 className="font-sans text-sm font-normal tracking-normal text-muted">
          <Link href={`/listing/${listing.id}`} className="after:absolute after:inset-0 hover:text-ink">
            {listing.displayAddress}
          </Link>
        </h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium">
          <ListingSpecs listing={listing} />
          {listing.propertyType !== "land" && <span className="text-muted">{typeLabel(listing.propertyType)}</span>}
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          {listing.disclosureReady ? <DisclosureBadge /> : <span />}
          {next && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sun-50 px-2 py-0.5 text-xs font-semibold text-sun-800 ring-1 ring-sun-100">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                <path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2zm-2 8h14v10H5z" />
              </svg>
              Open {day(next.startsAt)} {time(next.startsAt)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
