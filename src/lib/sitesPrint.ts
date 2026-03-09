/**
 * Sites Print Utility
 * - Print sites table to printer
 */

import type { SiteRow } from "@/components/sites/SitesTable";

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatCurrencyPrint(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateSitesPrintHTML(sites: SiteRow[]): string {
  const tableRows = sites
    .map((site) => {
      return `
        <tr>
          <td class="code-col">${escapeHTML(site.code ?? "\u2014")}</td>
          <td class="name-col">${escapeHTML(site.name)}</td>
          <td class="client-col">${escapeHTML(site.client ?? "\u2014")}</td>
          <td class="supervisor-col">${escapeHTML(site.supervisorName ?? "\u2014")}</td>
          <td class="wages-col">${formatCurrencyPrint(site.totalWages ?? 0)}</td>
          <td class="material-col">${formatCurrencyPrint(site.totalMaterialCost ?? 0)}</td>
          <td class="total-col">${formatCurrencyPrint((site.totalWages ?? 0) + (site.totalMaterialCost ?? 0))}</td>
          <td class="created-col">${formatDate(site.createdAt)}</td>
        </tr>
      `;
    })
    .join("");

  // Calculate totals
  const totalWagesSum = sites.reduce((sum, s) => sum + (s.totalWages ?? 0), 0);
  const totalMaterialSum = sites.reduce(
    (sum, s) => sum + (s.totalMaterialCost ?? 0),
    0,
  );
  const totalCostSum = totalWagesSum + totalMaterialSum;
  const activeSites = sites.filter((s) => s.isActive).length;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sites Report</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          font-size: 12px; 
          color: #27272a;
          background: #fafafa;
          min-height: 100vh;
        }
        
        .content {
          padding: 24px;
          max-width: 1400px;
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
          border-radius: 4px;
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
        
        /* Summary cards */
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .summary-card {
          background: white;
          border: 1px solid #e4e4e7;
          border-radius: 4px;
          padding: 16px;
        }
        .summary-label {
          font-size: 11px;
          text-transform: uppercase;
          color: #71717a;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .summary-value {
          font-size: 20px;
          font-weight: 700;
          color: #18181b;
        }
        
        /* Table */
        .table-container {
          background: white;
          border: 2px solid #52525b;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        table.main-table { 
          width: 100%; 
          border-collapse: collapse;
        }
        .main-table th, .main-table td { 
          border: 1px solid #d4d4d8;
          padding: 10px 12px; 
          text-align: left;
          font-size: 12px;
        }
        .main-table th { 
          background: #52525b; 
          font-weight: 600;
          color: white;
          text-transform: uppercase;
          font-size: 11px;
        }
        .main-table .code-col { 
          font-family: monospace;
          width: 90px;
        }
        .main-table .name-col { 
          font-weight: 500;
          min-width: 140px;
        }
        .main-table .client-col { 
          min-width: 120px;
        }
        .main-table .supervisor-col { 
          min-width: 120px;
        }
        .main-table .wages-col { 
          text-align: right;
          font-weight: 600;
          min-width: 100px;
        }
        .main-table .material-col { 
          text-align: right;
          font-weight: 600;
          min-width: 100px;
        }
        .main-table .total-col { 
          text-align: right;
          font-weight: 700;
          min-width: 100px;
        }
        .main-table .created-col { 
          width: 90px;
        }
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
        }
        .status-pill.active {
          background: #dcfce7;
          color: #166534;
        }
        .status-pill.inactive {
          background: #e4e4e7;
          color: #52525b;
        }
        .status-pill::before {
          content: '';
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .status-pill.active::before {
          background: #22c55e;
        }
        .status-pill.inactive::before {
          background: #a1a1aa;
        }
        .main-table tbody tr:nth-child(even) {
          background: #fafafa;
        }
        .main-table tbody tr:hover {
          background: #f4f4f5;
        }
        
        @media print {
          body { background: white; }
          .content { padding: 0; max-width: none; }
          .actions { display: none; }
          .summary-card, .table-container { 
            border: 1px solid #666; 
            box-shadow: none;
          }
          .main-table th, .main-table td {
            padding: 6px 8px;
            border: 1px solid #666;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .main-table th,
          .status-pill {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="content">
        <div class="header">
          <div>
            <h1>Sites Report</h1>
            <p class="subtitle">Generated: ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} • ${sites.length} site${sites.length === 1 ? "" : "s"}</p>
          </div>
          <div class="actions">
            <button class="btn btn-primary" id="print-btn">
              🖨️ Print
            </button>
            <button class="btn" id="close-btn">
              Close
            </button>
          </div>
        </div>
        
        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-label">Total Sites</div>
            <div class="summary-value">${sites.length}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Active Sites</div>
            <div class="summary-value">${activeSites}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Wages</div>
            <div class="summary-value">${formatCurrencyPrint(totalWagesSum)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Material Cost</div>
            <div class="summary-value">${formatCurrencyPrint(totalMaterialSum)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Total Cost</div>
            <div class="summary-value">${formatCurrencyPrint(totalCostSum)}</div>
          </div>
        </div>
        
        <div class="table-container">
          <table class="main-table">
            <thead>
              <tr>
                <th class="code-col">Job Number</th>
                <th class="name-col">Name</th>
                <th class="client-col">Client</th>
                <th class="supervisor-col">Supervisor</th>
                <th class="wages-col">Total Wages</th>
                <th class="material-col">Material Cost</th>
                <th class="total-col">Total Cost</th>
                <th class="created-col">Created</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>
      
      <script>
        document.getElementById('close-btn').addEventListener('click', function() {
          window.close();
        });
        document.getElementById('print-btn').addEventListener('click', function() {
          window.print();
        });
      </script>
    </body>
    </html>
  `;
}

/**
 * Open print preview in new window for sites
 */
export function printSites(sites: SiteRow[]): void {
  const html = generateSitesPrintHTML(sites);
  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }
}
