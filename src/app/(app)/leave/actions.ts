"use server";

import { revalidatePath } from "next/cache";

import { requireEmployee, isHr } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { businessDaysBetween } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";

export type LeaveState = { error?: string; success?: string };

export async function requestLeave(
  _prev: LeaveState,
  formData: FormData,
): Promise<LeaveState> {
  const employee = await requireEmployee();
  const supabase = await createClient();

  const leaveTypeId = String(formData.get("leave_type_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!leaveTypeId || !startDate || !endDate) {
    return { error: "Pick a leave type and a date range." };
  }
  if (endDate < startDate) {
    return { error: "The end date cannot be before the start date." };
  }

  const days = businessDaysBetween(startDate, endDate);
  if (days <= 0) {
    return { error: "That range contains no working days." };
  }

  // Two open requests over the same dates would double-count the balance.
  const { data: clashes } = await supabase
    .from("leave_requests")
    .select("id")
    .eq("employee_id", employee.id)
    .in("status", ["pending", "approved"])
    .lte("start_date", endDate)
    .gte("end_date", startDate)
    .limit(1);

  if (clashes && clashes.length > 0) {
    return { error: "You already have a request covering those dates." };
  }

  const { error } = await supabase.from("leave_requests").insert({
    employee_id: employee.id,
    leave_type_id: leaveTypeId,
    start_date: startDate,
    end_date: endDate,
    days,
    reason,
  });

  if (error) return { error: error.message };

  revalidatePath("/leave");
  revalidatePath("/dashboard");
  return { success: `Requested ${days} day(s).` };
}

export async function reviewLeave(
  _prev: LeaveState,
  formData: FormData,
): Promise<LeaveState> {
  const reviewer = await requireEmployee();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "") as RequestStatus;
  const note = String(formData.get("review_note") ?? "").trim() || null;

  if (!id || !["approved", "rejected"].includes(decision)) {
    return { error: "Unknown decision." };
  }

  const { data: request } = await supabase
    .from("leave_requests")
    .select("id, employee_id, leave_type_id, days, status, start_date")
    .eq("id", id)
    .maybeSingle();

  if (!request) return { error: "Request not found." };
  if (request.status !== "pending") {
    return { error: "That request has already been reviewed." };
  }
  if (request.employee_id === reviewer.id && !isHr(reviewer.role)) {
    return { error: "You cannot review your own leave request." };
  }

  // RLS decides whether this reviewer may touch the row at all.
  const { error, data: updated } = await supabase
    .from("leave_requests")
    .update({
      status: decision,
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
      review_note: note,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!updated) return { error: "You do not have permission to review this request." };

  if (decision === "approved") {
    const drawdown = await applyBalanceDrawdown(
      request.employee_id,
      request.leave_type_id,
      Number(request.days),
      Number(request.start_date.slice(0, 4)),
    );
    if (drawdown.error) {
      revalidatePath("/leave");
      return { success: `Approved. Balance not updated: ${drawdown.error}` };
    }
  }

  revalidatePath("/leave");
  revalidatePath("/dashboard");
  return { success: decision === "approved" ? "Request approved." : "Request rejected." };
}

export async function cancelLeave(
  _prev: LeaveState,
  formData: FormData,
): Promise<LeaveState> {
  const employee = await requireEmployee();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing request id." };

  const { data: updated, error } = await supabase
    .from("leave_requests")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("employee_id", employee.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!updated) return { error: "Only your own pending requests can be cancelled." };

  revalidatePath("/leave");
  return { success: "Request cancelled." };
}

/**
 * Adds the approved days to the employee's balance for the year, creating the
 * balance row from the leave type's default entitlement if it is missing.
 *
 * Runs with the service role because managers may approve leave but are not
 * allowed to write balances directly - authorisation was already settled by
 * the RLS-checked update above.
 */
async function applyBalanceDrawdown(
  employeeId: string,
  leaveTypeId: string,
  days: number,
  year: number,
): Promise<{ error?: string }> {
  let admin;
  try {
    admin = supabaseAdmin();
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Admin client unavailable." };
  }

  const { data: balance } = await admin
    .from("leave_balances")
    .select("id, used_days")
    .eq("employee_id", employeeId)
    .eq("leave_type_id", leaveTypeId)
    .eq("year", year)
    .maybeSingle();

  if (balance) {
    const { error } = await admin
      .from("leave_balances")
      .update({ used_days: Number(balance.used_days) + days })
      .eq("id", balance.id);
    return error ? { error: error.message } : {};
  }

  const { data: leaveType } = await admin
    .from("leave_types")
    .select("default_days_per_year")
    .eq("id", leaveTypeId)
    .maybeSingle();

  const { error } = await admin.from("leave_balances").insert({
    employee_id: employeeId,
    leave_type_id: leaveTypeId,
    year,
    entitled_days: Number(leaveType?.default_days_per_year ?? 0),
    used_days: days,
  });

  return error ? { error: error.message } : {};
}
