// ==UserScript==
// @name         NovaSubscriber - Full Session Report (Version 8.17 - Modified)
// @namespace    http://tampermonkey.net/
// @version      8.17
// @description  Full report with graphs, collapsible long disconnects, stats table, and HTML export
// @author       Grok
// @match        https://admin.neonova.net/index.php*
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const table = document.querySelector('table[cellspacing="2"][cellpadding="2"]');
    if (!table) return;

    let analysisMode = localStorage.getItem('novaAnalysisMode') === 'true';

    let allEntries = JSON.parse(localStorage.getItem('novaEntries') || '[]');
    let pages = parseInt(localStorage.getItem('novaPages') || '0');

    const rows = document.querySelectorAll("table tbody tr");
    rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 7) return;

        const dateStr = cells[0].textContent.trim();
        const status = cells[4].textContent.trim();

        if ((status === "Start" || status === "Stop") && dateStr) {
            const date = new Date(dateStr.replace(" ", "T"));
            if (!isNaN(date)) {
                allEntries.push({ date: date.getTime(), status, dateObj: date });
            }
        }
    });

    localStorage.setItem('novaEntries', JSON.stringify(allEntries));

    let button = document.querySelector('#novaReportButton');
    if (!button) {
        button = document.createElement('button');
        button.id = 'novaReportButton';
        button.textContent = analysisMode ? 'Analysis Running...' : 'Run Full Report';
        button.style.position = 'fixed';
        button.style.top = '50%';
        button.style.right = '10px';
        button.style.transform = 'translateY(-50%)';
        button.style.zIndex = '999999';
        button.style.padding = '20px 30px';
        button.style.fontSize = '20px';
        button.style.fontWeight = 'bold';
        button.style.backgroundColor = analysisMode ? '#ff8c00' : '#006400';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '15px';
        button.style.boxShadow = '0 8px 20px rgba(0,0,0,0.6)';
        button.style.cursor = 'pointer';
        button.style.writingMode = 'vertical-rl';
        button.style.textOrientation = 'mixed';

        button.onclick = function() {
            if (analysisMode) return;

            localStorage.setItem('novaAnalysisMode', 'true');
            localStorage.setItem('novaPages', '0');
            localStorage.setItem('novaEntries', JSON.stringify([]));
            location.reload();
        };

        document.body.appendChild(button);
    } else {
        button.textContent = analysisMode ? 'Analysis Running...' : 'Run Full Report';
        button.style.backgroundColor = analysisMode ? '#ff8c00' : '#006400';
    }

    if (analysisMode) {
        const nextLink = Array.from(document.querySelectorAll('a'))
            .find(a => a.textContent.trim().startsWith('NEXT @') && a.href && a.href.includes('index.php'));

        if (nextLink) {
            pages++;
            localStorage.setItem('novaPages', pages);
            setTimeout(() => nextLink.click(), 10);
        } else {
            pages++;
            localStorage.setItem('novaPages', pages);

            setTimeout(() => {
                allEntries = allEntries.map(entry => {
                    const timestamp = Number(entry.date);
                    const fixedDate = new Date(timestamp);
                    return { date: timestamp, status: entry.status, dateObj: fixedDate };
                });

                allEntries.sort((a, b) => a.date - b.date);

                const cleanedEntries = [];
                let lastStatus = null;
                allEntries.forEach(entry => {
                    if (lastStatus === null || entry.status !== lastStatus) {
                        cleanedEntries.push(entry);
                        lastStatus = entry.status;
                    }
                });

                let disconnects = 0;
                let sessionSeconds = [];
                let reconnectSeconds = [];
                let reconnects = [];
                let longDisconnects = [];

                let firstDate = null;
                let lastDate = null;
                let lastDisconnectDate = null;
                const hourlyDisconnects = Array(24).fill(0);
                const dailyDisconnects = Array(7).fill(0);
                const hourlyCount = Array(24).fill(0);
                const dailyCount = {};
                let disconnectDates = [];

                let currentState = null;          // null = unknown, "up", "down"
                let lastTransitionTime = null;    // time of last state change

                cleanedEntries.forEach(entry => {
                    const date = entry.dateObj;
                    const ts = date.getTime();

                    if (!firstDate) firstDate = date;
                    lastDate = date;

                    if (entry.status === "Start") {
                        if (currentState === "down" || currentState === null) {
                            // Transition: down → up (or first event is Start)
                            if (currentState === "down" && lastTransitionTime !== null) {
                                const reconnectSec = (ts - lastTransitionTime) / 1000;
                                if (reconnectSec > 0) {
                                    reconnectSeconds.push(reconnectSec);
                                    reconnects.push({dateObj: date, sec: reconnectSec});
                                    if (reconnectSec > 1800) {
                                        longDisconnects.push({
                                            stopDate: new Date(lastTransitionTime),
                                            startDate: date,
                                            durationSec: reconnectSec
                                        });
                                    }
                                }
                            }
                            currentState = "up";
                            lastTransitionTime = ts;
                        }
                        // else already up → ignore duplicate Start (though cleanedEntries shouldn't have them)

                    } else if (entry.status === "Stop") {
                        disconnects++;
                        const hour = date.getHours();
                        hourlyDisconnects[hour]++;
                        hourlyCount[hour]++;

                        const dayKey = date.toLocaleDateString();
                        dailyCount[dayKey] = (dailyCount[dayKey] || 0) + 1;
                        dailyDisconnects[date.getDay()]++;

                        if (currentState === "up" || currentState === null) {
                            // Transition: up → down (or first event is Stop)
                            if (currentState === "up" && lastTransitionTime !== null) {
                                const duration = (ts - lastTransitionTime) / 1000;
                                if (duration > 0) sessionSeconds.push(duration);
                            }
                            currentState = "down";
                            lastTransitionTime = ts;
                            lastDisconnectDate = date;
                            disconnectDates.push(date);
                        }
                        // else already down → ignore duplicate Stop
                    }
                });

                // After processing all events: if currently up, add final connected period to end of log
                if (currentState === "up" && lastTransitionTime !== null && lastDate) {
                    const finalDuration = (lastDate.getTime() - lastTransitionTime) / 1000;
                    if (finalDuration > 0) {
                        sessionSeconds.push(finalDuration);
                    }
                }

                let peakHourCount = Math.max(...hourlyCount);
                let peakHour = hourlyCount.indexOf(peakHourCount);
                let peakHourStr = peakHourCount > 0 ? `${peakHour}:00–${peakHour + 1}:00 (${peakHourCount} disconnects)` : 'None';

                let peakDayStr = 'None';
                let peakDayCount = 0;
                for (const [day, count] of Object.entries(dailyCount)) {
                    if (count > peakDayCount) {
                        peakDayCount = count;
                        peakDayStr = `${day} (${count} disconnects)`;
                    }
                }

                let businessDisconnects = 0;
                let offHoursDisconnects = 0;
                for (let h = 0; h < 24; h++) {
                    if (h >= 8 && h < 18) businessDisconnects += hourlyDisconnects[h];
                    else offHoursDisconnects += hourlyDisconnects[h];
                }

                let timeSinceLastStr = 'N/A';
                if (lastDisconnectDate) {
                    const sinceSec = (new Date() - lastDisconnectDate) / 1000;
                    timeSinceLastStr = formatDuration(sinceSec) + ' ago';
                }

                const dailyValues = Object.values(dailyCount);
                const avgDaily = dailyValues.length ? (dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length).toFixed(1) : '0';

                const totalConnectedSec = sessionSeconds.reduce((a, b) => a + b, 0);
                const totalRangeSec = firstDate && lastDate ? (lastDate - firstDate) / 1000 : 1;
                const totalDisconnectedSec = totalRangeSec - totalConnectedSec;
                const percentConnected = totalRangeSec > 0 ? (totalConnectedSec / totalRangeSec * 100).toFixed(1) : 'N/A';

                const numSessions = sessionSeconds.length;
                const avgSessionMin = numSessions ? (sessionSeconds.reduce((a, b) => a + b, 0) / numSessions / 60).toFixed(1) : 'N/A';
                const longestSessionMin = numSessions ? Math.max(...sessionSeconds) / 60 : 0;
                const shortestSessionMin = numSessions ? Math.min(...sessionSeconds.filter(s => s > 0)) / 60 : 'N/A';

                let medianReconnectMin = 'N/A';
                let p95ReconnectMin = 'N/A';
                if (reconnectSeconds.length > 0) {
                    reconnectSeconds.sort((a, b) => a - b);
                    const mid = Math.floor(reconnectSeconds.length / 2);
                    const medianSec = reconnectSeconds.length % 2 ? reconnectSeconds[mid] : (reconnectSeconds[mid - 1] + reconnectSeconds[mid]) / 2;
                    medianReconnectMin = (medianSec / 60).toFixed(1);

                    const p95Index = Math.floor(reconnectSeconds.length * 0.95);
                    const p95Sec = reconnectSeconds[p95Index];
                    p95ReconnectMin = (p95Sec / 60).toFixed(1);
                }

                const avgReconnectMin = reconnectSeconds.length ? (reconnectSeconds.reduce((a, b) => a + b, 0) / reconnectSeconds.length / 60).toFixed(1) : 'N/A';

                const quickReconnects = reconnectSeconds.filter(s => s <= 300).length;

                const daysSpanned = totalRangeSec / 86400;

                const uptimeScore = parseFloat(percentConnected) || 0;

                // New calculations for stability scores
                let sessionSecondsSorted = [...sessionSeconds].sort((a, b) => a - b);
                let medianSessionSec = 0;
                if (numSessions > 0) {
                    const mid = Math.floor(numSessions / 2);
                    medianSessionSec = numSessions % 2 ? sessionSecondsSorted[mid] : (sessionSecondsSorted[mid - 1] + sessionSecondsSorted[mid]) / 2;
                }
                const medianSessionMin = numSessions ? (medianSessionSec / 60).toFixed(1) : 'N/A';

                const dailyData = {};
                reconnects.forEach(reconn => {
                    const dayKey = reconn.dateObj.toLocaleDateString();
                    if (!dailyData[dayKey]) {
                        dailyData[dayKey] = { fast: 0, quick: 0 };
                    }
                    if (reconn.sec < 30) {
                        dailyData[dayKey].fast++;
                    }
                    if (reconn.sec <= 300) {
                        dailyData[dayKey].quick++;
                    }
                });

                let totalFastBonus = 0;
                let totalFlappingPenalty = 0;
                Object.values(dailyData).forEach(daily => {
                    const bonus = Math.min(daily.fast * 3, 18);
                    totalFastBonus += bonus;

                    const excessFast = Math.max(0, daily.fast - 6);
                    const nonFastQuick = daily.quick - daily.fast;
                    const dailyPenalty = (excessFast + nonFastQuick) * 5;
                    totalFlappingPenalty += dailyPenalty;
                });

                const scaleFactor = Math.max(1, daysSpanned / 30);
                let flappingPenalty = totalFlappingPenalty / scaleFactor;
                let longOutagePenalty = longDisconnects.length * 10 / scaleFactor;

                const getSessionBonus = (metricMin) => {
                    const metricHours = parseFloat(metricMin) / 60 || 0;
                    return 25 * Math.tanh(metricHours / 6);
                };

                const uptimeComponent = uptimeScore * 0.6;

                const sessionBonusMean = getSessionBonus(avgSessionMin);
                const rawMeanScore = uptimeComponent + sessionBonusMean + totalFastBonus - flappingPenalty - longOutagePenalty;
                const meanStabilityScore = Math.max(0, Math.min(100, rawMeanScore)).toFixed(0);

                const sessionBonusMedian = getSessionBonus(medianSessionMin);
                const rawMedianScore = uptimeComponent + sessionBonusMedian + totalFastBonus - flappingPenalty - longOutagePenalty;
                const medianStabilityScore = Math.max(0, Math.min(100, rawMedianScore)).toFixed(0);

                function formatDuration(sec) {
                    if (sec <= 0) return '0s';
                    const d = Math.floor(sec / 86400);
                    const h = Math.floor((sec % 86400) / 3600);
                    const m = Math.floor((sec % 3600) / 60);
                    const s = Math.round(sec % 60);

                    let parts = [];
                    if (d > 0) parts.push(`${d}d`);
                    if (h > 0) parts.push(`${h}h`);
                    if (m > 0) parts.push(`${m}m`);
                    if (s > 0 || parts.length === 0) parts.push(`${s}s`);

                    return parts.join(' ');
                }

                const monitoringPeriod = firstDate && lastDate
                    ? `${firstDate.toLocaleString()} to ${lastDate.toLocaleString()}`
                    : 'N/A';

                let csvContent = 'Date,Status\n';
                cleanedEntries.forEach(e => {
                    csvContent += `"${e.dateObj.toLocaleString()}","${e.status}"\n`;
                });

                const sessionBins = [0, 0, 0, 0, 0];
                sessionSeconds.forEach(sec => {
                    const min = sec / 60;
                    if (min <= 5) sessionBins[0]++;
                    else if (min <= 30) sessionBins[1]++;
                    else if (min <= 60) sessionBins[2]++;
                    else if (min <= 240) sessionBins[3]++;
                    else sessionBins[4]++;
                });

                const reconnectBins = [0, 0, 0, 0];
                reconnectSeconds.forEach(sec => {
                    const min = sec / 60;
                    if (min <= 1) reconnectBins[0]++;
                    else if (min <= 5) reconnectBins[1]++;
                    else if (min <= 30) reconnectBins[2]++;
                    else reconnectBins[3]++;
                });

                disconnectDates.sort((a, b) => a - b);
                const rolling7Day = [];
                const rollingLabels = [];
                const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

                let currentDate = new Date(firstDate || Date.now());
                currentDate.setHours(0,0,0,0);

                while (currentDate <= (lastDate || new Date())) {
                    const windowStart = new Date(currentDate - sevenDaysMs);
                    const count = disconnectDates.filter(d => d >= windowStart && d <= currentDate).length;
                    rolling7Day.push(count);
                    rollingLabels.push(currentDate.toLocaleDateString());
                    currentDate = new Date(currentDate.getTime() + 24*60*60*1000);
                }

                let longDisconnectsHTML = '';
                if (longDisconnects.length === 0) {
                    longDisconnectsHTML = '<p style="font-style:italic; color:#666;">No disconnects longer than 30 minutes.</p>';
                } else {
                    longDisconnectsHTML = `
                    <div id="longDisconnectsContainer" style="display:block; margin-top:20px;">
                        <table style="width:100%; font-size:16px; border-collapse:collapse;">
                            <tr style="background:#fcc;">
                                <th style="padding:12px; text-align:left;">Disconnected At</th>
                                <th style="padding:12px; text-align:left;">Reconnected At</th>
                                <th style="padding:12px; text-align:right;">Duration</th>
                            </tr>`;
                    longDisconnects.forEach(ld => {
                        const durationStr = formatDuration(ld.durationSec);
                        longDisconnectsHTML += `
                            <tr style="background:#fee;">
                                <td style="padding:12px;">${ld.stopDate.toLocaleString()}</td>
                                <td style="padding:12px;">${ld.startDate.toLocaleString()}</td>
                                <td style="padding:12px; text-align:right;"><b>${durationStr}</b></td>
                            </tr>`;
                    });
                    longDisconnectsHTML += '</table></div>';
                }

                const longDisconnSection = longDisconnects.length > 0
                    ? `
                        <div class="collapsible-header" id="longDisconnectsHeader" onclick="toggleLongDisconnects()">
                            Long Disconnects (>30 minutes): ${longDisconnects.length} — click to collapse
                        </div>
                        ${longDisconnectsHTML}
                      `
                    : '<p style="font-style:italic; color:#666;">No disconnects longer than 30 minutes.</p>';

                const reportHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>NovaSubscriber Session Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        button.export-btn { padding: 12px 24px; margin: 10px; font-size: 18px; background: #006400; color: white; border: none; border-radius: 8px; cursor: pointer; }
        button.export-btn:hover { background: #008000; }
        .stability-score { font-size: 48px; font-weight: bold; text-align: center; margin: 20px 0; cursor: help; position: relative; }
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
        <div class="stability-score ${meanStabilityScore >= 80 ? 'score-good' : meanStabilityScore >= 50 ? 'score-fair' : 'score-poor'}">
            Stability Score (Mean-Based): ${meanStabilityScore}/100
            <span class="tooltip">
                <strong>How this score is calculated (using average session length, more sensitive to frequent short sessions):</strong><br><br>
                • Uptime component: ${percentConnected}% × 0.6 = ${uptimeComponent.toFixed(1)}<br>
                • Session quality bonus: ${sessionBonusMean.toFixed(1)}<br>
                • Fast recovery bonus (<30s, capped 18/day): ${totalFastBonus.toFixed(1)}<br>
                • Flapping penalty: -${flappingPenalty.toFixed(1)}<br>
                • Long outage penalty (>30min): -${longOutagePenalty.toFixed(1)}<br><br>
                <span class="formula">Raw score: ${rawMeanScore.toFixed(1)}</span>
                <span class="formula">Displayed score (clamped 0–100): ${meanStabilityScore}/100</span><br>
                Penalties scaled by timespan for fairness over long periods.
            </span>
        </div>
        <div class="stability-score ${medianStabilityScore >= 80 ? 'score-good' : medianStabilityScore >= 50 ? 'score-fair' : 'score-poor'}">
            Stability Score (Median-Based): ${medianStabilityScore}/100
            <span class="tooltip">
                <strong>How this score is calculated (using median session length, more resistant to outliers):</strong><br><br>
                • Uptime component: ${percentConnected}% × 0.6 = ${uptimeComponent.toFixed(1)}<br>
                • Session quality bonus: ${sessionBonusMedian.toFixed(1)}<br>
                • Fast recovery bonus (<30s, capped 18/day): ${totalFastBonus.toFixed(1)}<br>
                • Flapping penalty: -${flappingPenalty.toFixed(1)}<br>
                • Long outage penalty (>30min): -${longOutagePenalty.toFixed(1)}<br><br>
                <span class="formula">Raw score: ${rawMedianScore.toFixed(1)}</span>
                <span class="formula">Displayed score (clamped 0–100): ${medianStabilityScore}/100</span><br>
                Penalties scaled by timespan for fairness over long periods.
            </span>
        </div>
        <h2 style="text-align:center; color:#555; font-size:22px; margin:20px 0;">
            ${pages} pages | ${allEntries.length} raw records (${cleanedEntries.length} after de-duplication)
        </h2>
        <h3 style="text-align:center; color:#777; font-size:18px; margin-bottom:30px;">
            Monitoring period: ${monitoringPeriod} (${daysSpanned.toFixed(1)} days spanned)
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

        ${longDisconnSection}

        <table style="width:100%; font-size:18px; border-collapse:collapse; margin-top:40px;">
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Number of Sessions</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${numSessions}</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">Number of Disconnects</td><td style="padding:18px; text-align:right; background:#f0f8f0;"><b>${disconnects}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Reconnects Within 5 Minutes</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${quickReconnects}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Longest Continuous Connected</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${formatDuration(longestSessionMin * 60)}</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">Shortest Session Length</td><td style="padding:18px; text-align:right; background:#f0f8f0;"><b>${shortestSessionMin === 'N/A' ? 'N/A' : formatDuration(shortestSessionMin * 60)}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Average Session Length</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${avgSessionMin} minutes</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">95th Percentile Reconnect Time</td><td style="padding:18px; text-align:right; background:#f0f8f0;"><b>${p95ReconnectMin} minutes</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Average Time to Reconnect</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${avgReconnectMin} minutes</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">Median Time to Reconnect</td><td style="padding:18px; text-align:right; background:#f0f8f0;"><b>${medianReconnectMin} minutes</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Peak Disconnect Hour</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${peakHourStr}</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">Peak Disconnect Day</td><td style="padding:18px; text-align:right; background:#f0f8f0;"><b>${peakDayStr}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Disconnects (Business Hours 8AM-6PM)</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${businessDisconnects}</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">Disconnects (Off-Hours)</td><td style="padding:18px; text-align:right; background:#f0f8f0;"><b>${offHoursDisconnects}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Time Since Last Disconnect</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${timeSinceLastStr}</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">Average Disconnects per Day</td><td style="padding:18px; text-align:right; background:#f0f8f0;"><b>${avgDaily}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Total Time Connected</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${formatDuration(totalConnectedSec)}</b></td></tr>
            <tr><td style="padding:18px; background:#f0f8f0; font-weight:bold;">Total Time Disconnected</td><td style="padding:18px; text-align:right; background:#f0f8f0;"><b>${formatDuration(totalDisconnectedSec)}</b></td></tr>
            <tr><td style="padding:18px; background:#e8f5e8; font-weight:bold;">Percent of Time Connected</td><td style="padding:18px; text-align:right; background:#e8f5e8;"><b>${percentConnected}%</b></td></tr>
        </table>

        <div style="text-align:center; margin-top:60px;">
            <button class="export-btn" onclick="window.print()">Export to PDF (Print)</button>
            <button class="export-btn" id="csvBtn">Export Cleaned Data to CSV</button>
            <button class="export-btn" id="htmlBtn">Export Full Report as HTML</button>
        </div>
    </div>

    <script>
        function toggleLongDisconnects() {
            const container = document.getElementById('longDisconnectsContainer');
            const header = document.getElementById('longDisconnectsHeader');
            const count = ${longDisconnects.length || 0};
            if (container.style.display === 'none' || container.style.display === '') {
                container.style.display = 'block';
                header.textContent = 'Long Disconnects (>30 minutes): ' + count + ' — click to collapse';
            } else {
                container.style.display = 'none';
                header.textContent = 'Long Disconnects (>30 minutes): ' + count + ' — click to expand';
            }
        }

        const ctxHourly = document.getElementById('hourlyChart').getContext('2d');
        new Chart(ctxHourly, {
            type: 'bar',
            data: {
                labels: Array.from({length: 24}, (_, i) => i + ':00'),
                datasets: [{
                    label: 'Disconnects by Hour',
                    data: [${hourlyDisconnects.join(',')}],
                    backgroundColor: '#006400'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' }, title: { display: true, text: 'Disconnects by Time of Day', font: { size: 20 } } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });

        const ctxDaily = document.getElementById('dailyChart').getContext('2d');
        new Chart(ctxDaily, {
            type: 'bar',
            data: {
                labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                datasets: [{
                    label: 'Disconnects by Day of Week',
                    data: [${dailyDisconnects.join(',')}],
                    backgroundColor: '#006400'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' }, title: { display: true, text: 'Disconnects by Day of Week', font: { size: 20 } } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });

        const ctxRolling = document.getElementById('rolling7DayChart').getContext('2d');
        new Chart(ctxRolling, {
            type: 'line',
            data: {
                labels: [${rollingLabels.map(l => `'${l.replace(/'/g, "\\'")}'`).join(',')}],
                datasets: [{
                    label: 'Disconnects in Last 7 Days',
                    data: [${rolling7Day.join(',')}],
                    borderColor: '#c00',
                    backgroundColor: 'rgba(200,0,0,0.1)',
                    fill: true,
                    tension: 0.2
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' }, title: { display: true, text: 'Rolling 7-Day Disconnect Count', font: { size: 20 } } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });

        const ctxSession = document.getElementById('sessionHist').getContext('2d');
        new Chart(ctxSession, {
            type: 'bar',
            data: {
                labels: ['0-5 min', '5-30 min', '30-60 min', '1-4 hours', '>4 hours'],
                datasets: [{
                    label: 'Number of Sessions',
                    data: [${sessionBins.join(',')}],
                    backgroundColor: '#228B22'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' }, title: { display: true, text: 'Session Length Distribution', font: { size: 20 } } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });

        const ctxReconnect = document.getElementById('reconnectHist').getContext('2d');
        new Chart(ctxReconnect, {
            type: 'bar',
            data: {
                labels: ['0-1 min', '1-5 min', '5-30 min', '>30 min'],
                datasets: [{
                    label: 'Number of Reconnects',
                    data: [${reconnectBins.join(',')}],
                    backgroundColor: '#8B0000'
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' }, title: { display: true, text: 'Reconnect Time Distribution', font: { size: 20 } } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });

        document.getElementById('csvBtn').addEventListener('click', function() {
            const csv = \`${csvContent.replace(/`/g, '\\`')}\`;
            const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'nova_subscriber_cleaned_logs.csv';
            a.click();
            URL.revokeObjectURL(url);
        });

        document.getElementById('htmlBtn').addEventListener('click', function() {
            const htmlContent = document.documentElement.outerHTML;
            const blob = new Blob([htmlContent], {type: 'text/html;charset=utf-8;'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'nova-subscriber-report.html';
            a.click();
            URL.revokeObjectURL(url);
        });
    </script>
</body>
</html>`;

                const win = window.open('', '_blank');
                if (win) {
                    win.document.open();
                    win.document.write(reportHTML);
                    win.document.close();
                } else {
                    alert('Popup blocked. Please allow popups for admin.neonova.net and try again.');
                }

                localStorage.removeItem('novaAnalysisMode');
                localStorage.removeItem('novaPages');
                localStorage.removeItem('novaEntries');

                button.textContent = 'Report Complete!';
                button.style.backgroundColor = '#008000';
                button.disabled = true;
            }, 300);
        }
    }
})();
