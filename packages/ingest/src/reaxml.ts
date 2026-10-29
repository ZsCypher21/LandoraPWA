import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { ListingStatus, ListingType, PropertyType } from "@landora/schema";
import { parseFeedDateTime, parseInspection, type FeedTimeZone } from "./time";
import type { FeedParseResult, Issue, ListingSourceAdapter, MappedListing, MappedMedia, RecordResult } from "./types";

// REAXML adapter implementing docs/data/reaxml-mapping.md (contract v0.1.0).

type Node = Record<string, unknown>;

const SUPPORTED_KINDS: Record<string, { listingType: ListingType; fixedPropertyType?: PropertyType }> = {
  residential: { listingType: "sale" },
  rental: { listingType: "rent" },
  land: { listingType: "sale", fixedPropertyType: "land" },
  rural: { listingType: "sale", fixedPropertyType: "acreage" },
};
const UNSUPPORTED_KINDS = ["holidayRental", "commercial", "commercialLand", "business"];
const LISTING_KINDS = [...Object.keys(SUPPORTED_KINDS), ...UNSUPPORTED_KINDS];

const CATEGORY_MAP: Record<string, PropertyType> = {
  house: "house",
  townhouse: "townhouse",
  unit: "unit",
  apartment: "apartment",
  studio: "apartment",
  flat: "apartment",
  villa: "villa",
  duplexsemidetached: "duplex",
  "duplexsemi-detached": "duplex",
  acreage: "acreage",
  acreagesemirural: "acreage",
  "acreagesemi-rural": "acreage",
};

// Boolean feature elements commonly sent inside <features>; anything else non-numeric is ignored.
const FEATURE_FLAGS = [
  "pool", "poolInGround", "poolAboveGround", "spa", "airConditioning", "ductedCooling", "ductedHeating",
  "alarmSystem", "intercom", "vacuumSystem", "builtInRobes", "dishwasher", "gym", "balcony", "deck",
  "courtyard", "outdoorEnt", "fullyFenced", "tennisCourt", "shed", "remoteGarage", "secureParking",
  "solarPanels", "solarHotWater", "waterTank", "insideSpa", "outsideSpa", "study", "workshop",
] as const;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (name) => [...LISTING_KINDS, "img", "floorplan", "inspection", "listingAgent", "telephone"].includes(name),
});

function text(node: unknown): string | null {
  if (node === undefined || node === null) return null;
  if (typeof node === "string") return node.trim() === "" ? null : node.trim();
  if (typeof node === "number" || typeof node === "boolean") return String(node);
  if (typeof node === "object" && "#text" in (node as Node)) return text((node as Node)["#text"]);
  return null;
}

function attr(node: unknown, name: string): string | null {
  if (node && typeof node === "object") {
    const v = (node as Node)[`@_${name}`];
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  }
  return null;
}

function child(node: unknown, name: string): unknown {
  return node && typeof node === "object" ? (node as Node)[name] : undefined;
}

function isYes(value: string | null): boolean {
  return value !== null && ["yes", "1", "true"].includes(value.toLowerCase());
}

function int(value: string | null): number | null {
  if (value === null) return null;
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned));
}

function areaM2(node: unknown): number | null {
  const value = text(node);
  if (value === null) return null;
  const n = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = (attr(node, "unit") ?? "squareMeter").toLowerCase();
  const factor: Record<string, number> = { squaremeter: 1, square: 1, hectare: 10000, acre: 4046.8564224, squarefeet: 0.09290304 };
  const f = factor[unit];
  return f === undefined ? null : Math.round(n * f * 100) / 100;
}

function stripHtml(value: string | null): string | null {
  if (value === null) return null;
  const stripped = value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
  return stripped === "" ? null : stripped;
}

/** Parses an unambiguous "$650,000 - $700,000" style range from display text. */
function rangeFromDisplay(display: string | null): [number, number] | null {
  if (!display) return null;
  const m = /\$\s?([\d,]+(?:\.\d+)?)\s*(k|m)?\s*(?:-|–|to)\s*\$\s?([\d,]+(?:\.\d+)?)\s*(k|m)?/i.exec(display);
  if (!m) return null;
  const scale = (s: string | undefined) => (s?.toLowerCase() === "k" ? 1000 : s?.toLowerCase() === "m" ? 1_000_000 : 1);
  const lo = Number((m[1] as string).replace(/,/g, "")) * scale(m[2]);
  const hi = Number((m[3] as string).replace(/,/g, "")) * scale(m[4]);
  return Number.isFinite(lo) && Number.isFinite(hi) && lo <= hi ? [Math.round(lo), Math.round(hi)] : null;
}

function mapStatus(raw: string | null, underOffer: boolean): ListingStatus | null {
  switch (raw?.toLowerCase()) {
    case "current":
      return underOffer ? "under_offer" : "current";
    case "sold":
      return "sold";
    case "leased":
      return "leased";
    case "withdrawn":
    case "deleted":
      return "withdrawn";
    case "offmarket":
      return "off_market";
    default:
      return null;
  }
}

function toSnake(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function mapRecord(kind: string, node: Node, index: number, timeZone: FeedTimeZone): RecordResult {
  const path = `${kind}[${index}]`;
  const issues: Issue[] = [];
  const reject = (code: Issue["code"], message: string, at = path) => issues.push({ code, severity: "reject", path: at, message });
  const advise = (code: Issue["code"], message: string, at = path) => issues.push({ code, severity: "advisory", path: at, message });

  const sourceListingId = text(node.uniqueID);
  const spec = SUPPORTED_KINDS[kind];
  if (!spec) {
    reject("unsupported_listing_kind", `<${kind}> listings are not ingested in the MVP`);
    return { ok: false, sourceListingId, issues };
  }

  const externalAgentId = text(node.agentID);
  if (!sourceListingId) reject("missing_unique_id", "uniqueID is required", `${path}.uniqueID`);
  if (!externalAgentId) reject("missing_agent_id", "agentID is required", `${path}.agentID`);

  const modRaw = attr(node, "modTime");
  const sourceModTime = modRaw ? parseFeedDateTime(modRaw, timeZone) : null;
  if (!sourceModTime) reject("missing_mod_time", `modTime is missing or unreadable (${modRaw ?? "absent"})`, `${path}@modTime`);

  const underOffer = isYes(attr(node.underOffer, "value"));
  const status = mapStatus(attr(node, "status"), underOffer);
  if (!status) reject("unknown_status", `Unknown status "${attr(node, "status") ?? "absent"}"`, `${path}@status`);

  const address = child(node, "address");
  const streetNumber = text(child(address, "streetNumber"));
  const streetName = text(child(address, "street"));
  const suburb = text(child(address, "suburb"));
  const state = text(child(address, "state"))?.toUpperCase() ?? null;
  const postcode = text(child(address, "postcode"));
  if (!streetNumber || !streetName || !suburb || !state || !postcode || !/^\d{4}$/.test(postcode)) {
    reject("missing_address", "Street number, street, suburb, state and a 4-digit postcode are required", `${path}.address`);
  }

  if (issues.some((i) => i.severity === "reject")) return { ok: false, sourceListingId, issues };

  let propertyType: PropertyType = spec.fixedPropertyType ?? "other";
  if (!spec.fixedPropertyType) {
    const category = attr(child(node, "category"), "name");
    const mapped = category ? CATEGORY_MAP[category.toLowerCase().replace(/\s+/g, "")] : undefined;
    if (mapped) propertyType = mapped;
    else advise("unmapped_category", `Category "${category ?? "absent"}" mapped to other`, `${path}.category`);
  }

  // Price and rent
  const priceNode = child(node, "price");
  const priceDisplay = text(child(node, "priceView"));
  let priceMinAud: number | null = null;
  let priceMaxAud: number | null = null;
  const priceHidden = attr(priceNode, "display")?.toLowerCase() === "no";
  if (spec.listingType === "sale") {
    const price = int(text(priceNode));
    const range = rangeFromDisplay(priceDisplay);
    if (range) [priceMinAud, priceMaxAud] = range;
    else if (price !== null) [priceMinAud, priceMaxAud] = [price, price];
    else if (text(priceNode) !== null) advise("unparsed_price", "Price could not be read as a number", `${path}.price`);
  }

  let rentPerWeekAud: number | null = null;
  if (spec.listingType === "rent") {
    const rentNode = child(node, "rent");
    const rent = int(text(rentNode));
    const period = (attr(rentNode, "period") ?? "week").toLowerCase();
    if (rent !== null && (period === "week" || period === "weekly")) rentPerWeekAud = rent;
    else if (rent !== null && (period === "month" || period === "monthly")) {
      rentPerWeekAud = Math.round((rent * 12) / 52);
      advise("rent_period_converted", "Monthly rent converted to weekly", `${path}.rent`);
    }
  }

  // Features
  const featuresNode = child(node, "features");
  const garages = int(text(child(featuresNode, "garages"))) ?? 0;
  const carports = int(text(child(featuresNode, "carports"))) ?? 0;
  const openSpaces = int(text(child(featuresNode, "openSpaces"))) ?? 0;
  const hasCarInfo = ["garages", "carports", "openSpaces"].some((k) => text(child(featuresNode, k)) !== null);
  const features = new Set<string>();
  for (const flag of FEATURE_FLAGS) {
    const v = text(child(featuresNode, flag));
    if (v !== null && (isYes(v) || (int(v) ?? 0) > 0)) features.add(toSnake(flag));
  }
  for (const other of (text(child(featuresNode, "otherFeatures")) ?? "").split(",")) {
    const tag = other.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (tag) features.add(tag);
  }

  // Inspections
  const inspections: MappedListing["inspections"] = [];
  const inspectionNodes = child(child(node, "inspectionTimes"), "inspection");
  for (const [i, raw] of (Array.isArray(inspectionNodes) ? inspectionNodes : []).entries()) {
    const value = text(raw);
    if (!value) continue;
    const parsed = parseInspection(value, timeZone);
    if (parsed) inspections.push(parsed);
    else advise("unparsed_inspection", `Could not read inspection time "${value}"`, `${path}.inspectionTimes.inspection[${i}]`);
  }

  // Media: main image ("m") first, then others in id order.
  const objects = child(node, "objects");
  const imgs = (child(objects, "img") as unknown[] | undefined) ?? [];
  const sortedImgs = imgs
    .filter((img) => attr(img, "url"))
    .sort((a, b) => {
      const ia = attr(a, "id") ?? "";
      const ib = attr(b, "id") ?? "";
      if (ia === "m") return -1;
      if (ib === "m") return 1;
      return ia.localeCompare(ib, "en", { numeric: true });
    });
  const media: MappedMedia[] = sortedImgs.map((img, position) => ({ kind: "photo", position, sourceUrl: attr(img, "url") as string }));
  for (const plan of (child(objects, "floorplan") as unknown[] | undefined) ?? []) {
    const url = attr(plan, "url");
    if (url) media.push({ kind: "floorplan", position: media.length, sourceUrl: url });
  }
  const video = attr(child(node, "videoLink"), "href");
  if (video) media.push({ kind: "video", position: media.length, sourceUrl: video });

  // Agents
  const agents = ((child(node, "listingAgent") as unknown[] | undefined) ?? [])
    .map((a) => {
      const phones = (child(a, "telephone") as unknown[] | undefined) ?? [];
      return { name: text(child(a, "name")) ?? "", email: text(child(a, "email"))?.toLowerCase() ?? null, phone: text(phones[0]) };
    })
    .filter((a) => a.name !== "");
  if (agents.length === 0) {
    issues.push({ code: "unknown_listing_agent", severity: "hold", path: `${path}.listingAgent`, message: "No listing agent supplied" });
  }

  const sold = child(node, "soldDetails");
  const soldPriceNode = child(sold, "price");
  const auctionRaw = attr(child(node, "auction"), "date");

  const listing: MappedListing = {
    externalAgentId: externalAgentId as string,
    sourceListingId: sourceListingId as string,
    sourceModTime: sourceModTime as string,
    listingType: spec.listingType,
    status: status as ListingStatus,
    propertyType,
    address: {
      unitNumber: text(child(address, "subNumber")),
      streetNumber: streetNumber as string,
      streetName: streetName as string,
      suburb: suburb as string,
      state: state as string,
      postcode: postcode as string,
      displayStreet: attr(address, "display")?.toLowerCase() !== "no",
    },
    headline: text(node.headline),
    description: stripHtml(text(node.description)),
    priceDisplay,
    priceMinAud,
    priceMaxAud,
    priceHidden,
    rentPerWeekAud,
    bondAud: int(text(node.bond)),
    availableFrom: /^\d{4}-\d{2}-\d{2}/.exec(text(node.dateAvailable) ?? "")?.[0] ?? null,
    bedrooms: int(text(child(featuresNode, "bedrooms"))),
    bathrooms: int(text(child(featuresNode, "bathrooms"))),
    carSpaces: hasCarInfo ? garages + carports + openSpaces : null,
    landAreaM2: areaM2(child(child(node, "landDetails"), "area")),
    buildingAreaM2: areaM2(child(child(node, "buildingDetails"), "area")),
    features: [...features].sort(),
    auctionAt: auctionRaw ? parseFeedDateTime(auctionRaw, timeZone) : null,
    soldAt: /^\d{4}-\d{2}-\d{2}/.exec(text(child(sold, "date")) ?? "")?.[0] ?? null,
    soldPriceAud: int(text(soldPriceNode)),
    soldPriceDisclosed: sold === undefined ? null : attr(soldPriceNode, "display")?.toLowerCase() !== "no",
    newConstruction: isYes(text(node.newConstruction)),
    inspections,
    media,
    agents,
  };
  return { ok: true, listing, issues };
}

export class ReaxmlAdapter implements ListingSourceAdapter {
  readonly kind = "reaxml" as const;

  constructor(private readonly timeZone: FeedTimeZone = "Australia/Brisbane") {}

  parse(payload: string): FeedParseResult {
    const valid = XMLValidator.validate(payload);
    if (valid !== true) {
      return {
        records: [],
        fileIssues: [{ code: "malformed_xml", severity: "reject", path: `line ${valid.err.line}`, message: valid.err.msg }],
      };
    }
    const doc = parser.parse(payload) as Node;
    const root = doc.propertyList as Node | undefined;
    if (!root || typeof root !== "object") {
      return { records: [], fileIssues: [{ code: "malformed_xml", severity: "reject", path: "/", message: "Missing <propertyList> root" }] };
    }
    const records: RecordResult[] = [];
    for (const kind of LISTING_KINDS) {
      const nodes = root[kind];
      if (!Array.isArray(nodes)) continue;
      nodes.forEach((node, i) => records.push(mapRecord(kind, node as Node, i, this.timeZone)));
    }
    return { records, fileIssues: [] };
  }
}
