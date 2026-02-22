export type TimesheetGridColumn = {
  iso: string; // "2026-02-07"
  dayLabel: string; // "Sat"
  dateLabel: string; // "07"
};

export type TimesheetGridRow = {
  id: string;
  label: string;
  dayRate?: number;
  present: boolean[];
  daysWorked: number;
  pay: number;
  isForeman?: boolean;
};

export type TimesheetGridModel = {
  columns: TimesheetGridColumn[];
  rows: TimesheetGridRow[];
  totals: {
    totalDays: number;
    totalPay: number;
    foremanDays: number;
    foremanPay: number;
    teamDays: number;
    teamPay: number;
  };
  foremanName?: string;
};
