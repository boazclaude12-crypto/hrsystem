"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import type { LeaveType } from "@/lib/types";
import { requestLeave, type LeaveState } from "./actions";

export function LeaveRequestForm({ leaveTypes }: { leaveTypes: LeaveType[] }) {
  const [state, formAction] = useActionState<LeaveState, FormData>(requestLeave, {});
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="card grid gap-4 sm:grid-cols-4">
      <div>
        <label className="label" htmlFor="leave_type_id">
          Type
        </label>
        <select id="leave_type_id" name="leave_type_id" required className="input">
          {leaveTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="start_date">
          From
        </label>
        <input
          id="start_date"
          name="start_date"
          type="date"
          required
          defaultValue={today}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="end_date">
          To
        </label>
        <input
          id="end_date"
          name="end_date"
          type="date"
          required
          defaultValue={today}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="reason">
          Reason
        </label>
        <input id="reason" name="reason" className="input" placeholder="Optional" />
      </div>

      <div className="flex items-center gap-3 sm:col-span-4">
        <SubmitButton pendingLabel="Submitting…">Submit request</SubmitButton>
        <span className="text-xs text-muted">Weekend days are not counted.</span>
        {state.error ? <span className="text-sm text-red-600">{state.error}</span> : null}
        {state.success ? <span className="text-sm text-green-600">{state.success}</span> : null}
      </div>
    </form>
  );
}
