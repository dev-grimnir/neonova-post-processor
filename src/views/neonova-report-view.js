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

    // Defensive safe arrays for charts (prevents undefined crashes)
    const safeHourlyDisconnects = this.metrics?.hourlyDisconnects ?? Array(24).fill(0);
    const safeDailyDisconnects = this.metrics?.dailyDisconnects ?? Array(7).fill(0);
    const safeRollingLabels = this.metrics?.rollingLabels ?? [];
    const safeRolling7Day = this.metrics?.rolling7Day ?? [];
    const safeSessionBins = this.metrics?.sessionBins ?? [0, 0, 0, 0, 0];
    const safeReconnectBins = this.metrics?.reconnectBins ?? [0, 0, 0, 0];

    // Safe raw count fallback
    const safeRawEntries = this.metrics?.allEntriesLength ?? (this.metrics?.cleanedEntriesLength ?? 0);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>NovaSubscriber Session Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f0fff0; }
        .container { max-width: 1200px; margin: 40px auto; padding: 30px; background: white; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        h1 { text-align: center; color: #006400; font-size: 44px; margin-bottom: 10px; }
        .stability-score { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; cursor: help; position: relative; }
        .score-good { color: #006400; }
        .score-fair { color: #ff8c00; }
        .score-poor { color: #c00; }
        .tooltip { visibility: hidden; width: 520px; background: #333; color: #fff; text-align: left; border-radius: 6px; padding: 18px; position: absolute; z-index: 1; top: 100%; left: 50%; margin-left: -260px; opacity: 0; transition: opacity 0.3s; font-size: 15px; line-height: 1.5; }
        .stability-score:hover .tooltip { visibility: visible; opacity: 1; }
        .tooltip strong { color: #4fc3f7; }
        .tooltip .formula { font-style: italic; color: #ffeb3b; margin: 8px 0; display: block; }
        .collapsible-header { cursor: pointer; background: #ffebee; padding: 12px; margin: 20px 0 0 0; border-radius: 6px; font-weight: bold; color: #c62828; text-align: center; border: 1px solid #ef9a9a; }
        .collapsible-header:hover { background: #ffcdd2; }
        button.export-btn { padding: 12px 24px; margin: 10px; font-size: 18px; background: #006400; color: white; border: none; border-radius: 8px; cursor: pointer; }
        button.export-btn:hover { background: #008000; }
        canvas { max-width: 100%; }
        @media print { #longDisconnectsContainer { display: block !important; } }
    </style>
</head>
<script>
    function toggleLongDisconnects() {
        const container = document.getElementById('longDisconnectsContainer');
        if (container) {
            const isHidden = container.style.display === 'none';
            container.style.display = isHidden ? 'block' : 'none';
            
            // Update header text
            const header = document.getElementById('longDisconnectsHeader');
            if (header) {
                header.textContent = isHidden 
                    ? 'Long Disconnects (>30 minutes): ' + ${this.longDisconnects.length} — click to collapse'
                    : 'Long Disconnects (>30 minutes): ' + ${this.longDisconnects.length} — click to expand';
            }
        }
    }

    // Optional: Start collapsed if more than 5 entries
    document.addEventListener('DOMContentLoaded', function() {
        if (${this.longDisconnects.length > 5}) {
            const container = document.getElementById('longDisconnectsContainer');
            if (container) container.style.display = 'none';
            const header = document.getElementById('longDisconnectsHeader');
            if (header) header.textContent = 'Long Disconnects (>30 minutes): ' + ${this.longDisconnects.length} — click to expand';
        }
    });
</script>
<body>
    <div class="container">
        <h1>Session Report Complete</h1>

        <div class="stability-score ${meanClass}">
            Stability Score (Mean-Based): ${meanStabilityScore ?? 0}/100
            <span class="tooltip">
                <strong>Mean-based calculation (sensitive to frequent short sessions):</strong><br><br>
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
                <strong>Median-based calculation (resistant to outliers):</strong><br><br>
                Uptime: ${(this.metrics?.uptimeComponent ?? 0).toFixed(1)}<br>
                Session bonus: ${(this.metrics?.sessionBonusMedian ?? 0).toFixed(1)}<br>
                Fast recoveries: ${(this.metrics?.totalFastBonus ?? 0).toFixed(1)}<br>
                Flapping penalty: -${(this.metrics?.flappingPenalty ?? 0).toFixed(1)}<br>
                Long outage penalty: -${(this.metrics?.longOutagePenalty ?? 0).toFixed(1)}<br>
                Raw: ${(this.metrics?.rawMedianScore ?? 0).toFixed(1)}
            </span>
        </div>

        <h2 style="text-align:center; color:#555;">
            ${this.pages ?? 0} pages | ${safeRawEntries} raw records (${this.metrics?.cleanedEntriesLength ?? 0} after de-duplication)
        </h2>

        <h3 style="text-align:center; color:#777;">
            Monitoring period: ${this.metrics?.monitoringPeriod ?? 'N/A'} (${(this.metrics?.daysSpanned ?? 0).toFixed(1)} days)
        </h3>

        <div style="background:white; padding:20px; border-radius:10px; margin-bottom:40px;">
            <canvas id="hourlyChart" height="120"></canvas>
        </div>

        <div style="background:white; padding:20px; border-radius:10px; margin-bottom:40px;">
            <canvas id="dailyChart" height="120"></canvas>
        </div>

        <div style="background:white; padding:20px; border-radius:10px; margin-bottom:40px;">
            <canvas id="rolling7DayChart" height="120"></canvas>
        </div>

        <div style="background:white; padding:20px; border-radius:10px; margin-bottom:40px;">
            <canvas id="sessionHist" height="120"></canvas>
        </div>

        <div style="background:white; padding:20px; border-radius:10px; margin-bottom:40px;">
            <canvas id="reconnectHist" height="120"></canvas>
        </div>

        ${this.generateLongDisconnSection() ?? '<p style="text-align:center; color:#666;">No long disconnects found.</p>'}

        <table style="width:100%; font-size:18px; border-collapse:collapse; margin-top:40px;">
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Number of Sessions</td><td style="padding:18px; text-align:right;"><b>${this.metrics?.numSessions ?? 0}</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">Number of Disconnects</td><td style="padding:18px; text-align:right;"><b>${this.metrics?.disconnects ?? 0}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Reconnects Within 5 Minutes</td><td style="padding:18px; text-align:right;"><b>${this.metrics?.quickReconnects ?? 0}</b></td></tr>
            <tr><td ...>Longest Continuous Connected</td><td ...><b>${formatDuration((this.metrics?.longestSessionMin ?? 0) * 60)}</b></td></tr>
            <tr><td ...>Shortest Session Length</td><td ...><b>${this.metrics?.shortestSessionMin === 'N/A' ? 'N/A' : formatDuration((this.metrics?.shortestSessionMin ?? 0) * 60)}</b></td></tr>
            <tr><td ...>Average Session Length</td><td ...><b>${formatDuration((this.metrics?.avgSessionMin ?? 0) * 60)}</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">95th Percentile Reconnect Time</td><td style="padding:18px; text-align:right;"><b>${this.metrics?.p95ReconnectMin ?? 'N/A'} minutes</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Average Time to Reconnect</td><td style="padding:18px; text-align:right;"><b>${this.metrics?.avgReconnectMin ?? 'N/A'} minutes</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">Median Time to Reconnect</td><td style="padding:18px; text-align:right;"><b>${this.metrics?.medianReconnectMin ?? 'N/A'} minutes</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Peak Disconnect Hour</td><td style="padding:18px; text-align:right;"><b>${this.metrics?.peakHourStr ?? 'N/A'}</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">Peak Disconnect Day</td><td style="padding:18px; text-align:right;"><b>${this.metrics?.peakDayStr ?? 'N/A'}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Disconnects (Business Hours)</td><td style="padding:18px; text-align:right;"><b>${this.metrics?.businessDisconnects ?? 0}</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">Disconnects (Off-Hours)</td><td style="padding:18px; text-align:right;"><b>${this.metrics?.offHoursDisconnects ?? 0}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Time Since Last Disconnect</td><td style="padding:18px; text-align:right;"><b>${this.metrics?.timeSinceLastStr ?? 'N/A'}</b></td></tr>
        </table>

        <div style="text-align:center; margin-top:40px;">
            <button class="export-btn" onclick="exportToCSV()">Export CSV</button>
            <button class="export-btn" onclick="exportToHTML()">Export HTML</button>
            <button class="export-btn" onclick="exportToPDF()">Export PDF</button>
        </div>
    </div>

    <script>
        // Chart initialization
        document.addEventListener('DOMContentLoaded', function() {
            new Chart(document.getElementById('hourlyChart'), {
                type: 'bar',
                data: {
                    labels: ['00-01','01-02','02-03','03-04','04-05','05-06','06-07','07-08','08-09','09-10','10-11','11-12',
                             '12-13','13-14','14-15','15-16','16-17','17-18','18-19','19-20','20-21','21-22','22-23','23-00'],
                    datasets: [{ label: 'Disconnects per Hour', data: ${JSON.stringify(safeHourlyDisconnects)}, backgroundColor: 'rgba(255,99,132,0.6)' }]
                },
                options: { scales: { y: { beginAtZero: true } } }
            });

            new Chart(document.getElementById('dailyChart'), {
                type: 'bar',
                data: {
                    labels: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
                    datasets: [{ label: 'Disconnects per Day', data: ${JSON.stringify(safeDailyDisconnects)}, backgroundColor: 'rgba(54,162,235,0.6)' }]
                },
                options: { scales: { y: { beginAtZero: true } } }
            });

            new Chart(document.getElementById('rolling7DayChart'), {
                type: 'line',
                data: {
                    labels: ${JSON.stringify(safeRollingLabels)},
                    datasets: [{ label: 'Rolling 7-Day Disconnects', data: ${JSON.stringify(safeRolling7Day)}, borderColor: 'rgba(75,192,192,1)', fill: false }]
                },
                options: { scales: { y: { beginAtZero: true } } }
            });

            new Chart(document.getElementById('sessionHist'), {
                type: 'bar',
                data: {
                    labels: ['≤5min', '5-30min', '30-60min', '1-4h', '>4h'],
                    datasets: [{ label: 'Session Length Distribution', data: ${JSON.stringify(safeSessionBins)}, backgroundColor: 'rgba(153,102,255,0.6)' }]
                },
                options: { scales: { y: { beginAtZero: true } } }
            });

            new Chart(document.getElementById('reconnectHist'), {
                type: 'bar',
                data: {
                    labels: ['≤1min', '1-5min', '5-30min', '>30min'],
                    datasets: [{ label: 'Reconnect Time Distribution', data: ${JSON.stringify(safeReconnectBins)}, backgroundColor: 'rgba(255,159,64,0.6)' }]
                },
                options: { scales: { y: { beginAtZero: true } } }
            });
        });

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
