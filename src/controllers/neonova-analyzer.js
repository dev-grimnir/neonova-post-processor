/**
 * Static utility class for analyzing cleaned RADIUS log entries.
 * No instance needed — call NeonovaAnalyzer.computeMetrics(...) directly.
 * 
 * Input: array of LogEntry objects + optional ignored count
 * Output: full metrics object (same shape as before)
 */
class NeonovaAnalyzer {

    // ────────────────────────────────────────────────
    // All private static helpers — take params, no 'this'
    // ────────────────────────────────────────────────

    static #recordReconnect(downTime, upTime, reconnectSeconds, reconnects, longDisconnects) {
        const reconnectSec = (upTime - downTime) / 1000;
        if (reconnectSec <= 0) return;

        reconnectSeconds.push(reconnectSec);
        reconnects.push({ dateObj: new Date(upTime), sec: reconnectSec });

        if (reconnectSec > 1800) {  // 30 minutes
            longDisconnects.push({
                stopDate: new Date(downTime),
                startDate: new Date(upTime),
                durationSec: reconnectSec
            });
        }
    }

    static #recordDisconnect(entry, disconnects, hourlyDisconnects, hourlyCount, dailyCount, dayOfWeekDisconnects, disconnectDates) {
        disconnects++;

        const date = entry.dateObj;
        const hour = date.getHours();

        hourlyDisconnects[hour]++;
        hourlyCount[hour]++;

        const dayKey = date.toLocaleDateString();
        dailyCount[dayKey] = (dailyCount[dayKey] || 0) + 1;

        dayOfWeekDisconnects[date.getDay()]++;

        disconnectDates.push(date);
    }

    static #recordSessionDuration(startTime, stopTime, sessionSeconds) {
        const duration = (stopTime - startTime) / 1000;
        if (duration > 0) sessionSeconds.push(duration);
    }

    static #calculateDaysSpanned(firstDate, lastDate) {
        if (!firstDate || !lastDate) return 0;
        return (lastDate - firstDate) / (1000 * 86400);
    }

    static #calculatePeakHourStr(hourlyCount) {
        const peakHourCount = Math.max(...hourlyCount);
        const peakHour = hourlyCount.indexOf(peakHourCount);
        return peakHourCount > 0 
            ? `${peakHour}:00-${peakHour + 1}:00 (${peakHourCount} disconnects)` 
            : 'None';
    }

    static #calculatePeakDayStr(dailyCount) {
        let peakDayStr = 'None';
        let peakDayCount = 0;

        for (const [day, count] of Object.entries(dailyCount)) {
            if (count > peakDayCount) {
                peakDayCount = count;
                peakDayStr = `${day} (${count} disconnects)`;
            }
        }
        return peakDayStr;
    }

    static #calculateBusinessVsOffHours(hourlyDisconnects) {
        let business = 0;
        let offHours = 0;

        for (let h = 0; h < 24; h++) {
            if (h >= 8 && h < 18) business += hourlyDisconnects[h];
            else offHours += hourlyDisconnects[h];
        }
        return { businessDisconnects: business, offHoursDisconnects: offHours };
    }

    static #calculateTimeSinceLastDisconnect(lastDisconnectDate) {
        if (!lastDisconnectDate) return 'N/A';
        const sinceSec = (new Date() - lastDisconnectDate) / 1000;
        return this.#formatDuration(sinceSec) + ' ago';
    }

    static #formatDuration(seconds) {
        if (seconds < 60) return seconds + 's';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
        return Math.floor(seconds / 86400) + 'd ' + Math.floor((seconds % 86400) / 3600) + 'h';
    }

    static #calculateAverageDailyDisconnects(dailyCount) {
        const values = Object.values(dailyCount);
        return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : '0';
    }

    static #calculateSessionStatistics(sessionSeconds) {
        const numSessions = sessionSeconds.length;

        const avgSessionMin = numSessions 
            ? (sessionSeconds.reduce((a, b) => a + b, 0) / numSessions / 60).toFixed(1) 
            : 'N/A';

        const longestSessionMin = numSessions ? Math.max(...sessionSeconds) / 60 : 0;
        const shortestSessionMin = numSessions 
            ? Math.min(...sessionSeconds.filter(s => s > 0)) / 60 
            : 'N/A';

        let medianSessionMin = 'N/A';
        if (numSessions > 0) {
            const sorted = [...sessionSeconds].sort((a, b) => a - b);
            const mid = Math.floor(numSessions / 2);
            const medianSec = numSessions % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            medianSessionMin = (medianSec / 60).toFixed(1);
        }

        return { numSessions, avgSessionMin, longestSessionMin, shortestSessionMin, medianSessionMin };
    }

    static #calculateReconnectStatistics(reconnectSeconds) {
        const count = reconnectSeconds.length;

        const avgReconnectMin = count 
            ? (reconnectSeconds.reduce((a, b) => a + b, 0) / count / 60).toFixed(1) 
            : 'N/A';

        let medianReconnectMin = 'N/A';
        let p95ReconnectMin = 'N/A';

        if (count > 0) {
            const sorted = [...reconnectSeconds].sort((a, b) => a - b);
            const mid = Math.floor(count / 2);
            const medianSec = count % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            medianReconnectMin = (medianSec / 60).toFixed(1);

            const p95Index = Math.floor(count * 0.95);
            const p95Sec = sorted[p95Index];
            p95ReconnectMin = (p95Sec / 60).toFixed(1);
        }

        const quickReconnects = reconnectSeconds.filter(s => s <= 300).length;

        return { avgReconnectMin, medianReconnectMin, p95ReconnectMin, quickReconnects };
    }

    static #calculateUptimeAndPercentConnected(sessionSeconds, firstDate, lastDate) {
        const totalConnectedSec = sessionSeconds.reduce((a, b) => a + b, 0) || 0;
        const totalRangeSec = firstDate && lastDate ? (lastDate - firstDate) / 1000 : 1;

        const totalDisconnectedSec = totalRangeSec - totalConnectedSec;
        const percentConnected = totalRangeSec > 0 ? (totalConnectedSec / totalRangeSec * 100).toFixed(1) : 'N/A';

        const uptimeScore = parseFloat(percentConnected) || 0;

        return { totalConnectedSec, totalDisconnectedSec, percentConnected, uptimeScore };
    }

    static #computeStabilityScores(uptimeScore, avgSessionMin, medianSessionMin, daysSpanned, disconnects, longDisconnectCount, reconnectSeconds) {
        const UPTIME_WEIGHT = 0.90;
        const SESSION_BONUS_MAX = 20;
        const FAST_RECOVERY_MAX = 12;
        const FLAPPING_PENALTY_MAX = 22;
        const LONG_OUTAGE_PENALTY_MAX = 28;
        const MIN_SCORE_FLOOR = 30;

        const days = Math.max(daysSpanned || 1, 1);

        const uptimePoints = uptimeScore * UPTIME_WEIGHT;

        const sessionBonusMean = Math.min(SESSION_BONUS_MAX, this.#getSessionBonus(avgSessionMin) || 0);
        const sessionBonusMedian = Math.min(SESSION_BONUS_MAX, this.#getSessionBonus(medianSessionMin) || 0);

        const totalReconnects = reconnectSeconds.length;
        const quickRatio = totalReconnects > 0 ? reconnectSeconds.filter(s => s <= 300).length / totalReconnects : 0;
        const fastBonus = Math.min(FAST_RECOVERY_MAX, quickRatio * 50);

        const shortDisconnects = disconnects - longDisconnectCount;
        const flapsPerDay = shortDisconnects / days;
        const flappingPenalty = -Math.min(FLAPPING_PENALTY_MAX, Math.pow(flapsPerDay + 1, 1.3) * 4);

        const longOutagesPerWeek = (longDisconnectCount / days) * 7;
        const longOutagePenalty = -Math.min(LONG_OUTAGE_PENALTY_MAX, longOutagesPerWeek * 8);

        let rawMeanScore = uptimePoints + sessionBonusMean + fastBonus + flappingPenalty + longOutagePenalty;
        if (uptimeScore >= 90) rawMeanScore = Math.max(MIN_SCORE_FLOOR, rawMeanScore);
        rawMeanScore = Math.max(0, Math.min(100, rawMeanScore));

        let rawMedianScore = uptimePoints + sessionBonusMedian + fastBonus + flappingPenalty + longOutagePenalty;
        if (uptimeScore >= 90) rawMedianScore = Math.max(MIN_SCORE_FLOOR, rawMedianScore);
        rawMedianScore = Math.max(0, Math.min(100, rawMedianScore));

        return {
            uptimeComponent: uptimePoints.toFixed(1),
            sessionBonusMean: sessionBonusMean.toFixed(1),
            sessionBonusMedian: sessionBonusMedian.toFixed(1),
            totalFastBonus: fastBonus.toFixed(1),
            flappingPenalty: Math.abs(flappingPenalty).toFixed(1),
            longOutagePenalty: Math.abs(longOutagePenalty).toFixed(1),
            rawMeanScore: rawMeanScore.toFixed(1),
            meanStabilityScore: Math.round(rawMeanScore),
            rawMedianScore: rawMedianScore.toFixed(1),
            medianStabilityScore: Math.round(rawMedianScore)
        };
    }

    static #getSessionBonus(min) {
        if (!min || min <= 0) return 0;
        if (min <= 5) return 2;
        if (min <= 15) return 5;
        if (min <= 30) return 10;
        if (min <= 60) return 15;
        return 20;
    }

    static #computeSessionBins(sessionSeconds) {
        const bins = [0, 0, 0, 0, 0];
        sessionSeconds.forEach(sec => {
            const min = sec / 60;
            if (min <= 5) bins[0]++;
            else if (min <= 30) bins[1]++;
            else if (min <= 60) bins[2]++;
            else if (min <= 240) bins[3]++;
            else bins[4]++;
        });
        return bins;
    }

    static #computeReconnectBins(reconnectSeconds) {
        const bins = [0, 0, 0, 0];
        reconnectSeconds.forEach(sec => {
            const min = sec / 60;
            if (min <= 1) bins[0]++;
            else if (min <= 5) bins[1]++;
            else if (min <= 30) bins[2]++;
            else bins[3]++;
        });
        return bins;
    }

    static #computeRolling7Day(disconnectDates, firstDate, lastDate) {
        if (!disconnectDates || disconnectDates.length === 0) return [];

        disconnectDates = [...disconnectDates].sort((a, b) => a - b);

        const rolling7Day = [];
        const rollingLabels = [];
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        let currentDate = new Date(firstDate || Date.now());
        currentDate.setHours(0, 0, 0, 0);

        while (currentDate <= (lastDate || new Date())) {
            const windowStart = new Date(currentDate - sevenDaysMs);
            const count = disconnectDates.filter(d => d >= windowStart && d <= currentDate).length;
            rolling7Day.push(count);
            rollingLabels.push(currentDate.toLocaleDateString());
            currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        }

        return rolling7Day;
    }

    static #computeRolling7DayLabels(firstDate, lastDate) {
        if (!firstDate || !lastDate) return [];

        const labels = [];
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        let currentDate = new Date(firstDate);
        currentDate.setHours(0, 0, 0, 0);

        while (currentDate <= lastDate) {
            labels.push(currentDate.toLocaleDateString());
            currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        }

        return labels;
    }

    /**
     * Scans backward from the most recent entry to find the timestamp of the last "Stop" event.
     * @param {Array<LogEntry>} cleanedEntries
     * @returns {Date|null} Timestamp of the most recent Stop, or null if none
     */
    static #getLastStopDate(cleanedEntries) {
        if (!cleanedEntries || cleanedEntries.length === 0) return null;
    
        // Start from the end (most recent)
        for (let i = cleanedEntries.length - 1; i >= 0; i--) {
            if (cleanedEntries[i].status === 'Stop') {
                return cleanedEntries[i].dateObj;
            }
        }
    
        return null;
    }

    /**
     * Computes all metrics from cleaned entries.
     * This is the only public method — everything else is private/static.
     * 
     * @param {Array<LogEntry>} cleanedEntries - Array of cleaned LogEntry objects
     * @param {number} [ignoredEntriesCount=0] - From collector.cleanEntries
     * @returns {Object} Complete metrics object
     */
    static computeMetrics(cleanedEntries, ignoredEntriesCount = 0) {
        if (!Array.isArray(cleanedEntries) || cleanedEntries.length === 0) {
            return null;
        }

        // All state is local — no 'this'
        let disconnects = 0;
        let sessionSeconds = [];
        let reconnectSeconds = [];
        let reconnects = [];
        let longDisconnects = [];
        let firstDate = null;
        let lastDate = null;
        let lastDisconnectDate = null;
        let hourlyDisconnects = Array(24).fill(0);
        let dayOfWeekDisconnects = Array(7).fill(0);
        let hourlyCount = Array(24).fill(0);
        let dailyCount = {};
        let disconnectDates = [];

        let currentState = null;
        let lastTransitionTime = null;

        // Main processing loop
        cleanedEntries.forEach(entry => {
            const date = entry.dateObj;
            const ts = date.getTime();

            if (!firstDate) firstDate = date;
            lastDate = date;

            if (entry.status === "Start") {
                if (currentState === "down" && lastTransitionTime !== null) {
                    this.#recordReconnect(lastTransitionTime, ts, reconnectSeconds, reconnects, longDisconnects);
                }
                currentState = "up";
                lastTransitionTime = ts;
            } else if (entry.status === "Stop") {
                this.#recordDisconnect(entry, disconnects, hourlyDisconnects, hourlyCount, dailyCount, dayOfWeekDisconnects, disconnectDates);
                lastDisconnectDate = date;

                if (currentState === "up" && lastTransitionTime !== null) {
                    this.#recordSessionDuration(lastTransitionTime, ts, sessionSeconds);
                }

                currentState = "down";
                lastTransitionTime = ts;
            }
        });

        // Finalize open session
        if (currentState === "up" && lastTransitionTime !== null && lastDate) {
            const finalDuration = (lastDate.getTime() - lastTransitionTime) / 1000;
            if (finalDuration > 0) sessionSeconds.push(finalDuration);
        }

        const lastStopDate = this.#getLastStopDate(cleanedEntries);
        
        const timeSinceLastStr = lastStopDate
            ? `${this.#formatDuration((new Date() - lastStopDate) / 1000)} ago (last disconnect: ${lastStopDate.toLocaleString()})`
            : 'No disconnects recorded';
        
        // Compute derived stats
        const daysSpanned = firstDate && lastDate ? (lastDate - firstDate) / (1000 * 86400) : 0;

        const peakHourStr = this.#calculatePeakHourStr(hourlyCount);
        const peakDayStr = this.#calculatePeakDayStr(dailyCount);
        const { businessDisconnects, offHoursDisconnects } = this.#calculateBusinessVsOffHours(hourlyDisconnects);
        const avgDaily = this.#calculateAverageDailyDisconnects(dailyCount);

        const sessionStats = this.#calculateSessionStatistics(sessionSeconds);
        const reconnectStats = this.#calculateReconnectStatistics(reconnectSeconds);
        const uptimeStats = this.#calculateUptimeAndPercentConnected(sessionSeconds, firstDate, lastDate);

        const scoring = this.#computeStabilityScores(
            uptimeStats.uptimeScore,
            sessionStats.avgSessionMin,
            sessionStats.medianSessionMin,
            daysSpanned,
            disconnects,
            longDisconnects.length,
            reconnectSeconds
        );

        // Build final object (same shape as original)
        const sortedKeys = Object.keys(dailyCount).sort((a, b) => new Date(a) - new Date(b));
        const sortedDailyDisconnects = sortedKeys.map(k => dailyCount[k]);

        return {
            peakHourStr,
            peakDayStr,
            businessDisconnects,
            offHoursDisconnects,
            timeSinceLastStr,
            avgDaily,
            daysSpanned,
            totalConnectedSec: uptimeStats.totalConnectedSec,
            totalDisconnectedSec: uptimeStats.totalDisconnectedSec,
            percentConnected: uptimeStats.percentConnected,
            numSessions: sessionStats.numSessions,
            avgSessionMin: sessionStats.avgSessionMin,
            longestSessionMin: sessionStats.longestSessionMin,
            shortestSessionMin: sessionStats.shortestSessionMin,
            medianSessionMin: sessionStats.medianSessionMin,
            avgReconnectMin: reconnectStats.avgReconnectMin,
            medianReconnectMin: reconnectStats.medianReconnectMin,
            p95ReconnectMin: reconnectStats.p95ReconnectMin,
            quickReconnects: reconnectStats.quickReconnects,
            uptimeComponent: scoring.uptimeComponent,
            sessionBonusMean: scoring.sessionBonusMean,
            sessionBonusMedian: scoring.sessionBonusMedian,
            totalFastBonus: scoring.totalFastBonus,
            flappingPenalty: scoring.flappingPenalty,
            longOutagePenalty: scoring.longOutagePenalty,
            rawMeanScore: scoring.rawMeanScore,
            meanStabilityScore: scoring.meanStabilityScore,
            rawMedianScore: scoring.rawMedianScore,
            medianStabilityScore: scoring.medianStabilityScore,
            monitoringPeriod: firstDate && lastDate 
                ? `${firstDate.toLocaleString()} to ${lastDate.toLocaleString()}` 
                : 'N/A',
            sessionBins: this.#computeSessionBins(sessionSeconds),
            reconnectBins: this.#computeReconnectBins(reconnectSeconds),
            rolling7Day: this.#computeRolling7Day(disconnectDates, firstDate, lastDate),
            rollingLabels: this.#computeRolling7DayLabels(firstDate, lastDate),
            longDisconnects,
            disconnects,
            hourlyDisconnects,
            cleanedEntriesLength: cleanedEntries.length,
            dailyDisconnects: sortedDailyDisconnects,
            dailyLabels: sortedKeys,
            hourlyCount,
            ignoredEntriesCount
        };
    }
}
