import type { SyntheticAgency, SyntheticDataset, SyntheticListing } from "./generate";

// Writes synthetic listings as REAXML so they flow through the same ingestion adapter as real feeds (ADR 0008).

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** "2026-10-28T09:30:00+10:00" → "2026-10-28-09:30:00" (feed-local time). */
function reaxmlDateTime(iso: string): string {
  return `${iso.slice(0, 10)}-${iso.slice(11, 19)}`;
}

function clock(iso: string): string {
  const h = Number(iso.slice(11, 13));
  const m = iso.slice(14, 16);
  return `${h % 12 === 0 ? 12 : h % 12}:${m}${h < 12 ? "am" : "pm"}`;
}

function inspectionText(startsAt: string, endsAt: string): string {
  const day = Number(startsAt.slice(8, 10));
  const month = MONTHS[Number(startsAt.slice(5, 7)) - 1];
  return `${day}-${month}-${startsAt.slice(0, 4)} ${clock(startsAt)} to ${clock(endsAt)}`;
}

const CATEGORY: Record<string, string> = { house: "House", townhouse: "Townhouse", unit: "Unit", apartment: "Apartment" };

function listingXml(l: SyntheticListing, agency: SyntheticAgency, dataset: SyntheticDataset): string {
  const element = l.listingType === "rent" ? "rental" : l.propertyType === "land" ? "land" : "residential";
  const agents = l.agentIds
    .map((id, i) => {
      const a = dataset.agents.find((x) => x.id === id);
      if (!a) throw new Error(`Unknown agent ${id}`);
      return `    <listingAgent id="${i + 1}"><name>${esc(a.fullName)}</name><telephone type="BH">${esc(a.phone)}</telephone><email>${esc(a.email)}</email></listingAgent>`;
    })
    .join("\n");

  const lines: string[] = [
    `  <${element} modTime="${reaxmlDateTime(l.sourceModTime)}" status="current">`,
    `    <agentID>${agency.externalAgentId}</agentID>`,
    `    <uniqueID>${l.sourceListingId}</uniqueID>`,
    agents,
    `    <underOffer value="${l.status === "under_offer" ? "yes" : "no"}"/>`,
  ];
  if (l.listingType === "rent") {
    lines.push(`    <rent period="week" display="yes">${l.rentPerWeekAud}</rent>`, `    <bond>${l.bondAud}</bond>`, `    <dateAvailable>${l.availableFrom}</dateAvailable>`);
  } else {
    lines.push(`    <price display="${l.priceHidden ? "no" : "yes"}">${l.priceMinAud}</price>`);
    if (l.priceDisplay) lines.push(`    <priceView>${esc(l.priceDisplay)}</priceView>`);
  }
  lines.push(
    `    <address display="yes">`,
    `      <subNumber>${esc(l.address.unitNumber ?? "")}</subNumber>`,
    `      <streetNumber>${esc(l.address.streetNumber)}</streetNumber>`,
    `      <street>${esc(l.address.streetName)}</street>`,
    `      <suburb display="yes">${esc(l.address.suburb)}</suburb>`,
    `      <state>QLD</state>`,
    `      <postcode>${l.address.postcode}</postcode>`,
    `      <country>AUS</country>`,
    `    </address>`,
  );
  if (CATEGORY[l.propertyType]) lines.push(`    <category name="${CATEGORY[l.propertyType]}"/>`);
  lines.push(`    <headline>${esc(l.headline)}</headline>`, `    <description>${esc(l.description)}</description>`);
  if (l.propertyType !== "land") {
    lines.push(
      `    <features>`,
      `      <bedrooms>${l.bedrooms}</bedrooms>`,
      `      <bathrooms>${l.bathrooms}</bathrooms>`,
      `      <garages>${l.carSpaces}</garages>`,
      ...(l.features.includes("pool") ? ["      <pool>1</pool>"] : []),
      ...(l.features.filter((f) => f !== "pool").length ? [`      <otherFeatures>${l.features.filter((f) => f !== "pool").join(", ")}</otherFeatures>`] : []),
      `    </features>`,
    );
  }
  if (l.landAreaM2) lines.push(`    <landDetails><area unit="squareMeter">${l.landAreaM2}</area></landDetails>`);
  if (l.buildingAreaM2) lines.push(`    <buildingDetails><area unit="squareMeter">${l.buildingAreaM2}</area></buildingDetails>`);
  if (l.auctionAt) lines.push(`    <auction date="${reaxmlDateTime(l.auctionAt).slice(0, 16)}"/>`);
  if (l.newConstruction) lines.push(`    <newConstruction>yes</newConstruction>`);
  if (l.inspections.length) {
    lines.push(`    <inspectionTimes>`, ...l.inspections.map((i) => `      <inspection>${inspectionText(i.startsAt, i.endsAt)}</inspection>`), `    </inspectionTimes>`);
  }
  const imgs = Array.from({ length: l.imageCount }, (_, i) => {
    const id = i === 0 ? "m" : String.fromCharCode(96 + i);
    return `      <img id="${id}" url="https://media.synthetic.example/${l.sourceListingId}/${id}.jpg" format="jpg"/>`;
  });
  lines.push(`    <objects>`, ...imgs, `    </objects>`, `  </${element}>`);
  return lines.join("\n");
}

/** One REAXML file per agency, as an agency's CRM would send it. */
export function toReaxml(dataset: SyntheticDataset, agency: SyntheticAgency): string {
  const body = dataset.listings
    .filter((l) => l.agencyId === agency.id)
    .map((l) => listingXml(l, agency, dataset))
    .join("\n");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<!-- ${esc(dataset.meta.disclaimer)} -->`,
    `<propertyList date="${dataset.meta.asOf}-06:00:00" username="synthetic" password="">`,
    body,
    `</propertyList>`,
    ``,
  ].join("\n");
}
