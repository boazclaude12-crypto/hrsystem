-- ---------------------------------------------------------------------------
-- HR System - core schema
--
-- Run this once against a fresh Supabase project (SQL editor, or
-- `supabase db execute -f supabase/schema.sql`). It is idempotent enough to
-- re-run: every object is created with IF NOT EXISTS or dropped first.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type app_role as enum ('admin', 'hr', 'manager', 'employee');
exception when duplicate_object then null; end $$;

do $$ begin
  create type employment_type as enum ('full_time', 'part_time', 'contract', 'intern');
exception when duplicate_object then null; end $$;

do $$ begin
  create type employment_status as enum ('active', 'on_leave', 'suspended', 'terminated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attendance_status as enum ('present', 'remote', 'absent', 'holiday', 'leave');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payroll_status as enum ('draft', 'processing', 'paid', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists employees (
  id               uuid primary key default gen_random_uuid(),
  -- Null until the person accepts their invite and an auth user exists.
  user_id          uuid unique references auth.users (id) on delete set null,
  employee_number  text not null unique,
  first_name       text not null,
  last_name        text not null,
  email            text not null unique,
  phone            text,
  role             app_role not null default 'employee',
  job_title        text,
  department_id    uuid references departments (id) on delete set null,
  manager_id       uuid references employees (id) on delete set null,
  employment_type  employment_type not null default 'full_time',
  status           employment_status not null default 'active',
  hire_date        date not null default current_date,
  termination_date date,
  base_salary      numeric(12, 2) not null default 0,
  currency         text not null default 'USD',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint employees_not_own_manager check (manager_id is null or manager_id <> id),
  constraint employees_termination_after_hire
    check (termination_date is null or termination_date >= hire_date)
);

create index if not exists employees_department_idx on employees (department_id);
create index if not exists employees_manager_idx on employees (manager_id);
create index if not exists employees_status_idx on employees (status);

-- A department's head. Added after `employees` exists so the FK can point at it.
alter table departments
  add column if not exists manager_id uuid references employees (id) on delete set null;

create table if not exists attendance_records (
  id             uuid primary key default gen_random_uuid(),
  employee_id    uuid not null references employees (id) on delete cascade,
  work_date      date not null,
  clock_in       timestamptz,
  clock_out      timestamptz,
  break_minutes  integer not null default 0 check (break_minutes >= 0),
  status         attendance_status not null default 'present',
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (employee_id, work_date),
  constraint attendance_clock_out_after_in
    check (clock_out is null or clock_in is null or clock_out >= clock_in)
);

create index if not exists attendance_employee_date_idx
  on attendance_records (employee_id, work_date desc);

create table if not exists leave_types (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null unique,
  name                  text not null,
  default_days_per_year numeric(5, 1) not null default 0,
  is_paid               boolean not null default true,
  created_at            timestamptz not null default now()
);

create table if not exists leave_balances (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references employees (id) on delete cascade,
  leave_type_id uuid not null references leave_types (id) on delete cascade,
  year          integer not null,
  entitled_days numeric(5, 1) not null default 0,
  used_days     numeric(5, 1) not null default 0,
  updated_at    timestamptz not null default now(),
  unique (employee_id, leave_type_id, year)
);

create table if not exists leave_requests (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references employees (id) on delete cascade,
  leave_type_id uuid not null references leave_types (id) on delete restrict,
  start_date    date not null,
  end_date      date not null,
  days          numeric(5, 1) not null check (days > 0),
  reason        text,
  status        request_status not null default 'pending',
  reviewed_by   uuid references employees (id) on delete set null,
  reviewed_at   timestamptz,
  review_note   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint leave_end_after_start check (end_date >= start_date)
);

create index if not exists leave_requests_employee_idx
  on leave_requests (employee_id, created_at desc);
create index if not exists leave_requests_status_idx on leave_requests (status);

create table if not exists payroll_periods (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  period_start date not null,
  period_end   date not null,
  pay_date     date not null,
  status       payroll_status not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (period_start, period_end),
  constraint payroll_end_after_start check (period_end >= period_start)
);

create table if not exists payslips (
  id                uuid primary key default gen_random_uuid(),
  payroll_period_id uuid not null references payroll_periods (id) on delete cascade,
  employee_id       uuid not null references employees (id) on delete cascade,
  gross_pay         numeric(12, 2) not null default 0,
  tax               numeric(12, 2) not null default 0,
  other_deductions  numeric(12, 2) not null default 0,
  net_pay           numeric(12, 2) not null default 0,
  currency          text not null default 'USD',
  notes             text,
  created_at        timestamptz not null default now(),
  unique (payroll_period_id, employee_id)
);

create index if not exists payslips_employee_idx on payslips (employee_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'departments', 'employees', 'attendance_records',
    'leave_balances', 'leave_requests', 'payroll_periods'
  ] loop
    execute format('drop trigger if exists %I_set_updated_at on %I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on %I
         for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Auth helpers
--
-- These are SECURITY DEFINER so they read `employees` without re-entering the
-- RLS policies that call them - otherwise every employees policy would recurse.
-- ---------------------------------------------------------------------------

create or replace function current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from employees where user_id = auth.uid();
$$;

create or replace function current_app_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from employees where user_id = auth.uid();
$$;

-- HR and admins see and edit everything.
create or replace function is_hr()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_app_role() in ('admin', 'hr'), false);
$$;

-- True when the signed-in user manages the given employee, directly or further
-- up the reporting chain.
create or replace function manages_employee(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive chain as (
    select id, manager_id, 1 as depth from employees where id = target
    union all
    select e.id, e.manager_id, c.depth + 1
    from employees e
    join chain c on e.id = c.manager_id
    -- Guard against a cycle in the reporting chain looping forever.
    where c.depth < 20
  )
  select exists (
    select 1 from chain
    where manager_id = current_employee_id()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table departments        enable row level security;
alter table employees          enable row level security;
alter table attendance_records enable row level security;
alter table leave_types        enable row level security;
alter table leave_balances     enable row level security;
alter table leave_requests     enable row level security;
alter table payroll_periods    enable row level security;
alter table payslips           enable row level security;

-- Departments and leave types are reference data: readable by everyone signed
-- in, writable by HR.
drop policy if exists departments_read on departments;
create policy departments_read on departments
  for select to authenticated using (true);

drop policy if exists departments_write on departments;
create policy departments_write on departments
  for all to authenticated using (is_hr()) with check (is_hr());

drop policy if exists leave_types_read on leave_types;
create policy leave_types_read on leave_types
  for select to authenticated using (true);

drop policy if exists leave_types_write on leave_types;
create policy leave_types_write on leave_types
  for all to authenticated using (is_hr()) with check (is_hr());

-- Employees: you always see yourself; managers see their reports; HR sees all.
drop policy if exists employees_read on employees;
create policy employees_read on employees
  for select to authenticated
  using (
    user_id = auth.uid()
    or is_hr()
    or manages_employee(id)
  );

drop policy if exists employees_write on employees;
create policy employees_write on employees
  for all to authenticated using (is_hr()) with check (is_hr());

-- Attendance: own records are readable and writable; managers read their
-- reports'; HR does anything.
drop policy if exists attendance_read on attendance_records;
create policy attendance_read on attendance_records
  for select to authenticated
  using (
    employee_id = current_employee_id()
    or is_hr()
    or manages_employee(employee_id)
  );

drop policy if exists attendance_self_write on attendance_records;
create policy attendance_self_write on attendance_records
  for insert to authenticated
  with check (employee_id = current_employee_id() or is_hr());

drop policy if exists attendance_self_update on attendance_records;
create policy attendance_self_update on attendance_records
  for update to authenticated
  using (employee_id = current_employee_id() or is_hr())
  with check (employee_id = current_employee_id() or is_hr());

drop policy if exists attendance_hr_delete on attendance_records;
create policy attendance_hr_delete on attendance_records
  for delete to authenticated using (is_hr());

-- Leave balances are read-only outside HR.
drop policy if exists leave_balances_read on leave_balances;
create policy leave_balances_read on leave_balances
  for select to authenticated
  using (
    employee_id = current_employee_id()
    or is_hr()
    or manages_employee(employee_id)
  );

drop policy if exists leave_balances_write on leave_balances;
create policy leave_balances_write on leave_balances
  for all to authenticated using (is_hr()) with check (is_hr());

-- Leave requests: employees file their own, managers and HR review them.
drop policy if exists leave_requests_read on leave_requests;
create policy leave_requests_read on leave_requests
  for select to authenticated
  using (
    employee_id = current_employee_id()
    or is_hr()
    or manages_employee(employee_id)
  );

drop policy if exists leave_requests_insert on leave_requests;
create policy leave_requests_insert on leave_requests
  for insert to authenticated
  with check (employee_id = current_employee_id() or is_hr());

drop policy if exists leave_requests_update on leave_requests;
create policy leave_requests_update on leave_requests
  for update to authenticated
  using (
    is_hr()
    or manages_employee(employee_id)
    -- The requester may still touch it while nobody has reviewed it.
    or (employee_id = current_employee_id() and status = 'pending')
  )
  with check (
    is_hr()
    or manages_employee(employee_id)
    or employee_id = current_employee_id()
  );

-- Payroll is HR-only, except that you can read your own payslips.
drop policy if exists payroll_periods_read on payroll_periods;
create policy payroll_periods_read on payroll_periods
  for select to authenticated using (true);

drop policy if exists payroll_periods_write on payroll_periods;
create policy payroll_periods_write on payroll_periods
  for all to authenticated using (is_hr()) with check (is_hr());

drop policy if exists payslips_read on payslips;
create policy payslips_read on payslips
  for select to authenticated
  using (employee_id = current_employee_id() or is_hr());

drop policy if exists payslips_write on payslips;
create policy payslips_write on payslips
  for all to authenticated using (is_hr()) with check (is_hr());

-- ---------------------------------------------------------------------------
-- Link a new auth user to the employee record HR created for their email.
-- ---------------------------------------------------------------------------

create or replace function link_auth_user_to_employee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update employees
     set user_id = new.id
   where user_id is null
     and lower(email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function link_auth_user_to_employee();

-- ---------------------------------------------------------------------------
-- Seed reference data
-- ---------------------------------------------------------------------------

insert into leave_types (code, name, default_days_per_year, is_paid) values
  ('annual',    'Annual leave',   20, true),
  ('sick',      'Sick leave',     10, true),
  ('parental',  'Parental leave', 90, true),
  ('unpaid',    'Unpaid leave',    0, false)
on conflict (code) do nothing;
