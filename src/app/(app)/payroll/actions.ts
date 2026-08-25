"use server";

import { revalidatePath } from "next/cache";

import { requireHr } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Employee } from "@/lib/types";

export type PayrollState = { error?: string; success?: string };

export async function createPayrollPeriod(
  _prev: PayrollState,
  formData: FormData,
): Promise<PayrollState> {
  await requireHr();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const periodStart = String(formData.get("period_start") ?? "");
  const periodEnd = String(formData.get("period_end") ?? "");
  const payDate = String(formData.get("pay_date") ?? "");

  if (!name || !periodStart || !periodEnd || !payDate) {
    return { error: "Name, period dates and pay date are all required." };
  }
  if (periodEnd < periodStart) {
    return { error: "The period end cannot be before its start." };
  }

  const { error } = await supabase.from("payroll_periods").insert({
    name,
    period_start: periodStart,
    period_end: periodEnd,
    pay_date: payDate,
  });

  if (error) {
    if (error.code === "23505") return { error: "A period already covers those dates." };
    return { error: error.message };
  }

  revalidatePath("/payroll");
  return { success: `Created ${name}.` };
}

/**
 * Draft a payslip for every active employee from their base salary.
 *
 * Gross pay is the annual base divided by the number of pay runs per year, so
 * a monthly run pays a twelfth. Tax is a single flat rate - swap this for your
 * jurisdiction's rules before using it to pay anyone.
 */
export async function generatePayslips(
  _prev: PayrollState,
  formData: FormData,
): Promise<PayrollState> {
  await requireHr();
  const supabase = await createClient();

  const periodId = String(formData.get("period_id") ?? "");
  const runsPerYear = Number(formData.get("runs_per_year") ?? 12);
  const taxRate = Number(formData.get("tax_rate") ?? 0);

  if (!periodId) return { error: "Pick a payroll period." };
  if (!Number.isFinite(runsPerYear) || runsPerYear <= 0) {
    return { error: "Pay runs per year must be greater than zero." };
  }
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    return { error: "Tax rate must be between 0 and 100." };
  }

  const { data: period } = await supabase
    .from("payroll_periods")
    .select("id, status")
    .eq("id", periodId)
    .maybeSingle();

  if (!period) return { error: "Payroll period not found." };
  if (period.status === "paid") {
    return { error: "That period is already paid and cannot be regenerated." };
  }

  const { data: employees, error: employeeError } = await supabase
    .from("employees")
    .select("id, base_salary, currency")
    .eq("status", "active");

  if (employeeError) return { error: employeeError.message };
  if (!employees || employees.length === 0) {
    return { error: "No active employees to pay." };
  }

  const rows = (employees as Pick<Employee, "id" | "base_salary" | "currency">[]).map(
    (employee) => {
      const gross = round(Number(employee.base_salary) / runsPerYear);
      const tax = round(gross * (taxRate / 100));
      return {
        payroll_period_id: periodId,
        employee_id: employee.id,
        gross_pay: gross,
        tax,
        other_deductions: 0,
        net_pay: round(gross - tax),
        currency: employee.currency,
      };
    },
  );

  const { error } = await supabase
    .from("payslips")
    .upsert(rows, { onConflict: "payroll_period_id,employee_id" });

  if (error) return { error: error.message };

  await supabase.from("payroll_periods").update({ status: "processing" }).eq("id", periodId);

  revalidatePath("/payroll");
  return { success: `Drafted ${rows.length} payslip(s).` };
}

export async function setPeriodStatus(
  _prev: PayrollState,
  formData: FormData,
): Promise<PayrollState> {
  await requireHr();
  const supabase = await createClient();

  const periodId = String(formData.get("period_id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!periodId || !["draft", "processing", "paid", "cancelled"].includes(status)) {
    return { error: "Unknown payroll status." };
  }

  const { error } = await supabase
    .from("payroll_periods")
    .update({ status })
    .eq("id", periodId);

  if (error) return { error: error.message };

  revalidatePath("/payroll");
  return { success: `Period marked ${status}.` };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
