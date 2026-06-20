# Tables

## admission

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| admission | admission_id | integer | int4 | NO | nextval('admission_admission_id_seq'::regclass) |  |
| admission | admission_no | character varying | varchar | NO | ('IPD'::text \|\| lpad((nextval('admission_no_seq'::regclass))::text, 6, '0'::text)) | 40 |
| admission | patient_id | integer | int4 | NO |  |  |
| admission | visit_id | integer | int4 | YES |  |  |
| admission | attending_doctor_id | integer | int4 | YES |  |  |
| admission | admission_datetime | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| admission | admission_type | character varying | varchar | NO | 'direct'::character varying | 20 |
| admission | provisional_diagnosis | text | text | YES |  |  |
| admission | final_diagnosis | text | text | YES |  |  |
| admission | current_bed_id | integer | int4 | YES |  |  |
| admission | status | character varying | varchar | NO | 'admitted'::character varying | 20 |
| admission | discharge_datetime | timestamp without time zone | timestamp | YES |  |  |
| admission | discharge_type | character varying | varchar | YES |  | 20 |
| admission | created_by | integer | int4 | YES |  |  |
| admission | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| admission | admission_id | admission_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| admission | attending_doctor_id | doctor | doctor_id | NO ACTION | NO ACTION | admission_attending_doctor_id_fkey |
| admission | created_by | staff | staff_id | NO ACTION | NO ACTION | admission_created_by_fkey |
| admission | current_bed_id | bed | bed_id | NO ACTION | NO ACTION | admission_current_bed_id_fkey |
| admission | patient_id | patient | patient_id | NO ACTION | NO ACTION | admission_patient_id_fkey |
| admission | visit_id | visit | visit_id | NO ACTION | NO ACTION | admission_visit_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| admission | admission_no | admission_admission_no_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| admission | admission_admission_datetime_not_null | admission_datetime IS NOT NULL |
| admission | admission_admission_id_not_null | admission_id IS NOT NULL |
| admission | admission_admission_no_not_null | admission_no IS NOT NULL |
| admission | admission_admission_type_not_null | admission_type IS NOT NULL |
| admission | admission_created_at_not_null | created_at IS NOT NULL |
| admission | admission_patient_id_not_null | patient_id IS NOT NULL |
| admission | admission_status_not_null | status IS NOT NULL |
| admission | ck_admission_discharge_complete | (((status)::text <> 'discharged'::text) OR ((discharge_datetime IS NOT NULL) AND (discharge_type IS NOT NULL))) |
| admission | ck_admission_discharge_type | ((discharge_type IS NULL) OR ((discharge_type)::text = ANY ((ARRAY['normal'::character varying, 'lama'::character varying, 'referred'::character varying, 'transferred'::character varying, 'death'::character varying, 'absconded'::character varying])::text[]))) |
| admission | ck_admission_status | ((status)::text = ANY ((ARRAY['admitted'::character varying, 'discharged'::character varying])::text[])) |
| admission | ck_admission_type | ((admission_type)::text = ANY ((ARRAY['opd_referred'::character varying, 'emergency'::character varying, 'direct'::character varying, 'planned'::character varying])::text[])) |



## allowance_type_master

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| allowance_type_master | code | text | text | NO |  |  |
| allowance_type_master | label | text | text | NO |  |  |
| allowance_type_master | description | text | text | YES |  |  |
| allowance_type_master | taxable | boolean | bool | NO | true |  |
| allowance_type_master | created_at | timestamp with time zone | timestamptz | NO | now() |  |
| allowance_type_master | updated_at | timestamp with time zone | timestamptz | NO | now() |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| allowance_type_master | code | allowance_type_master_pkey |


### Foreign keys

_(none)_


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| allowance_type_master | allowance_type_master_code_not_null | code IS NOT NULL |
| allowance_type_master | allowance_type_master_created_at_not_null | created_at IS NOT NULL |
| allowance_type_master | allowance_type_master_label_not_null | label IS NOT NULL |
| allowance_type_master | allowance_type_master_taxable_not_null | taxable IS NOT NULL |
| allowance_type_master | allowance_type_master_updated_at_not_null | updated_at IS NOT NULL |



## attendance_regularization_requests

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| attendance_regularization_requests | regularization_id | bigint | int8 | NO | nextval('attendance_regularization_requests_regularization_id_seq'::regclass) |  |
| attendance_regularization_requests | staff_id | integer | int4 | NO |  |  |
| attendance_regularization_requests | attendance_id | uuid | uuid | YES |  |  |
| attendance_regularization_requests | requested_check_in | timestamp without time zone | timestamp | YES |  |  |
| attendance_regularization_requests | requested_check_out | timestamp without time zone | timestamp | YES |  |  |
| attendance_regularization_requests | requested_status | character varying | varchar | YES |  | 20 |
| attendance_regularization_requests | reason | text | text | NO |  |  |
| attendance_regularization_requests | request_status | character varying | varchar | NO | 'pending'::character varying | 20 |
| attendance_regularization_requests | approved_by | integer | int4 | YES |  |  |
| attendance_regularization_requests | approved_at | timestamp without time zone | timestamp | YES |  |  |
| attendance_regularization_requests | decision_note | text | text | YES |  |  |
| attendance_regularization_requests | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| attendance_regularization_requests | regularization_id | attendance_regularization_requests_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| attendance_regularization_requests | approved_by | staff | staff_id | NO ACTION | NO ACTION | attendance_regularization_requests_approved_by_fkey |
| attendance_regularization_requests | attendance_id | staff_attendance | attendance_id | NO ACTION | SET NULL | attendance_regularization_requests_attendance_id_fkey |
| attendance_regularization_requests | staff_id | staff | staff_id | NO ACTION | CASCADE | attendance_regularization_requests_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| attendance_regularization_requests | attendance_regularization_requests_created_at_not_null | created_at IS NOT NULL |
| attendance_regularization_requests | attendance_regularization_requests_reason_not_null | reason IS NOT NULL |
| attendance_regularization_requests | attendance_regularization_requests_regularization_id_not_null | regularization_id IS NOT NULL |
| attendance_regularization_requests | attendance_regularization_requests_request_status_not_null | request_status IS NOT NULL |
| attendance_regularization_requests | attendance_regularization_requests_staff_id_not_null | staff_id IS NOT NULL |



## audit_logs

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| audit_logs | log_id | uuid | uuid | NO | gen_random_uuid() |  |
| audit_logs | staff_id | integer | int4 | YES |  |  |
| audit_logs | action | character varying | varchar | NO |  | 255 |
| audit_logs | entity_type | character varying | varchar | YES |  | 100 |
| audit_logs | entity_id | character varying | varchar | YES |  | 100 |
| audit_logs | details | jsonb | jsonb | YES |  |  |
| audit_logs | ip_address | character varying | varchar | YES |  | 45 |
| audit_logs | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| audit_logs | log_id | audit_logs_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| audit_logs | staff_id | staff | staff_id | NO ACTION | NO ACTION | audit_logs_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| audit_logs | audit_logs_action_not_null | action IS NOT NULL |
| audit_logs | audit_logs_log_id_not_null | log_id IS NOT NULL |



## bed

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| bed | bed_id | integer | int4 | NO | nextval('bed_bed_id_seq'::regclass) |  |
| bed | room_id | integer | int4 | NO |  |  |
| bed | bed_number | character varying | varchar | NO |  | 40 |
| bed | daily_rate | numeric | numeric | NO | 0 |  |
| bed | status | character varying | varchar | NO | 'vacant'::character varying | 20 |
| bed | is_active | boolean | bool | NO | true |  |
| bed | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| bed | bed_id | bed_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| bed | room_id | room | room_id | NO ACTION | CASCADE | bed_room_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| bed | room_id | uq_bed_room_number |
| bed | bed_number | uq_bed_room_number |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| bed | bed_bed_id_not_null | bed_id IS NOT NULL |
| bed | bed_bed_number_not_null | bed_number IS NOT NULL |
| bed | bed_created_at_not_null | created_at IS NOT NULL |
| bed | bed_daily_rate_not_null | daily_rate IS NOT NULL |
| bed | bed_is_active_not_null | is_active IS NOT NULL |
| bed | bed_room_id_not_null | room_id IS NOT NULL |
| bed | bed_status_not_null | status IS NOT NULL |
| bed | ck_bed_rate_nonneg | (daily_rate >= (0)::numeric) |
| bed | ck_bed_status | ((status)::text = ANY ((ARRAY['vacant'::character varying, 'occupied'::character varying, 'reserved'::character varying, 'cleaning'::character varying, 'blocked'::character varying])::text[])) |



## bed_transfer

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| bed_transfer | transfer_id | integer | int4 | NO | nextval('bed_transfer_transfer_id_seq'::regclass) |  |
| bed_transfer | admission_id | integer | int4 | NO |  |  |
| bed_transfer | from_bed_id | integer | int4 | YES |  |  |
| bed_transfer | to_bed_id | integer | int4 | NO |  |  |
| bed_transfer | transfer_datetime | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| bed_transfer | reason | text | text | YES |  |  |
| bed_transfer | by_staff_id | integer | int4 | YES |  |  |
| bed_transfer | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| bed_transfer | transfer_id | bed_transfer_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| bed_transfer | admission_id | admission | admission_id | NO ACTION | CASCADE | bed_transfer_admission_id_fkey |
| bed_transfer | by_staff_id | staff | staff_id | NO ACTION | NO ACTION | bed_transfer_by_staff_id_fkey |
| bed_transfer | from_bed_id | bed | bed_id | NO ACTION | NO ACTION | bed_transfer_from_bed_id_fkey |
| bed_transfer | to_bed_id | bed | bed_id | NO ACTION | NO ACTION | bed_transfer_to_bed_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| bed_transfer | bed_transfer_admission_id_not_null | admission_id IS NOT NULL |
| bed_transfer | bed_transfer_created_at_not_null | created_at IS NOT NULL |
| bed_transfer | bed_transfer_to_bed_id_not_null | to_bed_id IS NOT NULL |
| bed_transfer | bed_transfer_transfer_datetime_not_null | transfer_datetime IS NOT NULL |
| bed_transfer | bed_transfer_transfer_id_not_null | transfer_id IS NOT NULL |



## bill

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| bill | bill_id | integer | int4 | NO | nextval('bill_bill_id_seq'::regclass) |  |
| bill | patient_id | integer | int4 | NO |  |  |
| bill | visit_id | integer | int4 | NO |  |  |
| bill | total_amount | numeric | numeric | YES |  |  |
| bill | payment_status | character varying | varchar | YES |  | 100 |
| bill | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| bill | bill_id | bill_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| bill | patient_id | patient | patient_id | NO ACTION | NO ACTION | bill_patient_id_fkey |
| bill | visit_id | visit | visit_id | NO ACTION | NO ACTION | bill_visit_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| bill | bill_bill_id_not_null | bill_id IS NOT NULL |
| bill | bill_patient_id_not_null | patient_id IS NOT NULL |
| bill | bill_payment_status_check | ((payment_status)::text = ANY (ARRAY[('Paid'::character varying)::text, ('Unpaid'::character varying)::text, ('Partial'::character varying)::text])) |
| bill | bill_visit_id_not_null | visit_id IS NOT NULL |
| bill | ck_bill_total_nonneg | (total_amount >= (0)::numeric) |



## bill_charge_source

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| bill_charge_source | bill_charge_source_id | bigint | int8 | NO |  |  |
| bill_charge_source | bill_id | integer | int4 | NO |  |  |
| bill_charge_source | bill_item_id | integer | int4 | YES |  |  |
| bill_charge_source | source_type | text | text | NO |  |  |
| bill_charge_source | source_id | bigint | int8 | YES |  |  |
| bill_charge_source | amount | numeric | numeric | NO | 0 |  |
| bill_charge_source | meta_json | jsonb | jsonb | YES |  |  |
| bill_charge_source | created_by | integer | int4 | YES |  |  |
| bill_charge_source | created_at | timestamp without time zone | timestamp | NO | now() |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| bill_charge_source | bill_charge_source_id | bill_charge_source_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| bill_charge_source | bill_id | bill | bill_id | NO ACTION | CASCADE | bill_charge_source_bill_id_fkey |
| bill_charge_source | bill_item_id | bill_item | item_id | NO ACTION | SET NULL | bill_charge_source_bill_item_id_fkey |
| bill_charge_source | created_by | staff | staff_id | NO ACTION | NO ACTION | bill_charge_source_created_by_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| bill_charge_source | bill_charge_source_amount_not_null | amount IS NOT NULL |
| bill_charge_source | bill_charge_source_bill_charge_source_id_not_null | bill_charge_source_id IS NOT NULL |
| bill_charge_source | bill_charge_source_bill_id_not_null | bill_id IS NOT NULL |
| bill_charge_source | bill_charge_source_created_at_not_null | created_at IS NOT NULL |
| bill_charge_source | bill_charge_source_source_type_not_null | source_type IS NOT NULL |
| bill_charge_source | bill_charge_source_type_check | (source_type = ANY (ARRAY['consultation'::text, 'pharmacy'::text, 'lab'::text, 'other'::text])) |



## bill_item

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| bill_item | item_id | integer | int4 | NO | nextval('bill_item_item_id_seq'::regclass) |  |
| bill_item | bill_id | integer | int4 | NO |  |  |
| bill_item | description | character varying | varchar | YES |  | 255 |
| bill_item | amount | numeric | numeric | NO |  |  |
| bill_item | quantity | integer | int4 | YES |  |  |
| bill_item | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| bill_item | item_id | bill_item_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| bill_item | bill_id | bill | bill_id | NO ACTION | NO ACTION | bill_item_bill_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| bill_item | bill_item_amount_not_null | amount IS NOT NULL |
| bill_item | bill_item_bill_id_not_null | bill_id IS NOT NULL |
| bill_item | bill_item_item_id_not_null | item_id IS NOT NULL |
| bill_item | ck_bill_item_qty_nonneg | (quantity >= 0) |



## bill_pharmacy_sale

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| bill_pharmacy_sale | bill_pharmacy_sale_id | bigint | int8 | NO |  |  |
| bill_pharmacy_sale | bill_id | integer | int4 | NO |  |  |
| bill_pharmacy_sale | sale_id | integer | int4 | NO |  |  |
| bill_pharmacy_sale | amount | numeric | numeric | NO | 0 |  |
| bill_pharmacy_sale | settled_amount | numeric | numeric | NO | 0 |  |
| bill_pharmacy_sale | settlement_status | text | text | NO | 'pending'::text |  |
| bill_pharmacy_sale | created_by | integer | int4 | YES |  |  |
| bill_pharmacy_sale | settled_by | integer | int4 | YES |  |  |
| bill_pharmacy_sale | settled_at | timestamp without time zone | timestamp | YES |  |  |
| bill_pharmacy_sale | created_at | timestamp without time zone | timestamp | NO | now() |  |
| bill_pharmacy_sale | updated_at | timestamp without time zone | timestamp | NO | now() |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| bill_pharmacy_sale | bill_pharmacy_sale_id | bill_pharmacy_sale_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| bill_pharmacy_sale | bill_id | bill | bill_id | NO ACTION | CASCADE | bill_pharmacy_sale_bill_id_fkey |
| bill_pharmacy_sale | created_by | staff | staff_id | NO ACTION | NO ACTION | bill_pharmacy_sale_created_by_fkey |
| bill_pharmacy_sale | sale_id | pharmacy_sale | sale_id | NO ACTION | CASCADE | bill_pharmacy_sale_sale_id_fkey |
| bill_pharmacy_sale | settled_by | staff | staff_id | NO ACTION | NO ACTION | bill_pharmacy_sale_settled_by_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| bill_pharmacy_sale | sale_id | bill_pharmacy_sale_sale_unique |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| bill_pharmacy_sale | bill_pharmacy_sale_amount_not_null | amount IS NOT NULL |
| bill_pharmacy_sale | bill_pharmacy_sale_bill_id_not_null | bill_id IS NOT NULL |
| bill_pharmacy_sale | bill_pharmacy_sale_bill_pharmacy_sale_id_not_null | bill_pharmacy_sale_id IS NOT NULL |
| bill_pharmacy_sale | bill_pharmacy_sale_created_at_not_null | created_at IS NOT NULL |
| bill_pharmacy_sale | bill_pharmacy_sale_sale_id_not_null | sale_id IS NOT NULL |
| bill_pharmacy_sale | bill_pharmacy_sale_settled_amount_not_null | settled_amount IS NOT NULL |
| bill_pharmacy_sale | bill_pharmacy_sale_settlement_status_check | (settlement_status = ANY (ARRAY['pending'::text, 'settled'::text])) |
| bill_pharmacy_sale | bill_pharmacy_sale_settlement_status_not_null | settlement_status IS NOT NULL |
| bill_pharmacy_sale | bill_pharmacy_sale_updated_at_not_null | updated_at IS NOT NULL |



## cashier_audit_event

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| cashier_audit_event | cashier_audit_event_id | bigint | int8 | NO |  |  |
| cashier_audit_event | event_type | text | text | NO |  |  |
| cashier_audit_event | bill_id | integer | int4 | YES |  |  |
| cashier_audit_event | visit_id | integer | int4 | YES |  |  |
| cashier_audit_event | cashier_payment_txn_id | bigint | int8 | YES |  |  |
| cashier_audit_event | actor_staff_id | integer | int4 | YES |  |  |
| cashier_audit_event | before_json | jsonb | jsonb | YES |  |  |
| cashier_audit_event | after_json | jsonb | jsonb | YES |  |  |
| cashier_audit_event | reason_code | text | text | YES |  |  |
| cashier_audit_event | reason_note | text | text | YES |  |  |
| cashier_audit_event | created_at | timestamp without time zone | timestamp | NO | now() |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| cashier_audit_event | cashier_audit_event_id | cashier_audit_event_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| cashier_audit_event | actor_staff_id | staff | staff_id | NO ACTION | NO ACTION | cashier_audit_event_actor_staff_id_fkey |
| cashier_audit_event | bill_id | bill | bill_id | NO ACTION | SET NULL | cashier_audit_event_bill_id_fkey |
| cashier_audit_event | cashier_payment_txn_id | cashier_payment_txn | cashier_payment_txn_id | NO ACTION | SET NULL | cashier_audit_event_cashier_payment_txn_id_fkey |
| cashier_audit_event | visit_id | visit | visit_id | NO ACTION | SET NULL | cashier_audit_event_visit_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| cashier_audit_event | cashier_audit_event_cashier_audit_event_id_not_null | cashier_audit_event_id IS NOT NULL |
| cashier_audit_event | cashier_audit_event_created_at_not_null | created_at IS NOT NULL |
| cashier_audit_event | cashier_audit_event_event_type_not_null | event_type IS NOT NULL |



## cashier_idempotency

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| cashier_idempotency | cashier_idempotency_id | bigint | int8 | NO |  |  |
| cashier_idempotency | idempotency_key | character varying | varchar | NO |  | 120 |
| cashier_idempotency | endpoint | text | text | NO |  |  |
| cashier_idempotency | bill_id | integer | int4 | YES |  |  |
| cashier_idempotency | request_hash | text | text | YES |  |  |
| cashier_idempotency | response_json | jsonb | jsonb | NO |  |  |
| cashier_idempotency | status_code | integer | int4 | NO | 200 |  |
| cashier_idempotency | created_by | integer | int4 | YES |  |  |
| cashier_idempotency | created_at | timestamp without time zone | timestamp | NO | now() |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| cashier_idempotency | cashier_idempotency_id | cashier_idempotency_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| cashier_idempotency | bill_id | bill | bill_id | NO ACTION | CASCADE | cashier_idempotency_bill_id_fkey |
| cashier_idempotency | created_by | staff | staff_id | NO ACTION | NO ACTION | cashier_idempotency_created_by_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| cashier_idempotency | idempotency_key | uq_cashier_idempotency |
| cashier_idempotency | endpoint | uq_cashier_idempotency |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| cashier_idempotency | cashier_idempotency_cashier_idempotency_id_not_null | cashier_idempotency_id IS NOT NULL |
| cashier_idempotency | cashier_idempotency_created_at_not_null | created_at IS NOT NULL |
| cashier_idempotency | cashier_idempotency_endpoint_not_null | endpoint IS NOT NULL |
| cashier_idempotency | cashier_idempotency_idempotency_key_not_null | idempotency_key IS NOT NULL |
| cashier_idempotency | cashier_idempotency_response_json_not_null | response_json IS NOT NULL |
| cashier_idempotency | cashier_idempotency_status_code_not_null | status_code IS NOT NULL |



## cashier_payment_allocation

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| cashier_payment_allocation | cashier_payment_allocation_id | bigint | int8 | NO |  |  |
| cashier_payment_allocation | cashier_payment_txn_id | bigint | int8 | NO |  |  |
| cashier_payment_allocation | sale_id | integer | int4 | NO |  |  |
| cashier_payment_allocation | bill_id | integer | int4 | NO |  |  |
| cashier_payment_allocation | allocated_amount | numeric | numeric | NO |  |  |
| cashier_payment_allocation | created_at | timestamp without time zone | timestamp | NO | now() |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| cashier_payment_allocation | cashier_payment_allocation_id | cashier_payment_allocation_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| cashier_payment_allocation | bill_id | bill | bill_id | NO ACTION | CASCADE | cashier_payment_allocation_bill_id_fkey |
| cashier_payment_allocation | cashier_payment_txn_id | cashier_payment_txn | cashier_payment_txn_id | NO ACTION | CASCADE | cashier_payment_allocation_cashier_payment_txn_id_fkey |
| cashier_payment_allocation | sale_id | pharmacy_sale | sale_id | NO ACTION | CASCADE | cashier_payment_allocation_sale_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| cashier_payment_allocation | cashier_payment_allocation_allocated_amount_not_null | allocated_amount IS NOT NULL |
| cashier_payment_allocation | cashier_payment_allocation_amount_check | (allocated_amount > (0)::numeric) |
| cashier_payment_allocation | cashier_payment_allocation_bill_id_not_null | bill_id IS NOT NULL |
| cashier_payment_allocation | cashier_payment_allocation_cashier_payment_allocation__not_null | cashier_payment_allocation_id IS NOT NULL |
| cashier_payment_allocation | cashier_payment_allocation_cashier_payment_txn_id_not_null | cashier_payment_txn_id IS NOT NULL |
| cashier_payment_allocation | cashier_payment_allocation_created_at_not_null | created_at IS NOT NULL |
| cashier_payment_allocation | cashier_payment_allocation_sale_id_not_null | sale_id IS NOT NULL |



## cashier_payment_txn

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| cashier_payment_txn | cashier_payment_txn_id | bigint | int8 | NO |  |  |
| cashier_payment_txn | bill_id | integer | int4 | NO |  |  |
| cashier_payment_txn | visit_id | integer | int4 | YES |  |  |
| cashier_payment_txn | amount | numeric | numeric | NO |  |  |
| cashier_payment_txn | payment_type | character varying | varchar | NO |  | 50 |
| cashier_payment_txn | payment_reference | character varying | varchar | YES |  | 150 |
| cashier_payment_txn | notes | text | text | YES |  |  |
| cashier_payment_txn | received_by | integer | int4 | YES |  |  |
| cashier_payment_txn | created_at | timestamp without time zone | timestamp | NO | now() |  |
| cashier_payment_txn | txn_type | text | text | NO | 'payment'::text |  |
| cashier_payment_txn | reversed_from_txn_id | bigint | int8 | YES |  |  |
| cashier_payment_txn | reversal_reason_code | text | text | YES |  |  |
| cashier_payment_txn | reversal_reason_note | text | text | YES |  |  |
| cashier_payment_txn | receipt_no | character varying | varchar | YES |  | 80 |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| cashier_payment_txn | cashier_payment_txn_id | cashier_payment_txn_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| cashier_payment_txn | bill_id | bill | bill_id | NO ACTION | CASCADE | cashier_payment_txn_bill_id_fkey |
| cashier_payment_txn | received_by | staff | staff_id | NO ACTION | NO ACTION | cashier_payment_txn_received_by_fkey |
| cashier_payment_txn | reversed_from_txn_id | cashier_payment_txn | cashier_payment_txn_id | NO ACTION | NO ACTION | cashier_payment_txn_reversed_from_txn_id_fkey |
| cashier_payment_txn | visit_id | visit | visit_id | NO ACTION | SET NULL | cashier_payment_txn_visit_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| cashier_payment_txn | cashier_payment_txn_amount_check | (amount <> (0)::numeric) |
| cashier_payment_txn | cashier_payment_txn_amount_not_null | amount IS NOT NULL |
| cashier_payment_txn | cashier_payment_txn_bill_id_not_null | bill_id IS NOT NULL |
| cashier_payment_txn | cashier_payment_txn_cashier_payment_txn_id_not_null | cashier_payment_txn_id IS NOT NULL |
| cashier_payment_txn | cashier_payment_txn_created_at_not_null | created_at IS NOT NULL |
| cashier_payment_txn | cashier_payment_txn_payment_type_not_null | payment_type IS NOT NULL |
| cashier_payment_txn | cashier_payment_txn_txn_type_not_null | txn_type IS NOT NULL |
| cashier_payment_txn | cashier_payment_txn_type_check | (txn_type = ANY (ARRAY['payment'::text, 'reversal'::text])) |



## cashier_settlement_draft

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| cashier_settlement_draft | cashier_settlement_draft_id | bigint | int8 | NO |  |  |
| cashier_settlement_draft | bill_id | integer | int4 | NO |  |  |
| cashier_settlement_draft | visit_id | integer | int4 | YES |  |  |
| cashier_settlement_draft | amount | numeric | numeric | NO |  |  |
| cashier_settlement_draft | payment_type | character varying | varchar | NO |  | 50 |
| cashier_settlement_draft | payment_reference | character varying | varchar | YES |  | 150 |
| cashier_settlement_draft | notes | text | text | YES |  |  |
| cashier_settlement_draft | draft_status | text | text | NO | 'open'::text |  |
| cashier_settlement_draft | created_by | integer | int4 | YES |  |  |
| cashier_settlement_draft | applied_cashier_payment_txn_id | bigint | int8 | YES |  |  |
| cashier_settlement_draft | created_at | timestamp without time zone | timestamp | NO | now() |  |
| cashier_settlement_draft | updated_at | timestamp without time zone | timestamp | NO | now() |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| cashier_settlement_draft | cashier_settlement_draft_id | cashier_settlement_draft_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| cashier_settlement_draft | applied_cashier_payment_txn_id | cashier_payment_txn | cashier_payment_txn_id | NO ACTION | NO ACTION | cashier_settlement_draft_applied_cashier_payment_txn_id_fkey |
| cashier_settlement_draft | bill_id | bill | bill_id | NO ACTION | CASCADE | cashier_settlement_draft_bill_id_fkey |
| cashier_settlement_draft | created_by | staff | staff_id | NO ACTION | NO ACTION | cashier_settlement_draft_created_by_fkey |
| cashier_settlement_draft | visit_id | visit | visit_id | NO ACTION | SET NULL | cashier_settlement_draft_visit_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| cashier_settlement_draft | cashier_settlement_draft_amount_check | (amount > (0)::numeric) |
| cashier_settlement_draft | cashier_settlement_draft_amount_not_null | amount IS NOT NULL |
| cashier_settlement_draft | cashier_settlement_draft_bill_id_not_null | bill_id IS NOT NULL |
| cashier_settlement_draft | cashier_settlement_draft_cashier_settlement_draft_id_not_null | cashier_settlement_draft_id IS NOT NULL |
| cashier_settlement_draft | cashier_settlement_draft_created_at_not_null | created_at IS NOT NULL |
| cashier_settlement_draft | cashier_settlement_draft_draft_status_not_null | draft_status IS NOT NULL |
| cashier_settlement_draft | cashier_settlement_draft_payment_type_not_null | payment_type IS NOT NULL |
| cashier_settlement_draft | cashier_settlement_draft_status_check | (draft_status = ANY (ARRAY['open'::text, 'applied'::text, 'cancelled'::text])) |
| cashier_settlement_draft | cashier_settlement_draft_updated_at_not_null | updated_at IS NOT NULL |



## cashier_shift

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| cashier_shift | cashier_shift_id | bigint | int8 | NO |  |  |
| cashier_shift | staff_id | integer | int4 | NO |  |  |
| cashier_shift | opened_at | timestamp without time zone | timestamp | NO | now() |  |
| cashier_shift | closed_at | timestamp without time zone | timestamp | YES |  |  |
| cashier_shift | opening_cash | numeric | numeric | NO | 0 |  |
| cashier_shift | closing_cash_counted | numeric | numeric | YES |  |  |
| cashier_shift | expected_cash | numeric | numeric | YES |  |  |
| cashier_shift | variance | numeric | numeric | YES |  |  |
| cashier_shift | status | text | text | NO | 'open'::text |  |
| cashier_shift | notes | text | text | YES |  |  |
| cashier_shift | closed_by | integer | int4 | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| cashier_shift | cashier_shift_id | cashier_shift_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| cashier_shift | closed_by | staff | staff_id | NO ACTION | NO ACTION | cashier_shift_closed_by_fkey |
| cashier_shift | staff_id | staff | staff_id | NO ACTION | NO ACTION | cashier_shift_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| cashier_shift | cashier_shift_cashier_shift_id_not_null | cashier_shift_id IS NOT NULL |
| cashier_shift | cashier_shift_opened_at_not_null | opened_at IS NOT NULL |
| cashier_shift | cashier_shift_opening_cash_not_null | opening_cash IS NOT NULL |
| cashier_shift | cashier_shift_staff_id_not_null | staff_id IS NOT NULL |
| cashier_shift | cashier_shift_status_check | (status = ANY (ARRAY['open'::text, 'closed'::text])) |
| cashier_shift | cashier_shift_status_not_null | status IS NOT NULL |



## current_pregnancy

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| current_pregnancy | pregnancy_id | integer | int4 | NO | nextval('current_pregnancy_pregnancy_id_seq'::regclass) |  |
| current_pregnancy | patient_id | integer | int4 | NO |  |  |
| current_pregnancy | visit_id | integer | int4 | NO |  |  |
| current_pregnancy | multiple_pregnancy | boolean | bool | YES |  |  |
| current_pregnancy | complications | text | text | YES |  |  |
| current_pregnancy | ultrasound_findings | text | text | YES |  |  |
| current_pregnancy | fetal_heart_rate_bpm | integer | int4 | YES |  |  |
| current_pregnancy | placenta_position | character varying | varchar | YES |  | 50 |
| current_pregnancy | presentation | character varying | varchar | YES |  | 50 |
| current_pregnancy | gestational_age_weeks | integer | int4 | YES |  |  |
| current_pregnancy | notes | text | text | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| current_pregnancy | pregnancy_id | current_pregnancy_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| current_pregnancy | patient_id | patient | patient_id | NO ACTION | NO ACTION | current_pregnancy_patient_id_fkey |
| current_pregnancy | visit_id | visit | visit_id | NO ACTION | NO ACTION | current_pregnancy_visit_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| current_pregnancy | visit_id | uniqeue_visit_id_cp |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| current_pregnancy | current_pregnancy_patient_id_not_null | patient_id IS NOT NULL |
| current_pregnancy | current_pregnancy_pregnancy_id_not_null | pregnancy_id IS NOT NULL |
| current_pregnancy | current_pregnancy_visit_id_not_null | visit_id IS NOT NULL |



## doctor

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| doctor | doctor_id | integer | int4 | NO | nextval('doctor_doctor_id_seq'::regclass) |  |
| doctor | user_code | character varying | varchar | NO |  | 50 |
| doctor | password | character varying | varchar | NO |  | 255 |
| doctor | doctor_name | character varying | varchar | NO |  | 50 |
| doctor | specialization | character varying | varchar | NO |  | 100 |
| doctor | education | character varying | varchar | YES |  | 255 |
| doctor | consultation_fee | numeric | numeric | NO |  |  |
| doctor | emergency_fee | numeric | numeric | NO |  |  |
| doctor | contact_number | character varying | varchar | YES |  | 20 |
| doctor | email | character varying | varchar | YES |  | 100 |
| doctor | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| doctor | employment_status | character varying | varchar | NO | 'active'::character varying | 20 |
| doctor | failed_login_attempts | integer | int4 | NO | 0 |  |
| doctor | last_failed_login_at | timestamp without time zone | timestamp | YES |  |  |
| doctor | account_locked_until | timestamp without time zone | timestamp | YES |  |  |
| doctor | last_login_at | timestamp without time zone | timestamp | YES |  |  |
| doctor | password_changed_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| doctor | password_reset_token | character varying | varchar | YES |  | 128 |
| doctor | password_reset_expires_at | timestamp without time zone | timestamp | YES |  |  |
| doctor | mfa_enabled | boolean | bool | NO | false |  |
| doctor | session_version | integer | int4 | NO | 1 |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| doctor | doctor_id | doctor_pkey |


### Foreign keys

_(none)_


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| doctor | doctor_consultation_fee_not_null | consultation_fee IS NOT NULL |
| doctor | doctor_doctor_id_not_null | doctor_id IS NOT NULL |
| doctor | doctor_doctor_name_not_null | doctor_name IS NOT NULL |
| doctor | doctor_emergency_fee_not_null | emergency_fee IS NOT NULL |
| doctor | doctor_employment_status_check | ((employment_status)::text = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'resigned'::text])) |
| doctor | doctor_employment_status_not_null | employment_status IS NOT NULL |
| doctor | doctor_failed_login_attempts_not_null | failed_login_attempts IS NOT NULL |
| doctor | doctor_mfa_enabled_not_null | mfa_enabled IS NOT NULL |
| doctor | doctor_password_not_null | password IS NOT NULL |
| doctor | doctor_session_version_not_null | session_version IS NOT NULL |
| doctor | doctor_specialization_not_null | specialization IS NOT NULL |
| doctor | doctor_user_code_not_null | user_code IS NOT NULL |



## doctor_attendance

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| doctor_attendance | attendance_id | uuid | uuid | NO | gen_random_uuid() |  |
| doctor_attendance | doctor_id | integer | int4 | NO |  |  |
| doctor_attendance | date | date | date | NO |  |  |
| doctor_attendance | check_in_time | timestamp without time zone | timestamp | YES |  |  |
| doctor_attendance | check_out_time | timestamp without time zone | timestamp | YES |  |  |
| doctor_attendance | status | character varying | varchar | NO | 'Present'::character varying | 20 |
| doctor_attendance | marked_by | character varying | varchar | YES |  | 50 |
| doctor_attendance | admin_id | integer | int4 | YES |  |  |
| doctor_attendance | roster_id | bigint | int8 | YES |  |  |
| doctor_attendance | shift_code | character varying | varchar | YES |  | 50 |
| doctor_attendance | check_in_source | character varying | varchar | YES |  | 40 |
| doctor_attendance | check_out_source | character varying | varchar | YES |  | 40 |
| doctor_attendance | late_minutes | integer | int4 | NO | 0 |  |
| doctor_attendance | early_leave_minutes | integer | int4 | NO | 0 |  |
| doctor_attendance | overtime_minutes | integer | int4 | NO | 0 |  |
| doctor_attendance | break_minutes | integer | int4 | NO | 0 |  |
| doctor_attendance | attendance_notes | text | text | YES |  |  |
| doctor_attendance | derived_status | character varying | varchar | NO | 'unscheduled'::character varying | 30 |
| doctor_attendance | is_unscheduled | boolean | bool | NO | true |  |
| doctor_attendance | is_on_time | boolean | bool | NO | false |  |
| doctor_attendance | policy_snapshot | jsonb | jsonb | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| doctor_attendance | attendance_id | doctor_attendance_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| doctor_attendance | admin_id | staff | staff_id | NO ACTION | NO ACTION | doctor_attendance_admin_id_fkey |
| doctor_attendance | doctor_id | doctor | doctor_id | NO ACTION | CASCADE | doctor_attendance_doctor_id_fkey |
| doctor_attendance | roster_id | staff_roster_assignments | roster_id | NO ACTION | SET NULL | doctor_attendance_roster_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| doctor_attendance | doctor_id | doctor_attendance_doctor_id_date_key |
| doctor_attendance | date | doctor_attendance_doctor_id_date_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| doctor_attendance | doctor_attendance_attendance_id_not_null | attendance_id IS NOT NULL |
| doctor_attendance | doctor_attendance_break_minutes_not_null | break_minutes IS NOT NULL |
| doctor_attendance | doctor_attendance_date_not_null | date IS NOT NULL |
| doctor_attendance | doctor_attendance_derived_status_check | ((derived_status)::text = ANY (ARRAY['on_time'::text, 'late'::text, 'half_day'::text, 'early_leave'::text, 'overtime'::text, 'unscheduled'::text, 'absent'::text, 'leave'::text])) |
| doctor_attendance | doctor_attendance_derived_status_not_null | derived_status IS NOT NULL |
| doctor_attendance | doctor_attendance_doctor_id_not_null | doctor_id IS NOT NULL |
| doctor_attendance | doctor_attendance_early_leave_minutes_not_null | early_leave_minutes IS NOT NULL |
| doctor_attendance | doctor_attendance_is_on_time_not_null | is_on_time IS NOT NULL |
| doctor_attendance | doctor_attendance_is_unscheduled_not_null | is_unscheduled IS NOT NULL |
| doctor_attendance | doctor_attendance_late_minutes_not_null | late_minutes IS NOT NULL |
| doctor_attendance | doctor_attendance_overtime_minutes_not_null | overtime_minutes IS NOT NULL |
| doctor_attendance | doctor_attendance_status_not_null | status IS NOT NULL |



## doctor_encounter_note

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| doctor_encounter_note | doctor_encounter_note_id | bigint | int8 | NO |  |  |
| doctor_encounter_note | visit_id | integer | int4 | NO |  |  |
| doctor_encounter_note | patient_id | integer | int4 | NO |  |  |
| doctor_encounter_note | doctor_id | integer | int4 | NO |  |  |
| doctor_encounter_note | reception_complaint | text | text | YES |  |  |
| doctor_encounter_note | doctor_note | text | text | YES |  |  |
| doctor_encounter_note | created_at | timestamp without time zone | timestamp | NO | now() |  |
| doctor_encounter_note | updated_at | timestamp without time zone | timestamp | NO | now() |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| doctor_encounter_note | doctor_encounter_note_id | doctor_encounter_note_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| doctor_encounter_note | doctor_id | doctor | doctor_id | NO ACTION | NO ACTION | doctor_encounter_note_doctor_id_fkey |
| doctor_encounter_note | patient_id | patient | patient_id | NO ACTION | CASCADE | doctor_encounter_note_patient_id_fkey |
| doctor_encounter_note | visit_id | visit | visit_id | NO ACTION | CASCADE | doctor_encounter_note_visit_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| doctor_encounter_note | visit_id | doctor_encounter_note_visit_id_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| doctor_encounter_note | doctor_encounter_note_created_at_not_null | created_at IS NOT NULL |
| doctor_encounter_note | doctor_encounter_note_doctor_encounter_note_id_not_null | doctor_encounter_note_id IS NOT NULL |
| doctor_encounter_note | doctor_encounter_note_doctor_id_not_null | doctor_id IS NOT NULL |
| doctor_encounter_note | doctor_encounter_note_patient_id_not_null | patient_id IS NOT NULL |
| doctor_encounter_note | doctor_encounter_note_updated_at_not_null | updated_at IS NOT NULL |
| doctor_encounter_note | doctor_encounter_note_visit_id_not_null | visit_id IS NOT NULL |



## doctor_security_sessions

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| doctor_security_sessions | session_id | uuid | uuid | NO | gen_random_uuid() |  |
| doctor_security_sessions | doctor_id | integer | int4 | NO |  |  |
| doctor_security_sessions | user_code | character varying | varchar | NO |  | 50 |
| doctor_security_sessions | role | character varying | varchar | NO | 'Doctor'::character varying | 50 |
| doctor_security_sessions | login_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| doctor_security_sessions | last_seen_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| doctor_security_sessions | ip_address | character varying | varchar | YES |  | 45 |
| doctor_security_sessions | user_agent | text | text | YES |  |  |
| doctor_security_sessions | revoked_at | timestamp without time zone | timestamp | YES |  |  |
| doctor_security_sessions | revoked_reason | character varying | varchar | YES |  | 120 |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| doctor_security_sessions | session_id | doctor_security_sessions_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| doctor_security_sessions | doctor_id | doctor | doctor_id | NO ACTION | CASCADE | doctor_security_sessions_doctor_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| doctor_security_sessions | doctor_security_sessions_doctor_id_not_null | doctor_id IS NOT NULL |
| doctor_security_sessions | doctor_security_sessions_last_seen_at_not_null | last_seen_at IS NOT NULL |
| doctor_security_sessions | doctor_security_sessions_login_at_not_null | login_at IS NOT NULL |
| doctor_security_sessions | doctor_security_sessions_role_not_null | role IS NOT NULL |
| doctor_security_sessions | doctor_security_sessions_session_id_not_null | session_id IS NOT NULL |
| doctor_security_sessions | doctor_security_sessions_user_code_not_null | user_code IS NOT NULL |



## employee_allowance

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| employee_allowance | allowance_id | bigint | int8 | NO | nextval('employee_allowance_allowance_id_seq'::regclass) |  |
| employee_allowance | account_type | character varying | varchar | NO |  | 20 |
| employee_allowance | person_id | integer | int4 | NO |  |  |
| employee_allowance | staff_id | integer | int4 | YES |  |  |
| employee_allowance | doctor_id | integer | int4 | YES |  |  |
| employee_allowance | allowance_code | character varying | varchar | NO |  | 40 |
| employee_allowance | allowance_name | character varying | varchar | NO |  | 120 |
| employee_allowance | amount | numeric | numeric | NO | 0 |  |
| employee_allowance | allowance_mode | character varying | varchar | NO | 'recurring'::character varying | 20 |
| employee_allowance | taxable | boolean | bool | NO | false |  |
| employee_allowance | is_active | boolean | bool | NO | true |  |
| employee_allowance | effective_from | date | date | NO | CURRENT_DATE |  |
| employee_allowance | effective_to | date | date | YES |  |  |
| employee_allowance | notes | text | text | YES |  |  |
| employee_allowance | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| employee_allowance | updated_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_allowance | allowance_id | employee_allowance_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| employee_allowance | doctor_id | doctor | doctor_id | NO ACTION | CASCADE | employee_allowance_doctor_id_fkey |
| employee_allowance | staff_id | staff | staff_id | NO ACTION | CASCADE | employee_allowance_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| employee_allowance | employee_allowance_account_type_check | ((account_type)::text = ANY (ARRAY[('staff'::character varying)::text, ('doctor'::character varying)::text])) |
| employee_allowance | employee_allowance_account_type_not_null | account_type IS NOT NULL |
| employee_allowance | employee_allowance_allowance_code_not_null | allowance_code IS NOT NULL |
| employee_allowance | employee_allowance_allowance_id_not_null | allowance_id IS NOT NULL |
| employee_allowance | employee_allowance_allowance_mode_not_null | allowance_mode IS NOT NULL |
| employee_allowance | employee_allowance_allowance_name_not_null | allowance_name IS NOT NULL |
| employee_allowance | employee_allowance_amount_not_null | amount IS NOT NULL |
| employee_allowance | employee_allowance_created_at_not_null | created_at IS NOT NULL |
| employee_allowance | employee_allowance_effective_from_not_null | effective_from IS NOT NULL |
| employee_allowance | employee_allowance_is_active_not_null | is_active IS NOT NULL |
| employee_allowance | employee_allowance_mode_check | ((allowance_mode)::text = ANY (ARRAY[('recurring'::character varying)::text, ('one_time'::character varying)::text])) |
| employee_allowance | employee_allowance_person_id_not_null | person_id IS NOT NULL |
| employee_allowance | employee_allowance_ref_check | ((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id))) |
| employee_allowance | employee_allowance_taxable_not_null | taxable IS NOT NULL |
| employee_allowance | employee_allowance_updated_at_not_null | updated_at IS NOT NULL |



## employee_compensation_profile

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| employee_compensation_profile | compensation_id | bigint | int8 | NO | nextval('employee_compensation_profile_compensation_id_seq'::regclass) |  |
| employee_compensation_profile | account_type | character varying | varchar | NO |  | 20 |
| employee_compensation_profile | person_id | integer | int4 | NO |  |  |
| employee_compensation_profile | staff_id | integer | int4 | YES |  |  |
| employee_compensation_profile | doctor_id | integer | int4 | YES |  |  |
| employee_compensation_profile | salary_model | character varying | varchar | NO | 'fixed_monthly'::character varying | 30 |
| employee_compensation_profile | payroll_cycle | character varying | varchar | NO | 'monthly'::character varying | 20 |
| employee_compensation_profile | base_monthly_salary | numeric | numeric | NO | 0 |  |
| employee_compensation_profile | per_patient_fee | numeric | numeric | NO | 0 |  |
| employee_compensation_profile | active_from | date | date | NO | CURRENT_DATE |  |
| employee_compensation_profile | active_to | date | date | YES |  |  |
| employee_compensation_profile | notes | text | text | YES |  |  |
| employee_compensation_profile | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| employee_compensation_profile | updated_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_compensation_profile | compensation_id | employee_compensation_profile_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| employee_compensation_profile | doctor_id | doctor | doctor_id | NO ACTION | CASCADE | employee_compensation_profile_doctor_id_fkey |
| employee_compensation_profile | staff_id | staff | staff_id | NO ACTION | CASCADE | employee_compensation_profile_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| employee_compensation_profile | employee_compensation_account_type_check | ((account_type)::text = ANY (ARRAY[('staff'::character varying)::text, ('doctor'::character varying)::text])) |
| employee_compensation_profile | employee_compensation_payroll_cycle_check | ((payroll_cycle)::text = 'monthly'::text) |
| employee_compensation_profile | employee_compensation_profile_account_type_not_null | account_type IS NOT NULL |
| employee_compensation_profile | employee_compensation_profile_active_from_not_null | active_from IS NOT NULL |
| employee_compensation_profile | employee_compensation_profile_base_monthly_salary_not_null | base_monthly_salary IS NOT NULL |
| employee_compensation_profile | employee_compensation_profile_compensation_id_not_null | compensation_id IS NOT NULL |
| employee_compensation_profile | employee_compensation_profile_created_at_not_null | created_at IS NOT NULL |
| employee_compensation_profile | employee_compensation_profile_payroll_cycle_not_null | payroll_cycle IS NOT NULL |
| employee_compensation_profile | employee_compensation_profile_per_patient_fee_not_null | per_patient_fee IS NOT NULL |
| employee_compensation_profile | employee_compensation_profile_person_id_not_null | person_id IS NOT NULL |
| employee_compensation_profile | employee_compensation_profile_salary_model_not_null | salary_model IS NOT NULL |
| employee_compensation_profile | employee_compensation_profile_updated_at_not_null | updated_at IS NOT NULL |
| employee_compensation_profile | employee_compensation_ref_check | ((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id))) |
| employee_compensation_profile | employee_compensation_salary_model_check | ((salary_model)::text = ANY (ARRAY[('fixed_monthly'::character varying)::text, ('per_patient_seen'::character varying)::text])) |



## employee_credential_events

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| employee_credential_events | credential_event_id | bigint | int8 | NO | nextval('employee_credential_events_credential_event_id_seq'::regclass) |  |
| employee_credential_events | credential_id | bigint | int8 | NO |  |  |
| employee_credential_events | actor_staff_id | integer | int4 | YES |  |  |
| employee_credential_events | event_type | character varying | varchar | NO |  | 40 |
| employee_credential_events | from_status | character varying | varchar | YES |  | 30 |
| employee_credential_events | to_status | character varying | varchar | YES |  | 30 |
| employee_credential_events | event_note | text | text | YES |  |  |
| employee_credential_events | payload | jsonb | jsonb | YES |  |  |
| employee_credential_events | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_credential_events | credential_event_id | employee_credential_events_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| employee_credential_events | actor_staff_id | staff | staff_id | NO ACTION | NO ACTION | employee_credential_events_actor_staff_id_fkey |
| employee_credential_events | credential_id | employee_credentials | credential_id | NO ACTION | CASCADE | employee_credential_events_credential_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| employee_credential_events | employee_credential_events_created_at_not_null | created_at IS NOT NULL |
| employee_credential_events | employee_credential_events_credential_event_id_not_null | credential_event_id IS NOT NULL |
| employee_credential_events | employee_credential_events_credential_id_not_null | credential_id IS NOT NULL |
| employee_credential_events | employee_credential_events_event_type_not_null | event_type IS NOT NULL |



## employee_credential_types

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| employee_credential_types | credential_type_id | integer | int4 | NO | nextval('employee_credential_types_credential_type_id_seq'::regclass) |  |
| employee_credential_types | credential_code | character varying | varchar | NO |  | 60 |
| employee_credential_types | credential_name | character varying | varchar | NO |  | 140 |
| employee_credential_types | credential_category | character varying | varchar | YES |  | 80 |
| employee_credential_types | issuing_authority_default | character varying | varchar | YES |  | 160 |
| employee_credential_types | validity_months | integer | int4 | YES |  |  |
| employee_credential_types | renewal_window_days | integer | int4 | NO | 60 |  |
| employee_credential_types | active | boolean | bool | NO | true |  |
| employee_credential_types | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_credential_types | credential_type_id | employee_credential_types_pkey |


### Foreign keys

_(none)_


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_credential_types | credential_code | employee_credential_types_credential_code_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| employee_credential_types | employee_credential_types_active_not_null | active IS NOT NULL |
| employee_credential_types | employee_credential_types_created_at_not_null | created_at IS NOT NULL |
| employee_credential_types | employee_credential_types_credential_code_not_null | credential_code IS NOT NULL |
| employee_credential_types | employee_credential_types_credential_name_not_null | credential_name IS NOT NULL |
| employee_credential_types | employee_credential_types_credential_type_id_not_null | credential_type_id IS NOT NULL |
| employee_credential_types | employee_credential_types_renewal_window_days_not_null | renewal_window_days IS NOT NULL |



## employee_credentials

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| employee_credentials | credential_id | bigint | int8 | NO | nextval('employee_credentials_credential_id_seq'::regclass) |  |
| employee_credentials | account_type | character varying | varchar | NO | 'staff'::character varying | 20 |
| employee_credentials | person_id | integer | int4 | NO |  |  |
| employee_credentials | staff_id | integer | int4 | YES |  |  |
| employee_credentials | doctor_id | integer | int4 | YES |  |  |
| employee_credentials | credential_type_id | integer | int4 | NO |  |  |
| employee_credentials | credential_number | character varying | varchar | NO |  | 120 |
| employee_credentials | credential_title | character varying | varchar | YES |  | 160 |
| employee_credentials | issued_on | date | date | YES |  |  |
| employee_credentials | expires_on | date | date | YES |  |  |
| employee_credentials | issuing_authority | character varying | varchar | YES |  | 160 |
| employee_credentials | issuing_country | character varying | varchar | YES |  | 80 |
| employee_credentials | verification_status | character varying | varchar | NO | 'draft'::character varying | 30 |
| employee_credentials | renewal_status | character varying | varchar | NO | 'not_due'::character varying | 30 |
| employee_credentials | reminder_status | character varying | varchar | NO | 'none'::character varying | 30 |
| employee_credentials | submitted_at | timestamp without time zone | timestamp | YES |  |  |
| employee_credentials | reviewed_by | integer | int4 | YES |  |  |
| employee_credentials | reviewed_at | timestamp without time zone | timestamp | YES |  |  |
| employee_credentials | review_note | text | text | YES |  |  |
| employee_credentials | verified_at | timestamp without time zone | timestamp | YES |  |  |
| employee_credentials | revoked_by | integer | int4 | YES |  |  |
| employee_credentials | revoked_at | timestamp without time zone | timestamp | YES |  |  |
| employee_credentials | revoke_reason | text | text | YES |  |  |
| employee_credentials | metadata | jsonb | jsonb | NO | '{}'::jsonb |  |
| employee_credentials | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| employee_credentials | updated_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_credentials | credential_id | employee_credentials_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| employee_credentials | credential_type_id | employee_credential_types | credential_type_id | NO ACTION | RESTRICT | employee_credentials_credential_type_id_fkey |
| employee_credentials | doctor_id | doctor | doctor_id | NO ACTION | CASCADE | employee_credentials_doctor_id_fkey |
| employee_credentials | reviewed_by | staff | staff_id | NO ACTION | NO ACTION | employee_credentials_reviewed_by_fkey |
| employee_credentials | revoked_by | staff | staff_id | NO ACTION | NO ACTION | employee_credentials_revoked_by_fkey |
| employee_credentials | staff_id | staff | staff_id | NO ACTION | CASCADE | employee_credentials_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| employee_credentials | employee_credentials_account_type_check | ((account_type)::text = ANY (ARRAY['staff'::text, 'doctor'::text])) |
| employee_credentials | employee_credentials_account_type_not_null | account_type IS NOT NULL |
| employee_credentials | employee_credentials_created_at_not_null | created_at IS NOT NULL |
| employee_credentials | employee_credentials_credential_id_not_null | credential_id IS NOT NULL |
| employee_credentials | employee_credentials_credential_number_not_null | credential_number IS NOT NULL |
| employee_credentials | employee_credentials_credential_type_id_not_null | credential_type_id IS NOT NULL |
| employee_credentials | employee_credentials_employee_ref_check | ((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id))) |
| employee_credentials | employee_credentials_metadata_not_null | metadata IS NOT NULL |
| employee_credentials | employee_credentials_person_id_not_null | person_id IS NOT NULL |
| employee_credentials | employee_credentials_reminder_status_not_null | reminder_status IS NOT NULL |
| employee_credentials | employee_credentials_renewal_status_check | ((renewal_status)::text = ANY (ARRAY['not_due'::text, 'due'::text, 'in_progress'::text, 'renewed'::text, 'overdue'::text, 'blocked'::text])) |
| employee_credentials | employee_credentials_renewal_status_not_null | renewal_status IS NOT NULL |
| employee_credentials | employee_credentials_status_check | ((verification_status)::text = ANY (ARRAY['draft'::text, 'submitted'::text, 'under_review'::text, 'verified'::text, 'rejected'::text, 'revoked'::text, 'expired'::text])) |
| employee_credentials | employee_credentials_updated_at_not_null | updated_at IS NOT NULL |
| employee_credentials | employee_credentials_verification_status_not_null | verification_status IS NOT NULL |



## employee_document_requirements

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| employee_document_requirements | requirement_id | bigint | int8 | NO | nextval('employee_document_requirements_requirement_id_seq'::regclass) |  |
| employee_document_requirements | document_type_id | integer | int4 | NO |  |  |
| employee_document_requirements | target_type | character varying | varchar | NO |  | 30 |
| employee_document_requirements | target_value | character varying | varchar | YES |  | 120 |
| employee_document_requirements | mandatory | boolean | bool | NO | true |  |
| employee_document_requirements | due_days_from_joining | integer | int4 | YES |  |  |
| employee_document_requirements | recurrence_days | integer | int4 | YES |  |  |
| employee_document_requirements | active | boolean | bool | NO | true |  |
| employee_document_requirements | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_document_requirements | requirement_id | employee_document_requirements_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| employee_document_requirements | document_type_id | employee_document_types | document_type_id | NO ACTION | CASCADE | employee_document_requirements_document_type_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| employee_document_requirements | employee_document_requirements_active_not_null | active IS NOT NULL |
| employee_document_requirements | employee_document_requirements_created_at_not_null | created_at IS NOT NULL |
| employee_document_requirements | employee_document_requirements_document_type_id_not_null | document_type_id IS NOT NULL |
| employee_document_requirements | employee_document_requirements_mandatory_not_null | mandatory IS NOT NULL |
| employee_document_requirements | employee_document_requirements_requirement_id_not_null | requirement_id IS NOT NULL |
| employee_document_requirements | employee_document_requirements_target_type_check | ((target_type)::text = ANY (ARRAY['global'::text, 'role'::text, 'department'::text, 'facility'::text, 'account_type'::text])) |
| employee_document_requirements | employee_document_requirements_target_type_not_null | target_type IS NOT NULL |



## employee_document_reviews

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| employee_document_reviews | document_review_id | bigint | int8 | NO | nextval('employee_document_reviews_document_review_id_seq'::regclass) |  |
| employee_document_reviews | document_id | bigint | int8 | NO |  |  |
| employee_document_reviews | version_id | bigint | int8 | YES |  |  |
| employee_document_reviews | reviewer_staff_id | integer | int4 | YES |  |  |
| employee_document_reviews | review_action | character varying | varchar | NO |  | 30 |
| employee_document_reviews | review_note | text | text | YES |  |  |
| employee_document_reviews | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_document_reviews | document_review_id | employee_document_reviews_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| employee_document_reviews | document_id | employee_documents | document_id | NO ACTION | CASCADE | employee_document_reviews_document_id_fkey |
| employee_document_reviews | reviewer_staff_id | staff | staff_id | NO ACTION | NO ACTION | employee_document_reviews_reviewer_staff_id_fkey |
| employee_document_reviews | version_id | employee_document_versions | version_id | NO ACTION | SET NULL | employee_document_reviews_version_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| employee_document_reviews | employee_document_reviews_action_check | ((review_action)::text = ANY (ARRAY['submitted'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'requested_changes'::text, 'archived'::text])) |
| employee_document_reviews | employee_document_reviews_created_at_not_null | created_at IS NOT NULL |
| employee_document_reviews | employee_document_reviews_document_id_not_null | document_id IS NOT NULL |
| employee_document_reviews | employee_document_reviews_document_review_id_not_null | document_review_id IS NOT NULL |
| employee_document_reviews | employee_document_reviews_review_action_not_null | review_action IS NOT NULL |



## employee_document_types

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| employee_document_types | document_type_id | integer | int4 | NO | nextval('employee_document_types_document_type_id_seq'::regclass) |  |
| employee_document_types | document_code | character varying | varchar | NO |  | 60 |
| employee_document_types | document_name | character varying | varchar | NO |  | 140 |
| employee_document_types | document_category | character varying | varchar | YES |  | 80 |
| employee_document_types | required_default | boolean | bool | NO | false |  |
| employee_document_types | requires_expiry | boolean | bool | NO | false |  |
| employee_document_types | retention_days | integer | int4 | YES |  |  |
| employee_document_types | active | boolean | bool | NO | true |  |
| employee_document_types | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_document_types | document_type_id | employee_document_types_pkey |


### Foreign keys

_(none)_


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_document_types | document_code | employee_document_types_document_code_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| employee_document_types | employee_document_types_active_not_null | active IS NOT NULL |
| employee_document_types | employee_document_types_created_at_not_null | created_at IS NOT NULL |
| employee_document_types | employee_document_types_document_code_not_null | document_code IS NOT NULL |
| employee_document_types | employee_document_types_document_name_not_null | document_name IS NOT NULL |
| employee_document_types | employee_document_types_document_type_id_not_null | document_type_id IS NOT NULL |
| employee_document_types | employee_document_types_required_default_not_null | required_default IS NOT NULL |
| employee_document_types | employee_document_types_requires_expiry_not_null | requires_expiry IS NOT NULL |



## employee_document_versions

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| employee_document_versions | version_id | bigint | int8 | NO | nextval('employee_document_versions_version_id_seq'::regclass) |  |
| employee_document_versions | document_id | bigint | int8 | NO |  |  |
| employee_document_versions | version_no | integer | int4 | NO |  |  |
| employee_document_versions | storage_path | text | text | YES |  |  |
| employee_document_versions | file_url | text | text | YES |  |  |
| employee_document_versions | file_name | character varying | varchar | YES |  | 255 |
| employee_document_versions | mime_type | character varying | varchar | YES |  | 120 |
| employee_document_versions | file_size_bytes | bigint | int8 | YES |  |  |
| employee_document_versions | checksum_sha256 | character varying | varchar | YES |  | 128 |
| employee_document_versions | uploaded_by | integer | int4 | YES |  |  |
| employee_document_versions | uploaded_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| employee_document_versions | is_active | boolean | bool | NO | true |  |
| employee_document_versions | metadata | jsonb | jsonb | NO | '{}'::jsonb |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_document_versions | version_id | employee_document_versions_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| employee_document_versions | document_id | employee_documents | document_id | NO ACTION | CASCADE | employee_document_versions_document_id_fkey |
| employee_document_versions | uploaded_by | staff | staff_id | NO ACTION | NO ACTION | employee_document_versions_uploaded_by_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| employee_document_versions | employee_document_versions_document_id_not_null | document_id IS NOT NULL |
| employee_document_versions | employee_document_versions_is_active_not_null | is_active IS NOT NULL |
| employee_document_versions | employee_document_versions_metadata_not_null | metadata IS NOT NULL |
| employee_document_versions | employee_document_versions_uploaded_at_not_null | uploaded_at IS NOT NULL |
| employee_document_versions | employee_document_versions_version_id_not_null | version_id IS NOT NULL |
| employee_document_versions | employee_document_versions_version_no_check | (version_no > 0) |
| employee_document_versions | employee_document_versions_version_no_not_null | version_no IS NOT NULL |



## employee_documents

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| employee_documents | document_id | bigint | int8 | NO | nextval('employee_documents_document_id_seq'::regclass) |  |
| employee_documents | account_type | character varying | varchar | NO | 'staff'::character varying | 20 |
| employee_documents | person_id | integer | int4 | NO |  |  |
| employee_documents | staff_id | integer | int4 | YES |  |  |
| employee_documents | doctor_id | integer | int4 | YES |  |  |
| employee_documents | document_type_id | integer | int4 | NO |  |  |
| employee_documents | document_title | character varying | varchar | NO |  | 180 |
| employee_documents | document_description | text | text | YES |  |  |
| employee_documents | review_status | character varying | varchar | NO | 'draft'::character varying | 30 |
| employee_documents | visibility | character varying | varchar | NO | 'internal'::character varying | 20 |
| employee_documents | current_version_no | integer | int4 | NO | 0 |  |
| employee_documents | effective_from | date | date | YES |  |  |
| employee_documents | effective_to | date | date | YES |  |  |
| employee_documents | expires_on | date | date | YES |  |  |
| employee_documents | required_by | date | date | YES |  |  |
| employee_documents | submitted_by | integer | int4 | YES |  |  |
| employee_documents | submitted_at | timestamp without time zone | timestamp | YES |  |  |
| employee_documents | reviewed_by | integer | int4 | YES |  |  |
| employee_documents | reviewed_at | timestamp without time zone | timestamp | YES |  |  |
| employee_documents | review_note | text | text | YES |  |  |
| employee_documents | metadata | jsonb | jsonb | NO | '{}'::jsonb |  |
| employee_documents | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| employee_documents | updated_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_documents | document_id | employee_documents_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| employee_documents | doctor_id | doctor | doctor_id | NO ACTION | CASCADE | employee_documents_doctor_id_fkey |
| employee_documents | document_type_id | employee_document_types | document_type_id | NO ACTION | RESTRICT | employee_documents_document_type_id_fkey |
| employee_documents | reviewed_by | staff | staff_id | NO ACTION | NO ACTION | employee_documents_reviewed_by_fkey |
| employee_documents | staff_id | staff | staff_id | NO ACTION | CASCADE | employee_documents_staff_id_fkey |
| employee_documents | submitted_by | staff | staff_id | NO ACTION | NO ACTION | employee_documents_submitted_by_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| employee_documents | employee_documents_account_type_check | ((account_type)::text = ANY (ARRAY['staff'::text, 'doctor'::text])) |
| employee_documents | employee_documents_account_type_not_null | account_type IS NOT NULL |
| employee_documents | employee_documents_created_at_not_null | created_at IS NOT NULL |
| employee_documents | employee_documents_current_version_no_not_null | current_version_no IS NOT NULL |
| employee_documents | employee_documents_document_id_not_null | document_id IS NOT NULL |
| employee_documents | employee_documents_document_title_not_null | document_title IS NOT NULL |
| employee_documents | employee_documents_document_type_id_not_null | document_type_id IS NOT NULL |
| employee_documents | employee_documents_employee_ref_check | ((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id))) |
| employee_documents | employee_documents_metadata_not_null | metadata IS NOT NULL |
| employee_documents | employee_documents_person_id_not_null | person_id IS NOT NULL |
| employee_documents | employee_documents_review_status_check | ((review_status)::text = ANY (ARRAY['draft'::text, 'submitted'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'expired'::text, 'archived'::text])) |
| employee_documents | employee_documents_review_status_not_null | review_status IS NOT NULL |
| employee_documents | employee_documents_updated_at_not_null | updated_at IS NOT NULL |
| employee_documents | employee_documents_visibility_check | ((visibility)::text = ANY (ARRAY['internal'::text, 'restricted'::text, 'confidential'::text])) |
| employee_documents | employee_documents_visibility_not_null | visibility IS NOT NULL |



## employee_lifecycle_events

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| employee_lifecycle_events | lifecycle_event_id | bigint | int8 | NO | nextval('employee_lifecycle_events_lifecycle_event_id_seq'::regclass) |  |
| employee_lifecycle_events | lifecycle_run_id | bigint | int8 | YES |  |  |
| employee_lifecycle_events | lifecycle_task_id | bigint | int8 | YES |  |  |
| employee_lifecycle_events | actor_staff_id | integer | int4 | YES |  |  |
| employee_lifecycle_events | event_type | character varying | varchar | NO |  | 40 |
| employee_lifecycle_events | from_status | character varying | varchar | YES |  | 30 |
| employee_lifecycle_events | to_status | character varying | varchar | YES |  | 30 |
| employee_lifecycle_events | event_note | text | text | YES |  |  |
| employee_lifecycle_events | payload | jsonb | jsonb | YES |  |  |
| employee_lifecycle_events | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_lifecycle_events | lifecycle_event_id | employee_lifecycle_events_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| employee_lifecycle_events | actor_staff_id | staff | staff_id | NO ACTION | NO ACTION | employee_lifecycle_events_actor_staff_id_fkey |
| employee_lifecycle_events | lifecycle_run_id | employee_lifecycle_runs | lifecycle_run_id | NO ACTION | CASCADE | employee_lifecycle_events_lifecycle_run_id_fkey |
| employee_lifecycle_events | lifecycle_task_id | employee_lifecycle_tasks | lifecycle_task_id | NO ACTION | CASCADE | employee_lifecycle_events_lifecycle_task_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| employee_lifecycle_events | employee_lifecycle_events_created_at_not_null | created_at IS NOT NULL |
| employee_lifecycle_events | employee_lifecycle_events_event_type_not_null | event_type IS NOT NULL |
| employee_lifecycle_events | employee_lifecycle_events_lifecycle_event_id_not_null | lifecycle_event_id IS NOT NULL |



## employee_lifecycle_runs

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| employee_lifecycle_runs | lifecycle_run_id | bigint | int8 | NO | nextval('employee_lifecycle_runs_lifecycle_run_id_seq'::regclass) |  |
| employee_lifecycle_runs | account_type | character varying | varchar | NO | 'staff'::character varying | 20 |
| employee_lifecycle_runs | person_id | integer | int4 | NO |  |  |
| employee_lifecycle_runs | staff_id | integer | int4 | YES |  |  |
| employee_lifecycle_runs | doctor_id | integer | int4 | YES |  |  |
| employee_lifecycle_runs | lifecycle_template_id | bigint | int8 | YES |  |  |
| employee_lifecycle_runs | lifecycle_type | character varying | varchar | NO |  | 30 |
| employee_lifecycle_runs | run_status | character varying | varchar | NO | 'draft'::character varying | 30 |
| employee_lifecycle_runs | started_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| employee_lifecycle_runs | completed_at | timestamp without time zone | timestamp | YES |  |  |
| employee_lifecycle_runs | initiated_by | integer | int4 | YES |  |  |
| employee_lifecycle_runs | summary_note | text | text | YES |  |  |
| employee_lifecycle_runs | metadata | jsonb | jsonb | NO | '{}'::jsonb |  |
| employee_lifecycle_runs | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| employee_lifecycle_runs | updated_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_lifecycle_runs | lifecycle_run_id | employee_lifecycle_runs_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| employee_lifecycle_runs | doctor_id | doctor | doctor_id | NO ACTION | CASCADE | employee_lifecycle_runs_doctor_id_fkey |
| employee_lifecycle_runs | initiated_by | staff | staff_id | NO ACTION | NO ACTION | employee_lifecycle_runs_initiated_by_fkey |
| employee_lifecycle_runs | lifecycle_template_id | employee_lifecycle_templates | lifecycle_template_id | NO ACTION | SET NULL | employee_lifecycle_runs_lifecycle_template_id_fkey |
| employee_lifecycle_runs | staff_id | staff | staff_id | NO ACTION | CASCADE | employee_lifecycle_runs_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| employee_lifecycle_runs | employee_lifecycle_runs_account_type_check | ((account_type)::text = ANY (ARRAY['staff'::text, 'doctor'::text])) |
| employee_lifecycle_runs | employee_lifecycle_runs_account_type_not_null | account_type IS NOT NULL |
| employee_lifecycle_runs | employee_lifecycle_runs_created_at_not_null | created_at IS NOT NULL |
| employee_lifecycle_runs | employee_lifecycle_runs_employee_ref_check | ((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id))) |
| employee_lifecycle_runs | employee_lifecycle_runs_lifecycle_run_id_not_null | lifecycle_run_id IS NOT NULL |
| employee_lifecycle_runs | employee_lifecycle_runs_lifecycle_type_not_null | lifecycle_type IS NOT NULL |
| employee_lifecycle_runs | employee_lifecycle_runs_metadata_not_null | metadata IS NOT NULL |
| employee_lifecycle_runs | employee_lifecycle_runs_person_id_not_null | person_id IS NOT NULL |
| employee_lifecycle_runs | employee_lifecycle_runs_run_status_not_null | run_status IS NOT NULL |
| employee_lifecycle_runs | employee_lifecycle_runs_started_at_not_null | started_at IS NOT NULL |
| employee_lifecycle_runs | employee_lifecycle_runs_status_check | ((run_status)::text = ANY (ARRAY['draft'::text, 'in_progress'::text, 'blocked'::text, 'completed'::text, 'cancelled'::text])) |
| employee_lifecycle_runs | employee_lifecycle_runs_type_check | ((lifecycle_type)::text = ANY (ARRAY['onboarding'::text, 'offboarding'::text, 'probation'::text, 'transfer'::text])) |
| employee_lifecycle_runs | employee_lifecycle_runs_updated_at_not_null | updated_at IS NOT NULL |



## employee_lifecycle_tasks

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| employee_lifecycle_tasks | lifecycle_task_id | bigint | int8 | NO | nextval('employee_lifecycle_tasks_lifecycle_task_id_seq'::regclass) |  |
| employee_lifecycle_tasks | lifecycle_run_id | bigint | int8 | NO |  |  |
| employee_lifecycle_tasks | lifecycle_template_task_id | bigint | int8 | YES |  |  |
| employee_lifecycle_tasks | task_code | character varying | varchar | NO |  | 80 |
| employee_lifecycle_tasks | task_name | character varying | varchar | NO |  | 180 |
| employee_lifecycle_tasks | task_group | character varying | varchar | YES |  | 80 |
| employee_lifecycle_tasks | owner_staff_id | integer | int4 | YES |  |  |
| employee_lifecycle_tasks | task_status | character varying | varchar | NO | 'pending'::character varying | 30 |
| employee_lifecycle_tasks | due_at | timestamp without time zone | timestamp | YES |  |  |
| employee_lifecycle_tasks | completed_at | timestamp without time zone | timestamp | YES |  |  |
| employee_lifecycle_tasks | completed_by | integer | int4 | YES |  |  |
| employee_lifecycle_tasks | completion_note | text | text | YES |  |  |
| employee_lifecycle_tasks | evidence_document_id | bigint | int8 | YES |  |  |
| employee_lifecycle_tasks | metadata | jsonb | jsonb | NO | '{}'::jsonb |  |
| employee_lifecycle_tasks | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| employee_lifecycle_tasks | updated_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_lifecycle_tasks | lifecycle_task_id | employee_lifecycle_tasks_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| employee_lifecycle_tasks | completed_by | staff | staff_id | NO ACTION | NO ACTION | employee_lifecycle_tasks_completed_by_fkey |
| employee_lifecycle_tasks | evidence_document_id | employee_documents | document_id | NO ACTION | SET NULL | employee_lifecycle_tasks_evidence_document_id_fkey |
| employee_lifecycle_tasks | lifecycle_run_id | employee_lifecycle_runs | lifecycle_run_id | NO ACTION | CASCADE | employee_lifecycle_tasks_lifecycle_run_id_fkey |
| employee_lifecycle_tasks | lifecycle_template_task_id | employee_lifecycle_template_tasks | lifecycle_template_task_id | NO ACTION | SET NULL | employee_lifecycle_tasks_lifecycle_template_task_id_fkey |
| employee_lifecycle_tasks | owner_staff_id | staff | staff_id | NO ACTION | NO ACTION | employee_lifecycle_tasks_owner_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| employee_lifecycle_tasks | employee_lifecycle_tasks_created_at_not_null | created_at IS NOT NULL |
| employee_lifecycle_tasks | employee_lifecycle_tasks_lifecycle_run_id_not_null | lifecycle_run_id IS NOT NULL |
| employee_lifecycle_tasks | employee_lifecycle_tasks_lifecycle_task_id_not_null | lifecycle_task_id IS NOT NULL |
| employee_lifecycle_tasks | employee_lifecycle_tasks_metadata_not_null | metadata IS NOT NULL |
| employee_lifecycle_tasks | employee_lifecycle_tasks_status_check | ((task_status)::text = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'skipped'::text, 'blocked'::text, 'cancelled'::text, 'overdue'::text])) |
| employee_lifecycle_tasks | employee_lifecycle_tasks_task_code_not_null | task_code IS NOT NULL |
| employee_lifecycle_tasks | employee_lifecycle_tasks_task_name_not_null | task_name IS NOT NULL |
| employee_lifecycle_tasks | employee_lifecycle_tasks_task_status_not_null | task_status IS NOT NULL |
| employee_lifecycle_tasks | employee_lifecycle_tasks_updated_at_not_null | updated_at IS NOT NULL |



## employee_lifecycle_template_tasks

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| employee_lifecycle_template_tasks | lifecycle_template_task_id | bigint | int8 | NO | nextval('employee_lifecycle_template_task_lifecycle_template_task_id_seq'::regclass) |  |
| employee_lifecycle_template_tasks | lifecycle_template_id | bigint | int8 | NO |  |  |
| employee_lifecycle_template_tasks | task_code | character varying | varchar | NO |  | 80 |
| employee_lifecycle_template_tasks | task_name | character varying | varchar | NO |  | 180 |
| employee_lifecycle_template_tasks | task_group | character varying | varchar | YES |  | 80 |
| employee_lifecycle_template_tasks | sequence_no | integer | int4 | NO | 1 |  |
| employee_lifecycle_template_tasks | default_owner_role | character varying | varchar | YES |  | 80 |
| employee_lifecycle_template_tasks | mandatory | boolean | bool | NO | true |  |
| employee_lifecycle_template_tasks | due_offset_days | integer | int4 | YES |  |  |
| employee_lifecycle_template_tasks | requires_document_type_id | integer | int4 | YES |  |  |
| employee_lifecycle_template_tasks | blocks_transition | boolean | bool | NO | true |  |
| employee_lifecycle_template_tasks | metadata | jsonb | jsonb | NO | '{}'::jsonb |  |
| employee_lifecycle_template_tasks | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_lifecycle_template_tasks | lifecycle_template_task_id | employee_lifecycle_template_tasks_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| employee_lifecycle_template_tasks | lifecycle_template_id | employee_lifecycle_templates | lifecycle_template_id | NO ACTION | CASCADE | employee_lifecycle_template_tasks_lifecycle_template_id_fkey |
| employee_lifecycle_template_tasks | requires_document_type_id | employee_document_types | document_type_id | NO ACTION | SET NULL | employee_lifecycle_template_task_requires_document_type_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| employee_lifecycle_template_tasks | employee_lifecycle_template_lifecycle_template_task_id_not_null | lifecycle_template_task_id IS NOT NULL |
| employee_lifecycle_template_tasks | employee_lifecycle_template_task_lifecycle_template_id_not_null | lifecycle_template_id IS NOT NULL |
| employee_lifecycle_template_tasks | employee_lifecycle_template_tasks_blocks_transition_not_null | blocks_transition IS NOT NULL |
| employee_lifecycle_template_tasks | employee_lifecycle_template_tasks_created_at_not_null | created_at IS NOT NULL |
| employee_lifecycle_template_tasks | employee_lifecycle_template_tasks_mandatory_not_null | mandatory IS NOT NULL |
| employee_lifecycle_template_tasks | employee_lifecycle_template_tasks_metadata_not_null | metadata IS NOT NULL |
| employee_lifecycle_template_tasks | employee_lifecycle_template_tasks_sequence_no_not_null | sequence_no IS NOT NULL |
| employee_lifecycle_template_tasks | employee_lifecycle_template_tasks_task_code_not_null | task_code IS NOT NULL |
| employee_lifecycle_template_tasks | employee_lifecycle_template_tasks_task_name_not_null | task_name IS NOT NULL |



## employee_lifecycle_templates

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| employee_lifecycle_templates | lifecycle_template_id | bigint | int8 | NO | nextval('employee_lifecycle_templates_lifecycle_template_id_seq'::regclass) |  |
| employee_lifecycle_templates | template_code | character varying | varchar | NO |  | 60 |
| employee_lifecycle_templates | template_name | character varying | varchar | NO |  | 140 |
| employee_lifecycle_templates | lifecycle_type | character varying | varchar | NO |  | 30 |
| employee_lifecycle_templates | applies_to | character varying | varchar | NO | 'both'::character varying | 20 |
| employee_lifecycle_templates | role_code | character varying | varchar | YES |  | 80 |
| employee_lifecycle_templates | department | character varying | varchar | YES |  | 120 |
| employee_lifecycle_templates | facility_code | character varying | varchar | YES |  | 80 |
| employee_lifecycle_templates | is_active | boolean | bool | NO | true |  |
| employee_lifecycle_templates | metadata | jsonb | jsonb | NO | '{}'::jsonb |  |
| employee_lifecycle_templates | created_by | integer | int4 | YES |  |  |
| employee_lifecycle_templates | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_lifecycle_templates | lifecycle_template_id | employee_lifecycle_templates_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| employee_lifecycle_templates | created_by | staff | staff_id | NO ACTION | NO ACTION | employee_lifecycle_templates_created_by_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| employee_lifecycle_templates | template_code | employee_lifecycle_templates_template_code_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| employee_lifecycle_templates | employee_lifecycle_templates_applies_to_check | ((applies_to)::text = ANY (ARRAY['staff'::text, 'doctor'::text, 'both'::text])) |
| employee_lifecycle_templates | employee_lifecycle_templates_applies_to_not_null | applies_to IS NOT NULL |
| employee_lifecycle_templates | employee_lifecycle_templates_created_at_not_null | created_at IS NOT NULL |
| employee_lifecycle_templates | employee_lifecycle_templates_is_active_not_null | is_active IS NOT NULL |
| employee_lifecycle_templates | employee_lifecycle_templates_lifecycle_template_id_not_null | lifecycle_template_id IS NOT NULL |
| employee_lifecycle_templates | employee_lifecycle_templates_lifecycle_type_not_null | lifecycle_type IS NOT NULL |
| employee_lifecycle_templates | employee_lifecycle_templates_metadata_not_null | metadata IS NOT NULL |
| employee_lifecycle_templates | employee_lifecycle_templates_template_code_not_null | template_code IS NOT NULL |
| employee_lifecycle_templates | employee_lifecycle_templates_template_name_not_null | template_name IS NOT NULL |
| employee_lifecycle_templates | employee_lifecycle_templates_type_check | ((lifecycle_type)::text = ANY (ARRAY['onboarding'::text, 'offboarding'::text, 'probation'::text, 'transfer'::text])) |



## finance_asset_purchase

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| finance_asset_purchase | asset_purchase_id | bigint | int8 | NO | nextval('finance_asset_purchase_asset_purchase_id_seq'::regclass) |  |
| finance_asset_purchase | purchase_date | date | date | NO |  |  |
| finance_asset_purchase | asset_name | character varying | varchar | NO |  | 180 |
| finance_asset_purchase | asset_category | character varying | varchar | NO |  | 80 |
| finance_asset_purchase | amount | numeric | numeric | NO |  |  |
| finance_asset_purchase | vendor_name | character varying | varchar | YES |  | 120 |
| finance_asset_purchase | reference_no | character varying | varchar | YES |  | 120 |
| finance_asset_purchase | useful_life_months | integer | int4 | YES |  |  |
| finance_asset_purchase | notes | text | text | YES |  |  |
| finance_asset_purchase | created_by | integer | int4 | YES |  |  |
| finance_asset_purchase | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| finance_asset_purchase | asset_purchase_id | finance_asset_purchase_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| finance_asset_purchase | created_by | staff | staff_id | NO ACTION | NO ACTION | finance_asset_purchase_created_by_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| finance_asset_purchase | finance_asset_purchase_amount_not_null | amount IS NOT NULL |
| finance_asset_purchase | finance_asset_purchase_asset_category_not_null | asset_category IS NOT NULL |
| finance_asset_purchase | finance_asset_purchase_asset_name_not_null | asset_name IS NOT NULL |
| finance_asset_purchase | finance_asset_purchase_asset_purchase_id_not_null | asset_purchase_id IS NOT NULL |
| finance_asset_purchase | finance_asset_purchase_created_at_not_null | created_at IS NOT NULL |
| finance_asset_purchase | finance_asset_purchase_purchase_date_not_null | purchase_date IS NOT NULL |



## finance_expense_category

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| finance_expense_category | code | text | text | NO |  |  |
| finance_expense_category | label | text | text | NO |  |  |
| finance_expense_category | description | text | text | YES |  |  |
| finance_expense_category | created_at | timestamp with time zone | timestamptz | NO | now() |  |
| finance_expense_category | updated_at | timestamp with time zone | timestamptz | NO | now() |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| finance_expense_category | code | finance_expense_category_pkey |


### Foreign keys

_(none)_


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| finance_expense_category | finance_expense_category_code_not_null | code IS NOT NULL |
| finance_expense_category | finance_expense_category_created_at_not_null | created_at IS NOT NULL |
| finance_expense_category | finance_expense_category_label_not_null | label IS NOT NULL |
| finance_expense_category | finance_expense_category_updated_at_not_null | updated_at IS NOT NULL |



## finance_expense_entry

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| finance_expense_entry | expense_id | bigint | int8 | NO | nextval('finance_expense_entry_expense_id_seq'::regclass) |  |
| finance_expense_entry | expense_date | date | date | NO |  |  |
| finance_expense_entry | category | character varying | varchar | NO |  | 60 |
| finance_expense_entry | subcategory | character varying | varchar | YES |  | 60 |
| finance_expense_entry | amount | numeric | numeric | NO |  |  |
| finance_expense_entry | vendor_name | character varying | varchar | YES |  | 120 |
| finance_expense_entry | reference_no | character varying | varchar | YES |  | 120 |
| finance_expense_entry | payment_mode | character varying | varchar | YES |  | 40 |
| finance_expense_entry | notes | text | text | YES |  |  |
| finance_expense_entry | created_by | integer | int4 | YES |  |  |
| finance_expense_entry | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| finance_expense_entry | expense_id | finance_expense_entry_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| finance_expense_entry | created_by | staff | staff_id | NO ACTION | NO ACTION | finance_expense_entry_created_by_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| finance_expense_entry | finance_expense_entry_amount_not_null | amount IS NOT NULL |
| finance_expense_entry | finance_expense_entry_category_not_null | category IS NOT NULL |
| finance_expense_entry | finance_expense_entry_created_at_not_null | created_at IS NOT NULL |
| finance_expense_entry | finance_expense_entry_expense_date_not_null | expense_date IS NOT NULL |
| finance_expense_entry | finance_expense_entry_expense_id_not_null | expense_id IS NOT NULL |



## lab_order

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| lab_order | order_id | integer | int4 | NO | nextval('lab_order_order_id_seq'::regclass) |  |
| lab_order | visit_id | integer | int4 | NO |  |  |
| lab_order | test_id | integer | int4 | NO |  |  |
| lab_order | ordered_by | integer | int4 | NO |  |  |
| lab_order | performed_by | integer | int4 | YES |  |  |
| lab_order | status | character varying | varchar | YES |  | 100 |
| lab_order | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| lab_order | urgency | character varying | varchar | NO | 'Routine'::character varying | 50 |
| lab_order | results_entered_at | timestamp without time zone | timestamp | YES |  |  |
| lab_order | results_entered_by | integer | int4 | YES |  |  |
| lab_order | finalized_at | timestamp without time zone | timestamp | YES |  |  |
| lab_order | finalized_by | integer | int4 | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| lab_order | order_id | lab_order_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| lab_order | finalized_by | staff | staff_id | NO ACTION | NO ACTION | lab_order_finalized_by_fkey |
| lab_order | ordered_by | doctor | doctor_id | NO ACTION | NO ACTION | lab_order_ordered_by_fkey |
| lab_order | performed_by | staff | staff_id | NO ACTION | NO ACTION | lab_order_performed_by_fkey |
| lab_order | results_entered_by | staff | staff_id | NO ACTION | NO ACTION | lab_order_results_entered_by_fkey |
| lab_order | test_id | lab_test | test_id | NO ACTION | NO ACTION | lab_order_test_id_fkey |
| lab_order | visit_id | visit | visit_id | NO ACTION | NO ACTION | lab_order_visit_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| lab_order | lab_order_order_id_not_null | order_id IS NOT NULL |
| lab_order | lab_order_ordered_by_not_null | ordered_by IS NOT NULL |
| lab_order | lab_order_status_check | ((status)::text = ANY (ARRAY[('Pending'::character varying)::text, ('Performed'::character varying)::text, ('Completed'::character varying)::text])) |
| lab_order | lab_order_test_id_not_null | test_id IS NOT NULL |
| lab_order | lab_order_urgency_check | ((urgency)::text = ANY (ARRAY[('STAT'::character varying)::text, ('Urgent'::character varying)::text, ('Routine'::character varying)::text, ('Timed'::character varying)::text])) |
| lab_order | lab_order_urgency_not_null | urgency IS NOT NULL |
| lab_order | lab_order_visit_id_not_null | visit_id IS NOT NULL |



## lab_result

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| lab_result | order_id | integer | int4 | NO |  |  |
| lab_result | lab_result | text | text | YES |  |  |
| lab_result | reported_by | integer | int4 | NO |  |  |
| lab_result | reported_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| lab_result | result_id | integer | int4 | NO | nextval('lab_result_result_id_seq'::regclass) |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| lab_result | result_id | lab_result_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| lab_result | order_id | lab_order | order_id | NO ACTION | NO ACTION | lab_result_order_id_fkey |
| lab_result | reported_by | staff | staff_id | NO ACTION | NO ACTION | lab_result_reported_by_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| lab_result | lab_result_order_id_not_null | order_id IS NOT NULL |
| lab_result | lab_result_reported_by_not_null | reported_by IS NOT NULL |
| lab_result | lab_result_result_id_not_null | result_id IS NOT NULL |



## lab_result_approvals

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| lab_result_approvals | approval_id | integer | int4 | NO | nextval('lab_result_approvals_approval_id_seq'::regclass) |  |
| lab_result_approvals | order_id | integer | int4 | NO |  |  |
| lab_result_approvals | approved_by | integer | int4 | NO |  |  |
| lab_result_approvals | approval_status | character varying | varchar | YES | 'pending'::character varying | 20 |
| lab_result_approvals | approval_notes | text | text | YES |  |  |
| lab_result_approvals | approved_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| lab_result_approvals | signature_data | text | text | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| lab_result_approvals | approval_id | lab_result_approvals_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| lab_result_approvals | approved_by | staff | staff_id | NO ACTION | NO ACTION | lab_result_approvals_approved_by_fkey |
| lab_result_approvals | order_id | lab_order | order_id | NO ACTION | NO ACTION | lab_result_approvals_order_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| lab_result_approvals | order_id | lab_result_approvals_order_id_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| lab_result_approvals | lab_result_approvals_approval_id_not_null | approval_id IS NOT NULL |
| lab_result_approvals | lab_result_approvals_approved_by_not_null | approved_by IS NOT NULL |
| lab_result_approvals | lab_result_approvals_order_id_not_null | order_id IS NOT NULL |



## lab_test

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| lab_test | test_id | integer | int4 | NO |  |  |
| lab_test | test_name | character varying | varchar | NO |  | 100 |
| lab_test | category | character varying | varchar | YES |  | 50 |
| lab_test | price | numeric | numeric | YES |  |  |
| lab_test | description | text | text | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| lab_test | test_id | lab_test_pkey |


### Foreign keys

_(none)_


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| lab_test | lab_test_test_id_not_null | test_id IS NOT NULL |
| lab_test | lab_test_test_name_not_null | test_name IS NOT NULL |



## lab_test_parameters

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| lab_test_parameters | parameter_id | integer | int4 | NO | nextval('lab_test_parameters_parameter_id_seq'::regclass) |  |
| lab_test_parameters | test_id | integer | int4 | NO |  |  |
| lab_test_parameters | parameter_name | character varying | varchar | NO |  | 100 |
| lab_test_parameters | parameter_code | character varying | varchar | YES |  | 50 |
| lab_test_parameters | unit | character varying | varchar | YES |  | 50 |
| lab_test_parameters | input_type | character varying | varchar | YES | 'number'::character varying | 20 |
| lab_test_parameters | reference_range_min | numeric | numeric | YES |  |  |
| lab_test_parameters | reference_range_max | numeric | numeric | YES |  |  |
| lab_test_parameters | reference_value_text | text | text | YES |  |  |
| lab_test_parameters | display_order | integer | int4 | YES | 0 |  |
| lab_test_parameters | is_critical | boolean | bool | YES | false |  |
| lab_test_parameters | is_required | boolean | bool | YES | true |  |
| lab_test_parameters | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| lab_test_parameters | parameter_id | lab_test_parameters_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| lab_test_parameters | test_id | lab_test | test_id | NO ACTION | NO ACTION | lab_test_parameters_test_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| lab_test_parameters | test_id | lab_test_parameters_test_id_parameter_code_key |
| lab_test_parameters | parameter_code | lab_test_parameters_test_id_parameter_code_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| lab_test_parameters | lab_test_parameters_parameter_id_not_null | parameter_id IS NOT NULL |
| lab_test_parameters | lab_test_parameters_parameter_name_not_null | parameter_name IS NOT NULL |
| lab_test_parameters | lab_test_parameters_test_id_not_null | test_id IS NOT NULL |



## lab_test_results

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| lab_test_results | result_id | integer | int4 | NO | nextval('lab_test_results_result_id_seq'::regclass) |  |
| lab_test_results | order_id | integer | int4 | NO |  |  |
| lab_test_results | parameter_id | integer | int4 | NO |  |  |
| lab_test_results | result_value | character varying | varchar | YES |  | 255 |
| lab_test_results | is_abnormal | boolean | bool | YES | false |  |
| lab_test_results | technician_notes | text | text | YES |  |  |
| lab_test_results | entered_by | integer | int4 | YES |  |  |
| lab_test_results | entered_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| lab_test_results | verified_by | integer | int4 | YES |  |  |
| lab_test_results | verified_at | timestamp without time zone | timestamp | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| lab_test_results | result_id | lab_test_results_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| lab_test_results | entered_by | staff | staff_id | NO ACTION | NO ACTION | lab_test_results_entered_by_fkey |
| lab_test_results | order_id | lab_order | order_id | NO ACTION | NO ACTION | lab_test_results_order_id_fkey |
| lab_test_results | parameter_id | lab_test_parameters | parameter_id | NO ACTION | NO ACTION | lab_test_results_parameter_id_fkey |
| lab_test_results | verified_by | staff | staff_id | NO ACTION | NO ACTION | lab_test_results_verified_by_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| lab_test_results | order_id | lab_test_results_order_id_parameter_id_key |
| lab_test_results | parameter_id | lab_test_results_order_id_parameter_id_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| lab_test_results | lab_test_results_order_id_not_null | order_id IS NOT NULL |
| lab_test_results | lab_test_results_parameter_id_not_null | parameter_id IS NOT NULL |
| lab_test_results | lab_test_results_result_id_not_null | result_id IS NOT NULL |



## leave_employee_quota_override

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| leave_employee_quota_override | override_id | bigint | int8 | NO | nextval('leave_employee_quota_override_override_id_seq'::regclass) |  |
| leave_employee_quota_override | account_type | character varying | varchar | NO |  | 20 |
| leave_employee_quota_override | person_id | integer | int4 | NO |  |  |
| leave_employee_quota_override | staff_id | integer | int4 | YES |  |  |
| leave_employee_quota_override | doctor_id | integer | int4 | YES |  |  |
| leave_employee_quota_override | leave_type_id | integer | int4 | NO |  |  |
| leave_employee_quota_override | annual_quota | numeric | numeric | NO |  |  |
| leave_employee_quota_override | active | boolean | bool | NO | true |  |
| leave_employee_quota_override | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| leave_employee_quota_override | updated_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| leave_employee_quota_override | override_id | leave_employee_quota_override_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| leave_employee_quota_override | doctor_id | doctor | doctor_id | NO ACTION | CASCADE | leave_employee_quota_override_doctor_id_fkey |
| leave_employee_quota_override | leave_type_id | staff_leave_types | leave_type_id | NO ACTION | RESTRICT | leave_employee_quota_override_leave_type_id_fkey |
| leave_employee_quota_override | staff_id | staff | staff_id | NO ACTION | CASCADE | leave_employee_quota_override_staff_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| leave_employee_quota_override | account_type | leave_employee_quota_override_account_type_person_id_leave__key |
| leave_employee_quota_override | person_id | leave_employee_quota_override_account_type_person_id_leave__key |
| leave_employee_quota_override | leave_type_id | leave_employee_quota_override_account_type_person_id_leave__key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| leave_employee_quota_override | leave_employee_override_account_type_check | ((account_type)::text = ANY (ARRAY[('staff'::character varying)::text, ('doctor'::character varying)::text])) |
| leave_employee_quota_override | leave_employee_override_ref_check | ((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id))) |
| leave_employee_quota_override | leave_employee_quota_override_account_type_not_null | account_type IS NOT NULL |
| leave_employee_quota_override | leave_employee_quota_override_active_not_null | active IS NOT NULL |
| leave_employee_quota_override | leave_employee_quota_override_annual_quota_not_null | annual_quota IS NOT NULL |
| leave_employee_quota_override | leave_employee_quota_override_created_at_not_null | created_at IS NOT NULL |
| leave_employee_quota_override | leave_employee_quota_override_leave_type_id_not_null | leave_type_id IS NOT NULL |
| leave_employee_quota_override | leave_employee_quota_override_override_id_not_null | override_id IS NOT NULL |
| leave_employee_quota_override | leave_employee_quota_override_person_id_not_null | person_id IS NOT NULL |
| leave_employee_quota_override | leave_employee_quota_override_updated_at_not_null | updated_at IS NOT NULL |



## leave_role_quota

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| leave_role_quota | role_quota_id | bigint | int8 | NO | nextval('leave_role_quota_role_quota_id_seq'::regclass) |  |
| leave_role_quota | role_name | character varying | varchar | NO |  | 80 |
| leave_role_quota | leave_type_id | integer | int4 | NO |  |  |
| leave_role_quota | annual_quota | numeric | numeric | NO |  |  |
| leave_role_quota | active | boolean | bool | NO | true |  |
| leave_role_quota | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| leave_role_quota | updated_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| leave_role_quota | role_quota_id | leave_role_quota_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| leave_role_quota | leave_type_id | staff_leave_types | leave_type_id | NO ACTION | RESTRICT | leave_role_quota_leave_type_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| leave_role_quota | role_name | leave_role_quota_role_name_leave_type_id_key |
| leave_role_quota | leave_type_id | leave_role_quota_role_name_leave_type_id_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| leave_role_quota | leave_role_quota_active_not_null | active IS NOT NULL |
| leave_role_quota | leave_role_quota_annual_quota_not_null | annual_quota IS NOT NULL |
| leave_role_quota | leave_role_quota_created_at_not_null | created_at IS NOT NULL |
| leave_role_quota | leave_role_quota_leave_type_id_not_null | leave_type_id IS NOT NULL |
| leave_role_quota | leave_role_quota_role_name_not_null | role_name IS NOT NULL |
| leave_role_quota | leave_role_quota_role_quota_id_not_null | role_quota_id IS NOT NULL |
| leave_role_quota | leave_role_quota_updated_at_not_null | updated_at IS NOT NULL |



## medicine

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| medicine | medicine_id | integer | int4 | NO | nextval('medicine_medicine_id_seq'::regclass) |  |
| medicine | generic_name | character varying | varchar | NO |  | 100 |
| medicine | brand_name | character varying | varchar | NO |  | 100 |
| medicine | category | character varying | varchar | NO |  | 100 |
| medicine | dosage_value | numeric | numeric | YES |  |  |
| medicine | dosage_unit | character varying | varchar | YES |  | 20 |
| medicine | form | character varying | varchar | YES |  | 50 |
| medicine | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| medicine | barcode | character varying | varchar | YES |  | 50 |
| medicine | sku | character varying | varchar | YES |  | 50 |
| medicine | manufacturer | character varying | varchar | YES |  | 100 |
| medicine | min_stock_level | integer | int4 | YES | 10 |  |
| medicine | max_stock_level | integer | int4 | YES | 1000 |  |
| medicine | is_active | boolean | bool | YES | true |  |
| medicine | requires_prescription | boolean | bool | YES | false |  |
| medicine | search_vector | tsvector | tsvector | YES |  |  |
| medicine | sub_unit | character varying | varchar | YES |  | 20 |
| medicine | sub_units_per_unit | integer | int4 | YES |  |  |
| medicine | sub_unit_price | numeric | numeric | YES |  |  |
| medicine | allow_sub_unit_sale | boolean | bool | YES | false |  |
| medicine | category_id | integer | int4 | YES |  |  |
| medicine | manufacturer_id | integer | int4 | YES |  |  |
| medicine | form_id | integer | int4 | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| medicine | medicine_id | medicine_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| medicine | category_id | medicine_category | category_id | NO ACTION | NO ACTION | medicine_category_id_fkey |
| medicine | form_id | medicine_form | form_id | NO ACTION | NO ACTION | medicine_form_id_fkey |
| medicine | manufacturer_id | medicine_manufacturer | manufacturer_id | NO ACTION | NO ACTION | medicine_manufacturer_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| medicine | barcode | medicine_barcode_key |
| medicine | sku | medicine_sku_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| medicine | medicine_brand_name_not_null | brand_name IS NOT NULL |
| medicine | medicine_category_not_null | category IS NOT NULL |
| medicine | medicine_generic_name_not_null | generic_name IS NOT NULL |
| medicine | medicine_medicine_id_not_null | medicine_id IS NOT NULL |



## medicine_batch

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| medicine_batch | batch_id | integer | int4 | NO | nextval('medicine_batch_batch_id_seq'::regclass) |  |
| medicine_batch | medicine_id | integer | int4 | YES |  |  |
| medicine_batch | stock_quantity | integer | int4 | YES |  |  |
| medicine_batch | stock_sub_quantity | integer | int4 | YES |  |  |
| medicine_batch | purchase_price | numeric | numeric | YES |  |  |
| medicine_batch | purchase_sub_unit_price | numeric | numeric | YES |  |  |
| medicine_batch | sale_price | numeric | numeric | YES |  |  |
| medicine_batch | sale_sub_unit_price | numeric | numeric | YES |  |  |
| medicine_batch | expiry_date | date | date | YES |  |  |
| medicine_batch | batch_number | text | text | YES |  |  |
| medicine_batch | received_date | timestamp without time zone | timestamp | YES | now() |  |
| medicine_batch | party_id | integer | int4 | YES |  |  |
| medicine_batch | batch_code | text | text | NO | generate_batch_code() |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| medicine_batch | batch_id | medicine_batch_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| medicine_batch | medicine_id | medicine | medicine_id | NO ACTION | NO ACTION | medicine_batch_medicine_id_fkey |
| medicine_batch | party_id | party | party_id | NO ACTION | NO ACTION | medicine_batch_party_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| medicine_batch | batch_code | uk_batch_code |
| medicine_batch | medicine_id | uk_med_batch_party |
| medicine_batch | batch_number | uk_med_batch_party |
| medicine_batch | party_id | uk_med_batch_party |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| medicine_batch | ck_purchase_price_nonneg | (purchase_price >= (0)::numeric) |
| medicine_batch | ck_purchase_sub_unit_price_nonneg | (purchase_sub_unit_price >= (0)::numeric) |
| medicine_batch | ck_sale_price_nonneg | (sale_price >= (0)::numeric) |
| medicine_batch | ck_sale_sub_unit_price_nonneg | (sale_sub_unit_price >= (0)::numeric) |
| medicine_batch | ck_stock_qty_non_negative | (stock_quantity >= 0) |
| medicine_batch | ck_sub_stock_qty_non_negative | (stock_sub_quantity >= 0) |
| medicine_batch | medicine_batch_batch_code_not_null | batch_code IS NOT NULL |
| medicine_batch | medicine_batch_batch_id_not_null | batch_id IS NOT NULL |



## medicine_category

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| medicine_category | category_id | integer | int4 | NO |  |  |
| medicine_category | name | character varying | varchar | NO |  | 100 |
| medicine_category | is_active | boolean | bool | NO | true |  |
| medicine_category | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| medicine_category | category_id | medicine_category_pkey |


### Foreign keys

_(none)_


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| medicine_category | medicine_category_category_id_not_null | category_id IS NOT NULL |
| medicine_category | medicine_category_created_at_not_null | created_at IS NOT NULL |
| medicine_category | medicine_category_is_active_not_null | is_active IS NOT NULL |
| medicine_category | medicine_category_name_not_null | name IS NOT NULL |



## medicine_form

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| medicine_form | form_id | integer | int4 | NO |  |  |
| medicine_form | name | character varying | varchar | NO |  | 50 |
| medicine_form | is_active | boolean | bool | NO | true |  |
| medicine_form | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| medicine_form | form_id | medicine_form_pkey |


### Foreign keys

_(none)_


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| medicine_form | medicine_form_created_at_not_null | created_at IS NOT NULL |
| medicine_form | medicine_form_form_id_not_null | form_id IS NOT NULL |
| medicine_form | medicine_form_is_active_not_null | is_active IS NOT NULL |
| medicine_form | medicine_form_name_not_null | name IS NOT NULL |



## medicine_manufacturer

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| medicine_manufacturer | manufacturer_id | integer | int4 | NO |  |  |
| medicine_manufacturer | name | character varying | varchar | NO |  | 100 |
| medicine_manufacturer | is_active | boolean | bool | NO | true |  |
| medicine_manufacturer | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| medicine_manufacturer | manufacturer_id | medicine_manufacturer_pkey |


### Foreign keys

_(none)_


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| medicine_manufacturer | medicine_manufacturer_created_at_not_null | created_at IS NOT NULL |
| medicine_manufacturer | medicine_manufacturer_is_active_not_null | is_active IS NOT NULL |
| medicine_manufacturer | medicine_manufacturer_manufacturer_id_not_null | manufacturer_id IS NOT NULL |
| medicine_manufacturer | medicine_manufacturer_name_not_null | name IS NOT NULL |



## medicine_purchase

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| medicine_purchase | purchase_id | integer | int4 | NO | nextval('medicine_purchase_purchase_id_seq'::regclass) |  |
| medicine_purchase | party_id | integer | int4 | NO |  |  |
| medicine_purchase | invoice_no | character varying | varchar | NO | generate_invoice_no() | 100 |
| medicine_purchase | invoice_timestamp | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| medicine_purchase | total_amount | numeric | numeric | YES |  |  |
| medicine_purchase | payment_status | character varying | varchar | YES |  | 100 |
| medicine_purchase | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| medicine_purchase | created_by | integer | int4 | YES |  |  |
| medicine_purchase | paid_amount | numeric | numeric | YES | 0 |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| medicine_purchase | purchase_id | medicine_purchase_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| medicine_purchase | created_by | staff | staff_id | NO ACTION | NO ACTION | medicine_purchase_created_by_fkey |
| medicine_purchase | party_id | party | party_id | NO ACTION | NO ACTION | medicine_purchase_party_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| medicine_purchase | medicine_purchase_invoice_no_not_null | invoice_no IS NOT NULL |
| medicine_purchase | medicine_purchase_party_id_not_null | party_id IS NOT NULL |
| medicine_purchase | medicine_purchase_payment_status_check | ((payment_status)::text = ANY (ARRAY[('Paid'::character varying)::text, ('Unpaid'::character varying)::text, ('Partial'::character varying)::text])) |
| medicine_purchase | medicine_purchase_purchase_id_not_null | purchase_id IS NOT NULL |



## medicine_purchase_detail

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| medicine_purchase_detail | id | integer | int4 | NO | nextval('medicine_purchase_detail_id_seq'::regclass) |  |
| medicine_purchase_detail | purchase_id | integer | int4 | NO |  |  |
| medicine_purchase_detail | medicine_id | integer | int4 | NO |  |  |
| medicine_purchase_detail | quantity | integer | int4 | NO |  |  |
| medicine_purchase_detail | unit_cost | numeric | numeric | YES |  |  |
| medicine_purchase_detail | sub_quantity | integer | int4 | YES | 0 |  |
| medicine_purchase_detail | sub_unit_cost | numeric | numeric | YES | 0 |  |
| medicine_purchase_detail | batch_id | integer | int4 | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| medicine_purchase_detail | id | medicine_purchase_detail_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| medicine_purchase_detail | batch_id | medicine_batch | batch_id | NO ACTION | NO ACTION | medicine_purchase_detail_batch_id_fkey |
| medicine_purchase_detail | medicine_id | medicine | medicine_id | NO ACTION | NO ACTION | medicine_purchase_detail_medicine_id_fkey |
| medicine_purchase_detail | purchase_id | medicine_purchase | purchase_id | NO ACTION | NO ACTION | medicine_purchase_detail_purchase_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| medicine_purchase_detail | medicine_purchase_detail_id_not_null | id IS NOT NULL |
| medicine_purchase_detail | medicine_purchase_detail_medicine_id_not_null | medicine_id IS NOT NULL |
| medicine_purchase_detail | medicine_purchase_detail_purchase_id_not_null | purchase_id IS NOT NULL |
| medicine_purchase_detail | medicine_purchase_detail_quantity_not_null | quantity IS NOT NULL |



## medicine_transaction

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| medicine_transaction | txn_id | integer | int4 | NO | nextval('medicine_transaction_txn_id_seq'::regclass) |  |
| medicine_transaction | medicine_id | integer | int4 | NO |  |  |
| medicine_transaction | txn_type | character varying | varchar | YES |  | 100 |
| medicine_transaction | quantity | integer | int4 | NO |  |  |
| medicine_transaction | amount_per_unit | numeric | numeric | NO |  |  |
| medicine_transaction | ref_purchase_id | integer | int4 | YES |  |  |
| medicine_transaction | ref_sale_id | integer | int4 | YES |  |  |
| medicine_transaction | ref_purchase_return | integer | int4 | YES |  |  |
| medicine_transaction | ref_sale_return | integer | int4 | YES |  |  |
| medicine_transaction | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| medicine_transaction | sub_quantity | integer | int4 | YES | 0 |  |
| medicine_transaction | batch_id | integer | int4 | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| medicine_transaction | txn_id | medicine_transaction_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| medicine_transaction | batch_id | medicine_batch | batch_id | NO ACTION | NO ACTION | medicine_transaction_batch_id_fkey |
| medicine_transaction | medicine_id | medicine | medicine_id | NO ACTION | NO ACTION | medicine_transaction_medicine_id_fkey |
| medicine_transaction | ref_purchase_id | medicine_purchase | purchase_id | NO ACTION | NO ACTION | medicine_transaction_ref_purchase_id_fkey |
| medicine_transaction | ref_purchase_return | purchase_return | return_id | NO ACTION | NO ACTION | medicine_transaction_ref_purchase_return_fkey |
| medicine_transaction | ref_sale_id | pharmacy_sale | sale_id | NO ACTION | NO ACTION | medicine_transaction_ref_sale_id_fkey |
| medicine_transaction | ref_sale_return | sale_return | return_id | NO ACTION | NO ACTION | medicine_transaction_ref_sale_return_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| medicine_transaction | medicine_transaction_amount_per_unit_not_null | amount_per_unit IS NOT NULL |
| medicine_transaction | medicine_transaction_medicine_id_not_null | medicine_id IS NOT NULL |
| medicine_transaction | medicine_transaction_quantity_not_null | quantity IS NOT NULL |
| medicine_transaction | medicine_transaction_txn_id_not_null | txn_id IS NOT NULL |
| medicine_transaction | medicine_transaction_txn_type_check | ((txn_type)::text = ANY (ARRAY[('purchase'::character varying)::text, ('sale'::character varying)::text, ('purchase_return'::character varying)::text, ('sale_return'::character varying)::text, ('adjustment'::character varying)::text])) |



## menstrual_history

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| menstrual_history | menstrual_history_id | integer | int4 | NO | nextval('menstrual_history_menstrual_history_id_seq'::regclass) |  |
| menstrual_history | patient_id | integer | int4 | NO |  |  |
| menstrual_history | menarch_age | integer | int4 | YES |  |  |
| menstrual_history | cycle_length_days | integer | int4 | YES |  |  |
| menstrual_history | bleeding_days | integer | int4 | YES |  |  |
| menstrual_history | menstrual_regular | boolean | bool | YES |  |  |
| menstrual_history | contraception_history | text | text | YES |  |  |
| menstrual_history | gynecologic_surgeries | text | text | YES |  |  |
| menstrual_history | medical_conditions | text | text | YES |  |  |
| menstrual_history | menopause_status | boolean | bool | YES |  |  |
| menstrual_history | notes | text | text | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| menstrual_history | menstrual_history_id | menstrual_history_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| menstrual_history | patient_id | patient | patient_id | NO ACTION | NO ACTION | menstrual_history_patient_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| menstrual_history | patient_id | uq_menstrual_history_patient_id |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| menstrual_history | menstrual_history_menstrual_history_id_not_null | menstrual_history_id IS NOT NULL |
| menstrual_history | menstrual_history_patient_id_not_null | patient_id IS NOT NULL |



## obstetric_history

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| obstetric_history | obstetric_history_id | integer | int4 | NO | nextval('obstetric_history_obstetric_history_id_seq'::regclass) |  |
| obstetric_history | patient_id | integer | int4 | NO |  |  |
| obstetric_history | is_first_pregnancy | boolean | bool | YES |  |  |
| obstetric_history | married_years | integer | int4 | YES |  |  |
| obstetric_history | gravida | integer | int4 | YES |  |  |
| obstetric_history | para | integer | int4 | YES |  |  |
| obstetric_history | abortions | integer | int4 | YES |  |  |
| obstetric_history | edd | date | date | YES |  |  |
| obstetric_history | last_menstrual_cycle | date | date | YES |  |  |
| obstetric_history | notes | text | text | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| obstetric_history | obstetric_history_id | obstetric_history_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| obstetric_history | patient_id | patient | patient_id | NO ACTION | NO ACTION | obstetric_history_patient_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| obstetric_history | patient_id | unique_patient_id_obs_history |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| obstetric_history | obstetric_history_obstetric_history_id_not_null | obstetric_history_id IS NOT NULL |
| obstetric_history | obstetric_history_patient_id_not_null | patient_id IS NOT NULL |



## para_details

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| para_details | para_id | integer | int4 | NO | nextval('para_details_para_id_seq'::regclass) |  |
| para_details | obstetric_history_id | integer | int4 | NO |  |  |
| para_details | para_number | integer | int4 | YES |  |  |
| para_details | birth_year | integer | int4 | YES |  |  |
| para_details | birth_month | integer | int4 | YES |  |  |
| para_details | gender | character varying | varchar | YES |  | 20 |
| para_details | delivery_type | character varying | varchar | YES |  | 50 |
| para_details | alive | boolean | bool | YES |  |  |
| para_details | birth_weight_grams | integer | int4 | YES |  |  |
| para_details | complications | text | text | YES |  |  |
| para_details | notes | text | text | YES |  |  |
| para_details | gestational_age_weeks | integer | int4 | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| para_details | para_id | para_details_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| para_details | obstetric_history_id | obstetric_history | obstetric_history_id | NO ACTION | NO ACTION | para_details_obstetric_history_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| para_details | obstetric_history_id | unique_obstetric_para |
| para_details | para_number | unique_obstetric_para |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| para_details | para_details_gender_check | ((gender)::text = ANY (ARRAY[('Male'::character varying)::text, ('Female'::character varying)::text])) |
| para_details | para_details_obstetric_history_id_not_null | obstetric_history_id IS NOT NULL |
| para_details | para_details_para_id_not_null | para_id IS NOT NULL |



## party

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| party | party_id | integer | int4 | NO | nextval('party_party_id_seq'::regclass) |  |
| party | name | character varying | varchar | NO |  | 100 |
| party | contact_number | character varying | varchar | YES |  | 200 |
| party | address | text | text | YES |  |  |
| party | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| party | email | character varying | varchar | YES |  | 255 |
| party | gst_number | character varying | varchar | YES |  | 100 |
| party | status | boolean | bool | YES | true |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| party | party_id | party_pkey |


### Foreign keys

_(none)_


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| party | party_name_not_null | name IS NOT NULL |
| party | party_party_id_not_null | party_id IS NOT NULL |



## party_payment

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| party_payment | payment_id | integer | int4 | NO | nextval('party_payment_payment_id_seq'::regclass) |  |
| party_payment | party_id | integer | int4 | NO |  |  |
| party_payment | amount | numeric | numeric | NO |  |  |
| party_payment | payment_date | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| party_payment | payment_method | character varying | varchar | YES |  | 50 |
| party_payment | reference_note | text | text | YES |  |  |
| party_payment | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| party_payment | created_by | integer | int4 | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| party_payment | payment_id | party_payment_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| party_payment | party_id | party | party_id | NO ACTION | CASCADE | party_payment_party_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| party_payment | party_payment_amount_not_null | amount IS NOT NULL |
| party_payment | party_payment_party_id_not_null | party_id IS NOT NULL |
| party_payment | party_payment_payment_id_not_null | payment_id IS NOT NULL |



## patient

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| patient | patient_id | integer | int4 | NO | nextval('patient_patient_id_seq'::regclass) |  |
| patient | patient_name | character varying | varchar | NO |  | 100 |
| patient | age | integer | int4 | YES |  |  |
| patient | gender | character varying | varchar | YES |  | 26 |
| patient | contact_number | character varying | varchar | YES |  | 20 |
| patient | cnic | character varying | varchar | YES |  | 20 |
| patient | address | text | text | YES |  |  |
| patient | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| patient | patient_id | patient_pkey |


### Foreign keys

_(none)_


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| patient | patient_gender_check | ((gender)::text = ANY (ARRAY[('Male'::character varying)::text, ('Female'::character varying)::text, ('Other'::character varying)::text])) |
| patient | patient_patient_id_not_null | patient_id IS NOT NULL |
| patient | patient_patient_name_not_null | patient_name IS NOT NULL |



## patient_vitals

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| patient_vitals | vital_id | integer | int4 | NO | nextval('patient_vitals_vital_id_seq'::regclass) |  |
| patient_vitals | visit_id | integer | int4 | NO |  |  |
| patient_vitals | blood_pressure | character varying | varchar | YES |  | 20 |
| patient_vitals | heart_rate | integer | int4 | YES |  |  |
| patient_vitals | temperature | integer | int4 | YES |  |  |
| patient_vitals | weight | integer | int4 | YES |  |  |
| patient_vitals | height | integer | int4 | YES |  |  |
| patient_vitals | recorded_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| patient_vitals | blood_group | character varying | varchar | YES |  | 20 |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| patient_vitals | vital_id | patient_vitals_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| patient_vitals | visit_id | visit | visit_id | NO ACTION | CASCADE | patient_vitals_visit_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| patient_vitals | visit_id | unique_patient_vitals |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| patient_vitals | patient_vitals_blood_group_check | ((blood_group)::text = ANY (ARRAY[('A+'::character varying)::text, ('A-'::character varying)::text, ('B+'::character varying)::text, ('B-'::character varying)::text, ('O+'::character varying)::text, ('O-'::character varying)::text, ('AB+'::character varying)::text, ('AB-'::character varying)::text])) |
| patient_vitals | patient_vitals_visit_id_not_null | visit_id IS NOT NULL |
| patient_vitals | patient_vitals_vital_id_not_null | vital_id IS NOT NULL |



## payroll_line_item

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| payroll_line_item | payroll_line_id | bigint | int8 | NO | nextval('payroll_line_item_payroll_line_id_seq'::regclass) |  |
| payroll_line_item | payroll_run_id | bigint | int8 | NO |  |  |
| payroll_line_item | account_type | character varying | varchar | NO |  | 20 |
| payroll_line_item | person_id | integer | int4 | NO |  |  |
| payroll_line_item | staff_id | integer | int4 | YES |  |  |
| payroll_line_item | doctor_id | integer | int4 | YES |  |  |
| payroll_line_item | salary_model | character varying | varchar | NO |  | 30 |
| payroll_line_item | base_amount | numeric | numeric | NO | 0 |  |
| payroll_line_item | patient_count | integer | int4 | NO | 0 |  |
| payroll_line_item | per_patient_fee | numeric | numeric | NO | 0 |  |
| payroll_line_item | allowance_total | numeric | numeric | NO | 0 |  |
| payroll_line_item | deduction_total | numeric | numeric | NO | 0 |  |
| payroll_line_item | adjustment_total | numeric | numeric | NO | 0 |  |
| payroll_line_item | gross_amount | numeric | numeric | NO | 0 |  |
| payroll_line_item | net_amount | numeric | numeric | NO | 0 |  |
| payroll_line_item | calc_snapshot | jsonb | jsonb | NO | '{}'::jsonb |  |
| payroll_line_item | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| payroll_line_item | updated_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| payroll_line_item | payroll_line_id | payroll_line_item_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| payroll_line_item | doctor_id | doctor | doctor_id | NO ACTION | CASCADE | payroll_line_item_doctor_id_fkey |
| payroll_line_item | payroll_run_id | payroll_run | payroll_run_id | NO ACTION | CASCADE | payroll_line_item_payroll_run_id_fkey |
| payroll_line_item | staff_id | staff | staff_id | NO ACTION | CASCADE | payroll_line_item_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| payroll_line_item | payroll_line_account_type_check | ((account_type)::text = ANY (ARRAY[('staff'::character varying)::text, ('doctor'::character varying)::text])) |
| payroll_line_item | payroll_line_item_account_type_not_null | account_type IS NOT NULL |
| payroll_line_item | payroll_line_item_adjustment_total_not_null | adjustment_total IS NOT NULL |
| payroll_line_item | payroll_line_item_allowance_total_not_null | allowance_total IS NOT NULL |
| payroll_line_item | payroll_line_item_base_amount_not_null | base_amount IS NOT NULL |
| payroll_line_item | payroll_line_item_calc_snapshot_not_null | calc_snapshot IS NOT NULL |
| payroll_line_item | payroll_line_item_created_at_not_null | created_at IS NOT NULL |
| payroll_line_item | payroll_line_item_deduction_total_not_null | deduction_total IS NOT NULL |
| payroll_line_item | payroll_line_item_gross_amount_not_null | gross_amount IS NOT NULL |
| payroll_line_item | payroll_line_item_net_amount_not_null | net_amount IS NOT NULL |
| payroll_line_item | payroll_line_item_patient_count_not_null | patient_count IS NOT NULL |
| payroll_line_item | payroll_line_item_payroll_line_id_not_null | payroll_line_id IS NOT NULL |
| payroll_line_item | payroll_line_item_payroll_run_id_not_null | payroll_run_id IS NOT NULL |
| payroll_line_item | payroll_line_item_per_patient_fee_not_null | per_patient_fee IS NOT NULL |
| payroll_line_item | payroll_line_item_person_id_not_null | person_id IS NOT NULL |
| payroll_line_item | payroll_line_item_salary_model_not_null | salary_model IS NOT NULL |
| payroll_line_item | payroll_line_item_updated_at_not_null | updated_at IS NOT NULL |
| payroll_line_item | payroll_line_ref_check | ((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id))) |
| payroll_line_item | payroll_line_salary_model_check | ((salary_model)::text = ANY (ARRAY[('fixed_monthly'::character varying)::text, ('per_patient_seen'::character varying)::text])) |



## payroll_run

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| payroll_run | payroll_run_id | bigint | int8 | NO | nextval('payroll_run_payroll_run_id_seq'::regclass) |  |
| payroll_run | period_month | date | date | NO |  |  |
| payroll_run | status | character varying | varchar | NO | 'draft'::character varying | 20 |
| payroll_run | generated_by | integer | int4 | YES |  |  |
| payroll_run | finalized_by | integer | int4 | YES |  |  |
| payroll_run | generated_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| payroll_run | finalized_at | timestamp without time zone | timestamp | YES |  |  |
| payroll_run | notes | text | text | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| payroll_run | payroll_run_id | payroll_run_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| payroll_run | finalized_by | staff | staff_id | NO ACTION | NO ACTION | payroll_run_finalized_by_fkey |
| payroll_run | generated_by | staff | staff_id | NO ACTION | NO ACTION | payroll_run_generated_by_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| payroll_run | payroll_run_generated_at_not_null | generated_at IS NOT NULL |
| payroll_run | payroll_run_month_first_day_check | ((date_trunc('month'::text, (period_month)::timestamp with time zone))::date = period_month) |
| payroll_run | payroll_run_payroll_run_id_not_null | payroll_run_id IS NOT NULL |
| payroll_run | payroll_run_period_month_not_null | period_month IS NOT NULL |
| payroll_run | payroll_run_status_check | ((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('finalized'::character varying)::text, ('void'::character varying)::text])) |
| payroll_run | payroll_run_status_not_null | status IS NOT NULL |



## pharmacy_customer

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| pharmacy_customer | customer_id | integer | int4 | NO | nextval('pharmacy_customer_customer_id_seq'::regclass) |  |
| pharmacy_customer | name | character varying | varchar | YES |  | 100 |
| pharmacy_customer | phone | character varying | varchar | YES |  | 20 |
| pharmacy_customer | email | character varying | varchar | YES |  | 100 |
| pharmacy_customer | address | text | text | YES |  |  |
| pharmacy_customer | loyalty_points | integer | int4 | YES | 0 |  |
| pharmacy_customer | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| pharmacy_customer | last_purchase_date | timestamp without time zone | timestamp | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| pharmacy_customer | customer_id | pharmacy_customer_pkey |


### Foreign keys

_(none)_


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| pharmacy_customer | phone | pharmacy_customer_phone_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| pharmacy_customer | pharmacy_customer_customer_id_not_null | customer_id IS NOT NULL |



## pharmacy_sale

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| pharmacy_sale | sale_id | integer | int4 | NO | nextval('pharmacy_sale_sale_id_seq'::regclass) |  |
| pharmacy_sale | visit_id | integer | int4 | YES |  |  |
| pharmacy_sale | bill_id | integer | int4 | YES |  |  |
| pharmacy_sale | sale_timestamp | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| pharmacy_sale | handled_by | integer | int4 | NO |  |  |
| pharmacy_sale | total_amount | numeric | numeric | YES |  |  |
| pharmacy_sale | status | character varying | varchar | YES |  | 100 |
| pharmacy_sale | payment_type | character varying | varchar | YES | 'CASH'::character varying | 50 |
| pharmacy_sale | payment_reference | character varying | varchar | YES |  | 100 |
| pharmacy_sale | paid_amount | numeric | numeric | YES | 0 |  |
| pharmacy_sale | due_amount | numeric | numeric | YES | 0 |  |
| pharmacy_sale | change_amount | numeric | numeric | YES | 0 |  |
| pharmacy_sale | discount_percent | numeric | numeric | YES | 0 |  |
| pharmacy_sale | discount_amount | numeric | numeric | YES | 0 |  |
| pharmacy_sale | tax_amount | numeric | numeric | YES | 0 |  |
| pharmacy_sale | is_prescription_sale | boolean | bool | YES | false |  |
| pharmacy_sale | prescription_id | integer | int4 | YES |  |  |
| pharmacy_sale | notes | text | text | YES |  |  |
| pharmacy_sale | customer_id | integer | int4 | YES |  |  |
| pharmacy_sale | settlement_channel | text | text | YES | 'pharmacy'::text |  |
| pharmacy_sale | settlement_status | text | text | YES | 'settled'::text |  |
| pharmacy_sale | settled_at | timestamp without time zone | timestamp | YES |  |  |
| pharmacy_sale | settled_by | integer | int4 | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| pharmacy_sale | sale_id | pharmacy_sale_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| pharmacy_sale | bill_id | bill | bill_id | NO ACTION | NO ACTION | pharmacy_sale_bill_id_fkey |
| pharmacy_sale | customer_id | pharmacy_customer | customer_id | NO ACTION | NO ACTION | pharmacy_sale_customer_id_fkey |
| pharmacy_sale | handled_by | staff | staff_id | NO ACTION | NO ACTION | pharmacy_sale_handled_by_fkey |
| pharmacy_sale | prescription_id | prescription | prescription_id | NO ACTION | NO ACTION | pharmacy_sale_prescription_id_fkey |
| pharmacy_sale | settled_by | staff | staff_id | NO ACTION | NO ACTION | pharmacy_sale_settled_by_fkey |
| pharmacy_sale | visit_id | visit | visit_id | NO ACTION | NO ACTION | pharmacy_sale_visit_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| pharmacy_sale | pharmacy_sale_handled_by_not_null | handled_by IS NOT NULL |
| pharmacy_sale | pharmacy_sale_payment_type_check | ((payment_type)::text = ANY (ARRAY[('CASH'::character varying)::text, ('CARD'::character varying)::text, ('INSURANCE'::character varying)::text, ('MOBILE'::character varying)::text, ('SPLIT'::character varying)::text])) |
| pharmacy_sale | pharmacy_sale_sale_id_not_null | sale_id IS NOT NULL |
| pharmacy_sale | pharmacy_sale_settlement_channel_check | (settlement_channel = ANY (ARRAY['pharmacy'::text, 'cashier'::text])) |
| pharmacy_sale | pharmacy_sale_settlement_status_check | (settlement_status = ANY (ARRAY['pending'::text, 'settled'::text])) |
| pharmacy_sale | pharmacy_sale_status_check | ((status)::text = ANY (ARRAY[('Completed'::character varying)::text, ('Returned'::character varying)::text, ('Cancelled'::character varying)::text])) |



## pharmacy_sale_detail

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| pharmacy_sale_detail | pharmacy_sale_detail_id | integer | int4 | NO | nextval('pharmacy_sale_detail_id_seq'::regclass) |  |
| pharmacy_sale_detail | sale_id | integer | int4 | NO |  |  |
| pharmacy_sale_detail | medicine_id | integer | int4 | NO |  |  |
| pharmacy_sale_detail | quantity | integer | int4 | NO |  |  |
| pharmacy_sale_detail | unit_sale_price | numeric | numeric | YES |  |  |
| pharmacy_sale_detail | line_total | numeric | numeric | YES |  |  |
| pharmacy_sale_detail | discount_percent | numeric | numeric | YES | 0 |  |
| pharmacy_sale_detail | discount_amount | numeric | numeric | YES | 0 |  |
| pharmacy_sale_detail | sub_unit_sale_price | numeric | numeric | YES |  |  |
| pharmacy_sale_detail | sub_quantity | integer | int4 | YES | 0 |  |
| pharmacy_sale_detail | batch_id | integer | int4 | YES |  |  |
| pharmacy_sale_detail | prescription_medicine_id | integer | int4 | YES |  |  |
| pharmacy_sale_detail | reason_code | text | text | YES |  |  |
| pharmacy_sale_detail | reason_note | text | text | YES |  |  |
| pharmacy_sale_detail | handled_by | integer | int4 | YES |  |  |
| pharmacy_sale_detail | created_at | timestamp without time zone | timestamp | YES | now() |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| pharmacy_sale_detail | pharmacy_sale_detail_id | pharmacy_sale_detail_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| pharmacy_sale_detail | batch_id | medicine_batch | batch_id | NO ACTION | NO ACTION | pharmacy_sale_detail_batch_id_fkey |
| pharmacy_sale_detail | medicine_id | medicine | medicine_id | NO ACTION | NO ACTION | pharmacy_sale_detail_medicine_id_fkey |
| pharmacy_sale_detail | sale_id | pharmacy_sale | sale_id | NO ACTION | NO ACTION | pharmacy_sale_detail_sale_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| pharmacy_sale_detail | check_total_price | (line_total = round(((((quantity)::numeric * unit_sale_price) + ((sub_quantity)::numeric * COALESCE(sub_unit_sale_price, (0)::numeric))) - discount_amount), 2)) |
| pharmacy_sale_detail | pharmacy_sale_detail_medicine_id_not_null | medicine_id IS NOT NULL |
| pharmacy_sale_detail | pharmacy_sale_detail_pharmacy_sale_detail_id_not_null | pharmacy_sale_detail_id IS NOT NULL |
| pharmacy_sale_detail | pharmacy_sale_detail_quantity_not_null | quantity IS NOT NULL |
| pharmacy_sale_detail | pharmacy_sale_detail_sale_id_not_null | sale_id IS NOT NULL |



## pos_audit_log

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| pos_audit_log | log_id | integer | int4 | NO | nextval('pos_audit_log_log_id_seq'::regclass) |  |
| pos_audit_log | staff_id | integer | int4 | YES |  |  |
| pos_audit_log | action_type | character varying | varchar | NO |  | 50 |
| pos_audit_log | sale_id | integer | int4 | YES |  |  |
| pos_audit_log | description | text | text | YES |  |  |
| pos_audit_log | ip_address | character varying | varchar | YES |  | 50 |
| pos_audit_log | user_agent | text | text | YES |  |  |
| pos_audit_log | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| pos_audit_log | log_id | pos_audit_log_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| pos_audit_log | sale_id | pharmacy_sale | sale_id | NO ACTION | NO ACTION | pos_audit_log_sale_id_fkey |
| pos_audit_log | staff_id | staff | staff_id | NO ACTION | NO ACTION | pos_audit_log_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| pos_audit_log | pos_audit_log_action_type_not_null | action_type IS NOT NULL |
| pos_audit_log | pos_audit_log_log_id_not_null | log_id IS NOT NULL |



## pos_held_transaction

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| pos_held_transaction | hold_id | integer | int4 | NO | nextval('pos_held_transaction_hold_id_seq'::regclass) |  |
| pos_held_transaction | staff_id | integer | int4 | NO |  |  |
| pos_held_transaction | customer_name | character varying | varchar | YES |  | 100 |
| pos_held_transaction | customer_phone | character varying | varchar | YES |  | 20 |
| pos_held_transaction | hold_timestamp | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| pos_held_transaction | retrieved_timestamp | timestamp without time zone | timestamp | YES |  |  |
| pos_held_transaction | total_amount | numeric | numeric | YES |  |  |
| pos_held_transaction | status | character varying | varchar | YES | 'held'::character varying | 20 |
| pos_held_transaction | notes | text | text | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| pos_held_transaction | hold_id | pos_held_transaction_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| pos_held_transaction | staff_id | staff | staff_id | NO ACTION | NO ACTION | pos_held_transaction_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| pos_held_transaction | pos_held_status_check | ((status)::text = ANY (ARRAY[('held'::character varying)::text, ('retrieved'::character varying)::text, ('cancelled'::character varying)::text])) |
| pos_held_transaction | pos_held_transaction_hold_id_not_null | hold_id IS NOT NULL |
| pos_held_transaction | pos_held_transaction_staff_id_not_null | staff_id IS NOT NULL |



## pos_held_transaction_detail

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| pos_held_transaction_detail | detail_id | integer | int4 | NO | nextval('pos_held_transaction_detail_detail_id_seq'::regclass) |  |
| pos_held_transaction_detail | hold_id | integer | int4 | NO |  |  |
| pos_held_transaction_detail | medicine_id | integer | int4 | NO |  |  |
| pos_held_transaction_detail | qty | integer | int4 | NO |  |  |
| pos_held_transaction_detail | sub_qty | integer | int4 | YES | 0 |  |
| pos_held_transaction_detail | unit_price | numeric | numeric | NO |  |  |
| pos_held_transaction_detail | discount_percent | numeric | numeric | YES | 0 |  |
| pos_held_transaction_detail | line_total | numeric | numeric | NO |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| pos_held_transaction_detail | detail_id | pos_held_transaction_detail_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| pos_held_transaction_detail | hold_id | pos_held_transaction | hold_id | NO ACTION | CASCADE | pos_held_transaction_detail_hold_id_fkey |
| pos_held_transaction_detail | medicine_id | medicine | medicine_id | NO ACTION | NO ACTION | pos_held_transaction_detail_medicine_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| pos_held_transaction_detail | pos_held_transaction_detail_detail_id_not_null | detail_id IS NOT NULL |
| pos_held_transaction_detail | pos_held_transaction_detail_hold_id_not_null | hold_id IS NOT NULL |
| pos_held_transaction_detail | pos_held_transaction_detail_line_total_not_null | line_total IS NOT NULL |
| pos_held_transaction_detail | pos_held_transaction_detail_medicine_id_not_null | medicine_id IS NOT NULL |
| pos_held_transaction_detail | pos_held_transaction_detail_qty_not_null | qty IS NOT NULL |
| pos_held_transaction_detail | pos_held_transaction_detail_unit_price_not_null | unit_price IS NOT NULL |



## pos_receipt_config

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| pos_receipt_config | config_id | integer | int4 | NO | nextval('pos_receipt_config_config_id_seq'::regclass) |  |
| pos_receipt_config | clinic_name | character varying | varchar | NO |  | 200 |
| pos_receipt_config | clinic_address | text | text | YES |  |  |
| pos_receipt_config | clinic_phone | character varying | varchar | YES |  | 50 |
| pos_receipt_config | clinic_email | character varying | varchar | YES |  | 100 |
| pos_receipt_config | tax_registration_number | character varying | varchar | YES |  | 50 |
| pos_receipt_config | receipt_header | text | text | YES |  |  |
| pos_receipt_config | receipt_footer | text | text | YES |  |  |
| pos_receipt_config | logo_url | text | text | YES |  |  |
| pos_receipt_config | printer_name | character varying | varchar | YES |  | 100 |
| pos_receipt_config | paper_size | character varying | varchar | YES | '80mm'::character varying | 20 |
| pos_receipt_config | is_active | boolean | bool | YES | true |  |
| pos_receipt_config | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| pos_receipt_config | config_id | pos_receipt_config_pkey |


### Foreign keys

_(none)_


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| pos_receipt_config | pos_receipt_config_clinic_name_not_null | clinic_name IS NOT NULL |
| pos_receipt_config | pos_receipt_config_config_id_not_null | config_id IS NOT NULL |



## pos_session

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| pos_session | session_id | integer | int4 | NO | nextval('pos_session_session_id_seq'::regclass) |  |
| pos_session | staff_id | integer | int4 | NO |  |  |
| pos_session | opening_time | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| pos_session | closing_time | timestamp without time zone | timestamp | YES |  |  |
| pos_session | opening_balance | numeric | numeric | NO | 0 |  |
| pos_session | closing_balance | numeric | numeric | YES |  |  |
| pos_session | expected_balance | numeric | numeric | YES |  |  |
| pos_session | cash_sales_total | numeric | numeric | YES | 0 |  |
| pos_session | card_sales_total | numeric | numeric | YES | 0 |  |
| pos_session | total_sales_count | integer | int4 | YES | 0 |  |
| pos_session | notes | text | text | YES |  |  |
| pos_session | status | character varying | varchar | YES | 'open'::character varying | 20 |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| pos_session | session_id | pos_session_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| pos_session | staff_id | staff | staff_id | NO ACTION | NO ACTION | pos_session_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| pos_session | pos_session_opening_balance_not_null | opening_balance IS NOT NULL |
| pos_session | pos_session_opening_time_not_null | opening_time IS NOT NULL |
| pos_session | pos_session_session_id_not_null | session_id IS NOT NULL |
| pos_session | pos_session_staff_id_not_null | staff_id IS NOT NULL |
| pos_session | pos_session_status_check | ((status)::text = ANY (ARRAY[('open'::character varying)::text, ('closed'::character varying)::text])) |



## prescription

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| prescription | prescription_id | integer | int4 | NO | nextval('prescription_prescription_id_seq'::regclass) |  |
| prescription | visit_id | integer | int4 | NO |  |  |
| prescription | doctor_id | integer | int4 | NO |  |  |
| prescription | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| prescription | prescription_id | prescription_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| prescription | doctor_id | doctor | doctor_id | NO ACTION | NO ACTION | prescription_doctor_id_fkey |
| prescription | visit_id | visit | visit_id | NO ACTION | NO ACTION | prescription_visit_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| prescription | visit_id | unique_visit_prescription |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| prescription | prescription_doctor_id_not_null | doctor_id IS NOT NULL |
| prescription | prescription_prescription_id_not_null | prescription_id IS NOT NULL |
| prescription | prescription_visit_id_not_null | visit_id IS NOT NULL |



## prescription_fulfillment_action

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| prescription_fulfillment_action | fulfillment_action_id | bigint | int8 | NO |  |  |
| prescription_fulfillment_action | prescription_medicine_id | integer | int4 | NO |  |  |
| prescription_fulfillment_action | prescription_id | integer | int4 | NO |  |  |
| prescription_fulfillment_action | visit_id | integer | int4 | NO |  |  |
| prescription_fulfillment_action | patient_id | integer | int4 | NO |  |  |
| prescription_fulfillment_action | available_quantity_at_action | integer | int4 | NO | 0 |  |
| prescription_fulfillment_action | action_type | text | text | NO |  |  |
| prescription_fulfillment_action | reason_code | text | text | YES |  |  |
| prescription_fulfillment_action | reason_note | text | text | YES |  |  |
| prescription_fulfillment_action | override_sale_price | numeric | numeric | YES |  |  |
| prescription_fulfillment_action | override_quantity | integer | int4 | YES |  |  |
| prescription_fulfillment_action | handled_by | integer | int4 | YES |  |  |
| prescription_fulfillment_action | handled_at | timestamp without time zone | timestamp | NO | now() |  |
| prescription_fulfillment_action | created_at | timestamp without time zone | timestamp | NO | now() |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| prescription_fulfillment_action | fulfillment_action_id | prescription_fulfillment_action_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| prescription_fulfillment_action | handled_by | staff | staff_id | NO ACTION | NO ACTION | prescription_fulfillment_action_handled_by_fkey |
| prescription_fulfillment_action | patient_id | patient | patient_id | NO ACTION | CASCADE | prescription_fulfillment_action_patient_id_fkey |
| prescription_fulfillment_action | prescription_id | prescription | prescription_id | NO ACTION | CASCADE | prescription_fulfillment_action_prescription_id_fkey |
| prescription_fulfillment_action | prescription_medicine_id | prescription_medicines | prescription_medicine_id | NO ACTION | CASCADE | prescription_fulfillment_action_prescription_medicine_id_fkey |
| prescription_fulfillment_action | visit_id | visit | visit_id | NO ACTION | CASCADE | prescription_fulfillment_action_visit_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| prescription_fulfillment_action | prescription_fulfillment_ac_available_quantity_at_acti_not_null | available_quantity_at_action IS NOT NULL |
| prescription_fulfillment_action | prescription_fulfillment_acti_prescription_medicine_id_not_null | prescription_medicine_id IS NOT NULL |
| prescription_fulfillment_action | prescription_fulfillment_action_action_type_not_null | action_type IS NOT NULL |
| prescription_fulfillment_action | prescription_fulfillment_action_created_at_not_null | created_at IS NOT NULL |
| prescription_fulfillment_action | prescription_fulfillment_action_fulfillment_action_id_not_null | fulfillment_action_id IS NOT NULL |
| prescription_fulfillment_action | prescription_fulfillment_action_handled_at_not_null | handled_at IS NOT NULL |
| prescription_fulfillment_action | prescription_fulfillment_action_patient_id_not_null | patient_id IS NOT NULL |
| prescription_fulfillment_action | prescription_fulfillment_action_prescription_id_not_null | prescription_id IS NOT NULL |
| prescription_fulfillment_action | prescription_fulfillment_action_visit_id_not_null | visit_id IS NOT NULL |



## prescription_medicines

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| prescription_medicines | prescription_medicine_id | integer | int4 | NO | nextval('prescription_medicines_prescription_medicine_id_seq'::regclass) |  |
| prescription_medicines | prescription_id | integer | int4 | NO |  |  |
| prescription_medicines | medicine_id | integer | int4 | NO |  |  |
| prescription_medicines | duration | character varying | varchar | YES |  | 50 |
| prescription_medicines | instructions | text | text | YES |  |  |
| prescription_medicines | dispensed_by | integer | int4 | YES |  |  |
| prescription_medicines | frequency | character varying | varchar | YES |  | 50 |
| prescription_medicines | prescribed_quantity | integer | int4 | YES |  |  |
| prescription_medicines | dispensed_quantity | integer | int4 | YES |  |  |
| prescription_medicines | dispensed_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| prescription_medicines | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| prescription_medicines | updated_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| prescription_medicines | prescribed_sub_quantity | integer | int4 | YES | 0 |  |
| prescription_medicines | dispensed_sub_quantity | integer | int4 | YES | 0 |  |
| prescription_medicines | available_quantity_snapshot | integer | int4 | YES | 0 |  |
| prescription_medicines | availability_status | text | text | YES | 'unknown'::text |  |
| prescription_medicines | availability_note | text | text | YES |  |  |
| prescription_medicines | dosage | character varying | varchar | YES |  | 100 |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| prescription_medicines | prescription_medicine_id | prescription_medicines_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| prescription_medicines | dispensed_by | staff | staff_id | NO ACTION | NO ACTION | prescription_medicines_dispensed_by_fkey |
| prescription_medicines | medicine_id | medicine | medicine_id | NO ACTION | NO ACTION | prescription_medicines_medicine_id_fkey |
| prescription_medicines | prescription_id | prescription | prescription_id | NO ACTION | NO ACTION | prescription_medicines_prescription_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| prescription_medicines | prescription_medicines_medicine_id_not_null | medicine_id IS NOT NULL |
| prescription_medicines | prescription_medicines_prescription_id_not_null | prescription_id IS NOT NULL |
| prescription_medicines | prescription_medicines_prescription_medicine_id_not_null | prescription_medicine_id IS NOT NULL |



## purchase_return

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| purchase_return | return_id | integer | int4 | NO | nextval('purchase_return_return_id_seq'::regclass) |  |
| purchase_return | purchase_id | integer | int4 | NO |  |  |
| purchase_return | reason | text | text | YES |  |  |
| purchase_return | return_timestamp | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| purchase_return | created_by | integer | int4 | NO |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| purchase_return | return_id | purchase_return_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| purchase_return | created_by | staff | staff_id | NO ACTION | NO ACTION | purchase_return_created_by_fkey |
| purchase_return | purchase_id | medicine_purchase | purchase_id | NO ACTION | NO ACTION | purchase_return_purchase_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| purchase_return | purchase_return_created_by_not_null | created_by IS NOT NULL |
| purchase_return | purchase_return_purchase_id_not_null | purchase_id IS NOT NULL |
| purchase_return | purchase_return_return_id_not_null | return_id IS NOT NULL |



## purchase_return_detail

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| purchase_return_detail | id | integer | int4 | NO | nextval('purchase_return_detail_id_seq'::regclass) |  |
| purchase_return_detail | return_id | integer | int4 | NO |  |  |
| purchase_return_detail | medicine_id | integer | int4 | NO |  |  |
| purchase_return_detail | quantity | integer | int4 | NO |  |  |
| purchase_return_detail | sub_quantity | integer | int4 | YES | 0 |  |
| purchase_return_detail | returned_unit_price | numeric | numeric | YES |  |  |
| purchase_return_detail | returned_sub_unit_price | numeric | numeric | YES |  |  |
| purchase_return_detail | batch_id | integer | int4 | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| purchase_return_detail | id | purchase_return_detail_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| purchase_return_detail | batch_id | medicine_batch | batch_id | NO ACTION | NO ACTION | purchase_return_detail_batch_id_fkey |
| purchase_return_detail | medicine_id | medicine | medicine_id | NO ACTION | NO ACTION | purchase_return_detail_medicine_id_fkey |
| purchase_return_detail | return_id | purchase_return | return_id | NO ACTION | NO ACTION | purchase_return_detail_return_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| purchase_return_detail | purchase_return_detail_id_not_null | id IS NOT NULL |
| purchase_return_detail | purchase_return_detail_medicine_id_not_null | medicine_id IS NOT NULL |
| purchase_return_detail | purchase_return_detail_quantity_not_null | quantity IS NOT NULL |
| purchase_return_detail | purchase_return_detail_return_id_not_null | return_id IS NOT NULL |



## room

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| room | room_id | integer | int4 | NO | nextval('room_room_id_seq'::regclass) |  |
| room | ward_id | integer | int4 | NO |  |  |
| room | room_number | character varying | varchar | NO |  | 40 |
| room | room_class | character varying | varchar | YES |  | 30 |
| room | default_daily_rate | numeric | numeric | NO | 0 |  |
| room | is_active | boolean | bool | NO | true |  |
| room | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| room | room_id | room_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| room | ward_id | ward | ward_id | NO ACTION | CASCADE | room_ward_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| room | ward_id | uq_room_ward_number |
| room | room_number | uq_room_ward_number |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| room | ck_room_rate_nonneg | (default_daily_rate >= (0)::numeric) |
| room | room_created_at_not_null | created_at IS NOT NULL |
| room | room_default_daily_rate_not_null | default_daily_rate IS NOT NULL |
| room | room_is_active_not_null | is_active IS NOT NULL |
| room | room_room_id_not_null | room_id IS NOT NULL |
| room | room_room_number_not_null | room_number IS NOT NULL |
| room | room_ward_id_not_null | ward_id IS NOT NULL |



## sale_return

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| sale_return | return_id | integer | int4 | NO | nextval('sale_return_return_id_seq'::regclass) |  |
| sale_return | sale_id | integer | int4 | NO |  |  |
| sale_return | reason | text | text | YES |  |  |
| sale_return | return_timestamp | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| sale_return | created_by | integer | int4 | NO |  |  |
| sale_return | refund_amount | numeric | numeric | NO | 0 |  |
| sale_return | refund_method | character varying | varchar | NO | 'CASH'::character varying | 50 |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| sale_return | return_id | sale_return_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| sale_return | created_by | staff | staff_id | NO ACTION | NO ACTION | sale_return_created_by_fkey |
| sale_return | sale_id | pharmacy_sale | sale_id | NO ACTION | NO ACTION | sale_return_sale_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| sale_return | ck_sale_return_refund_method | ((refund_method)::text = ANY ((ARRAY['CASH'::character varying, 'CARD'::character varying, 'INSURANCE'::character varying, 'MOBILE'::character varying, 'SPLIT'::character varying])::text[])) |
| sale_return | ck_sale_return_refund_nonneg | (refund_amount >= (0)::numeric) |
| sale_return | sale_return_created_by_not_null | created_by IS NOT NULL |
| sale_return | sale_return_refund_amount_not_null | refund_amount IS NOT NULL |
| sale_return | sale_return_refund_method_not_null | refund_method IS NOT NULL |
| sale_return | sale_return_return_id_not_null | return_id IS NOT NULL |
| sale_return | sale_return_sale_id_not_null | sale_id IS NOT NULL |



## sale_return_detail

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| sale_return_detail | id | integer | int4 | NO | nextval('sale_return_detail_id_seq'::regclass) |  |
| sale_return_detail | return_id | integer | int4 | NO |  |  |
| sale_return_detail | medicine_id | integer | int4 | NO |  |  |
| sale_return_detail | returned_quantity | integer | int4 | NO |  |  |
| sale_return_detail | returned_unit_price | numeric | numeric | YES |  |  |
| sale_return_detail | batch_id | integer | int4 | YES |  |  |
| sale_return_detail | returned_sub_quantity | integer | int4 | YES |  |  |
| sale_return_detail | returned_sub_unit_price | numeric | numeric | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| sale_return_detail | id | sale_return_detail_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| sale_return_detail | batch_id | medicine_batch | batch_id | NO ACTION | NO ACTION | sale_return_detail_batch_id_fkey |
| sale_return_detail | medicine_id | medicine | medicine_id | NO ACTION | NO ACTION | sale_return_detail_medicine_id_fkey |
| sale_return_detail | return_id | sale_return | return_id | NO ACTION | NO ACTION | sale_return_detail_return_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| sale_return_detail | sale_return_detail_id_not_null | id IS NOT NULL |
| sale_return_detail | sale_return_detail_medicine_id_not_null | medicine_id IS NOT NULL |
| sale_return_detail | sale_return_detail_return_id_not_null | return_id IS NOT NULL |
| sale_return_detail | sale_return_detail_returned_quantity_not_null | returned_quantity IS NOT NULL |



## staff

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| staff | staff_id | integer | int4 | NO | nextval('staff_staff_id_seq'::regclass) |  |
| staff | user_code | character varying | varchar | NO |  | 50 |
| staff | password | character varying | varchar | NO |  | 255 |
| staff | name | character varying | varchar | NO |  | 50 |
| staff | role | character varying | varchar | YES |  | 50 |
| staff | education | character varying | varchar | YES |  | 255 |
| staff | contact_number | character varying | varchar | YES |  | 20 |
| staff | email | character varying | varchar | YES |  | 100 |
| staff | created_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| staff | employment_status | character varying | varchar | NO | 'active'::character varying | 20 |
| staff | joined_at | date | date | YES |  |  |
| staff | exited_at | date | date | YES |  |  |
| staff | failed_login_attempts | integer | int4 | NO | 0 |  |
| staff | last_failed_login_at | timestamp without time zone | timestamp | YES |  |  |
| staff | account_locked_until | timestamp without time zone | timestamp | YES |  |  |
| staff | last_login_at | timestamp without time zone | timestamp | YES |  |  |
| staff | password_changed_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| staff | password_reset_token | character varying | varchar | YES |  | 128 |
| staff | password_reset_expires_at | timestamp without time zone | timestamp | YES |  |  |
| staff | mfa_enabled | boolean | bool | NO | false |  |
| staff | session_version | integer | int4 | NO | 1 |  |
| staff | photo_url | text | text | YES |  |  |
| staff | gender | character varying | varchar | YES |  | 20 |
| staff | dob | date | date | YES |  |  |
| staff | emergency_contact_name | character varying | varchar | YES |  | 120 |
| staff | emergency_contact_number | character varying | varchar | YES |  | 30 |
| staff | address_line_1 | character varying | varchar | YES |  | 255 |
| staff | address_line_2 | character varying | varchar | YES |  | 255 |
| staff | city | character varying | varchar | YES |  | 100 |
| staff | state | character varying | varchar | YES |  | 100 |
| staff | postal_code | character varying | varchar | YES |  | 20 |
| staff | national_id | character varying | varchar | YES |  | 80 |
| staff | license_id | character varying | varchar | YES |  | 80 |
| staff | department | character varying | varchar | YES |  | 120 |
| staff | designation | character varying | varchar | YES |  | 120 |
| staff | employment_type | character varying | varchar | YES |  | 40 |
| staff | facility_code | character varying | varchar | YES |  | 80 |
| staff | branch_code | character varying | varchar | YES |  | 80 |
| staff | work_location | character varying | varchar | YES |  | 150 |
| staff | reporting_manager_staff_id | integer | int4 | YES |  |  |
| staff | staff_tags | ARRAY | _text | NO | '{}'::text[] |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff | staff_id | staff_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| staff | reporting_manager_staff_id | staff | staff_id | NO ACTION | NO ACTION | staff_reporting_manager_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| staff | staff_employment_status_check | ((employment_status)::text = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text, 'resigned'::text])) |
| staff | staff_employment_status_not_null | employment_status IS NOT NULL |
| staff | staff_failed_login_attempts_not_null | failed_login_attempts IS NOT NULL |
| staff | staff_mfa_enabled_not_null | mfa_enabled IS NOT NULL |
| staff | staff_name_not_null | name IS NOT NULL |
| staff | staff_password_not_null | password IS NOT NULL |
| staff | staff_role_check | ((role)::text = ANY (ARRAY['Receptionist'::text, 'Lab_Technician'::text, 'Admin'::text, 'Super Admin'::text, 'Cashier'::text, 'Pharmacist'::text, 'Nurse'::text, 'Doctor'::text, 'Front_Desk'::text, 'Billing'::text, 'Technician'::text, 'Housekeeping'::text])) |
| staff | staff_session_version_not_null | session_version IS NOT NULL |
| staff | staff_staff_id_not_null | staff_id IS NOT NULL |
| staff | staff_staff_tags_not_null | staff_tags IS NOT NULL |
| staff | staff_user_code_not_null | user_code IS NOT NULL |



## staff_attendance

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| staff_attendance | attendance_id | uuid | uuid | NO | gen_random_uuid() |  |
| staff_attendance | staff_id | integer | int4 | YES |  |  |
| staff_attendance | date | date | date | NO |  |  |
| staff_attendance | check_in_time | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| staff_attendance | check_out_time | timestamp without time zone | timestamp | YES |  |  |
| staff_attendance | status | character varying | varchar | YES | 'Present'::character varying | 20 |
| staff_attendance | marked_by | character varying | varchar | YES |  | 50 |
| staff_attendance | admin_id | integer | int4 | YES |  |  |
| staff_attendance | shift_code | character varying | varchar | YES |  | 50 |
| staff_attendance | check_in_source | character varying | varchar | YES |  | 40 |
| staff_attendance | check_out_source | character varying | varchar | YES |  | 40 |
| staff_attendance | late_minutes | integer | int4 | NO | 0 |  |
| staff_attendance | early_leave_minutes | integer | int4 | NO | 0 |  |
| staff_attendance | overtime_minutes | integer | int4 | NO | 0 |  |
| staff_attendance | break_minutes | integer | int4 | NO | 0 |  |
| staff_attendance | attendance_notes | text | text | YES |  |  |
| staff_attendance | roster_id | bigint | int8 | YES |  |  |
| staff_attendance | derived_status | character varying | varchar | NO | 'unscheduled'::character varying | 30 |
| staff_attendance | is_unscheduled | boolean | bool | NO | true |  |
| staff_attendance | is_on_time | boolean | bool | NO | false |  |
| staff_attendance | policy_snapshot | jsonb | jsonb | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_attendance | attendance_id | staff_attendance_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| staff_attendance | admin_id | staff | staff_id | NO ACTION | NO ACTION | staff_attendance_admin_id_fkey |
| staff_attendance | roster_id | staff_roster_assignments | roster_id | NO ACTION | SET NULL | staff_attendance_roster_id_fkey |
| staff_attendance | staff_id | staff | staff_id | NO ACTION | CASCADE | staff_attendance_staff_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_attendance | staff_id | staff_attendance_staff_id_date_key |
| staff_attendance | date | staff_attendance_staff_id_date_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| staff_attendance | staff_attendance_attendance_id_not_null | attendance_id IS NOT NULL |
| staff_attendance | staff_attendance_break_minutes_not_null | break_minutes IS NOT NULL |
| staff_attendance | staff_attendance_date_not_null | date IS NOT NULL |
| staff_attendance | staff_attendance_derived_status_check | ((derived_status)::text = ANY (ARRAY['on_time'::text, 'late'::text, 'half_day'::text, 'early_leave'::text, 'overtime'::text, 'unscheduled'::text, 'absent'::text, 'leave'::text])) |
| staff_attendance | staff_attendance_derived_status_not_null | derived_status IS NOT NULL |
| staff_attendance | staff_attendance_early_leave_minutes_not_null | early_leave_minutes IS NOT NULL |
| staff_attendance | staff_attendance_is_on_time_not_null | is_on_time IS NOT NULL |
| staff_attendance | staff_attendance_is_unscheduled_not_null | is_unscheduled IS NOT NULL |
| staff_attendance | staff_attendance_late_minutes_not_null | late_minutes IS NOT NULL |
| staff_attendance | staff_attendance_overtime_minutes_not_null | overtime_minutes IS NOT NULL |



## staff_leave_approvals

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| staff_leave_approvals | approval_id | bigint | int8 | NO | nextval('staff_leave_approvals_approval_id_seq'::regclass) |  |
| staff_leave_approvals | leave_request_id | bigint | int8 | NO |  |  |
| staff_leave_approvals | level_no | integer | int4 | NO |  |  |
| staff_leave_approvals | approver_staff_id | integer | int4 | NO |  |  |
| staff_leave_approvals | approval_status | character varying | varchar | NO | 'pending'::character varying | 20 |
| staff_leave_approvals | note | text | text | YES |  |  |
| staff_leave_approvals | acted_at | timestamp without time zone | timestamp | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_leave_approvals | approval_id | staff_leave_approvals_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| staff_leave_approvals | approver_staff_id | staff | staff_id | NO ACTION | NO ACTION | staff_leave_approvals_approver_staff_id_fkey |
| staff_leave_approvals | leave_request_id | staff_leave_requests | leave_request_id | NO ACTION | CASCADE | staff_leave_approvals_leave_request_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| staff_leave_approvals | staff_leave_approvals_approval_id_not_null | approval_id IS NOT NULL |
| staff_leave_approvals | staff_leave_approvals_approval_status_not_null | approval_status IS NOT NULL |
| staff_leave_approvals | staff_leave_approvals_approver_staff_id_not_null | approver_staff_id IS NOT NULL |
| staff_leave_approvals | staff_leave_approvals_leave_request_id_not_null | leave_request_id IS NOT NULL |
| staff_leave_approvals | staff_leave_approvals_level_no_not_null | level_no IS NOT NULL |



## staff_leave_balances

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| staff_leave_balances | balance_id | bigint | int8 | NO | nextval('staff_leave_balances_balance_id_seq'::regclass) |  |
| staff_leave_balances | staff_id | integer | int4 | NO |  |  |
| staff_leave_balances | leave_type_id | integer | int4 | NO |  |  |
| staff_leave_balances | period_year | integer | int4 | NO |  |  |
| staff_leave_balances | opening_balance | numeric | numeric | NO | 0 |  |
| staff_leave_balances | accrued | numeric | numeric | NO | 0 |  |
| staff_leave_balances | consumed | numeric | numeric | NO | 0 |  |
| staff_leave_balances | adjusted | numeric | numeric | NO | 0 |  |
| staff_leave_balances | updated_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| staff_leave_balances | account_type | character varying | varchar | NO | 'staff'::character varying | 20 |
| staff_leave_balances | person_id | integer | int4 | NO |  |  |
| staff_leave_balances | doctor_id | integer | int4 | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_leave_balances | balance_id | staff_leave_balances_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| staff_leave_balances | doctor_id | doctor | doctor_id | NO ACTION | CASCADE | staff_leave_balances_doctor_id_fkey |
| staff_leave_balances | leave_type_id | staff_leave_types | leave_type_id | NO ACTION | RESTRICT | staff_leave_balances_leave_type_id_fkey |
| staff_leave_balances | staff_id | staff | staff_id | NO ACTION | CASCADE | staff_leave_balances_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| staff_leave_balances | staff_leave_balances_account_type_check | ((account_type)::text = ANY (ARRAY[('staff'::character varying)::text, ('doctor'::character varying)::text])) |
| staff_leave_balances | staff_leave_balances_account_type_not_null | account_type IS NOT NULL |
| staff_leave_balances | staff_leave_balances_accrued_not_null | accrued IS NOT NULL |
| staff_leave_balances | staff_leave_balances_adjusted_not_null | adjusted IS NOT NULL |
| staff_leave_balances | staff_leave_balances_balance_id_not_null | balance_id IS NOT NULL |
| staff_leave_balances | staff_leave_balances_consumed_not_null | consumed IS NOT NULL |
| staff_leave_balances | staff_leave_balances_leave_type_id_not_null | leave_type_id IS NOT NULL |
| staff_leave_balances | staff_leave_balances_opening_balance_not_null | opening_balance IS NOT NULL |
| staff_leave_balances | staff_leave_balances_period_year_not_null | period_year IS NOT NULL |
| staff_leave_balances | staff_leave_balances_person_id_not_null | person_id IS NOT NULL |
| staff_leave_balances | staff_leave_balances_staff_id_not_null | staff_id IS NOT NULL |
| staff_leave_balances | staff_leave_balances_updated_at_not_null | updated_at IS NOT NULL |



## staff_leave_requests

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| staff_leave_requests | leave_request_id | bigint | int8 | NO | nextval('staff_leave_requests_leave_request_id_seq'::regclass) |  |
| staff_leave_requests | staff_id | integer | int4 | YES |  |  |
| staff_leave_requests | leave_type_id | integer | int4 | NO |  |  |
| staff_leave_requests | from_date | date | date | NO |  |  |
| staff_leave_requests | to_date | date | date | NO |  |  |
| staff_leave_requests | is_half_day | boolean | bool | NO | false |  |
| staff_leave_requests | requested_hours | numeric | numeric | YES |  |  |
| staff_leave_requests | reason | text | text | YES |  |  |
| staff_leave_requests | attachment_url | text | text | YES |  |  |
| staff_leave_requests | request_status | character varying | varchar | NO | 'pending'::character varying | 20 |
| staff_leave_requests | requested_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| staff_leave_requests | final_approver | integer | int4 | YES |  |  |
| staff_leave_requests | final_decision_at | timestamp without time zone | timestamp | YES |  |  |
| staff_leave_requests | decision_note | text | text | YES |  |  |
| staff_leave_requests | account_type | character varying | varchar | NO | 'staff'::character varying | 20 |
| staff_leave_requests | person_id | integer | int4 | NO |  |  |
| staff_leave_requests | doctor_id | integer | int4 | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_leave_requests | leave_request_id | staff_leave_requests_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| staff_leave_requests | doctor_id | doctor | doctor_id | NO ACTION | CASCADE | staff_leave_requests_doctor_id_fkey |
| staff_leave_requests | final_approver | staff | staff_id | NO ACTION | NO ACTION | staff_leave_requests_final_approver_fkey |
| staff_leave_requests | leave_type_id | staff_leave_types | leave_type_id | NO ACTION | RESTRICT | staff_leave_requests_leave_type_id_fkey |
| staff_leave_requests | staff_id | staff | staff_id | NO ACTION | CASCADE | staff_leave_requests_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| staff_leave_requests | staff_leave_requests_account_type_not_null | account_type IS NOT NULL |
| staff_leave_requests | staff_leave_requests_employee_ref_check | ((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id))) |
| staff_leave_requests | staff_leave_requests_from_date_not_null | from_date IS NOT NULL |
| staff_leave_requests | staff_leave_requests_is_half_day_not_null | is_half_day IS NOT NULL |
| staff_leave_requests | staff_leave_requests_leave_request_id_not_null | leave_request_id IS NOT NULL |
| staff_leave_requests | staff_leave_requests_leave_type_id_not_null | leave_type_id IS NOT NULL |
| staff_leave_requests | staff_leave_requests_person_id_not_null | person_id IS NOT NULL |
| staff_leave_requests | staff_leave_requests_request_status_not_null | request_status IS NOT NULL |
| staff_leave_requests | staff_leave_requests_requested_at_not_null | requested_at IS NOT NULL |
| staff_leave_requests | staff_leave_requests_to_date_not_null | to_date IS NOT NULL |



## staff_leave_types

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| staff_leave_types | leave_type_id | integer | int4 | NO | nextval('staff_leave_types_leave_type_id_seq'::regclass) |  |
| staff_leave_types | leave_code | character varying | varchar | NO |  | 40 |
| staff_leave_types | leave_name | character varying | varchar | NO |  | 100 |
| staff_leave_types | default_annual_quota | numeric | numeric | YES |  |  |
| staff_leave_types | is_paid | boolean | bool | NO | true |  |
| staff_leave_types | requires_attachment | boolean | bool | NO | false |  |
| staff_leave_types | active | boolean | bool | NO | true |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_leave_types | leave_type_id | staff_leave_types_pkey |


### Foreign keys

_(none)_


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_leave_types | leave_code | staff_leave_types_leave_code_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| staff_leave_types | staff_leave_types_active_not_null | active IS NOT NULL |
| staff_leave_types | staff_leave_types_is_paid_not_null | is_paid IS NOT NULL |
| staff_leave_types | staff_leave_types_leave_code_not_null | leave_code IS NOT NULL |
| staff_leave_types | staff_leave_types_leave_name_not_null | leave_name IS NOT NULL |
| staff_leave_types | staff_leave_types_leave_type_id_not_null | leave_type_id IS NOT NULL |
| staff_leave_types | staff_leave_types_requires_attachment_not_null | requires_attachment IS NOT NULL |



## staff_permission_audit

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| staff_permission_audit | event_id | bigint | int8 | NO | nextval('staff_permission_audit_event_id_seq'::regclass) |  |
| staff_permission_audit | policy_id | bigint | int8 | YES |  |  |
| staff_permission_audit | actor_staff_id | integer | int4 | YES |  |  |
| staff_permission_audit | event_type | character varying | varchar | NO |  | 40 |
| staff_permission_audit | before_json | jsonb | jsonb | YES |  |  |
| staff_permission_audit | after_json | jsonb | jsonb | YES |  |  |
| staff_permission_audit | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_permission_audit | event_id | staff_permission_audit_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| staff_permission_audit | actor_staff_id | staff | staff_id | NO ACTION | NO ACTION | staff_permission_audit_actor_staff_id_fkey |
| staff_permission_audit | policy_id | staff_permission_policies | policy_id | NO ACTION | SET NULL | staff_permission_audit_policy_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| staff_permission_audit | staff_permission_audit_created_at_not_null | created_at IS NOT NULL |
| staff_permission_audit | staff_permission_audit_event_id_not_null | event_id IS NOT NULL |
| staff_permission_audit | staff_permission_audit_event_type_not_null | event_type IS NOT NULL |



## staff_permission_policies

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| staff_permission_policies | policy_id | bigint | int8 | NO | nextval('staff_permission_policies_policy_id_seq'::regclass) |  |
| staff_permission_policies | staff_id | integer | int4 | YES |  |  |
| staff_permission_policies | role_id | integer | int4 | YES |  |  |
| staff_permission_policies | module | character varying | varchar | NO |  | 80 |
| staff_permission_policies | action | character varying | varchar | NO |  | 20 |
| staff_permission_policies | allowed | boolean | bool | NO | true |  |
| staff_permission_policies | scope_type | character varying | varchar | NO | 'global'::character varying | 20 |
| staff_permission_policies | scope_value | character varying | varchar | YES |  | 120 |
| staff_permission_policies | granted_by | integer | int4 | YES |  |  |
| staff_permission_policies | granted_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| staff_permission_policies | expires_at | timestamp without time zone | timestamp | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_permission_policies | policy_id | staff_permission_policies_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| staff_permission_policies | granted_by | staff | staff_id | NO ACTION | NO ACTION | staff_permission_policies_granted_by_fkey |
| staff_permission_policies | role_id | staff_roles | role_id | NO ACTION | CASCADE | staff_permission_policies_role_id_fkey |
| staff_permission_policies | staff_id | staff | staff_id | NO ACTION | CASCADE | staff_permission_policies_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| staff_permission_policies | staff_permission_action_check | ((action)::text = ANY (ARRAY['view'::text, 'create'::text, 'edit'::text, 'delete'::text, 'approve'::text, 'export'::text])) |
| staff_permission_policies | staff_permission_policies_action_not_null | action IS NOT NULL |
| staff_permission_policies | staff_permission_policies_allowed_not_null | allowed IS NOT NULL |
| staff_permission_policies | staff_permission_policies_granted_at_not_null | granted_at IS NOT NULL |
| staff_permission_policies | staff_permission_policies_module_not_null | module IS NOT NULL |
| staff_permission_policies | staff_permission_policies_policy_id_not_null | policy_id IS NOT NULL |
| staff_permission_policies | staff_permission_policies_scope_type_not_null | scope_type IS NOT NULL |
| staff_permission_policies | staff_permission_scope_check | ((scope_type)::text = ANY (ARRAY['global'::text, 'facility'::text, 'branch'::text, 'department'::text])) |
| staff_permission_policies | staff_permission_target_check | (((staff_id IS NOT NULL) AND (role_id IS NULL)) OR ((staff_id IS NULL) AND (role_id IS NOT NULL))) |



## staff_permissions

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| staff_permissions | permission_id | integer | int4 | NO | nextval('staff_permissions_permission_id_seq'::regclass) |  |
| staff_permissions | staff_id | integer | int4 | YES |  |  |
| staff_permissions | module | character varying | varchar | NO |  | 50 |
| staff_permissions | can_read | boolean | bool | YES | true |  |
| staff_permissions | can_write | boolean | bool | YES | false |  |
| staff_permissions | can_delete | boolean | bool | YES | false |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_permissions | permission_id | staff_permissions_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| staff_permissions | staff_id | staff | staff_id | NO ACTION | CASCADE | staff_permissions_staff_id_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_permissions | staff_id | staff_permissions_staff_id_module_key |
| staff_permissions | module | staff_permissions_staff_id_module_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| staff_permissions | staff_permissions_module_not_null | module IS NOT NULL |
| staff_permissions | staff_permissions_permission_id_not_null | permission_id IS NOT NULL |



## staff_role_assignments

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| staff_role_assignments | assignment_id | bigint | int8 | NO | nextval('staff_role_assignments_assignment_id_seq'::regclass) |  |
| staff_role_assignments | staff_id | integer | int4 | NO |  |  |
| staff_role_assignments | role_id | integer | int4 | NO |  |  |
| staff_role_assignments | is_primary | boolean | bool | NO | false |  |
| staff_role_assignments | effective_from | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| staff_role_assignments | effective_to | timestamp without time zone | timestamp | YES |  |  |
| staff_role_assignments | assigned_by | integer | int4 | YES |  |  |
| staff_role_assignments | assignment_note | text | text | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_role_assignments | assignment_id | staff_role_assignments_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| staff_role_assignments | assigned_by | staff | staff_id | NO ACTION | NO ACTION | staff_role_assignments_assigned_by_fkey |
| staff_role_assignments | role_id | staff_roles | role_id | NO ACTION | RESTRICT | staff_role_assignments_role_id_fkey |
| staff_role_assignments | staff_id | staff | staff_id | NO ACTION | CASCADE | staff_role_assignments_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| staff_role_assignments | staff_role_assignments_assignment_id_not_null | assignment_id IS NOT NULL |
| staff_role_assignments | staff_role_assignments_effective_from_not_null | effective_from IS NOT NULL |
| staff_role_assignments | staff_role_assignments_is_primary_not_null | is_primary IS NOT NULL |
| staff_role_assignments | staff_role_assignments_role_id_not_null | role_id IS NOT NULL |
| staff_role_assignments | staff_role_assignments_staff_id_not_null | staff_id IS NOT NULL |



## staff_roles

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| staff_roles | role_id | integer | int4 | NO | nextval('staff_roles_role_id_seq'::regclass) |  |
| staff_roles | role_code | character varying | varchar | NO |  | 50 |
| staff_roles | role_name | character varying | varchar | NO |  | 100 |
| staff_roles | is_system | boolean | bool | NO | true |  |
| staff_roles | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_roles | role_id | staff_roles_pkey |


### Foreign keys

_(none)_


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_roles | role_code | staff_roles_role_code_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| staff_roles | staff_roles_created_at_not_null | created_at IS NOT NULL |
| staff_roles | staff_roles_is_system_not_null | is_system IS NOT NULL |
| staff_roles | staff_roles_role_code_not_null | role_code IS NOT NULL |
| staff_roles | staff_roles_role_id_not_null | role_id IS NOT NULL |
| staff_roles | staff_roles_role_name_not_null | role_name IS NOT NULL |



## staff_roster_assignments

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| staff_roster_assignments | roster_id | bigint | int8 | NO | nextval('staff_roster_assignments_roster_id_seq'::regclass) |  |
| staff_roster_assignments | staff_id | integer | int4 | YES |  |  |
| staff_roster_assignments | shift_template_id | bigint | int8 | NO |  |  |
| staff_roster_assignments | roster_date | date | date | NO |  |  |
| staff_roster_assignments | department | character varying | varchar | YES |  | 120 |
| staff_roster_assignments | ward | character varying | varchar | YES |  | 120 |
| staff_roster_assignments | unit | character varying | varchar | YES |  | 120 |
| staff_roster_assignments | on_call | boolean | bool | NO | false |  |
| staff_roster_assignments | standby | boolean | bool | NO | false |  |
| staff_roster_assignments | assignment_status | character varying | varchar | NO | 'scheduled'::character varying | 20 |
| staff_roster_assignments | assigned_by | integer | int4 | YES |  |  |
| staff_roster_assignments | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| staff_roster_assignments | account_type | character varying | varchar | NO | 'staff'::character varying | 20 |
| staff_roster_assignments | person_id | integer | int4 | NO |  |  |
| staff_roster_assignments | doctor_id | integer | int4 | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_roster_assignments | roster_id | staff_roster_assignments_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| staff_roster_assignments | assigned_by | staff | staff_id | NO ACTION | NO ACTION | staff_roster_assignments_assigned_by_fkey |
| staff_roster_assignments | doctor_id | doctor | doctor_id | NO ACTION | CASCADE | staff_roster_assignments_doctor_id_fkey |
| staff_roster_assignments | shift_template_id | staff_shift_templates | shift_template_id | NO ACTION | RESTRICT | staff_roster_assignments_shift_template_id_fkey |
| staff_roster_assignments | staff_id | staff | staff_id | NO ACTION | CASCADE | staff_roster_assignments_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| staff_roster_assignments | staff_roster_assignments_account_type_not_null | account_type IS NOT NULL |
| staff_roster_assignments | staff_roster_assignments_assignment_status_not_null | assignment_status IS NOT NULL |
| staff_roster_assignments | staff_roster_assignments_created_at_not_null | created_at IS NOT NULL |
| staff_roster_assignments | staff_roster_assignments_employee_ref_check | ((((account_type)::text = 'staff'::text) AND (staff_id IS NOT NULL) AND (doctor_id IS NULL) AND (person_id = staff_id)) OR (((account_type)::text = 'doctor'::text) AND (doctor_id IS NOT NULL) AND (staff_id IS NULL) AND (person_id = doctor_id))) |
| staff_roster_assignments | staff_roster_assignments_on_call_not_null | on_call IS NOT NULL |
| staff_roster_assignments | staff_roster_assignments_person_id_not_null | person_id IS NOT NULL |
| staff_roster_assignments | staff_roster_assignments_roster_date_not_null | roster_date IS NOT NULL |
| staff_roster_assignments | staff_roster_assignments_roster_id_not_null | roster_id IS NOT NULL |
| staff_roster_assignments | staff_roster_assignments_shift_template_id_not_null | shift_template_id IS NOT NULL |
| staff_roster_assignments | staff_roster_assignments_standby_not_null | standby IS NOT NULL |



## staff_security_sessions

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| staff_security_sessions | session_id | uuid | uuid | NO | gen_random_uuid() |  |
| staff_security_sessions | staff_id | integer | int4 | NO |  |  |
| staff_security_sessions | user_code | character varying | varchar | NO |  | 50 |
| staff_security_sessions | role | character varying | varchar | NO |  | 50 |
| staff_security_sessions | login_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| staff_security_sessions | last_seen_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |
| staff_security_sessions | ip_address | character varying | varchar | YES |  | 45 |
| staff_security_sessions | user_agent | text | text | YES |  |  |
| staff_security_sessions | revoked_at | timestamp without time zone | timestamp | YES |  |  |
| staff_security_sessions | revoked_reason | character varying | varchar | YES |  | 120 |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_security_sessions | session_id | staff_security_sessions_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| staff_security_sessions | staff_id | staff | staff_id | NO ACTION | CASCADE | staff_security_sessions_staff_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| staff_security_sessions | staff_security_sessions_last_seen_at_not_null | last_seen_at IS NOT NULL |
| staff_security_sessions | staff_security_sessions_login_at_not_null | login_at IS NOT NULL |
| staff_security_sessions | staff_security_sessions_role_not_null | role IS NOT NULL |
| staff_security_sessions | staff_security_sessions_session_id_not_null | session_id IS NOT NULL |
| staff_security_sessions | staff_security_sessions_staff_id_not_null | staff_id IS NOT NULL |
| staff_security_sessions | staff_security_sessions_user_code_not_null | user_code IS NOT NULL |



## staff_shift_templates

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| staff_shift_templates | shift_template_id | bigint | int8 | NO | nextval('staff_shift_templates_shift_template_id_seq'::regclass) |  |
| staff_shift_templates | shift_code | character varying | varchar | NO |  | 50 |
| staff_shift_templates | shift_name | character varying | varchar | NO |  | 120 |
| staff_shift_templates | start_time | time without time zone | time | NO |  |  |
| staff_shift_templates | end_time | time without time zone | time | NO |  |  |
| staff_shift_templates | is_night_shift | boolean | bool | NO | false |  |
| staff_shift_templates | is_split_shift | boolean | bool | NO | false |  |
| staff_shift_templates | department | character varying | varchar | YES |  | 120 |
| staff_shift_templates | facility_code | character varying | varchar | YES |  | 80 |
| staff_shift_templates | branch_code | character varying | varchar | YES |  | 80 |
| staff_shift_templates | max_staff | integer | int4 | YES |  |  |
| staff_shift_templates | min_staff | integer | int4 | YES |  |  |
| staff_shift_templates | created_by | integer | int4 | YES |  |  |
| staff_shift_templates | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_shift_templates | shift_template_id | staff_shift_templates_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| staff_shift_templates | created_by | staff | staff_id | NO ACTION | NO ACTION | staff_shift_templates_created_by_fkey |


### Unique constraints

| table_name | column_name | constraint_name |
| --- | --- | --- |
| staff_shift_templates | shift_code | staff_shift_templates_shift_code_key |


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| staff_shift_templates | staff_shift_templates_created_at_not_null | created_at IS NOT NULL |
| staff_shift_templates | staff_shift_templates_end_time_not_null | end_time IS NOT NULL |
| staff_shift_templates | staff_shift_templates_is_night_shift_not_null | is_night_shift IS NOT NULL |
| staff_shift_templates | staff_shift_templates_is_split_shift_not_null | is_split_shift IS NOT NULL |
| staff_shift_templates | staff_shift_templates_shift_code_not_null | shift_code IS NOT NULL |
| staff_shift_templates | staff_shift_templates_shift_name_not_null | shift_name IS NOT NULL |
| staff_shift_templates | staff_shift_templates_shift_template_id_not_null | shift_template_id IS NOT NULL |
| staff_shift_templates | staff_shift_templates_start_time_not_null | start_time IS NOT NULL |



## system_settings

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| system_settings | setting_key | character varying | varchar | NO |  | 100 |
| system_settings | setting_value | jsonb | jsonb | YES |  |  |
| system_settings | description | text | text | YES |  |  |
| system_settings | updated_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| system_settings | updated_by | integer | int4 | YES |  |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| system_settings | setting_key | system_settings_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| system_settings | updated_by | staff | staff_id | NO ACTION | NO ACTION | system_settings_updated_by_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| system_settings | system_settings_setting_key_not_null | setting_key IS NOT NULL |



## visit

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| visit | visit_id | integer | int4 | NO | nextval('visit_visit_id_seq'::regclass) |  |
| visit | patient_id | integer | int4 | NO |  |  |
| visit | doctor_id | integer | int4 | NO |  |  |
| visit | visit_timestamp | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |
| visit | visit_type | character varying | varchar | YES |  | 50 |
| visit | clinic_number | integer | int4 | YES |  |  |
| visit | status | character varying | varchar | YES |  | 50 |
| visit | reason | text | text | YES |  |  |
| visit | is_deleted | boolean | bool | YES | false |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| visit | visit_id | visit_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| visit | doctor_id | doctor | doctor_id | NO ACTION | NO ACTION | visit_doctor_id_fkey |
| visit | patient_id | patient | patient_id | NO ACTION | NO ACTION | visit_patient_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| visit | visit_doctor_id_not_null | doctor_id IS NOT NULL |
| visit | visit_patient_id_not_null | patient_id IS NOT NULL |
| visit | visit_status_check | ((status)::text = ANY (ARRAY[('waiting'::character varying)::text, ('seen_by_doctor'::character varying)::text, ('dispensing'::character varying)::text, ('medicines_dispensed'::character varying)::text, ('lab_tests_done'::character varying)::text, ('payment_done'::character varying)::text, ('completed'::character varying)::text, ('admitted'::character varying)::text, ('discharged'::character varying)::text])) |
| visit | visit_visit_id_not_null | visit_id IS NOT NULL |
| visit | visit_visit_type_check | ((visit_type)::text = ANY (ARRAY[('OPD'::character varying)::text, ('Emergency'::character varying)::text])) |



## visit_status_history

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| visit_status_history | visit_status_id | integer | int4 | NO | nextval('visit_status_history_visit_status_id_seq'::regclass) |  |
| visit_status_history | visit_id | integer | int4 | NO |  |  |
| visit_status_history | status | character varying | varchar | YES |  | 100 |
| visit_status_history | updated_by_doctor | integer | int4 | YES |  |  |
| visit_status_history | updated_by_staff | integer | int4 | YES |  |  |
| visit_status_history | updated_at | timestamp without time zone | timestamp | YES | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| visit_status_history | visit_status_id | visit_status_history_pkey |


### Foreign keys

| table_name | column_name | ref_table | ref_column | update_rule | delete_rule | constraint_name |
| --- | --- | --- | --- | --- | --- | --- |
| visit_status_history | updated_by_doctor | doctor | doctor_id | NO ACTION | NO ACTION | visit_status_history_updated_by_doctor_fkey |
| visit_status_history | updated_by_staff | staff | staff_id | NO ACTION | NO ACTION | visit_status_history_updated_by_staff_fkey |
| visit_status_history | visit_id | visit | visit_id | NO ACTION | CASCADE | visit_status_history_visit_id_fkey |


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| visit_status_history | visit_status_history_status_check | ((status)::text = ANY (ARRAY['waiting'::text, 'seen_by_doctor'::text, 'dispensing'::text, 'medicines_dispensed'::text, 'lab_tests_done'::text, 'payment_done'::text, 'completed'::text, 'admitted'::text, 'discharged'::text])) |
| visit_status_history | visit_status_history_visit_id_not_null | visit_id IS NOT NULL |
| visit_status_history | visit_status_history_visit_status_id_not_null | visit_status_id IS NOT NULL |



## ward

### Columns

| table_name | column_name | data_type | udt_name | is_nullable | column_default | character_maximum_length |
| --- | --- | --- | --- | --- | --- | --- |
| ward | ward_id | integer | int4 | NO | nextval('ward_ward_id_seq'::regclass) |  |
| ward | name | character varying | varchar | NO |  | 120 |
| ward | ward_type | character varying | varchar | NO | 'general'::character varying | 30 |
| ward | block | character varying | varchar | YES |  | 60 |
| ward | floor | character varying | varchar | YES |  | 60 |
| ward | is_active | boolean | bool | NO | true |  |
| ward | created_at | timestamp without time zone | timestamp | NO | CURRENT_TIMESTAMP |  |


### Primary key

| table_name | column_name | constraint_name |
| --- | --- | --- |
| ward | ward_id | ward_pkey |


### Foreign keys

_(none)_


### Unique constraints

_(none)_


### Check constraints

| table_name | constraint_name | check_clause |
| --- | --- | --- |
| ward | ck_ward_type | ((ward_type)::text = ANY ((ARRAY['general'::character varying, 'semi_private'::character varying, 'private'::character varying, 'icu'::character varying, 'nicu'::character varying, 'hdu'::character varying, 'isolation'::character varying, 'nursery'::character varying, 'maternity'::character varying])::text[])) |
| ward | ward_created_at_not_null | created_at IS NOT NULL |
| ward | ward_is_active_not_null | is_active IS NOT NULL |
| ward | ward_name_not_null | name IS NOT NULL |
| ward | ward_ward_id_not_null | ward_id IS NOT NULL |
| ward | ward_ward_type_not_null | ward_type IS NOT NULL |


