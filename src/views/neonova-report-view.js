/**
 * @file src/views/neonova-report-view.js
 * @requires ../core/utils
 */
class NeonovaReportView {
    constructor(metrics, pages, longDisconnects) {
        this.metrics = metrics;
        this.pages = pages;
        this.longDisconnects = longDisconnects;
    }

    generateLongDisconnectsHTML() {
        if (this.longDisconnects.length === 0) {
            return '<p style="font-style:italic; color:#666;">No disconnects longer than 30 minutes.</p>';
        }
        let html = `
            <div id="longDisconnectsContainer" style="display:block; margin-top:20px;">
                <table style="width:100%; font-size:16px; border-collapse:collapse;">
                    <tr style="background:#fcc;">
                        <th style="padding:12px; text-align:left;">Disconnected At</th>
                        <th style="padding:12px; text-align:left;">Reconnected At</th>
                        <th style="padding:12px; text-align:right;">Duration</th>
                    </tr>`;
        this.longDisconnects.forEach(ld => {
            const durationStr = formatDuration(ld.durationSec);
            html += `
                <tr style="background:#fee;">
                    <td style="padding:12px;">${ld.stopDate.toLocaleString()}</td>
                    <td style="padding:12px;">${ld.startDate.toLocaleString()}</td>
                    <td style="padding:12px; text-align:right;"><b>${durationStr}</b></td>
                </tr>`;
        });
        html += `
                </table>
            </div>`;
        return html;
    }

    generateLongDisconnSection() {
    if (this.longDisconnects.length === 0) {
        return '<p style="font-style:italic; color:#666; text-align:center;">No disconnects longer than 30 minutes.</p>';
    }

    let html = `
        <div class="collapsible-header" id="longDisconnectsHeader" onclick="toggleLongDisconnects()">
            Long Disconnects (>30 minutes): ${this.longDisconnects.length} — click to collapse
        </div>
        <div id="longDisconnectsContainer" style="display:block; margin-top:10px;">
            <table style="width:100%; font-size:14px; border-collapse:collapse;">
                <tr style="background:#fcc;">
                    <th style="padding:10px; text-align:left;">Disconnected At</th>
                    <th style="padding:10px; text-align:left;">Reconnected At</th>
                    <th style="padding:10px; text-align:right;">Duration</th>
                </tr>`;

    this.longDisconnects.forEach(ld => {
        const durationStr = formatDuration(ld.durationSec);
        html += `
            <tr style="background:#fee;">
                <td style="padding:10px;">${ld.stopDate.toLocaleString()}</td>
                <td style="padding:10px;">${ld.startDate.toLocaleString()}</td>
                <td style="padding:10px; text-align:right;"><b>${durationStr}</b></td>
            </tr>`;
    });

    html += `</table></div>`;
    return html;
}

generateReportHTML(csvContent) {
    const { meanStabilityScore, medianStabilityScore } = this.metrics || {};

    const meanClass = (meanStabilityScore ?? 0) >= 80 ? 'score-good' : (meanStabilityScore ?? 0) >= 50 ? 'score-fair' : 'score-poor';
    const medianClass = (medianStabilityScore ?? 0) >= 80 ? 'score-good' : (medianStabilityScore ?? 0) >= 50 ? 'score-fair' : 'score-poor';

    // Safe defaults for any potentially undefined arrays
    const safeHourlyDisconnects = this.metrics?.hourlyDisconnects ?? Array(24).fill(0);
    const safeDailyDisconnects = this.metrics?.dailyDisconnects ?? Array(7).fill(0);
    const safeRollingLabels = this.metrics?.rollingLabels ?? [];
    const safeRolling7Day = this.metrics?.rolling7Day ?? [];
    const safeSessionBins = this.metrics?.sessionBins ?? [0, 0, 0, 0, 0];
    const safeReconnectBins = this.metrics?.reconnectBins ?? [0, 0, 0, 0];

    const safeRawEntries = this.metrics?.allEntriesLength ?? (this.metrics?.cleanedEntriesLength ?? 0);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>NovaSubscriber Session Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f0fff0; }
        .container { max-width: 1200px; margin: 30px auto; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
        h1 { text-align: center; color: #006400; font-size: 38px; margin-bottom: 8px; }
        .stability-score { 
            font-size: 24px;          /* Smaller font as requested */
            font-weight: bold;
            text-align: center;
            margin: 12px 0;           /* Reduced margin */
            cursor: help; 
            position: relative; 
        }
        .score-good { color: #006400; }
        .score-fair { color: #ff8c00; }
        .score-poor { color: #c00; }
        .tooltip { 
            visibility: hidden; width: 480px; background: #333; color: #fff; 
            text-align: left; border-radius: 6px; padding: 14px; position: absolute; 
            z-index: 1; top: 100%; left: 50%; margin-left: -240px; opacity: 0; 
            transition: opacity 0.3s; font-size: 13px; line-height: 1.4; 
        }
        .stability-score:hover .tooltip { visibility: visible; opacity: 1; }
        .tooltip strong { color: #4fc3f7; }
        .tooltip .formula { font-style: italic; color: #ffeb3b; margin: 6px 0; display: block; }
        .collapsible-header { 
            cursor: pointer; background: #ffebee; padding: 10px; margin: 15px 0 0 0; 
            border-radius: 6px; font-weight: bold; color: #c62828; text-align: center; 
            border: 1px solid #ef9a9a; 
        }
        .collapsible-header:hover { background: #ffcdd2; }
        canvas { max-width: 100%; margin-bottom: 30px; }
        table { width: 100%; font-size: 16px; border-collapse: collapse; margin-top: 30px; }
        td { padding: 14px; }
        button.export-btn { padding: 10px 20px; margin: 8px; font-size: 16px; background: #006400; color: white; border: none; border-radius: 6px; cursor: pointer; }
        button.export-btn:hover { background: #008000; }
        @media print { #longDisconnectsContainer { display: block !important; } }
    </style>
</head>
<body>
    <div class="container">
        <h1>Session Report Complete</h1>

        <div class="stability-score ${meanClass}">
            Stability Score (Mean-Based): ${meanStabilityScore ?? 0}/100
            <span class="tooltip">
                <strong>Mean-based (sensitive to short sessions):</strong><br><br>
                Uptime: ${(this.metrics?.uptimeComponent ?? 0).toFixed(1)}<br>
                Session bonus: ${(this.metrics?.sessionBonusMean ?? 0).toFixed(1)}<br>
                Fast recoveries: ${(this.metrics?.totalFastBonus ?? 0).toFixed(1)}<br>
                Flapping penalty: -${(this.metrics?.flappingPenalty ?? 0).toFixed(1)}<br>
                Long outage penalty: -${(this.metrics?.longOutagePenalty ?? 0).toFixed(1)}<br>
                Raw: ${(this.metrics?.rawMeanScore ?? 0).toFixed(1)}
            </span>
        </div>

        <div class="stability-score ${medianClass}">
            Stability Score (Median-Based): ${medianStabilityScore ?? 0}/100
            <span class="tooltip">
                <strong>Median-based (resistant to outliers):</strong><br><br>
                Uptime: ${(this.metrics?.uptimeComponent ?? 0).toFixed(1)}<br>
                Session bonus: ${(this.metrics?.sessionBonusMedian ?? 0).toFixed(1)}<br>
                Fast recoveries: ${(this.metrics?.totalFastBonus ?? 0).toFixed(1)}<br>
                Flapping penalty: -${(this.metrics?.flappingPenalty ?? 0).toFixed(1)}<br>
                Long outage penalty: -${(this.metrics?.longOutagePenalty ?? 0).toFixed(1)}<br>
                Raw: ${(this.metrics?.rawMedianScore ?? 0).toFixed(1)}
            </span>
        </div>

        <h2 style="text-align:center; color:#555; margin:15px 0;">
            ${this.pages ?? 0} pages | ${safeRawEntries} raw records (${this.metrics?.cleanedEntriesLength ?? 0} after de-duplication)
        </h2>

        <h3 style="text-align:center; color:#777; margin-bottom:20px;">
            Monitoring period: ${this.metrics?.monitoringPeriod ?? 'N/A'} (${(this.metrics?.daysSpanned ?? 0).toFixed(1)} days)
        </h3>

        <div style="background:white; padding:15px; border-radius:8px; margin-bottom:30px;">
            <canvas id="hourlyChart" height="110"></canvas>
        </div>

        <div style="background:white; padding:15px; border-radius:8px; margin-bottom:30px;">
            <canvas id="dailyChart" height="110"></canvas>
        </div>

        <div style="background:white; padding:15px; border-radius:8px; margin-bottom:30px;">
            <canvas id="rolling7DayChart" height="110"></canvas>
        </div>

        <div style="background:white; padding:15px; border-radius:8px; margin-bottom:30px;">
            <canvas id="sessionHist" height="110"></canvas>
        </div>

        <div style="background:white; padding:15px; border-radius:8px; margin-bottom:30px;">
            <canvas id="reconnectHist" height="110"></canvas>
        </div>

        ${this.generateLongDisconnSection()}

        <table style="width:100%; font-size:16px; border-collapse:collapse; margin-top:30px;">
            <tr><td style="padding:14px; background:#e8f5e8; font-weight:bold;">Number of Sessions</td><td style="padding:14px; text-align:right;"><b>${this.metrics?.numSessions ?? 0}</b></td></tr>
            <tr><td style="padding:14px; background:#f0f8f0; font-weight:bold;">Number of Disconnects</td><td style="padding:14px; text-align:right;"><b>${this.metrics?.disconnects ?? 0}</b></td></tr>
            <tr><td style="padding:14px; background:#e8f5e8; font-weight:bold;">Reconnects Within 5 Minutes</td><td style="padding:14px; text-align:right;"><b>${this.metrics?.quickReconnects ?? 0}</b></td></tr>
            <tr><td style="padding:14px; background:#e8f5e8; font-weight:bold;">Longest Continuous Connected</td><td style="padding:14px; text-align:right;"><b>${formatDuration((this.metrics?.longestSessionMin ?? 0) * 60)}</b></td></tr>
            <tr><td style="padding:14px; background:#f0f8f0; font-weight:bold;">Shortest Session Length</td><td style="padding:14px; text-align:right;"><b>${this.metrics?.shortestSessionMin === 'N/A' ? 'N/A' : formatDuration((this.metrics?.shortestSessionMin ?? 0) * 60)}</b></td></tr>
            <tr><td style="padding:14px; background:#e8f5e8; font-weight:bold;">Average Session Length</td><td style="padding:14px; text-align:right;"><b>${formatDuration((this.metrics?.avgSessionMin ?? 0) * 60)}</b></td></tr>
            <tr><td style="padding:14px; background:#f0f8f0; font-weight:bold;">95th Percentile Reconnect Time</td><td style="padding:14px; text-align:right;"><b>${this.metrics?.p95ReconnectMin ?? 'N/A'} minutes</b></td></tr>
            <tr><td style="padding:14px; background:#e8f5e8; font-weight:bold;">Average Time to Reconnect</td><td style="padding:14px; text-align:right;"><b>${this.metrics?.avgReconnectMin ?? 'N/A'} minutes</b></td></tr>
            <tr><td style="padding:14px; background:#f0f8f0; font-weight:bold;">Median Time to Reconnect</td><td style="padding:14px; text-align:right;"><b>${this.metrics?.medianReconnectMin ?? 'N/A'} minutes</b></td></tr>
            <tr><td style="padding:14px; background:#e8f5e8; font-weight:bold;">Peak Disconnect Hour</td><td style="padding:14px; text-align:right;"><b>${this.metrics?.peakHourStr ?? 'N/A'}</b></td></tr>
            <tr><td style="padding:14px; background:#f0f8f0; font-weight:bold;">Peak Disconnect Day</td><td style="padding:14px; text-align:right;"><b>${this.metrics?.peakDayStr ?? 'N/A'}</b></td></tr>
            <tr><td style="padding:14px; background:#e8f5e8; font-weight:bold;">Disconnects (Business Hours 8AM-6PM)</td><td style="padding:14px; text-align:right;"><b>${this.metrics?.businessDisconnects ?? 0}</b></td></tr>
            <tr><td style="padding:14px; background:#f0f8f0; font-weight:bold;">Disconnects (Off-Hours)</td><td style="padding:14px; text-align:right;"><b>${this.metrics?.offHoursDisconnects ?? 0}</b></td></tr>
            <tr><td style="padding:14px; background:#e8f5e8; font-weight:bold;">Time Since Last Disconnect</td><td style="padding:14px; text-align:right;"><b>${this.metrics?.timeSinceLastStr ?? 'N/A'}</b></td></tr>
        </table>

        <div style="text-align:center; margin-top:30px;">
            <button class="export-btn" onclick="exportToCSV()">Export CSV</button>
            <button class="export-btn" onclick="exportToHTML()">Export HTML</button>
            <button class="export-btn" onclick="exportToPDF()">Export PDF</button>
        </div>
    </div>

    <script>
        // Toggle function for long disconnects
        function toggleLongDisconnects() {
            const container = document.getElementById('longDisconnectsContainer');
            if (!container) return;
            const isHidden = container.style.display === 'none';
            container.style.display = isHidden ? 'block' : 'none';

            const header = document.getElementById('longDisconnectsHeader');
            if (header) {
                header.textContent = isHidden 
                    ? 'Long Disconnects (>30 minutes): ${this.longDisconnects.length} — click to collapse'
                    : 'Long Disconnects (>30 minutes): ${this.longDisconnects.length} — click to expand';
            }
        }

        // Start collapsed if many entries
        document.addEventListener('DOMContentLoaded', function() {
            if (${this.longDisconnects.length > 5}) {
                const container = document.getElementById('longDisconnectsContainer');
                if (container) container.style.display = 'none';
                const header = document.getElementById('longDisconnectsHeader');
                if (header) header.textContent = 'Long Disconnects (>30 minutes): ${this.longDisconnects.length} — click to expand';
            }
        });

        // Export functions (keep if you have them, or remove if not needed)
        function exportToCSV() { /* your CSV code */ }
        function exportToHTML() { /* your HTML code */ }
        function exportToPDF() { alert('PDF export coming soon'); }
    </script>
</body>
</html>`;
}

        // Export functions
        function exportToCSV() {
            const csv = ${JSON.stringify(csvContent)};
            const blob = new Blob([csv], {type: 'text/csv'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'nova_session_report.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function exportToHTML() {
            const html = document.documentElement.outerHTML;
            const blob = new Blob([html], {type: 'text/html'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'nova_session_report.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function exportToPDF() {
            alert('PDF export not implemented yet. You can use browser print-to-PDF or add jsPDF library.');
        }
    </script>
</body>
</html>`;
}

    openReport(reportHTML) {
        const win = window.open('', '_blank');
        if (win) {
            win.document.open();
            win.document.write(reportHTML);
            win.document.close();
        } else {
            alert('Popup blocked. Please allow popups for admin.neonova.net and try again.');
        }
    }
}
