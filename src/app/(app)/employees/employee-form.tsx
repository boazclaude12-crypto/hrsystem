"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import {
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  ROLE_LABELS,
  type Department,
  type Employee,
} from "@/lib/types";
import type { EmployeeFormState } from "./actions";

type Action = (
  state: EmployeeFormState,
  formData: FormData,
) => Promise<EmployeeFormState>;

export function EmployeeForm({
  action,
  employee,
  departments,
  managers,
  submitLabel,
  showInvite = false,
}: {
  action: Action;
  employee?: Employee;
  departments: Pick<Department, "id" | "name">[];
  managers: Pick<Employee, "id" | "first_name" | "last_name">[];
  submitLabel: string;
  showInvite?: boolean;
}) {
  const [state, formAction] = useActionState<EmployeeFormState, FormData>(action, {});

  return (
    <form action={formAction} className="card space-y-5">
      {employee ? <input type="hidden" name="id" value={employee.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="first_name" defaultValue={employee?.first_name} required />
        <Field label="Last name" name="last_name" defaultValue={employee?.last_name} required />
        <Field
          label="Employee number"
          name="employee_number"
          defaultValue={employee?.employee_number}
          required
        />
        <Field
          label="Email"
          name="email"
          type="email"
          defaultValue={employee?.email}
          required
        />
        <Field label="Phone" name="phone" defaultValue={employee?.phone ?? ""} />
        <Field label="Job title" name="job_title" defaultValue={employee?.job_title ?? ""} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Department" name="department_id" defaultValue={employee?.department_id ?? ""}>
          <option value="">No department</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </Select>

        <Select label="Reports to" name="manager_id" defaultValue={employee?.manager_id ?? ""}>
          <option value="">No manager</option>
          {managers
            .filter((candidate) => candidate.id !== employee?.id)
            .map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.first_name} {candidate.last_name}
              </option>
            ))}
        </Select>

        <Select label="Role" name="role" defaultValue={employee?.role ?? "employee"}>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <Select
          label="Employment type"
          name="employment_type"
          defaultValue={employee?.employment_type ?? "full_time"}
        >
          {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <Select label="Status" name="status" defaultValue={employee?.status ?? "active"}>
          {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <Field
          label="Hire date"
          name="hire_date"
          type="date"
          defaultValue={employee?.hire_date ?? new Date().toISOString().slice(0, 10)}
          required
        />

        <Field
          label="Termination date"
          name="termination_date"
          type="date"
          defaultValue={employee?.termination_date ?? ""}
        />

        <Field
          label="Base salary"
          name="base_salary"
          type="number"
          step="0.01"
          min="0"
          defaultValue={String(employee?.base_salary ?? 0)}
        />

        <Field
          label="Currency"
          name="currency"
          maxLength={3}
          defaultValue={employee?.currency ?? "USD"}
        />
      </div>

      {showInvite ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="send_invite"
            defaultChecked
            className="rounded border-border text-brand focus:ring-brand"
          />
          Email an invite so they can set a password
        </label>
      ) : null}

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {state.success}
        </p>
      ) : null}

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} className="input" {...props} />
    </div>
  );
}

function Select({
  label,
  name,
  children,
  ...props
}: { label: string; name: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <select id={name} name={name} className="input" {...props}>
        {children}
      </select>
    </div>
  );
}
