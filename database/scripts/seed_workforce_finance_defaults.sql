-- Idempotent seed script for workforce finance defaults

INSERT INTO public.allowance_type_master (code, label, description, taxable)
VALUES
  ('transport', 'Transport Allowance', 'Recurring or ad-hoc transport support', true),
  ('meal', 'Meal Allowance', 'Meal subsidy or food support', true),
  ('housing', 'Housing Allowance', 'Rent or housing support', true),
  ('medical', 'Medical Allowance', 'General medical support for staff', false),
  ('communication', 'Communication Allowance', 'Phone/internet reimbursement', true),
  ('other', 'Other Allowance', 'Any custom allowance type', true)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  taxable = EXCLUDED.taxable,
  updated_at = NOW();

INSERT INTO public.finance_expense_category (code, label, description)
VALUES
  ('utilities', 'Utilities', 'Electricity, water, internet and utility bills'),
  ('inventory', 'Inventory', 'General inventory not tracked as medicine purchase'),
  ('maintenance', 'Maintenance', 'Repairs and upkeep'),
  ('rent', 'Rent', 'Facility rent and related charges'),
  ('equipment_service', 'Equipment Service', 'Machine service and AMC costs'),
  ('salary_related', 'Salary Related', 'Payroll-linked overhead costs'),
  ('other', 'Other', 'Any uncategorized operating expense')
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES
  ('system_timezone', '"Asia/Karachi"'::jsonb, 'Global HMS timezone used for business-day boundaries and date/time rendering')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = NOW();
