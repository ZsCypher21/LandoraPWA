// Questions for the FHB entitlement check. Each maps to a fact in rule-packs/qld/fhb_entitlement.json.
// Only facts the pack actually uses are asked (V11 §12.5 minimisation); income is not asked.

export type Answer = "yes" | "no" | "unsure";

export interface YesNoQuestion {
  kind: "yesno";
  fact: string;
  label: string;
  help?: string;
}

export const YES_NO_QUESTIONS: YesNoQuestion[] = [
  { kind: "yesno", fact: "applicants.all_18_plus", label: "Is everyone buying 18 or older?" },
  { kind: "yesno", fact: "applicants.all_citizen_or_pr", label: "Is everyone buying an Australian citizen or permanent resident?" },
  { kind: "yesno", fact: "applicants.any_citizen_or_pr", label: "Is at least one of you an Australian citizen or permanent resident?", help: "Ask this only if not everyone is." },
  { kind: "yesno", fact: "applicants.will_live_in_home", label: "Will you move in within 12 months and live there for at least 6 months?" },
  { kind: "yesno", fact: "applicants.received_fhog_before", label: "Have you or your spouse ever received a first home owner grant, in any state?" },
  {
    kind: "yesno",
    fact: "applicants.owned_disqualifying_property_fhog",
    label: "Have you or your spouse owned a home in Australia that you lived in since 1 July 2000, or any residential property before then?",
  },
  { kind: "yesno", fact: "applicants.owned_property_last_10_years", label: "Has anyone buying owned any Australian property, including land, in the last 10 years?" },
  { kind: "yesno", fact: "applicants.first_home_buyer_for_duty", label: "Will this be your first home in Queensland for stamp duty purposes?", help: "If you're not sure, choose Not sure. We'll show it as needing confirmation." },
];

/** Plain-language names for facts, used when telling the buyer what we still need. */
export const FACT_LABELS: Record<string, string> = {
  "purchase.home_kind": "what you're buying",
  "purchase.value_aud": "the price",
  "purchase.hgs_price_cap_region": "where you're buying",
  "finance.deposit_percent": "your deposit",
  ...Object.fromEntries(YES_NO_QUESTIONS.map((q) => [q.fact, q.label.replace(/\?$/, "").toLowerCase()])),
};

export const HOME_KINDS = [
  { value: "established", label: "An established home" },
  { value: "new", label: "A brand-new home" },
  { value: "off_the_plan", label: "Off the plan" },
  { value: "house_and_land", label: "A house and land package" },
  { value: "build_on_own_land", label: "Building on land I already own" },
  { value: "vacant_land", label: "Vacant land to build on later" },
] as const;

export const REGIONS = [
  { value: "qld_capital_or_regional_centre", label: "Brisbane, Gold Coast or Sunshine Coast" },
  { value: "qld_rest_of_state", label: "Elsewhere in Queensland" },
] as const;
