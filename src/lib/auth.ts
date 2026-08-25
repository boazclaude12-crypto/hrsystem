import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { AppRole, Employee } from "@/lib/types";

/**
 * The employee record for the signed-in user, or null when nobody is signed in
 * or no employee row has been linked to their auth user yet.
 */
export async function getCurrentEmployee(): Promise<Employee | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("employees")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (data as Employee) ?? null;
}

/** Same as getCurrentEmployee, but sends unauthenticated visitors to /login. */
export async function requireEmployee(): Promise<Employee> {
  const employee = await getCurrentEmployee();
  if (!employee) redirect("/login");
  return employee;
}

export function isHr(role: AppRole) {
  return role === "admin" || role === "hr";
}

/** Guards HR-only pages and actions. */
export async function requireHr(): Promise<Employee> {
  const employee = await requireEmployee();
  if (!isHr(employee.role)) redirect("/dashboard?error=forbidden");
  return employee;
}
