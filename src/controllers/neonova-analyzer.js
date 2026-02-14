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
        this.dayOfWeekDisconnects = Array(7).fill(0); 
        this.hourlyCount = Array(24).fill(0);
        this.dailyCount = {};
        this.disconnectDates = []; 
        this.metrics = {};
        this.analyze();
    }

        /**
     * Main entry point for analysis.
     * Orchestrates the entire state-machine processing of RADIUS log entries.
     * This method is now short and readable — it no longer contains the actual logic.
     */
    analyze() {
        // Reset all data structures
        this.disconnects = 0;
        this.sessionSeconds = [];
        this.reconnectSeconds = [];
        this.reconnects = [];
        this.longDisconnects = [];
        this.firstDate = null;
        this.lastDate = null;
        this.lastDisconnectDate = null;
        this.hourlyDisconnects = Array(24).fill(0);
        this.dayOfWeekDisconnects = Array(7).fill(0);
        this.hourlyCount = Array(24).fill(0);
        this.dailyCount = {};
        this.disconnectDates = [];

        // State machine variables
        let currentState = null;          // "up", "down", or null (before first entry)
        let lastTransitionTime = null;    // timestamp of the most recent state change

        // Process every log entry in chronological order
        this.cleanEntries.forEach(entry => {
            this.#processEntry(entry, currentState, lastTransitionTime);
            
            // Update state machine for next iteration
            if (entry.status === "Start") {
                currentState = "up";
                lastTransitionTime = entry.dateObj.getTime();
            } else if (entry.status === "Stop") {
                currentState = "down";
                lastTransitionTime = entry.dateObj.getTime();
                this.lastDisconnectDate = entry.dateObj;
            }
        });

        // Handle any open session at the very end of the log
        this.#finalizeLastSession(currentState, lastTransitionTime);
    }

    /**
     * Routes each log entry to the correct handler based on its status.
     * Also updates firstDate / lastDate.
     * 
     * @param {Object} entry - Raw log entry from cleanedEntries
     * @param {string|null} currentState - Current state machine state ("up", "down", or null)
     * @param {number|null} lastTransitionTime - Timestamp of previous state change
     */
    #processEntry(entry, currentState, lastTransitionTime) {
        const date = entry.dateObj;
        const ts = date.getTime();

        // Track overall time range
        if (!this.firstDate) this.firstDate = date;
        this.lastDate = date;

        if (entry.status === "Start") {
            this.#handleStart(entry, currentState, lastTransitionTime);
        } 
        else if (entry.status === "Stop") {
            this.#handleStop(entry, currentState, lastTransitionTime);
        }
    }

    /**
     * Handles a "Start" event (modem came back online).
     * If we were previously down, this marks the end of a disconnect/reconnect.
     */
    #handleStart(entry, currentState, lastTransitionTime) {
        if (currentState === "down" && lastTransitionTime !== null) {
            this.#recordReconnect(lastTransitionTime, entry.dateObj.getTime());
        }
    }

    /**
     * Handles a "Stop" event (modem went offline).
     * Records the disconnect and, if we were previously up, records the completed session.
     */
    #handleStop(entry, currentState, lastTransitionTime) {
        this.#recordDisconnect(entry);

        if (currentState === "up" && lastTransitionTime !== null) {
            this.#recordSessionDuration(lastTransitionTime, entry.dateObj.getTime());
        }
    }

    /**
     * Records a reconnect event (end of a disconnect period).
     * Calculates duration and checks if it qualifies as a long disconnect.
     */
    #recordReconnect(downTime, upTime) {
        const reconnectSec = (upTime - downTime) / 1000;
        if (reconnectSec <= 0) return;

        this.reconnectSeconds.push(reconnectSec);
        this.reconnects.push({
            dateObj: new Date(upTime),
            sec: reconnectSec
        });

        if (reconnectSec > 1800) {   // 30 minutes
            this.longDisconnects.push({
                stopDate: new Date(downTime),
                startDate: new Date(upTime),
                durationSec: reconnectSec
            });
        }
    }

    /**
     * Records a completed session (from Start → Stop).
     */
    #recordSessionDuration(startTime, stopTime) {
        const duration = (stopTime - startTime) / 1000;
        if (duration > 0) {
            this.sessionSeconds.push(duration);
        }
    }

    /**
     * Records all statistical data when a disconnect occurs.
     * This is the only place that updates hourly, daily, and day-of-week counters.
     */
    #recordDisconnect(entry) {
        this.disconnects++;

        const date = entry.dateObj;
        const hour = date.getHours();

        this.hourlyDisconnects[hour]++;
        this.hourlyCount[hour]++;

        const dayKey = date.toLocaleDateString();
        this.dailyCount[dayKey] = (this.dailyCount[dayKey] || 0) + 1;

        this.dayOfWeekDisconnects[date.getDay()]++;

        this.disconnectDates.push(date);
    }

    /**
     * Handles the final open session if the modem was "up" at the end of the log.
     * This is very important for accurate uptime/session calculations.
     */
    #finalizeLastSession(currentState, lastTransitionTime) {
        if (currentState === "up" && lastTransitionTime !== null && this.lastDate) {
            const finalDuration = (this.lastDate.getTime() - lastTransitionTime) / 1000;
            if (finalDuration > 0) {
                this.sessionSeconds.push(finalDuration);
            }
        }
    }

        /**
     * Computes all metrics from the raw analyzed data.
     * This method is now the orchestrator only — short and readable.
     * All heavy calculations have been moved to focused private methods.
     * 
     * The returned object shape is 100% identical to the previous version.
     */
    computeMetrics() {
        // Step 1: Calculate basic peak and summary stats
        const peakHourStr = this.#calculatePeakHourStr();
        const peakDayStr = this.#calculatePeakDayStr();

        const { businessDisconnects, offHoursDisconnects } = this.#calculateBusinessVsOffHours();

        const timeSinceLastStr = this.#calculateTimeSinceLastDisconnect();

        const avgDaily = this.#calculateAverageDailyDisconnects();

        // Step 2: Calculate session and reconnect statistics
        const sessionStats = this.#calculateSessionStatistics();
        const reconnectStats = this.#calculateReconnectStatistics();

        // Step 3: Calculate uptime
        const uptimeStats = this.#calculateUptimeAndPercentConnected();

        // Step 4: Compute the new stability scoring (mean + median)
        const scoring = this.#computeStabilityScores(
            uptimeStats.uptimeScore,
            sessionStats.avgSessionMin,
            sessionStats.medianSessionMin
        );

        // Step 5: Build the final return object (exactly the same shape as before)
        return this.#buildReturnObject({
            peakHourStr,
            peakDayStr,
            businessDisconnects,
            offHoursDisconnects,
            timeSinceLastStr,
            avgDaily,
            ...uptimeStats,
            ...sessionStats,
            ...reconnectStats,
            ...scoring
        });
    }

    // ────────────────────────────────────────────────
    // Private helper methods — each does one focused job
    // ────────────────────────────────────────────────

    #calculatePeakHourStr() {
        const peakHourCount = Math.max(...this.hourlyCount);
        const peakHour = this.hourlyCount.indexOf(peakHourCount);
        return peakHourCount > 0 
            ? `${peakHour}:00-${peakHour + 1}:00 (${peakHourCount} disconnects)` 
            : 'None';
    }

    #calculatePeakDayStr() {
        let peakDayStr = 'None';
        let peakDayCount = 0;

        for (const [day, count] of Object.entries(this.dailyCount)) {
            if (count > peakDayCount) {
                peakDayCount = count;
                peakDayStr = `${day} (${count} disconnects)`;
            }
        }
        return peakDayStr;
    }

    #calculateBusinessVsOffHours() {
        let businessDisconnects = 0;
        let offHoursDisconnects = 0;

        for (let h = 0; h < 24; h++) {
            if (h >= 8 && h < 18) {
                businessDisconnects += this.hourlyDisconnects[h];
            } else {
                offHoursDisconnects += this.hourlyDisconnects[h];
            }
        }
        return { businessDisconnects, offHoursDisconnects };
    }

    #calculateTimeSinceLastDisconnect() {
        if (!this.lastDisconnectDate) return 'N/A';

        const sinceSec = (new Date() - this.lastDisconnectDate) / 1000;
        return formatDuration(sinceSec) + ' ago';
    }

    #calculateAverageDailyDisconnects() {
        const dailyValues = Object.values(this.dailyCount);
        return dailyValues.length 
            ? (dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length).toFixed(1) 
            : '0';
    }

    #calculateSessionStatistics() {
        const numSessions = this.sessionSeconds.length;

        const avgSessionMin = numSessions 
            ? (this.sessionSeconds.reduce((a, b) => a + b, 0) / numSessions / 60).toFixed(1) 
            : 'N/A';

        const longestSessionMin = numSessions ? Math.max(...this.sessionSeconds) / 60 : 0;
        const shortestSessionMin = numSessions 
            ? Math.min(...this.sessionSeconds.filter(s => s > 0)) / 60 
            : 'N/A';

        // Median session
        let medianSessionMin = 'N/A';
        if (numSessions > 0) {
            const sorted = [...this.sessionSeconds].sort((a, b) => a - b);
            const mid = Math.floor(numSessions / 2);
            const medianSec = numSessions % 2 
                ? sorted[mid] 
                : (sorted[mid - 1] + sorted[mid]) / 2;
            medianSessionMin = (medianSec / 60).toFixed(1);
        }

        return {
            numSessions,
            avgSessionMin,
            longestSessionMin,
            shortestSessionMin,
            medianSessionMin
        };
    }

    #calculateReconnectStatistics() {
        const reconnects = this.reconnectSeconds;
        const count = reconnects.length;

        const avgReconnectMin = count 
            ? (reconnects.reduce((a, b) => a + b, 0) / count / 60).toFixed(1) 
            : 'N/A';

        let medianReconnectMin = 'N/A';
        let p95ReconnectMin = 'N/A';

        if (count > 0) {
            const sorted = [...reconnects].sort((a, b) => a - b);

            // Median
            const mid = Math.floor(count / 2);
            const medianSec = count % 2 
                ? sorted[mid] 
                : (sorted[mid - 1] + sorted[mid]) / 2;
            medianReconnectMin = (medianSec / 60).toFixed(1);

            // 95th percentile
            const p95Index = Math.floor(count * 0.95);
            const p95Sec = sorted[p95Index];
            p95ReconnectMin = (p95Sec / 60).toFixed(1);
        }

        const quickReconnects = reconnects.filter(s => s <= 300).length;

        return {
            avgReconnectMin,
            medianReconnectMin,
            p95ReconnectMin,
            quickReconnects
        };
    }

    #calculateUptimeAndPercentConnected() {
        const totalConnectedSec = this.sessionSeconds.reduce((a, b) => a + b, 0) || 0;
        const totalRangeSec = this.firstDate && this.lastDate 
            ? (this.lastDate - this.firstDate) / 1000 
            : 1;

        const totalDisconnectedSec = totalRangeSec - totalConnectedSec;
        const percentConnected = totalRangeSec > 0 
            ? (totalConnectedSec / totalRangeSec * 100).toFixed(1) 
            : 'N/A';

        const uptimeScore = parseFloat(percentConnected) || 0;

        return {
            totalConnectedSec,
            totalDisconnectedSec,
            percentConnected,
            uptimeScore
        };
    }

    /**
     * Contains the entire new scoring logic (uptime dominant, capped penalties).
     * Returns rawMeanScore, rawMedianScore, and all component values.
     */
    #computeStabilityScores(uptimeScore, avgSessionMin, medianSessionMin) {
        const UPTIME_WEIGHT = 0.90;
        const SESSION_BONUS_MAX = 20;
        const FAST_RECOVERY_MAX = 12;
        const FLAPPING_PENALTY_MAX = 22;
        const LONG_OUTAGE_PENALTY_MAX = 28;
        const MIN_SCORE_FLOOR = 30;

        const days = Math.max(this.daysSpanned || 1, 1);

        const uptimePoints = uptimeScore * UPTIME_WEIGHT;

        const sessionBonusMean = Math.min(SESSION_BONUS_MAX, getSessionBonus(avgSessionMin) || 0);
        const sessionBonusMedian = Math.min(SESSION_BONUS_MAX, getSessionBonus(medianSessionMin) || 0);

        const totalReconnects = this.reconnectSeconds.length;
        const quickRatio = totalReconnects > 0 
            ? this.reconnectSeconds.filter(s => s <= 300).length / totalReconnects 
            : 0;
        const fastBonus = Math.min(FAST_RECOVERY_MAX, quickRatio * 50);

        const shortDisconnects = this.disconnects - this.longDisconnects.length;
        const flapsPerDay = shortDisconnects / days;
        const flappingPenalty = -Math.min(FLAPPING_PENALTY_MAX, Math.pow(flapsPerDay + 1, 1.3) * 4);

        const longOutagesPerWeek = (this.longDisconnects.length / days) * 7;
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

    /**
     * Builds the final return object.
     * This method ensures the exact same shape as the original computeMetrics().
     */
    #buildReturnObject(stats) {
        const sortedKeys = Object.keys(this.dailyCount).sort((a, b) => new Date(a) - new Date(b));
        const sortedDailyDisconnects = sortedKeys.map(k => this.dailyCount[k]);

        return {
            peakHourStr: stats.peakHourStr,
            peakDayStr: stats.peakDayStr,
            businessDisconnects: stats.businessDisconnects,
            offHoursDisconnects: stats.offHoursDisconnects,
            timeSinceLastStr: stats.timeSinceLastStr,
            avgDaily: stats.avgDaily,
            totalConnectedSec: stats.totalConnectedSec,
            totalDisconnectedSec: stats.totalDisconnectedSec,
            percentConnected: stats.percentConnected,
            numSessions: stats.numSessions,
            avgSessionMin: stats.avgSessionMin,
            longestSessionMin: stats.longestSessionMin,
            shortestSessionMin: stats.shortestSessionMin,
            medianReconnectMin: stats.medianReconnectMin,
            p95ReconnectMin: stats.p95ReconnectMin,
            avgReconnectMin: stats.avgReconnectMin,
            quickReconnects: stats.quickReconnects,
            daysSpanned: this.daysSpanned,
            uptimeComponent: stats.uptimeComponent,
            sessionBonusMean: stats.sessionBonusMean,
            sessionBonusMedian: stats.sessionBonusMedian,
            totalFastBonus: stats.totalFastBonus,
            flappingPenalty: stats.flappingPenalty,
            longOutagePenalty: stats.longOutagePenalty,
            meanStabilityScore: stats.meanStabilityScore,
            medianStabilityScore: stats.medianStabilityScore,
            rawMeanScore: stats.rawMeanScore,
            rawMedianScore: stats.rawMedianScore,
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
    
    /*
    computeMetrics() {
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
        const totalReconnects = this.reconnectSeconds.length;
        const quickRatio = totalReconnects > 0 
            ? this.reconnectSeconds.filter(s => s <= 300).length / totalReconnects 
            : 0;
        const fastBonus = Math.min(FAST_RECOVERY_MAX, quickRatio * 50);
    
        // Flapping penalty
        const shortDisconnects = this.disconnects - this.longDisconnects.length;
        const flapsPerDay = shortDisconnects / days;
        const flappingPenalty = -Math.min(FLAPPING_PENALTY_MAX, Math.pow(flapsPerDay + 1, 1.3) * 4);
    
        // Long outage penalty
        const longOutagesPerWeek = (this.longDisconnects.length / days) * 7;
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
            uptimeComponent: this.metrics.uptimeComponent,
            sessionBonusMean: this.metrics.sessionBonusMean,
            sessionBonusMedian: this.metrics.sessionBonusMedian,
            totalFastBonus: this.metrics.totalFastBonus,
            flappingPenalty: this.metrics.flappingPenalty,
            longOutagePenalty: this.metrics.longOutagePenalty,
            meanStabilityScore: this.metrics.meanStabilityScore,
            medianStabilityScore: this.metrics.medianStabilityScore,
            rawMeanScore: this.metrics.rawMeanScore,
            rawMedianScore: this.metrics.rawMedianScore,
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

    */

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

        /*
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
    */
    
}
