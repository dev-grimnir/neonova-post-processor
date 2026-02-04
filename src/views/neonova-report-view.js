class NeonovaReportView {
    constructor(username, friendlyName, metrics, numEntries, longDisconnects) {
        this.username = username;
        this.friendlyName = friendlyName;
        this.metrics = metrics;
        this.numEntries = numEntries;
        this.longDisconnects = longDisconnects;
    }

    // Show only the WORST 200 long disconnects in the table (still plenty useful)
    // Full list stays available in CSV export
    generateLongDisconnectsHTML() {
        if (this.longDisconnects.length === 0) {
            return '<p style="font-style:italic; color:#666;">No disconnects longer than 30 minutes.</p>';
        }
    
        // Limit to top 200 longest (already sorted worst-first by analyzer)
        const displayed = this.longDisconnects.slice(0, 200);
    
        let html = `
            <div id="longDisconnectsContainer" style="display:block; margin-top:20px;">
                <p style="font-size:14px; color:#666; margin-bottom:10px;">
                    Showing ${displayed.length} longest disconnects (of ${this.longDisconnects.length} total)
                </p>
                <table style="width:100%; font-size:16px; border-collapse:collapse;">
                    <tr style="background:#fcc;">
                        <th style="padding:12px; text-align:left;">Disconnected At</th>
                        <th style="padding:12px; text-align:left;">Reconnected At</th>
                        <th style="padding:12px; text-align:right;">Duration</th>
                    </tr>`;
    
        displayed.forEach(ld => {
            const durationStr = formatDuration(ld.durationSec);
            html += `
                <tr style="background:#fee;">
                    <td style="padding:12px;">${ld.stopDate.toLocaleString()}</td>
                    <td style="padding:12px;">${ld.startDate.toLocaleString()}</td>
                    <td style="padding:12px; text-align:right;"><b>${durationStr}</b></td>
                </tr>`;
        });
    
        html += `</table></div>`;
        return html;
    }

    generateLongDisconnSection() {
        if (this.longDisconnects.length > 0) {
            return `
                <div class="collapsible-header" id="longDisconnectsHeader" onclick="toggleLongDisconnects()">
                    Long Disconnects (>30 minutes): ${this.longDisconnects.length} — click to collapse
                </div>
                ${this.generateLongDisconnectsHTML()}
            `;
        }
        return '<p style="font-style:italic; color:#666;">No disconnects longer than 30 minutes.</p>';
    }

    // CSV still includes ALL disconnects (fast enough once we avoid the huge HTML table)
    generateCsvContent() {
        let csv = 'Metric,Value\n';
        csv += `Total Disconnects,${this.metrics.disconnects || 0}\n`;
        csv += `Average Session Duration,${this.metrics.avgSessionMin ? formatDuration(this.metrics.avgSessionMin * 60) : 'N/A'}\n`;
        csv += `Average Reconnect Time,${this.metrics.avgReconnectMin ? formatDuration(this.metrics.avgReconnectMin * 60) : 'N/A'}\n`;
        csv += `Percent Connected,${Number(this.metrics.percentConnected || 0).toFixed(1)}%\n`;
        csv += `Business Hours Disconnects,${this.metrics.businessDisconnects || 0}\n`;
        csv += `Off-Hours Disconnects,${this.metrics.offHoursDisconnects || 0}\n`;
        csv += `Time Since Last Disconnect,${this.metrics.timeSinceLastStr || 'N/A'}\n`;
        csv += `Peak Disconnect Hour,${this.metrics.peakHourStr || 'None'}\n`;
        csv += `Peak Disconnect Day,${this.metrics.peakDayStr || 'None'}\n`;
        csv += `Longest Session,${this.metrics.longestSessionMin ? formatDuration(this.metrics.longestSessionMin * 60) : 'N/A'}\n`;
        csv += `Shortest Session,${this.metrics.shortestSessionMin ? formatDuration(this.metrics.shortestSessionMin * 60) : 'N/A'}\n`;
    
        csv += '\nLong Disconnects\nDisconnected At,Reconnected At,Duration\n';
        this.longDisconnects.forEach(ld => {
            csv += `${ld.stopDate.toLocaleString()},${ld.startDate.toLocaleString()},${formatDuration(ld.durationSec)}\n`;
        });
        return csv;
    }

    generateReportHTML() {
        const meanStabilityScore = Number(Math.max(0, Math.min(100, this.metrics.rawMeanScore || 0)).toFixed(1));
        const medianStabilityScore = Number(Math.max(0, Math.min(100, this.metrics.rawMedianScore || 0)).toFixed(1));
    
        // === LONG DISCONNECTS SECTION (now correctly computed) ===
        const longDisconnSection = this.generateLongDisconnSection ? this.generateLongDisconnSection() : '';
    
        // === CHART DATA (serialize once, safely) ===
        const hourlyData = JSON.stringify(this.metrics.hourlyDisconnects || Array(24).fill(0));
        const dailyLabels = JSON.stringify(this.metrics.dailyLabels || []);
        const dailyData = JSON.stringify(this.metrics.dailyDisconnects || []);
        const rollingLabels = JSON.stringify(this.metrics.rollingLabels || []);
        const rollingData = JSON.stringify(this.metrics.rolling7Day || []);
    
        // === CSV (safe escaping) ===
        const csvContent = this.generateCsvContent();
    
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>RADIUS Connection Report for ${this.username}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9; color: #333; }
                    h1, h2, h3 { text-align: center; color: #444; }
                    .scores-container { display: flex; justify-content: space-around; margin: 20px 0; }
                    .score { text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 8px; width: 200px; background: #fff; position: relative; }
                    .score-value { font-size: 48px; font-weight: bold; color: #4caf50; cursor: help; position: relative; }
                    .tooltiptext { visibility: hidden; width: 400px; background-color: #555; color: #fff; text-align: left; border-radius: 6px; padding: 10px; position: absolute; z-index: 1; top: 100%; left: 50%; margin-left: -200px; opacity: 0; transition: opacity 0.3s; font-size: 12px; }
                    .score-value:hover .tooltiptext { visibility: visible; opacity: 1; }
                    .chart-section { margin: 40px 0; position: relative; width: 100%; height: 400px; max-width: 1000px; margin: 40px auto; background: #f8f9fa; overflow: hidden; box-sizing: border-box; }
                    .chart-section canvas { width: 100% !important; height: 100% !important; display: block; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #fff; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background: #f2f2f2; }
                    .export-buttons { text-align: center; margin: 20px 0; }
                    .export-buttons button { margin: 0 10px; padding: 10px 20px; background: #4caf50; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
                    .export-buttons button:hover { background: #45a049; }
                    details summary { cursor: pointer; font-weight: bold; color: #4caf50; }
                </style>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
            </head>
            <body>
                <h1>RADIUS Connection Report for ${this.friendlyName || this.username || 'Unknown'}</h1>
                <h3>Monitoring period: ${this.metrics.monitoringPeriod || 'N/A'} (${Number(this.metrics.daysSpanned || 0).toFixed(1)} days spanned)</h3>
    
                <!-- Scores -->
                <div class="scores-container">
                    <div class="score">
                        <div class="score-value">${meanStabilityScore}/100<span class="tooltiptext">...your tooltip text...</span></div>
                        <p>Mean Stability Score</p>
                    </div>
                    <div class="score">
                        <div class="score-value">${medianStabilityScore}/100<span class="tooltiptext">...your tooltip text...</span></div>
                        <p>Median Stability Score</p>
                    </div>
                </div>
    
                <!-- Key Statistics Table (unchanged) -->
                <h2>Key Statistics</h2>
                <table>
                    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
                    <tbody>
                        <!-- your existing rows -->
                        <tr><td>Total Disconnects</td><td>${this.metrics.disconnects || 0}</td></tr>
                        <!-- ... rest of your table rows ... -->
                    </tbody>
                </table>
    
                <!-- Charts -->
                <div class="chart-section"><h2>Disconnects by Hour of Day</h2><canvas id="hourlyChart"></canvas></div>
                <div class="chart-section"><h2>Disconnects by Day</h2><canvas id="dailyChart"></canvas></div>
                <div class="chart-section"><h2>Rolling 7-Day Disconnects</h2><canvas id="rollingChart"></canvas></div>
    
                <!-- LONG DISCONNECTS TABLE (now actually inserted) -->
                ${longDisconnSection}
    
                <!-- Export Buttons -->
                <div class="export-buttons">
                    <button onclick="exportToHTML()">Export HTML</button>
                    <button onclick="exportToCSV()">Export CSV</button>
                    <button onclick="exportToPDF()">Export PDF</button>
                </div>
    
                <script>
                    // Charts – data is now safely injected
                    new Chart(document.getElementById('hourlyChart'), {
                        type: 'bar',
                        data: { labels: Array.from({length: 24}, (_, i) => \`\${i}:00\`), datasets: [{ label: 'Disconnects', data: ${hourlyData}, backgroundColor: 'rgba(255, 99, 132, 0.6)' }] },
                        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
                    });
    
                    new Chart(document.getElementById('dailyChart'), {
                        type: 'bar',
                        data: { labels: ${dailyLabels}, datasets: [{ label: 'Disconnects', data: ${dailyData}, backgroundColor: 'rgba(54, 162, 235, 0.6)' }] },
                        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
                    });
    
                    new Chart(document.getElementById('rollingChart'), {
                        type: 'line',
                        data: { labels: ${rollingLabels}, datasets: [{ label: '7-Day Rolling Disconnects', data: ${rollingData}, borderColor: 'rgba(75, 192, 192, 1)', fill: false }] },
                        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
                    });
    
                    const csvContent = \`${csvContent.replace(/`/g, '\\`')}\`;
    
                    function exportToHTML() { /* your existing function */ }
                    function exportToCSV() { /* your existing function */ }
                    async function exportToPDF() { /* your existing function */ }
                </script>
            </body>
            </html>`;
    }
}
