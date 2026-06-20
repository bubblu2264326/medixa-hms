-- Rollback for 2026_06_20_ipd_03_billing.sql
DROP VIEW IF EXISTS v_ip_running_bill;
DROP TABLE IF EXISTS ip_final_bill;
DROP TABLE IF EXISTS ip_charge;
DROP TABLE IF EXISTS ip_advance;
