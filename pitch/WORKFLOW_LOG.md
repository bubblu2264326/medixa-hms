# HMS — Workflow & QA Log

Live walkthroughs captured against the running system (demo data, no real PII).
Screenshots live under `pitch/shots/<module>/`. PDFs: `pitch/HMS-<module>.pdf`.

> Scope so far: **Pharmacy / Point-of-Sale** (other modules pending).

---

## Pharmacy / Point-of-Sale

Demo state backing these screens: 117-item catalogue, 5 supplier purchases
(stock established via the trigger chain), 113 batches in stock, 7 low-stock and
12 zero-stock items for realistic alerts.

### 3.1 Sales flow
| # | Action | Expected UI | Screenshot |
|---|---|---|---|
| 1 | Open the POS (Retail tab) | Medicine Entry + Active Billing Cart + Finalize Sale (Total Rs 0.00) | `shots/pharmacy/pos.png` |
| 2 | Search a medicine (F1) and add to bill | Item drops into the cart with batch (FEFO), qty, line total | `shots/pharmacy/pos.png` |
| 3 | Add more items | Cart recalculates; Total Payable updates live (demo shows 3 items → **Rs 59.00**) | `shots/pharmacy/pos.png` |
| 4 | Choose payment + settlement | Cash/Card/Insure; Collect-now vs Append-to-bill; amount received → change/due | `shots/pharmacy/pos.png` |

### 3.2 Purchase flow
| # | Action | Expected UI | Screenshot |
|---|---|---|---|
| 1 | Open Purchases tab | Purchase entry against a supplier with batch/expiry/cost/sale-price lines | `shots/pharmacy/purchases.png` |
| 2 | Save the purchase | Invoice number generated; stock + ledger updated via the trigger chain | `shots/pharmacy/transactions.png` |
| 3 | Verify movement | Transactions ledger shows `PURCHASE IN` with batch, supplier and reference | `shots/pharmacy/transactions.png` |

### 3.3 Catalogue, suppliers & reporting
| # | Area | Expected UI | Screenshot |
|---|---|---|---|
| 1 | Products | Medicines, consumables and devices with form, strength, manufacturer, multi-batch stock | `shots/pharmacy/products.png` |
| 2 | Suppliers | Party directory with contact/tax details, linked to purchases | `shots/pharmacy/parties.png` |
| 3 | Reports | Expiring-soon / dead-stock / medicine-stock (batch summary), CSV export | `shots/pharmacy/reports.png` |

### 3.4 Full-screen UI — UX observations (honest)
- The POS is intentionally information-dense: three columns (Medicine Entry, Active Billing Cart, Finalize Sale). On a 1536-wide laptop it reads well; below ~1280 the Finalize-Sale panel competes with the cart and the layout can feel crowded.
- "Sale Mode (F10)" / full-screen maximises the till, which helps on smaller screens, but section boundaries between cart and finalize could be clearer for a first-time cashier.
- Net: strong for trained daily users; a brief onboarding tooltip pass would reduce first-use confusion.

### Phase 4 — scenarios verified during seeding
- **Walk-in purchase** — OTC sale, Cash, Collect-now → stock decremented, movement logged.
- **Bulk restock** — large multi-line purchase → batches created, stock + ledger updated.
- **Low-stock / dead-stock** — 7 items intentionally below threshold surface in Reports + admin alerts; 12 zero-stock.
- **Mixed batch/expiry** — same medicine, two batches with different expiry → FEFO selection at sale.
