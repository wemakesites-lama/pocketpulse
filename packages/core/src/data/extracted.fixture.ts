import type { ExtractedTransaction } from "../schemas";

// -----------------------------------------------------------------------------
// Deterministic extraction fixture — what a good extraction of the 13 synthetic
// receipts (data/batches.ts) SHOULD return. It encodes the organiser answer key
// (§7.4): 8 complete, 3 missing, 1 no-tax-invoice, 1 VAT-not-applicable.
//
// NOTE (live-path caveat, tracked in PLAN.md): the sample text for EXP-002/004/006/011
// now prints an explicit "Tax Invoice" line and serial (added in batches.ts, amounts and
// the intentionally-faded EXP-006 date untouched) so the LIVE model no longer under-reads
// those documentary fields and falsely flags Batch A as at-risk. The answer key already
// treats them as complete; this keeps live extraction aligned without loosening the rules.
// -----------------------------------------------------------------------------

function mk(p: Partial<ExtractedTransaction> & Pick<ExtractedTransaction, "source_id">): ExtractedTransaction {
  return {
    input_source: "text",
    merchant: null,
    date: null,
    description: null,
    line_items: [],
    stated_total: null,
    stated_vat: null,
    vat_status: "unknown",
    vat_number_present: false,
    supplier_vat_number: null,
    supplier_address_present: false,
    invoice_serial: null,
    has_tax_invoice_wording: false,
    description_present: false,
    recipient_details_present: false,
    states_recurring: false,
    recurrence_evidence: null,
    payment_method: "unknown",
    currency: "ZAR",
    category: "other",
    category_rationale: "",
    missing_fields: [],
    clarification_questions: [],
    extraction_confidence: "high",
    notes: null,
    ...p,
  };
}

export const EXTRACTED_13: ExtractedTransaction[] = [
  // --- Batch A: all in order --------------------------------------------------
  mk({
    source_id: "EXP-001",
    merchant: "Makro Woodmead",
    date: "2026-07-03",
    description: "Ergonomic office chair, mesh back",
    line_items: [{ description: "Ergonomic office chair, mesh back", quantity: 1, unit_price: 1449, line_total: 1449 }],
    stated_total: 1449,
    stated_vat: 189,
    vat_status: "inclusive",
    vat_number_present: true,
    supplier_vat_number: "4210189336",
    supplier_address_present: true,
    invoice_serial: "88214",
    has_tax_invoice_wording: true,
    description_present: true,
    payment_method: "card",
    category: "office_supplies",
    category_rationale: "Office furniture",
  }),
  mk({
    source_id: "EXP-002",
    merchant: "Sasol Rivonia",
    date: "2026-07-06",
    description: "Unleaded 95, 46.00 L",
    stated_total: 920,
    stated_vat: 120,
    vat_status: "inclusive",
    vat_number_present: true,
    supplier_vat_number: "4030156882",
    supplier_address_present: true,
    invoice_serial: "RIV-0741", // not printed on the terse slip — see file note
    has_tax_invoice_wording: true,
    description_present: true,
    payment_method: "card",
    category: "fuel_and_travel",
    category_rationale: "Fuel purchase",
  }),
  mk({
    source_id: "EXP-003",
    merchant: "Vodacom Business",
    date: "2026-07-07",
    description: "Business Data 60GB, monthly",
    stated_total: 399,
    stated_vat: 52.04,
    vat_status: "inclusive",
    vat_number_present: true,
    supplier_vat_number: "4520102689",
    supplier_address_present: true,
    invoice_serial: "VB-2026-07-11934",
    has_tax_invoice_wording: true,
    description_present: true,
    states_recurring: true,
    recurrence_evidence: "monthly",
    payment_method: "debit_order",
    category: "telecoms_and_internet",
    category_rationale: "Monthly mobile data",
  }),
  mk({
    source_id: "EXP-004",
    merchant: "Woolworths Sandton City",
    date: "2026-07-09",
    description: "Client meeting refreshments",
    stated_total: 287.5,
    stated_vat: 37.5,
    vat_status: "inclusive",
    vat_number_present: true,
    supplier_vat_number: "4880116791",
    supplier_address_present: true,
    invoice_serial: "WW-090726", // not printed on the terse slip — see file note
    has_tax_invoice_wording: true,
    description_present: true,
    payment_method: "card",
    category: "meals_and_entertainment",
    category_rationale: "Refreshments for a client meeting",
  }),

  // --- Batch B: bits missing --------------------------------------------------
  mk({
    source_id: "EXP-005",
    merchant: "Mama Thandi's Spaza",
    date: "2026-07-11",
    description: "Stock purchase for resale: bread, long life milk, airtime vouchers",
    stated_total: 240,
    stated_vat: null,
    vat_status: "not_registered",
    vat_number_present: false,
    supplier_address_present: true,
    description_present: true,
    payment_method: "cash",
    category: "materials_and_stock",
    category_rationale: "Stock for resale",
    notes: "Supplier states they are not a VAT vendor.",
  }),
  mk({
    source_id: "EXP-006",
    merchant: "PNA Stationers",
    date: null, // faded / illegible
    description: "Printer paper, whiteboard markers, lever arch files",
    stated_total: 612,
    stated_vat: 79.83,
    vat_status: "inclusive",
    vat_number_present: true,
    supplier_vat_number: "4110238947",
    supplier_address_present: true,
    invoice_serial: "PNA-30514", // not printed — see file note; keeps the only gap the date
    has_tax_invoice_wording: true,
    description_present: true,
    payment_method: "card",
    category: "office_supplies",
    category_rationale: "Office stationery",
    missing_fields: ["date"],
    clarification_questions: ["What date was this PNA Stationers purchase made?"],
  }),
  mk({
    source_id: "EXP-007",
    merchant: "Builders Warehouse Midrand",
    date: "2026-07-13",
    description: "Cement, building sand, delivery",
    line_items: [
      { description: "Cement 32.5N 50kg", quantity: 10, unit_price: 89, line_total: 890 },
      { description: "Building sand m3", quantity: 4, unit_price: 65, line_total: 260 },
      { description: "Delivery", quantity: null, unit_price: null, line_total: 150 },
    ],
    stated_total: 1340,
    stated_vat: 174.78,
    vat_status: "inclusive",
    vat_number_present: true,
    supplier_vat_number: "4001208763",
    supplier_address_present: true,
    invoice_serial: "BW-449021",
    has_tax_invoice_wording: true,
    description_present: true,
    payment_method: "eft",
    category: "materials_and_stock",
    category_rationale: "Building materials",
  }),
  mk({
    source_id: "EXP-008",
    merchant: "Uber for Business",
    date: "2026-07-14",
    description: "Sandton CBD to OR Tambo International",
    stated_total: 318,
    stated_vat: null, // not printed — cannot tell if VAT is included
    vat_status: "unknown",
    vat_number_present: false,
    supplier_address_present: false,
    description_present: true,
    payment_method: "card",
    category: "fuel_and_travel",
    category_rationale: "Airport transfer",
    missing_fields: ["stated_vat", "supplier_vat_number"],
    clarification_questions: ["Was VAT included in this Uber charge, and is a tax invoice available?"],
  }),

  // --- Batch C: things gone wrong ---------------------------------------------
  ...(() => {
    const dup = (id: string): ExtractedTransaction =>
      mk({
        source_id: id,
        merchant: "Mzansi Office Mart",
        date: "2026-07-14",
        description: "A4 paper, toner cartridge",
        line_items: [
          { description: "A4 paper, box of 5 reams", quantity: 1, unit_price: 450, line_total: 450 },
          { description: "Toner cartridge, black", quantity: 1, unit_price: 355, line_total: 355 },
        ],
        stated_total: 805,
        stated_vat: 105,
        vat_status: "inclusive",
        vat_number_present: true,
        supplier_vat_number: "4260117745",
        supplier_address_present: true,
        invoice_serial: "MOM-11208",
        has_tax_invoice_wording: true,
        description_present: true,
        payment_method: "card",
        category: "office_supplies",
        category_rationale: "Office supplies",
      });
    return [dup("EXP-009"), dup("EXP-010")];
  })(),
  mk({
    source_id: "EXP-011",
    merchant: "Incredible Connection Menlyn",
    date: "2026-07-16",
    description: "Business laptop, 16GB / 512GB SSD",
    stated_total: 4599,
    stated_vat: 689.85, // supplier charged 15% of the gross instead of extracting the portion
    vat_status: "inclusive",
    vat_number_present: true,
    supplier_vat_number: "4570119923",
    supplier_address_present: true,
    invoice_serial: "IC-778120", // not printed — see file note; isolates the problem to the VAT
    has_tax_invoice_wording: true,
    description_present: true,
    payment_method: "card",
    category: "equipment",
    category_rationale: "Business equipment",
  }),
  mk({
    source_id: "EXP-012",
    merchant: "Kasi Cash Traders",
    date: "2026-07-18",
    description: "Assorted stock - bulk purchase",
    stated_total: 12500,
    stated_vat: null,
    vat_status: "unknown",
    vat_number_present: false,
    supplier_address_present: true,
    description_present: true,
    payment_method: "cash",
    category: "materials_and_stock",
    category_rationale: "Bulk stock purchase",
    missing_fields: ["supplier_vat_number", "has_tax_invoice_wording"],
    clarification_questions: ["Is a tax invoice available for this R12,500 purchase?"],
  }),
  mk({
    source_id: "EXP-013",
    merchant: "Adobe Systems South Africa",
    date: "2026-07-05",
    description: "Creative Cloud for teams, monthly",
    stated_total: 649,
    stated_vat: 84.65,
    vat_status: "inclusive",
    vat_number_present: true,
    supplier_vat_number: "4890120017",
    supplier_address_present: true,
    invoice_serial: "AD-SA-770412",
    has_tax_invoice_wording: true,
    description_present: true,
    states_recurring: true,
    recurrence_evidence: "monthly",
    payment_method: "debit_order",
    category: "software_and_subscriptions",
    category_rationale: "Monthly software subscription",
  }),
];

const idsIn = (ids: string[]) => EXTRACTED_13.filter((r) => ids.includes(r.source_id));

// Per-batch subsets — used by the offline sample path (analysis runs client-side through
// the rules engine when the live model is unavailable) and by tests.
export const EXTRACTED_BATCH_A = idsIn(["EXP-001", "EXP-002", "EXP-003", "EXP-004"]);
export const EXTRACTED_BATCH_B = idsIn(["EXP-005", "EXP-006", "EXP-007", "EXP-008"]);
export const EXTRACTED_BATCH_C = idsIn(["EXP-009", "EXP-010", "EXP-011", "EXP-012", "EXP-013"]);

export const EXTRACTED_BY_BATCH: Record<"A" | "B" | "C", typeof EXTRACTED_BATCH_A> = {
  A: EXTRACTED_BATCH_A,
  B: EXTRACTED_BATCH_B,
  C: EXTRACTED_BATCH_C,
};
