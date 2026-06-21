# Samples (3 rows per non-empty table)

## allowance_type_master

| code | label | description | taxable | created_at | updated_at |
| --- | --- | --- | --- | --- | --- |
| transport | Transport Allowance | Recurring or ad-hoc transport support | true | "2026-03-24T16:56:15.286Z" | "2026-03-24T16:56:15.286Z" |
| meal | Meal Allowance | Meal subsidy or food support | true | "2026-03-24T16:56:15.286Z" | "2026-03-24T16:56:15.286Z" |
| housing | Housing Allowance | Rent or housing support | true | "2026-03-24T16:56:15.286Z" | "2026-03-24T16:56:15.286Z" |



## audit_logs

| log_id | staff_id | action | entity_type | entity_id | details | ip_address | created_at |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3ddfb4f2-56d2-479f-9e81-09fca00e73a8 | 6 | Attendance check-in marked | staff_attendance | d9d5b4fa-dbc3-4d8e-bf49-40a68ae6709d | {"date":"2026-03-23","event":"check_in","staffId":1,"markedBy":"System Trigger"} |  | "2026-03-23T14:54:35.401Z" |
| f1ae28c9-46f9-4fc3-acb5-c457887b1d6f |  | Logout | auth | DOC001 | {"ip":"::1","role":"Doctor","outcome":"success","userCode":"DOC001","userAgent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"} |  | "2026-03-23T23:35:42.849Z" |
| 692a29ea-7a4b-4990-8894-0de760f838ae |  | Login success | auth | DOC002 | {"ip":"::1","role":"Doctor","outcome":"success","userCode":"DOC002","userName":"Dr. Fatima Ali","userAgent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"} |  | "2026-03-23T23:39:14.928Z" |



## bed

| bed_id | room_id | bed_number | daily_rate | status | is_active | created_at |
| --- | --- | --- | --- | --- | --- | --- |
| 5 | 5 | SCN-B1 | 2000 | vacant | true | "2026-06-20T09:56:52.299Z" |



## bill

| bill_id | patient_id | visit_id | total_amount | payment_status | created_at |
| --- | --- | --- | --- | --- | --- |
| 1 | 6 | 7 | 0.00 | Unpaid | "2026-02-06T21:49:17.488Z" |
| 2 | 1 | 8 | 0.00 | Unpaid | "2026-02-06T21:49:45.352Z" |
| 3 | 6 | 9 | 0.00 | Unpaid | "2026-02-08T08:31:32.045Z" |



## current_pregnancy

| pregnancy_id | patient_id | visit_id | multiple_pregnancy | complications | ultrasound_findings | fetal_heart_rate_bpm | placenta_position | presentation | gestational_age_weeks | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 6 | 6 |  |  |  | 150 | Anterior | Cephalic | 12 | Baby is doing great |



## doctor

| doctor_id | user_code | password | doctor_name | specialization | education | consultation_fee | emergency_fee | contact_number | email | created_at | employment_status | failed_login_attempts | last_failed_login_at | account_locked_until | last_login_at | password_changed_at | password_reset_token | password_reset_expires_at | mfa_enabled | session_version |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | DOC003 | password123 | Dr. Ali Raza | General Medicine | MBBS | 1000.00 | 2000.00 | 03001230003 | ali.raza@example.com | "2026-02-06T06:42:40.173Z" | active | 0 |  |  |  | "2026-03-24T01:36:16.409Z" |  |  | false | 1 |
| 4 | DOC004 | password123 | Dr. Sara Malik | Pediatrics | MBBS, FCPS | 1200.00 | 2500.00 | 03001230004 | sara.malik@example.com | "2026-02-06T06:42:40.173Z" | active | 0 |  |  |  | "2026-03-24T01:36:16.409Z" |  |  | false | 1 |
| 5 | DOC005 | password123 | Dr. Omar Siddiqui | Orthopedics | MBBS, MS | 1800.00 | 3500.00 | 03001230005 | omar.siddiqui@example.com | "2026-02-06T06:42:40.173Z" | active | 0 |  |  |  | "2026-03-24T01:36:16.409Z" |  |  | false | 1 |



## doctor_attendance

| attendance_id | doctor_id | date | check_in_time | check_out_time | status | marked_by | admin_id | roster_id | shift_code | check_in_source | check_out_source | late_minutes | early_leave_minutes | overtime_minutes | break_minutes | attendance_notes | derived_status | is_unscheduled | is_on_time | policy_snapshot |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fe617cfc-8a47-49f2-957e-f0a63bd9fa63 | 2 | "2026-03-23T19:00:00.000Z" | "2026-03-24T09:34:06.618Z" | "2026-03-24T09:41:24.978Z" | Present | Doctor |  |  |  | self | self | 0 | 0 | 0 | 0 |  | unscheduled | true | false | {"timezone":"Asia/Karachi","grace_minutes":15,"half_day_minutes":240,"overtime_minutes":30,"early_leave_minutes":30} |
| 9f527bb5-5172-49ab-b69b-09fce9bc4ce1 | 2 | "2026-03-24T19:00:00.000Z" | "2026-03-24T23:57:10.633Z" |  | Present | Doctor |  |  |  | self |  | 0 | 0 | 0 | 0 |  | unscheduled | true | false | {"timezone":"Asia/Karachi","grace_minutes":15,"half_day_minutes":240,"overtime_minutes":30,"early_leave_minutes":30} |
| 21d6e952-21d4-4039-85a9-9146c84b017f | 2 | "2026-03-25T19:00:00.000Z" | "2026-03-26T03:30:00.787Z" |  | Present | Doctor |  | 611 | SHF112 | self |  | 315 | 0 | 0 | 0 |  | late | false | false | {"timezone":"Asia/Karachi","grace_minutes":15,"half_day_minutes":240,"overtime_minutes":30,"early_leave_minutes":30} |



## doctor_encounter_note

| doctor_encounter_note_id | visit_id | patient_id | doctor_id | reception_complaint | doctor_note | created_at | updated_at |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2 | 2 | 3 | Fever and Bodyache |  | "2026-03-19T03:18:41.701Z" | "2026-03-19T03:18:41.701Z" |
| 2 | 3 | 3 | 5 | Fracture in right arm |  | "2026-03-19T03:18:41.701Z" | "2026-03-19T03:18:41.701Z" |
| 3 | 4 | 4 | 1 | Prenatal Scan |  | "2026-03-19T03:18:41.701Z" | "2026-03-19T03:18:41.701Z" |



## doctor_security_sessions

| session_id | doctor_id | user_code | role | login_at | last_seen_at | ip_address | user_agent | revoked_at | revoked_reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a1d014ad-d60c-4ca9-bb29-414077d76043 | 1 | DOC001 | Doctor | "2026-03-24T01:42:13.303Z" | "2026-03-24T01:42:13.303Z" | ::1 | Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 | "2026-03-24T01:47:47.598Z" | forced_logout |
| a38f4b93-7f73-400f-84e9-562f5b676394 | 1 | DOC001 | Doctor | "2026-03-24T01:50:37.030Z" | "2026-03-24T01:50:37.030Z" | ::1 | Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 | "2026-03-24T01:54:40.027Z" | forced_logout |
| cab75e59-d7f6-435a-a61d-fcb1a24785d7 | 1 | DOC001 | Doctor | "2026-03-24T02:19:27.981Z" | "2026-03-24T02:19:27.981Z" | ::1 | Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 | "2026-03-24T02:23:29.026Z" | forced_logout |



## employee_compensation_profile

| compensation_id | account_type | person_id | staff_id | doctor_id | salary_model | payroll_cycle | base_monthly_salary | per_patient_fee | active_from | active_to | notes | created_at | updated_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | staff | 3 | 3 |  | fixed_monthly | monthly | 0.00 | 0.00 | "2026-03-23T19:00:00.000Z" |  | Backfill: default fixed monthly profile | "2026-03-24T11:54:46.054Z" | "2026-03-24T11:54:46.054Z" |
| 3 | staff | 4 | 4 |  | fixed_monthly | monthly | 0.00 | 0.00 | "2026-03-23T19:00:00.000Z" |  | Backfill: default fixed monthly profile | "2026-03-24T11:54:46.054Z" | "2026-03-24T11:54:46.054Z" |
| 5 | staff | 7 | 7 |  | fixed_monthly | monthly | 0.00 | 0.00 | "2026-03-23T19:00:00.000Z" |  | Backfill: default fixed monthly profile | "2026-03-24T11:54:46.054Z" | "2026-03-24T11:54:46.054Z" |



## employee_credential_types

| credential_type_id | credential_code | credential_name | credential_category | issuing_authority_default | validity_months | renewal_window_days | active | created_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | MED_LICENSE | Medical License | license | Medical Council | 12 | 90 | true | "2026-03-25T07:19:58.634Z" |
| 2 | BLS | Basic Life Support | certification | Accredited Provider | 24 | 60 | true | "2026-03-25T07:19:58.634Z" |
| 3 | ACLS | Advanced Cardiac Life Support | certification | Accredited Provider | 24 | 60 | true | "2026-03-25T07:19:58.634Z" |



## employee_document_types

| document_type_id | document_code | document_name | document_category | required_default | requires_expiry | retention_days | active | created_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ID_PROOF | Government ID Proof | identity | true | false | 3650 | true | "2026-03-25T07:19:58.634Z" |
| 2 | CONTRACT | Employment Contract | employment | true | false | 3650 | true | "2026-03-25T07:19:58.634Z" |
| 3 | LICENSE_COPY | Professional License Copy | compliance | true | true | 3650 | true | "2026-03-25T07:19:58.634Z" |



## employee_lifecycle_template_tasks

| lifecycle_template_task_id | lifecycle_template_id | task_code | task_name | task_group | sequence_no | default_owner_role | mandatory | due_offset_days | requires_document_type_id | blocks_transition | metadata | created_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | CREATE_ACCOUNT | Create User Account | it | 1 | Admin | true | 0 |  | true | {"module":"access"} | "2026-03-25T07:19:58.634Z" |
| 2 | 1 | COLLECT_DOCS | Collect Mandatory Documents | hr | 2 | Admin | true | 7 |  | true | {"module":"documents"} | "2026-03-25T07:19:58.634Z" |
| 3 | 1 | VERIFY_CREDENTIALS | Verify Credentials | compliance | 3 | Admin | true | 14 |  | true | {"module":"credentialing"} | "2026-03-25T07:19:58.634Z" |



## employee_lifecycle_templates

| lifecycle_template_id | template_code | template_name | lifecycle_type | applies_to | role_code | department | facility_code | is_active | metadata | created_by | created_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ONBOARD_STD | Standard Onboarding | onboarding | both |  |  |  | true | {"version":"v1"} |  | "2026-03-25T07:19:58.634Z" |
| 2 | OFFBOARD_STD | Standard Offboarding | offboarding | both |  |  |  | true | {"version":"v1"} |  | "2026-03-25T07:19:58.634Z" |



## finance_expense_category

| code | label | description | created_at | updated_at |
| --- | --- | --- | --- | --- |
| utilities | Utilities | Electricity, water, internet and utility bills | "2026-03-24T16:56:15.286Z" | "2026-03-24T16:56:15.286Z" |
| inventory | Inventory | General inventory not tracked as medicine purchase | "2026-03-24T16:56:15.286Z" | "2026-03-24T16:56:15.286Z" |
| maintenance | Maintenance | Repairs and upkeep | "2026-03-24T16:56:15.286Z" | "2026-03-24T16:56:15.286Z" |



## lab_test

| test_id | test_name | category | price | description |
| --- | --- | --- | --- | --- |
| 1 | Complete Blood Count | Hematology | 800.00 | Comprehensive blood panel |
| 2 | Blood Glucose | Biochemistry | 300.00 | Fasting or Random sugar test |
| 3 | Pregnancy Test (Urine) | Serology | 500.00 | Urine HCG test |



## lab_test_parameters

| parameter_id | test_id | parameter_name | parameter_code | unit | input_type | reference_range_min | reference_range_max | reference_value_text | display_order | is_critical | is_required | created_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | Haemoglobin | HB | g/dL | number | 12.00 | 16.00 |  | 0 | false | true | "2026-02-06T06:42:40.173Z" |
| 2 | 1 | WBC Count | WBC | x10^9/L | number | 4.00 | 11.00 |  | 0 | false | true | "2026-02-06T06:42:40.173Z" |
| 3 | 2 | Glucose (Fasting) | GLU_F | mg/dL | number | 70.00 | 110.00 |  | 0 | false | true | "2026-02-06T06:42:40.173Z" |



## leave_role_quota

| role_quota_id | role_name | leave_type_id | annual_quota | active | created_at | updated_at |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Receptionist | 1 | 12.00 | true | "2026-03-24T11:51:29.557Z" | "2026-03-24T11:51:29.557Z" |
| 2 | Lab_Technician | 1 | 12.00 | true | "2026-03-24T11:51:29.557Z" | "2026-03-24T11:51:29.557Z" |
| 3 | Admin | 1 | 12.00 | true | "2026-03-24T11:51:29.557Z" | "2026-03-24T11:51:29.557Z" |



## medicine

| medicine_id | generic_name | brand_name | category | dosage_value | dosage_unit | form | created_at | barcode | sku | manufacturer | min_stock_level | max_stock_level | is_active | requires_prescription | search_vector | sub_unit | sub_units_per_unit | sub_unit_price | allow_sub_unit_sale | category_id | manufacturer_id | form_id | is_controlled | controlled_schedule |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 9 | Azithromycin | Azomax | Antibiotic | 250.00 | mg | Capsule | "2026-03-19T02:00:12.700Z" | HMS-AZOMAX-250 | AZOMAX-250 | Getz | 12 | 300 | true | true | 'antibiot':3B 'azithromycin':1A 'azomax':2A | Blister | 6 | 18.00 | true | 3 | 2 | 3 | false |  |
| 10 | Loratadine | Claritek | Antihistamine | 10.00 | mg | Tablet | "2026-03-19T02:00:12.700Z" | HMS-CLARITEK-10 | CLARITEK-10 | Abbott | 8 | 200 | true | false | 'antihistamin':3B 'claritek':2A 'loratadin':1A | Strip | 10 | 2.20 | true | 4 | 1 | 2 | false |  |
| 11 | Esomeprazole | Nexum | Gastroprotective | 20.00 | mg | Capsule | "2026-03-19T02:00:12.700Z" | HMS-NEXUM-20 | NEXUM-20 | GSK | 10 | 250 | true | false | 'esomeprazol':1A 'gastroprotect':3B 'nexum':2A | Strip | 10 | 5.50 | true | 2 | 3 | 3 | false |  |



## medicine_batch

| batch_id | medicine_id | stock_quantity | stock_sub_quantity | purchase_price | purchase_sub_unit_price | sale_price | sale_sub_unit_price | expiry_date | batch_number | received_date | party_id | batch_code |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 8 | 7 | 0 | 0 | 180.00 | 180.00 | 240.00 | 240.00 | "2027-10-30T19:00:00.000Z" | BCH007 | "2026-03-19T02:00:12.700Z" |  | BATCH-00000006 |
| 10 | 10 | 0 | 5 | 14.00 | 1.40 | 22.00 | 2.20 | "2027-05-30T19:00:00.000Z" | BCH010 | "2026-03-19T02:00:12.700Z" |  | BATCH-00000008 |
| 2 | 2 | 14 | 0 | 18.00 | 1.80 | 25.00 | 2.50 | "2026-12-30T19:00:00.000Z" | BCH002 | "2026-02-06T06:42:40.173Z" | 1 | BATCH-00000001 |



## medicine_category

| category_id | name | is_active | created_at |
| --- | --- | --- | --- |
| 1 | Bronchodilator | true | "2026-03-18T04:40:32.673Z" |
| 2 | Gastroprotective | true | "2026-03-18T04:40:32.673Z" |
| 3 | Antibiotic | true | "2026-03-18T04:40:32.673Z" |



## medicine_form

| form_id | name | is_active | created_at |
| --- | --- | --- | --- |
| 1 | Inhaler | true | "2026-03-18T04:40:32.673Z" |
| 2 | Tablet | true | "2026-03-18T04:40:32.673Z" |
| 3 | Capsule | true | "2026-03-18T04:40:32.673Z" |



## medicine_manufacturer

| manufacturer_id | name | is_active | created_at |
| --- | --- | --- | --- |
| 1 | Abbott | true | "2026-03-18T04:40:32.673Z" |
| 2 | Getz | true | "2026-03-18T04:40:32.673Z" |
| 3 | GSK | true | "2026-03-18T04:40:32.673Z" |



## medicine_purchase

| purchase_id | party_id | invoice_no | invoice_timestamp | total_amount | payment_status | created_at | created_by | paid_amount |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | 1 | INV-7819 | "2026-03-03T15:32:57.241Z" | 25.00 | Paid | "2026-03-03T15:32:57.241Z" | 1 | 0.00 |
| 4 | 1 | INV-7820 | "2026-03-04T13:24:51.307Z" | 10.00 | Paid | "2026-03-04T13:24:51.307Z" | 1 | 0.00 |
| 5 | 2 | INV-7821 | "2026-03-18T21:09:08.581Z" | 10090.00 | Paid | "2026-03-18T21:09:08.581Z" | 1 | 0.00 |



## medicine_purchase_detail

| id | purchase_id | medicine_id | quantity | unit_cost | sub_quantity | sub_unit_cost | batch_id |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 3 | 1 | 1 | 10.00 | 0 | 1.0 | 1 |
| 2 | 3 | 4 | 1 | 15.00 | 0 | 1.5 | 4 |
| 3 | 4 | 1 | 1 | 10.00 | 0 | 1.0 | 1 |



## medicine_transaction

| txn_id | medicine_id | txn_type | quantity | amount_per_unit | ref_purchase_id | ref_sale_id | ref_purchase_return | ref_sale_return | created_at | sub_quantity | batch_id |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | sale | 1 | 15.00 |  | 2 |  |  | "2026-02-06T05:40:55.360Z" | 0 | 1 |
| 2 | 7 | sale | 1 | 250.00 |  | 3 |  |  | "2026-02-09T22:39:00.912Z" | 0 |  |
| 3 | 1 | sale | 0 | 15.00 |  | 4 |  |  | "2026-03-03T04:15:26.697Z" | 1 | 1 |



## menstrual_history

| menstrual_history_id | patient_id | menarch_age | cycle_length_days | bleeding_days | menstrual_regular | contraception_history | gynecologic_surgeries | medical_conditions | menopause_status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 6 | 13 | 28 | 5 | true | None |  |  |  | Normal cycles |



## obstetric_history

| obstetric_history_id | patient_id | is_first_pregnancy | married_years | gravida | para | abortions | edd | last_menstrual_cycle | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 6 | false | 4 | 2 | 1 | 0 | "2026-08-05T19:00:00.000Z" | "2025-11-05T19:00:00.000Z" | Second pregnancy |



## para_details

| para_id | obstetric_history_id | para_number | birth_year | birth_month | gender | delivery_type | alive | birth_weight_grams | complications | notes | gestational_age_weeks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 1 | 2022 | 5 | Female | SVD | true | 3200 |  |  | 39 |



## party

| party_id | name | contact_number | address | created_at | email | gst_number | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | GSK Pharmaceuticals | 021-3234567 | West Wharf Rd, Karachi | "2026-02-06T06:42:40.173Z" |  |  | true |
| 2 | Getz Pharma | 021-3864313 | Korangi, Karachi | "2026-02-06T06:42:40.173Z" |  |  | true |
| 3 | Searle Company | 021-3506922 | Port Qasim, Karachi | "2026-02-06T06:42:40.173Z" |  |  | true |



## party_payment

| payment_id | party_id | amount | payment_date | payment_method | reference_note | created_at | created_by |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2 | 9999.00 | "2026-03-18T21:10:09.644Z" | Bank Transfer | 0264225635 | "2026-03-18T21:10:09.644Z" | 1 |



## patient

| patient_id | patient_name | age | gender | contact_number | cnic | address | created_at |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Alice Johnson | 28 | Female | 03001234567 | 42101-1234567-1 | Karachi | "2026-02-06T06:42:40.173Z" |
| 2 | Bob Smith | 35 | Male | 03007654321 | 42101-7654321-2 | Lahore | "2026-02-06T06:42:40.173Z" |
| 3 | Charlie Brown | 42 | Male | 03009876543 | 42101-9876543-3 | Islamabad | "2026-02-06T06:42:40.173Z" |



## patient_vitals

| vital_id | visit_id | blood_pressure | heart_rate | temperature | weight | height | recorded_at | blood_group | admission_id |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 120/80 | 72 | 99 | 65 | 165 | "2026-02-06T06:42:40.173Z" | A+ |  |
| 2 | 2 | 130/85 | 80 | 102 | 75 | 175 | "2026-02-06T06:42:40.173Z" | B+ |  |
| 3 | 3 | 110/70 | 85 | 98 | 82 | 180 | "2026-02-06T06:42:40.173Z" | O- |  |



## payroll_line_item

| payroll_line_id | payroll_run_id | account_type | person_id | staff_id | doctor_id | salary_model | base_amount | patient_count | per_patient_fee | allowance_total | deduction_total | adjustment_total | gross_amount | net_amount | calc_snapshot | created_at | updated_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 49 | 1 | doctor | 1 |  | 1 | per_patient_seen | 3000.00 | 2 | 1500.00 | 0.00 | 0.00 | 0.00 | 3000.00 | 3000.00 | {"allowances":[],"period_month":"2026-03","salary_model":"per_patient_seen"} | "2026-03-24T14:42:58.275Z" | "2026-03-24T14:42:58.275Z" |
| 50 | 1 | doctor | 2 |  | 2 | per_patient_seen | 0.00 | 0 | 2000.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | {"allowances":[],"period_month":"2026-03","salary_model":"per_patient_seen"} | "2026-03-24T14:42:58.275Z" | "2026-03-24T14:42:58.275Z" |
| 51 | 1 | doctor | 3 |  | 3 | per_patient_seen | 0.00 | 0 | 1000.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | {"allowances":[],"period_month":"2026-03","salary_model":"per_patient_seen"} | "2026-03-24T14:42:58.275Z" | "2026-03-24T14:42:58.275Z" |



## payroll_run

| payroll_run_id | period_month | status | generated_by | finalized_by | generated_at | finalized_at | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | "2026-02-28T19:00:00.000Z" | draft | 6 |  | "2026-03-24T14:42:58.275Z" |  |  |
| 2 | "2026-03-31T19:00:00.000Z" | draft | 6 |  | "2026-04-02T07:14:01.768Z" |  |  |



## pharmacy_sale

| sale_id | visit_id | bill_id | sale_timestamp | handled_by | total_amount | status | payment_type | payment_reference | paid_amount | due_amount | change_amount | discount_percent | discount_amount | tax_amount | is_prescription_sale | prescription_id | notes | customer_id | settlement_channel | settlement_status | settled_at | settled_by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 64 |  |  | "2026-03-23T12:32:35.534Z" | 2 | 31.00 | Completed | CASH | TXN-1774287154915-172 | 50.00 | 0.00 | 19.00 | 0.00 | 0.00 | 0.00 | false |  |  |  | pharmacy | settled | "2026-03-23T17:32:36.031Z" | 2 |
| 67 | 67 | 59 | "2026-03-29T22:57:41.300Z" | 2 | 96.00 | Completed | CASH | TXN-1774843059541-341 | 100.00 | 0.00 | 4.00 | 0.00 | 0.00 | 0.00 | true | 7 |  |  | pharmacy | settled | "2026-03-30T03:57:41.830Z" | 2 |
| 70 |  |  | "2026-04-02T06:31:58.647Z" | 2 | 131.00 | Completed | CASH | TXN-1775129516666-805 | 150.00 | 0.00 | 19.00 | 0.00 | 0.00 | 0.00 | false |  |  |  | pharmacy | settled | "2026-04-02T11:31:59.173Z" | 2 |



## pharmacy_sale_detail

| pharmacy_sale_detail_id | sale_id | medicine_id | quantity | unit_sale_price | line_total | discount_percent | discount_amount | sub_unit_sale_price | sub_quantity | batch_id | prescription_medicine_id | reason_code | reason_note | handled_by | created_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2 | 1 | 1 | 15.00 | 15.00 | 0.00 | 0.00 | 1.50 | 0 | 1 |  |  |  |  | "2026-03-19T08:36:12.159Z" |
| 2 | 3 | 7 | 1 | 250.00 | 250.00 | 0.00 | 0.00 | 250.00 | 0 |  |  |  |  |  | "2026-03-19T08:36:12.159Z" |
| 3 | 4 | 1 | 0 | 15.00 | 1.50 | 0.00 | 0.00 | 1.50 | 1 | 1 |  |  |  |  | "2026-03-19T08:36:12.159Z" |



## pos_audit_log

| log_id | staff_id | action_type | sale_id | description | ip_address | user_agent | created_at |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | SALE_COMPLETED | 2 | Completed sale TXN-1770374452467-584 with 1 items |  |  | "2026-02-06T05:40:55.360Z" |
| 2 | 1 | CASH_DRAWER_OPENED |  | Cash drawer manually opened |  |  | "2026-02-06T05:41:01.056Z" |
| 3 | 1 | SALE_COMPLETED | 3 | Completed sale TXN-1770694739052-189 with 1 items |  |  | "2026-02-09T22:39:00.912Z" |



## pos_held_transaction

| hold_id | staff_id | customer_name | customer_phone | hold_timestamp | retrieved_timestamp | total_amount | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 1 |  |  | "2026-03-22T02:20:55.972Z" |  | 1.55 | retrieved | Held by Current User |
| 1 | 1 |  |  | "2026-02-08T08:33:16.308Z" |  | 37.50 | retrieved | Held by Current User |
| 3 | 1 |  |  | "2026-03-22T05:34:57.371Z" |  | 15.50 | retrieved | Held by Current User |



## pos_held_transaction_detail

| detail_id | hold_id | medicine_id | qty | sub_qty | unit_price | discount_percent | line_total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 1 | 0 | 25 | 15.00 | 0.00 | 37.50 |
| 2 | 2 | 1 | 0 | 1 | 15.50 | 0.00 | 1.55 |
| 3 | 3 | 1 | 1 | 0 | 15.50 | 0.00 | 15.50 |



## pos_receipt_config

| config_id | clinic_name | clinic_address | clinic_phone | clinic_email | tax_registration_number | receipt_header | receipt_footer | logo_url | printer_name | paper_size | is_active | created_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Medixa | 35HM+388, Sadaat Colony, Muzaffargarh | 034567654321 |  |  | Welcome to our Clinic | Get Well Soon |  |  | 80mm | true | "2026-02-06T06:42:40.173Z" |



## pos_session

| session_id | staff_id | opening_time | closing_time | opening_balance | closing_balance | expected_balance | cash_sales_total | card_sales_total | total_sales_count | notes | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 4 | "2026-02-06T06:42:40.173Z" |  | 5000.00 |  |  | 0.00 | 0.00 | 0 |  | open |



## prescription

| prescription_id | visit_id | doctor_id | created_at |
| --- | --- | --- | --- |
| 1 | 51 | 1 | "2026-03-18T22:54:50.025Z" |
| 2 | 57 | 1 | "2026-03-21T22:52:40.775Z" |
| 3 | 56 | 1 | "2026-03-21T22:54:32.913Z" |



## prescription_fulfillment_action

| fulfillment_action_id | prescription_medicine_id | prescription_id | visit_id | patient_id | available_quantity_at_action | action_type | reason_code | reason_note | override_sale_price | override_quantity | handled_by | handled_at | created_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 9 | 5 | 60 | 10 | 42 | override_billed_external_source | purchased_from_other_store | i gave the quantity i have | 20.00 | 42 | 2 | "2026-03-23T08:49:19.886Z" | "2026-03-23T08:49:19.886Z" |



## prescription_medicines

| prescription_medicine_id | prescription_id | medicine_id | duration | instructions | dispensed_by | frequency | prescribed_quantity | dispensed_quantity | dispensed_at | created_at | updated_at | prescribed_sub_quantity | dispensed_sub_quantity | available_quantity_snapshot | availability_status | availability_note | dosage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 1 | 5 days |  |  | BD | 1 | 0 | "2026-03-18T22:54:50.025Z" | "2026-03-18T22:54:50.025Z" | "2026-03-18T22:54:50.025Z" | 0 | 0 | 0 | unknown |  |  |
| 2 | 1 | 6 | 5 days |  |  | BD | 1 | 0 | "2026-03-18T22:55:39.723Z" | "2026-03-18T22:55:39.723Z" | "2026-03-18T22:55:39.723Z" | 0 | 0 | 0 | unknown |  |  |
| 3 | 1 | 8 | 5 days |  |  | BD | 1 | 0 | "2026-03-18T22:55:39.723Z" | "2026-03-18T22:55:39.723Z" | "2026-03-18T22:55:39.723Z" | 0 | 0 | 0 | unknown |  |  |



## purchase_return

| return_id | purchase_id | reason | return_timestamp | created_by |
| --- | --- | --- | --- | --- |
| 3 | 4 | dsfds | "2026-03-18T20:30:23.111Z" | 1 |
| 4 | 5 | damaged | "2026-03-18T21:10:52.336Z" | 1 |
| 5 | 6 | jhgvvjhkj | "2026-03-19T00:15:33.360Z" | 1 |



## purchase_return_detail

| id | return_id | medicine_id | quantity | sub_quantity | returned_unit_price | returned_sub_unit_price | batch_id |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | 3 | 1 | 1 | 0 | 10.00 |  | 1 |
| 4 | 4 | 1 | 1000 | 0 | 10.09 |  | 1 |
| 5 | 5 | 5 | 200 | 0 | 35.00 |  | 5 |



## room

| room_id | ward_id | room_number | room_class | default_daily_rate | is_active | created_at |
| --- | --- | --- | --- | --- | --- | --- |
| 5 | 6 | SCN-R1 |  | 2000 | true | "2026-06-20T09:56:52.295Z" |



## sale_return

| return_id | sale_id | reason | return_timestamp | created_by | refund_amount | refund_method |
| --- | --- | --- | --- | --- | --- | --- |
| 2 | 18 | Customer return | "2026-03-03T13:56:49.827Z" | 1 | 15.00 | CASH |
| 3 | 19 | Customer return | "2026-03-03T13:57:15.725Z" | 1 | 15.00 | CASH |
| 4 | 52 | Customer return | "2026-03-22T06:39:57.819Z" | 1 | 15.50 | CASH |



## sale_return_detail

| id | return_id | medicine_id | returned_quantity | returned_unit_price | batch_id | returned_sub_quantity | returned_sub_unit_price |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 2 | 1 | 1 | 15.00 | 1 | 0 | 1.50 |
| 3 | 3 | 1 | 1 | 15.00 | 1 | 0 | 1.50 |
| 4 | 4 | 1 | 1 | 15.50 |  | 0 | 1.55 |



## staff

| staff_id | user_code | password | name | role | education | contact_number | email | created_at | employment_status | joined_at | exited_at | failed_login_attempts | last_failed_login_at | account_locked_until | last_login_at | password_changed_at | password_reset_token | password_reset_expires_at | mfa_enabled | session_version | photo_url | gender | dob | emergency_contact_name | emergency_contact_number | address_line_1 | address_line_2 | city | state | postal_code | national_id | license_id | department | designation | employment_type | facility_code | branch_code | work_location | reporting_manager_staff_id | staff_tags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | STF003 | password123 | Ayesha Malik | Lab_Technician | BS Lab Tech | 03001110003 | ayesha.malik@example.com | "2026-02-06T06:42:40.173Z" | active |  |  | 0 |  |  |  | "2026-03-24T00:21:48.998Z" |  |  | false | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [] |
| 5 | STF005 | password123 | Hina Shah | Nurse | BSc Nursing | 03001110005 | hina.shah@example.com | "2026-02-06T06:42:40.173Z" | active |  |  | 0 |  |  |  | "2026-03-24T00:21:48.998Z" |  |  | false | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [] |
| 2 | STF002 | scrypt$6eb079bf20ad0c4d036bb87ff4e8d8cf$e284ae4c6b2af7df11477722b100684cb37506482d43052955e5027a094ec3b5452caca4a49133b68bc8994875b70f4d90de08a58f579b300ad178a065633778 | Naveed Khan | Pharmacist | BPharm | 03001110002 | naveed.khan@example.com | "2026-02-06T06:42:40.173Z" | active |  |  | 0 |  |  | "2026-04-19T12:11:48.782Z" | "2026-03-25T01:41:56.611Z" |  |  | false | 2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [] |



## staff_attendance

| attendance_id | staff_id | date | check_in_time | check_out_time | status | marked_by | admin_id | shift_code | check_in_source | check_out_source | late_minutes | early_leave_minutes | overtime_minutes | break_minutes | attendance_notes | roster_id | derived_status | is_unscheduled | is_on_time | policy_snapshot |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| d9d5b4fa-dbc3-4d8e-bf49-40a68ae6709d | 1 | "2026-03-22T19:00:00.000Z" | "2026-03-23T14:54:34.684Z" |  | Present | System Trigger |  |  |  |  | 0 | 0 | 0 | 0 |  |  | unscheduled | true | false |  |
| 7cee4756-5cc8-4bc2-9da1-16878e6423ab | 6 | "2026-03-23T19:00:00.000Z" | "2026-03-24T08:50:34.022Z" |  | Present | Admin |  |  | self |  | 0 | 0 | 0 | 0 |  |  | unscheduled | true | false | {"timezone":"Asia/Karachi","grace_minutes":15,"half_day_minutes":240,"overtime_minutes":30,"early_leave_minutes":30} |
| 2804e3c0-2e98-47f1-bb9f-8f543eb22148 | 6 | "2026-03-24T19:00:00.000Z" | "2026-03-24T23:51:08.590Z" |  | Present | Admin |  |  | self |  | 0 | 0 | 0 | 0 |  |  | unscheduled | true | false | {"timezone":"Asia/Karachi","grace_minutes":15,"half_day_minutes":240,"overtime_minutes":30,"early_leave_minutes":30} |



## staff_leave_requests

| leave_request_id | staff_id | leave_type_id | from_date | to_date | is_half_day | requested_hours | reason | attachment_url | request_status | requested_at | final_approver | final_decision_at | decision_note | account_type | person_id | doctor_id |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 |  | 3 | "2026-03-23T19:00:00.000Z" | "2026-03-23T19:00:00.000Z" | false |  |  |  | pending | "2026-03-24T11:17:19.302Z" |  |  |  | doctor | 1 | 1 |



## staff_leave_types

| leave_type_id | leave_code | leave_name | default_annual_quota | is_paid | requires_attachment | active |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | CASUAL | Casual Leave | 12.00 | true | false | true |
| 2 | SICK | Sick Leave | 10.00 | true | true | true |
| 3 | ANNUAL | Annual Leave | 20.00 | true | false | true |



## staff_permission_audit

| event_id | policy_id | actor_staff_id | event_type | before_json | after_json | created_at |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 6 | created |  | {"action":"view","module":"staff_directory","allowed":false,"role_id":null,"staff_id":1,"policy_id":"1","expires_at":null,"granted_at":"2026-03-24T00:54:18.341Z","granted_by":6,"scope_type":"global","scope_value":null} | "2026-03-24T00:54:18.558Z" |
| 2 | 2 | 6 | created |  | {"action":"create","module":"staff_directory","allowed":false,"role_id":null,"staff_id":1,"policy_id":"2","expires_at":null,"granted_at":"2026-03-24T00:54:18.950Z","granted_by":6,"scope_type":"global","scope_value":null} | "2026-03-24T00:54:19.142Z" |
| 3 | 3 | 6 | created |  | {"action":"edit","module":"staff_directory","allowed":false,"role_id":null,"staff_id":1,"policy_id":"3","expires_at":null,"granted_at":"2026-03-24T00:54:19.535Z","granted_by":6,"scope_type":"global","scope_value":null} | "2026-03-24T00:54:19.728Z" |



## staff_permission_policies

| policy_id | staff_id | role_id | module | action | allowed | scope_type | scope_value | granted_by | granted_at | expires_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 |  | staff_directory | view | false | global |  | 6 | "2026-03-24T00:54:18.341Z" |  |
| 2 | 1 |  | staff_directory | create | false | global |  | 6 | "2026-03-24T00:54:18.950Z" |  |
| 3 | 1 |  | staff_directory | edit | false | global |  | 6 | "2026-03-24T00:54:19.535Z" |  |



## staff_roles

| role_id | role_code | role_name | is_system | created_at |
| --- | --- | --- | --- | --- |
| 1 | SUPER_ADMIN | Super Admin | true | "2026-03-24T00:21:48.998Z" |
| 2 | ADMIN | Admin | true | "2026-03-24T00:21:48.998Z" |
| 3 | DOCTOR | Doctor | true | "2026-03-24T00:21:48.998Z" |



## staff_roster_assignments

| roster_id | staff_id | shift_template_id | roster_date | department | ward | unit | on_call | standby | assignment_status | assigned_by | created_at | account_type | person_id | doctor_id |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 14 |  | 2 | "2026-04-08T19:00:00.000Z" | Gynecology |  |  | false | false | scheduled | 6 | "2026-03-24T10:35:22.766Z" | doctor | 1 | 1 |
| 15 |  | 2 | "2026-04-09T19:00:00.000Z" | Gynecology |  |  | false | false | scheduled | 6 | "2026-03-24T10:35:22.950Z" | doctor | 1 | 1 |
| 3 |  | 2 | "2026-03-24T19:00:00.000Z" | Gynecology |  |  | false | false | scheduled | 6 | "2026-03-24T10:35:20.466Z" | doctor | 1 | 1 |



## staff_security_sessions

| session_id | staff_id | user_code | role | login_at | last_seen_at | ip_address | user_agent | revoked_at | revoked_reason |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 64dfd720-70ce-433c-a861-4c4c4be8c018 | 1 | STF001 | Receptionist | "2026-03-24T00:55:16.202Z" | "2026-03-24T00:55:16.202Z" | ::1 | Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 | "2026-03-24T00:55:47.242Z" | forced_logout |
| 8e65ea00-3fde-4222-97ab-58d8d943204f | 6 | STF006 | Admin | "2026-03-24T00:28:26.866Z" | "2026-03-24T00:28:26.866Z" | ::1 | Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 | "2026-03-24T04:32:00.393Z" | logout |
| fd7d2f62-e79d-4acf-9661-2b7cd85faaa1 | 6 | STF006 | Admin | "2026-03-24T06:52:55.871Z" | "2026-03-24T06:52:55.871Z" | ::1 | Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 |  |  |



## staff_shift_templates

| shift_template_id | shift_code | shift_name | start_time | end_time | is_night_shift | is_split_shift | department | facility_code | branch_code | max_staff | min_staff | created_by | created_at |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | SHF111 | morning | 09:00:00 | 17:00:00 | false | false |  |  |  |  |  | 6 | "2026-03-24T10:03:14.022Z" |
| 2 | SHF2222 | afternoon | 14:00:00 | 20:00:00 | false | false |  |  |  |  |  | 6 | "2026-03-24T10:34:18.881Z" |
| 3 | SHF112 | Morning | 08:00:00 | 13:00:00 | false | false |  |  |  |  |  | 6 | "2026-03-25T06:49:15.406Z" |



## system_settings

| setting_key | setting_value | description | updated_at | updated_by |
| --- | --- | --- | --- | --- |
| hospital_name | HMS Premium Healthcare | The display name of the institution | "2026-03-19T07:31:40.981Z" |  |
| tax_rate | 17 | Standard GST rate applied to bills | "2026-03-19T07:31:40.981Z" |  |
| currency | PKR | System default currency | "2026-03-19T07:31:40.981Z" |  |



## visit

| visit_id | patient_id | doctor_id | visit_timestamp | visit_type | clinic_number | status | reason | is_deleted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 2 | 3 | "2026-02-06T06:42:40.173Z" | OPD | 1002 | seen_by_doctor | Fever and Bodyache | false |
| 3 | 3 | 5 | "2026-02-06T06:42:40.173Z" | Emergency | 2001 | discharged | Fracture in right arm | false |
| 4 | 4 | 1 | "2026-02-06T06:42:40.173Z" | OPD | 1003 | waiting | Prenatal Scan | false |



## visit_status_history

| visit_status_id | visit_id | status | updated_by_doctor | updated_by_staff | updated_at |
| --- | --- | --- | --- | --- | --- |
| 1 | 45 | seen_by_doctor | 1 |  | "2026-03-14T01:26:29.021Z" |
| 2 | 45 | waiting | 1 |  | "2026-03-14T01:26:31.725Z" |
| 3 | 45 | seen_by_doctor | 1 |  | "2026-03-14T01:26:34.858Z" |



## ward

| ward_id | name | ward_type | block | floor | is_active | created_at |
| --- | --- | --- | --- | --- | --- | --- |
| 6 | SCN Ward | general |  |  | true | "2026-06-20T09:56:52.291Z" |


