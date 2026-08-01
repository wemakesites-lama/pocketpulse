import { z } from "zod";

// =============================================================================
// PART 4 · THE DATA CONTRACT
// Build this exactly from the spec. Freeze it before feature work.
// =============================================================================

// -----------------------------------------------------------------------------
// 4.1 Enums
// -----------------------------------------------------------------------------

export const VAT_STATUS = [
  "inclusive", // total includes VAT, compute the portion
  "exclusive", // total excludes VAT, VAT added on top
  "not_registered", // supplier has no VAT number, no VAT applies
  "unknown", // cannot tell, do NOT compute anything
] as const;

export const CATEGORY = [
  "office_supplies",
  "fuel_and_travel",
  "telecoms_and_internet",
  "software_and_subscriptions",
  "professional_services",
  "equipment",
  "materials_and_stock",
  "meals_and_entertainment",
  "utilities",
  "marketing",
  "bank_and_fees",
  "other",
] as const;

export const PAYMENT_METHOD = ["card", "cash", "eft", "debit_order", "unknown"] as const;
export const CONFIDENCE = ["low", "medium", "high"] as const;
export const REVIEW_STATUS = ["clean", "requires_review", "flagged", "approved", "rejected"] as const;
export const SEVERITY = ["low", "medium", "high"] as const;

export const FLAG_CODE = [
  "missing_merchant",
  "missing_date",
  "no_vat_number",
  "vat_status_unknown",
  "vat_mismatch",
  "line_item_mismatch",
  "exact_duplicate",
  "near_duplicate",
  "unusual_amount",
  "large_cash_transaction",
  "category_concentration",
  "invalid_tax_invoice",
  "full_invoice_required",
  "recurring_commitment",
  "unparseable_record",
] as const;

// -----------------------------------------------------------------------------
// 4.2 Layer 1 output — what the model returns (extraction only, never arithmetic)
// -----------------------------------------------------------------------------

export const ExtractedTransaction = z.object({
  source_id: z.string(), // assigned by our code, not the model
  input_source: z.enum(["text", "voice", "image"]).default("text"),
  merchant: z.string().nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  description: z.string().nullable(),
  line_items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number().nullable(),
        unit_price: z.number().nullable(),
        line_total: z.number().nullable(),
      }),
    )
    .default([]),
  stated_total: z.number().nullable(),
  stated_vat: z.number().nullable(), // only if printed on the receipt
  vat_status: z.enum(VAT_STATUS),
  vat_number_present: z.boolean(),

  // document-completeness, feeds claimability
  supplier_vat_number: z.string().nullable(),
  supplier_address_present: z.boolean(),
  invoice_serial: z.string().nullable(),
  has_tax_invoice_wording: z.boolean(),
  description_present: z.boolean(),
  recipient_details_present: z.boolean(),

  // recurrence, only what the document states
  states_recurring: z.boolean(),
  recurrence_evidence: z.string().nullable(), // the exact phrase seen, or null

  payment_method: z.enum(PAYMENT_METHOD),
  currency: z.string().default("ZAR"),
  category: z.enum(CATEGORY),
  category_rationale: z.string(),
  missing_fields: z.array(z.string()).default([]),
  clarification_questions: z.array(z.string()).default([]),
  extraction_confidence: z.enum(CONFIDENCE),
  notes: z.string().nullable(),
});
export type ExtractedTransaction = z.infer<typeof ExtractedTransaction>;

// -----------------------------------------------------------------------------
// 4.3 Layer 2 output — the rules engine writes these
// -----------------------------------------------------------------------------

export const Flag = z.object({
  code: z.enum(FLAG_CODE),
  severity: z.enum(SEVERITY),
  message: z.string(), // written by our code, never the model
  amount_label: z.string().nullable(), // e.g. "R599.87 at stake"
  evidence: z.array(z.string()), // source_ids, always includes self
  financial_effect_zar: z.number().nullable(),
  is_estimate: z.boolean().default(false),
  resolved: z.boolean().default(false),
  resolution: z.string().nullable(),
  // NOTE: §5.3 exact_duplicate requires a `pair` handle so the UI can mark two rows
  // as one problem. The 4.2 Zod block omits it; added here as optional to stay faithful
  // to the behavioural requirement without breaking the frozen shape.
  pair: z.string().nullable().optional(),
});
export type Flag = z.infer<typeof Flag>;

export const LedgerRow = ExtractedTransaction.extend({
  computed_vat: z.number().nullable(), // null when unknown or not_registered — NEVER 0
  vat_variance: z.number().nullable(),
  net_amount: z.number().nullable(),
  line_item_sum: z.number().nullable(),
  line_item_variance: z.number().nullable(),
  invoice_tier: z.enum(["none_required", "abridged", "full"]).nullable(),
  claim_status: z.enum([
    "claimable",
    "at_risk",
    "not_claimable",
    "no_vat_applicable",
    "unknown",
  ]),
  claim_missing_fields: z.array(z.string()).default([]),
  vat_at_risk: z.number().nullable(),
  vat_at_risk_is_estimate: z.boolean().default(false),
  recurring: z
    .object({
      monthly: z.number(),
      annual: z.number(),
      basis: z.literal("stated on the document"),
    })
    .nullable(),
  flags: z.array(Flag).default([]),
  review_status: z.enum(REVIEW_STATUS),
  risk_level: z.enum(SEVERITY),
  display_confidence: z.enum(CONFIDENCE),
  edited_fields: z.array(z.string()).default([]),
  approved: z.boolean().default(false),
  // Bucket-relative path of the uploaded slip photo in the private `slips` storage bucket
  // (only set for input_source "image", and only when signed in). Retrieved via a signed
  // URL. Optional so text/voice rows and the frozen extraction shape are unaffected.
  image_path: z.string().nullable().optional(),
});
export type LedgerRow = z.infer<typeof LedgerRow>;

// -----------------------------------------------------------------------------
// 4.4 Layer 3 output — the model narrates computed truth (post-processed)
// -----------------------------------------------------------------------------

export const Insight = z.object({
  id: z.string(),
  claim: z.string(),
  supporting_transactions: z.array(z.string()),
  financial_effect_zar: z.number().nullable(), // overwritten by our figure
  recommended_action: z.string(),
  reasoning: z.string(),
  confidence: z.enum(CONFIDENCE),
});
export type Insight = z.infer<typeof Insight>;

export const BatchInsight = z.object({
  batch_summary: z.string(),
  insights: z.array(Insight).min(1),
  batch_clarification_questions: z.array(z.string()).default([]),
});
export type BatchInsight = z.infer<typeof BatchInsight>;

// -----------------------------------------------------------------------------
// 4.5 Final output
// -----------------------------------------------------------------------------

export const ApprovedBatch = z.object({
  batch_id: z.string(),
  approved_at: z.string(),
  review_status: z.literal("approved"),
  reviewed_by: z.literal("user"),
  changes_made: z.boolean(),
  edit_log: z
    .array(
      z.object({
        source_id: z.string(),
        field: z.string(),
        from: z.union([z.string(), z.number(), z.null()]),
        to: z.union([z.string(), z.number(), z.null()]),
      }),
    )
    .default([]),
  recurring: z
    .array(
      z.object({
        source_id: z.string(),
        merchant: z.string(),
        monthly: z.number(),
        basis: z.literal("stated on the document"),
      }),
    )
    .default([]),
  totals: z.object({
    record_count: z.number(),
    gross_total: z.number(),
    total_vat: z.number(),
    vat_at_risk: z.number(),
    vat_unconfirmed_count: z.number(),
  }),
  ledger: z.array(LedgerRow),
  insights: z.array(Insight),
  unresolved_flags: z.array(Flag),
  model: z.object({ provider: z.literal("groq"), model_id: z.string() }),
  disclaimer: z.literal("Educational prototype. Not tax or accounting advice."),
});
export type ApprovedBatch = z.infer<typeof ApprovedBatch>;

// -----------------------------------------------------------------------------
// 4.6 Error envelope — every API response uses this shape (one UI code path)
// -----------------------------------------------------------------------------

export const ApiErrorKind = z.enum([
  "provider_unreachable",
  "provider_unauthorised",
  "rate_limited",
  "invalid_model_output",
  "empty_input",
  "input_too_large",
  "unexpected",
]);
export type ApiErrorKind = z.infer<typeof ApiErrorKind>;

export const ApiResponse = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), data: z.unknown() }),
  z.object({
    ok: z.literal(false),
    error: z.object({
      kind: ApiErrorKind,
      message: z.string(),
      retryable: z.boolean(),
      partial: z.array(LedgerRow).optional(),
    }),
  }),
]);
export type ApiResponse = z.infer<typeof ApiResponse>;
