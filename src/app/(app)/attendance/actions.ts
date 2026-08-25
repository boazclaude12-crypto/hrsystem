"use server";

import { revalidatePath } from "next/cache";

import { requireEmployee, isHr } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceStatus } from "@/lib/types";

export type ActionState = { error?: string; success?: string };

/** Today's date in UTC, which is what `work_date` is keyed on. */
function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function clockIn(): Promise<ActionState> {
  const employee = await requireEmployee();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id, clock_in")
    .eq("employee_id", employee.id)
    .eq("work_date", today())
    .maybeSingle();

  if (existing?.clock_in) {
    return { error: "You already clocked in today." };
  }

  const { error } = await supabase.from("attendance_records").upsert(
    {
      employee_id: employee.id,
      work_date: today(),
      clock_in: new Date().toISOString(),
      status: "present" satisfies AttendanceStatus,
    },
    { onConflict: "employee_id,work_date" },
  );

  if (error) return { error: error.message };

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return { success: "Clocked in." };
}

export async function clockOut(): Promise<ActionState> {
  const employee = await requireEmployee();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id, clock_in, clock_out")
    .eq("employee_id", employee.id)
    .eq("work_date", today())
    .maybeSingle();

  if (!existing?.clock_in) return { error: "Clock in before clocking out." };
  if (existing.clock_out) return { error: "You already clocked out today." };

  const { error } = await supabase
    .from("attendance_records")
    .update({ clock_out: new Date().toISOString() })
    .eq("id", existing.id);

  if (error) return { error: error.message };

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return { success: "Clocked out." };
}

/**
 * Manual correction of one day's record. Employees may fix their own day; HR
 * may fix anyone's. RLS enforces the same rule server-side.
 */
export async function saveAttendance(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const employee = await requireEmployee();
  const supabase = await createClient();

  const employeeId = String(formData.get("employee_id") ?? employee.id);
  const workDate = String(formData.get("work_date") ?? "");
  const status = String(formData.get("status") ?? "present") as AttendanceStatus;
  const breakMinutes = Number(formData.get("break_minutes") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!workDate) return { error: "Pick a date." };
  if (employeeId !== employee.id && !isHr(employee.role)) {
    return { error: "You can only edit your own attendance." };
  }
  if (!Number.isFinite(breakMinutes) || breakMinutes < 0) {
    return { error: "Break minutes must be zero or more." };
  }

  const clockInRaw = String(formData.get("clock_in") ?? "");
  const clockOutRaw = String(formData.get("clock_out") ?? "");
  const clockIn = clockInRaw ? new Date(`${workDate}T${clockInRaw}:00`) : null;
  const clockOut = clockOutRaw ? new Date(`${workDate}T${clockOutRaw}:00`) : null;

  if (clockIn && clockOut && clockOut < clockIn) {
    return { error: "Clock out must come after clock in." };
  }

  const { error } = await supabase.from("attendance_records").upsert(
    {
      employee_id: employeeId,
      work_date: workDate,
      clock_in: clockIn?.toISOString() ?? null,
      clock_out: clockOut?.toISOString() ?? null,
      break_minutes: breakMinutes,
      status,
      notes,
    },
    { onConflict: "employee_id,work_date" },
  );

  if (error) return { error: error.message };

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return { success: `Saved ${workDate}.` };
}
