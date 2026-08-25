import Link from "next/link";
import { notFound } from "next/navigation";

import { requireEmployee, isHr } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Badge, statusTone } from "@/components/badge";
import { EmptyState } from "@/components/empty-state";
import { formatDate, formatMoney, formatTime, fullName, workedHours } from "@/lib/format";
import {
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  ROLE_LABELS,
  type AttendanceRecord,
  type EmployeeWithRelations,
} from "@/lib/types";
import { EmployeeForm } from "../employee-form";
import { updateEmployee } from "../actions";
import { InviteButton } from "./invite-button";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ warning?: string }>;
}) {
  const viewer = await requireEmployee();
  const { id } = await params;
  const { warning } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("employees")
    .select(
      "*, department:departments (id, name), manager:employees!employees_manager_id_fkey (id, first_name, last_name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const employee = data as unknown as EmployeeWithRelations;
  const canEdit = isHr(viewer.role);

  const [recentAttendance, departments, managers] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("*")
      .eq("employee_id", employee.id)
      .order("work_date", { ascending: false })
      .limit(10),
    canEdit
      ? supabase.from("departments").select("id, name").order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    canEdit
      ? supabase
          .from("employees")
          .select("id, first_name, last_name")
          .eq("status", "active")
          .order("first_name")
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string }[] }),
  ]);

  const attendance = (recentAttendance.data ?? []) as AttendanceRecord[];

  return (
    <>
      <PageHeader
        title={fullName(employee)}
        description={`${employee.employee_number} · ${employee.email}`}
        action={
          <Link href="/employees" className="btn-secondary">
            Back
          </Link>
        }
      />

      {warning ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {warning}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Detail label="Status">
          <Badge tone={statusTone(employee.status)}>
            {EMPLOYMENT_STATUS_LABELS[employee.status]}
          </Badge>
        </Detail>
        <Detail label="Job title">{employee.job_title ?? "—"}</Detail>
        <Detail label="Department">{employee.department?.name ?? "—"}</Detail>
        <Detail label="Reports to">{fullName(employee.manager)}</Detail>
        <Detail label="Role">{ROLE_LABELS[employee.role]}</Detail>
        <Detail label="Employment">{EMPLOYMENT_TYPE_LABELS[employee.employment_type]}</Detail>
        <Detail label="Hired">{formatDate(employee.hire_date)}</Detail>
        {canEdit ? (
          <Detail label="Base salary">
            {formatMoney(employee.base_salary, employee.currency)}
          </Detail>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Recent attendance</h2>
        {attendance.length === 0 ? (
          <EmptyState message="No attendance recorded yet." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">In</th>
                  <th className="px-4 py-3">Out</th>
                  <th className="px-4 py-3">Hours</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record) => (
                  <tr key={record.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{formatDate(record.work_date)}</td>
                    <td className="px-4 py-3 text-muted">{formatTime(record.clock_in)}</td>
                    <td className="px-4 py-3 text-muted">{formatTime(record.clock_out)}</td>
                    <td className="px-4 py-3 tabular-nums">{workedHours(record) ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(record.status)}>{record.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canEdit ? (
        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Edit record</h2>
            {employee.user_id ? (
              <span className="text-xs text-muted">Sign-in linked</span>
            ) : (
              <InviteButton email={employee.email} />
            )}
          </div>
          <EmployeeForm
            action={updateEmployee}
            employee={employee}
            departments={departments.data ?? []}
            managers={managers.data ?? []}
            submitLabel="Save changes"
          />
        </section>
      ) : null}
    </>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card py-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-1 text-sm font-medium">{children}</div>
    </div>
  );
}
