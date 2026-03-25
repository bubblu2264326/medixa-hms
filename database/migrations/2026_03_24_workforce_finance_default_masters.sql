-- Workforce finance static masters
-- Date: 2026-03-24

create table if not exists public.allowance_type_master (
  code text primary key,
  label text not null,
  description text,
  taxable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_expense_category (
  code text primary key,
  label text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.allowance_type_master (code, label, description, taxable)
values
  ('transport', 'Transport Allowance', 'Recurring or ad-hoc transport support', true),
  ('meal', 'Meal Allowance', 'Meal subsidy or food support', true),
  ('housing', 'Housing Allowance', 'Rent or housing support', true),
  ('medical', 'Medical Allowance', 'General medical support for staff', false),
  ('communication', 'Communication Allowance', 'Phone/internet reimbursement', true),
  ('other', 'Other Allowance', 'Any custom allowance type', true)
on conflict (code) do update set
  label = excluded.label,
  description = excluded.description,
  taxable = excluded.taxable,
  updated_at = now();

insert into public.finance_expense_category (code, label, description)
values
  ('utilities', 'Utilities', 'Electricity, water, internet and utility bills'),
  ('inventory', 'Inventory', 'General inventory not tracked as medicine purchase'),
  ('maintenance', 'Maintenance', 'Repairs and upkeep'),
  ('rent', 'Rent', 'Facility rent and related charges'),
  ('equipment_service', 'Equipment Service', 'Machine service and AMC costs'),
  ('salary_related', 'Salary Related', 'Payroll-linked overhead costs'),
  ('other', 'Other', 'Any uncategorized operating expense')
on conflict (code) do update set
  label = excluded.label,
  description = excluded.description,
  updated_at = now();
