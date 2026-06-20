# DB Snapshot — overview

Generated: 2026-06-20T09:11:43.640Z

- Tables: 107
- Views: 5
- Functions/Procedures: 15
- Triggers: 17
- Enums: 0

## Row counts

| table_name | n |
| --- | --- |
| admission | 0 |
| allowance_type_master | 6 |
| attendance_regularization_requests | 0 |
| audit_logs | 167 |
| bed | 0 |
| bed_transfer | 0 |
| bill | 63 |
| bill_charge_source | 0 |
| bill_item | 0 |
| bill_pharmacy_sale | 0 |
| cashier_audit_event | 0 |
| cashier_idempotency | 0 |
| cashier_payment_allocation | 0 |
| cashier_payment_txn | 0 |
| cashier_settlement_draft | 0 |
| cashier_shift | 0 |
| current_pregnancy | 1 |
| doctor | 6 |
| doctor_attendance | 5 |
| doctor_encounter_note | 27 |
| doctor_order | 0 |
| doctor_security_sessions | 19 |
| employee_allowance | 0 |
| employee_compensation_profile | 12 |
| employee_credential_events | 0 |
| employee_credential_types | 4 |
| employee_credentials | 0 |
| employee_document_requirements | 0 |
| employee_document_reviews | 0 |
| employee_document_types | 4 |
| employee_document_versions | 0 |
| employee_documents | 0 |
| employee_lifecycle_events | 0 |
| employee_lifecycle_runs | 0 |
| employee_lifecycle_tasks | 0 |
| employee_lifecycle_template_tasks | 6 |
| employee_lifecycle_templates | 2 |
| finance_asset_purchase | 0 |
| finance_expense_category | 7 |
| finance_expense_entry | 0 |
| intake_output | 0 |
| ip_advance | 0 |
| ip_charge | 0 |
| ip_final_bill | 0 |
| lab_order | 0 |
| lab_result | 0 |
| lab_result_approvals | 0 |
| lab_test | 4 |
| lab_test_parameters | 4 |
| lab_test_results | 0 |
| leave_employee_quota_override | 0 |
| leave_role_quota | 72 |
| medication_administration | 0 |
| medication_order | 0 |
| medicine | 12 |
| medicine_batch | 24 |
| medicine_category | 8 |
| medicine_form | 4 |
| medicine_manufacturer | 5 |
| medicine_purchase | 16 |
| medicine_purchase_detail | 21 |
| medicine_transaction | 128 |
| menstrual_history | 1 |
| nursing_note | 0 |
| obstetric_history | 1 |
| para_details | 1 |
| party | 6 |
| party_payment | 1 |
| patient | 12 |
| patient_allergy | 0 |
| patient_vitals | 9 |
| payroll_line_item | 24 |
| payroll_run | 2 |
| pharmacy_customer | 0 |
| pharmacy_sale | 67 |
| pharmacy_sale_detail | 73 |
| pos_audit_log | 195 |
| pos_held_transaction | 14 |
| pos_held_transaction_detail | 15 |
| pos_receipt_config | 1 |
| pos_session | 1 |
| prescription | 8 |
| prescription_fulfillment_action | 1 |
| prescription_medicines | 14 |
| purchase_return | 8 |
| purchase_return_detail | 10 |
| room | 0 |
| sale_return | 12 |
| sale_return_detail | 13 |
| staff | 9 |
| staff_attendance | 9 |
| staff_leave_approvals | 0 |
| staff_leave_balances | 0 |
| staff_leave_requests | 1 |
| staff_leave_types | 6 |
| staff_permission_audit | 84 |
| staff_permission_policies | 84 |
| staff_permissions | 0 |
| staff_role_assignments | 0 |
| staff_roles | 12 |
| staff_roster_assignments | 1332 |
| staff_security_sessions | 47 |
| staff_shift_templates | 4 |
| system_settings | 11 |
| visit | 69 |
| visit_status_history | 29 |
| ward | 0 |


## Files

- [tables.md](./tables.md) — columns, PKs, FKs, uniques, checks
- [indexes.md](./indexes.md)
- [views.md](./views.md)
- [routines.md](./routines.md) — functions & procedures with full bodies
- [triggers.md](./triggers.md)
- [enums.md](./enums.md)
- [samples.md](./samples.md) — 3 rows per non-empty table
