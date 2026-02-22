import type { TimesheetGridModel } from "@/components/timesheets/gridModel";

type GridRow = TimesheetGridModel["rows"][number];
type Totals = TimesheetGridModel["totals"];

function safeStr(v: unknown) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function safeNum(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function extractForemanName(detail: unknown): string {
  const d = (detail as Record<string, unknown>)?.timesheet ?? detail;
  const obj = d as Record<string, unknown>;

  const candidates = [
    (obj?.foreman as Record<string, unknown>)?.name,
    ((obj?.foreman as Record<string, unknown>)?.user as Record<string, unknown>)
      ?.name,
    obj?.foremanName,
  ];

  const name = candidates.map(safeStr).find((s) => s.trim().length > 0);
  return (name ?? "").trim();
}

export function normalizeTimesheetToGrid(detail: unknown): TimesheetGridModel {
  const raw = detail as Record<string, unknown>;
  const d = (raw?.timesheet ?? raw) as Record<string, unknown>;

  const foremanName = extractForemanName(d);

  const columns: TimesheetGridModel["columns"] = (
    (d?.columns ?? []) as Array<Record<string, unknown>>
  ).map((c) => {
    const iso = safeStr(c?.iso);
    const fallbackDay = safeStr(c?.day);
    const fallbackDate = iso.includes("-") ? iso.split("-")[2] : "";

    return {
      iso,
      dayLabel: safeStr(c?.dayLabel ?? fallbackDay),
      dateLabel: safeStr(c?.dateLabel ?? c?.date ?? fallbackDate),
    };
  });

  const colLen = columns.length;

  const rows: TimesheetGridModel["rows"] = (
    (d?.rows ?? []) as Array<Record<string, unknown>>
  ).map((r) => {
    const label = safeStr(r?.label ?? r?.fullName ?? "—").trim();

    const isForeman =
      typeof r?.isForeman === "boolean"
        ? r.isForeman
        : foremanName
          ? label === foremanName
          : false;

    return {
      id: safeStr(r?.id ?? r?.employeeId),
      label,
      dayRate: safeNum(r?.dayRate),
      present: Array.isArray(r?.present)
        ? (r.present as boolean[]).slice(0, colLen)
        : [],
      daysWorked: safeNum(r?.daysWorked),
      pay: safeNum(r?.pay),
      isForeman,
    };
  });

  const totals = rows.reduce<Totals>(
    (acc: Totals, r: GridRow) => {
      const days = safeNum(r.daysWorked);
      const pay = safeNum(r.pay);

      acc.totalDays += days;
      acc.totalPay += pay;

      if (r.isForeman) {
        acc.foremanDays += days;
        acc.foremanPay += pay;
      } else {
        acc.teamDays += days;
        acc.teamPay += pay;
      }

      return acc;
    },
    {
      totalDays: 0,
      totalPay: 0,
      foremanDays: 0,
      foremanPay: 0,
      teamDays: 0,
      teamPay: 0,
    } as Totals,
  );

  return {
    columns,
    rows,
    totals,
    foremanName,
  };
}
