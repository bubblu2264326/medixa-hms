# Feature Deep-Dive: Execution Traces

This complements [`functionality-map.md`](./functionality-map.md) (the surface-level map) by tracing each major business flow end-to-end — client trigger → API → server helper → DB → triggers → response — including edge cases handled and *not* handled, cross-module side-effects, and audit coverage. Verified against the live tree on 2026-05-23.

Each flow is labelled A–S; reference them by letter from other docs (e.g. issue B7 affects Flow J).

---

## Flow A — Patient registration + visit creation

**User-visible trigger:** Receptionist submits "New Patient" form, then clicks "Create Visit".

**Execution trace:**

1. Patient submit → `POST /api/patient` ([`src/app/api/patient/route.ts`](../src/app/api/patient/route.ts)). **No auth check.** Raw `INSERT INTO patient(...)` returning `patient_id`. **No `logAuditEvent`.**
2. Receptionist fetches clinic number → `GET /api/patient/getNewClinicNo?visitType=OPD` → calls `SELECT get_clinic_number($1)`. The DB function reads `max(clinic_number)` then returns `max+1`. **Non-atomic** — two simultaneous calls return the same number, producing duplicate `clinic_number` rows within a day.
3. Visit submit → `POST /api/visit` ([`src/app/api/visit/route.ts:49`](../src/app/api/visit/route.ts#L49)). **No auth check.** Duplicate-visit guard queries `visit WHERE patient_id=$1 AND visit_timestamp in today AND status = ANY($2::text[]) AND is_deleted=false` (blocking statuses = `['waiting','dispensing']`).
4. Two separate un-transacted writes: `INSERT INTO visit(...)` then `INSERT INTO bill(...)`. A crash between them leaves a visit with no bill.
5. `publishQueueInvalidation("visit-created")` broadcasts SSE to all doctor-queue subscribers.

**Tables:** `patient`, `visit`, `bill`
**Audit:** None for patient or visit creation. SSE fires.
**Gaps:** No auth on POST `/api/patient` or POST `/api/visit`; clinic number race; bill insert outside transaction.

---

## Flow B — Doctor encounter → prescription

**User-visible trigger:** Doctor opens queue, picks patient, edits encounter note, submits prescription.

**Execution trace:**

1. Queue load → `GET /api/doctor/queue` (auth: `getAuthenticatedDoctor` in [`src/lib/server/doctor.ts`](../src/lib/server/doctor.ts)). SSE subscribe → `GET /api/doctor/queue/stream`.
2. Patient context → `GET /api/doctor/visit/[visitId]` → calls `getDoctorVisitContext` ([`src/lib/server/doctorWorkspace.ts:176`](../src/lib/server/doctorWorkspace.ts#L176)). Issues 4 parallel queries (patient, encounter note, vitals, payment snapshot) plus up to 3 gynaecology queries for female patients.
3. Encounter note save → `PUT /api/doctor/encounter/[visitId]`. `INSERT ... ON CONFLICT (visit_id) DO UPDATE` into `doctor_encounter_note`.
4. Prescription submit → `POST /api/doctor/prescriptions` (auth ✓, full `BEGIN/COMMIT`):
   - `SELECT ... FROM visit ... FOR UPDATE` to lock.
   - `ensureDoctorVisitWriteAccess` blocks if status is in `HARD_LOCK_VISIT_STATUSES` (`completed`/`discharged`).
   - Thread logic: if status is `lab_tests_done` / `payment_done`, insert new `prescription` header; otherwise append to latest.
   - For each medicine, queries `v_medicine_pos` for live stock snapshot. Inserts `prescription_medicines(... availability_status, availability_note)`.
   - `COMMIT`.
5. Mark seen → `POST /api/doctor/visit/[visitId]/status` (auth ✓, `BEGIN/COMMIT`). Only `seen_by_doctor`, `waiting`, `discharged` allowed. Calls `CALL update_and_log_visit_status(visitId, 'seen_by_doctor', doctorId, null)`. Publishes `publishQueueInvalidation("doctor-visit-status-updated")`.

**Tables:** `doctor_encounter_note`, `prescription`, `prescription_medicines`, `v_medicine_pos` (read), `visit`, `visit_status_history`
**Audit:** No `logAuditEvent` on prescription. Status changes go through the stored procedure → `visit_status_history`.
**Gaps:** No re-verification that the doctor owns the visit *after* locking (only the initial `resolveDoctorVisit` filters by `doctor_id`).

---

## Flow C — Lab order → result entry

**User-visible trigger:** Doctor orders labs; lab tech opens the result entry form.

**Execution trace:**

1. Order creation → `POST /api/doctor/lab-orders` (auth ✓, `BEGIN/COMMIT`). `resolveDoctorVisit` with `lock:true`. `ensureDoctorLabOrderWriteAccess` blocks `completed`/`discharged`. Inserts one row per test into `lab_order(visit_id, test_id, ordered_by=doctor_id, status='Pending', urgency)`.
2. Pending orders → `GET /api/lab/order`. **No auth.** Queries `lab_order JOIN lab_test JOIN doctor JOIN staff`.
3. Parameter load → `GET /api/lab/testParameters/[test_id]`. **No auth.**
4. **🚨 Result entry is broken:** `saveTestResults` in [`src/features/laboratory/labResult/hooks/useLabResults.ts:71`](../src/features/laboratory/labResult/hooks/useLabResults.ts#L71) is an **empty stub**. No API call is made. **No route in the codebase writes to `lab_result` or `lab_test_results`** — entire result-submission path is missing.
5. A second older POST at [`src/app/api/lab/route.ts:26`](../src/app/api/lab/route.ts#L26) does a self-referencing `fetch('http://localhost:3000/api/visit/...')` — **hardcoded localhost**, will fail in production.

**Tables:** `lab_order`, `lab_test`, `lab_test_parameters` (read-only — results never written)
**Audit:** None.
**Gaps:** Result submission is unimplemented. `lab_tests_done` visit status can't be set through legitimate lab flow. Production-broken self-fetch.

---

## Flow D — Pharmacy POS sale (visit-linked)

**User-visible trigger:** Pharmacist looks up patient visit, clicks "Process Sale".

**Execution trace:**

1. Patient/prescription lookup → `GET /api/pharmacy/prescription-sale?patientId=X&visitId=Y` ([`src/app/api/pharmacy/prescription-sale/route.ts:12`](../src/app/api/pharmacy/prescription-sale/route.ts#L12)). **No auth.** Lateral join to `v_medicine_pos` picks earliest-expiring non-empty batch (FEFO).
2. Checkout → `POST /api/transactions` ([`src/app/api/transactions/route.ts:124`](../src/app/api/transactions/route.ts#L124)). Auth via `getAuthenticatedUser` (rejects Doctor role). `BEGIN/COMMIT`.
   - Resolves `bill_id` from `bill WHERE visit_id=$1`.
   - FEFO: `allocateInventoryForSale` from `stockValidation.ts`.
   - Inserts `pharmacy_sale` header (`settlement_channel='cashier'`, `settlement_status='pending'`, `due_amount=payable`, `paid_amount=0`).
   - Inserts each `pharmacy_sale_detail`.
3. **Trigger chain:**
   - `tg_sale_detail_to_txn` (AFTER INSERT) → `fn_tg_sale_detail_to_txn()` → inserts `medicine_transaction(txn_type='sale', ref_sale_id, batch_id, …)`.
   - `tg_stockquantity_generic` (AFTER INSERT on `medicine_transaction`) → `fn_tg_stockquantity_generic()` → `v_sign=-1`. Converts to sub-units. `UPDATE medicine_batch SET stock_quantity=…, stock_sub_quantity=… WHERE batch_id=NEW.batch_id`.
4. If `isAppendToBill`: inserts `bill_pharmacy_sale (ON CONFLICT DO NOTHING)`, updates `bill.total_amount`, inserts `bill_item`, `bill_charge_source`.
5. Updates `prescription_medicines.dispensed_quantity`, `dispensed_by`, `dispensed_at`.
6. Transitions visit → `CALL update_and_log_visit_status(visitId, 'medicines_dispensed', null, staffId)`.
7. Inserts `pos_audit_log(action_type='SALE_COMPLETED' or 'SALE_APPENDED_TO_BILL')`. `COMMIT`.
8. **No `publishQueueInvalidation`** after dispense — doctor's queue can stale.

**Tables:** `pharmacy_sale`, `pharmacy_sale_detail`, `medicine_transaction` (trigger), `medicine_batch` (trigger), `prescription_medicines`, `bill`, `bill_pharmacy_sale`, `bill_item`, `bill_charge_source`, `visit`, `visit_status_history`, `pos_audit_log`
**Audit:** `pos_audit_log` only. No `audit_logs` entry.
**Gaps:** SSE not invalidated post-dispense; no `audit_logs` event.

---

## Flow E — Pharmacy POS sale (OTC, visit_id null)

Same `POST /api/transactions` handler. When `visitId` is null and `prescriptionId` is null: `settlementMode='collect_now'`, `pharmacy_sale.visit_id=null`, `bill_id=null`, `settlement_channel='pharmacy'`, `settlement_status='settled'`, `settled_at=now()`. No `bill_pharmacy_sale` row. Trigger chain identical → decrements `medicine_batch`.

**Gap:** If auth resolution falls back, `getCurrentStaffId()=1` is used; `created_by` becomes wrong.

---

## Flow F — Sale return

**User-visible trigger:** Pharmacist selects sale from history, processes return.

**Execution trace:**

1. `POST /api/transactions/return` ([`src/app/api/transactions/return/route.ts:6`](../src/app/api/transactions/return/route.ts#L6)). **No auth check** (uses `getCurrentStaffId()=1`). `BEGIN/COMMIT`.
2. Checks cumulative returned quantities; if fully returned, updates `pharmacy_sale.status='Returned'`.
3. Inserts `sale_return` + `sale_return_detail`.
4. **Trigger chain:** `tg_sale_return_detail_to_txn` → `fn_tg_sale_return_detail_to_txn()` → `medicine_transaction(txn_type='sale_return', …)`. `tg_stockquantity_generic` → `v_sign=+1` → stock incremented in `medicine_batch`.
5. Inserts `pos_audit_log(action_type='SALE_RETURNED')`.

**Gaps:** No auth. No `logAuditEvent`. **Returns do not reverse `visit.status` from `medicines_dispensed`**. **No check** prevents returning more than originally sold (DB allows over-return; stock goes positive past original).

---

## Flow G — Pharmacy purchase intake

**User-visible trigger:** Pharmacist fills purchase form.

**Execution trace:**

1. `POST /api/pharmacy/purchase` ([`src/app/api/pharmacy/purchase/route.ts:6`](../src/app/api/pharmacy/purchase/route.ts#L6)). **No auth** (uses `getCurrentStaffId()=1`). `BEGIN/COMMIT`.
2. Inserts `medicine_purchase(party_id, invoice_no, total_amount, …)`. `invoice_no` from `generate_invoice_no()` (`INV-NNNNNN`).
3. For each item: looks up existing `medicine_batch` by `(medicine_id, batch_number, party_id)`.
   - If exists: validates price/expiry match within 0.01 tolerance; mismatch → `BATCH_MISMATCH` (HTTP 400).
   - If new: inserts `medicine_batch(… stock_quantity=0, batch_code=generate_batch_code())`. Handles unique-constraint race via retry.
4. Inserts `medicine_purchase_detail`.
5. **Trigger chain:** `tg_purchase_detail_to_txn` → `medicine_transaction(txn_type='purchase', …)`. `tg_stockquantity_generic` → `v_sign=+1` → stock incremented.
6. Inserts `pos_audit_log(action_type='PURCHASE_CREATED')`.

**Gaps:** No auth. `getCurrentStaffId()` stub. No `logAuditEvent`.

**Bonus bug — purchase return:** [`src/app/api/pharmacy/purchase/return/route.ts`](../src/app/api/pharmacy/purchase/return/route.ts) calls `BEGIN` / `ROLLBACK` on the module-level `query` export rather than a pooled client. **Different connections** — the rollback runs on a different connection from the begin. **Broken transaction.**

---

## Flow H — Cashier settlement

**User-visible trigger:** Cashier finds bill on worklist, clicks "Settle".

**Execution trace:**

1. Worklist load → `GET /api/cashier/worklist` ([`src/app/api/cashier/worklist/route.ts:7`](../src/app/api/cashier/worklist/route.ts#L7)). Auth via `requireCashierOrAdmin`. Large CTE: `bill JOIN patient JOIN visit JOIN cashier_payment_txn`. Computes `paid_amount`, `due_amount`, `overdue_days`, `due_score`.
2. Settle → `POST /api/cashier/settle` ([`src/app/api/cashier/settle/route.ts:33`](../src/app/api/cashier/settle/route.ts#L33)). Auth ✓. Requires `Idempotency-Key` header. `BEGIN/COMMIT`.
   - Locks bill `FOR UPDATE`.
   - Checks `cashier_idempotency`.
   - Validates `amount <= outstandingBefore` (rejects overpayment).
   - Inserts `cashier_payment_txn(txn_type='payment', payment_type, payment_reference, …)`.
   - Generates `receipt_no = CPT-{dateStamp}-{txnId}`.
   - Iterates `bill_pharmacy_sale` rows (ordered by `created_at`) and allocates: `min(remaining, mappingOpen, saleDue)`. Inserts `cashier_payment_allocation`. Updates `bill_pharmacy_sale.settled_amount` + `settlement_status`. Updates `pharmacy_sale.paid_amount`, `due_amount`, `settlement_status`.
   - Derives `payment_status` via `deriveBillPaymentStatus(total, paid)` → `"Unpaid"/"Partial"/"Paid"`.
   - Updates `bill.payment_status`.
   - If `dueAfter <= 0 && visitId`: calls `CALL update_and_log_visit_status(visitId, 'payment_done', null, staffId)` in a try/catch — warns on failure but does **not** roll back.
   - Inserts `cashier_idempotency` row.
   - Inserts `cashier_audit_event(event_type='settle_success', before_json, after_json)`.
   - Calls `logAuditEvent` → `audit_logs` insert. Publishes `publishAuditInvalidation`. `COMMIT`.

**Tables:** `bill`, `cashier_payment_txn`, `cashier_payment_allocation`, `bill_pharmacy_sale`, `pharmacy_sale`, `visit`, `visit_status_history`, `cashier_idempotency`, `cashier_audit_event`, `audit_logs`
**Audit:** Both `audit_logs` AND `cashier_audit_event`. ✓
**Gaps:** Visit status transition failure is silenced — bill becomes `Paid` but visit may stay at non-payment status (inconsistent state). No SSE invalidation after `payment_done`.

---

## Flow I — Cashier reversal

**User-visible trigger:** Admin clicks "Reverse" on a payment transaction.

**Execution trace:**

1. `POST /api/cashier/reversal` ([`src/app/api/cashier/reversal/route.ts:22`](../src/app/api/cashier/reversal/route.ts#L22)). Auth via `requireCashierAdminOnlyForReversal` → `requireAdminOrSuperAdmin` only. `BEGIN/COMMIT`.
2. Locks original `cashier_payment_txn FOR UPDATE`. Verifies `txn_type='payment'`. Blocks if an existing reversal row exists (`reversed_from_txn_id=$1 AND txn_type='reversal'`).
3. Inserts reversal row (`amount=-|originalAmount|`, `txn_type='reversal'`, `reversed_from_txn_id`, `reversal_reason_code`, `payment_type='CASH'`).
4. Generates `reversalReceiptNo = CRV-{dateStamp}-{reversalTxnId}`.
5. For each original allocation: decrements `bill_pharmacy_sale.settled_amount` (reset `settlement_status` to `pending` if zero). Decrements `pharmacy_sale.paid_amount`, increments `due_amount`, resets `settlement_status`.
6. Recalculates bill total paid, derives new `payment_status`, updates `bill.payment_status`.
7. Inserts `cashier_audit_event(event_type='reversal_success')`. Calls `logAuditEvent`. `COMMIT`.

**Gaps:**
- **Visit status NOT reverted from `payment_done`** after reversal. Bill goes to Unpaid but visit lingers at payment_done — incorrect downstream business logic.
- No `publishQueueInvalidation`.
- No check that allocation amounts sum correctly after reversal for partial-payment scenarios.

---

## Flow J — Login

**User-visible trigger:** User enters user_code + password.

**Execution trace:**

1. `POST /api/login` ([`src/app/api/login/route.ts:21`](../src/app/api/login/route.ts#L21)). Pooled client held for full request.
2. Dispatches on user_code: `includes("DOC")` → doctor table; else → staff. **Fragile** — a staff code containing `DOC` routes to wrong table.
3. Queries user; 401 on missing.
4. Checks `account_locked_until`: future → 423.
5. Checks `employment_status !== 'active'` → 403.
6. `verifyPassword`: if stored starts with `scrypt$` → `scryptSync` + `timingSafeEqual`; else plaintext comparison.
7. On failure: increments `failed_login_attempts`; ≥ 5 → `account_locked_until = now() + 15 min`.
8. On success: inserts `*_security_sessions` returning `session_id`. Resets failed_attempts. Auto-upgrades plaintext password to scrypt.
9. Signs JWT (HS256, 8h, payload `{user_code, role, name, sid, sv, account_type}`). Sets `token` cookie (`httpOnly, secure, sameSite=lax, maxAge=8h`).
10. Calls `logAuditEvent("Login success")`.

**Tables:** `doctor`/`staff`, `doctor_security_sessions`/`staff_security_sessions`, `audit_logs`
**Gaps:** `secure:true` breaks non-HTTPS local dev. No IP-level rate limiting. `includes("DOC")` routing is fragile (Flow J6).

---

## Flow K — Forced logout

**User-visible trigger:** Admin clicks "Force Logout" in Staff Security panel.

**Execution trace:**

1. `POST /api/admin/staff/security` ([`src/app/api/admin/staff/security/route.ts:146`](../src/app/api/admin/staff/security/route.ts#L146)). Auth ✓. Body `{staff_id, account_type, action:'force_logout', reason}`.
2. `UPDATE staff SET session_version = session_version + 1 WHERE staff_id = $1` then `UPDATE staff_security_sessions SET revoked_at=now(), revoked_reason='forced_logout' WHERE staff_id=$1 AND revoked_at IS NULL`.
3. Calls `logAuditEvent("Forced logout")`.

**Enforcement:** Next request hits `getAuthenticatedUser` in [`src/lib/server/auth.ts`](../src/lib/server/auth.ts). That helper:
- Compares DB `session_version` vs JWT `sv` claim → throws on mismatch.
- Resolves `sid` → if row has `revoked_at IS NOT NULL` → throws `AuthError(FORCED_LOGOUT_MESSAGE, 401)`.

The **middleware** ([`src/middleware.ts`](../src/middleware.ts)) does only JWT signature verification, NOT session validation. So forced logout only takes effect when a protected API route handler calls the auth helper — pages may still render.

**Gap:** Page-level reads via the middleware path are still authorized until JWT expiry (8h).

---

## Flow L — Attendance check-in

**User-visible trigger:** Staff taps "Check In".

**Execution trace:**

1. `POST /api/attendance/me/check-in` ([`src/app/api/attendance/me/check-in/route.ts:6`](../src/app/api/attendance/me/check-in/route.ts#L6)). Auth ✓.
2. Calls `markAttendanceByUserCode(...)` ([`src/lib/server/attendance.ts:442`](../src/lib/server/attendance.ts#L442)).
3. `getAttendancePolicy()` reads `system_settings` for grace/half-day/overtime/early-leave minutes, timezone, device API key. Falls back to defaults.
4. `resolveAttendanceSubject(userCode)` — checks `staff` first, then `doctor`.
5. Determines date in policy timezone via `getCurrentDateInTimezone`.
6. Checks existing attendance row for date. If exists → 409.
7. Inserts `staff_attendance(staff_id, date, check_in_time, status='Present', check_in_source='self', …)`.
8. Calls `recomputeAndPersistAttendance(attendanceId, policy, accountType)`:
   - Fetches roster from `staff_roster_assignments JOIN staff_shift_templates`.
   - `evaluateAttendance(...)` → computes `derived_status` (`on_time`/`late`/`half_day`/`early_leave`/`overtime`/`unscheduled`), late/early/overtime minutes.
   - Updates row with derived fields + `policy_snapshot` jsonb.
9. Calls `logAuditEvent("Attendance check-in marked")`.

**Tables:** `system_settings` (read), `staff`/`doctor` (read), `staff_roster_assignments`, `staff_shift_templates`, `staff_attendance`/`doctor_attendance`, `audit_logs`
**Edge cases handled:** Missing roster → `derived_status='unscheduled'`. Night shifts crossing midnight handled by adding 24h to end time.
**Gaps:** No transaction around INSERT + UPDATE — failure mid-flow leaves row with no derived status. Timezone conversion via custom helper rather than Postgres `AT TIME ZONE`.

---

## Flow M — Leave request → approval

**User-visible trigger:** Employee submits leave; admin approves.

**Execution trace:**

1. Submit → `POST /api/employee/me/leave/requests` ([`src/app/api/employee/me/leave/requests/route.ts:56`](../src/app/api/employee/me/leave/requests/route.ts#L56)). Auth ✓. Inserts `staff_leave_requests(account_type, person_id, leave_type_id, from_date, to_date, … request_status='pending')`. Calls `logAuditEvent`.
2. Admin view → `GET /api/admin/staff/v2/approvals?type=leave`. Auth ✓.
3. Admin decision → `PATCH /api/admin/staff/v2/approvals` with `{approval_type:'leave', request_id, decision, note}`. Auth ✓. Updates `staff_leave_requests SET request_status=$decision, final_approver, final_decision_at, decision_note`. Calls `logAuditEvent`.

**🚨 Critical gap:** Approval **does NOT update `staff_leave_balances`**. Balance reads (`/api/employee/me/leave/balance`) show `slb.consumed` which is **never decremented** when a leave is approved. **Leave balance tracking is broken** — approvals have no effect on usable balance.

**Other gaps:** No check for available balance before approving. No duplicate-request guard.

---

## Flow N — Payroll run

**User-visible trigger:** Admin selects month and clicks "Generate Payroll".

**Execution trace:**

1. `POST /api/admin/payroll/runs` ([`src/app/api/admin/payroll/runs/route.ts:46`](../src/app/api/admin/payroll/runs/route.ts#L46)). Auth ✓. `BEGIN/COMMIT`.
2. `monthStartFromInput(body.month)` parses `YYYY-MM`.
3. Checks `payroll_run WHERE period_month=$1`: if `finalized` → 409. If draft, deletes existing `payroll_line_item` and resets.
4. `computePayrollLines(month)` in [`src/lib/server/workforceFinance.ts:237`](../src/lib/server/workforceFinance.ts#L237):
   - Fetches active `employee_compensation_profile`.
   - Fetches active `employee_allowance`.
   - **Per-patient doctors:** counts `visit WHERE doctor_id=$1 AND status='seen_by_doctor' AND visit_timestamp IN month`.
   - **Fixed-monthly staff:** counts `staff_leave_requests WHERE leave_code='UNPAID' AND approved AND overlapping month`, computes `unpaid_days * (base/30)`.
   - `netAmount = max(0, grossAmount - deductionTotal)` where `gross = base + allowances`.
5. Upserts `payroll_line_item ON CONFLICT(payroll_run_id, account_type, person_id) DO UPDATE`.
6. `logAuditEvent("Payroll run generated")`.

**Tables:** `payroll_run`, `payroll_line_item`, `employee_compensation_profile`, `employee_allowance`, `visit` (read), `staff_leave_requests`, `staff_leave_types`, `audit_logs`
**Edge cases handled:** Finalized payroll immutable (409). Idempotent line-item upsert.
**Gaps:** No attendance-based deductions — only UNPAID leave factored. `adjustmentTotal` is always 0.

---

## Flow O — Employee lifecycle (onboarding)

**User-visible trigger:** Admin starts onboarding for a new employee.

**Execution trace:**

1. `POST /api/admin/staff/v2/lifecycle` body `{action:'start_run', account_type, person_id, lifecycle_type:'onboarding'}` ([`src/app/api/admin/staff/v2/lifecycle/route.ts:267`](../src/app/api/admin/staff/v2/lifecycle/route.ts#L267)). Auth ✓.
2. Resolves template: `employee_lifecycle_templates WHERE lifecycle_type='onboarding' AND is_active=true AND applies_to IN ('both', accountType)`.
3. Inserts `employee_lifecycle_runs(account_type, person_id, lifecycle_template_id, lifecycle_type, run_status='in_progress', initiated_by)`.
4. Bulk-inserts `employee_lifecycle_tasks` from `employee_lifecycle_template_tasks` via INSERT/SELECT. `due_at = CURRENT_TIMESTAMP + due_offset_days * interval '1 day'`. metadata jsonb with `mandatory`, `blocks_transition`.
5. Inserts `employee_lifecycle_events(event_type='run_started', payload={taskCount})`.
6. `logAuditEvent`.

**Task completion:** PATCH `action='complete_task'` → updates task row, appends event.
**Run completion:** PATCH `action='complete_run'` → checks no mandatory blocking tasks open (`metadata->>'blocks_transition'=true`), then updates run + event + audit.

**Gaps:** No transaction wrapping run insert + task bulk insert (partial-state risk). No notification to employee.

---

## Flow P — Credential expiry tracking

**User-visible trigger:** Admin opens Credentialing tab.

**Execution trace:**

1. `GET /api/admin/staff/v2/credentialing` ([`src/app/api/admin/staff/v2/credentialing/route.ts:55`](../src/app/api/admin/staff/v2/credentialing/route.ts#L55)). Auth ✓. Queries `employee_credentials JOIN employee_credential_types LEFT JOIN staff/doctor`. Computes `days_until_expiry = expires_on - CURRENT_DATE`. Surfaces alerts via `expiringDays` window (default 30).
2. PATCH `action='verify'` computes `renewal_status` once: `expires_on IS NULL → 'not_due'`; `< CURRENT_DATE → 'overdue'`; `<= CURRENT_DATE + 60 days → 'due'`; else `'not_due'`.
3. Events recorded in `employee_credential_events`.

**🚨 Gap:** `renewal_status` is **not** recalculated over time. A credential verified today with `expires_on` in 6 months won't auto-flip to `'due'` when it crosses the 60-day window. **No scheduled re-evaluation.** The `validity_months` column on `employee_credential_types` is never referenced in the route.

---

## Flow Q — Document upload + review

**User-visible trigger:** Admin uploads employee document, optionally approves/rejects.

**Execution trace:**

1. Create → `POST /api/admin/staff/v2/documents` ([`src/app/api/admin/staff/v2/documents/route.ts:277`](../src/app/api/admin/staff/v2/documents/route.ts#L277)). Auth ✓. Inserts `employee_documents`.
2. If `file_url`/`storage_path` present: inserts `employee_document_versions(version_no=1, …, is_active=true)`. Updates `employee_documents.current_version_no=1`.
3. `appendDocumentReview(documentId, versionId, action='submitted')` → inserts `employee_document_reviews`.
4. `logAuditEvent("Employee document created")`.

**Review:** PATCH `action='approve'|'reject'|'under_review'` → updates `review_status`, `reviewed_by`, `reviewed_at`. `appendDocumentReview`. `logAuditEvent`.
**New version:** PATCH `action='add_version'` → increments `current_version_no`, inserts new `employee_document_versions` row.

**Gaps:** No actual file upload — `file_url` expected to be pre-uploaded externally. No transaction wrapping document/version/review inserts. **`employee_document_versions.is_active` is set but never updated** — old versions stay active even after a new version is added.

---

## Flow R — Queue real-time (SSE)

**User-visible trigger:** Doctor opens queue page; client opens EventSource connection.

**Execution trace:**

1. Client opens `EventSource('/api/doctor/queue/stream')`. Handler ([`src/app/api/doctor/queue/stream/route.ts:8`](../src/app/api/doctor/queue/stream/route.ts#L8)) authenticates via `getAuthenticatedDoctor`, calls `createQueueEventStream(req)` ([`src/lib/server/queueEvents.ts:49`](../src/lib/server/queueEvents.ts#L49)).
2. `createQueueEventStream` creates a `ReadableStream`. In `start(controller)`:
   - Sends `event: connected`.
   - Calls `subscribeToQueueInvalidations(listener)` adding to `globalThis.__hmsQueueEventStore__.listeners` (`Map<id, fn>`).
   - Heartbeat `setInterval` every 25,000 ms sending `event: ping`.
   - On `request.signal` abort: cleans up.
3. Any write calling `publishQueueInvalidation(reason)` iterates listeners, enqueues `event: invalidate\ndata: {...}`.
4. **45-second fallback** lives in client-side queue hook; `src/lib/server/queueConfig.ts` exports `QUEUE_STATEMENT_TIMEOUT_MS=5000` and `ACTIVE_QUEUE_STATUSES`.
5. SSE is published from: `visit-created` (POST `/api/visit`), `visit-updated` (PATCH `/api/visit`), `visit-deleted` (DELETE `/api/visit`), `doctor-visit-status-updated` (POST `/api/doctor/visit/[visitId]/status`). **Not published from:** pharmacy dispense, cashier settle, lab order creation, prescription creation.

**🚨 Architecture limitation:** `globalThis.__hmsQueueEventStore__` works in a single-process Node deployment. **In multi-instance / serverless (Vercel Edge / Lambda), events published on one instance never reach listeners on others.** Real-time queue updates are not multi-instance-safe.

**Tables:** None — pure in-memory fan-out.

---

## Flow S — Audit log fan-out

**Execution trace:**

1. Write handler calls `logAuditEvent(input, runner?)` ([`src/lib/server/audit.ts:32`](../src/lib/server/audit.ts#L32)).
2. If `actorUserCode` provided without `actorStaffId`: looks up `SELECT staff_id FROM staff WHERE user_code=$1`. **Doctor user codes will resolve to null** (doctors aren't in `staff`), so doctor-originated events have `staff_id=null` in `audit_logs`.
3. Inserts `audit_logs(staff_id, action, entity_type, entity_id, details)`.
4. Calls `publishAuditInvalidation("audit_log_inserted", logId)` ([`src/lib/server/auditEvents.ts:29`](../src/lib/server/auditEvents.ts#L29)) — same in-memory SSE pattern.
5. **Errors in `logAuditEvent` are swallowed with `console.warn`** — audit failures never affect the main transaction (intentional).

**Coverage gaps in `audit_logs`:**
- `POST /api/patient`
- `POST /api/visit` / `PATCH /api/visit` / `DELETE /api/visit`
- `POST /api/doctor/prescriptions`
- `POST /api/doctor/lab-orders`
- `POST /api/transactions` (POS sale) — only `pos_audit_log`
- `POST /api/transactions/return` — only `pos_audit_log`
- `POST /api/pharmacy/purchase` — only `pos_audit_log`
- `POST /api/pharmacy/purchase/return` — no audit anywhere

---

## Architecture observations

### Transaction coverage

**Properly wrapped in `BEGIN/COMMIT`:**
- `POST /api/doctor/prescriptions` (with `FOR UPDATE`)
- `POST /api/doctor/lab-orders`
- `POST /api/doctor/visit/[visitId]/status`
- `POST /api/cashier/settle`
- `POST /api/cashier/reversal`
- `POST /api/transactions` (POS sale)
- `POST /api/transactions/return`
- `POST /api/pharmacy/purchase`
- `POST /api/admin/payroll/runs`

**Missing transactions / multi-write gaps:**
- `POST /api/visit` — visit + bill in two separate auto-commit statements
- `POST /api/attendance/me/check-in` — insert + derived-fields update not atomic
- `POST /api/admin/staff/v2/lifecycle` `start_run` — run + task bulk insert not atomic
- `POST /api/admin/staff/v2/documents` — document + version + review not atomic
- **`POST /api/pharmacy/purchase/return`** — uses `BEGIN`/`ROLLBACK` on module-level `query`, **not the same connection** — broken transaction (rollback executes on a different connection from the begin).

### Auth coverage

**Routes with no auth check (open to any caller):**
- `GET/POST/PATCH /api/patient` — patient records fully public
- `POST/PATCH/DELETE /api/visit` — visit lifecycle unprotected
- `GET /api/pharmacy/prescription-sale` — prescription data exposed
- `GET /api/lab/order` — lab order list exposed
- `GET /api/lab/testParameters/[test_id]` — test parameters exposed
- `POST /api/pharmacy/purchase/return` — purchase returns unprotected
- `POST /api/transactions/return` — uses hardcoded `getCurrentStaffId()=1`
- `POST /api/pharmacy/purchase` — uses hardcoded `getCurrentStaffId()=1`

### SSE invalidation coverage

`publishQueueInvalidation` is called from:
- `POST /api/visit` → `"visit-created"`
- `PATCH /api/visit` → `"visit-updated"`
- `DELETE /api/visit` → `"visit-deleted"`
- `POST /api/doctor/visit/[visitId]/status` → `"doctor-visit-status-updated"`

**Not called from:** POS sale, cashier settle, cashier reversal, lab order creation, prescription creation. Doctor's queue / cashier worklist can show stale state until the 45 s poll catches up.

`publishAuditInvalidation` fires automatically from `logAuditEvent` — admin live audit stream updates whenever an audit-logged action runs.

### Stored procedure usage

`CALL update_and_log_visit_status(...)` is called from:
- `src/lib/server/doctorWorkspace.ts` (doctor status transitions)
- `src/app/api/cashier/settle/route.ts` (`payment_done`)
- `src/app/api/transactions/route.ts` (`medicines_dispensed`)

**Routes that bypass the procedure** (direct `UPDATE visit SET status`):
- `PATCH /api/visit` line 34 — status change does **not** append to `visit_status_history`
- `src/app/api/doctor/visit/[visitId]/route.ts` PATCH handler — writes status directly if in body

### The `getCurrentStaffId()` stub

`src/lib/utils.ts` `getCurrentStaffId()` returns `1`. Called in 14 API route files (see [issues-found.md](./issues-found.md) B4). Every audit / `created_by` from these routes attributes to staff_id=1 regardless of who's logged in.

### Critical functionality gaps

1. **Lab result entry is unimplemented** — Flow C. No route writes to `lab_result` or `lab_test_results`; `saveTestResults` is an empty stub. The `lab_tests_done` visit status is unreachable through legitimate workflow.
2. **Leave balance is never decremented on approval** — Flow M. `staff_leave_balances.consumed` is read but never written by the approval path.
3. **Credential `renewal_status` stays stale** — Flow P. Computed once at verify; not recalculated as time passes.
4. **`employee_document_versions.is_active` is never updated** — Flow Q. Old versions stay active after new uploads.
5. **Cashier reversal does not revert visit status** — Flow I. Bill goes back to Unpaid but visit stays at `payment_done`.
6. **Clinic-number race** — Flow A. `get_clinic_number` is non-atomic; two simultaneous calls produce duplicates.
7. **POS dispense + cashier settle don't publish SSE** — doctor queue / cashier worklist can show stale state.

---

## Essential files for understanding HMS

- [`src/middleware.ts`](../src/middleware.ts) — page-level role gating (does **not** protect `/api/*`)
- [`src/lib/server/auth.ts`](../src/lib/server/auth.ts) — JWT verification, session validation, forced-logout detection
- [`src/lib/server/doctor.ts`](../src/lib/server/doctor.ts) — doctor-specific auth helpers
- [`src/lib/server/password.ts`](../src/lib/server/password.ts) — scrypt + plaintext-upgrade
- [`src/lib/server/visitLifecycle.ts`](../src/lib/server/visitLifecycle.ts) — status machine, transition guards
- [`src/lib/server/doctorWorkspace.ts`](../src/lib/server/doctorWorkspace.ts) — visit context, prescription thread logic, status transitions
- [`src/lib/server/cashier.ts`](../src/lib/server/cashier.ts) — role helpers, `deriveBillPaymentStatus`
- [`src/lib/server/attendance.ts`](../src/lib/server/attendance.ts) — policy fetch, roster lookup, recompute
- [`src/lib/server/workforceFinance.ts`](../src/lib/server/workforceFinance.ts) — payroll computation
- [`src/lib/server/queueEvents.ts`](../src/lib/server/queueEvents.ts) — in-memory SSE fan-out
- [`src/lib/server/auditEvents.ts`](../src/lib/server/auditEvents.ts) — audit SSE
- [`src/lib/server/audit.ts`](../src/lib/server/audit.ts) — `logAuditEvent` (errors swallowed, intentional)
- [`src/lib/server/queueConfig.ts`](../src/lib/server/queueConfig.ts) — queue timeout, active statuses
- [`src/app/api/login/route.ts`](../src/app/api/login/route.ts) — login with scrypt + lockout + session insert + JWT
- [`src/app/api/logout/route.ts`](../src/app/api/logout/route.ts) — voluntary revocation
- [`src/app/api/admin/staff/security/route.ts`](../src/app/api/admin/staff/security/route.ts) — forced logout, password reset, account lock
- [`src/app/api/visit/route.ts`](../src/app/api/visit/route.ts) — visit creation (un-transacted bill + SSE)
- [`src/app/api/patient/route.ts`](../src/app/api/patient/route.ts) — unauthenticated patient CRUD
- [`src/app/api/doctor/prescriptions/route.ts`](../src/app/api/doctor/prescriptions/route.ts) — prescription creation with BEGIN/COMMIT
- [`src/app/api/doctor/lab-orders/route.ts`](../src/app/api/doctor/lab-orders/route.ts) — lab order creation
- [`src/app/api/doctor/visit/[visitId]/status/route.ts`](../src/app/api/doctor/visit/[visitId]/status/route.ts) — status transition via stored procedure + SSE
- [`src/app/api/transactions/route.ts`](../src/app/api/transactions/route.ts) — POS sale: FEFO, pharmacy_sale, trigger chain entry, bill append, visit status transition
- [`src/app/api/transactions/return/route.ts`](../src/app/api/transactions/return/route.ts) — sale return, trigger chain for stock restore
- [`src/app/api/pharmacy/purchase/route.ts`](../src/app/api/pharmacy/purchase/route.ts) — purchase intake, batch creation, trigger entry
- [`src/app/api/pharmacy/prescription-sale/route.ts`](../src/app/api/pharmacy/prescription-sale/route.ts) — FEFO prescription cart builder
- [`src/app/api/cashier/settle/route.ts`](../src/app/api/cashier/settle/route.ts) — full settlement: idempotency, allocation, visit status, dual audit
- [`src/app/api/cashier/reversal/route.ts`](../src/app/api/cashier/reversal/route.ts) — reversal with allocation rollback (no visit revert)
- [`src/app/api/cashier/worklist/route.ts`](../src/app/api/cashier/worklist/route.ts) — aged worklist with due_score
- [`src/app/api/attendance/me/check-in/route.ts`](../src/app/api/attendance/me/check-in/route.ts) — self check-in entry
- [`src/app/api/employee/me/leave/requests/route.ts`](../src/app/api/employee/me/leave/requests/route.ts) — leave submission
- [`src/app/api/admin/staff/v2/approvals/route.ts`](../src/app/api/admin/staff/v2/approvals/route.ts) — leave approval (missing balance update)
- [`src/app/api/admin/payroll/runs/route.ts`](../src/app/api/admin/payroll/runs/route.ts) — payroll run header
- [`src/app/api/admin/staff/v2/lifecycle/route.ts`](../src/app/api/admin/staff/v2/lifecycle/route.ts) — lifecycle management
- [`src/app/api/admin/staff/v2/credentialing/route.ts`](../src/app/api/admin/staff/v2/credentialing/route.ts) — credential CRUD + expiry
- [`src/app/api/admin/staff/v2/documents/route.ts`](../src/app/api/admin/staff/v2/documents/route.ts) — document versioning + review
- [`src/features/laboratory/labResult/hooks/useLabResults.ts`](../src/features/laboratory/labResult/hooks/useLabResults.ts) — incomplete `saveTestResults` stub
- [`database/snapshot/triggers.md`](../database/snapshot/triggers.md) — all 17 DB triggers
- [`database/snapshot/routines.md`](../database/snapshot/routines.md) — all stored functions/procedures
- [`database/snapshot/views.md`](../database/snapshot/views.md) — `v_medicine_pos`, `v_low_stock_medicines`, `v_daily_sales_summary`, `admin_cash_collected_ledger_v1`
