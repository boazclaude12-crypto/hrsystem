import Link from "next/link";

import { requireEmployee, isHr } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ClockWidget } from "@/components/clock-widget";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge, statusTone } from "@/components/badge";
import { formatDate, fullName } from "@/lib/format";
import type { LeaveRequestWithRelations } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const employee = await requireEmployee();
  const { error } = await searchParams;
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();

  const [
    todayRecord,
    headcount,
    presentToday,
    pendingLeave,
    myBalances,
    recentRequests,
  ] = await Promise.all([
    supabase
      .from("attendance_records")
      .select("clock_in, clock_out")
      .eq("employee_id", employee.id)
      .eq("work_date", today)
      .maybeSingle(),
    supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("work_date", today)
      .in("status", ["present", "remote"]),
    supabase
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("leave_balances")
      .select("entitled_days, used_days, leave_type:leave_types (name)")
      .eq("employee_id", employee.id)
      .eq("year", year),
    supabase
      .from("leave_requests")
      .select(
        "*, employee:employees!leave_requests_employee_id_fkey (id, first_name, last_name, employee_number), leave_type:leave_types (id, name, code, is_paid)",
      )
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const balances = (myBalances.data ?? []) as unknown as {
    entitled_days: number;
    used_days: number;
    leave_type: { name: string } | null;
  }[];
  const requests = (recentRequests.data ?? []) as unknown as LeaveRequestWithRelations[];

  return (
    <>
      <PageHeader
        title={`Hi, ${employee.first_name}`}
        description="Your day at a glance."
      />

      {error === "forbidden" ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          That page is limited to HR and admins.
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <ClockWidget
          clockedInAt={todayRecord.data?.clock_in ?? null}
          clockedOutAt={todayRecord.data?.clock_out ?? null}
        />
        <StatCard
          label="Active employees"
          value={headcount.count ?? 0}
          hint={isHr(employee.role) ? "Across all departments" : "Visible to you"}
        />
        <StatCard
          label="In today"
          value={presentToday.count ?? 0}
          hint="Present or working remotely"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent leave requests</h2>
            <Link href="/leave" className="text-sm text-brand hover:underline">
              View all
            </Link>
          </div>

          {requests.length === 0 ? (
            <EmptyState message="No leave requests yet." />
          ) : (
            <ul className="space-y-2">
              {requests.map((request) => (
                <li
                  key={request.id}
                  className="card flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{fullName(request.employee)}</p>
                    <p className="text-xs text-muted">
                      {request.leave_type?.name} · {formatDate(request.start_date)} –{" "}
                      {formatDate(request.end_date)} · {request.days} days
                    </p>
                  </div>
                  <Badge tone={statusTone(request.status)}>{request.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Your leave balance</h2>
          {balances.length === 0 ? (
            <EmptyState message={`No balances set for ${year}.`} />
          ) : (
            <ul className="space-y-2">
              {balances.map((balance, index) => {
                const remaining = balance.entitled_days - balance.used_days;
                return (
                  <li key={index} className="card py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{balance.leave_type?.name ?? "Leave"}</span>
                      <span className="text-sm font-semibold tabular-nums">
                        {remaining} / {balance.entitled_days}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">days remaining</p>
                  </li>
                );
              })}
            </ul>
          )}

          {isHr(employee.role) ? (
            <div className="card mt-4">
              <p className="text-sm text-muted">Pending approvals</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {pendingLeave.count ?? 0}
              </p>
              <Link
                href="/leave"
                className="mt-2 inline-block text-sm text-brand hover:underline"
              >
                Review requests
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
