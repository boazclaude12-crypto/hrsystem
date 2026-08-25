import { requireEmployee, isHr } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge, statusTone } from "@/components/badge";
import { StatCard } from "@/components/stat-card";
import { formatDate, formatTime, fullName, workedHours } from "@/lib/format";
import { ATTENDANCE_STATUS_LABELS, type AttendanceRecord, type Employee } from "@/lib/types";
import { AttendanceForm } from "./attendance-form";

export const dynamic = "force-dynamic";

type Row = AttendanceRecord & {
  employee: Pick<Employee, "id" | "first_name" | "last_name"> | null;
};

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; scope?: string }>;
}) {
  const viewer = await requireEmployee();
  const params = await searchParams;
  const range = defaultRange();
  const from = params.from || range.from;
  const to = params.to || range.to;
  const scope = params.scope === "team" ? "team" : "me";
  const canSeeTeam = isHr(viewer.role) || viewer.role === "manager";

  const supabase = await createClient();

  let query = supabase
    .from("attendance_records")
    .select(
      "*, employee:employees!attendance_records_employee_id_fkey (id, first_name, last_name)",
    )
    .gte("work_date", from)
    .lte("work_date", to)
    .order("work_date", { ascending: false });

  // RLS already limits "team" to reports and HR; scope=me narrows it further.
  if (scope === "me" || !canSeeTeam) {
    query = query.eq("employee_id", viewer.id);
  }

  const { data, error } = await query;
  const records = (data ?? []) as unknown as Row[];

  const totalHours = records.reduce((sum, record) => sum + (workedHours(record) ?? 0), 0);
  const daysPresent = records.filter((r) => r.status === "present" || r.status === "remote").length;

  const employeeOptions = isHr(viewer.role)
    ? ((
        await supabase
          .from("employees")
          .select("id, first_name, last_name")
          .eq("status", "active")
          .order("first_name")
      ).data ?? [])
    : [];

  return (
    <>
      <PageHeader title="Attendance" description="Clock entries and manual corrections." />

      <form className="card mb-4 flex flex-wrap items-end gap-3 py-4">
        <div>
          <label className="label" htmlFor="from">
            From
          </label>
          <input id="from" name="from" type="date" defaultValue={from} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="to">
            To
          </label>
          <input id="to" name="to" type="date" defaultValue={to} className="input" />
        </div>
        {canSeeTeam ? (
          <div>
            <label className="label" htmlFor="scope">
              Scope
            </label>
            <select id="scope" name="scope" defaultValue={scope} className="input">
              <option value="me">Just me</option>
              <option value="team">My team</option>
            </select>
          </div>
        ) : null}
        <button type="submit" className="btn-secondary">
          Apply
        </button>
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Entries" value={records.length} hint={`${from} → ${to}`} />
        <StatCard label="Days present" value={daysPresent} />
        <StatCard label="Hours worked" value={Math.round(totalHours * 10) / 10} />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Log an entry</h2>
      <AttendanceForm
        self={viewer}
        employees={employeeOptions}
        canEditOthers={isHr(viewer.role)}
      />

      <h2 className="mb-3 mt-8 text-lg font-semibold">Entries</h2>
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error.message}
        </p>
      ) : records.length === 0 ? (
        <EmptyState message="No attendance in this range." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Date</th>
                {scope === "team" ? <th className="px-4 py-3">Employee</th> : null}
                <th className="px-4 py-3">In</th>
                <th className="px-4 py-3">Out</th>
                <th className="px-4 py-3">Break</th>
                <th className="px-4 py-3">Hours</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{formatDate(record.work_date)}</td>
                  {scope === "team" ? (
                    <td className="px-4 py-3">{fullName(record.employee)}</td>
                  ) : null}
                  <td className="px-4 py-3 text-muted">{formatTime(record.clock_in)}</td>
                  <td className="px-4 py-3 text-muted">{formatTime(record.clock_out)}</td>
                  <td className="px-4 py-3 tabular-nums text-muted">{record.break_minutes}m</td>
                  <td className="px-4 py-3 tabular-nums">{workedHours(record) ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(record.status)}>
                      {ATTENDANCE_STATUS_LABELS[record.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
