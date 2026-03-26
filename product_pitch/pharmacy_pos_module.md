# Pharmacy & POS Module

The Pharmacy module is a high-volume retail and clinical dispensing engine designed for speed, accuracy, and inventory integrity.

## 1. Retail POS & Session Management
Designed after modern retail systems, the Pharmacy POS supports both walk-in customers and hospital-linked prescriptions.

- **Unified Checkout**: Integrated search for medicines by Name, SKU, or Barcode (Hardware Support).
- **Session Continuity**: 
  - **Hold Transactions**: Ability to "park" a cart (e.g., if a patient needs to check for funds) and retrieve it later.
  - **Context-Aware Sales**: Automatically pulls patient prescriptions from the clinical queue to prevent manual entry errors.
- **Hardware Integration**: Out-of-the-box support for receipt printers and electronic cash drawers.

## 2. Advanced Inventory & Batch Tracking
HMS maintains a strict "First-In-First-Out" (FIFO) or "First-Expire-First-Out" (FEFO) logic through granular batch management.

- **Batch-Level Granularity**: Track `Expiry Date`, `Batch Number`, and `Unit Price` per purchase lot.
- **Unit Conversion**: Automatic conversion between large packs (Boxes) and sub-units (Strips/Tablets) for accurate dispensing.
- **Procurement Workflow**:
  - `Purchase`: Intake of new stock with cost price tracking.
  - `Return`: Formalized vendor or patient return system with stock re-integration or disposal logging.

## 3. The Clinical Link (Prescription Sales)
The Pharmacy module is tightly coupled with the Doctor module to ensure a closed-loop medication cycle.

- **Visit Linking**: Sales are tagged with the active `Visit ID`, enabling comprehensive patient financial history.
- **Workflow Status Sync**: Advancing a sale automatically updates the patient's status in the clinical queue (e.g., from `Prescribed` to `Completed`).
- **Real-Time Stock Validation**: Automatic "Low Stock" and "Expiry" warnings during the dispensing process.

## 4. Financial Controls
- **Automated Ledger**: Every sale, return, and purchase is entered into a localized pharmacy ledger.
- **Valuation Reporting**: Instant reporting on total pharmacy asset value and high-moving vs. dead stock analysis.

---
*Implementation Highlight: The Pharmacy module utilizes a specialized "Retail Storage" hook to manage ephemeral cart states and ensure no data loss during browser refreshes.*
