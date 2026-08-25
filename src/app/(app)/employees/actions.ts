"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireHr } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";

export type EmployeeFormState = { error?: string; success?: string };

const employeeSchema = z.object({
  employee_number: z.string().trim().min(1, "Employee number is required."),
  first_name: z.string().trim().min(1, "First name is required."),
  last_name: z.string().trim().min(1, "Last name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().optional().or(z.literal("")),
  job_title: z.string().trim().optional().or(z.literal("")),
  role: z.enum(["admin", "hr", "manager", "employee"]),
  employment_type: z.enum(["full_time", "part_time", "contract", "intern"]),
  status: z.enum(["active", "on_leave", "suspended", "terminated"]),
  department_id: z.string().uuid().optional().or(z.literal("")),
  manager_id: z.string().uuid().optional().or(z.literal("")),
  hire_date: z.string().min(1, "Hire date is required."),
  termination_date: z.string().optional().or(z.literal("")),
  base_salary: z.coerce.number().min(0, "Salary cannot be negative."),
  currency: z.string().trim().min(1).max(3),
});

function parse(formData: FormData) {
  return employeeSchema.safeParse({
    employee_number: formData.get("employee_number"),
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    job_title: formData.get("job_title") ?? "",
    role: formData.get("role") ?? "employee",
    employment_type: formData.get("employment_type") ?? "full_time",
    status: formData.get("status") ?? "active",
    department_id: formData.get("department_id") ?? "",
    manager_id: formData.get("manager_id") ?? "",
    hire_date: formData.get("hire_date"),
    termination_date: formData.get("termination_date") ?? "",
    base_salary: formData.get("base_salary") ?? 0,
    currency: formData.get("currency") ?? "USD",
  });
}

/** Turns the empty strings a <select> submits into nulls the database accepts. */
function toRow(values: z.infer<typeof employeeSchema>) {
  return {
    ...values,
    phone: values.phone || null,
    job_title: values.job_title || null,
    department_id: values.department_id || null,
    manager_id: values.manager_id || null,
    termination_date: values.termination_date || null,
    currency: values.currency.toUpperCase(),
  };
}

export async function createEmployee(
  _prev: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  await requireHr();

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .insert(toRow(parsed.data))
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "That employee number or email is already in use." };
    }
    return { error: error.message };
  }

  // Best effort: send the login invite. The employee record stands on its own
  // if this fails, and HR can re-invite from the employee page.
  if (formData.get("send_invite") === "on") {
    const invite = await inviteEmployee(parsed.data.email);
    if (invite.error) {
      revalidatePath("/employees");
      redirect(`/employees/${data.id}?warning=${encodeURIComponent(invite.error)}`);
    }
  }

  revalidatePath("/employees");
  redirect(`/employees/${data.id}`);
}

export async function updateEmployee(
  _prev: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  await requireHr();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing employee id." };

  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("employees").update(toRow(parsed.data)).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "That employee number or email is already in use." };
    }
    return { error: error.message };
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  return { success: "Employee updated." };
}

/**
 * Sends a Supabase invite so the employee can set a password. Requires the
 * service-role key; without it we say so rather than failing silently.
 */
export async function inviteEmployee(email: string): Promise<EmployeeFormState> {
  await requireHr();

  try {
    const { error } = await supabaseAdmin().auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl()}/auth/callback`,
    });
    if (error) return { error: `Invite failed: ${error.message}` };
    return { success: `Invite sent to ${email}.` };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Invite failed." };
  }
}

export async function inviteEmployeeAction(
  _prev: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Missing email address." };
  return inviteEmployee(email);
}
