import { CANONICAL_SCHEMA_VERSION, type ListingStatus, type ListingType, type PropertyType } from "@landora/schema";
import { Random } from "./random";

// Synthetic pilot dataset (V11 §14.4): fictional agencies, agents, streets, prices and enrichment,
// placed in real Sunshine Coast suburbs so maps and routing behave realistically.
// Using Sunshine Coast suburbs is a prototype convenience, not a pilot-market decision.

export const DISCLAIMER =
  "SYNTHETIC DATA. Every agency, agent, street address, price, sale history and valuation here is fictional and generated for design and testing (Landora V11 §14.4). Never present it as real.";

export interface SyntheticSuburb {
  id: string;
  name: string;
  state: "QLD";
  postcode: string;
  centre: { lat: number; lng: number };
  /** Fictional median house price used to generate prices. */
  syntheticMedianHouseAud: number;
  isPilot: true;
}

export interface SyntheticAgency {
  id: string;
  name: string;
  externalAgentId: string;
  verificationStatus: "verified";
}

export interface SyntheticAgent {
  id: string;
  agencyId: string;
  fullName: string;
  email: string;
  phone: string;
  verificationStatus: "verified" | "pending" | "exception_approved";
}

export interface SyntheticComplianceFacts {
  "disclosure.exemption": "none" | "proposed_lot";
  "disclosure.form2_ready": boolean;
  "disclosure.title_search_ready": boolean;
  "property.community_titles_lot": boolean;
  "disclosure.body_corporate_docs_ready": boolean;
  "property.has_regulated_pool": boolean;
  "disclosure.pool_certificate_ready": boolean;
  "property.on_environmental_register": boolean;
  "disclosure.environmental_notice_ready": boolean;
}

export interface SyntheticListing {
  id: string;
  propertyId: string;
  agencyId: string;
  agentIds: string[];
  sourceListingId: string;
  sourceModTime: string;
  listingType: ListingType;
  status: ListingStatus;
  propertyType: PropertyType;
  address: { unitNumber: string | null; streetNumber: string; streetName: string; suburbId: string; suburb: string; postcode: string };
  location: { lat: number; lng: number };
  headline: string;
  description: string;
  priceDisplay: string | null;
  priceMinAud: number | null;
  priceMaxAud: number | null;
  priceHidden: boolean;
  rentPerWeekAud: number | null;
  bondAud: number | null;
  availableFrom: string | null;
  bedrooms: number;
  bathrooms: number;
  carSpaces: number;
  landAreaM2: number | null;
  buildingAreaM2: number | null;
  features: string[];
  newConstruction: boolean;
  offThePlan: { stage: string; estimatedCompletion: string; developerName: string } | null;
  auctionAt: string | null;
  inspections: { startsAt: string; endsAt: string }[];
  imageCount: number;
  complianceFacts: SyntheticComplianceFacts | null;
}

export interface SyntheticEnrichment {
  id: string;
  propertyId: string | null;
  suburbId: string | null;
  kind: "avm" | "comparables" | "sales_history" | "suburb_stats";
  provider: "synthetic";
  sourceType: "synthetic";
  isPlaceholder: true;
  effectiveDate: string;
  payload: Record<string, unknown>;
}

export interface SyntheticDataset {
  meta: { disclaimer: string; seed: number; asOf: string; canonicalSchemaVersion: string; counts: Record<string, number> };
  suburbs: SyntheticSuburb[];
  agencies: SyntheticAgency[];
  agents: SyntheticAgent[];
  listings: SyntheticListing[];
  enrichments: SyntheticEnrichment[];
}

export interface GenerateOptions {
  seed?: number;
  /** Date the dataset is "as of"; inspections fall on the following two Saturdays. */
  asOf?: string;
  saleListings?: number;
  rentListings?: number;
}

// Approximate suburb centres; medians are invented for generation and are not market data.
const SUBURBS: readonly [name: string, postcode: string, lat: number, lng: number, median: number, weight: number][] = [
  ["Buderim", "4556", -26.684, 153.052, 1_150_000, 14],
  ["Maroochydore", "4558", -26.658, 153.091, 1_050_000, 14],
  ["Mooloolaba", "4557", -26.682, 153.118, 1_400_000, 9],
  ["Sippy Downs", "4556", -26.718, 153.059, 880_000, 10],
  ["Nambour", "4560", -26.627, 152.959, 720_000, 12],
  ["Caloundra", "4551", -26.803, 153.128, 1_000_000, 12],
  ["Palmview", "4553", -26.747, 153.063, 860_000, 9],
  ["Birtinya", "4575", -26.744, 153.119, 980_000, 8],
  ["Coolum Beach", "4573", -26.528, 153.088, 1_250_000, 8],
  ["Little Mountain", "4551", -26.786, 153.098, 930_000, 7],
];

const AGENCIES = ["Synthetic Coast Realty", "Example Hinterland Property", "Placeholder & Co Real Estate", "Fictional Shores Estate Agents", "Demo Realty Group", "Sample Street Property"];
const FIRST = ["Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Jamie", "Avery", "Quinn", "Drew", "Robin", "Charlie", "Hayden", "Kai", "Remy", "Sasha", "Ari", "Noor", "Mika", "Devi", "Tane"];
const LAST = ["Example", "Placeholder", "Sample", "Testwood", "Demo", "Fiction", "Mockley", "Stubbs", "Fixture", "Synthwell"];
const STREET_NAMES = ["Placeholder", "Sample", "Example", "Fiction", "Mockingbird", "Template", "Prototype", "Sandbox", "Draft", "Wireframe", "Pixel", "Fixture", "Stub", "Variable", "Constant", "Lorem", "Ipsum", "Dummy", "Synthetic", "Testing"];
const STREET_TYPES = ["Street", "Parade", "Avenue", "Crescent", "Court", "Drive", "Lane", "Place", "Terrace", "Close"];
const FEATURE_POOL = ["air_conditioning", "solar_panels", "shed", "fully_fenced", "built_in_robes", "dishwasher", "study", "outdoor_ent", "water_tank", "side_access", "deck", "balcony", "secure_parking", "remote_garage"];
const DEVELOPERS = ["Example Developments", "Placeholder Living", "Sample Communities"];

const TYPE_FACTOR: Record<string, number> = { house: 1, townhouse: 0.72, unit: 0.62, apartment: 0.68, land: 0.48 };

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextSaturday(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return addDays(isoDate, ((6 - day + 7) % 7) || 7);
}

function qldTime(date: string, minutesFromMidnight: number): string {
  const h = String(Math.floor(minutesFromMidnight / 60)).padStart(2, "0");
  const m = String(minutesFromMidnight % 60).padStart(2, "0");
  return `${date}T${h}:${m}:00+10:00`;
}

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

function money(n: number): string {
  return `$${n.toLocaleString("en-AU")}`;
}

function headlineFor(r: Random, type: PropertyType, beds: number, features: string[], listingType: ListingType, suburb: string): string {
  if (listingType === "off_the_plan") return r.pick([`Off the plan in ${suburb}: ${beds}-bed ${type}`, `New ${type}s releasing now in ${suburb}`]);
  if (type === "land") return r.pick(["Level block ready to build", "Build your first home here", "Corner block close to schools"]);
  const options = [
    `${beds}-bedroom ${type} close to the beach`,
    `Family ${type} on a quiet street`,
    `Low-maintenance ${type} near shops and transport`,
    `Light-filled ${type} with room to grow`,
  ];
  if (features.includes("pool")) options.push(`Entertainer's ${type} with pool`);
  if (beds <= 2) options.push(`First-home-friendly ${type} in ${suburb}`);
  if (r.chance(0.2)) options.push(`Renovator's opportunity in ${suburb}`);
  return r.pick(options);
}

export function generate(options: GenerateOptions = {}): SyntheticDataset {
  const seed = options.seed ?? 20261028;
  const asOf = options.asOf ?? "2026-10-28";
  const saleCount = options.saleListings ?? 320;
  const rentCount = options.rentListings ?? 110;
  const r = new Random(seed);

  const suburbs: SyntheticSuburb[] = SUBURBS.map(([name, postcode, lat, lng, median]) => ({
    id: r.uuid(),
    name,
    state: "QLD",
    postcode,
    centre: { lat, lng },
    syntheticMedianHouseAud: median,
    isPilot: true,
  }));

  const agencies: SyntheticAgency[] = AGENCIES.map((name, i) => ({
    id: r.uuid(),
    name,
    externalAgentId: `SYN-AG-${String(i + 1).padStart(3, "0")}`,
    verificationStatus: "verified",
  }));

  const agents: SyntheticAgent[] = [];
  const usedNames = new Set<string>();
  for (const agency of agencies) {
    const n = r.int(3, 4);
    for (let i = 0; i < n; i++) {
      let fullName: string;
      do fullName = `${r.pick(FIRST)} ${r.pick(LAST)}`;
      while (usedNames.has(fullName));
      usedNames.add(fullName);
      const domain = agency.name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
      agents.push({
        id: r.uuid(),
        agencyId: agency.id,
        fullName,
        email: `${fullName.toLowerCase().replace(/\s+/g, ".")}@${domain}.example`,
        phone: `0700 ${String(r.int(0, 999)).padStart(3, "0")} ${String(r.int(0, 999)).padStart(3, "0")}`,
        verificationStatus: "verified",
      });
    }
  }
  // Exercise the verification gate: one pending agent, one approved exception.
  (agents[1] as SyntheticAgent).verificationStatus = "pending";
  (agents[5] as SyntheticAgent).verificationStatus = "exception_approved";

  const saturdays = [nextSaturday(asOf), addDays(nextSaturday(asOf), 7)];
  const listings: SyntheticListing[] = [];
  const enrichments: SyntheticEnrichment[] = [];
  const suburbWeights = suburbs.map((s, i) => [s, (SUBURBS[i] as (typeof SUBURBS)[number])[5]] as const);
  const usedAddresses = new Set<string>();

  const makeListing = (listingType: ListingType, index: number): SyntheticListing => {
    const suburb = r.weighted(suburbWeights);
    const agency = r.pick(agencies);
    const agencyAgents = agents.filter((a) => a.agencyId === agency.id);
    const lead = r.pick(agencyAgents);
    const agentIds = r.chance(0.2) ? [lead.id, r.pick(agencyAgents.filter((a) => a.id !== lead.id)).id] : [lead.id];

    const propertyType: PropertyType =
      listingType === "off_the_plan"
        ? r.weighted([["apartment", 5], ["townhouse", 4]] as const)
        : listingType === "rent"
          ? r.weighted([["house", 5], ["townhouse", 2], ["unit", 3]] as const)
          : r.weighted([["house", 60], ["townhouse", 12], ["unit", 18], ["land", 10]] as const);

    const isLand = propertyType === "land";
    const beds = isLand ? 0 : propertyType === "unit" || propertyType === "apartment" ? r.int(1, 3) : r.int(2, 5);
    const baths = isLand ? 0 : Math.max(1, Math.min(beds, r.int(1, 3)));
    const cars = isLand ? 0 : r.int(propertyType === "house" ? 1 : 0, propertyType === "house" ? 3 : 2);
    const landAreaM2 = isLand ? roundTo(r.int(350, 800), 5) : propertyType === "house" ? roundTo(r.int(450, 950), 5) : null;
    const buildingAreaM2 = isLand ? null : roundTo(beds * r.int(32, 48) + 20, 5);

    const features = FEATURE_POOL.filter(() => r.chance(0.25));
    const hasPool = propertyType === "house" && r.chance(0.28);
    if (hasPool) features.push("pool");
    features.sort();

    let unitNumber: string | null = null;
    let streetNumber: string;
    let streetName: string;
    let key: string;
    do {
      streetName = `${r.pick(STREET_NAMES)} ${r.pick(STREET_TYPES)}`;
      streetNumber = isLand ? `Lot ${r.int(1, 120)}` : String(r.int(1, 240));
      unitNumber = propertyType === "unit" || propertyType === "apartment" || (propertyType === "townhouse" && r.chance(0.6)) ? String(r.int(1, 40)) : null;
      key = `${unitNumber ?? ""}/${streetNumber}/${streetName}/${suburb.id}`;
    } while (usedAddresses.has(key));
    usedAddresses.add(key);

    const location = {
      lat: Math.round((suburb.centre.lat + r.gaussian() * 0.006) * 1e6) / 1e6,
      lng: Math.round((suburb.centre.lng + r.gaussian() * 0.006) * 1e6) / 1e6,
    };

    const typeFactor = TYPE_FACTOR[propertyType] ?? 0.8;
    const bedFactor = isLand ? 1 : 0.75 + beds * 0.09;
    const value = roundTo(suburb.syntheticMedianHouseAud * typeFactor * bedFactor * (1 + r.gaussian() * 0.12), 5000);

    let priceDisplay: string | null = null;
    let priceMinAud: number | null = null;
    let priceMaxAud: number | null = null;
    let priceHidden = false;
    let rentPerWeekAud: number | null = null;
    let bondAud: number | null = null;
    let availableFrom: string | null = null;
    let auctionAt: string | null = null;

    if (listingType === "rent") {
      rentPerWeekAud = roundTo((value * 0.042) / 52, 10);
      bondAud = rentPerWeekAud * 4;
      availableFrom = addDays(asOf, r.int(3, 40));
    } else {
      const style = r.weighted([["offers_over", 4], ["range", 3], ["fixed", 2], ["auction", 2], ["contact", 1]] as const);
      if (style === "offers_over") {
        priceMinAud = priceMaxAud = roundTo(value * 0.97, 5000);
        priceDisplay = `Offers over ${money(priceMinAud)}`;
      } else if (style === "range") {
        priceMinAud = roundTo(value * 0.96, 10000);
        priceMaxAud = priceMinAud + 40000;
        priceDisplay = `${money(priceMinAud)} - ${money(priceMaxAud)}`;
      } else if (style === "fixed") {
        priceMinAud = priceMaxAud = value;
        priceDisplay = money(value);
      } else if (style === "auction") {
        priceMinAud = priceMaxAud = value;
        priceHidden = true;
        priceDisplay = "Auction";
        auctionAt = qldTime(addDays(saturdays[1] as string, 7 * r.int(1, 3)), 10 * 60 + 30 * r.int(0, 4));
      } else {
        priceMinAud = priceMaxAud = value;
        priceHidden = true;
        priceDisplay = "Contact agent";
      }
    }

    const inspections: SyntheticListing["inspections"] = [];
    const inspectionChance = listingType === "rent" ? 0.6 : listingType === "off_the_plan" ? 0.4 : 0.85;
    if (r.chance(inspectionChance)) {
      for (const sat of saturdays) {
        if (inspections.length > 0 && r.chance(0.45)) continue;
        const start = 8 * 60 + 15 * r.int(4, 18); // 9:00 to 12:30
        inspections.push({ startsAt: qldTime(sat, start), endsAt: qldTime(sat, start + r.pick([15, 30, 30, 45])) });
      }
    }

    const communityTitles = propertyType !== "house" && propertyType !== "land";
    const complianceFacts: SyntheticComplianceFacts | null =
      listingType === "rent"
        ? null
        : {
            "disclosure.exemption": listingType === "off_the_plan" ? "proposed_lot" : "none",
            "disclosure.form2_ready": r.chance(0.92),
            "disclosure.title_search_ready": r.chance(0.96),
            "property.community_titles_lot": communityTitles,
            "disclosure.body_corporate_docs_ready": communityTitles ? r.chance(0.9) : false,
            "property.has_regulated_pool": hasPool,
            "disclosure.pool_certificate_ready": hasPool ? r.chance(0.85) : false,
            "property.on_environmental_register": r.chance(0.02),
            "disclosure.environmental_notice_ready": r.chance(0.5),
          };

    const id = r.uuid();
    const propertyId = r.uuid();
    const prefix = listingType === "rent" ? "L" : listingType === "off_the_plan" ? "P" : isLand ? "V" : "R";
    const typeLabel = propertyType === "land" ? "block" : propertyType;
    const headline = headlineFor(r, propertyType, beds, features, listingType, suburb.name);
    const description = isLand
      ? `Fictional ${landAreaM2} m² block in ${suburb.name}. Synthetic listing for prototype testing.`
      : `Fictional ${beds}-bedroom, ${baths}-bathroom ${typeLabel} in ${suburb.name} with ${cars} car space${cars === 1 ? "" : "s"}. ` +
        (features.length ? `Includes ${features.map((f) => f.replace(/_/g, " ")).join(", ")}. ` : "") +
        "Synthetic listing for prototype testing.";

    // Placeholder enrichment, always labelled (V11 §14.4).
    if (listingType !== "rent" && !isLand) {
      enrichments.push({
        id: r.uuid(),
        propertyId,
        suburbId: null,
        kind: "avm",
        provider: "synthetic",
        sourceType: "synthetic",
        isPlaceholder: true,
        effectiveDate: asOf,
        payload: { estimateAud: roundTo(value * (1 + r.gaussian() * 0.05), 5000), lowAud: roundTo(value * 0.9, 5000), highAud: roundTo(value * 1.1, 5000), confidence: r.pick(["low", "medium"]) },
      });
      if (r.chance(0.5)) {
        const years = r.int(3, 15);
        enrichments.push({
          id: r.uuid(),
          propertyId,
          suburbId: null,
          kind: "sales_history",
          provider: "synthetic",
          sourceType: "synthetic",
          isPlaceholder: true,
          effectiveDate: asOf,
          payload: { sales: [{ date: `${2026 - years}-0${r.int(1, 9)}-15`, priceAud: roundTo(value / (1 + 0.055 * years), 5000) }] },
        });
      }
    }

    return {
      id,
      propertyId,
      agencyId: agency.id,
      agentIds,
      sourceListingId: `SYN-${prefix}-${String(index + 1).padStart(4, "0")}`,
      sourceModTime: qldTime(addDays(asOf, -r.int(0, 30)), 8 * 60 + r.int(0, 600)),
      listingType,
      status: listingType !== "rent" && r.chance(0.06) ? "under_offer" : "current",
      propertyType,
      address: { unitNumber, streetNumber, streetName, suburbId: suburb.id, suburb: suburb.name, postcode: suburb.postcode },
      location,
      headline,
      description,
      priceDisplay,
      priceMinAud,
      priceMaxAud,
      priceHidden,
      rentPerWeekAud,
      bondAud,
      availableFrom,
      bedrooms: beds,
      bathrooms: baths,
      carSpaces: cars,
      landAreaM2,
      buildingAreaM2,
      features,
      newConstruction: listingType === "off_the_plan",
      offThePlan:
        listingType === "off_the_plan"
          ? { stage: `Stage ${r.int(1, 3)}`, estimatedCompletion: `${r.pick(["2027", "2028"])}-${String(r.int(1, 12)).padStart(2, "0")}-01`, developerName: r.pick(DEVELOPERS) }
          : null,
      auctionAt,
      inspections,
      imageCount: isLand ? r.int(1, 3) : r.int(4, 12),
      complianceFacts,
    };
  };

  const otpCount = Math.round(saleCount * 0.06);
  for (let i = 0; i < saleCount; i++) listings.push(makeListing(i < otpCount ? "off_the_plan" : "sale", i));
  for (let i = 0; i < rentCount; i++) listings.push(makeListing("rent", saleCount + i));

  for (const suburb of suburbs) {
    const sales = listings.filter((l) => l.address.suburbId === suburb.id && l.listingType === "sale" && l.propertyType === "house");
    enrichments.push({
      id: r.uuid(),
      propertyId: null,
      suburbId: suburb.id,
      kind: "suburb_stats",
      provider: "synthetic",
      sourceType: "synthetic",
      isPlaceholder: true,
      effectiveDate: asOf,
      payload: {
        medianHouseAud: suburb.syntheticMedianHouseAud,
        annualGrowthPct: Math.round((3 + r.gaussian() * 2) * 10) / 10,
        daysOnMarket: r.int(18, 45),
        activeHouseListings: sales.length,
      },
    });
  }

  return {
    meta: {
      disclaimer: DISCLAIMER,
      seed,
      asOf,
      canonicalSchemaVersion: CANONICAL_SCHEMA_VERSION,
      counts: { suburbs: suburbs.length, agencies: agencies.length, agents: agents.length, listings: listings.length, enrichments: enrichments.length },
    },
    suburbs,
    agencies,
    agents,
    listings,
    enrichments,
  };
}
