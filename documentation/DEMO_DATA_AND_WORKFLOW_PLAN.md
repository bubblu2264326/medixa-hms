# HMS — Demo Data & Workflow Test Plan

> **Status:** Plan only. No implementation, seeding, API calls, or screenshots are performed by this document. Execution happens later via a `/goal` run that follows this spec step by step.
>
> **Goal:** Stand up a realistic, fully-populated demo of the HMS Pharmacy/POS system, then walk every key workflow with screenshots so the result can feed (a) the per-module pitch PDFs and (b) a UX/QA observation log.

---

## 0. Ground rules & environment

These constraints apply to the whole plan and must be honored during the later `/goal` execution.

- **Demo data only — no real PII.** All patients, staff, and suppliers are fabricated. This output is sent to external people, so nothing real may appear.
- **No fabricated outcomes.** Screenshots show the live product; captions describe real features only. No invented metrics, ROI, or testimonials.
- **Preserve money/stock invariants.** Stock is **never** written directly. Inventory is established only through the purchase path (`medicine_purchase` → `medicine_purchase_detail`), which fires the trigger chain `tg_*_detail_to_txn` → `tg_stockquantity_generic`. Sales write through `pharmacy_sale_detail`. This keeps `medicine_transaction`, `medicine_batch`, and `medicine.stock` consistent.
- **Branding:** generic **"HMS / Hospital Management System"** (teal + slate). No company identity.

### Prerequisites (set up once, at execution time)
1. Production build running locally on a fixed port (`next start -p 3100`), DB reachable via `.env.local`.
2. Screenshot harness: reuse `scripts/pitch/capture.mjs` (mints a token cookie per role; navigates routes/tabs; supports clicks to open modals/drawers) and `scripts/pitch/build-pdf.mjs` (HTML → PDF, dense layout).
3. Output folders: `pitch/shots/<module>/*.png`, `pitch/HMS-<module>.pdf`, and this walkthrough's log at `pitch/WORKFLOW_LOG.md`.
4. Demo login identities (existing demo users): Pharmacist `STF002`, Cashier `STF004`, Doctor `DOC001`, Lab `STF003`, Reception `SCN_RECEP`, Admin `ADM001`.

### Data-model note (must be respected in Phase 1)
The catalogue lives in the **`medicine`** table; there is **no separate assets/equipment module**. Consumable supplies and general inventory are therefore modeled as `medicine` rows with appropriate `medicine_category` / `medicine_form` (e.g. form = `Device`, `Consumable`, `Solution`). Suppliers are **`party`** rows. Stock per item is the sum of its **`medicine_batch`** rows, which are created by purchases — so a catalogue row starts at 0 stock until Phase 2 records a purchase against it.

---

## 1. Phase 1 — Catalogue population (100+ diverse items)

**Objective:** A believable, varied catalogue so every screen looks like a real clinic's, not dummy data.

### 1.1 Composition target (≥ 100 items)
| Group | Count (≈) | Examples | `form` values |
|---|---|---|---|
| Tablets / capsules | 30 | Panadol, Augmentin, Brufen, Flagyl, Risek | Tablet, Capsule |
| Syrups / suspensions | 15 | Calpol syrup, Ventolin syrup, Hydryllin | Syrup, Suspension |
| Injectables / vials | 15 | Ceftriaxone inj, Insulin, Dexamethasone | Injection, Vial |
| Consumable supplies | 20 | Syringes (3cc/5cc), IV cannula, gloves, gauze, bandage, cotton | Device, Consumable |
| IV fluids / solutions | 10 | Normal saline, Ringer's lactate, Dextrose 5% | Solution |
| General hospital inventory | 12 | Surgical mask, thermometer, BP cuff, sanitizer | Device, Consumable |

### 1.2 Per-item fields
- Name (`brand_name`) + `generic_name`, `form`, `dosage_value`/`dosage_unit`, `manufacturer`, `category`, `sub_units_per_unit`.
- Pricing & stock are **not** set on the catalogue row directly — they arrive via batches in Phase 2 (`purchase_price`, `sale_price`, `stock_quantity` live on `medicine_batch`).
- Supplier linkage: every batch references a `party` (supplier).

### 1.3 Suppliers (`party`)
Create 5–6 realistic suppliers (e.g. "Sohail Medical Suppliers", "Pakistan Pharma Distributors", "CarePlus Surgicals") with contact + tax fields.

### 1.4 Method (decide at execution)
- **Preferred:** an idempotent demo-seed SQL script under `db/seed/` that inserts `medicine_category`, `medicine_form`, `medicine_manufacturer`, `party`, and 100+ `medicine` rows. Catalogue rows only — **no direct stock/batch writes** (those come from Phase 2 purchases).
- Acceptance: `SELECT count(*) FROM medicine` ≥ 100; ≥ 4 distinct categories; ≥ 5 suppliers.

> 📸 `![Phase 1 — Products catalogue populated](pitch/shots/pharmacy/products.png)`

---

## 2. Phase 2 — Procurement, stock & ledger (from empty)

**Objective:** Establish stock and a movement ledger **only** through the purchase flow, so the trigger chain populates `medicine_batch.stock_quantity`, `medicine_transaction`, and `medicine.stock`.

### 2.1 Purchases to record
| Scenario | Detail | Items |
|---|---|---|
| Bulk purchase | One large invoice from a single supplier | 20–30 items, high quantities |
| Multi-supplier | 2–3 invoices across different suppliers | 10–15 items each |
| Low-stock refill | Small top-up invoice for items intentionally left near zero | 5–8 items |
| Mixed batch/expiry | Same medicine, two batches with different expiry dates | demonstrates FEFO |

### 2.2 Procedure (per purchase) — write via detail tables only
1. Resolve/create the supplier (`party`).
2. Insert `medicine_purchase` (header) → `purchase_id`.
3. For each line: resolve/create `medicine_batch` (batch number, expiry, purchase + sale price), then insert `medicine_purchase_detail`.
4. **Do not touch** `medicine_transaction` or stock columns — the triggers do it.
5. Verify: `medicine_transaction` gains `PURCHASE_IN` rows; `medicine_batch.stock_quantity` increases; `v_medicine_pos` shows the item as sellable.

### 2.3 Ledger / movement
Confirm the **Transactions** tab shows `PURCHASE IN` rows with batch, supplier, and timestamp. Leave a few items at low stock to drive the low-stock alert later.

> 📸 `![Phase 2 — Purchase invoices](pitch/shots/pharmacy/purchases.png)`
> 📸 `![Phase 2 — Movement ledger](pitch/shots/pharmacy/transactions.png)`
> 📸 `![Phase 2 — Low-stock alerts (admin inventory)](pitch/shots/admin/inventory.png)`

---

## 3. Phase 3 — Feature-by-feature workflow documentation

Each feature is documented as a numbered table: **Step → Action → Expected UI → screenshot placeholder.** During execution the placeholders are replaced with real captures.

### 3.1 Pharmacy / Sales flow (`/pharmacy`, Retail tab)
| # | Action | Expected UI | Screenshot |
|---|---|---|---|
| 1 | Open the POS (Retail tab) | Medicine Entry panel + empty Active Billing Cart + Finalize Sale panel (Total Rs 0.00) | `![](pitch/shots/pharmacy/pos.png)` |
| 2 | Type a medicine in "Search Medicine (F1)" | Dropdown of matching products with stock/MRP | `![](pitch/shots/pharmacy/pos-search.png)` |
| 3 | Select a product, set QTY/SUB-QTY/DISC, click **ADD TO BILL** | Row appears in Active Billing Cart; totals update live | `![](pitch/shots/pharmacy/pos-cart-1.png)` |
| 4 | Add 2–3 more items, adjust a quantity | Cart recalculates; Items Disc / Total Savings update | `![](pitch/shots/pharmacy/pos-cart-full.png)` |
| 5 | Choose payment (Cash/Card), enter Amount Received | Change/Due computes; Pay action enabled | `![](pitch/shots/pharmacy/pos-payment.png)` |
| 6 | Complete the sale | Success state; receipt reference; cart clears | `![](pitch/shots/pharmacy/pos-complete.png)` |
| 7 | Clear-bill path | Cart empties, totals reset to Rs 0.00 | `![](pitch/shots/pharmacy/pos-clear.png)` |

### 3.2 Purchase flow (`/pharmacy`, Purchases tab)
| # | Action | Expected UI | Screenshot |
|---|---|---|---|
| 1 | Open Purchases tab | Purchase invoice list | `![](pitch/shots/pharmacy/purchases.png)` |
| 2 | Start a new purchase | Supplier selector + line-item entry | `![](pitch/shots/pharmacy/purchase-new.png)` |
| 3 | Select supplier; add item, batch #, expiry, unit cost, sale price | Lines accumulate with computed totals | `![](pitch/shots/pharmacy/purchase-lines.png)` |
| 4 | Save the purchase | Invoice number generated; success | `![](pitch/shots/pharmacy/purchase-saved.png)` |
| 5 | Verify stock update (Products / Transactions tab) | Item stock increased; `PURCHASE IN` ledger row present | `![](pitch/shots/pharmacy/purchase-stock-verify.png)` |

### 3.3 Patient search & linking (POS top search bar)
| # | Action | Expected UI | Screenshot |
|---|---|---|---|
| 1 | Click "Search patient by name, CNIC, patient ID, or visit ID" | Search field active | `![](pitch/shots/pharmacy/patient-search.png)` |
| 2 | Type a patient name | Matching patients/visits listed | `![](pitch/shots/pharmacy/patient-results.png)` |
| 3 | Select a patient | Sale is linked to that patient/visit (header reflects it) | `![](pitch/shots/pharmacy/patient-linked.png)` |
| 4 | Add medicines & complete | Sale recorded against the patient/visit | `![](pitch/shots/pharmacy/patient-sale.png)` |

### 3.4 Full-screen UI behavior (observation log)
| # | Action | Expected UI / Observation | Screenshot |
|---|---|---|---|
| 1 | Click the full-screen expand control / Sale Mode (F10) | POS expands to full-screen | `![](pitch/shots/pharmacy/fullscreen.png)` |
| 2 | Observe layout at full-screen | Note crowding, unclear section boundaries, any cramped controls | `![](pitch/shots/pharmacy/fullscreen-detail.png)` |
| 3 | Document confusion points | Written observations: what a new user might misread or miss | _(text in WORKFLOW_LOG.md)_ |

> This sub-section is a **UX/QA observation log**, not pitch copy — record honest findings (crowding, ambiguity) for follow-up.

---

## 4. Phase 4 — Multi-scenario testing

Run each scenario end-to-end, capturing before/after.

1. **Walk-in patient purchase** — OTC sale, no patient link, Cash, Collect Now. Verify stock decremented + sale in Transactions.
2. **Prescribed-medicine sale** — link a patient/visit, dispense against a prescription, complete. Verify visit status + ledger.
3. **Bulk purchase restocking** — large multi-line purchase; verify batches + stock + ledger.
4. **Edge cases**
   - Sell more than available stock → expect block/validation message.
   - Empty/zero quantity or invalid price → expect inline validation.
   - Expired/near-expiry batch handling (FEFO) → expect correct batch selection.
   - Append-to-bill vs Collect-now settlement paths.

Each scenario records: setup → steps → expected vs actual → screenshot(s) → pass/fail note.

---

## 5. Phase 5 — Output format

- **Plan & logs:** Markdown (`.md`) with `##`/`###` headings, bullets, and numbered steps; reads like a user guide.
- **Screenshot placeholders:** `![caption](path)` at every key step (as above); replaced with real captures during execution.
- **Pitch PDFs:** one dense PDF per module (`pitch/HMS-<module>.pdf`) via `build-pdf.mjs` — tight layout, minimal whitespace, screenshot + caption + one-line blurb, generic HMS cover.
- **Workflow log:** `pitch/WORKFLOW_LOG.md` aggregating Phases 3–4 with embedded screenshots + observations.

---

## 6. Execution checklist (for the later `/goal` run)

- [ ] Phase 1: demo-seed catalogue (100+ items, ≥4 categories, ≥5 suppliers) — catalogue rows only.
- [ ] Phase 2: record purchases (bulk, multi-supplier, low-stock, mixed-batch) via detail tables; verify trigger-driven stock + ledger.
- [ ] Seed Lab (orders + results) and Cashier (settled payments) demo data via the real APIs so those modules are populated too.
- [ ] Phase 3: capture each feature walkthrough; fill screenshot placeholders.
- [ ] Phase 3.4 + Phase 4: write observation/scenario log.
- [ ] Build all per-module pitch PDFs (`MODULE=all`).
- [ ] Verify: no real PII anywhere; all invariants intact (tests still green); PDFs dense and self-contained.

## 🚫 Constraints (restated)
Do **not** write code, fetch APIs, seed data, capture, or build during the plan phase. This document is the deliverable. Execution begins only on the next `/goal`.

## ⏭️ Next step
You run a `/goal` command; the agent executes this plan phase by phase and produces the populated demo, the workflow log, and the per-module PDFs.
