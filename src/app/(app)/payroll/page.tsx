import { requireHr } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge, statusTone } from "@/components/badge";
import { formatDate, formatMoney, fullName } from "@/lib/format";
import type { PayrollPeriod, PayslipWithEmployee } from "@/lib/types";
import { GenerateForm, NewPeriodForm, PeriodStatusForm } from "./payroll-forms";

export const dynamic = "force-dynamic";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireHr();
  const { period: selectedParam } = await searchParams;
  const supabase = await createClient();

  const { data: periodData } = await supabase
    .from("payroll_periods")
    .select("*")
    .order("period_start", { ascending: false });

  const periods = (periodData ?? []) as PayrollPeriod[];
  const selectedId = selectedParam || periods[0]?.id;

  const { data: payslipData } = selectedId
    ? await supabase
        .from("payslips")
        .select(
          "*, employee:employees!payslips_employee_id_fkey (id, first_name, last_name, employee_number)",
        )
        .eq("payroll_period_id", selectedId)
    : { data: [] };

  const payslips = (payslipData ?? []) as unknown as PayslipWithEmployee[];
  const totals = payslips.reduce(
    (acc, slip) => ({
      gross: acc.gross + Number(slip.gross_pay),
      tax: acc.tax + Number(slip.tax),
      net: acc.net + Number(slip.net_pay),
    }),
    { gross: 0, tax: 0, net: 0 },
  );
  const currency = payslips[0]?.currency ?? "USD";

  return (
    <>
      <PageHeader title="Payroll" description="Pay periods and generated payslips." />

      <h2 className="mb-3 text-lg font-semibold">New pay period</h2>
      <NewPeriodForm />

      {periods.length === 0 ? (
        <div className="mt-8">
          <EmptyState message="Create a pay period to start generating payslips." />
        </div>
      ) : (
        <>
          <h2 className="mb-3 mt-8 text-lg font-semibold">Generate payslips</h2>
          <GenerateForm periods={periods} />

          <h2 className="mb-3 mt-8 text-lg font-semibold">Periods</h2>
          <ul className="space-y-2">
            {periods.map((period) => (
              <li
                key={period.id}
                className={`card flex flex-wrap items-center justify-between gap-3 py-3 ${
                  period.id === selectedId ? "ring-1 ring-brand" : ""
                }`}
              >
                <div>
                  <a href={`/payroll?period=${period.id}`} className="font-medium hover:underline">
                    {period.name}
                  </a>
                  <p className="text-xs text-muted">
                    {formatDate(period.period_start)} – {formatDate(period.period_end)} · paid{" "}
                    {formatDate(period.pay_date)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={statusTone(period.status)}>{period.status}</Badge>
                  <PeriodStatusForm period={period} />
                </div>
              </li>
            ))}
          </ul>

          <h2 className="mb-3 mt-8 text-lg font-semibold">Payslips</h2>
          {payslips.length === 0 ? (
            <EmptyState message="No payslips generated for this period yet." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3 text-right">Gross</th>
                    <th className="px-4 py-3 text-right">Tax</th>
                    <th className="px-4 py-3 text-right">Other</th>
                    <th className="px-4 py-3 text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((slip) => (
                    <tr key={slip.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        {fullName(slip.employee)}
                        <span className="ml-2 text-xs text-muted">
                          {slip.employee?.employee_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(Number(slip.gross_pay), slip.currency)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">
                        {formatMoney(Number(slip.tax), slip.currency)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">
                        {formatMoney(Number(slip.other_deductions), slip.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatMoney(Number(slip.net_pay), slip.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border text-sm font-medium">
                  <tr>
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(totals.gross, currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(totals.tax, currency)}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(totals.net, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
