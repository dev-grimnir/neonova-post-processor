class NeonovaReportView extends BaseNeonovaView {
    constructor(username, friendlyName, metrics, numEntries, longDisconnects) {
        super(null);
        this.username = username;
        this.friendlyName = friendlyName;
        this.metrics = metrics;
        this.numEntries = numEntries;
        this.longDisconnects = longDisconnects;
    }

    /**
     * Opens the generated report in a new tab using a Blob URL (clean source, no about:blank).
     */
    openInNewTab() {
        const reportHTML = this.generateReportHTML();

        const blob = new Blob([reportHTML], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const newTab = window.open(url, '_blank');
        if (newTab) {
            newTab.document.title = `RADIUS Report — ${this.friendlyName || this.username}`;
        }

        // Clean up memory
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

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

    generateLongDisconnSection() {
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

    generateReportHTML() {
        const longDisconnSection = this.generateLongDisconnSection();

        // Full data for charts and exports
        const reportData = {
            username: this.username,
            friendlyName: this.friendlyName,
            metrics: this.metrics,
            numEntries: this.numEntries,
            longDisconnects: this.longDisconnects,
            ignoredEntriesCount: this.metrics.ignoredEntriesCount || 0,
            generatedAt: new Date().toISOString()
        };

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
                <script>
                    const reportData = ${JSON.stringify(reportData)};

                    // Embedded formatDuration (self-contained)
                    function formatDuration(seconds) {
                        if (seconds < 60) return seconds + 's';
                        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's';
                        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
                        return Math.floor(seconds / 86400) + 'd ' + Math.floor((seconds % 86400) / 3600) + 'h';
                    }

                    // Recreate charts on load
                    window.addEventListener('load', () => {
                        const accentHex = '#34d399';

                        new Chart(document.getElementById('hourlyChart'), {
                            type: 'bar',
                            data: {
                                labels: Array.from({length: 24}, (_, i) => \`\${i}:00\`),
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

                    // Exports
                    function exportToHTML() {
                        const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = \`RADIUS_Report_\${reportData.username || 'user'}_\${new Date().toISOString().slice(0,10)}.html\`;
                        a.click();
                    }

                    function exportToCSV() {
                        let csv = 'Metric,Value\\n';
                        csv += \`Total Disconnects,\${reportData.metrics.disconnects || 0}\\n\`;
                        csv += \`Average Session Duration,\${reportData.metrics.avgSessionMin ? formatDuration(reportData.metrics.avgSessionMin * 60) : 'N/A'}\\n\`;
                        csv += \`Average Reconnect Time,\${reportData.metrics.avgReconnectMin ? formatDuration(reportData.metrics.avgReconnectMin * 60) : 'N/A'}\\n\`;
                        csv += \`Percent Connected,\${Number(reportData.metrics.percentConnected || 0).toFixed(1)}%\\n\`;
                        csv += \`Business Hours Disconnects,\${reportData.metrics.businessDisconnects || 0}\\n\`;
                        csv += \`Off-Hours Disconnects,\${reportData.metrics.offHoursDisconnects || 0}\\n\`;
                        csv += \`Time Since Last Disconnect,\${reportData.metrics.timeSinceLastStr || 'N/A'}\\n\`;
                        csv += \`Peak Disconnect Hour,\${reportData.metrics.peakHourStr || 'None'}\\n\`;
                        csv += \`Peak Disconnect Day,\${reportData.metrics.peakDayStr || 'None'}\\n\`;
                        csv += \`Mean Stability Score,\${reportData.metrics.meanStabilityScore}\\n\`;
                        csv += \`Median Stability Score,\${reportData.metrics.medianStabilityScore}\\n\`;
                        csv += \`Ignored Entries,\${reportData.ignoredEntriesCount || 0}\\n\`;

                        csv += '\\nLong Disconnects\\nDisconnected At,Reconnected At,Duration\\n';
                        (reportData.longDisconnects || []).forEach(ld => {
                            csv += \`\${new Date(ld.stopDate).toLocaleString()},\${new Date(ld.startDate).toLocaleString()},\${formatDuration(ld.durationSec)}\\n\`;
                        });

                        const blob = new Blob([csv], { type: 'text/csv' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = \`RADIUS_Report_\${reportData.username || 'user'}_\${new Date().toISOString().slice(0,10)}.csv\`;
                        a.click();
                    }

                    function exportToJSON() {
                        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = \`RADIUS_Report_\${reportData.username || 'user'}_\${new Date().toISOString().slice(0,10)}.json\`;
                        a.click();
                    }

                    function exportToXML() {
                        let xml = \`<?xml version="1.0" encoding="UTF-8"?>\\n<radiusReport>\\n\`;
                        xml += \`  <metadata>\\n\`;
                        xml += \`    <username>\${reportData.username}</username>\\n\`;
                        xml += \`    <friendlyName>\${reportData.friendlyName || reportData.username}</friendlyName>\\n\`;
                        xml += \`    <generatedAt>\${reportData.generatedAt}</generatedAt>\\n\`;
                        xml += \`    <monitoringPeriod>\${reportData.metrics.monitoringPeriod || 'N/A'}</monitoringPeriod>\\n\`;
                        xml += \`    <daysSpanned>\${Number(reportData.metrics.daysSpanned || 0).toFixed(1)}</daysSpanned>\\n\`;
                        xml += \`    <ignoredEntries>\${reportData.ignoredEntriesCount || 0}</ignoredEntries>\\n\`;
                        xml += \`  </metadata>\\n\`;
                        xml += \`  <summary>\\n\`;
                        xml += \`    <totalDisconnects>\${reportData.metrics.disconnects || 0}</totalDisconnects>\\n\`;
                        xml += \`    <percentConnected>\${Number(reportData.metrics.percentConnected || 0).toFixed(1)}</percentConnected>\\n\`;
                        xml += \`    <meanStabilityScore>\${reportData.metrics.meanStabilityScore}</meanStabilityScore>\\n\`;
                        xml += \`    <medianStabilityScore>\${reportData.metrics.medianStabilityScore}</medianStabilityScore>\\n\`;
                        xml += \`  </summary>\\n\`;
                        xml += \`  <longDisconnects>\\n\`;
                        (reportData.longDisconnects || []).forEach(ld => {
                            xml += \`    <disconnect>\\n\`;
                            xml += \`      <disconnectedAt>\${new Date(ld.stopDate).toISOString()}</disconnectedAt>\\n\`;
                            xml += \`      <reconnectedAt>\${new Date(ld.startDate).toISOString()}</reconnectedAt>\\n\`;
                            xml += \`      <durationSeconds>\${ld.durationSec}</durationSeconds>\\n\`;
                            xml += \`    </disconnect>\\n\`;
                        });
                        xml += \`  </longDisconnects>\\n\`;
                        xml += \`</radiusReport>\`;

                        const blob = new Blob([xml], { type: 'application/xml' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = \`RADIUS_Report_\${reportData.username || 'user'}_\${new Date().toISOString().slice(0,10)}.xml\`;
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

                        pdf.save(\`RADIUS_Report_\${reportData.username || 'user'}_\${new Date().toISOString().slice(0,10)}.pdf\`);
                    }
                </script>
            </body>
            </html>
        `;
    }
}
