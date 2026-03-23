# Pharmacy → Retail (POS) Manual Test Suite

Last updated: 2026-03-22

## Scope (Retail tab)

This suite targets the Pharmacy **Retail** POS screen (`src/app/pharmacy/@retail/page.tsx` → `src/features/pharmacy/retail/components/PharmacyPOS.tsx`) including:

- Medicine search (name/SKU/barcode/batch), selection guards (expired/out-of-stock), low-stock visibility
- Product entry (Qty, Sub-Qty, item discount %, rate/price display), add/update item behavior
- Cart table actions (select, edit, remove) and totals behavior
- POS modes: Sale / Return, keyboard shortcuts, fullscreen, hold, clear
- Prescription-linked dispensing flow (patient search, active visit selection, prescribed items, unavailable items, override include)
- Checkout (payment types, amount received/refunded, due/change, submit/hold/print/cash drawer)
- Edit flows via URL params (`mode=edit|edit_return&ref=...`)

Out of scope unless explicitly needed: reporting tabs, purchase/inventory receiving flows, admin configuration, printer driver installation.

## Test roles

- Pharmacist (full access to Retail)
- (Optional) Reception/Doctor roles for ensuring cross-module status transitions don’t break Retail flow
- (Optional) Restricted user to validate access control/permission gating

## Test data (recommended)

Create/identify medicines matching these patterns (same “brand” across multiple batches where applicable):

1. **M1 Standard OTC**: in stock, not expired, single batch, `sub_units_per_unit = 1`.
2. **M2 Sub-unit sale**: `sub_units_per_unit = 10`, stock like **2 units + 5 sub-units**, not expired.
3. **M3 Low stock**: `min_stock_level` configured; stock at/near threshold so UI shows “Low stock”.
4. **M4 Out of stock**: total stock 0.
5. **M5 Expired**: expiry date in the past.
6. **M6 Multi-batch**: same medicine with at least two different batches, different stock/expiry/prices if possible.

Prescription test data:

7. **P1 Patient with 1 active visit** with a prescription containing:
   - at least one available item (enough stock)
   - at least one unavailable item (out-of-stock or insufficient)
8. **P2 Patient with 2+ active visits** (to trigger visit picker modal).

Payments:

9. Ensure CASH drawer endpoint is wired (or mock) so you can observe “open drawer” side-effect on Cash payments.
10. Ensure printing endpoint is available (or mock) so receipt calls can be verified.

## Conventions used below

- “Retail screen” = Pharmacy → Retail (POS).
- “Entry fields” = Qty / Sub-Qty / Disc % / Price and Add button row.
- “Checkout panel” = right-side “Finalize Sale” panel.
- “Rx cart” = prescription-linked cart loaded via patient + visit search.

---

## A. Access, layout, and basic navigation

**RET-A01 — Retail screen loads**
- Preconditions: Logged in as Pharmacist.
- Steps: Open Pharmacy → Retail.
- Expected: Retail POS renders with search bar, entry fields row, empty cart area, and checkout panel.

**RET-A02 — Fullscreen toggle**
- Steps: Click fullscreen toggle button.
- Expected: Screen enters fullscreen; toggle icon changes; ESC exits fullscreen and UI state updates accordingly.

**RET-A03 — “New Sale” resets session**
- Steps: Add 1 item to cart, then press `F4` (or use Clear/New sale action if available).
- Expected: Cart cleared, payment reset, search cleared, any selection/edit state cleared; toast indicates new sale.

**RET-A04 — Rx loaded blocks mode switch**
- Preconditions: Load an Rx cart (Section E).
- Steps: Press `F10` or click mode indicator to switch to Return.
- Expected: Mode does not switch; error toast indicates Rx must be unloaded first.

---

## B. Medicine search (name/SKU/barcode/batch) and selection guards

**RET-B01 — Search by brand name**
- Steps: Type brand name of M1 in search box.
- Expected: Results dropdown appears; matching medicines shown; selecting an enabled result loads it into entry fields.

**RET-B02 — Search by generic name**
- Steps: Type generic name of M1.
- Expected: M1 appears in results.

**RET-B03 — Search by SKU**
- Steps: Type M1 SKU (uppercase, lowercase, with/without hyphens if applicable).
- Expected: Result matches M1; selection allowed if in stock and not expired.

**RET-B04 — Search by barcode**
- Steps: Type barcode digits for M1 (8–13 digits).
- Expected: Result matches barcode; selection allowed if enabled.

**RET-B05 — Search by batch number**
- Preconditions: M6 with distinct `batch_number`s exists.
- Steps: Type a batch number substring.
- Expected: Correct batch rows appear distinctly; selecting a specific batch uses that batch context.

**RET-B06 — Out-of-stock items are not selectable**
- Steps: Search for M4.
- Expected: M4 shows “Out of stock”; row appears disabled; clicking/Enter does not select it.

**RET-B07 — Expired items are not selectable**
- Steps: Search for M5.
- Expected: M5 shows “Expired”; row disabled; cannot select.

**RET-B08 — Low-stock styling and label**
- Steps: Search for M3.
- Expected: Result row indicates “Low stock” and highlights accordingly; still selectable if not out-of-stock/expired.

**RET-B09 — Dropdown keyboard navigation**
- Steps: Search any query returning multiple results; use ArrowDown/ArrowUp; press Enter to select.
- Expected: Focus moves; Enter selects focused enabled item; Escape closes dropdown.

**RET-B10 — Blur behavior**
- Steps: Open dropdown; click outside.
- Expected: Dropdown closes after a brief delay; no unintended selection.

**RET-B11 — Empty query clears results**
- Steps: Type query then remove all text.
- Expected: Results list clears and dropdown closes.

**RET-B12 — Search disabled for Rx cart**
- Preconditions: Rx cart loaded.
- Steps: Type into search field.
- Expected: Search does not run; placeholder indicates disabled; no dropdown results.

---

## C. Product entry & item creation (Qty/Sub-Qty/Discount)

**RET-C01 — Selecting a medicine primes entry fields**
- Steps: Select M1 from search.
- Expected: “Match” panel shows selected medicine; cursor focuses Qty field; search input shows composed label (with expiry and lot if available).

**RET-C02 — Add item with default quantity**
- Steps: Select M1 → press Add (or press Enter in an entry field).
- Expected: Item added to cart; entry fields reset; focus returns to search input.

**RET-C03 — Quantity = 0 is rejected**
- Steps: Select M1 → set Qty = 0 and Sub-Qty = 0 → Add.
- Expected: Error toast “Quantity must be greater than 0”; item not added.

**RET-C04 — Quantity negative is prevented**
- Steps: Attempt to type negative value into Qty.
- Expected: Input rejects or clamps per min; cannot add negative quantity.

**RET-C05 — Discount boundaries**
- Steps: For M1, try Disc % = 0, 100, >100, and a decimal (e.g., 12.5).
- Expected:
  - 0 and 100 accepted
  - >100 not accepted
  - decimal accepted only if within 0–100
  - cart line totals reflect discount.

**RET-C06 — Large quantity boundary**
- Steps: Try Qty very large (e.g., 9999) and Add.
- Expected: Input respects max; if stock insufficient, add is rejected with “Only X available …”.

**RET-C07 — Sub-Qty accepted when sub-units configured**
- Preconditions: Use M2 (`sub_units_per_unit = 10`).
- Steps: Select M2 → set Qty=1 and Sub-Qty=1 → Add.
- Expected: Line total includes 1 unit + 1 sub-unit pricing; stock validation accounts for sub-units; item added if stock sufficient.

**RET-C08 — Sub-Qty when `sub_units_per_unit = 1`**
- Preconditions: Use M1 (`sub_units_per_unit = 1`).
- Steps: Set Sub-Qty > 0 → Add.
- Expected: System either:
  - treats sub-qty as extra fractional stock and bills it, or
  - blocks it.
  Record actual behavior and confirm with intended business rule.

**RET-C09 — Sub-Qty ≥ “per unit” normalization risk**
- Preconditions: M2 where per-unit is 10.
- Steps: Set Qty=0, Sub-Qty=10 → Add.
- Expected: Add succeeds only if stock ≥ 10 sub-units; verify totals and cart representation. If cart shows Sub-Qty=10 (not normalized to 1 unit), flag as a potential defect/risk for receipt/stock reconciliation.

**RET-C10 — Stock validation message includes batch**
- Preconditions: Select a batch-specific result for M6 with limited stock.
- Steps: Enter quantity exceeding that batch stock → Add.
- Expected: Error message includes available breakdown and “in batch <batch_number>” where applicable.

**RET-C11 — Expired medicine cannot be added even via Enter**
- Steps: Attempt to select M5 via keyboard navigation and press Enter.
- Expected: No selection; cannot add.

---

## D. Cart behavior (merge/update/edit/remove) and calculations

**RET-D01 — Same medicine + same batch updates existing line**
- Steps: Add M6 batch A to cart → add same batch A again with different qty/discount.
- Expected: Cart contains a single line for that batch; values are updated (not duplicated).

**RET-D02 — Same medicine + different batch creates new line**
- Steps: Add M6 batch A → add M6 batch B.
- Expected: Two separate cart lines (distinct batch/lot).

**RET-D03 — Edit button populates entry fields**
- Steps: Add M1 → click Edit (✎) on that line.
- Expected: Entry fields populate with that item’s qty/subqty/discount; Add button indicates edit; saving updates the same line.

**RET-D04 — Editing respects stock**
- Steps: Edit an item and increase qty beyond available.
- Expected: Update rejected with stock error; cart remains unchanged.

**RET-D05 — Remove item**
- Steps: Add 2 items → remove one.
- Expected: Removed line disappears; totals recompute.

**RET-D06 — Remove selected item clears selection**
- Steps: Select an item (row highlight) → remove it.
- Expected: Selection cleared; no stale selection state.

**RET-D07 — Line total rounding (2 decimals)**
- Steps: Use a price that produces fractional cents with discount; verify line totals.
- Expected: Line totals rounded to 2 decimals consistently; payment totals align with sum of billable line totals.

**RET-D08 — Items discount aggregation**
- Steps: Add two items each with a discount; inspect “Items Disc” and “Total Savings” in checkout panel.
- Expected: Items discount equals sum of per-line discounts; total savings includes all discounts applied (and any global adjustment if present).

**RET-D09 — Excluded items do not affect payable**
- Preconditions: Rx flow produces “Excluded” items (unavailable prescription items).
- Steps: Load Rx cart with unavailable items.
- Expected: Excluded items have line total 0; payable reflects only billable items.

---

## E. Prescription-linked sale (patient search → active visit → dispensing cart)

**RET-E01 — Patient search results appear after 2+ characters**
- Steps: In patient search field, type 2+ chars of P1 name/ID.
- Expected: Dropdown results show matching patients; includes CNIC and active visit count.

**RET-E02 — Patient search keyboard navigation**
- Steps: With results open, use ArrowDown/ArrowUp; Enter selects highlighted.
- Expected: Highlight moves; Enter triggers active visit lookup for selected patient.

**RET-E03 — Selecting patient with 0 active visits**
- Preconditions: Patient record with no active visits.
- Steps: Select that patient.
- Expected: Error toast “No active visit found…”; no Rx cart loaded.

**RET-E04 — Selecting patient with 1 active visit loads Rx cart**
- Preconditions: P1 with exactly 1 active visit and an existing prescription sale response.
- Steps: Select patient.
- Expected:
  - Cart is populated with prescribed items
  - Rx meta chips appear (Rx #, Visit #, pending items count)
  - Search is disabled and Add flow is blocked
  - Visit status update is attempted (to “dispensing”); failure surfaces as toast.

**RET-E05 — Selecting patient with 2+ active visits opens visit picker**
- Preconditions: P2 with 2+ active visits.
- Steps: Select patient.
- Expected: Visit picker modal appears listing visits with doctor, clinic number, timestamp; selecting a visit loads Rx cart.

**RET-E06 — Visit picker “Close” does not load Rx**
- Steps: Open visit picker → Close.
- Expected: No Rx loaded; UI returns to normal retail state.

**RET-E07 — Unavailable Rx items are excluded by default**
- Preconditions: Rx contains out-of-stock or insufficient-stock items.
- Steps: Load Rx cart.
- Expected: Those items show “Out of Stock” or “Low Stock” badge; line shows “Excluded”; payable excludes them.

**RET-E08 — Unavailable Rx item “Include” opens override modal**
- Steps: Click “Include” on an unavailable Rx line.
- Expected: Override modal appears requiring reason code, quantity, price, and pharmacist note.

**RET-E09 — Override modal validation**
- Steps: In override modal, try saving with:
  - empty note
  - quantity = 0
  - price = 0
- Expected: Inline error shown; cannot include until all required fields valid.

**RET-E10 — Override include makes item billable**
- Steps: Provide valid override inputs and “Include In Transaction”.
- Expected:
  - Line shows “Override” badge
  - Item is billable (no longer excluded)
  - Line total reflects override qty/price
  - Stock validation is bypassed for this item.

**RET-E11 — Edit disabled for unavailable Rx items**
- Steps: Try to click Edit on unavailable Rx line (before override).
- Expected: Edit button disabled; cannot open entry edit flow for that line.

**RET-E12 — Rx cart is locked against adding arbitrary medicines**
- Preconditions: Rx loaded.
- Steps: Attempt to select a medicine from search or add/update via entry fields.
- Expected: Search cannot select; add/update actions show error toast and do not modify cart.

**RET-E13 — Unload Rx restores visit status**
- Preconditions: Rx loaded.
- Steps: Click “Unload Rx”.
- Expected:
  - POS session resets
  - Visit status update attempted (back to “seen_by_doctor”); failure surfaced by toast.

---

## F. Sale checkout (payments, due/change, submit, print, cash drawer)

**RET-F01 — Cannot complete sale with empty cart**
- Steps: Click “Complete Sale”.
- Expected: Error “Cart is empty”.

**RET-F02 — Due amount must be 0 to complete**
- Steps: Add items → leave Amount Received at 0 → click Complete Sale.
- Expected: Error toast showing due amount; transaction not submitted.

**RET-F03 — Exact payment completes sale**
- Steps: Add items → enter Amount Received = Total Payable → Complete Sale.
- Expected:
  - Transaction submitted successfully
  - If Auto-print on: receipt print called
  - If payment type is CASH: cash drawer called
  - POS resets (cart cleared, etc.)

**RET-F04 — Overpayment computes change**
- Steps: Amount Received > Total Payable.
- Expected: Change Due shows correct value; completion allowed; due is 0.

**RET-F05 — Payment type switch persists amounts**
- Steps: Change payment type (Cash/Card/Insurance) after entering Amount Received.
- Expected: Selected payment type changes; amounts remain consistent; completion logic unchanged (due must be 0).

**RET-F06 — Auto-print toggle**
- Steps: Toggle Auto-print off → complete sale.
- Expected: Sale completes without calling auto print; “Print Last Receipt” can still be used if a transaction id exists.

**RET-F07 — Print Last Receipt is disabled until a transaction exists**
- Steps: Fresh session; observe Print Last Receipt state.
- Expected: Disabled; after one successful transaction, enabled and prints most recent.

**RET-F08 — Hold transaction**
- Steps: Add items → click Hold (or press `F3`).
- Expected: “held” transaction submitted; POS session resets; verify held entry exists via held list endpoint (if accessible).

**RET-F09 — Clear button**
- Steps: Add items → click Clear.
- Expected: POS session resets without submitting any transaction.

**RET-F10 — Network failure during submit**
- Preconditions: Simulate API failure for submit endpoint.
- Steps: Attempt Complete Sale.
- Expected: User sees error toast; POS does not clear cart; user can retry.

**RET-F11 — Printing failure does not lose the sale**
- Preconditions: Simulate print endpoint failure.
- Steps: Complete Sale with Auto-print on.
- Expected: Transaction completes; user sees print error; sale should remain recorded; manual print may retry.

**RET-F12 — Cash drawer failure does not lose the sale**
- Preconditions: Simulate cash drawer endpoint failure.
- Steps: Complete Sale with CASH.
- Expected: Transaction completes; user sees drawer error (if surfaced); no data loss.

---

## G. Return mode (refund workflow)

**RET-G01 — Toggle to Return mode**
- Steps: Press `F10` (no Rx loaded) to switch mode.
- Expected: Mode indicator changes to “Return Mode”; checkout labels show “Refundable/Refunded” semantics.

**RET-G02 — Return completion requires “Amount Refunded” to match refundable**
- Steps: In Return mode, add an item line and try to process return with Amount Refunded < Total Refundable.
- Expected: Due amount > 0 prevents processing; error toast indicates remaining balance.

**RET-G03 — Return mode quick-fill on focus**
- Steps: In Return mode with payable > 0 and Amount Refunded = 0, focus Amount Refunded using ArrowRight from search.
- Expected: Amount Refunded auto-fills to Total Refundable and focuses input.

**RET-G04 — Return mode stock validation behavior**
- Steps: In Return mode, try to return an item quantity greater than current stock.
- Expected: If UI blocks it due to stock validation, log as potential business-logic defect (returns should usually not require available stock).

---

## H. Edit existing sale/return via URL params

**RET-H01 — Edit sale loads cart and payment**
- Preconditions: Existing sale transaction id `TSALE`.
- Steps: Open Retail with query `?mode=edit&ref=TSALE`.
- Expected: Cart and payment load; toast confirms loaded; “Complete Sale” button shows “Update Sale”.

**RET-H02 — Edit return loads cart and payment**
- Preconditions: Existing return transaction id `TRET`.
- Steps: Open Retail with query `?mode=edit_return&ref=TRET`.
- Expected: Return data loads; UI in RETURN mode; button shows “Update Return”.

**RET-H03 — Edit submit updates instead of creating**
- Steps: Change qty/discount in loaded edit flow → Update.
- Expected: Update endpoint called; transaction updated; success toast.

**RET-H04 — Removing edit params exits edit mode**
- Steps: From an edit session, navigate to same page without params.
- Expected: POS exits edit mode; state resets to normal SALE mode.

---

## I. Keyboard shortcuts and focus flow

**RET-I01 — `F1` focuses medicine search**
- Steps: Click elsewhere; press `F1`.
- Expected: Search input focused; toast “Search Focused”.

**RET-I02 — `F2` triggers pay**
- Steps: Add items; ensure focus is elsewhere; press `F2`.
- Expected: Same behavior as clicking “Complete Sale/Process Return”.

**RET-I03 — `F3` triggers hold**
- Steps: Add items; press `F3`.
- Expected: Hold executed (same as clicking Hold).

**RET-I04 — `F4` starts new sale**
- Steps: Add items; press `F4`.
- Expected: POS resets; toast “New Sale Started”.

**RET-I05 — ArrowLeft/ArrowRight navigation between entry fields**
- Steps: Focus Qty; press ArrowRight repeatedly; press ArrowLeft repeatedly.
- Expected: Focus moves Qty → SubQty → Disc → Price and back; ArrowLeft from Qty returns focus to search.

**RET-I06 — ArrowRight from search focuses payment**
- Steps: Focus search; press ArrowRight.
- Expected: Payment amount input focused (and auto-filled in return mode as applicable).

---

## J. Data integrity & reconciliation checks (manual verification)

**RET-J01 — Stock decrements after completed sale**
- Steps: Note M1 stock before sale → sell qty 1 → search M1 again.
- Expected: Stock shown decreases by sold quantity (may require cache invalidation; if stale, retry after reset/new sale).

**RET-J02 — Held transaction does not decrement stock (if intended)**
- Steps: Hold a cart; verify stock impact vs expected business policy.
- Expected: Either stock unchanged (typical) or reserved (if system supports reservation). Confirm intended rule.

**RET-J03 — Returns increment stock (if implemented)**
- Steps: Process return for an item; verify stock increases accordingly.
- Expected: Stock reflects return logic per business rules.

---

## K. Negative / resilience tests (API & UI state)

**RET-K01 — Medicine search endpoint failure**
- Preconditions: Simulate `/api/medicine/search` failure.
- Steps: Search for medicine.
- Expected: Search shows no results; error is handled gracefully; no crash.

**RET-K02 — Prescription sale load failure**
- Preconditions: Simulate `/api/pharmacy/prescription-sale` failure.
- Steps: Select a patient/visit.
- Expected: Error toast; Rx cart not loaded; POS remains usable.

**RET-K03 — Visit status update failure**
- Preconditions: Simulate `/api/visit/status` failure.
- Steps: Load Rx cart or unload Rx.
- Expected: Non-blocking toast shows failure; POS still loads/unloads Rx cart.

**RET-K04 — Double-click Complete Sale (idempotency)**
- Steps: Click Complete Sale rapidly twice.
- Expected: UI disables processing; only one transaction created/updated.

**RET-K05 — Refresh browser mid-transaction**
- Steps: Add items; refresh page.
- Expected: In-progress unsaved cart is lost (if no persistence) OR restored (if persistence exists). Confirm expected behavior.

