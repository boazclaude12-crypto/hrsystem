# HR System

Employee, attendance, leave and payroll management, built with Next.js 15 (App
Router) and Supabase.

## What it does

| Area | Capability |
| --- | --- |
| **Employees** | Personnel records with department, reporting line, employment type, status, salary. HR creates records and emails a sign-in invite. |
| **Attendance** | Clock in/out, plus manual day-by-day corrections. Range filters, worked-hours totals, and a team view for managers. |
| **Leave** | Request time off (weekends excluded automatically), manager/HR approval, per-year balances that draw down on approval. |
| **Payroll** | Pay periods, payslip generation from base salary, running totals per period. |

Access is decided by an employee's `role`:

| Role | Sees | Can change |
| --- | --- | --- |
| `admin`, `hr` | Everyone | Everything, including salaries and payroll |
| `manager` | Themselves and their reporting chain | Their own records; approves their reports' leave |
| `employee` | Themselves | Their own attendance and leave requests |

Those rules live in Postgres row-level security (`supabase/schema.sql`), not
only in the UI, so a leaked anon key still cannot read another employee's
salary.

## Setup

### 1. Create the Supabase project

Create a project at [supabase.com](https://supabase.com), then run the schema
against it — either paste `supabase/schema.sql` into the SQL editor, or:

```bash
supabase db execute -f supabase/schema.sql
```

It creates the tables, enum types, RLS policies, the `updated_at` triggers, and
seeds the four default leave types.

### 2. Bootstrap the first admin

Nobody can sign in until an `employees` row exists for them with a role. Edit
the email and name at the top of `supabase/seed.sql`, then run it. Invite that
address from **Authentication → Users** in the Supabase dashboard; the trigger
links the new auth user to the employee record automatically.

### 3. Configure the app

```bash
cp .env.example .env.local
```

| Variable | Where to find it | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project settings → API | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project settings → API | Safe in the browser; RLS constrains it |
| `SUPABASE_SERVICE_ROLE_KEY` | Project settings → API | **Server only.** Used for invites and leave-balance updates |
| `NEXT_PUBLIC_SITE_URL` | Your deployed URL | Where auth emails redirect back to |

Add `${NEXT_PUBLIC_SITE_URL}/auth/callback` to **Authentication → URL
Configuration → Redirect URLs** in Supabase, or invite links will bounce.

### 4. Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts: `npm run build`, `npm run typecheck`, `npm run lint`.

## Layout

```
src/
├── app/
│   ├── (app)/              # Signed-in shell: sidebar + pages
│   │   ├── dashboard/      # Clock widget, headcount, recent requests
│   │   ├── employees/      # List, create, detail + edit
│   │   ├── attendance/     # Entries, filters, manual corrections
│   │   ├── leave/          # Requests, approvals, balances
│   │   └── payroll/        # Periods and payslips (HR only)
│   ├── auth/               # OAuth callback and sign-out
│   └── login/
├── components/             # Sidebar, badges, cards, submit button
├── lib/
│   ├── supabase/           # Browser, server (RLS) and admin (service role) clients
│   ├── auth.ts             # requireEmployee / requireHr guards
│   ├── format.ts           # Dates, money, worked hours, business days
│   └── types.ts            # Row types mirroring the schema
└── middleware.ts           # Session refresh + route protection
supabase/
├── schema.sql              # Tables, enums, RLS, triggers, leave types
└── seed.sql                # First admin, starting balances, departments
```

Mutations are server actions, so every write re-checks the caller's role on the
server and then hits RLS a second time in the database.

## Things to adjust before real use

- **Payroll maths is deliberately simple.** `generatePayslips` divides the
  annual base salary by the number of pay runs and applies one flat tax rate.
  Replace it with your jurisdiction's rules before paying anyone.
- **Attendance dates are UTC.** `work_date` is keyed on the UTC calendar day.
  Teams spread across time zones will want a per-employee time zone column.
- **Leave days exclude weekends only.** Public holidays are not modelled; add a
  holidays table and subtract it in `businessDaysBetween` if you need them.
