# PocketPulse — Build Plan

Derived from `../POCKETPULSE-BUILD.md` (Part 15 build order) and the two buildathon PDFs
kept in the repo root. This tracks what the scaffold already contains and the ordered work
remaining.

## Governing rule (never break it)

> The model reads. The code calculates. The model explains. The human approves.

If it has a number in it, the **code** does it — including numbers inside AI sentences.

---

## ✅ Verified end-to-end

- `pnpm install` succeeds (222 pkgs). **`packages/core` tests: 34 passing** (full §7.4
  batch verification). Core `tsc --noEmit`: clean. **`pnpm --filter web build`: succeeds**,
  all 13 routes compile, core resolves across the boundary via `transpilePackages`.
- Core relative imports are extensionless (universally resolvable by webpack + Vitest +
  tsc under `moduleResolution: bundler`).
- The rules engine (build step 2) is **complete and reproduces every pinned figure**:
  gross R24,923.50 · VAT R1,547.67 · at-risk R721.18 · donut R762.97/R679.70/R105.00 ·
  6 clean / 7 attention · recurring R1,048/mo, R12,576/yr · per-batch unusual_amount.

## ✅ Done in this scaffold

- Monorepo: `pnpm-workspace.yaml`, root `package.json`, `.eslintrc.json` portability rule, `.gitignore`.
- `packages/core`: package.json (raw TS, no build step), tsconfig, vitest config.
  - **Frozen** `schemas.ts` (Part 4 data contract), `types.ts` constants, `format.ts` (deterministic ZAR), `storage.ts` (StorageAdapter).
  - `rules/vat.ts` — **implemented**: integer-cents money, `computeVat`, `computeNet`, `estimateInclusiveVat`, `applyVat`.
  - `rules/checks.ts` — row-level checks implemented (missing_merchant/date, no_vat_number, vat_status_unknown, vat_mismatch, large_cash); helpers (normaliseMerchant, median). Cross-record checks stubbed.
  - `rules/claimability.ts`, `rules/recurring.ts` — typed skeletons with spec-referenced TODOs.
  - `rules/recompute.ts` — orchestrator + deriveStatus + displayConfidence + canApprove (wired).
  - `prompts/` — extraction + insight system messages **verbatim**, user-message builders, repair message.
  - `data/batches.ts` — all 13 synthetic records (+ optional Afrikaans EXP-014).
  - `state/ledgerReducer.ts` — skeleton (LOAD/RESET wired; EDIT/RESOLVE/REMOVE TODO).
  - `rules/rules.test.ts` — VAT worked-values + formatZAR tests pass; batch-total assertions are `todo`.
- `apps/web`: package.json, next.config (transpilePackages), tsconfig, `.env.example`, tailwind + postcss, `globals.css` theme, root layout (fonts).
  - Marketing layout + landing + features (real Part 7 figures, copy stubbed).
  - `/login` demo gate (functional), `/app` layout with client-side gate + pill nav.
  - Six app screens as scaffold placeholders anchored to spec sections.
  - `api/v1/analyse/route.ts` — returns a well-formed error envelope (CORS wired).
  - `lib/groq.ts` (server-only stub), `lib/storage.web.ts` (localStorage adapter), `lib/utils.ts`.

## ✅ Contradictions — RESOLVED (all reconcile to §7.4; pinned by tests)

Resolutions verified by reconstructing all 13 records' arithmetic. Every §7.4 figure
(gross R24,923.50, VAT R1,547.67, at-risk R721.18, donut R762.97/R679.70/R105.00, the
6-clean/7-attention split, recurring R1,048/mo, and the after-edit R1,442.67/R1,321.36/
R121.31) falls out of these rules. See `rules/rules.test.ts`.

- **A — "sitting outside the total" means outside the DONUT, not the headline.** The
  VAT-position donut decomposes **total VAT calculated (R1,547.67)** — real `computed_vat`
  only — into Safe R762.97 + At-risk-certain R679.70 + Claimed-twice R105.00. Estimates
  (null `computed_vat`) are outside the donut but **inside** the "VAT you could lose"
  headline. Headline **R721.18** = 679.70 + EXP-008 estimate 41.48.
- **B — the headline excludes `full_invoice_required` rows and unresolved duplicates.**
  EXP-012's ~R1,630.43 is a large purchase with no valid tax invoice: unbounded exposure,
  surfaced separately as "up to R1,630.43", never folded into the headline. This makes the
  headline land on exactly **R721.18** and keeps the after-edit "still at risk" at
  R121.31 (= 79.83 + 41.48). Implemented in `claimability.batchVatAtRisk`.
- **C — resolved:** use the `ABRIDGED_REQUIRED` constant (no `abridgedList`).
- **D — resolved:** `none_required` tier requires `[]` (a till slip showing VAT is enough).
- **E — resolved:** `unusual_amount` runs **per batch/paste** (matches the three-sample
  demo flow and §7.3's Batch-C computation: median R805, MAD R156, threshold R1,429).

## First tasks before feature code (spec Part 15 · step 1)

1. **Confirm the Groq model ID** from `/models` with a real key; write it into README + `.env.local`.
2. `corepack enable` → `pnpm install`; `npx shadcn@latest init` + add the component list in §3.1.
3. Add the three `badge.tsx` variants (success / warning / info).
4. **Deploy hello-world to Vercel** (root dir `apps/web`, "include files outside root" ON,
   env vars set) — green within 30 min or use the §2.7 single-app bail-out.

## Ordered build (spec Part 15)

2. **`packages/core` completion — ✅ DONE & TESTED.** checks (line_item_mismatch, exact +
   near duplicates with `pair`, unusual_amount MAD, category_concentration at batch level),
   claimability (`applyClaimability`, invalid_tax_invoice, full_invoice_required, batch
   totals with Resolution A/B), recurring, and `summarise` (donut/totals/categories). All
   §7.4 figures pinned by 34 passing tests.
3. **`api/v1/analyse`** — Groq `chatJson`, extraction via `Promise.allSettled` + one repair
   retry, rules engine, insight + citation validation + figure overwrite + code fallback,
   error envelope + partial results.
4. **Review ledger + evidence drawer** (hardest surface — build first). Live recompute on edit.
5. **Overview** — fix list → repeating card → charts.
6. **Paperwork, Repeating, Approved, Add receipts, Service error.**
7. **Duplicate comparison, supplier query dialog, undo toast.**
8. Demo sign-in polish. _(cut line)_
9. Responsive pass at 375 / 768 / 1024 / 1440.
10. Marketing pages. _(cut line)_
11. README finalise, adversarial testing (Part 7.6), deploy.

Steps 8 and 10 are the cut line: if time runs short they go, and nothing above them suffers.

## Acceptance criteria

The 16 checks in Part 14 of the build spec are the definition of done. `grep -r "gsk_"
apps/web/.next/static/` after a build must return nothing (no key leak).
