"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import { ATTENDANCE_STATUS_LABELS, type Employee } from "@/lib/types";
import { saveAttendance, type ActionState } from "./actions";

export function AttendanceForm({
  self,
  employees,
  canEditOthers,
}: {
  self: Employee;
  employees: Pick<Employee, "id" | "first_name" | "last_name">[];
  canEditOthers: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(saveAttendance, {});

  return (
    <form action={formAction} className="card grid gap-4 sm:grid-cols-3">
      {canEditOthers ? (
        <div>
          <label className="label" htmlFor="employee_id">
            Employee
          </label>
          <select id="employee_id" name="employee_id" defaultValue={self.id} className="input">
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.first_name} {employee.last_name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="employee_id" value={self.id} />
      )}

      <div>
        <label className="label" htmlFor="work_date">
          Date
        </label>
        <input
          id="work_date"
          name="work_date"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="status">
          Status
        </label>
        <select id="status" name="status" defaultValue="present" className="input">
          {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="clock_in">
          Clock in
        </label>
        <input id="clock_in" name="clock_in" type="time" className="input" />
      </div>

      <div>
        <label className="label" htmlFor="clock_out">
          Clock out
        </label>
        <input id="clock_out" name="clock_out" type="time" className="input" />
      </div>

      <div>
        <label className="label" htmlFor="break_minutes">
          Break (minutes)
        </label>
        <input
          id="break_minutes"
          name="break_minutes"
          type="number"
          min="0"
          defaultValue={0}
          className="input"
        />
      </div>

      <div className="sm:col-span-3">
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <input id="notes" name="notes" className="input" placeholder="Optional" />
      </div>

      <div className="flex items-center gap-3 sm:col-span-3">
        <SubmitButton>Save entry</SubmitButton>
        {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
        {state.success ? <span className="text-sm text-green-600">{state.success}</span> : null}
      </div>
    </form>
  );
}
