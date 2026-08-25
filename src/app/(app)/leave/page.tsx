import { requireEmployee, isHr } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge, statusTone } from "@/components/badge";
import { formatDate, fullName } from "@/lib/format";
import type { LeaveRequestWithRelations, LeaveType } from "@/lib/types";
import { LeaveRequestForm } from "./leave-request-form";
import { CancelControl, ReviewControls } from "./review-actions";

export const dynamic = "force-dynamic";

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const viewer = await requireEmployee();
  const { status = "" } = await searchParams;
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const canReview = isHr(viewer.role) || viewer.role === "manager";

  let requestQuery = supabase
    .from("leave_requests")
    .select(
      "*, employee:employees!leave_requests_employee_id_fkey (id, first_name, last_name, employee_number), leave_type:leave_types (id, name, code, is_paid)",
    )
    .order("created_at", { ascending: false });

  if (status) requestQuery = requestQuery.eq("status", status);

  const [requestResult, typeResult, balanceResult] = await Promise.all([
    requestQuery,
    supabase.from("leave_types").select("*").order("name"),
    supabase
      .from("leave_balances")
      .select("entitled_days, used_days, leave_type:leave_types (id, name)")
      .eq("employee_id", viewer.id)
      .eq("year", year),
  ]);

  const requests = (requestResult.data ?? []) as unknown as LeaveRequestWithRelations[];
  const leaveTypes = (typeResult.data ?? []) as LeaveType[];
  const balances = (balanceResult.data ?? []) as unknown as {
    entitled_days: number;
    used_days: number;
    leave_type: { id: string; name: string } | null;
  }[];

  return (
    <>
      <PageHeader title="Leave" description="Request time off and review your team's requests." />

      {balances.length > 0 ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {balances.map((balance) => (
            <div key={balance.leave_type?.id ?? balance.leave_type?.name} className="card py-4">
              <p className="text-sm text-muted">{balance.leave_type?.name ?? "Leave"}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {balance.entitled_days - balance.used_days}
              </p>
              <p className="text-xs text-muted">
                of {balance.entitled_days} days left in {year}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold">New request</h2>
      {leaveTypes.length === 0 ? (
        <EmptyState message="No leave types configured. Run supabase/schema.sql to seed them." />
      ) : (
        <LeaveRequestForm leaveTypes={leaveTypes} />
      )}

      <div className="mb-3 mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Requests</h2>
        <form className="flex items-end gap-2">
          <select name="status" defaultValue={status} className="input py-1 text-sm">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button type="submit" className="btn-secondary py-1 text-sm">
            Filter
          </button>
        </form>
      </div>

      {requestResult.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {requestResult.error.message}
        </p>
      ) : requests.length === 0 ? (
        <EmptyState message="No leave requests to show." />
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => {
            const isMine = request.employee_id === viewer.id;
            const showReview = canReview && request.status === "pending" && !isMine;

            return (
              <li key={request.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {isMine ? "You" : fullName(request.employee)}
                      <span className="ml-2 text-sm font-normal text-muted">
                        {request.leave_type?.name}
                        {request.leave_type?.is_paid === false ? " (unpaid)" : ""}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {formatDate(request.start_date)} – {formatDate(request.end_date)} ·{" "}
                      {request.days} day(s)
                    </p>
                    {request.reason ? (
                      <p className="mt-1 text-sm text-muted">“{request.reason}”</p>
                    ) : null}
                    {request.review_note ? (
                      <p className="mt-1 text-xs text-muted">
                        Reviewer note: {request.review_note}
                      </p>
                    ) : null}
                  </div>
                  <Badge tone={statusTone(request.status)}>{request.status}</Badge>
                </div>

                {showReview ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <ReviewControls requestId={request.id} />
                  </div>
                ) : null}

                {isMine && request.status === "pending" ? (
                  <div className="mt-3 border-t border-border pt-3">
                    <CancelControl requestId={request.id} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
