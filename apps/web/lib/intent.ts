import { EMPTY_CRITERIA, type Criteria, type SearchFeature } from "./criteria";

// Deterministic natural-language → criteria parser. It is the fallback (and, in the prototype, the only)
// provider for the `parse_search_intent` task in the LLM router (ADR 0006): if an LLM is unavailable,
// search still works. It never invents criteria; anything it cannot map is reported back to the buyer.

export interface Interpretation {
  phrase: string;
  meaning: string;
}

export interface IntentResult {
  criteria: Criteria;
  understood: Interpretation[];
  /** Phrases we recognised as a wish we cannot filter on yet. */
  unsupported: string[];
  /** Places we had to choose a reading; shown so the buyer can correct it. */
  assumptions: string[];
  /** Questions that need an answer before the criteria are trustworthy. */
  clarifications: string[];
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

const TYPE_WORDS: [RegExp, Criteria["propertyTypes"][number], string][] = [
  [/\bhouses?\b/, "house", "house"],
  [/\btown ?houses?\b/, "townhouse", "townhouse"],
  [/\b(units?|flats?)\b/, "unit", "unit"],
  [/\bapartments?\b/, "apartment", "apartment"],
  [/\b(land|vacant block|blocks? of land|lots?)\b/, "land", "land"],
];

const FEATURE_WORDS: [RegExp, SearchFeature, string][] = [
  [/\b(pool|swimming pool)\b/, "pool", "has a pool"],
  [/\b(air ?con(ditioning)?|aircon|a\/c)\b/, "air_conditioning", "has air conditioning"],
  [/\bsolar\b/, "solar_panels", "has solar panels"],
  [/\bshed\b/, "shed", "has a shed"],
  [/\b(study|home office)\b/, "study", "has a study"],
  [/\b(fully fenced|fenced)\b/, "fully_fenced", "fully fenced"],
  [/\bdeck\b/, "deck", "has a deck"],
  [/\bsecure parking\b/, "secure_parking", "secure parking"],
];

// Wishes buyers often express that the prototype cannot honestly filter on yet.
const UNSUPPORTED: [RegExp, string][] = [
  [/\b(near|close to|walk(ing distance)? to) (the )?(beach|ocean|water)\b/, "distance to the beach"],
  [/\b(good|great|top) schools?\b|\bschool catchment\b|\bnear (a )?schools?\b/, "school quality or catchments"],
  [/\bquiet\b/, "how quiet a street is"],
  [/\b(views?|ocean views?)\b/, "views"],
  [/\b(good investment|capital growth|high yield|will go up)\b/, "investment performance (Landora gives general information, not financial advice)"],
  [/\b(safe|low crime)\b/, "neighbourhood safety"],
  [/\bnear (the )?(train|station|bus)\b/, "distance to public transport"],
];

function parseMoney(raw: string, suffix: string | undefined): number | null {
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const s = suffix?.toLowerCase();
  if (s === "k") return Math.round(n * 1_000);
  if (s === "m" || s === "mil" || s === "million") return Math.round(n * 1_000_000);
  return Math.round(n);
}

const MONEY = String.raw`\$?\s?(\d[\d,]*(?:\.\d+)?)\s?(k|m|mil|million)?\b`;

function fmt(n: number): string {
  return `$${n.toLocaleString("en-AU")}`;
}

export function parseIntent(input: string, knownSuburbs: readonly string[]): IntentResult {
  const text = input.toLowerCase().replace(/\s+/g, " ").trim();
  const c: Criteria = { ...EMPTY_CRITERIA, suburbs: [], propertyTypes: [], features: [] };
  const understood: Interpretation[] = [];
  const unsupported: string[] = [];
  const assumptions: string[] = [];
  const clarifications: string[] = [];

  if (!text) return { criteria: c, understood, unsupported, assumptions, clarifications };

  // Buy or rent
  const rentMatch = /\b(rent|rental|renting|lease|per week|p\/?w|a week)\b/.exec(text);
  if (rentMatch) {
    c.listingType = "rent";
    understood.push({ phrase: rentMatch[0], meaning: "Homes for rent" });
  }

  // Suburbs (longest names first so "Coolum Beach" wins over shorter overlaps)
  for (const name of [...knownSuburbs].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`\\b${name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (re.test(text) && !c.suburbs.includes(name)) {
      c.suburbs.push(name);
      understood.push({ phrase: name, meaning: `In ${name}` });
    }
  }
  if (/\b(sunshine coast|anywhere|any suburb)\b/.test(text) && c.suburbs.length === 0) {
    understood.push({ phrase: "Sunshine Coast", meaning: "Any pilot suburb" });
  }

  // Property types
  for (const [re, type, label] of TYPE_WORDS) {
    if (re.test(text) && !c.propertyTypes.includes(type)) {
      c.propertyTypes.push(type);
      understood.push({ phrase: label, meaning: `Property type: ${label}` });
    }
  }
  if (/\btownhouse/.test(text)) {
    // "town house" also matches "house"; keep only townhouse.
    c.propertyTypes = c.propertyTypes.filter((t) => t !== "house" || /\bhouses?\b(?!\s*\w*town)/.test(text.replace(/town ?houses?/g, "")));
  }

  // Bedrooms, bathrooms, car spaces
  const beds = /\b(\d|one|two|three|four|five|six)\s?\+?\s?(?:or more\s)?(?:bed(?:room)?s?|br|bdr?m?s?)\b/.exec(text);
  if (beds) {
    const n = NUMBER_WORDS[beds[1] as string] ?? Number(beds[1]);
    c.minBeds = n;
    understood.push({ phrase: beds[0], meaning: `At least ${n} bedroom${n === 1 ? "" : "s"}` });
    if (!/\+|or more|at least|min/.test(beds[0]) && !/at least|minimum/.test(text)) {
      assumptions.push(`Read "${beds[0]}" as at least ${n} bedrooms.`);
    }
  }
  const baths = /\b(\d|one|two|three|four)\s?\+?\s?(?:bath(?:room)?s?|ba)\b/.exec(text);
  if (baths) {
    const n = NUMBER_WORDS[baths[1] as string] ?? Number(baths[1]);
    c.minBaths = n;
    understood.push({ phrase: baths[0], meaning: `At least ${n} bathroom${n === 1 ? "" : "s"}` });
  }
  const cars = /\b(\d|one|two|three)\s?(?:car|cars|car spaces?|garages?|parks?)\b/.exec(text);
  if (cars) {
    const n = NUMBER_WORDS[cars[1] as string] ?? Number(cars[1]);
    c.minCars = n;
    understood.push({ phrase: cars[0], meaning: `At least ${n} car space${n === 1 ? "" : "s"}` });
  } else if (/\b(garage|car space|parking)\b/.test(text) && !/secure parking/.test(text)) {
    c.minCars = 1;
    understood.push({ phrase: "garage / parking", meaning: "At least 1 car space" });
  }

  // Price
  const between = new RegExp(String.raw`\b(?:between|from)\s${MONEY}\s(?:and|to|-)\s${MONEY}`).exec(text) ?? new RegExp(`${MONEY}\\s?(?:-|to)\\s?${MONEY}`).exec(text);
  const under = new RegExp(String.raw`\b(?:under|below|less than|max(?:imum)?|up to|no more than|budget(?: of| is)?|<)\s?${MONEY}`).exec(text);
  const over = new RegExp(String.raw`\b(?:over|above|more than|min(?:imum)?|at least|from|>)\s?${MONEY}`).exec(text);
  const around = new RegExp(String.raw`\b(?:around|about|roughly|approx(?:imately)?|~)\s?${MONEY}`).exec(text);

  const sane = (n: number | null) => n !== null && n > 0;
  if (between) {
    let lo = parseMoney(between[1] as string, between[2]);
    let hi = parseMoney(between[3] as string, between[4] ?? between[2]);
    // "600-800k": the suffix on the second number applies to both.
    if (lo !== null && hi !== null && !between[2] && between[4] && lo < 1000) lo = parseMoney(between[1] as string, between[4]);
    if (sane(lo) && sane(hi) && (lo as number) <= (hi as number)) {
      c.minPrice = lo;
      c.maxPrice = hi;
      understood.push({ phrase: between[0], meaning: `Between ${fmt(lo as number)} and ${fmt(hi as number)}` });
    }
  } else {
    if (under) {
      const n = parseMoney(under[1] as string, under[2]);
      if (sane(n)) {
        c.maxPrice = n;
        understood.push({ phrase: under[0], meaning: `Up to ${fmt(n as number)}${c.listingType === "rent" ? " per week" : ""}` });
      }
    }
    if (over && over.index !== under?.index) {
      const n = parseMoney(over[1] as string, over[2]);
      if (sane(n) && !/\b(bed|bath|car|m2|sqm|square)/.test(text.slice(over.index, over.index + over[0].length + 6))) {
        c.minPrice = n;
        understood.push({ phrase: over[0], meaning: `From ${fmt(n as number)}` });
      }
    }
    if (around && c.minPrice === null && c.maxPrice === null) {
      const n = parseMoney(around[1] as string, around[2]);
      if (sane(n)) {
        c.minPrice = Math.round((n as number) * 0.9);
        c.maxPrice = Math.round((n as number) * 1.1);
        understood.push({ phrase: around[0], meaning: `${fmt(c.minPrice)} to ${fmt(c.maxPrice)}` });
        assumptions.push(`Read "${around[0]}" as within 10% either side.`);
      }
    }
  }
  // A sale price under $10,000 or a weekly rent over $10,000 is almost certainly a misreading.
  if (c.listingType === "buy" && c.maxPrice !== null && c.maxPrice < 10_000) {
    clarifications.push(`Is ${fmt(c.maxPrice)} a weekly rent, or did you mean ${fmt(c.maxPrice * 1000)}?`);
    c.maxPrice = null;
    c.minPrice = null;
    understood.splice(0, understood.length, ...understood.filter((u) => !/^(Up to|From|Between)/.test(u.meaning)));
  }
  if (c.listingType === "rent" && c.maxPrice !== null && c.maxPrice > 10_000) {
    clarifications.push(`${fmt(c.maxPrice)} looks like a purchase price. Did you mean to buy rather than rent?`);
  }
  if (/\b(cheap|affordable|budget)\b/.test(text) && c.maxPrice === null) {
    clarifications.push("What's the most you'd like to spend? \"Affordable\" means different things to different people.");
  }

  // Land size
  const land = /\b(\d[\d,]*)\s?(m2|m²|sqm|square met(?:re|er)s?)\b/.exec(text);
  if (land) {
    c.minLandM2 = Number((land[1] as string).replace(/,/g, ""));
    understood.push({ phrase: land[0], meaning: `Land at least ${c.minLandM2} m²` });
  } else if (/\b(big|large|huge) (back ?yard|yard|block)\b/.test(text)) {
    c.minLandM2 = 600;
    understood.push({ phrase: "big backyard", meaning: "Land at least 600 m²" });
    assumptions.push('Read "big backyard" as land of at least 600 m². Change it if you had another size in mind.');
  }

  // Features
  for (const [re, feature, label] of FEATURE_WORDS) {
    if (re.test(text) && !c.features.includes(feature)) {
      c.features.push(feature);
      understood.push({ phrase: label, meaning: label.charAt(0).toUpperCase() + label.slice(1) });
    }
  }

  // Inspections
  if (/\b(open (home|house|for inspection)s?|inspect(ion)?s?|open)\b.*\b(saturday|this weekend|sat)\b|\b(saturday|this weekend)\b.*\b(inspect|open)/.test(text)) {
    c.inspectionSaturday = true;
    understood.push({ phrase: "open this Saturday", meaning: "Has an open home on Saturday" });
  }

  // Off the plan
  // Check exclusions first so "not off the plan" isn't read as asking for off-the-plan homes.
  if (/\b(established|existing|(not|no) off[ -]the[ -]plan)\b/.test(text)) {
    c.includeOffThePlan = false;
    understood.push({ phrase: "established", meaning: "Excludes off-the-plan homes" });
  } else if (/\boff[ -]the[ -]plan\b|\bnew builds?\b/.test(text)) {
    understood.push({ phrase: "off the plan", meaning: "Includes off-the-plan homes" });
  }

  for (const [re, label] of UNSUPPORTED) {
    if (re.test(text)) unsupported.push(label);
  }

  return { criteria: c, understood, unsupported, assumptions, clarifications };
}
