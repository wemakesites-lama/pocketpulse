import type { LedgerRow } from "../schemas";
import { normaliseMerchant } from "./checks";

// -----------------------------------------------------------------------------
// Trusted digital VAT vendors.
//
// These are well-known, SA VAT-registered suppliers whose receipts arrive as
// email / PDF / in-app documents rather than printed till slips. Their invoices
// ARE compliant tax invoices, but the non-slip layout routinely causes the
// extraction model to under-read the DOCUMENTARY fields — the "Tax Invoice"
// heading, the registered-office address, the recipient block, the serial number.
//
// Claimability relaxes ONLY those formatting fields for these vendors (see
// claimability.ts). It never relaxes the supplier VAT number: without one there
// is genuinely nothing to claim, regardless of who the supplier is.
//
// Curated on purpose. Add a vendor only when it is a real VAT vendor that issues
// proper tax invoices in a digital format.
// -----------------------------------------------------------------------------

// Normalised (lowercased, punctuation-stripped) whole-phrase keys.
const TRUSTED_VENDOR_KEYS: readonly string[] = [
  "uber",
  "uber for business",
  "bolt",
  "aws",
  "amazon web services",
  "google",
  "google cloud",
  "google workspace",
  "microsoft",
  "azure",
  "apple",
  "app store",
  "takealot",
  "netflix",
  "openai",
  "anthropic",
  "zoom",
  "slack",
  "dropbox",
  "canva",
  "adobe",
].map((k) => normaliseMerchant(k));

// Whole-phrase, token-boundary match: the vendor key must appear as a run of
// whole words inside the merchant name. Space-padding both sides means "uber"
// matches "Uber" and "Uber for Business" but not "Kuber Attorneys".
export function isTrustedDigitalVendor(row: Pick<LedgerRow, "merchant">): boolean {
  const name = normaliseMerchant(row.merchant);
  if (!name) return false;
  const padded = ` ${name} `;
  return TRUSTED_VENDOR_KEYS.some((key) => key !== "" && padded.includes(` ${key} `));
}
