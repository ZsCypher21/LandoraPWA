import { z } from "zod";

// Rule-pack format (ADR 0007). Packs are declarative JSON validated by these schemas.
// Rule content is a draft until approved by an authorised compliance/legal owner (V11 §12.10).

export const FactType = z.enum(["boolean", "number", "string", "date"]);
export type FactType = z.infer<typeof FactType>;

export const FactDefinition = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_.]*$/, "Fact keys are lower snake case, dot separated"),
    type: FactType,
    description: z.string().min(1),
    /** Allowed values for string facts. */
    values: z.array(z.string()).min(1).optional(),
    /** Why the fact is collected; shown to users for personal data (V11 §12.5 minimisation). */
    purpose: z.string().min(1).optional(),
    personal: z.boolean().default(false),
  })
  .strict();
export type FactDefinition = z.infer<typeof FactDefinition>;

const Scalar = z.union([z.string(), z.number(), z.boolean()]);

export const ComparisonOp = z.enum(["eq", "neq", "lt", "lte", "gt", "gte", "in", "not_in"]);
export type ComparisonOp = z.infer<typeof ComparisonOp>;

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { fact: string; op: ComparisonOp; value: string | number | boolean | Array<string | number> }
  | { fact: string; op: "is_true" | "is_false" | "is_known" };

export const Condition: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(Condition).min(1) }).strict(),
    z.object({ any: z.array(Condition).min(1) }).strict(),
    z.object({ not: Condition }).strict(),
    z
      .object({
        fact: z.string(),
        op: ComparisonOp,
        value: z.union([Scalar, z.array(z.union([z.string(), z.number()])).min(1)]),
      })
      .strict(),
    z.object({ fact: z.string(), op: z.enum(["is_true", "is_false", "is_known"]) }).strict(),
  ]),
);

/** A citation: an official web page, or an internal document such as the V11 brief. */
export const Source = z
  .object({
    title: z.string().min(1),
    url: z.url().optional(),
    document: z.string().min(1).optional(),
    retrievedOn: z.iso.date(),
  })
  .strict()
  .refine((s) => s.url !== undefined || s.document !== undefined, { message: "A source needs a url or a document" });
export type Source = z.infer<typeof Source>;

export const Benefit = z.discriminatedUnion("type", [
  z.object({ type: z.literal("fixed_aud"), amount: z.number().int().nonnegative(), description: z.string() }).strict(),
  z
    .object({
      type: z.literal("banded_aud"),
      fact: z.string(),
      description: z.string(),
      /** Bands in ascending order; the first band whose `below` exceeds the fact value applies. */
      bands: z.array(z.object({ below: z.number().positive(), amount: z.number().int().nonnegative() }).strict()).min(1),
      /** Amount when the value is at or above the last band. */
      otherwise: z.number().int().nonnegative(),
    })
    .strict(),
  z.object({ type: z.literal("described"), description: z.string() }).strict(),
]);
export type Benefit = z.infer<typeof Benefit>;

export const Rule = z
  .object({
    id: z.string().regex(/^[A-Z0-9][A-Z0-9-]*$/, "Rule ids are upper case with dashes"),
    title: z.string().min(1),
    /** When the rule applies. Omitted means always. */
    appliesWhen: Condition.optional(),
    /** What must be true for the rule to pass (requirement) or for the buyer to be eligible (entitlement). */
    test: Condition,
    severity: z.enum(["blocking", "advisory"]),
    /** Actionable, plain-language reason shown when the test fails (FR-CMP-002). */
    failureReason: z.string().min(1),
    benefit: Benefit.optional(),
    sources: z.array(Source).min(1),
    /** Material assumptions surfaced with the result (FR-FHB-002). */
    assumptions: z.array(z.string()).default([]),
    /** Product policy that goes beyond the law; must be labelled as such to users. */
    platformPolicy: z.boolean().default(false),
  })
  .strict();
export type Rule = z.infer<typeof Rule>;

export const RulePack = z
  .object({
    id: z.string().regex(/^[a-z]{2,3}\.[a-z_]+$/, "Pack ids look like 'qld.publication_compliance'"),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    jurisdiction: z.enum(["QLD", "NSW", "VIC", "SA", "WA", "TAS", "NT", "ACT", "AU"]),
    domain: z.enum(["publication_compliance", "fhb_entitlement"]),
    title: z.string().min(1),
    status: z.enum(["draft", "approved", "active", "retired"]),
    effectiveFrom: z.iso.date(),
    effectiveTo: z.iso.date().nullable(),
    disclaimer: z.string().min(1),
    approval: z
      .object({ approvedBy: z.string().min(1), approvedOn: z.iso.date(), role: z.string().min(1) })
      .strict()
      .nullable(),
    facts: z.array(FactDefinition).min(1),
    rules: z.array(Rule).min(1),
    openQuestions: z.array(z.string()).default([]),
  })
  .strict();
export type RulePack = z.infer<typeof RulePack>;
