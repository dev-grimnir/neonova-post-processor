class NeonovaReportView extends BaseNeonovaView {
    /**
     * Constructor for the full report view.
     * This view is standalone — it generates a complete HTML page that opens in a new tab.
     * No container is needed (super(null)).
     * 
     * @param {string} username - RADIUS username
     * @param {string} friendlyName - Display name (optional)
     * @param {Object} metrics - All computed metrics from the analyzer
     * @param {number} numEntries - Total raw log entries processed
     * @param {Array} longDisconnects - Array of long disconnect objects
     */
    constructor(username, friendlyName, metrics, numEntries, longDisconnects) {
        super(null);
        this.username = username;
        this.friendlyName = friendlyName;
        this.metrics = metrics;
        this.numEntries = numEntries;
        this.longDisconnects = longDisconnects;
    }

    /**
     * Opens the generated report in a new browser tab using a Blob URL.
     * This method ensures:
     * - Clean, readable page source (no about:blank)
     * - Proper tab title
     * - Memory cleanup via revokeObjectURL
     * 
     * Called from NeonovaProgressView.finish() after instantiation.
     */
    openInNewTab() {
        const reportHTML = this.generateReportHTML();

        const blob = new Blob([reportHTML], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const newTab = window.open(url, '_blank');
        if (newTab) {
            newTab.document.title = `RADIUS Report — ${this.friendlyName || this.username}`;
        }

        // Revoke the object URL after a delay to prevent memory leaks
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    // ────────────────────────────────────────────────
    // PRIVATE HELPER METHODS — ALL DECLARED AT THE TOP
    // These are placed early in the class to avoid Tampermonkey parsing issues with private fields.
    // Each method is small, focused, and returns a string of HTML.
    // ────────────────────────────────────────────────

    /**
     * Generates the main body content of the report.
     * Orchestrates all sections: header, scores, stats, charts, long disconnects, and export buttons.
     * 
     * @param {string} longDisconnSection - Pre-generated long disconnects HTML section
     * @returns {string} Full body HTML string
     */
    #generateReportBody(longDisconnSection) {
        return `
            <div class="max-w-6xl mx-auto px-8 py-12">
                <h1 class="text-5xl font-bold text-white text-center tracking-tight">RADIUS Connection Report</h1>
                <p class="text-${this.accent}-400 text-center text-2xl mt-2 mb-3">${this.friendlyName || this.username}</p>
                <p class="text-center text-zinc-400 mb-16">
                    Monitoring period: ${this.metrics.monitoringPeriod || 'N/A'} 
                    (${Number(this.metrics.daysSpanned || 0).toFixed(1)} days)
                    ${this.metrics.ignoredEntriesCount > 0 ? ` • ${this.metrics.ignoredEntriesCount.toLocaleString()} consecutive duplicates ignored` : ''}
                </p>
                
                ${this.#generateStabilityScoresSection()}
                ${this.#generateKeyStatisticsSection()}
                ${this.#generateChartsSection()}
                ${longDisconnSection}
                ${this.#generateExportButtons()}
            </div>
        `;
    }

    /**
     * Generates the stability scores card section (Mean and Median).
     * Includes tooltips with detailed score breakdown.
     * 
     * @returns {string} HTML for the stability scores grid
     */
    #generateStabilityScoresSection() {
        return `
            <div class="grid grid-cols-2 gap-8 mb-16">
                <!-- Mean Score -->
                <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-10 text-center tooltip">
                    <div class="text-7xl font-bold text-${this.accent}-400">${Math.round(Math.max(0, Math.min(100, this.metrics.rawMeanScore || 0)))}/100</div>
                    <span class="tooltiptext text-left">
                        <strong>How this score is calculated (using average session length):</strong><br><br>
                        • Uptime component: ${Number(this.metrics.percentConnected || 0).toFixed(1)}% × 0.9 = ${Number(this.metrics.uptimeComponent || 0).toFixed(1)}<br>
                        • Session quality bonus: ${Number(this.metrics.sessionBonusMean || 0).toFixed(1)}<br>
                        • Fast recovery bonus: ${Number(this.metrics.totalFastBonus || 0).toFixed(1)}<br>
                        • Flapping penalty: -${Number(this.metrics.flappingPenalty || 0).toFixed(1)}<br>
                        • Long outage penalty: -${Number(this.metrics.longOutagePenalty || 0).toFixed(1)}<br><br>
                        Raw score: ${Number(this.metrics.rawMeanScore || 0).toFixed(1)}<br>
                        Displayed score: ${Math.round(Math.max(0, Math.min(100, this.metrics.rawMeanScore || 0)))}
                    </span>
                    <p class="text-zinc-400 text-lg mt-4">Mean Stability Score</p>
                </div>

                <!-- Median Score -->
                <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-10 text-center tooltip">
                    <div class="text-7xl font-bold text-${this.accent}-400">${Math.round(Math.max(0, Math.min(100, this.metrics.rawMedianScore || 0)))}/100</div>
                    <span class="tooltiptext text-left">
                        <strong>How this score is calculated (using median session length):</strong><br><br>
                        • Uptime component: ${Number(this.metrics.percentConnected || 0).toFixed(1)}% × 0.9 = ${Number(this.metrics.uptimeComponent || 0).toFixed(1)}<br>
                        • Session quality bonus: ${Number(this.metrics.sessionBonusMedian || 0).toFixed(1)}<br>
                        • Fast recovery bonus: ${Number(this.metrics.totalFastBonus || 0).toFixed(1)}<br>
                        • Flapping penalty: -${Number(this.metrics.flappingPenalty || 0).toFixed(1)}<br>
                        • Long outage penalty: -${Number(this.metrics.longOutagePenalty || 0).toFixed(1)}<br><br>
                        Raw score: ${Number(this.metrics.rawMedianScore || 0).toFixed(1)}<br>
                        Displayed score: ${Math.round(Math.max(0, Math.min(100, this.metrics.rawMedianScore || 0)))}
                    </span>
                    <p class="text-zinc-400 text-lg mt-4">Median Stability Score</p>
                </div>
            </div>
        `;
    }

    /**
     * Generates the key statistics table.
     * All core metrics are displayed here for quick reference.
     * 
     * @returns {string} HTML for the key statistics section
     */
    #generateKeyStatisticsSection() {
        return `
            <div class="mb-16">
                <h2 class="text-3xl font-semibold text-white mb-8">Key Statistics</h2>
                <div class="bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden">
                    <table class="w-full">
                        <thead>
                            <tr class="border-b border-zinc-700 bg-zinc-800">
                                <th class="p-6 text-left text-zinc-400 font-medium">Metric</th>
                                <th class="p-6 text-right text-zinc-400 font-medium">Value</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-zinc-700 text-sm">
                            <tr><td class="p-6">Total Disconnects</td><td class="p-6 text-right font-mono">${this.metrics.disconnects || 0}</td></tr>
                            <tr><td class="p-6">Average Session Duration</td><td class="p-6 text-right">${this.metrics.avgSessionMin ? formatDuration(this.metrics.avgSessionMin * 60) : 'N/A'}</td></tr>
                            <tr><td class="p-6">Average Reconnect Time</td><td class="p-6 text-right">${this.metrics.avgReconnectMin ? formatDuration(this.metrics.avgReconnectMin * 60) : 'N/A'}</td></tr>
                            <tr><td class="p-6">Percent Connected</td><td class="p-6 text-right">${Number(this.metrics.percentConnected || 0).toFixed(1)}%</td></tr>
                            <tr><td class="p-6">Business Hours Disconnects</td><td class="p-6 text-right">${this.metrics.businessDisconnects || 0}</td></tr>
                            <tr><td class="p-6">Off-Hours Disconnects</td><td class="p-6 text-right">${this.metrics.offHoursDisconnects || 0}</td></tr>
                            <tr><td class="p-6">Time Since Last Disconnect</td><td class="p-6 text-right">${this.metrics.timeSinceLastStr || 'N/A'}</td></tr>
                            <tr><td class="p-6">Peak Disconnect Hour</td><td class="p-6 text-right">${this.metrics.peakHourStr || 'None'}</td></tr>
                            <tr><td class="p-6">Peak Disconnect Day</td><td class="p-6 text-right">${this.metrics.peakDayStr || 'None'}</td></tr>
                            <tr><td class="p-6">Longest Session</td><td class="p-6 text-right">${this.metrics.longestSessionMin ? formatDuration(this.metrics.longestSessionMin * 60) : 'N/A'}</td></tr>
                            <tr><td class="p-6">Shortest Session</td><td class="p-6 text-right">${this.metrics.shortestSessionMin ? formatDuration(this.metrics.shortestSessionMin * 60) : 'N/A'}</td></tr>
                            <tr><td class="p-6">Median Reconnect Time</td><td class="p-6 text-right">${this.metrics.medianReconnectMin ? formatDuration(this.metrics.medianReconnectMin * 60) : 'N/A'}</td></tr>
                            <tr><td class="p-6">95th Percentile Reconnect Time</td><td class="p-6 text-right">${this.metrics.p95ReconnectMin ? formatDuration(this.metrics.p95ReconnectMin * 60) : 'N/A'}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Generates the charts section with placeholders for Chart.js canvases.
     * Charts are recreated in the embedded script on load.
     * 
     * @returns {string} HTML for the charts container
     */
    #generateChartsSection() {
        return `
            <div class="space-y-16">
                <div>
                    <h2 class="text-3xl font-semibold text-white mb-6">Disconnects by Hour of Day</h2>
                    <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-8"><canvas id="hourlyChart" class="w-full h-96"></canvas></div>
                </div>
                <div>
                    <h2 class="text-3xl font-semibold text-white mb-6">Disconnects by Day</h2>
                    <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-8"><canvas id="dailyChart" class="w-full h-96"></canvas></div>
                </div>
                <div>
                    <h2 class="text-3xl font-semibold text-white mb-6">Rolling 7-Day Disconnects</h2>
                    <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-8"><canvas id="rollingChart" class="w-full h-96"></canvas></div>
                </div>
            </div>
        `;
    }

    /**
     * Generates the export buttons row.
     * Each button triggers a self-contained export function in the embedded script.
     * 
     * @returns {string} HTML for the export buttons
     */
    #generateExportButtons() {
        return `
            <div class="flex justify-center gap-4 mt-20">
                <button onclick="exportToHTML()" class="px-10 py-4 bg-${this.accent}-600 hover:bg-${this.accent}-500 text-black font-semibold rounded-2xl transition">Export as HTML</button>
                <button onclick="exportToCSV()" class="px-10 py-4 bg-${this.accent}-600 hover:bg-${this.accent}-500 text-black font-semibold rounded-2xl transition">Export as CSV</button>
                <button onclick="exportToJSON()" class="px-10 py-4 bg-${this.accent}-600 hover:bg-${this.accent}-500 text-black font-semibold rounded-2xl transition">Export as JSON</button>
                <button onclick="exportToXML()" class="px-10 py-4 bg-${this.accent}-600 hover:bg-${this.accent}-500 text-black font-semibold rounded-2xl transition">Export as XML</button>
                <button onclick="exportToPDF()" class="px-10 py-4 bg-${this.accent}-600 hover:bg-${this.accent}-500 text-black font-semibold rounded-2xl transition">Export as PDF</button>
            </div>
        `;
    }

    /**
     * Generates the embedded <script> block for the report page.
     * This script is fully self-contained:
     * - Embeds formatDuration for durations in tables and CSV
     * - Recreates all Chart.js charts on page load using injected reportData
     * - Implements all export functions (HTML, CSV, JSON, XML, PDF)
     * - Handles multi-page PDF for long reports
     * - Uses string concatenation to avoid nested template literal issues in userscript environments
     * 
     * @returns {string} Complete <script> tag with all functionality
     */
    #generateReportScripts() {
        const reportData = {
            username: this.username,
            friendlyName: this.friendlyName,
            metrics: this.metrics,
            longDisconnects: this.longDisconnects,
            ignoredEntriesCount: this.metrics.ignoredEntriesCount || 0,
            generatedAt: new Date().toISOString()
        };

        return `
            <script>
                const reportData = ${JSON.stringify(reportData)};

                // Embedded formatDuration — required for table durations and CSV export
                function formatDuration(seconds) {
                    if (seconds < 60) return seconds + 's';
                    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's';
                    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
                    return Math.floor(seconds / 86400) + 'd ' + Math.floor((seconds % 86400) / 3600) + 'h';
                }

                // Recreate all charts on page load using the injected reportData
                window.addEventListener('load', () => {
                    const accentHex = '#34d399';

                    new Chart(document.getElementById('hourlyChart'), {
                        type: 'bar',
                        data: {
                            labels: Array.from({length: 24}, (_, i) => i + ':00'),
                            datasets: [{ label: 'Disconnects', data: reportData.metrics.hourlyDisconnects || Array(24).fill(0), backgroundColor: accentHex }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
                    });

                    new Chart(document.getElementById('dailyChart'), {
                        type: 'bar',
                        data: {
                            labels: reportData.metrics.dailyLabels || [],
                            datasets: [{ label: 'Disconnects', data: reportData.metrics.dailyDisconnects || [], backgroundColor: accentHex }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
                    });

                    new Chart(document.getElementById('rollingChart'), {
                        type: 'line',
                        data: {
                            labels: reportData.metrics.rollingLabels || [],
                            datasets: [{ label: '7-Day Rolling Disconnects', data: reportData.metrics.rolling7Day || [], borderColor: accentHex, borderWidth: 3, tension: 0.3, fill: false }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
                    });
                });

                // ────── Export Functions (self-contained, using concatenation for filenames) ──────

                function exportToHTML() {
                    const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'RADIUS_Report_' + (reportData.username || 'user') + '_' + new Date().toISOString().slice(0,10) + '.html';
                    a.click();
                }

                function exportToCSV() {
                    let csv = 'Metric,Value\\n';
                    csv += 'Total Disconnects,' + (reportData.metrics.disconnects || 0) + '\\n';
                    csv += 'Average Session Duration,' + (reportData.metrics.avgSessionMin ? formatDuration(reportData.metrics.avgSessionMin * 60) : 'N/A') + '\\n';
                    csv += 'Average Reconnect Time,' + (reportData.metrics.avgReconnectMin ? formatDuration(reportData.metrics.avgReconnectMin * 60) : 'N/A') + '\\n';
                    csv += 'Percent Connected,' + Number(reportData.metrics.percentConnected || 0).toFixed(1) + '%\\n';
                    csv += 'Business Hours Disconnects,' + (reportData.metrics.businessDisconnects || 0) + '\\n';
                    csv += 'Off-Hours Disconnects,' + (reportData.metrics.offHoursDisconnects || 0) + '\\n';
                    csv += 'Time Since Last Disconnect,' + (reportData.metrics.timeSinceLastStr || 'N/A') + '\\n';
                    csv += 'Peak Disconnect Hour,' + (reportData.metrics.peakHourStr || 'None') + '\\n';
                    csv += 'Peak Disconnect Day,' + (reportData.metrics.peakDayStr || 'None') + '\\n';
                    csv += 'Mean Stability Score,' + reportData.metrics.meanStabilityScore + '\\n';
                    csv += 'Median Stability Score,' + reportData.metrics.medianStabilityScore + '\\n';
                    csv += 'Ignored Entries,' + (reportData.ignoredEntriesCount || 0) + '\\n';

                    csv += '\\nLong Disconnects\\nDisconnected At,Reconnected At,Duration\\n';
                    (reportData.longDisconnects || []).forEach(ld => {
                        csv += new Date(ld.stopDate).toLocaleString() + ',' + new Date(ld.startDate).toLocaleString() + ',' + formatDuration(ld.durationSec) + '\\n';
                    });

                    const blob = new Blob([csv], { type: 'text/csv' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'RADIUS_Report_' + (reportData.username || 'user') + '_' + new Date().toISOString().slice(0,10) + '.csv';
                    a.click();
                }

                function exportToJSON() {
                    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'RADIUS_Report_' + (reportData.username || 'user') + '_' + new Date().toISOString().slice(0,10) + '.json';
                    a.click();
                }

                function exportToXML() {
                    let xml = '<?xml version="1.0" encoding="UTF-8"?> \\n<radiusReport>\\n';
                    xml += '  <metadata>\\n';
                    xml += '    <username>' + reportData.username + '</username>\\n';
                    xml += '    <friendlyName>' + (reportData.friendlyName || reportData.username) + '</friendlyName>\\n';
                    xml += '    <generatedAt>' + reportData.generatedAt + '</generatedAt>\\n';
                    xml += '    <monitoringPeriod>' + (reportData.metrics.monitoringPeriod || 'N/A') + '</monitoringPeriod>\\n';
                    xml += '    <daysSpanned>' + Number(reportData.metrics.daysSpanned || 0).toFixed(1) + '</daysSpanned>\\n';
                    xml += '    <ignoredEntries>' + (reportData.ignoredEntriesCount || 0) + '</ignoredEntries>\\n';
                    xml += '  </metadata>\\n';
                    xml += '  <summary>\\n';
                    xml += '    <totalDisconnects>' + (reportData.metrics.disconnects || 0) + '</totalDisconnects>\\n';
                    xml += '    <percentConnected>' + Number(reportData.metrics.percentConnected || 0).toFixed(1) + '</percentConnected>\\n';
                    xml += '    <meanStabilityScore>' + reportData.metrics.meanStabilityScore + '</meanStabilityScore>\\n';
                    xml += '    <medianStabilityScore>' + reportData.metrics.medianStabilityScore + '</medianStabilityScore>\\n';
                    xml += '  </summary>\\n';
                    xml += '  <longDisconnects>\\n';
                    (reportData.longDisconnects || []).forEach(ld => {
                        xml += '    <disconnect>\\n';
                        xml += '      <disconnectedAt>' + new Date(ld.stopDate).toISOString() + '</disconnectedAt>\\n';
                        xml += '      <reconnectedAt>' + new Date(ld.startDate).toISOString() + '</reconnectedAt>\\n';
                        xml += '      <durationSeconds>' + ld.durationSec + '</durationSeconds>\\n';
                        xml += '    </disconnect>\\n';
                    });
                    xml += '  </longDisconnects>\\n';
                    xml += '</radiusReport>';

                    const blob = new Blob([xml], { type: 'application/xml' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'RADIUS_Report_' + (reportData.username || 'user') + '_' + new Date().toISOString().slice(0,10) + '.xml';
                    a.click();
                }

                async function exportToPDF() {
                    const { jsPDF } = window.jspdf;
                    const canvas = await html2canvas(document.body, { scale: 2 });
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF('p', 'pt', 'a4');
                    const imgWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    let heightLeft = canvas.height * imgWidth / canvas.width;
                    let position = 0;

                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, heightLeft);
                    heightLeft -= pageHeight;

                    while (heightLeft >= 0) {
                        position = heightLeft - canvas.height * imgWidth / canvas.width;
                        pdf.addPage();
                        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, canvas.height * imgWidth / canvas.width);
                        heightLeft -= pageHeight;
                    }

                    pdf.save('RADIUS_Report_' + (reportData.username || 'user') + '_' + new Date().toISOString().slice(0,10) + '.pdf');
                }
            </script>
        `;
    }

    // ────────────────────────────────────────────────
    // PUBLIC METHODS (called from outside the class)
    // ────────────────────────────────────────────────

    /**
     * Generates the long disconnects table HTML.
     * Used by generateLongDisconnSection().
     * 
     * @returns {string} Table HTML or empty string if no long disconnects
     */
    generateLongDisconnectsHTML() {
        if (this.longDisconnects.length === 0) return '';
    
        let html = `
            <table class="w-full border-collapse">
                <thead>
                    <tr class="bg-zinc-800 border-b border-zinc-700">
                        <th class="p-6 text-left text-zinc-400 font-medium">Disconnected At</th>
                        <th class="p-6 text-left text-zinc-400 font-medium">Reconnected At</th>
                        <th class="p-6 text-right text-zinc-400 font-medium">Duration</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-700">`;
    
        this.longDisconnects.forEach(ld => {
            const durationStr = formatDuration(ld.durationSec);
            html += `
                <tr class="hover:bg-zinc-800/70 transition-colors">
                    <td class="p-6 text-zinc-200">${ld.stopDate.toLocaleString()}</td>
                    <td class="p-6 text-zinc-200">${ld.startDate.toLocaleString()}</td>
                    <td class="p-6 text-right font-semibold text-${this.accent}-400">${durationStr}</td>
                </tr>`;
        });
    
        html += `</tbody></table>`;
        return html;
    }

    /**
     * Generates the long disconnects section (details/summary with table or "none" message).
     * 
     * @returns {string} Full section HTML
     */
    generateLongDisconnSection() {
        longDisconnects = longDisconnects || [];
        if (this.longDisconnects.length === 0) {
            return `<p class="text-zinc-400 italic text-center py-12">No disconnects longer than 30 minutes.</p>`;
        }

        return `
            <details class="group mt-16 mb-16" open>
                <summary class="bg-zinc-800 hover:bg-zinc-700 transition-colors p-6 rounded-t-3xl cursor-pointer flex justify-between items-center text-${this.accent}-400 font-medium list-none">
                    <span>Long Disconnects (>30 minutes): ${this.longDisconnects.length}</span>
                    <span class="text-xs text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div class="bg-zinc-900 border border-zinc-700 border-t-0 rounded-b-3xl overflow-hidden">
                    ${this.generateLongDisconnectsHTML()}
                </div>
            </details>`;
    }

    /**
     * Main method — generates the complete standalone report HTML page.
     * Orchestrates all private helpers to build the final string.
     * 
     * @returns {string} Complete HTML document
     */
    generateReportHTML() {
        const longDisconnSection = this.generateLongDisconnSection();

        return `
            <!DOCTYPE html>
            <html lang="en" class="dark">
            <head>
                <meta charset="UTF-8">
                <title>RADIUS Connection Report for ${this.username}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
                <style>
                    .tooltip { position: relative; }
                    .tooltip .tooltiptext {
                        visibility: hidden; width: 420px; background: #27272a; color: #e5e5e5;
                        text-align: left; border-radius: 12px; padding: 16px; position: absolute;
                        z-index: 10; top: 100%; left: 50%; margin-left: -210px; opacity: 0;
                        transition: all 0.2s; font-size: 13px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3);
                    }
                    .tooltip:hover .tooltiptext { visibility: visible; opacity: 1; }
                </style>
            </head>
            <body class="bg-zinc-950 text-zinc-200">
                ${this.#generateReportBody(longDisconnSection)}
                ${this.#generateReportScripts()}
            </body>
            </html>
        `;
    }
}
