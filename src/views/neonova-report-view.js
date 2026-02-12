class NeonovaReportView extends BaseNeonovaView {
    constructor(username, friendlyName, metrics, numEntries, longDisconnects) {
        super(null);   // inherit theme

        this.username = username;
        this.friendlyName = friendlyName;
        this.metrics = metrics;
        this.numEntries = numEntries;
        this.longDisconnects = longDisconnects;
    }

    generateLongDisconnectsHTML() {
        if (this.longDisconnects.length === 0) return '';

        let html = `
            <table class="w-full border-collapse">
                <thead>
                    <tr class="bg-zinc-800">
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
            <details class="group mb-16" open>
                <summary class="bg-zinc-800 hover:bg-zinc-700 transition-colors p-6 rounded-t-3xl cursor-pointer flex justify-between items-center text-${this.accent}-400 font-medium list-none">
                    <span>Long Disconnects (>30 minutes): ${this.longDisconnects.length}</span>
                    <span class="text-xs text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div class="bg-zinc-900 border border-zinc-700 border-t-0 rounded-b-3xl overflow-hidden">
                    ${this.generateLongDisconnectsHTML()}
                </div>
            </details>`;
    }

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
        csv += '\nLong Disconnects\nDisconnected At,Reconnected At,Duration\n';
        this.longDisconnects.forEach(ld => {
            csv += `${ld.stopDate.toLocaleString()},${ld.startDate.toLocaleString()},${formatDuration(ld.durationSec)}\n`;
        });
        return csv;
    }

    generateReportHTML() {
        const csvContent = this.generateCsvContent();
        const meanStabilityScore = Number(Math.max(0, Math.min(100, this.metrics.rawMeanScore || 0)).toFixed(1));
        const medianStabilityScore = Number(Math.max(0, Math.min(100, this.metrics.rawMedianScore || 0)).toFixed(1));
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
                    details summary::-webkit-details-marker { display: none; }
                </style>
            </head>
            <body class="bg-zinc-950 text-zinc-200">
                <div class="max-w-6xl mx-auto px-8 py-12">
                    <h1 class="text-5xl font-bold text-white text-center tracking-tight">RADIUS Connection Report</h1>
                    <p class="text-${this.accent}-400 text-center text-2xl mt-2 mb-3">${this.friendlyName || this.username}</p>
                    <p class="text-center text-zinc-400 mb-16">Monitoring period: ${this.metrics.monitoringPeriod || 'N/A'} (${Number(this.metrics.daysSpanned || 0).toFixed(1)} days)</p>

                    <!-- Stability Scores -->
                    <div class="grid grid-cols-2 gap-8 mb-16">
                        <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-10 text-center tooltip">
                            <div class="text-7xl font-bold text-${this.accent}-400">${meanStabilityScore}/100</div>
                            <span class="tooltiptext text-left">
                                <strong>How this score is calculated (using average session length):</strong><br><br>
                                • Uptime component: ${Number(this.metrics.percentConnected || 0).toFixed(1)}% * 0.6 = ${Number(this.metrics.uptimeComponent || 0).toFixed(1)}<br>
                                • Session quality bonus: ${Number(this.metrics.sessionBonusMean || 0).toFixed(1)}<br>
                                • Fast recovery bonus: ${Number(this.metrics.totalFastBonus || 0).toFixed(1)}<br>
                                • Flapping penalty: -${Number(this.metrics.flappingPenalty || 0).toFixed(1)}<br>
                                • Long outage penalty: -${Number(this.metrics.longOutagePenalty || 0).toFixed(1)}<br><br>
                                Raw score: ${Number(this.metrics.rawMeanScore || 0).toFixed(1)}<br>
                                Displayed score: ${meanStabilityScore}/100
                            </span>
                            <p class="text-zinc-400 text-lg mt-4">Mean Stability Score</p>
                        </div>

                        <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-10 text-center tooltip">
                            <div class="text-7xl font-bold text-${this.accent}-400">${medianStabilityScore}/100</div>
                            <span class="tooltiptext text-left">
                                <strong>How this score is calculated (using median session length):</strong><br><br>
                                • Uptime component: ${Number(this.metrics.percentConnected || 0).toFixed(1)}% * 0.6 = ${Number(this.metrics.uptimeComponent || 0).toFixed(1)}<br>
                                • Session quality bonus: ${Number(this.metrics.sessionBonusMedian || 0).toFixed(1)}<br>
                                • Fast recovery bonus: ${Number(this.metrics.totalFastBonus || 0).toFixed(1)}<br>
                                • Flapping penalty: -${Number(this.metrics.flappingPenalty || 0).toFixed(1)}<br>
                                • Long outage penalty: -${Number(this.metrics.longOutagePenalty || 0).toFixed(1)}<br><br>
                                Raw score: ${Number(this.metrics.rawMedianScore || 0).toFixed(1)}<br>
                                Displayed score: ${medianStabilityScore}/100
                            </span>
                            <p class="text-zinc-400 text-lg mt-4">Median Stability Score</p>
                        </div>
                    </div>

                    <!-- Key Statistics -->
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
                                    <tr><td class="p-6">95th Percentile Reconnect Time</td><td class="p-6 text-right">${this.metrics.p95
