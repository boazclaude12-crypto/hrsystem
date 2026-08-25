import { requireEmployee } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { fullName, initials } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const employee = await requireEmployee();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:px-6">
      <aside className="md:w-56 md:shrink-0">
        <div className="mb-6 hidden md:block">
          <span className="text-lg font-semibold">HR System</span>
        </div>

        <Sidebar role={employee.role} />

        <div className="mt-6 hidden rounded-xl border border-border bg-surface p-3 md:block">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
              {initials(employee)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{fullName(employee)}</p>
              <p className="text-xs text-muted">{ROLE_LABELS[employee.role]}</p>
            </div>
          </div>
          <form action="/auth/signout" method="post" className="mt-3">
            <button type="submit" className="btn-secondary w-full text-xs">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
