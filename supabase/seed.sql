-- ---------------------------------------------------------------------------
-- Bootstrap the first admin.
--
-- Edit the three values below, then run this after schema.sql. It works
-- whether or not the person has already signed up: if an auth user with that
-- email exists, their id is linked straight away, and if not, the trigger in
-- schema.sql links it the moment they accept their invite.
-- ---------------------------------------------------------------------------

do $$
declare
  admin_email      text := 'admin@example.com';
  admin_first_name text := 'Ada';
  admin_last_name  text := 'Admin';
  linked_user_id   uuid;
begin
  select id into linked_user_id
  from auth.users
  where lower(email) = lower(admin_email);

  insert into employees (
    user_id, employee_number, first_name, last_name, email, role, job_title
  ) values (
    linked_user_id, 'EMP-0001', admin_first_name, admin_last_name,
    admin_email, 'admin', 'People Operations'
  )
  on conflict (email) do update
    set role    = 'admin',
        user_id = coalesce(employees.user_id, excluded.user_id);
end $$;

-- Give everyone the default entitlement for the current year.
insert into leave_balances (employee_id, leave_type_id, year, entitled_days, used_days)
select e.id, t.id, extract(year from current_date)::int, t.default_days_per_year, 0
from employees e
cross join leave_types t
on conflict (employee_id, leave_type_id, year) do nothing;

-- A couple of departments to start from.
insert into departments (name, description) values
  ('Engineering', 'Product and platform engineering'),
  ('People',      'HR, recruiting and operations'),
  ('Finance',     'Accounting and payroll')
on conflict (name) do nothing;
