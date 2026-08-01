// Public surface of @pocketpulse/core.
// Always import across the app/core boundary as "@pocketpulse/core", never a relative path.

export * from "./schemas";
export * from "./types";
export * from "./format";
export * from "./storage";

export { recompute, recomputeLedger, deriveStatus, canApprove, displayConfidence } from "./rules/recompute";
export { finaliseInsights, fallbackInsights } from "./insights";
export {
  EXTRACTED_13,
  EXTRACTED_BATCH_A,
  EXTRACTED_BATCH_B,
  EXTRACTED_BATCH_C,
  EXTRACTED_BY_BATCH,
} from "./data/extracted.fixture";
export {
  applyClaimability,
  batchVatAtRisk,
  batchUnboundedEstimate,
  tierFor,
  type ClaimStatus,
} from "./rules/claimability";
export { normaliseMerchant, batchLevelFlags } from "./rules/checks";
export { computeVat, estimateInclusiveVat } from "./rules/vat";
export {
  batchTotals,
  vatPosition,
  categoryBreakdown,
  recurringList,
  dateRange,
  type BatchTotals,
  type VatPosition,
  type CategorySlice,
  type RecurringSlice,
} from "./rules/summarise";
export { EXTRACTION_SYSTEM_PROMPT, buildExtractionUserMessage } from "./prompts/extraction";
export { INSIGHT_SYSTEM_PROMPT, buildInsightUserMessage, type InsightSummary } from "./prompts/insight";
export { buildRepairMessage } from "./prompts/index";
export { BATCHES, getBatch } from "./data/batches";
export {
  ledgerReducer,
  initialLedgerState,
  type LedgerState,
  type LedgerAction,
  type EditLogEntry,
} from "./state/ledgerReducer";
