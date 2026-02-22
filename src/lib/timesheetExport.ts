/**
 * Timesheet Export Utility
 * - Print timesheet to printer
 * - Download as CSV
 */

import type { TimesheetGridModel } from "@/components/timesheets/gridModel";

interface TimesheetExportMeta {
  foremanName?: string;
  contractManagerName?: string;
  startDate?: string;
  endDate?: string;
  sites?: Array<{ code?: string; name?: string }>;
  status?: string;
}

/**
 * Generate CSV content from timesheet grid model
 */
export function generateTimesheetCSV(
  model: TimesheetGridModel,
  meta?: TimesheetExportMeta,
): string {
  const lines: string[] = [];

  // Header metadata
  if (meta?.foremanName) {
    lines.push(`Foreman,${escapeCSV(meta.foremanName)}`);
  }
  if (meta?.contractManagerName) {
    lines.push(`Contract Manager,${escapeCSV(meta.contractManagerName)}`);
  }
  if (meta?.startDate && meta?.endDate) {
    lines.push(`Period,${meta.startDate} to ${meta.endDate}`);
  }
  if (meta?.sites?.length) {
    const siteNames = meta.sites
      .map((s) => [s.code, s.name].filter(Boolean).join(" - "))
      .join("; ");
    lines.push(`Sites,${escapeCSV(siteNames)}`);
  }
  if (meta?.status) {
    lines.push(`Status,${escapeCSV(meta.status)}`);
  }

  lines.push(""); // Empty line separator

  // Column headers
  const headers = [
    "Full Name",
    ...model.columns.map((c) => `${c.dayLabel} ${c.dateLabel}`),
    "Days Worked",
    "Day Rate",
    "Pay",
  ];
  lines.push(headers.map(escapeCSV).join(","));

  // Data rows
  for (const row of model.rows) {
    const rowData = [
      row.label,
      ...row.present.map((p) => (p ? "1" : "0")),
      row.daysWorked.toString(),
      row.dayRate?.toString() ?? "",
      row.pay.toFixed(2),
    ];
    lines.push(rowData.map(escapeCSV).join(","));
  }

  // Totals
  lines.push(""); // Empty line
  const totals = model.totals;
  lines.push(`Foreman Total Days,${totals.foremanDays}`);
  lines.push(`Foreman Total Pay,${totals.foremanPay.toFixed(2)}`);
  lines.push(`Team Total Days,${totals.teamDays}`);
  lines.push(`Team Total Pay,${totals.teamPay.toFixed(2)}`);
  lines.push(`Grand Total Days,${totals.totalDays}`);
  lines.push(`Grand Total Pay,${totals.totalPay.toFixed(2)}`);

  return lines.join("\n");
}

/**
 * Download timesheet as CSV file
 */
export function downloadTimesheetCSV(
  model: TimesheetGridModel,
  meta?: TimesheetExportMeta,
  filename?: string,
): void {
  const csv = generateTimesheetCSV(model, meta);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const defaultFilename = `timesheet_${meta?.startDate ?? "export"}.csv`;
  const link = document.createElement("a");
  link.href = url;
  link.download = filename ?? defaultFilename;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Generate printable HTML for timesheet
 */
export function generateTimesheetPrintHTML(
  model: TimesheetGridModel,
  meta?: TimesheetExportMeta,
): string {
  const formatCurrency = (n: number) =>
    `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Build main table
  const tableHeaders = `
    <tr>
      <th class="name-col">Full Name</th>
      ${model.columns.map((c) => `<th class="day-col">${c.dayLabel}<br/>${c.dateLabel}</th>`).join("")}
      <th class="num-col">Days</th>
      <th class="num-col">Rate</th>
      <th class="num-col">Pay</th>
    </tr>
  `;

  const tableRows = model.rows
    .map((row) => {
      const isForeman = row.isForeman;
      const rowClass = isForeman ? "foreman-row" : "";
      return `
      <tr class="${rowClass}">
        <td class="name-col">${escapeHTML(row.label)}${isForeman ? " <em>(Foreman)</em>" : ""}</td>
        ${row.present.map((p) => `<td class="day-col ${p ? "present" : "absent"}">${p ? "✓" : ""}</td>`).join("")}
        <td class="num-col">${row.daysWorked}</td>
        <td class="num-col">${row.dayRate ? formatCurrency(row.dayRate) : "—"}</td>
        <td class="num-col">${formatCurrency(row.pay)}</td>
      </tr>
    `;
    })
    .join("");

  const totals = model.totals;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Timesheet - ${meta?.startDate ?? "Export"}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          font-size: 12px; 
          color: #27272a;
          background: #fafafa;
          min-height: 100vh;
        }
        
        /* Titlebar */
        .titlebar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 48px;
          background: linear-gradient(to bottom, #ffffff, #f4f4f5);
          border-bottom: 1px solid #e4e4e7;
          padding: 0 16px;
          -webkit-app-region: drag;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .titlebar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .titlebar-logo {
          height: 28px;
          width: auto;
        }
        .titlebar-title {
          font-size: 14px;
          font-weight: 600;
          color: #18181b;
        }
        .titlebar-controls {
          display: flex;
          gap: 0;
          -webkit-app-region: no-drag;
        }
        .titlebar-btn {
          width: 46px;
          height: 32px;
          border: none;
          background: transparent;
          color: #71717a;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          font-size: 16px;
        }
        .titlebar-btn:hover {
          background: #e4e4e7;
          color: #18181b;
        }
        .titlebar-btn.close:hover {
          background: #dc2626;
          color: white;
        }
        
        /* Content */
        .content {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        h1 { 
          font-size: 24px; 
          font-weight: 700;
          color: #18181b;
          margin-bottom: 4px;
        }
        .subtitle {
          font-size: 13px;
          color: #71717a;
        }
        .actions {
          display: flex;
          gap: 8px;
        }
        .btn {
          padding: 8px 16px;
          border-radius: 0;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid #e4e4e7;
          background: white;
          color: #18181b;
        }
        .btn:hover {
          background: #f4f4f5;
          border-color: #d4d4d8;
        }
        .btn-primary {
          background: #16a34a;
          border-color: #16a34a;
          color: white;
        }
        .btn-primary:hover {
          background: #15803d;
          border-color: #15803d;
        }
        
        /* Meta info cards */
        .meta-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        .meta-card {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 0;
          padding: 12px 16px;
        }
        .meta-card-label {
          font-size: 11px;
          text-transform: uppercase;
          color: #71717a;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .meta-card-value {
          font-size: 14px;
          font-weight: 500;
          color: #18181b;
        }
        
        /* Table */
        .table-container {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 0;
          overflow: hidden;
          margin-bottom: 20px;
        }
        table.main-table { 
          width: 100%; 
          border-collapse: collapse;
        }
        .main-table th, .main-table td { 
          border: 1px solid #e4e4e7;
          padding: 10px 12px; 
          text-align: center;
          font-size: 12px;
        }
        .main-table th { 
          background: #f4f4f5; 
          font-weight: 600;
          color: #52525b;
          text-transform: uppercase;
          font-size: 11px;
        }
        .main-table .name-col { 
          text-align: left; 
          min-width: 180px;
          font-weight: 500;
        }
        .main-table .day-col { 
          width: 40px;
          padding: 8px 4px;
        }
        .main-table .num-col { 
          text-align: right; 
          min-width: 80px;
        }
        .main-table .present { 
          background: #dcfce7; 
          color: #166534;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .main-table .absent { 
          background-color: #fef2f2;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cline x1='85' y1='15' x2='15' y2='85' stroke='%23dc2626' stroke-width='6'/%3E%3C/svg%3E");
          background-size: 100% 100%;
          background-repeat: no-repeat;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .main-table .foreman-row { 
          background: #f4f4f5; 
        }
        .main-table .foreman-row td.absent {
          background-color: #fef2f2;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cline x1='85' y1='15' x2='15' y2='85' stroke='%23dc2626' stroke-width='6'/%3E%3C/svg%3E");
          background-size: 100% 100%;
          background-repeat: no-repeat;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .main-table .foreman-row .name-col {
          font-weight: 600;
        }
        .main-table tbody tr:hover {
          background: #fafafa;
        }
        .main-table tbody tr.foreman-row:hover {
          background: #e4e4e7;
        }
        
        /* Totals */
        .totals-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .totals-card {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 0;
          padding: 16px;
        }
        .totals-card.grand {
          background: #18181b;
          border-color: #18181b;
        }
        .totals-card.grand .totals-label,
        .totals-card.grand .totals-value {
          color: white;
        }
        .totals-label {
          font-size: 11px;
          text-transform: uppercase;
          color: #71717a;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .totals-value {
          font-size: 14px;
          font-weight: 600;
          color: #18181b;
        }
        
        @media print {
          body { background: white; }
          .titlebar { display: none; }
          .content { padding: 0; max-width: none; }
          .actions { display: none; }
          .meta-card, .table-container, .totals-card { 
            border: 1px solid #ccc; 
            box-shadow: none;
          }
          .main-table th, .main-table td {
            padding: 6px 8px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .main-table .present,
          .main-table .absent {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="titlebar">
        <div class="titlebar-left">
          <img src="./logo2.png" alt="Logo" class="titlebar-logo" onerror="this.style.display='none'"/>
          <span class="titlebar-title">Timesheet Report</span>
        </div>
        <div class="titlebar-controls">
          <button class="titlebar-btn" id="min-btn" title="Minimize">─</button>
          <button class="titlebar-btn" id="max-btn" title="Maximize">□</button>
          <button class="titlebar-btn close" id="close-btn" title="Close">✕</button>
        </div>
      </div>
      
      <div class="content">
        <div class="header">
          <div>
            <h1>Timesheet Report</h1>
            <p class="subtitle">${meta?.startDate && meta?.endDate ? `${meta.startDate} to ${meta.endDate}` : "Export"}</p>
          </div>
          <div class="actions">
            <button class="btn btn-primary" id="print-btn">
              Print
            </button>
            <button class="btn" id="action-close-btn">
              Close
            </button>
          </div>
        </div>
        
        <div class="meta-cards">
          ${meta?.foremanName ? `<div class="meta-card"><div class="meta-card-label">Foreman</div><div class="meta-card-value">${escapeHTML(meta.foremanName)}</div></div>` : ""}
          ${meta?.contractManagerName ? `<div class="meta-card"><div class="meta-card-label">Contract Manager</div><div class="meta-card-value">${escapeHTML(meta.contractManagerName)}</div></div>` : ""}
          ${meta?.sites?.length ? `<div class="meta-card"><div class="meta-card-label">Sites</div><div class="meta-card-value">${escapeHTML(meta.sites.map((s) => [s.code, s.name].filter(Boolean).join(" - ")).join(", "))}</div></div>` : ""}
          ${meta?.status ? `<div class="meta-card"><div class="meta-card-label">Status</div><div class="meta-card-value">${escapeHTML(meta.status)}</div></div>` : ""}
        </div>
        
        <div class="table-container">
          <table class="main-table">
            <thead>${tableHeaders}</thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
        
        <div class="totals-grid">
          <div class="totals-card">
            <div class="totals-label">Foreman</div>
            <div class="totals-row"><span>Days</span><span class="totals-value">${totals.foremanDays}</span></div>
            <div class="totals-row"><span>Pay</span><span class="totals-value">${formatCurrency(totals.foremanPay)}</span></div>
          </div>
          <div class="totals-card">
            <div class="totals-label">Team</div>
            <div class="totals-row"><span>Days</span><span class="totals-value">${totals.teamDays}</span></div>
            <div class="totals-row"><span>Pay</span><span class="totals-value">${formatCurrency(totals.teamPay)}</span></div>
          </div>
          <div class="totals-card grand">
            <div class="totals-label">Grand Total</div>
            <div class="totals-row"><span>Days</span><span class="totals-value">${totals.totalDays}</span></div>
            <div class="totals-row"><span>Pay</span><span class="totals-value">${formatCurrency(totals.totalPay)}</span></div>
          </div>
        </div>
      </div>
      
      <script>
        // Wire up window controls to Electron IPC
        document.getElementById('min-btn').addEventListener('click', function() {
          if (window.electron && window.electron.send) {
            window.electron.send('window-minimize');
          }
        });
        document.getElementById('max-btn').addEventListener('click', function() {
          if (window.electron && window.electron.send) {
            window.electron.send('window-maximize');
          }
        });
        document.getElementById('close-btn').addEventListener('click', function() {
          if (window.electron && window.electron.send) {
            window.electron.send('window-close');
          } else {
            window.close();
          }
        });
        document.getElementById('action-close-btn').addEventListener('click', function() {
          if (window.electron && window.electron.send) {
            window.electron.send('window-close');
          } else {
            window.close();
          }
        });
        document.getElementById('print-btn').addEventListener('click', function() {
          if (window.electron && window.electron.print) {
            window.electron.print();
          } else {
            window.print();
          }
        });
      </script>
    </body>
    </html>
  `;
}

/**
 * Open print preview in new window
 */
export function printTimesheet(
  model: TimesheetGridModel,
  meta?: TimesheetExportMeta,
): void {
  const html = generateTimesheetPrintHTML(model, meta);
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    // Auto-trigger print after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

// Helper functions
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
