# Indexes

| schema | table_name | index_name | indexdef |
| --- | --- | --- | --- |
| public | admission | admission_admission_no_key | CREATE UNIQUE INDEX admission_admission_no_key ON public.admission USING btree (admission_no) |
| public | admission | admission_pkey | CREATE UNIQUE INDEX admission_pkey ON public.admission USING btree (admission_id) |
| public | admission | idx_admission_bed | CREATE INDEX idx_admission_bed ON public.admission USING btree (current_bed_id) |
| public | admission | idx_admission_patient | CREATE INDEX idx_admission_patient ON public.admission USING btree (patient_id) |
| public | admission | idx_admission_status | CREATE INDEX idx_admission_status ON public.admission USING btree (status) |
| public | admission | uq_admission_active_bed | CREATE UNIQUE INDEX uq_admission_active_bed ON public.admission USING btree (current_bed_id) WHERE (((status)::text = 'admitted'::text) AND (current_bed_id IS NOT NULL)) |
| public | allowance_type_master | allowance_type_master_pkey | CREATE UNIQUE INDEX allowance_type_master_pkey ON public.allowance_type_master USING btree (code) |
| public | attendance_regularization_requests | attendance_regularization_requests_pkey | CREATE UNIQUE INDEX attendance_regularization_requests_pkey ON public.attendance_regularization_requests USING btree (regularization_id) |
| public | attendance_regularization_requests | idx_attendance_regularization_status | CREATE INDEX idx_attendance_regularization_status ON public.attendance_regularization_requests USING btree (request_status, created_at DESC) |
| public | audit_logs | audit_logs_pkey | CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (log_id) |
| public | audit_logs | idx_audit_logs_created_at | CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC) |
| public | audit_logs | idx_audit_logs_staff_created | CREATE INDEX idx_audit_logs_staff_created ON public.audit_logs USING btree (staff_id, created_at DESC) |
| public | bed | bed_pkey | CREATE UNIQUE INDEX bed_pkey ON public.bed USING btree (bed_id) |
| public | bed | idx_bed_status | CREATE INDEX idx_bed_status ON public.bed USING btree (status) |
| public | bed | uq_bed_room_number | CREATE UNIQUE INDEX uq_bed_room_number ON public.bed USING btree (room_id, bed_number) |
| public | bed_transfer | bed_transfer_pkey | CREATE UNIQUE INDEX bed_transfer_pkey ON public.bed_transfer USING btree (transfer_id) |
| public | bed_transfer | idx_bed_transfer_admission | CREATE INDEX idx_bed_transfer_admission ON public.bed_transfer USING btree (admission_id) |
| public | bill | bill_pkey | CREATE UNIQUE INDEX bill_pkey ON public.bill USING btree (bill_id) |
| public | bill_charge_source | bill_charge_source_pkey | CREATE UNIQUE INDEX bill_charge_source_pkey ON public.bill_charge_source USING btree (bill_charge_source_id) |
| public | bill_charge_source | idx_bill_charge_source_bill | CREATE INDEX idx_bill_charge_source_bill ON public.bill_charge_source USING btree (bill_id, created_at DESC) |
| public | bill_charge_source | idx_bill_charge_source_type | CREATE INDEX idx_bill_charge_source_type ON public.bill_charge_source USING btree (source_type, source_id) |
| public | bill_item | bill_item_pkey | CREATE UNIQUE INDEX bill_item_pkey ON public.bill_item USING btree (item_id) |
| public | bill_pharmacy_sale | bill_pharmacy_sale_pkey | CREATE UNIQUE INDEX bill_pharmacy_sale_pkey ON public.bill_pharmacy_sale USING btree (bill_pharmacy_sale_id) |
| public | bill_pharmacy_sale | bill_pharmacy_sale_sale_unique | CREATE UNIQUE INDEX bill_pharmacy_sale_sale_unique ON public.bill_pharmacy_sale USING btree (sale_id) |
| public | bill_pharmacy_sale | idx_bill_pharmacy_sale_bill_id | CREATE INDEX idx_bill_pharmacy_sale_bill_id ON public.bill_pharmacy_sale USING btree (bill_id) |
| public | bill_pharmacy_sale | idx_bill_pharmacy_sale_settlement_status | CREATE INDEX idx_bill_pharmacy_sale_settlement_status ON public.bill_pharmacy_sale USING btree (settlement_status) |
| public | cashier_audit_event | cashier_audit_event_pkey | CREATE UNIQUE INDEX cashier_audit_event_pkey ON public.cashier_audit_event USING btree (cashier_audit_event_id) |
| public | cashier_audit_event | idx_cashier_audit_event_bill | CREATE INDEX idx_cashier_audit_event_bill ON public.cashier_audit_event USING btree (bill_id, created_at DESC) |
| public | cashier_audit_event | idx_cashier_audit_event_time | CREATE INDEX idx_cashier_audit_event_time ON public.cashier_audit_event USING btree (created_at DESC) |
| public | cashier_idempotency | cashier_idempotency_pkey | CREATE UNIQUE INDEX cashier_idempotency_pkey ON public.cashier_idempotency USING btree (cashier_idempotency_id) |
| public | cashier_idempotency | idx_cashier_idempotency_bill | CREATE INDEX idx_cashier_idempotency_bill ON public.cashier_idempotency USING btree (bill_id, created_at DESC) |
| public | cashier_idempotency | uq_cashier_idempotency | CREATE UNIQUE INDEX uq_cashier_idempotency ON public.cashier_idempotency USING btree (idempotency_key, endpoint) |
| public | cashier_payment_allocation | cashier_payment_allocation_pkey | CREATE UNIQUE INDEX cashier_payment_allocation_pkey ON public.cashier_payment_allocation USING btree (cashier_payment_allocation_id) |
| public | cashier_payment_allocation | idx_cashier_payment_alloc_bill | CREATE INDEX idx_cashier_payment_alloc_bill ON public.cashier_payment_allocation USING btree (bill_id) |
| public | cashier_payment_allocation | idx_cashier_payment_alloc_sale | CREATE INDEX idx_cashier_payment_alloc_sale ON public.cashier_payment_allocation USING btree (sale_id) |
| public | cashier_payment_txn | cashier_payment_txn_pkey | CREATE UNIQUE INDEX cashier_payment_txn_pkey ON public.cashier_payment_txn USING btree (cashier_payment_txn_id) |
| public | cashier_payment_txn | idx_cashier_payment_txn_bill | CREATE INDEX idx_cashier_payment_txn_bill ON public.cashier_payment_txn USING btree (bill_id, created_at DESC) |
| public | cashier_payment_txn | idx_cashier_payment_txn_visit | CREATE INDEX idx_cashier_payment_txn_visit ON public.cashier_payment_txn USING btree (visit_id) |
| public | cashier_payment_txn | uq_cashier_payment_txn_receipt_no | CREATE UNIQUE INDEX uq_cashier_payment_txn_receipt_no ON public.cashier_payment_txn USING btree (receipt_no) WHERE (receipt_no IS NOT NULL) |
| public | cashier_settlement_draft | cashier_settlement_draft_pkey | CREATE UNIQUE INDEX cashier_settlement_draft_pkey ON public.cashier_settlement_draft USING btree (cashier_settlement_draft_id) |
| public | cashier_settlement_draft | idx_cashier_settlement_draft_bill | CREATE INDEX idx_cashier_settlement_draft_bill ON public.cashier_settlement_draft USING btree (bill_id, draft_status, created_at DESC) |
| public | cashier_shift | cashier_shift_pkey | CREATE UNIQUE INDEX cashier_shift_pkey ON public.cashier_shift USING btree (cashier_shift_id) |
| public | cashier_shift | idx_cashier_shift_opened_at | CREATE INDEX idx_cashier_shift_opened_at ON public.cashier_shift USING btree (opened_at DESC) |
| public | cashier_shift | uq_cashier_shift_open_per_staff | CREATE UNIQUE INDEX uq_cashier_shift_open_per_staff ON public.cashier_shift USING btree (staff_id) WHERE (status = 'open'::text) |
| public | current_pregnancy | current_pregnancy_pkey | CREATE UNIQUE INDEX current_pregnancy_pkey ON public.current_pregnancy USING btree (pregnancy_id) |
| public | current_pregnancy | uniqeue_visit_id_cp | CREATE UNIQUE INDEX uniqeue_visit_id_cp ON public.current_pregnancy USING btree (visit_id) |
| public | doctor | doctor_pkey | CREATE UNIQUE INDEX doctor_pkey ON public.doctor USING btree (doctor_id) |
| public | doctor_attendance | doctor_attendance_doctor_id_date_key | CREATE UNIQUE INDEX doctor_attendance_doctor_id_date_key ON public.doctor_attendance USING btree (doctor_id, date) |
| public | doctor_attendance | doctor_attendance_pkey | CREATE UNIQUE INDEX doctor_attendance_pkey ON public.doctor_attendance USING btree (attendance_id) |
| public | doctor_attendance | idx_doctor_attendance_date_derived_status | CREATE INDEX idx_doctor_attendance_date_derived_status ON public.doctor_attendance USING btree (date, derived_status) |
| public | doctor_attendance | idx_doctor_attendance_doctor_date | CREATE INDEX idx_doctor_attendance_doctor_date ON public.doctor_attendance USING btree (doctor_id, date DESC) |
| public | doctor_encounter_note | doctor_encounter_note_pkey | CREATE UNIQUE INDEX doctor_encounter_note_pkey ON public.doctor_encounter_note USING btree (doctor_encounter_note_id) |
| public | doctor_encounter_note | doctor_encounter_note_visit_id_key | CREATE UNIQUE INDEX doctor_encounter_note_visit_id_key ON public.doctor_encounter_note USING btree (visit_id) |
| public | doctor_encounter_note | idx_doctor_encounter_note_doctor | CREATE INDEX idx_doctor_encounter_note_doctor ON public.doctor_encounter_note USING btree (doctor_id) |
| public | doctor_encounter_note | idx_doctor_encounter_note_patient | CREATE INDEX idx_doctor_encounter_note_patient ON public.doctor_encounter_note USING btree (patient_id) |
| public | doctor_order | doctor_order_pkey | CREATE UNIQUE INDEX doctor_order_pkey ON public.doctor_order USING btree (order_id) |
| public | doctor_order | idx_doctor_order_admission | CREATE INDEX idx_doctor_order_admission ON public.doctor_order USING btree (admission_id) |
| public | doctor_order | idx_doctor_order_status | CREATE INDEX idx_doctor_order_status ON public.doctor_order USING btree (status) |
| public | doctor_security_sessions | doctor_security_sessions_pkey | CREATE UNIQUE INDEX doctor_security_sessions_pkey ON public.doctor_security_sessions USING btree (session_id) |
| public | doctor_security_sessions | idx_doctor_security_sessions_doctor_revoked | CREATE INDEX idx_doctor_security_sessions_doctor_revoked ON public.doctor_security_sessions USING btree (doctor_id, revoked_at) |
| public | doctor_security_sessions | idx_doctor_security_sessions_last_seen | CREATE INDEX idx_doctor_security_sessions_last_seen ON public.doctor_security_sessions USING btree (last_seen_at DESC) |
| public | employee_allowance | employee_allowance_pkey | CREATE UNIQUE INDEX employee_allowance_pkey ON public.employee_allowance USING btree (allowance_id) |
| public | employee_allowance | idx_employee_allowance_person_active | CREATE INDEX idx_employee_allowance_person_active ON public.employee_allowance USING btree (account_type, person_id, is_active, effective_from, effective_to) |
| public | employee_compensation_profile | employee_compensation_profile_pkey | CREATE UNIQUE INDEX employee_compensation_profile_pkey ON public.employee_compensation_profile USING btree (compensation_id) |
| public | employee_compensation_profile | idx_employee_compensation_profile_active | CREATE INDEX idx_employee_compensation_profile_active ON public.employee_compensation_profile USING btree (account_type, person_id, active_to) |
| public | employee_compensation_profile | uq_employee_compensation_profile_person | CREATE UNIQUE INDEX uq_employee_compensation_profile_person ON public.employee_compensation_profile USING btree (account_type, person_id, active_from) |
| public | employee_credential_events | employee_credential_events_pkey | CREATE UNIQUE INDEX employee_credential_events_pkey ON public.employee_credential_events USING btree (credential_event_id) |
| public | employee_credential_events | idx_employee_credential_events_credential | CREATE INDEX idx_employee_credential_events_credential ON public.employee_credential_events USING btree (credential_id, created_at DESC) |
| public | employee_credential_types | employee_credential_types_credential_code_key | CREATE UNIQUE INDEX employee_credential_types_credential_code_key ON public.employee_credential_types USING btree (credential_code) |
| public | employee_credential_types | employee_credential_types_pkey | CREATE UNIQUE INDEX employee_credential_types_pkey ON public.employee_credential_types USING btree (credential_type_id) |
| public | employee_credentials | employee_credentials_pkey | CREATE UNIQUE INDEX employee_credentials_pkey ON public.employee_credentials USING btree (credential_id) |
| public | employee_credentials | idx_employee_credentials_employee | CREATE INDEX idx_employee_credentials_employee ON public.employee_credentials USING btree (account_type, person_id, verification_status) |
| public | employee_credentials | idx_employee_credentials_expiry | CREATE INDEX idx_employee_credentials_expiry ON public.employee_credentials USING btree (expires_on, verification_status) |
| public | employee_credentials | uq_employee_credentials_unique_number | CREATE UNIQUE INDEX uq_employee_credentials_unique_number ON public.employee_credentials USING btree (credential_type_id, credential_number, account_type, person_id) |
| public | employee_document_requirements | employee_document_requirements_pkey | CREATE UNIQUE INDEX employee_document_requirements_pkey ON public.employee_document_requirements USING btree (requirement_id) |
| public | employee_document_requirements | uq_employee_document_requirement_scope | CREATE UNIQUE INDEX uq_employee_document_requirement_scope ON public.employee_document_requirements USING btree (document_type_id, target_type, COALESCE(target_value, ''::character varying)) |
| public | employee_document_reviews | employee_document_reviews_pkey | CREATE UNIQUE INDEX employee_document_reviews_pkey ON public.employee_document_reviews USING btree (document_review_id) |
| public | employee_document_reviews | idx_employee_document_reviews_document | CREATE INDEX idx_employee_document_reviews_document ON public.employee_document_reviews USING btree (document_id, created_at DESC) |
| public | employee_document_types | employee_document_types_document_code_key | CREATE UNIQUE INDEX employee_document_types_document_code_key ON public.employee_document_types USING btree (document_code) |
| public | employee_document_types | employee_document_types_pkey | CREATE UNIQUE INDEX employee_document_types_pkey ON public.employee_document_types USING btree (document_type_id) |
| public | employee_document_versions | employee_document_versions_pkey | CREATE UNIQUE INDEX employee_document_versions_pkey ON public.employee_document_versions USING btree (version_id) |
| public | employee_document_versions | idx_employee_document_versions_document | CREATE INDEX idx_employee_document_versions_document ON public.employee_document_versions USING btree (document_id, uploaded_at DESC) |
| public | employee_document_versions | uq_employee_document_versions_doc_version | CREATE UNIQUE INDEX uq_employee_document_versions_doc_version ON public.employee_document_versions USING btree (document_id, version_no) |
| public | employee_documents | employee_documents_pkey | CREATE UNIQUE INDEX employee_documents_pkey ON public.employee_documents USING btree (document_id) |
| public | employee_documents | idx_employee_documents_employee | CREATE INDEX idx_employee_documents_employee ON public.employee_documents USING btree (account_type, person_id, document_type_id) |
| public | employee_documents | idx_employee_documents_status | CREATE INDEX idx_employee_documents_status ON public.employee_documents USING btree (review_status, expires_on) |
| public | employee_lifecycle_events | employee_lifecycle_events_pkey | CREATE UNIQUE INDEX employee_lifecycle_events_pkey ON public.employee_lifecycle_events USING btree (lifecycle_event_id) |
| public | employee_lifecycle_events | idx_employee_lifecycle_events_run | CREATE INDEX idx_employee_lifecycle_events_run ON public.employee_lifecycle_events USING btree (lifecycle_run_id, created_at DESC) |
| public | employee_lifecycle_runs | employee_lifecycle_runs_pkey | CREATE UNIQUE INDEX employee_lifecycle_runs_pkey ON public.employee_lifecycle_runs USING btree (lifecycle_run_id) |
| public | employee_lifecycle_runs | idx_employee_lifecycle_runs_employee | CREATE INDEX idx_employee_lifecycle_runs_employee ON public.employee_lifecycle_runs USING btree (account_type, person_id, run_status) |
| public | employee_lifecycle_runs | idx_employee_lifecycle_runs_status | CREATE INDEX idx_employee_lifecycle_runs_status ON public.employee_lifecycle_runs USING btree (run_status, lifecycle_type, started_at DESC) |
| public | employee_lifecycle_tasks | employee_lifecycle_tasks_pkey | CREATE UNIQUE INDEX employee_lifecycle_tasks_pkey ON public.employee_lifecycle_tasks USING btree (lifecycle_task_id) |
| public | employee_lifecycle_tasks | idx_employee_lifecycle_tasks_status_due | CREATE INDEX idx_employee_lifecycle_tasks_status_due ON public.employee_lifecycle_tasks USING btree (task_status, due_at) |
| public | employee_lifecycle_tasks | uq_employee_lifecycle_tasks_run_task_code | CREATE UNIQUE INDEX uq_employee_lifecycle_tasks_run_task_code ON public.employee_lifecycle_tasks USING btree (lifecycle_run_id, task_code) |
| public | employee_lifecycle_template_tasks | employee_lifecycle_template_tasks_pkey | CREATE UNIQUE INDEX employee_lifecycle_template_tasks_pkey ON public.employee_lifecycle_template_tasks USING btree (lifecycle_template_task_id) |
| public | employee_lifecycle_template_tasks | uq_employee_lifecycle_template_task_code | CREATE UNIQUE INDEX uq_employee_lifecycle_template_task_code ON public.employee_lifecycle_template_tasks USING btree (lifecycle_template_id, task_code) |
| public | employee_lifecycle_templates | employee_lifecycle_templates_pkey | CREATE UNIQUE INDEX employee_lifecycle_templates_pkey ON public.employee_lifecycle_templates USING btree (lifecycle_template_id) |
| public | employee_lifecycle_templates | employee_lifecycle_templates_template_code_key | CREATE UNIQUE INDEX employee_lifecycle_templates_template_code_key ON public.employee_lifecycle_templates USING btree (template_code) |
| public | finance_asset_purchase | finance_asset_purchase_pkey | CREATE UNIQUE INDEX finance_asset_purchase_pkey ON public.finance_asset_purchase USING btree (asset_purchase_id) |
| public | finance_asset_purchase | idx_finance_asset_purchase_date | CREATE INDEX idx_finance_asset_purchase_date ON public.finance_asset_purchase USING btree (purchase_date DESC, asset_category) |
| public | finance_expense_category | finance_expense_category_pkey | CREATE UNIQUE INDEX finance_expense_category_pkey ON public.finance_expense_category USING btree (code) |
| public | finance_expense_entry | finance_expense_entry_pkey | CREATE UNIQUE INDEX finance_expense_entry_pkey ON public.finance_expense_entry USING btree (expense_id) |
| public | finance_expense_entry | idx_finance_expense_entry_date | CREATE INDEX idx_finance_expense_entry_date ON public.finance_expense_entry USING btree (expense_date DESC, category) |
| public | intake_output | idx_intake_output_admission | CREATE INDEX idx_intake_output_admission ON public.intake_output USING btree (admission_id) |
| public | intake_output | intake_output_pkey | CREATE UNIQUE INDEX intake_output_pkey ON public.intake_output USING btree (io_id) |
| public | ip_advance | idx_ip_advance_admission | CREATE INDEX idx_ip_advance_admission ON public.ip_advance USING btree (admission_id) |
| public | ip_advance | ip_advance_pkey | CREATE UNIQUE INDEX ip_advance_pkey ON public.ip_advance USING btree (advance_id) |
| public | ip_charge | idx_ip_charge_admission | CREATE INDEX idx_ip_charge_admission ON public.ip_charge USING btree (admission_id) |
| public | ip_charge | ip_charge_pkey | CREATE UNIQUE INDEX ip_charge_pkey ON public.ip_charge USING btree (charge_id) |
| public | ip_charge | uq_ip_charge_room_rent | CREATE UNIQUE INDEX uq_ip_charge_room_rent ON public.ip_charge USING btree (admission_id, source_ref) WHERE ((charge_type)::text = 'room_rent'::text) |
| public | ip_final_bill | ip_final_bill_pkey | CREATE UNIQUE INDEX ip_final_bill_pkey ON public.ip_final_bill USING btree (admission_id) |
| public | lab_order | idx_lab_order_visit_id | CREATE INDEX idx_lab_order_visit_id ON public.lab_order USING btree (visit_id) |
| public | lab_order | lab_order_pkey | CREATE UNIQUE INDEX lab_order_pkey ON public.lab_order USING btree (order_id) |
| public | lab_result | lab_result_pkey | CREATE UNIQUE INDEX lab_result_pkey ON public.lab_result USING btree (result_id) |
| public | lab_result_approvals | lab_result_approvals_order_id_key | CREATE UNIQUE INDEX lab_result_approvals_order_id_key ON public.lab_result_approvals USING btree (order_id) |
| public | lab_result_approvals | lab_result_approvals_pkey | CREATE UNIQUE INDEX lab_result_approvals_pkey ON public.lab_result_approvals USING btree (approval_id) |
| public | lab_test | lab_test_pkey | CREATE UNIQUE INDEX lab_test_pkey ON public.lab_test USING btree (test_id) |
| public | lab_test_parameters | lab_test_parameters_pkey | CREATE UNIQUE INDEX lab_test_parameters_pkey ON public.lab_test_parameters USING btree (parameter_id) |
| public | lab_test_parameters | lab_test_parameters_test_id_parameter_code_key | CREATE UNIQUE INDEX lab_test_parameters_test_id_parameter_code_key ON public.lab_test_parameters USING btree (test_id, parameter_code) |
| public | lab_test_results | lab_test_results_order_id_parameter_id_key | CREATE UNIQUE INDEX lab_test_results_order_id_parameter_id_key ON public.lab_test_results USING btree (order_id, parameter_id) |
| public | lab_test_results | lab_test_results_pkey | CREATE UNIQUE INDEX lab_test_results_pkey ON public.lab_test_results USING btree (result_id) |
| public | leave_employee_quota_override | leave_employee_quota_override_account_type_person_id_leave__key | CREATE UNIQUE INDEX leave_employee_quota_override_account_type_person_id_leave__key ON public.leave_employee_quota_override USING btree (account_type, person_id, leave_type_id) |
| public | leave_employee_quota_override | leave_employee_quota_override_pkey | CREATE UNIQUE INDEX leave_employee_quota_override_pkey ON public.leave_employee_quota_override USING btree (override_id) |
| public | leave_role_quota | leave_role_quota_pkey | CREATE UNIQUE INDEX leave_role_quota_pkey ON public.leave_role_quota USING btree (role_quota_id) |
| public | leave_role_quota | leave_role_quota_role_name_leave_type_id_key | CREATE UNIQUE INDEX leave_role_quota_role_name_leave_type_id_key ON public.leave_role_quota USING btree (role_name, leave_type_id) |
| public | medication_administration | idx_mar_med_order | CREATE INDEX idx_mar_med_order ON public.medication_administration USING btree (med_order_id) |
| public | medication_administration | medication_administration_pkey | CREATE UNIQUE INDEX medication_administration_pkey ON public.medication_administration USING btree (mar_id) |
| public | medication_order | idx_medication_order_order | CREATE INDEX idx_medication_order_order ON public.medication_order USING btree (order_id) |
| public | medication_order | medication_order_pkey | CREATE UNIQUE INDEX medication_order_pkey ON public.medication_order USING btree (med_order_id) |
| public | medicine | idx_medicine_active | CREATE INDEX idx_medicine_active ON public.medicine USING btree (is_active) |
| public | medicine | idx_medicine_barcode | CREATE INDEX idx_medicine_barcode ON public.medicine USING btree (barcode) |
| public | medicine | idx_medicine_category_id | CREATE INDEX idx_medicine_category_id ON public.medicine USING btree (category_id) |
| public | medicine | idx_medicine_form_id | CREATE INDEX idx_medicine_form_id ON public.medicine USING btree (form_id) |
| public | medicine | idx_medicine_manufacturer_id | CREATE INDEX idx_medicine_manufacturer_id ON public.medicine USING btree (manufacturer_id) |
| public | medicine | idx_medicine_search_vector | CREATE INDEX idx_medicine_search_vector ON public.medicine USING gin (search_vector) |
| public | medicine | idx_medicine_sku | CREATE INDEX idx_medicine_sku ON public.medicine USING btree (sku) |
| public | medicine | medicine_barcode_key | CREATE UNIQUE INDEX medicine_barcode_key ON public.medicine USING btree (barcode) |
| public | medicine | medicine_pkey | CREATE UNIQUE INDEX medicine_pkey ON public.medicine USING btree (medicine_id) |
| public | medicine | medicine_sku_key | CREATE UNIQUE INDEX medicine_sku_key ON public.medicine USING btree (sku) |
| public | medicine_batch | medicine_batch_pkey | CREATE UNIQUE INDEX medicine_batch_pkey ON public.medicine_batch USING btree (batch_id) |
| public | medicine_batch | uk_batch_code | CREATE UNIQUE INDEX uk_batch_code ON public.medicine_batch USING btree (batch_code) |
| public | medicine_batch | uk_med_batch_party | CREATE UNIQUE INDEX uk_med_batch_party ON public.medicine_batch USING btree (medicine_id, batch_number, party_id) |
| public | medicine_category | medicine_category_name_unique_idx | CREATE UNIQUE INDEX medicine_category_name_unique_idx ON public.medicine_category USING btree (lower(btrim((name)::text))) |
| public | medicine_category | medicine_category_pkey | CREATE UNIQUE INDEX medicine_category_pkey ON public.medicine_category USING btree (category_id) |
| public | medicine_form | medicine_form_name_unique_idx | CREATE UNIQUE INDEX medicine_form_name_unique_idx ON public.medicine_form USING btree (lower(btrim((name)::text))) |
| public | medicine_form | medicine_form_pkey | CREATE UNIQUE INDEX medicine_form_pkey ON public.medicine_form USING btree (form_id) |
| public | medicine_manufacturer | medicine_manufacturer_name_unique_idx | CREATE UNIQUE INDEX medicine_manufacturer_name_unique_idx ON public.medicine_manufacturer USING btree (lower(btrim((name)::text))) |
| public | medicine_manufacturer | medicine_manufacturer_pkey | CREATE UNIQUE INDEX medicine_manufacturer_pkey ON public.medicine_manufacturer USING btree (manufacturer_id) |
| public | medicine_purchase | medicine_purchase_pkey | CREATE UNIQUE INDEX medicine_purchase_pkey ON public.medicine_purchase USING btree (purchase_id) |
| public | medicine_purchase_detail | medicine_purchase_detail_pkey | CREATE UNIQUE INDEX medicine_purchase_detail_pkey ON public.medicine_purchase_detail USING btree (id) |
| public | medicine_transaction | medicine_transaction_pkey | CREATE UNIQUE INDEX medicine_transaction_pkey ON public.medicine_transaction USING btree (txn_id) |
| public | menstrual_history | menstrual_history_pkey | CREATE UNIQUE INDEX menstrual_history_pkey ON public.menstrual_history USING btree (menstrual_history_id) |
| public | menstrual_history | uq_menstrual_history_patient_id | CREATE UNIQUE INDEX uq_menstrual_history_patient_id ON public.menstrual_history USING btree (patient_id) |
| public | nursing_note | idx_nursing_note_admission | CREATE INDEX idx_nursing_note_admission ON public.nursing_note USING btree (admission_id) |
| public | nursing_note | nursing_note_pkey | CREATE UNIQUE INDEX nursing_note_pkey ON public.nursing_note USING btree (note_id) |
| public | obstetric_history | obstetric_history_pkey | CREATE UNIQUE INDEX obstetric_history_pkey ON public.obstetric_history USING btree (obstetric_history_id) |
| public | obstetric_history | unique_patient_id_obs_history | CREATE UNIQUE INDEX unique_patient_id_obs_history ON public.obstetric_history USING btree (patient_id) |
| public | para_details | para_details_pkey | CREATE UNIQUE INDEX para_details_pkey ON public.para_details USING btree (para_id) |
| public | para_details | unique_obstetric_para | CREATE UNIQUE INDEX unique_obstetric_para ON public.para_details USING btree (obstetric_history_id, para_number) |
| public | party | party_pkey | CREATE UNIQUE INDEX party_pkey ON public.party USING btree (party_id) |
| public | party_payment | party_payment_pkey | CREATE UNIQUE INDEX party_payment_pkey ON public.party_payment USING btree (payment_id) |
| public | patient | patient_pkey | CREATE UNIQUE INDEX patient_pkey ON public.patient USING btree (patient_id) |
| public | patient | uq_patient_cnic | CREATE UNIQUE INDEX uq_patient_cnic ON public.patient USING btree (cnic) WHERE ((cnic IS NOT NULL) AND (btrim((cnic)::text) <> ''::text)) |
| public | patient_allergy | idx_patient_allergy_patient | CREATE INDEX idx_patient_allergy_patient ON public.patient_allergy USING btree (patient_id) WHERE is_active |
| public | patient_allergy | patient_allergy_pkey | CREATE UNIQUE INDEX patient_allergy_pkey ON public.patient_allergy USING btree (allergy_id) |
| public | patient_vitals | idx_patient_vitals_admission | CREATE INDEX idx_patient_vitals_admission ON public.patient_vitals USING btree (admission_id) |
| public | patient_vitals | patient_vitals_pkey | CREATE UNIQUE INDEX patient_vitals_pkey ON public.patient_vitals USING btree (vital_id) |
| public | patient_vitals | unique_patient_vitals | CREATE UNIQUE INDEX unique_patient_vitals ON public.patient_vitals USING btree (visit_id) |
| public | payroll_line_item | idx_payroll_line_item_person | CREATE INDEX idx_payroll_line_item_person ON public.payroll_line_item USING btree (account_type, person_id, created_at DESC) |
| public | payroll_line_item | payroll_line_item_pkey | CREATE UNIQUE INDEX payroll_line_item_pkey ON public.payroll_line_item USING btree (payroll_line_id) |
| public | payroll_line_item | uq_payroll_line_item_per_run | CREATE UNIQUE INDEX uq_payroll_line_item_per_run ON public.payroll_line_item USING btree (payroll_run_id, account_type, person_id) |
| public | payroll_run | payroll_run_pkey | CREATE UNIQUE INDEX payroll_run_pkey ON public.payroll_run USING btree (payroll_run_id) |
| public | payroll_run | uq_payroll_run_period_month | CREATE UNIQUE INDEX uq_payroll_run_period_month ON public.payroll_run USING btree (period_month) |
| public | pharmacy_customer | idx_pharmacy_customer_phone | CREATE INDEX idx_pharmacy_customer_phone ON public.pharmacy_customer USING btree (phone) |
| public | pharmacy_customer | pharmacy_customer_phone_key | CREATE UNIQUE INDEX pharmacy_customer_phone_key ON public.pharmacy_customer USING btree (phone) |
| public | pharmacy_customer | pharmacy_customer_pkey | CREATE UNIQUE INDEX pharmacy_customer_pkey ON public.pharmacy_customer USING btree (customer_id) |
| public | pharmacy_sale | pharmacy_sale_pkey | CREATE UNIQUE INDEX pharmacy_sale_pkey ON public.pharmacy_sale USING btree (sale_id) |
| public | pharmacy_sale_detail | pharmacy_sale_detail_pkey | CREATE UNIQUE INDEX pharmacy_sale_detail_pkey ON public.pharmacy_sale_detail USING btree (pharmacy_sale_detail_id) |
| public | pos_audit_log | idx_pos_audit_created | CREATE INDEX idx_pos_audit_created ON public.pos_audit_log USING btree (created_at) |
| public | pos_audit_log | idx_pos_audit_staff | CREATE INDEX idx_pos_audit_staff ON public.pos_audit_log USING btree (staff_id) |
| public | pos_audit_log | pos_audit_log_pkey | CREATE UNIQUE INDEX pos_audit_log_pkey ON public.pos_audit_log USING btree (log_id) |
| public | pos_held_transaction | pos_held_transaction_pkey | CREATE UNIQUE INDEX pos_held_transaction_pkey ON public.pos_held_transaction USING btree (hold_id) |
| public | pos_held_transaction_detail | pos_held_transaction_detail_pkey | CREATE UNIQUE INDEX pos_held_transaction_detail_pkey ON public.pos_held_transaction_detail USING btree (detail_id) |
| public | pos_receipt_config | pos_receipt_config_pkey | CREATE UNIQUE INDEX pos_receipt_config_pkey ON public.pos_receipt_config USING btree (config_id) |
| public | pos_session | idx_pos_session_staff | CREATE INDEX idx_pos_session_staff ON public.pos_session USING btree (staff_id) |
| public | pos_session | idx_pos_session_status | CREATE INDEX idx_pos_session_status ON public.pos_session USING btree (status) |
| public | pos_session | pos_session_pkey | CREATE UNIQUE INDEX pos_session_pkey ON public.pos_session USING btree (session_id) |
| public | prescription | idx_prescription_visit_id | CREATE INDEX idx_prescription_visit_id ON public.prescription USING btree (visit_id) |
| public | prescription | prescription_pkey | CREATE UNIQUE INDEX prescription_pkey ON public.prescription USING btree (prescription_id) |
| public | prescription | unique_visit_prescription | CREATE UNIQUE INDEX unique_visit_prescription ON public.prescription USING btree (visit_id) |
| public | prescription_fulfillment_action | idx_prescription_fulfillment_action_prescription_medicine | CREATE INDEX idx_prescription_fulfillment_action_prescription_medicine ON public.prescription_fulfillment_action USING btree (prescription_medicine_id) |
| public | prescription_fulfillment_action | idx_prescription_fulfillment_action_visit | CREATE INDEX idx_prescription_fulfillment_action_visit ON public.prescription_fulfillment_action USING btree (visit_id) |
| public | prescription_fulfillment_action | prescription_fulfillment_action_pkey | CREATE UNIQUE INDEX prescription_fulfillment_action_pkey ON public.prescription_fulfillment_action USING btree (fulfillment_action_id) |
| public | prescription_medicines | prescription_medicines_pkey | CREATE UNIQUE INDEX prescription_medicines_pkey ON public.prescription_medicines USING btree (prescription_medicine_id) |
| public | purchase_return | purchase_return_pkey | CREATE UNIQUE INDEX purchase_return_pkey ON public.purchase_return USING btree (return_id) |
| public | purchase_return_detail | purchase_return_detail_pkey | CREATE UNIQUE INDEX purchase_return_detail_pkey ON public.purchase_return_detail USING btree (id) |
| public | room | idx_room_ward | CREATE INDEX idx_room_ward ON public.room USING btree (ward_id) |
| public | room | room_pkey | CREATE UNIQUE INDEX room_pkey ON public.room USING btree (room_id) |
| public | room | uq_room_ward_number | CREATE UNIQUE INDEX uq_room_ward_number ON public.room USING btree (ward_id, room_number) |
| public | sale_return | sale_return_pkey | CREATE UNIQUE INDEX sale_return_pkey ON public.sale_return USING btree (return_id) |
| public | sale_return_detail | sale_return_detail_pkey | CREATE UNIQUE INDEX sale_return_detail_pkey ON public.sale_return_detail USING btree (id) |
| public | staff | idx_staff_department | CREATE INDEX idx_staff_department ON public.staff USING btree (department) |
| public | staff | idx_staff_employment_status | CREATE INDEX idx_staff_employment_status ON public.staff USING btree (employment_status) |
| public | staff | idx_staff_facility_branch | CREATE INDEX idx_staff_facility_branch ON public.staff USING btree (facility_code, branch_code) |
| public | staff | staff_pkey | CREATE UNIQUE INDEX staff_pkey ON public.staff USING btree (staff_id) |
| public | staff_attendance | idx_staff_attendance_date_derived_status | CREATE INDEX idx_staff_attendance_date_derived_status ON public.staff_attendance USING btree (date, derived_status) |
| public | staff_attendance | idx_staff_attendance_date_staff | CREATE INDEX idx_staff_attendance_date_staff ON public.staff_attendance USING btree (date, staff_id) |
| public | staff_attendance | idx_staff_attendance_roster_id | CREATE INDEX idx_staff_attendance_roster_id ON public.staff_attendance USING btree (roster_id) |
| public | staff_attendance | idx_staff_attendance_staff_date | CREATE INDEX idx_staff_attendance_staff_date ON public.staff_attendance USING btree (staff_id, date DESC) |
| public | staff_attendance | staff_attendance_pkey | CREATE UNIQUE INDEX staff_attendance_pkey ON public.staff_attendance USING btree (attendance_id) |
| public | staff_attendance | staff_attendance_staff_id_date_key | CREATE UNIQUE INDEX staff_attendance_staff_id_date_key ON public.staff_attendance USING btree (staff_id, date) |
| public | staff_leave_approvals | staff_leave_approvals_pkey | CREATE UNIQUE INDEX staff_leave_approvals_pkey ON public.staff_leave_approvals USING btree (approval_id) |
| public | staff_leave_approvals | uq_staff_leave_approval_level | CREATE UNIQUE INDEX uq_staff_leave_approval_level ON public.staff_leave_approvals USING btree (leave_request_id, level_no, approver_staff_id) |
| public | staff_leave_balances | staff_leave_balances_pkey | CREATE UNIQUE INDEX staff_leave_balances_pkey ON public.staff_leave_balances USING btree (balance_id) |
| public | staff_leave_balances | uq_staff_leave_balance_account_person | CREATE UNIQUE INDEX uq_staff_leave_balance_account_person ON public.staff_leave_balances USING btree (account_type, person_id, leave_type_id, period_year) |
| public | staff_leave_requests | idx_staff_leave_requests_person_status | CREATE INDEX idx_staff_leave_requests_person_status ON public.staff_leave_requests USING btree (account_type, person_id, request_status, requested_at DESC) |
| public | staff_leave_requests | idx_staff_leave_requests_range | CREATE INDEX idx_staff_leave_requests_range ON public.staff_leave_requests USING btree (from_date, to_date, request_status) |
| public | staff_leave_requests | idx_staff_leave_requests_staff_status | CREATE INDEX idx_staff_leave_requests_staff_status ON public.staff_leave_requests USING btree (staff_id, request_status, requested_at DESC) |
| public | staff_leave_requests | staff_leave_requests_pkey | CREATE UNIQUE INDEX staff_leave_requests_pkey ON public.staff_leave_requests USING btree (leave_request_id) |
| public | staff_leave_types | staff_leave_types_leave_code_key | CREATE UNIQUE INDEX staff_leave_types_leave_code_key ON public.staff_leave_types USING btree (leave_code) |
| public | staff_leave_types | staff_leave_types_pkey | CREATE UNIQUE INDEX staff_leave_types_pkey ON public.staff_leave_types USING btree (leave_type_id) |
| public | staff_permission_audit | idx_staff_permission_audit_created_at | CREATE INDEX idx_staff_permission_audit_created_at ON public.staff_permission_audit USING btree (created_at DESC) |
| public | staff_permission_audit | staff_permission_audit_pkey | CREATE UNIQUE INDEX staff_permission_audit_pkey ON public.staff_permission_audit USING btree (event_id) |
| public | staff_permission_policies | staff_permission_policies_pkey | CREATE UNIQUE INDEX staff_permission_policies_pkey ON public.staff_permission_policies USING btree (policy_id) |
| public | staff_permission_policies | uq_staff_permission_policy | CREATE UNIQUE INDEX uq_staff_permission_policy ON public.staff_permission_policies USING btree (COALESCE(staff_id, 0), COALESCE(role_id, 0), module, action, scope_type, COALESCE(scope_value, ''::character varying)) |
| public | staff_permissions | staff_permissions_pkey | CREATE UNIQUE INDEX staff_permissions_pkey ON public.staff_permissions USING btree (permission_id) |
| public | staff_permissions | staff_permissions_staff_id_module_key | CREATE UNIQUE INDEX staff_permissions_staff_id_module_key ON public.staff_permissions USING btree (staff_id, module) |
| public | staff_role_assignments | idx_staff_role_assignments_role | CREATE INDEX idx_staff_role_assignments_role ON public.staff_role_assignments USING btree (role_id, effective_to) |
| public | staff_role_assignments | idx_staff_role_assignments_staff | CREATE INDEX idx_staff_role_assignments_staff ON public.staff_role_assignments USING btree (staff_id, effective_to) |
| public | staff_role_assignments | staff_role_assignments_pkey | CREATE UNIQUE INDEX staff_role_assignments_pkey ON public.staff_role_assignments USING btree (assignment_id) |
| public | staff_roles | staff_roles_pkey | CREATE UNIQUE INDEX staff_roles_pkey ON public.staff_roles USING btree (role_id) |
| public | staff_roles | staff_roles_role_code_key | CREATE UNIQUE INDEX staff_roles_role_code_key ON public.staff_roles USING btree (role_code) |
| public | staff_roster_assignments | idx_staff_roster_account_person_date | CREATE INDEX idx_staff_roster_account_person_date ON public.staff_roster_assignments USING btree (account_type, person_id, roster_date DESC) |
| public | staff_roster_assignments | idx_staff_roster_date | CREATE INDEX idx_staff_roster_date ON public.staff_roster_assignments USING btree (roster_date, department) |
| public | staff_roster_assignments | staff_roster_assignments_pkey | CREATE UNIQUE INDEX staff_roster_assignments_pkey ON public.staff_roster_assignments USING btree (roster_id) |
| public | staff_roster_assignments | uq_staff_roster_account_person_date | CREATE UNIQUE INDEX uq_staff_roster_account_person_date ON public.staff_roster_assignments USING btree (account_type, person_id, roster_date) |
| public | staff_roster_assignments | uq_staff_roster_staff_date | CREATE UNIQUE INDEX uq_staff_roster_staff_date ON public.staff_roster_assignments USING btree (staff_id, roster_date) |
| public | staff_security_sessions | idx_staff_security_sessions_last_seen | CREATE INDEX idx_staff_security_sessions_last_seen ON public.staff_security_sessions USING btree (last_seen_at DESC) |
| public | staff_security_sessions | idx_staff_security_sessions_staff_revoked | CREATE INDEX idx_staff_security_sessions_staff_revoked ON public.staff_security_sessions USING btree (staff_id, revoked_at) |
| public | staff_security_sessions | staff_security_sessions_pkey | CREATE UNIQUE INDEX staff_security_sessions_pkey ON public.staff_security_sessions USING btree (session_id) |
| public | staff_shift_templates | staff_shift_templates_pkey | CREATE UNIQUE INDEX staff_shift_templates_pkey ON public.staff_shift_templates USING btree (shift_template_id) |
| public | staff_shift_templates | staff_shift_templates_shift_code_key | CREATE UNIQUE INDEX staff_shift_templates_shift_code_key ON public.staff_shift_templates USING btree (shift_code) |
| public | system_settings | system_settings_pkey | CREATE UNIQUE INDEX system_settings_pkey ON public.system_settings USING btree (setting_key) |
| public | visit | idx_visit_timestamp | CREATE INDEX idx_visit_timestamp ON public.visit USING btree (visit_timestamp) |
| public | visit | visit_pkey | CREATE UNIQUE INDEX visit_pkey ON public.visit USING btree (visit_id) |
| public | visit_status_history | visit_status_history_pkey | CREATE UNIQUE INDEX visit_status_history_pkey ON public.visit_status_history USING btree (visit_status_id) |
| public | ward | ward_pkey | CREATE UNIQUE INDEX ward_pkey ON public.ward USING btree (ward_id) |
