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
    const { meanStabilityScore, medianStabilityScore } = this.metrics;

    const meanClass = meanStabilityScore >= 80 ? 'score-good' : meanStabilityScore >= 50 ? 'score-fair' : 'score-poor';
    const medianClass = medianStabilityScore >= 80 ? 'score-good' : medianStabilityScore >= 50 ? 'score-fair' : 'score-poor';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>NovaSubscriber Session Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        button.export-btn { padding: 12px 24px; margin: 10px; font-size: 18px; background: #006400; color: white; border: none; border-radius: 8px; cursor: pointer; }
        button.export-btn:hover { background: #008000; }
        .stability-score { font-size: 24px; font-weight: bold; text-align: center; margin: 12px 0; cursor: help; position: relative; }  /* Changed font and margin as requested */
        .score-good { color: #006400; }
        .score-fair { color: #ff8c00; }
        .score-poor { color: #c00; }
        .tooltip { visibility: hidden; width: 520px; background-color: #333; color: #fff; text-align: left; border-radius: 6px; padding: 18px; position: absolute; z-index: 1; top: 100%; left: 50%; margin-left: -260px; opacity: 0; transition: opacity 0.3s; font-size: 15px; line-height: 1.5; }
        .stability-score:hover .tooltip { visibility: visible; opacity: 1; }
        .tooltip strong { color: #4fc3f7; }
        .tooltip .formula { font-style: italic; color: #ffeb3b; margin: 8px 0; display: block; }
        .collapsible-header { cursor: pointer; background: #ffebee; padding: 12px; margin: 20px 0 0 0; border-radius: 6px; font-weight: bold; color: #c62828; text-align: center; border: 1px solid #ef9a9a; }
        .collapsible-header:hover { background: #ffcdd2; }
        @media print {
            #longDisconnectsContainer { display: block !important; }
        }
    </style>
</head>
<body>
    <div style="font-family: Arial, sans-serif; max-width: 1200px; margin: 40px auto; padding: 30px; background: #f0fff0; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
        <h1 style="text-align:center; color:#006400; font-size:44px; margin-bottom:10px;">Session Report Complete</h1>
        <div class="stability-score ${meanClass}">
            Stability Score (Mean-Based): ${meanStabilityScore}/100
            <span class="tooltip">
                <strong>How this score is calculated (using average session length, more sensitive to frequent short sessions):</strong><br><br>
                • Uptime component: ${this.metrics.percentConnected}% * 0.6 = ${this.metrics.uptimeComponent.toFixed(1)}<br>
                • Session quality bonus: ${this.metrics.sessionBonusMean.toFixed(1)}<br>
                • Fast recovery bonus (<30s, capped 18/day): ${this.metrics.totalFastBonus.toFixed(1)}<br>
                • Flapping penalty: -${this.metrics.flappingPenalty.toFixed(1)}<br>
                • Long outage penalty (>30min): -${this.metrics.longOutagePenalty.toFixed(1)}<br><br>
                Raw score: ${this.metrics.rawMeanScore.toFixed(1)}<br>
                Displayed score (clamped 0–100): ${meanStabilityScore}/100<br>
                Penalties scaled by timespan for fairness over long periods.
            </span>
        </div>
        <div class="stability-score ${medianClass}">
            Stability Score (Median-Based): ${medianStabilityScore}/100
            <span class="tooltip">
                <strong>How this score is calculated (using median session length, more resistant to outliers):</strong><br><br>
                • Uptime component: ${this.metrics.percentConnected}% * 0.6 = ${this.metrics.uptimeComponent.toFixed(1)}<br>
                • Session quality bonus: ${this.metrics.sessionBonusMedian.toFixed(1)}<br>
                • Fast recovery bonus (<30s, capped 18/day): ${this.metrics.totalFastBonus.toFixed(1)}<br>
                • Flapping penalty: -${this.metrics.flappingPenalty.toFixed(1)}<br>
                • Long outage penalty (>30min): -${this.metrics.longOutagePenalty.toFixed(1)}<br><br>
                Raw score: ${this.metrics.rawMedianScore.toFixed(1)}<br>
                Displayed score (clamped 0–100): ${medianStabilityScore}/100<br>
                Penalties scaled by timespan for fairness over long periods.
            </span>
        </div>
        <h2 style="text-align:center; color:#555; font-size:22px; margin:20px 0;">
            ${this.pages} pages | ${this.metrics.allEntriesLength} raw records (${this.metrics.cleanedEntriesLength} after de-duplication)
        </h2>
        <h3 style="text-align:center; color:#777; font-size:18px; margin-bottom:30px;">
            Monitoring period: ${this.metrics.monitoringPeriod} (${this.metrics.daysSpanned.toFixed(1)} days spanned)
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

        ${this.generateLongDisconnSection()}

        <table style="width:100%; font-size:18px; border-collapse:collapse; margin-top:40px;">
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Number of Sessions</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${this.metrics.numSessions}</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">Number of Disconnects</td><td style="padding:18px; text-align:right; background:#f0f8f0;"><b>${this.metrics.disconnects}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Reconnects Within 5 Minutes</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${this.metrics.quickReconnects}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Longest Continuous Connected</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${formatDuration(this.metrics.longestSessionMin * 60)}</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">Shortest Session Length</td><td style="padding:18px; text-align:right; background:#f0f8f0;"><b>${this.metrics.shortestSessionMin === 'N/A' ? 'N/A' : formatDuration(this.metrics.shortestSessionMin * 60)}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Average Session Length</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${formatDuration(this.metrics.avgSessionMin * 60)}</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">95th Percentile Reconnect Time</td><td style="padding:18px; text-align:right; background:#f0f8f0;"><b>${formatDuration(this.metrics.p95ReconnectMin * 60)}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Average Time to Reconnect</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${formatDuration(this.metrics.avgReconnectMin * 60)}</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">Median Time to Reconnect</td><td style="padding:18px; text-align:right; background:#f0f8f0;"><b>${formatDuration(this.metrics.medianReconnectMin * 60)}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Peak Disconnect Hour</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${this.metrics.peakHourStr}</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">Peak Disconnect Day</td><td style="padding:18px; text-align:right; background:#f0f8f0;"><b>${this.metrics.peakDayStr}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Disconnects (Business Hours 8AM-6PM)</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${this.metrics.businessDisconnects}</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">Disconnects (Off-Hours)</td><td style="padding:18px; text-align:right; background:#f0f8f0;"><b>${this.metrics.offHoursDisconnects}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Time Since Last Disconnect</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${this.metrics.timeSinceLastStr}</b></td></tr>
        </table>
    </div>

    <script>
        function toggleLongDisconnects() {
            const container = document.getElementById('longDisconnectsContainer');
            if (container) {
                const isHidden = container.style.display === 'none';
                container.style.display = isHidden ? 'block' : 'none';
                const header = document.getElementById

    openReport(reportHTML) {
        const reportWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        reportWindow.document.write(reportHTML);
        reportWindow.document.close();
    }
}
