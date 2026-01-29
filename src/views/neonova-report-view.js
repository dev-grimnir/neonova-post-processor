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

generateReportHTML(csvContent) {
    // Calculate scores and sections
    const meanStabilityScore = Math.max(0, Math.min(100, this.metrics.rawMeanScore));
    const medianStabilityScore = Math.max(0, Math.min(100, this.metrics.rawMedianScore));
    const longDisconnSection = this.generateLongDisconnSection();

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>RADIUS Connection Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9; color: #333; }
                h1, h2, h3 { text-align: center; color: #444; }
                .scores-container { display: flex; justify-content: space-around; margin: 20px 0; }
                .score { text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 8px; width: 200px; background: #fff; }
                .score-value { font-size: 48px; font-weight: bold; color: #4caf50; }
                .tooltip { position: relative; display: inline-block; cursor: help; }
                .tooltip .tooltiptext { visibility: hidden; width: 300px; background-color: #555; color: #fff; text-align: left; border-radius: 6px; padding: 10px; position: absolute; z-index: 1; bottom: 125%; left: 50%; margin-left: -150px; opacity: 0; transition: opacity 0.3s; }
                .tooltip:hover .tooltiptext { visibility: visible; opacity: 1; }
                .chart-section { margin: 40px 0; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #fff; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #f2f2f2; }
                .export-buttons { text-align: center; margin: 20px 0; }
                .export-buttons button { margin: 0 10px; padding: 10px 20px; background: #4caf50; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
                .export-buttons button:hover { background: #45a049; }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>  <!-- Chart.js for graphs -->
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>  <!-- jsPDF for PDF export -->
        </head>
        <body>
            <h1>RADIUS Connection Report for ${this.metrics.username || 'Unknown'}</h1>
            <h3>Monitoring period: ${this.metrics.monitoringPeriod || 'N/A'} (${(this.metrics.daysSpanned || 0).toFixed(1)} days spanned)</h3>

            <!-- Stability Scores -->
            <div class="scores-container">
                <div class="score">
                    <div class="score-value">${meanStabilityScore}/100</div>
                    <p>Mean Stability Score</p>
                    <span class="tooltip">?
                        <span class="tooltiptext">
                            <strong>How this score is calculated (using average session length):</strong><br><br>
                            • Uptime component: ${(this.metrics.percentConnected || 0)}% * 0.6 = ${(this.metrics.uptimeComponent || 0).toFixed(1)}<br>
                            • Session quality bonus: ${(this.metrics.sessionBonusMean || 0).toFixed(1)}<br>
                            • Fast recovery bonus: ${(this.metrics.totalFastBonus || 0).toFixed(1)}<br>
                            • Flapping penalty: -${(this.metrics.flappingPenalty || 0).toFixed(1)}<br>
                            • Long outage penalty: -${(this.metrics.longOutagePenalty || 0).toFixed(1)}<br><br>
                            Raw score: ${(this.metrics.rawMeanScore || 0).toFixed(1)}<br>
                            Displayed score: ${meanStabilityScore}/100
                        </span>
                    </span>
                </div>
                <div class="score">
                    <div class="score-value">${medianStabilityScore}/100</div>
                    <p>Median Stability Score</p>
                    <span class="tooltip">?
                        <span class="tooltiptext">
                            <strong>How this score is calculated (using median session length):</strong><br><br>
                            • Uptime component: ${(this.metrics.percentConnected || 0)}% * 0.6 = ${(this.metrics.uptimeComponent || 0).toFixed(1)}<br>
                            • Session quality bonus: ${(this.metrics.sessionBonusMedian || 0).toFixed(1)}<br>
                            • Fast recovery bonus: ${(this.metrics.totalFastBonus || 0).toFixed(1)}<br>
                            • Flapping penalty: -${(this.metrics.flappingPenalty || 0).toFixed(1)}<br>
                            • Long outage penalty: -${(this.metrics.longOutagePenalty || 0).toFixed(1)}<br><br>
                            Raw score: ${(this.metrics.rawMedianScore || 0).toFixed(1)}<br>
                            Displayed score: ${medianStabilityScore}/100
                        </span>
                    </span>
                </div>
            </div>

            <!-- Stats Table -->
            <h2>Key Statistics</h2>
            <table>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Total Disconnects</td><td>${this.metrics.disconnects || 0}</td></tr>
                    <tr><td>Average Session Duration</td><td>${this.metrics.avgSession || 'N/A'}</td></tr>
                    <tr><td>Average Reconnect Time</td><td>${this.metrics.avgReconnect || 'N/A'}</td></tr>
                    <tr><td>Percent Connected</td><td>${(this.metrics.percentConnected || 0).toFixed(1)}%</td></tr>
                    <tr><td>Business Hours Disconnects</td><td>${this.metrics.businessDisconnects || 0}</td></tr>
                    <tr><td>Off-Hours Disconnects</td><td>${this.metrics.offHoursDisconnects || 0}</td></tr>
                    <tr><td>Time Since Last Disconnect</td><td>${this.metrics.timeSinceLastStr || 'N/A'}</td></tr>
                    <tr><td>Peak Disconnect Hour</td><td>${this.metrics.peakHourStr || 'None'}</td></tr>
                    <tr><td>Peak Disconnect Day</td><td>${this.metrics.peakDayStr || 'None'}</td></tr>
                    <!-- Add more rows for other metrics as needed -->
                </tbody>
            </table>

            <!-- Charts -->
            <div class="chart-section">
                <h2>Disconnects by Hour of Day</h2>
                <canvas id="hourlyChart" width="800" height="400"></canvas>
            </div>
            <div class="chart-section">
                <h2>Disconnects by Day</h2>
                <canvas id="dailyChart" width="800" height="400"></canvas>
            </div>
            <div class="chart-section">
                <h2>Rolling 7-Day Disconnects</h2>
                <canvas id="rollingChart" width="800" height="400"></canvas>
            </div>

            <!-- Long Disconnects Section -->
            ${longDisconnSection}

            <!-- Export Buttons -->
            <div class="export-buttons">
                <button onclick="exportToHTML()">Export to HTML</button>
                <button onclick="exportToPDF()">Export to PDF</button>
                <button onclick="exportToCSV()">Export to CSV</button>
            </div>

            <script>
                // Chart.js Initialization
                const hourlyCtx = document.getElementById('hourlyChart').getContext('2d');
                new Chart(hourlyCtx, {
                    type: 'bar',
                    data: {
                        labels: Array.from({length: 24}, (_, i) => \`\${i}:00\`),
                        datasets: [{
                            label: 'Disconnects',
                            data: ${JSON.stringify(this.metrics.hourlyDisconnects || Array(24).fill(0))},
                            backgroundColor: 'rgba(75, 192, 192, 0.6)'
                        }]
                    },
                    options: { scales: { y: { beginAtZero: true } } }
                });

                const dailyCtx = document.getElementById('dailyChart').getContext('2d');
                new Chart(dailyCtx, {
                    type: 'line',
                    data: {
                        labels: ${JSON.stringify(this.metrics.dailyLabels || [])},
                        datasets: [{
                            label: 'Disconnects',
                            data: ${JSON.stringify(this.metrics.dailyDisconnects || [])},
                            borderColor: 'rgba(153, 102, 255, 1)',
                            fill: false
                        }]
                    },
                    options: { scales: { y: { beginAtZero: true } } }
                });

                const rollingCtx = document.getElementById('rollingChart').getContext('2d');
                new Chart(rollingCtx, {
                    type: 'line',
                    data: {
                        labels: ${JSON.stringify((this.metrics.rolling7Day || []).map(item => item.label))},
                        datasets: [{
                            label: 'Disconnects',
                            data: ${JSON.stringify((this.metrics.rolling7Day || []).map(item => item.count))},
                            borderColor: 'rgba(255, 159, 64, 1)',
                            fill: false
                        }]
                    },
                    options: { scales: { y: { beginAtZero: true } } }
                });

                // Export Functions
                function exportToHTML() {
                    const htmlContent = document.documentElement.outerHTML;
                    const blob = new Blob([htmlContent], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'report.html';
                    a.click();
                    URL.revokeObjectURL(url);
                }

                function exportToPDF() {
                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF();
                    pdf.html(document.body, {
                        callback: function (pdf) {
                            pdf.save('report.pdf');
                        },
                        x: 10,
                        y: 10,
                        html2canvas: { scale: 0.5 }  // Adjust scale for better fit
                    });
                }

                function exportToCSV() {
                    const csv = '${csvContent.replace(/'/g, "\\'")}';  // Escape content if needed
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'report.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                }
            </script>
        </body>
        </html>
    `;
}

openReport(reportHTML) {
    const reportWindow = window.open('about:blank', '_blank');
    if (reportWindow) {
        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
        reportWindow.focus();
    } else {
        alert('Popup blocked - please allow popups for this site to view the report.');
    }
}
}
