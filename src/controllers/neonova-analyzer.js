/**
 * @file src/controllers/neonova-analyzer.js
 * Core analysis logic: state machine, sessions, reconnects, metrics
 * @requires ../core/utils
 */
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
        this.dailyDisconnects = Array(7).fill(0);
        this.hourlyCount = Array(24).fill(0);
        this.dailyCount = {};
        this.disconnectDates = [];  // Force array here
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
                this.dailyDisconnects[date.getDay()]++;
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

        const totalConnectedSec = this.sessionSeconds.reduce((a, b) => a + b, 0);
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

        const scaleFactor = Math.max(1, daysSpanned / 30);
        let flappingPenalty = totalFlappingPenalty / scaleFactor;
        let longOutagePenalty = this.longDisconnects.length * 10 / scaleFactor;

        const uptimeComponent = uptimeScore * 0.6;

        const sessionBonusMean = getSessionBonus(avgSessionMin);
        const rawMeanScore = uptimeComponent + sessionBonusMean + totalFastBonus - flappingPenalty - longOutagePenalty;
        const meanStabilityScore = Math.max(0, Math.min(100, rawMeanScore)).toFixed(0);

        const sessionBonusMedian = getSessionBonus(medianSessionMin);
        const rawMedianScore = uptimeComponent + sessionBonusMedian + totalFastBonus - flappingPenalty - longOutagePenalty;
        const medianStabilityScore = Math.max(0, Math.min(100, rawMedianScore)).toFixed(0);

        return {
            peakHourStr, peakDayStr, businessDisconnects, offHoursDisconnects, timeSinceLastStr, avgDaily,
            totalConnectedSec, totalDisconnectedSec, percentConnected, numSessions, avgSessionMin,
            longestSessionMin, shortestSessionMin, medianReconnectMin, p95ReconnectMin, avgReconnectMin,
            quickReconnects, daysSpanned, uptimeComponent, sessionBonusMean, sessionBonusMedian,
            totalFastBonus, flappingPenalty, longOutagePenalty, meanStabilityScore, medianStabilityScore,
            rawMeanScore, rawMedianScore, monitoringPeriod: this.firstDate && this.lastDate ? `${this.firstDate.toLocaleString()} to ${this.lastDate.toLocaleString()}` : 'N/A',
            sessionBins: this.computeSessionBins(),
            reconnectBins: this.computeReconnectBins(),
            console.log('disconnectDates before sort:', this.disconnectDates);
            console.log('Type of disconnectDates:', typeof this.disconnectDates, Array.isArray(this.disconnectDates));
            rolling7Day: this.computeRolling7Day(),
            rollingLabels: this.rollingLabels,
            longDisconnects: this.longDisconnects,
            disconnects: this.disconnects,
            allEntriesLength: this.allEntries.length,
            cleanedEntriesLength: this.cleanEntries.length
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
        // Extra guard: if undefined, set to empty array
        if (this.disconnectDates === undefined || this.disconnectDates === null) {
            this.disconnectDates = [];
            console.warn('disconnectDates was undefined/null - reset to empty array');
        }
    
        // Now safe to sort
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
