# 💊 Pharmacy Module: User Guide

## Overview

The Pharmacy Portal is accessible at `/pharmacy` and requires the `PHARMACIST` or `ADMIN` role. It serves as a fully-integrated, tab-based Point-of-Sale and inventory management system.

**The 8 tabs are:**
| Tab | Purpose |
|---|---|
| **Retail** | POS for selling medicines to walk-in or prescription patients |
| **Purchases** | Record new stock arrivals from suppliers |
| **Transactions** | Review all completed and held sale history |
| **Parties** | Manage suppliers and vendors |
| **P. Return** | Return purchased stock back to a supplier |
| **Products** | Manage the medicine catalogue (name, barcode, dosage, etc.) |
| **Reports** | Stock-level and financial summary reports |
| **Settings** | Pharmacy-specific configuration and printing options |

Active tab is tracked via the URL query param `?tab=`. Switching tabs clears the `mode` and `ref` params automatically.

---

## Tab 1: Retail (POS)

The POS has two modes: **Walk-in Sale** and **Prescription Sale**.

### Mode A: Walk-in Sale (General / OTC)

1. Use the **medicine search bar** (by name, barcode, or SKU) to find items.
2. Click on a result to **add it to the cart**.
3. Set quantity (in whole units or sub-units, e.g. tablets within a strip).
4. Apply a **line-level discount** (in %) if needed.
5. Choose payment method: `CASH`, `CARD`, `MOBILE`, `INSURANCE`, or `SPLIT`.
6. Click **Complete Sale** to finalize and print a receipt.

**Key stock behaviours:**
- If `is_out_of_stock` or `insufficient_stock`, the item shows an availability warning.
- An **override** option is available for special cases (e.g., "Patient purchased from another store") — requires a reason code.
- Sub-unit sales (e.g., individual tablets) are supported if `allow_sub_unit_sale` is enabled.

### Mode B: Prescription Sale (Doctor-linked)

This mode is triggered when a patient's prescription is forwarded from the Doctor module.

**Step-by-step:**
1. Search for the **patient by name, CNIC, or contact**.
2. Select the **active visit** from the dropdown (shows doctor name, visit type, and pending prescriptions).
3. The system auto-populates the cart with **all prescribed medicines** from that visit's prescription.
4. Each item shows:
   - `Prescribed Qty` and `Already Dispensed Qty` (for partial dispensing scenarios).
   - `Availability Status` (available, low_stock, out_of_stock, insufficient_stock).
5. Review, adjust if needed, then complete payment.
6. Settlement can be:
   - **Collect Now** (invoice paid at the pharmacy counter), or
   - **Append to Bill** (charges are added to the OPD bill for later settlement at cashier).

> **Clinical Integration Note:** The prescription data is pulled directly from the doctor's consultation (`/api/pharmacy/prescription-sale`). Any changes the doctor made to the prescription are reflected here in real-time.

### Hold & Resume
- Use the **Hold** button to park a transaction (e.g., when a patient needs to wait or get cash).
- Held transactions appear in a dedicated list and can be resumed at any time.
- Deleted holds are soft-deleted (not permanently removed).

### Hardware Integration
- Cash drawer opening is triggered automatically on cash sale via `/api/hardware/cash-drawer`.
- Receipts can be printed (thermal printer) or emailed to the patient.

---

## Tab 2: Purchases

Record a new stock arrival from a supplier.

**Workflow:**
1. Select the **Supplier (Party)** from the dropdown.
2. Enter the **Invoice/Bill number** from the supplier's paperwork.
3. Add medicines line-by-line:
   - Link to an existing medicine in the Products catalogue.
   - Enter **Batch Number**, **Expiry Date**, **Quantity**, **Purchase Price**, and **Sale Price**.
4. The system shows the **price history** of each medicine (most recent batch cost) to help with pricing decisions.
5. Click **Submit Purchase** to post the stock to inventory.

Each purchase creates a new batch entry in the inventory. The system auto-generates an internal batch code for traceability.

---

## Tab 3: Transactions

A searchable, filterable log of all completed, held, and return transactions.

- Shows: Sale Date, Patient Name (if linked), Reference Number, Total Amount.
- Supports **Edit** mode for correcting a past sale.
- Supports initiating a **Return** against a past completed sale.

---

## Tab 4: Parties (Suppliers)

Manage the list of vendors/suppliers used for purchasing stock.

- Add new parties with contact details and address.
- Parties are referenced when creating Purchase entries.

---

## Tab 5: Purchase Return

Return damaged, incorrect, or expired stock back to a supplier.

**Workflow:**
1. Select the **original Purchase Invoice** from the supplier.
2. Mark which items (and quantities) are being returned.
3. Submit — the system records a debit note and adjusts inventory.

---

## Tab 6: Products (Medicine Catalogue)

The master database of all medicine SKUs.

**Fields per product:**
- Brand Name, Generic Name
- Dosage (value + unit, e.g., `500 mg`)
- Form (tablet, syrup, injection, etc.)
- Category: `prescription`, `OTC`, or `controlled`
- Barcode (for scanner-based POS lookup)
- Sub-unit info (e.g., 1 strip = 10 tablets)
- Minimum stock level (triggers low-stock alerts)

> New products must be added here *before* they can be purchased or sold.

---

## Tab 7: Reports

Generates operational reports:
- **Stock Report**: Current quantity per medicine (with low-stock and out-of-stock highlights).
- **Financial Summary**: Daily/monthly sales and purchase totals.
- Reports can be filtered by date range and exported.

---

## Tab 8: Settings

Configure pharmacy-specific preferences:
- Default printer selection for receipts.
- POS display settings (saved to local storage via `posSettingsStorage`).
- Tax and discount policy settings.

---

## Common Workflows

### How to process a doctor's prescription end-to-end
1. Doctor finalises consultation and prescribes medicines in the Doctor module.
2. Reception or cashier routes the patient to the pharmacy.
3. Pharmacist opens **Retail → Prescription Sale mode**, searches patient, loads visit.
4. Cart auto-fills with prescribed items and their availability status.
5. Pharmacist dispenses available items, marks overrides for unavailable ones with a reason.
6. Payment is collected or appended to bill.
7. Visit's workflow status is updated to reflect completion (`/api/visit/status`).

### How to restock a medicine
1. Go to **Purchases** tab.
2. Select supplier → fill in batch details → set quantities and pricing.
3. Submit — stock immediately increases in the system.
4. Go to **Products** to verify the stock level or adjust minimum stock threshold.
