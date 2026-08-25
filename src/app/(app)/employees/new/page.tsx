import Link from "next/link";

import { requireHr } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmployeeForm } from "../employee-form";
import { createEmployee } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  await requireHr();
  const supabase = await createClient();

  const [departments, managers] = await Promise.all([
    supabase.from("departments").select("id, name").order("name"),
    supabase
      .from("employees")
      .select("id, first_name, last_name")
      .eq("status", "active")
      .order("first_name"),
  ]);

  return (
    <>
      <PageHeader
        title="Add employee"
        description="Create the personnel record, then invite them to sign in."
        action={
          <Link href="/employees" className="btn-secondary">
            Cancel
          </Link>
        }
      />

      <EmployeeForm
        action={createEmployee}
        departments={departments.data ?? []}
        managers={managers.data ?? []}
        submitLabel="Create employee"
        showInvite
      />
    </>
  );
}
