# Medixa — Workflow & QA Log

Live walkthroughs captured against the running system (demo data, no real PII).
Screenshots: `pitch/shots/<module>/`. PDFs: `pitch/Medixa-<module>.pdf`.

> Scope so far: **Pharmacy / Point-of-Sale** (other modules pending).

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
