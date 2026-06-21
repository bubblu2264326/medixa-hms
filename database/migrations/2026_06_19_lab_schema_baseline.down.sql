-- DANGER: drops the entire lab schema (and all lab data). Only for a full
-- teardown of a fresh/throwaway rebuild — never run against a DB with real lab
-- records. Reverse FK order.
DROP TABLE IF EXISTS lab_result_approvals;
DROP TABLE IF EXISTS lab_test_results;
DROP TABLE IF EXISTS lab_order;
DROP TABLE IF EXISTS lab_test_parameters;
DROP TABLE IF EXISTS lab_test;
