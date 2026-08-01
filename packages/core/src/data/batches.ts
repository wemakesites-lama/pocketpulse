// PART 7 · SYNTHETIC DATA. All fictional.
// Do NOT edit these amounts without redoing the arithmetic; a judge will mentally
// check at least one. Raw receipt text is fed to the extraction model as-is.

export interface SampleRecord {
  source_id: string;
  raw: string;
}

export interface SampleBatch {
  id: "A" | "B" | "C";
  /** UI label — plain English, no jargon (see PART 13 copy rules). */
  label: string;
  /** One-line description for the sample button. */
  description: string;
  records: SampleRecord[];
}

// -----------------------------------------------------------------------------
// 7.1 Batch A — All in order (4 records). Zero problems.
// Expected VAT: R189.00 / R120.00 / R52.04 / R37.50 · gross R3,055.50 · VAT R398.54.
// EXP-003 carries a blue recurring tag, evidence "monthly".
// -----------------------------------------------------------------------------
const BATCH_A: SampleBatch = {
  id: "A",
  label: "All in order",
  description: "4 receipts, nothing to fix",
  records: [
    {
      source_id: "EXP-001",
      raw: `MAKRO WOODMEAD
VAT Reg No. 4210189336
Tax Invoice 88214
03/07/2026  14:22

1 x Ergonomic office chair, mesh back    R1,449.00

TOTAL (VAT incl)                         R1,449.00
VAT @ 15%                                  R189.00

Paid: Card ****4471`,
    },
    {
      source_id: "EXP-002",
      raw: `SASOL RIVONIA
VAT No 4030156882
06 July 2026  07:41
Pump 4  Unleaded 95  46.00 L @ R20.00/L

TOTAL INCL VAT     R920.00
VAT               R120.00
CARD PAYMENT`,
    },
    {
      source_id: "EXP-003",
      raw: `Vodacom Business
Tax Invoice VB-2026-07-11934
Statement date: 2026-07-07
Account: Business Data 60GB, monthly

Amount due (incl. VAT): R399.00
VAT at 15%: R52.04
Payment method: Debit order
VAT registration 4520102689`,
    },
    {
      source_id: "EXP-004",
      raw: `WOOLWORTHS SANDTON CITY
VAT 4880116791
09-07-2026
Client meeting refreshments
Coffee beans, assorted pastries, sparkling water

TOTAL R287.50 (incl VAT R37.50)
CARD`,
    },
  ],
};

// -----------------------------------------------------------------------------
// 7.2 Batch B — Bits missing (4 records).
// EXP-005 R240.00 not_registered -> VAT null, no warning (believed the supplier).
// EXP-006 R612.00 -> no date · R79.83 at stake.
// EXP-007 R1,340.00 -> items sum to R1,300.00 · R40.00 missing.
// EXP-008 R318.00 -> no VAT number, status unknown · ~R41.48 estimate.
// 4 records, so unusual_amount correctly does NOT run.
// -----------------------------------------------------------------------------
const BATCH_B: SampleBatch = {
  id: "B",
  label: "Bits missing",
  description: "4 receipts, faded dates and a missing VAT number",
  records: [
    {
      source_id: "EXP-005",
      raw: `MAMA THANDI'S SPAZA
Cnr Ncondo & 7th, Mamelodi East
11/07/2026

Stock purchase for resale:
  bread x24, long life milk x18, airtime vouchers

CASH  R240.00

No VAT charged - not a VAT vendor`,
    },
    {
      source_id: "EXP-006",
      raw: `PNA STATIONERS
VAT Reg 4110238947
[date line faded, illegible]

Printer paper A4 x5 reams
Whiteboard markers x12
Lever arch files x8

TOTAL   R612.00
VAT     R 79.83
CARD`,
    },
    {
      source_id: "EXP-007",
      raw: `BUILDERS WAREHOUSE MIDRAND
Tax Invoice BW-449021
VAT No 4001208763
13 July 2026

Cement 32.5N 50kg      10 @ R89.00      R890.00
Building sand m3        4 @ R65.00      R260.00
Delivery                                R150.00

TOTAL DUE (incl VAT)                  R1,340.00
VAT @ 15%                               R174.78

EFT`,
    },
    {
      source_id: "EXP-008",
      raw: `Uber for Business
Trip receipt
14 July 2026
Sandton CBD to OR Tambo International

Total charged: R318.00

Card on file ending 4471`,
    },
  ],
};

// -----------------------------------------------------------------------------
// 7.3 Batch C — Things gone wrong (5 records).
// EXP-009 / EXP-010 byte-identical -> exact duplicate · R805.00.
// EXP-011 R4,599.00 -> VAT stated R689.85 is wrong (correct portion R599.87) · larger than usual.
// EXP-012 R12,500.00 -> no tax invoice, full tier, large cash · up to R1,630.43 estimate.
// EXP-013 R649.00 -> none · blue recurring tag, evidence "monthly".
// unusual_amount: median R805, MAD R156, threshold R1,429 -> flags EXP-011 & EXP-012 (a feature, not noise).
// -----------------------------------------------------------------------------
const EXP_009_010_RAW = `MZANSI OFFICE MART
VAT Reg No 4260117745
Tax Invoice MOM-11208
14/07/2026  11:07

A4 paper, box of 5 reams    R450.00
Toner cartridge, black      R355.00

TOTAL INCL VAT              R805.00
VAT                         R105.00
CARD ****4471`;

const BATCH_C: SampleBatch = {
  id: "C",
  label: "Things gone wrong",
  description: "5 receipts, a double payment and a wrong VAT amount",
  records: [
    { source_id: "EXP-009", raw: EXP_009_010_RAW },
    { source_id: "EXP-010", raw: EXP_009_010_RAW },
    {
      source_id: "EXP-011",
      raw: `INCREDIBLE CONNECTION MENLYN
VAT 4570119923
16 July 2026

Business laptop, 16GB / 512GB SSD

Total (VAT inclusive)   R4,599.00
VAT @ 15%                 R689.85

CARD`,
    },
    {
      source_id: "EXP-012",
      raw: `KASI CASH TRADERS
Marabastad
18/07/2026

Assorted stock - bulk purchase

PAID CASH        R12,500.00

(no VAT number printed)`,
    },
    {
      source_id: "EXP-013",
      raw: `Adobe Systems South Africa
Invoice AD-SA-770412
05 July 2026
Creative Cloud for teams, monthly

Total incl. VAT   R649.00
VAT               R 84.65
Debit order
VAT No 4890120017`,
    },
  ],
};

export const BATCHES: SampleBatch[] = [BATCH_A, BATCH_B, BATCH_C];

export function getBatch(id: SampleBatch["id"]): SampleBatch | undefined {
  return BATCHES.find((b) => b.id === id);
}

// -----------------------------------------------------------------------------
// 7.5 Optional Afrikaans record — NOT part of the core totals. Use only if the
// innovation slot allows. R1,028.00 x 15 / 115 = R134.09, matching printed BTW.
// Should render in English, category materials_and_stock, zero problems.
// -----------------------------------------------------------------------------
export const EXP_014_AFRIKAANS: SampleRecord = {
  source_id: "EXP-014",
  raw: `BOUMATERIAAL HANDELAARS
BTW Reg 4110229981
Belastingfaktuur 30219
21 Julie 2026

Verf, wit, 20L emmer        R899.00
Kwaste, stel van 4          R129.00

TOTAAL (BTW ingesluit)    R1,028.00
BTW teen 15%                R134.09
Kontant`,
};
