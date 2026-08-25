import {
  differenceInMinutes,
  eachDayOfInterval,
  format,
  isWeekend,
  parseISO,
} from "date-fns";

export function formatDate(value: string | null | undefined, pattern = "d MMM yyyy") {
  if (!value) return "—";
  return format(parseISO(value), pattern);
}

export function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  return format(new Date(value), "HH:mm");
}

export function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function fullName(person?: { first_name: string; last_name: string } | null) {
  if (!person) return "—";
  return `${person.first_name} ${person.last_name}`.trim();
}

export function initials(person?: { first_name: string; last_name: string } | null) {
  if (!person) return "?";
  return `${person.first_name[0] ?? ""}${person.last_name[0] ?? ""}`.toUpperCase();
}

/** Worked hours for one attendance row, breaks excluded. */
export function workedHours(record: {
  clock_in: string | null;
  clock_out: string | null;
  break_minutes: number;
}): number | null {
  if (!record.clock_in || !record.clock_out) return null;
  const minutes =
    differenceInMinutes(new Date(record.clock_out), new Date(record.clock_in)) -
    record.break_minutes;
  return Math.max(0, Math.round((minutes / 60) * 100) / 100);
}

/** Weekdays between two ISO dates, inclusive. Used to size a leave request. */
export function businessDaysBetween(startIso: string, endIso: string): number {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  if (end < start) return 0;

  let days = 0;
  for (const day of eachDayOfInterval({ start, end })) {
    if (!isWeekend(day)) days += 1;
  }
  return days;
}
