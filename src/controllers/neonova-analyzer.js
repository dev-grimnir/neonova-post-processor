class NeonovaAnalyzer {
    /**
     * Computes metrics from the cleaned entries array.
     * This is the main static method — pass cleanedEntries directly.
     * All analysis logic is performed internally using local variables.
     * 
     * @param {Array} cleanedEntries - The array of cleaned log entries (sorted oldest → newest)
     * @returns {Object} The computed metrics object
     */
    static computeMetrics(cleanedEntries) {
        if (!Array.isArray(cleanedEntries) && cleanedEntries?.cleanedEntries) {
            console.log(`[Report] Extracted ${cleanedEntries.cleanedEntries.length} cleaned entries from stats object`);
            cleanedEntries = cleanedEntries.cleanedEntries;
        }
        
        if (!cleanedEntries || cleanedEntries.length === 0) {
            return {}; // or default metrics object
        }

        // Local variables replacing original instance properties
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

        // Analysis logic (original analyze() body)
        let currentState = null;
        let lastTransitionTime = null;

        cleanedEntries.forEach(entry => {
            const date = entry.dateObj;
            const ts = date.getTime();

            if (!firstDate) firstDate = date;
            lastDate = date;

            if (entry.status === "Start") {
                if (currentState === "down" || currentState === null) {
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
            } else if (entry.status === "Stop") {
                disconnects++;
                const hour = date.getHours();
                hourlyDisconnects[hour]++;
                hourlyCount[hour]++;
                const dayKey = date.toLocaleDateString();
                dailyCount[dayKey] = (dailyCount[dayKey] || 0) + 1;
                dayOfWeekDisconnects[date.getDay()]++;
                if (currentState === "up" || currentState === null) {
                    if (currentState === "up" && lastTransitionTime !== null) {
                        const duration = (ts - lastTransitionTime) / 1000;
                        if (duration > 0) sessionSeconds.push(duration);
                    }
                    currentState = "down";
                    lastTransitionTime = ts;
                    lastDisconnectDate = date;
                    disconnectDates.push(date);
                }
            }
        });

        if (currentState === "up" && lastTransitionTime !== null && lastDate) {
            const finalDuration = (lastDate.getTime() - lastTransitionTime) / 1000;
            if (finalDuration > 0) sessionSeconds.push(finalDuration);
        }

        // Original computeMetrics logic continues here with local vars
        const sortedKeys = Object.keys(dailyCount).sort((a, b) => new Date(a) - new Date(b));
        const sortedDailyDisconnects = sortedKeys.map(k => dailyCount[k]);
    
        const peakHourCount = Math.max(...hourlyCount);
        const peakHour = hourlyCount.indexOf(peakHourCount);
        const peakHourStr = peakHourCount > 0 ? `${peakHour}:00-${peakHour + 1}:00 (${peakHourCount} disconnects)` : 'None';
    
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
    
        const totalConnectedSec = sessionSeconds.reduce((a, b) => a + b, 0) || 0;
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
    
        let sessionSecondsSorted = [...sessionSeconds].sort((a, b) => a - b);
        let medianSessionSec = 0;
        if (numSessions > 0) {
            const mid = Math.floor(numSessions / 2);
            medianSessionSec = numSessions % 2 ? sessionSecondsSorted[mid] : (sessionSecondsSorted[mid - 1] + sessionSecondsSorted[mid]) / 2;
        }
        const medianSessionMin = numSessions ? (medianSessionSec / 60).toFixed(1) : 'N/A';
    
        // ──────────────────────────────────────────────
        // NEW SCORING - uptime dominant, penalties capped
        // ──────────────────────────────────────────────
    
        const UPTIME_WEIGHT = 0.90;
        const SESSION_BONUS_MAX = 20;
        const FAST_RECOVERY_MAX = 12;
        const FLAPPING_PENALTY_MAX = 22;
        const LONG_OUTAGE_PENALTY_MAX = 28;
        const MIN_SCORE_FLOOR = 30;
    
        const days = Math.max(daysSpanned || 1, 1);
    
        // Uptime base
        const uptimePoints = uptimeScore * UPTIME_WEIGHT;
    
        // Session bonus (no scaling for long periods)
        const sessionBonusMean = Math.min(SESSION_BONUS_MAX, getSessionBonus(avgSessionMin) || 0);
        const sessionBonusMedian = Math.min(SESSION_BONUS_MAX, getSessionBonus(medianSessionMin) || 0);
    
        // Fast recovery bonus
        const totalReconnects = reconnectSeconds.length;
        const quickRatio = totalReconnects > 0 
            ? reconnectSeconds.filter(s => s <= 300).length / totalReconnects 
            : 0;
        const fastBonus = Math.min(FAST_RECOVERY_MAX, quickRatio * 50);
    
        // Flapping penalty
        const shortDisconnects = disconnects - longDisconnects.length;
        const flapsPerDay = shortDisconnects / days;
        const flappingPenalty = -Math.min(FLAPPING_PENALTY_MAX, Math.pow(flapsPerDay + 1, 1.3) * 4);
    
        // Long outage penalty
        const longOutagesPerWeek = (longDisconnects.length / days) * 7;
        const longOutagePenalty = -Math.min(LONG_OUTAGE_PENALTY_MAX, longOutagesPerWeek * 8);
    
        // Raw scores
        let rawMeanScore = uptimePoints + sessionBonusMean + fastBonus + flappingPenalty + longOutagePenalty;
        if (uptimeScore >= 90) {
            rawMeanScore = Math.max(MIN_SCORE_FLOOR, rawMeanScore);
        }
        rawMeanScore = Math.max(0, Math.min(100, rawMeanScore));
    
        let rawMedianScore = uptimePoints + sessionBonusMedian + fastBonus + flappingPenalty + longOutagePenalty;
        if (uptimeScore >= 90) {
            rawMedianScore = Math.max(MIN_SCORE_FLOOR, rawMedianScore);
        }
        rawMedianScore = Math.max(0, Math.min(100, rawMedianScore));
    
        // Local metrics object
        const metrics = {};
        metrics.uptimeComponent = uptimePoints.toFixed(1);
        metrics.sessionBonusMean = sessionBonusMean.toFixed(1);
        metrics.sessionBonusMedian = sessionBonusMedian.toFixed(1);
        metrics.totalFastBonus = fastBonus.toFixed(1);
        metrics.flappingPenalty = Math.abs(flappingPenalty).toFixed(1);
        metrics.longOutagePenalty = Math.abs(longOutagePenalty).toFixed(1);
        metrics.rawMeanScore = rawMeanScore.toFixed(1);
        metrics.meanStabilityScore = Math.round(rawMeanScore);
        metrics.rawMedianScore = rawMedianScore.toFixed(1);
        metrics.medianStabilityScore = Math.round(rawMedianScore);

        const rolling = this.computeRolling7Day(disconnectDates, firstDate, lastDate);
        console.log('=== ANALYZER ROLLING DEBUG ===');
        console.log('raw rolling object from computeRolling7Day:', rolling);
        console.log('rolling7Day type:', typeof rolling.rolling7Day, '— isArray?', Array.isArray(rolling.rolling7Day));
        console.log('rolling7Day length:', rolling.rolling7Day?.length);
        console.log('rolling7Day sample (first 10):', rolling.rolling7Day?.slice(0,10));
        console.log('rollingLabels sample:', rolling.rollingLabels?.slice(0,5));

        // Return final metrics object
        return {
            peakHourStr,
            peakDayStr,
            businessDisconnects,
            offHoursDisconnects,
            timeSinceLastStr,
            avgDaily,
            totalConnectedSec,
            totalDisconnectedSec,
            percentConnected,
            numSessions,
            avgSessionMin,
            longestSessionMin,
            shortestSessionMin,
            medianReconnectMin,
            p95ReconnectMin,
            avgReconnectMin,
            quickReconnects,
            daysSpanned,
            uptimeComponent: metrics.uptimeComponent,
            sessionBonusMean: metrics.sessionBonusMean,
            sessionBonusMedian: metrics.sessionBonusMedian,
            totalFastBonus: metrics.totalFastBonus,
            flappingPenalty: metrics.flappingPenalty,
            longOutagePenalty: metrics.longOutagePenalty,
            meanStabilityScore: metrics.meanStabilityScore,
            medianStabilityScore: metrics.medianStabilityScore,
            rawMeanScore: metrics.rawMeanScore,
            rawMedianScore: metrics.rawMedianScore,
            monitoringPeriod: firstDate && lastDate 
                ? `${firstDate.toLocaleString()} to ${lastDate.toLocaleString()}` 
                : 'N/A',
            sessionBins: this.computeSessionBins(sessionSeconds),
            reconnectBins: this.computeReconnectBins(reconnectSeconds),
            rolling7Day: rolling.rolling7Day || [],
            rollingLabels: rolling.rollingLabels || [], 
            longDisconnects: longDisconnects,
            disconnects: disconnects,
            hourlyDisconnects: hourlyDisconnects,
            cleanedEntriesLength: cleanedEntries.length,
            dailyDisconnects: sortedDailyDisconnects,
            dailyLabels: sortedKeys,
            hourlyCount: hourlyCount
        };
    }

    static computeSessionBins(sessionSeconds) {
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

    static computeReconnectBins(reconnectSeconds) {
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

    static computeRolling7Day(disconnectDates, firstDate, lastDate) {
        if (disconnectDates === undefined || disconnectDates === null) {
            disconnectDates = [];
        }
    
        disconnectDates.sort((a, b) => a - b);

        console.log('[Rolling Debug] Input:', {
            disconnectCount: disconnectDates.length,
            firstDate: firstDate?.toISOString(),
            lastDate: lastDate?.toISOString()
        });
    
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

        console.log('[Rolling Debug] Output sample:', {
                labelsCount: rollingLabels.length,
                dataSample: rolling7Day.slice(0, 5),  // first 5 values
                labelsSample: rollingLabels.slice(0, 5)
            });
        
        return { rolling7Day, rollingLabels };
    }
}
