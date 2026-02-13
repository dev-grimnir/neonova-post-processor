class NeonovaAnalyzer {
    constructor(cleanedEntries) {
        this.cleanEntries = cleanedEntries;
        this.disconnects = 0;
        this.sessionSeconds = [];
        this.reconnectSeconds = [];
        this.reconnects = [];
        this.longDisconnects = [];
        this.firstDate = null;
        this.lastDate = null;
        this.lastDisconnectDate = null;
        this.hourlyDisconnects = Array(24).fill(0);
        this.dayOfWeekDisconnects = Array(7).fill(0); // Renamed for clarity
        this.hourlyCount = Array(24).fill(0);
        this.dailyCount = {};
        this.disconnectDates = []; 
        this.metrics = {};
        this.analyze();
    }

    analyze() {
        let currentState = null;
        let lastTransitionTime = null;

        this.cleanEntries.forEach(entry => {
            const date = entry.dateObj;
            const ts = date.getTime();

            if (!this.firstDate) this.firstDate = date;
            this.lastDate = date;

            if (entry.status === "Start") {
                if (currentState === "down" || currentState === null) {
                    if (currentState === "down" && lastTransitionTime !== null) {
                        const reconnectSec = (ts - lastTransitionTime) / 1000;
                        if (reconnectSec > 0) {
                            this.reconnectSeconds.push(reconnectSec);
                            this.reconnects.push({dateObj: date, sec: reconnectSec});
                            if (reconnectSec > 1800) {
                                this.longDisconnects.push({
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
                this.disconnects++;
                const hour = date.getHours();
                this.hourlyDisconnects[hour]++;
                this.hourlyCount[hour]++;
                const dayKey = date.toLocaleDateString();
                this.dailyCount[dayKey] = (this.dailyCount[dayKey] || 0) + 1;
                this.dayOfWeekDisconnects[date.getDay()]++;
                if (currentState === "up" || currentState === null) {
                    if (currentState === "up" && lastTransitionTime !== null) {
                        const duration = (ts - lastTransitionTime) / 1000;
                        if (duration > 0) this.sessionSeconds.push(duration);
                    }
                    currentState = "down";
                    lastTransitionTime = ts;
                    this.lastDisconnectDate = date;
                    this.disconnectDates.push(date);
                }
            }
        });

        if (currentState === "up" && lastTransitionTime !== null && this.lastDate) {
            const finalDuration = (this.lastDate.getTime() - lastTransitionTime) / 1000;
            if (finalDuration > 0) this.sessionSeconds.push(finalDuration);
        }

    }

    computeMetrics() {
        console.log('=== USING NEW SCORING v2 - Feb12 ===');
        const sortedKeys = Object.keys(this.dailyCount).sort((a, b) => new Date(a) - new Date(b));
        const sortedDailyDisconnects = sortedKeys.map(k => this.dailyCount[k]);

        const peakHourCount = Math.max(...this.hourlyCount);
        const peakHour = this.hourlyCount.indexOf(peakHourCount);
        const peakHourStr = peakHourCount > 0 ? `${peakHour}:00-${peakHour + 1}:00 (${peakHourCount} disconnects)` : 'None';

        let peakDayStr = 'None';
        let peakDayCount = 0;
        for (const [day, count] of Object.entries(this.dailyCount)) {
            if (count > peakDayCount) {
                peakDayCount = count;
                peakDayStr = `${day} (${count} disconnects)`;
            }
        }

        let businessDisconnects = 0;
        let offHoursDisconnects = 0;
        for (let h = 0; h < 24; h++) {
            if (h >= 8 && h < 18) businessDisconnects += this.hourlyDisconnects[h];
            else offHoursDisconnects += this.hourlyDisconnects[h];
        }

        let timeSinceLastStr = 'N/A';
        if (this.lastDisconnectDate) {
            const sinceSec = (new Date() - this.lastDisconnectDate) / 1000;
            timeSinceLastStr = formatDuration(sinceSec) + ' ago';
        }

        const dailyValues = Object.values(this.dailyCount);
        const avgDaily = dailyValues.length ? (dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length).toFixed(1) : '0';

        const totalConnectedSec = this.sessionSeconds.reduce((a, b) => a + b, 0) || 0;
        const totalRangeSec = this.firstDate && this.lastDate ? (this.lastDate - this.firstDate) / 1000 : 1;
        const totalDisconnectedSec = totalRangeSec - totalConnectedSec;
        const percentConnected = totalRangeSec > 0 ? (totalConnectedSec / totalRangeSec * 100).toFixed(1) : 'N/A';

        const numSessions = this.sessionSeconds.length;
        const avgSessionMin = numSessions ? (this.sessionSeconds.reduce((a, b) => a + b, 0) / numSessions / 60).toFixed(1) : 'N/A';
        const longestSessionMin = numSessions ? Math.max(...this.sessionSeconds) / 60 : 0;
        const shortestSessionMin = numSessions ? Math.min(...this.sessionSeconds.filter(s => s > 0)) / 60 : 'N/A';

        let medianReconnectMin = 'N/A';
        let p95ReconnectMin = 'N/A';
        if (this.reconnectSeconds.length > 0) {
            this.reconnectSeconds.sort((a, b) => a - b);
            const mid = Math.floor(this.reconnectSeconds.length / 2);
            const medianSec = this.reconnectSeconds.length % 2 ? this.reconnectSeconds[mid] : (this.reconnectSeconds[mid - 1] + this.reconnectSeconds[mid]) / 2;
            medianReconnectMin = (medianSec / 60).toFixed(1);

            const p95Index = Math.floor(this.reconnectSeconds.length * 0.95);
            const p95Sec = this.reconnectSeconds[p95Index];
            p95ReconnectMin = (p95Sec / 60).toFixed(1);
        }

        const avgReconnectMin = this.reconnectSeconds.length ? (this.reconnectSeconds.reduce((a, b) => a + b, 0) / this.reconnectSeconds.length / 60).toFixed(1) : 'N/A';

        const quickReconnects = this.reconnectSeconds.filter(s => s <= 300).length;

        const daysSpanned = totalRangeSec / 86400;

        const uptimeScore = parseFloat(percentConnected) || 0;

        let sessionSecondsSorted = [...this.sessionSeconds].sort((a, b) => a - b);
        let medianSessionSec = 0;
        if (numSessions > 0) {
            const mid = Math.floor(numSessions / 2);
            medianSessionSec = numSessions % 2 ? sessionSecondsSorted[mid] : (sessionSecondsSorted[mid - 1] + sessionSecondsSorted[mid]) / 2;
        }
        const medianSessionMin = numSessions ? (medianSessionSec / 60).toFixed(1) : 'N/A';

        const dailyData = {};
        this.reconnects.forEach(reconn => {
            const dayKey = reconn.dateObj.toLocaleDateString();
            if (!dailyData[dayKey]) dailyData[dayKey] = { fast: 0, quick: 0 };
            if (reconn.sec < 30) dailyData[dayKey].fast++;
            if (reconn.sec <= 300) dailyData[dayKey].quick++;
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

        // ──────────────────────────────────────────────
        // NEW SCORING - Uptime dominant, penalties capped, realistic
        // ──────────────────────────────────────────────
        
        // Tunable constants
        const UPTIME_WEIGHT = 0.90;           // Uptime drives ~90% of the score
        const SESSION_BONUS_MAX = 20;         // Cap on session length reward
        const FAST_RECOVERY_MAX = 12;         // Cap on quick reconnect reward
        const FLAPPING_PENALTY_MAX = 22;      // Max subtract for short flaps
        const LONG_OUTAGE_PENALTY_MAX = 28;   // Max subtract for long outages
        const MIN_SCORE_FLOOR = 30;           // High-uptime modems can't go below this
        
        const days = Math.max(this.metrics.daysSpanned || 1, 1);
        
        // 1. Uptime base (almost 1:1)
        const uptimePoints = parseFloat(percentConnected) * UPTIME_WEIGHT;
        
        // 2. Session quality bonus (using your existing tanh function)
        const sessionBonusMeanRaw = NeonovaAnalyzer.getSessionBonus(avgSessionMin) || 0;   // or just getSessionBonus() if global
        const sessionBonusMean = Math.min(SESSION_BONUS_MAX, sessionBonusMeanRaw * (30 / days));
        
        const sessionBonusMedianRaw = NeonovaAnalyzer.getSessionBonus(medianSessionMin) || 0;
        const sessionBonusMedian = Math.min(SESSION_BONUS_MAX, sessionBonusMedianRaw * (30 / days));
        
        // 3. Fast recovery bonus (quick reconnects after disconnects)
        const totalReconnects = this.reconnectSeconds.length;
        const quickRatio = totalReconnects > 0 
            ? this.reconnectSeconds.filter(s => s <= 300).length / totalReconnects 
            : 0;
        const fastBonus = Math.min(FAST_RECOVERY_MAX, quickRatio * 50);   // 60% quick → ~30 (capped at 12)
        
        // 4. Flapping penalty (short/frequent disconnects, normalized)
        const shortDisconnects = this.disconnects - this.longDisconnects.length;
        const flapsPerDay = shortDisconnects / days;
        const flappingPenalty = -Math.min(FLAPPING_PENALTY_MAX, Math.pow(flapsPerDay + 1, 1.5) * 5);
        
        // 5. Long outage penalty (multi-hour outages, normalized)
        const longOutagesPerWeek = (this.longDisconnects.length / days) * 7;
        const longOutagePenalty = -Math.min(LONG_OUTAGE_PENALTY_MAX, longOutagesPerWeek * 12);
        
        // ──────────────────────────────────────────────
        // Compute final scores
        // ──────────────────────────────────────────────
        
        // Mean version (avg session length)
        let rawMeanScore = uptimePoints + sessionBonusMean + fastBonus + flappingPenalty + longOutagePenalty;
        if (parseFloat(percentConnected) >= 90) {
            rawMeanScore = Math.max(MIN_SCORE_FLOOR, rawMeanScore);
        }
        rawMeanScore = Math.max(0, Math.min(100, rawMeanScore));
        
        // Median version (median session length)
        let rawMedianScore = uptimePoints + sessionBonusMedian + fastBonus + flappingPenalty + longOutagePenalty;
        if (parseFloat(percentConnected) >= 90) {
            rawMedianScore = Math.max(MIN_SCORE_FLOOR, rawMedianScore);
        }
        rawMedianScore = Math.max(0, Math.min(100, rawMedianScore));
        
        // Assign to metrics
        this.metrics.uptimeComponent = uptimePoints.toFixed(1);
        this.metrics.sessionBonusMean = sessionBonusMean.toFixed(1);
        this.metrics.sessionBonusMedian = sessionBonusMedian.toFixed(1);
        this.metrics.totalFastBonus = fastBonus.toFixed(1);
        this.metrics.flappingPenalty = Math.abs(flappingPenalty).toFixed(1);
        this.metrics.longOutagePenalty = Math.abs(longOutagePenalty).toFixed(1);
        this.metrics.rawMeanScore = rawMeanScore.toFixed(1);
        this.metrics.meanStabilityScore = Math.round(rawMeanScore);
        this.metrics.rawMedianScore = rawMedianScore.toFixed(1);
        this.metrics.medianStabilityScore = Math.round(rawMedianScore);

        // Return metrics
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
            uptimeComponent,
            sessionBonusMean,
            sessionBonusMedian,
            totalFastBonus,
            flappingPenalty,
            longOutagePenalty,
            meanStabilityScore,
            medianStabilityScore,
            rawMeanScore,
            rawMedianScore,
            monitoringPeriod: this.firstDate && this.lastDate 
                ? `${this.firstDate.toLocaleString()} to ${this.lastDate.toLocaleString()}` 
                : 'N/A',
            sessionBins: this.computeSessionBins(),
            reconnectBins: this.computeReconnectBins(),
            rolling7Day: this.computeRolling7Day(),
            rollingLabels: this.rollingLabels || [],  
            longDisconnects: this.longDisconnects,
            disconnects: this.disconnects,
            hourlyDisconnects: this.hourlyDisconnects,
            cleanedEntriesLength: this.cleanEntries.length,
            dailyDisconnects: sortedDailyDisconnects,
            dailyLabels: sortedKeys,
            hourlyCount: this.hourlyCount
        };
    }

    computeSessionBins() {
        const bins = [0, 0, 0, 0, 0];
        this.sessionSeconds.forEach(sec => {
            const min = sec / 60;
            if (min <= 5) bins[0]++;
            else if (min <= 30) bins[1]++;
            else if (min <= 60) bins[2]++;
            else if (min <= 240) bins[3]++;
            else bins[4]++;
        });
        return bins;
    }

    computeReconnectBins() {
        const bins = [0, 0, 0, 0];
        this.reconnectSeconds.forEach(sec => {
            const min = sec / 60;
            if (min <= 1) bins[0]++;
            else if (min <= 5) bins[1]++;
            else if (min <= 30) bins[2]++;
            else bins[3]++;
        });
        return bins;
    }

    computeRolling7Day() {
        if (this.disconnectDates === undefined || this.disconnectDates === null) {
            this.disconnectDates = [];
        }
    
        this.disconnectDates.sort((a, b) => a - b);
    
        const rolling7Day = [];
        this.rollingLabels = [];
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    
        let currentDate = new Date(this.firstDate || Date.now());
        currentDate.setHours(0,0,0,0);
    
        while (currentDate <= (this.lastDate || new Date())) {
            const windowStart = new Date(currentDate - sevenDaysMs);
            const count = this.disconnectDates.filter(d => d >= windowStart && d <= currentDate).length;
            rolling7Day.push(count);
            this.rollingLabels.push(currentDate.toLocaleDateString());
            currentDate = new Date(currentDate.getTime() + 24*60*60*1000);
        }
        return rolling7Day;
    }
}
