// Shared constants and type re-exports.
// The Zod schemas in schemas.ts are the single source of truth for shapes;
// this file adds engine-level constants and convenient type aliases.

export const VAT_RATE = 15; // South African standard rate, percent
export const FULL_INVOICE_THRESHOLD = 5000; // VAT-inclusive rand; > R5,000 needs a full tax invoice
export const ABRIDGED_THRESHOLD = 50; // VAT-inclusive rand; > R50 needs an abridged tax invoice
export const LARGE_CASH_THRESHOLD = 5000; // rand; cash >= this raises large_cash_transaction
export const UNUSUAL_AMOUNT_MIN_RECORDS = 5; // outlier check only runs at 5+ non-null totals
export const MAX_RECORDS_PER_BATCH = 20; // cap; 21+ shows a friendly cap message

export const DISCLAIMER = "Educational prototype. Not tax or accounting advice." as const;

export type {
  ExtractedTransaction,
  Flag,
  LedgerRow,
  Insight,
  BatchInsight,
  ApprovedBatch,
  ApiResponse,
  ApiErrorKind,
} from "./schemas";
