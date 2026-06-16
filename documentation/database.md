# Database (Deep)

This complements [`/DATABASE.md`](../DATABASE.md) at the repo root. Read that first for the headline counts and module groupings. Everything below assumes you also have access to [`/database/snapshot/`](../database/snapshot/), which is the auto-generated source of truth.

## Conventions

- Schema: `public` only. No `auth` / `storage` / Supabase-internal schemas are read by app code.
- Primary keys: integer surrogate keys (`xxx_id`) on legacy tables; UUID v4 (`xxx_id uuid`) on newer modules (`audit_logs`, `staff_attendance`, `doctor_attendance`, `staff_security_sessions`, employee lifecycle tables).
- Timestamps: `timestamptz` on newer tables (post 2026-03-25 timezone migration); some legacy tables are still `timestamp without time zone`.
- Soft delete is **not** used — destructive ops use real DELETE, with audit rows or trigger journals for reconstruction.
- JSONB: used selectively for `policy_snapshot`, `metadata`, `details`, `staff_tags`, audit `details`.

## Module-by-module reference

For each table the live `database/snapshot/tables.md` is the authoritative column list. The summaries below highlight notable shape / constraints / behavior.

### 1. Patient & visit

| Table | Notes |
|---|---|
| `patient` | `gender` CHECK in `Male`/`Female`/`Other`. Includes demographic + contact fields. |
| `visit` | `visit_type` CHECK in `OPD`/`Emergency`; `status` CHECK in 8 values; `clinic_number` is per-day per-visit-type via `get_clinic_number(p_visit_type)`. |
| `visit_status_history` | Append-only audit of status transitions. Inserted by `update_and_log_visit_status` procedure. |
| `patient_vitals` | `visit_id` UNIQUE. `blood_group` CHECK against ABO/Rh. |
| `menstrual_history` | Per-patient. |
| `obstetric_history` | `patient_id` UNIQUE. |
| `para_details` | Multi-row per patient; includes `birth_month`, `alive`, `notes`, `gestational_age_weeks`. |
| `current_pregnancy` | `visit_id` UNIQUE — one record per visit. |

### 2. Staff & doctor identity

| Table | Notes |
|---|---|
| `doctor` | `user_code` UNIQUE (`DOCNNN`); auth columns: `password` (scrypt or legacy), `failed_login_attempts`, `account_locked_until`, `last_login_at`, `password_changed_at`, `password_reset_token`, `password_reset_expires_at`, `mfa_enabled`, `session_version`. |
| `staff` | `user_code` UNIQUE (`STFNNN`). Same auth columns as `doctor`, plus extensive HR profile: gender, DOB, emergency contact, address fields, `national_id`, `license_id`, `department`, `designation`, `employment_type`, `facility_code`, `branch_code`, `work_location`, `reporting_manager_staff_id`, `staff_tags` (jsonb). |

### 3. Auth, sessions, RBAC

| Table | Notes |
|---|---|
| `doctor_security_sessions` | One row per active login. `revoked_at` / `revoked_reason` for forced logout. |
| `staff_security_sessions` | Same shape, for staff. |
| `staff_roles` | 12 active roles. |
| `staff_role_assignments` | Many-to-many staff ↔ role. |
| `staff_permissions` | Currently empty (legacy). |
| `staff_permission_policies` | 84 rows; RBAC v2 effective policy. |
| `staff_permission_audit` | 84 rows; change history. |

### 4. Attendance & roster

| Table | Notes |
|---|---|
| `staff_attendance` | UUID PK. `policy_snapshot` jsonb (`timezone`, `grace_minutes`, `half_day_minutes`, `overtime_minutes`, `early_leave_minutes`). `derived_status` (`unscheduled` / `late` / …). `is_unscheduled`, `is_on_time`. `check_in_source` / `check_out_source` enumerate self / Admin / System Trigger. |
| `doctor_attendance` | Same shape, for doctors. |
| `staff_shift_templates` | Reusable shift definitions. |
| `staff_roster_assignments` | 1,332 rows. Date-keyed roster assignment. Drives `derived_status` in attendance. |
| `attendance_regularization_requests` | Manual correction queue. |

### 5. Leave management

| Table | Notes |
|---|---|
| `staff_leave_types` | 6 rows (annual, sick, casual, etc.). |
| `leave_role_quota` | 72 rows = (role × leave_type) annual quotas. |
| `leave_employee_quota_override` | Per-employee overrides. |
| `staff_leave_balances` | Running balance. |
| `staff_leave_requests` | Request rows; includes `account_type` (`doctor`/`staff`), `person_id`, `doctor_id`. |
| `staff_leave_approvals` | Approval chain. |

### 6. Clinical: prescriptions, encounters, labs

| Table | Notes |
|---|---|
| `prescription` | Visit-bound. |
| `prescription_medicines` | Detail rows. |
| `prescription_fulfillment_action` | Dispense / partial / cancel actions. |
| `doctor_encounter_note` | Per-visit free-text note + reception complaint. |
| `lab_test` | Master list of tests with category + price. |
| `lab_test_parameters` | Per-test parameter definitions with `input_type` (`number`/`text`/`reference`), reference ranges, `is_critical`, `is_required`. |
| `lab_order` | `status` CHECK in `Pending`/`Performed`/`Completed`; `urgency` CHECK in `STAT`/`Urgent`/`Routine`/`Timed`. |
| `lab_test_results`, `lab_result` | Result data. |
| `lab_result_approvals` | Verification / approval audit. |

### 7. Pharmacy & inventory

#### Catalog

| Table | Notes |
|---|---|
| `medicine` | `generic_name`, `brand_name`, `category`, `dosage_value`, `dosage_unit`, `form`, `manufacturer`, `barcode`, `sku`, `min_stock_level`, `max_stock_level`, `is_active`, `requires_prescription`, `search_vector` (tsvector). Sub-unit fields: `sub_unit`, `sub_units_per_unit`, `sub_unit_price`, `allow_sub_unit_sale`. FK refs: `category_id`, `manufacturer_id`, `form_id`. |
| `medicine_batch` | Per-batch row with `stock_quantity`, `stock_sub_quantity`, `purchase_price`, `purchase_sub_unit_price`, `sale_price`, `sale_sub_unit_price`, `expiry_date`, `batch_number`, `batch_code` (`BATCH-NNNNNNNN`). |
| `medicine_category`, `medicine_form`, `medicine_manufacturer` | Active masters. |

#### Movement

| Table | Notes |
|---|---|
| `medicine_transaction` | The append-only journal. `txn_type` CHECK in `purchase`/`sale`/`purchase_return`/`sale_return`/`adjustment`. References either `ref_purchase_id`, `ref_sale_id`, `ref_purchase_return`, or `ref_sale_return`. |
| `medicine_purchase`, `medicine_purchase_detail` | Purchase header + lines. |
| `purchase_return`, `purchase_return_detail` | Vendor returns. |
| `pharmacy_sale`, `pharmacy_sale_detail` | Retail sale. `visit_id` is **nullable** (OTC). |
| `sale_return`, `sale_return_detail` | Customer returns. |

#### Counterparties

| Table | Notes |
|---|---|
| `party` | Suppliers. |
| `party_payment` | Payments to suppliers. |
| `pharmacy_customer` | Retail customer profile (optional, often blank for cash sales). |

### 8. POS & billing

| Table | Notes |
|---|---|
| `bill`, `bill_item` | Patient bills. |
| `bill_charge_source` | What contributed to a bill (visit, lab, pharmacy). |
| `bill_pharmacy_sale` | Bill ↔ pharmacy_sale linkage for visit-bound sales. |
| `pos_session` | Cashier POS session (currently 1 row). |
| `pos_receipt_config` | Receipt header/footer / printer config. |
| `pos_held_transaction`, `pos_held_transaction_detail` | Held-cart support. |
| `pos_audit_log` | 195 rows. `SALE_COMPLETED`, `RECEIPT_PRINTED`, `CASH_DRAWER_OPENED`, etc. |

### 9. Cashier settlement

| Table | Notes |
|---|---|
| `cashier_shift` | Open / close pair per cashier. |
| `cashier_payment_txn` | `txn_type` in `payment`/`reversal`. |
| `cashier_payment_allocation` | Splits one payment across one or more bills. |
| `cashier_settlement_draft` | Staged settlement before commit. |
| `cashier_audit_event` | Stream of `draft_created` / `draft_cancelled` / `draft_applied` / `settle_success` / `reversal_success` / `correction_success`. |
| `cashier_idempotency` | Request idempotency keys. |

### 10. Workforce finance / payroll

| Table | Notes |
|---|---|
| `payroll_run` | Per-cycle payroll run; 2 rows in live data. |
| `payroll_line_item` | 24 rows. Per-employee payroll line. |
| `employee_compensation_profile` | `salary_model` (`fixed_monthly` / per-patient), `payroll_cycle`, `base_monthly_salary`, `per_patient_fee`, active period (`active_from` / `active_to`). |
| `employee_allowance` | Allowances per employee. |
| `allowance_type_master` | Codes: `transport`, `meal`, `housing`, plus 3 more (6 total). `taxable` flag. |
| `finance_expense_category` | Codes: `utilities`, `inventory`, `maintenance`, plus 4 more (7 total). |
| `finance_expense_entry` | Recorded expenses. |
| `finance_asset_purchase` | Asset acquisitions. |

### 11. Employee lifecycle / documents / credentials

| Table | Notes |
|---|---|
| `employee_lifecycle_templates` | 2 rows (`ONBOARD_STD`, `OFFBOARD_STD`). |
| `employee_lifecycle_template_tasks` | 6 default tasks (`CREATE_ACCOUNT`, `COLLECT_DOCS`, `VERIFY_CREDENTIALS`, …). |
| `employee_lifecycle_runs`, `employee_lifecycle_tasks`, `employee_lifecycle_events` | Runtime instances + per-employee task state + event log. |
| `employee_credential_types` | 4 rows (`MED_LICENSE`, `BLS`, `ACLS`, plus 1). |
| `employee_credentials` | Per-employee credential records. |
| `employee_credential_events` | Issued / expiring / renewed events. |
| `employee_document_types` | 4 rows (`ID_PROOF`, `CONTRACT`, `LICENSE_COPY`, plus 1). |
| `employee_documents`, `employee_document_versions`, `employee_document_reviews`, `employee_document_requirements` | Document store with versioning + review workflow. |

### 12. System

| Table | Notes |
|---|---|
| `audit_logs` | 148 rows. UUID PK, `staff_id`, `action`, `entity_type`, `entity_id`, `details` jsonb, `ip_address`, `created_at`. |
| `system_settings` | 11 rows. KV-style. Hosts the system timezone among other things. |

## Stock trigger chain in detail

```
[INSERT|UPDATE|DELETE on detail table]
   │
   ▼
fn_tg_*_detail_to_txn()   ←──── mirrors the row into medicine_transaction
   │
   ▼
[INSERT|UPDATE|DELETE on medicine_transaction]
   │
   ▼
fn_tg_stockquantity_generic()
   │── reads sub_units_per_unit from medicine
   │── computes signed delta in sub-units
   │       txn_type IN ('purchase','sale_return')      → +
   │       txn_type IN ('sale','purchase_return')      → −
   │       txn_type = 'adjustment'                     → +
   │
   ▼
medicine_batch.stock_quantity  +=  delta_units
medicine_batch.stock_sub_quantity += delta_sub_units
```

Delete and update branches reverse the original delta first. UPDATEs that change `batch_id` first reverse on the old batch, then apply on the new one.

## Visit-status procedure

```sql
CALL update_and_log_visit_status(
  p_visit_id := 123,
  p_status := 'medicines_dispensed',
  p_updated_by_doctor := NULL,
  p_updated_by_staff := 5
);
```

The procedure updates `visit.status` and inserts into `visit_status_history` atomically. Use it from server helpers (`src/lib/server/visitLifecycle.ts`).

## Sequences

- `batch_seq` → `generate_batch_code()` → `BATCH-NNNNNNNN`
- `invoice_seq` → `generate_invoice_no()` → `INV-NNNNNN`

## Read paths to know

- **POS search / cart row** → `v_medicine_pos` (already filtered to active medicines and non-expired batches)
- **Low-stock dashboard** → `v_low_stock_medicines`
- **Daily KPI** → `v_daily_sales_summary`
- **Admin cash ledger** → `admin_cash_collected_ledger_v1`

Reading direct from `medicine` + `medicine_batch` for POS is discouraged because the view computes the sub-unit math and stock flags.

## Indexes worth knowing

See [`/database/snapshot/indexes.md`](../database/snapshot/indexes.md) for the full list. Highlights:

- `medicine.search_vector` — GIN index for `tsvector` full-text search
- `audit_logs(created_at)` — exists; backs `cleanup_old_audit_logs(p_days)` and time-range filters
- Per-table PK indexes are default; no per-table compound indexes deserve memorization

## Migration history

[`/database/migrations/`](../database/migrations/) holds the chronological SQL files (dated, e.g. `2026_03_25_global_system_timezone.sql`). The latest Supabase-tracked migration is `20260303185544_fix_sale_return_detail_trigger`. Subsequent files in the folder have been hand-applied — there is **no auto-migrator**.

When adding a migration:

1. Write a new SQL file dated today in `database/migrations/`.
2. Apply it to the live Supabase project (psql or Supabase SQL editor).
3. Refresh the snapshot: `node --env-file=.env.local scripts/introspect-db.mjs`.
4. Update this file if the change introduces a whole new module.
