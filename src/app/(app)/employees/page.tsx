import Link from "next/link";
import { Plus } from "lucide-react";

import { requireEmployee, isHr } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge, statusTone } from "@/components/badge";
import { formatDate, fullName, initials } from "@/lib/format";
import {
  EMPLOYMENT_STATUS_LABELS,
  ROLE_LABELS,
  type EmployeeWithRelations,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const viewer = await requireEmployee();
  const { q = "", status = "" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("employees")
    .select(
      "*, department:departments (id, name), manager:employees!employees_manager_id_fkey (id, first_name, last_name)",
    )
    .order("first_name");

  if (q) {
    const term = `%${q}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},employee_number.ilike.${term}`,
    );
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  const employees = (data ?? []) as unknown as EmployeeWithRelations[];

  return (
    <>
      <PageHeader
        title="Employees"
        description="Everyone you have access to see."
        action={
          isHr(viewer.role) ? (
            <Link href="/employees/new" className="btn-primary">
              <Plus size={16} /> Add employee
            </Link>
          ) : null
        }
      />

      <form className="card mb-4 flex flex-wrap items-end gap-3 py-4">
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="q">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Name, email or employee number"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="input">
            <option value="">All</option>
            {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          Filter
        </button>
      </form>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error.message}
        </p>
      ) : employees.length === 0 ? (
        <EmptyState message="No employees match this filter." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Hired</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/employees/${employee.id}`}
                      className="flex items-center gap-3 hover:underline"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                        {initials(employee)}
                      </span>
                      <span>
                        <span className="block font-medium">{fullName(employee)}</span>
                        <span className="block text-xs text-muted">
                          {employee.job_title ?? employee.employee_number}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {employee.department?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{ROLE_LABELS[employee.role]}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(employee.hire_date)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(employee.status)}>
                      {EMPLOYMENT_STATUS_LABELS[employee.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
