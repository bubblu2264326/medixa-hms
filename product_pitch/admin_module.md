# Admin & Governance Module

The Admin module serves as the hospital's backbone, managing human resources, financial oversight, and system-wide security auditing through an immutable ledger.

## 1. Staff & HR Management
The HMS implements a granular Role-Based Access Control (RBAC) system with automated onboarding workflows.

- **Role Taxonomy**: Support for `Doctor`, `Nurse`, `Cashier`, `Pharmacist`, `Lab Technician`, and `Admin`.
- **Smart Prefixing**: Automatic generation of unique staff IDs based on role (e.g., `DOC-001`, `NRS-005`, `ADM-010`).
- **Identity Management**: 
  - Auto-generated slugified email addresses.
  - Secure credential management with manual password resets.
  - Real-time directory with activity status tracking.

## 2. Payroll & Financial Governance
A sophisticated financial engine handles internal hospital payouts and high-level expenditure approvals.

- **Hybrid Salary Models**:
  - **Fixed Monthly**: Standard base pay for administrative and nursing staff.
  - **Per-Patient-Seen**: Performance-based commission model specifically for clinical staff (Doctors).
- **Payroll Workflow**: 
  - `Draft`: Initial calculation based on attendance and patient logs.
  - `Review`: Managerial audit of calculated amounts.
  - `Finalize`: Disbursement state (locked for record-keeping).
- **Approvals Engine**: A unified queue for `Leave Requests` and `Attendance Corrections` with audit-trailed decision making.

## 3. Inventory & Procurement Monitoring
While clinical inventory is handled in Pharmacy, the Admin module provides the "Fiscal Source of Truth" for stock.

- **Valuation Analytics**: Real-time calculation of total inventory value across all categories.
- **Expiry Watchlist**: Automated 90-day alert system for batch-level pharmacy stock.
- **Critical Restock Engine**: Visual alerts for items falling below role-defined safety thresholds.

## 4. Audit & Security (The Immutable Ledger)
The system maintains a high-integrity audit trail to ensure accountability and prevent fraud.

- **Real-time SSE Streams**: All administrative and cashier actions are broadcasted via Server-Sent Events (SSE) to live monitoring dashboards.
- **Atomic Logging**: Captures `timestamp`, `actor`, `action`, `resource`, and `result` for every state change.
- **Traceability**: Direct linking of audit logs to specific patient encounters or financial transactions.

---
*Architecture Note: The Admin module uses a monolithic state-managed approach for directory management and SSE (Server-Sent Events) for real-time audit streaming.*
