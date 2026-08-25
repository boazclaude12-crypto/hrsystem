"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import type { PayrollPeriod } from "@/lib/types";
import {
  createPayrollPeriod,
  generatePayslips,
  setPeriodStatus,
  type PayrollState,
} from "./actions";

function Feedback({ state }: { state: PayrollState }) {
  if (state.error) return <span className="text-sm text-red-600">{state.error}</span>;
  if (state.success) return <span className="text-sm text-green-600">{state.success}</span>;
  return null;
}

export function NewPeriodForm() {
  const [state, formAction] = useActionState<PayrollState, FormData>(
    createPayrollPeriod,
    {},
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="card grid gap-4 sm:grid-cols-4">
      <div>
        <label className="label" htmlFor="name">
          Name
        </label>
        <input id="name" name="name" required placeholder="March 2026" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="period_start">
          Period start
        </label>
        <input
          id="period_start"
          name="period_start"
          type="date"
          required
          defaultValue={today}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="period_end">
          Period end
        </label>
        <input
          id="period_end"
          name="period_end"
          type="date"
          required
          defaultValue={today}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="pay_date">
          Pay date
        </label>
        <input
          id="pay_date"
          name="pay_date"
          type="date"
          required
          defaultValue={today}
          className="input"
        />
      </div>
      <div className="flex items-center gap-3 sm:col-span-4">
        <SubmitButton>Create period</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function GenerateForm({ periods }: { periods: PayrollPeriod[] }) {
  const [state, formAction] = useActionState<PayrollState, FormData>(generatePayslips, {});

  return (
    <form action={formAction} className="card grid gap-4 sm:grid-cols-4">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="period_id">
          Period
        </label>
        <select id="period_id" name="period_id" required className="input">
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="runs_per_year">
          Pay runs per year
        </label>
        <input
          id="runs_per_year"
          name="runs_per_year"
          type="number"
          min="1"
          defaultValue={12}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="tax_rate">
          Flat tax rate (%)
        </label>
        <input
          id="tax_rate"
          name="tax_rate"
          type="number"
          min="0"
          max="100"
          step="0.1"
          defaultValue={20}
          className="input"
        />
      </div>
      <div className="flex items-center gap-3 sm:col-span-4">
        <SubmitButton pendingLabel="Generating…">Generate payslips</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function PeriodStatusForm({ period }: { period: PayrollPeriod }) {
  const [state, formAction] = useActionState<PayrollState, FormData>(setPeriodStatus, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="period_id" value={period.id} />
      <select name="status" defaultValue={period.status} className="input py-1 text-xs">
        <option value="draft">Draft</option>
        <option value="processing">Processing</option>
        <option value="paid">Paid</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <SubmitButton className="btn-secondary px-3 py-1 text-xs">Update</SubmitButton>
      <Feedback state={state} />
    </form>
  );
}
