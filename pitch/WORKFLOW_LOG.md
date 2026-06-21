# Medixa — Workflow & QA Log

Live walkthroughs captured against the running system (demo data, no real PII).
Screenshots: `pitch/shots/<module>/`. PDFs: `pitch/Medixa-<module>.pdf`.

> Scope: **all six role modules** — Pharmacy, Cashier, Laboratory, Doctor, Reception, Admin.
> Each has a per-module PDF (`pitch/Medixa-<module>.pdf`), one feature per landscape page,
> screenshot-on-top with capability copy and an impact callout.

---

## Pharmacy / Point-of-Sale

Demo state backing these screens: 117-item catalogue, 5 supplier purchases
(stock established via the trigger chain), 113 batches in stock, 7 low-stock and
12 zero-stock items for realistic alerts.

### Sales — performed
| # | Action | Expected UI | Screenshot |
|---|---|---|---|
| 1 | Open POS, search a medicine, add to bill | Item enters the cart with FEFO batch; totals update live | `shots/pharmacy/pos.png` |
| 2 | Type in the medicine search | Dropdown of matches with batch, stock, expiry, price | `shots/pharmacy/pos-search.png` |
| 3 | Press the maximise (□) control / F10 | Full-screen Sale Mode — nav chrome gone, cart + finalize fill the screen (3-item cart, Rs 59) | `shots/pharmacy/pos-fullscreen.png` |
| 4 | Click **Hold** with items in the cart | Toast "Transaction held successfully"; cart clears; **Load** to resume | `shots/pharmacy/pos-hold.png` |

### Purchasing & returns — performed
| # | Action | Expected UI | Screenshot |
|---|---|---|---|
| 5 | Purchases → pick supplier, search product, fill batch, **Add** | "… added to invoice" toast; line in the purchase basket | `shots/pharmacy/purchase.png` |
| 6 | Verify in the ledger | Colour-coded PURCHASE-IN / SALE-OUT / returns with batch + reference | `shots/pharmacy/transactions.png` |
| 7 | Ledger → **Return** on a sale | Return Mode (red) — refund computed against the original sale | `shots/pharmacy/sale-return.png` |
| 8 | Ledger → **Return** on a purchase | Purchase Return — invoice searched, supplier + value surfaced | `shots/pharmacy/preturn.png` |

### Catalogue, suppliers & reporting
| # | Area | Expected UI | Screenshot |
|---|---|---|---|
| 9 | Products | Medicines, consumables & devices with multi-batch stock | `shots/pharmacy/products.png` |
| 10 | Suppliers | Party directory with contact/tax, linked to purchases | `shots/pharmacy/parties.png` |
| 11 | Reports | Medicine-stock batch summary (+ expiring / dead stock), CSV export | `shots/pharmacy/reports.png` |

### UX observations (honest)
- The POS is information-dense; **Full-screen Sale Mode** materially helps on smaller laptops by removing chrome and enlarging the cart/finalize panels.
- Hold/Load and the dual collect-now / append-to-bill settlement are powerful but benefit from a one-time onboarding tooltip for first-time cashiers.

### Phase-4 scenarios exercised during seeding
- Walk-in sale, bulk restock, low/dead-stock alerts, mixed batch/expiry (FEFO), sale return and purchase return.

---

## Cashier

Append-only ledger; corrections are reverse-and-repost, never edits.

| # | Action | Expected UI | Screenshot |
|---|---|---|---|
| 1 | Open Collect worklist | Outstanding bills ranked by due/aging with 7+/30+/60+ alert chips | `shots/cashier/collect.png` |
| 2 | Open a bill into the Settle drawer | Source breakdown (e.g. LAB Rs 1,500), payment method, change/due, printable receipt | `shots/cashier/settle.png` |
| 3 | History | Every payment + reversal as append-only rows | `shots/cashier/history.png` |
| 4 | Drafts | Held partial settlements, applied idempotently | `shots/cashier/drafts.png` |
| 5 | My Shift | Open float, counted close, automatic variance | `shots/cashier/shift.png` |

---

## Laboratory

Lab orders flow from the doctor, auto-bill the visit, and return results read-back.

| # | Action | Expected UI | Screenshot |
|---|---|---|---|
| 1 | Order board | Pending / collected / resulted orders with status | `shots/lab/*` |
| 2 | Collect a sample (performed) | Specimen type + collector recorded against a pending order | `shots/lab/collect.png` |
| 3 | Result entry | Values with reference ranges; abnormal / critical flags | `shots/lab/*` |

> Migration `2026_06_22_lab_order_status_collected.sql` widened `lab_order_status_check`
> to include `Collected` (fixed a real 500 surfaced while performing collection).

---

## Doctor Workspace

Queue-driven; selecting a patient opens the encounter in context.

| # | Action | Expected UI | Screenshot |
|---|---|---|---|
| 1 | Live queue | Today's patients, OPD/Emergency split | `shots/doctor/queue.png` |
| 2 | Select patient → Labs | Lab history with values, ref ranges, Performed/Pending/Collected | `shots/doctor/labs.png` |
| 3 | Select patient → Medicines | Prescription history + live-formulary prescribing grid | `shots/doctor/medicines.png` |
| 4 | Select patient → History | Patient-wide visit history across all treating doctors | `shots/doctor/history.png` |

> Capture fix: `pickDoctorPatientThen` factory was wrongly declared `async`, so the harness
> awaited a `Promise<fn>` and silently no-op'd the prepare — patient selection never ran.
> Demo cleanup: 50 junk `visit.reason` values replaced with realistic complaints.

---

## Reception & Front Desk

Check-ins appear on the right doctor's queue in real time.

| # | Action | Expected UI | Screenshot |
|---|---|---|---|
| 1 | Live queue | Real-time queue across clinics with status | `shots/reception/queue.png` |
| 2 | Register | New/returning patient + start visit (OPD/Emergency) | `shots/reception/register.png` |
| 3 | Appointments | Book/manage against doctors and clinics | `shots/reception/appointments.png` |
| 4 | Vitals | Intake vitals attached to the visit | `shots/reception/vitals.png` |

---

## Administration

The management layer over pharmacy, cashier, lab and clinical modules.

| # | Action | Expected UI | Screenshot |
|---|---|---|---|
| 1 | Operations dashboard | 30-day cash, daily patients, active staff, critical low-stock, patient growth, pulse feed | `shots/admin/dashboard.png` |
| 2 | Inventory → New Stock Order (performed) | Procurement modal over stock health; writes via the pharmacy trigger chain | `shots/admin/inventory.png` |
| 3 | Staff directory | Workforce with role/status, drill-in, archive | `shots/admin/staff.png` |
| 4 | Payroll runs | Month-wise draft with per-line model/base; Finalize lock | `shots/admin/payroll.png` |
| 5 | Security & system audit | Real-time ledger, date/critical filters, CSV export | `shots/admin/audit.png` |

> The `/admin/financials` P&L view was **excluded** from the pitch: on this demo dataset
> (heavy seeded procurement, light sales) it headlines a net loss artifact. The positive
> money story is told truthfully by the dashboard's cash-collected + revenue trend.
