/**
 * @file src/controllers/neonova-analyzer.js
 * Core analysis logic: state machine, sessions, reconnects, metrics
 * @requires ../core/utils
 */
class NeonovaAnalyzer {
    constructor(cleanedEntries) {
        this.cleanEntries = cleanedEntries;
        this.disconnects = [];
        this.sessions = [];
        this.reconnects = [];
        this.sessionSeconds = [];
        this.reconnectSeconds = [];
        this.hourlyDisconnects = Array(24).fill(0);  // Fixed bins
        this.dailyDisconnectsMap = new Map();  // Dynamic for days
        this.businessDisconnects = 0;
        this.offHoursDisconnects = 0;
        this.longDisconnects = [];
        // ... other properties ...

        this.analyze();
    }

    analyze() {
        let lastEntry = null;
        let currentStatus = null;
        let startTime = null;

        this.cleanEntries.forEach(entry => {
            if (lastEntry) {
                const durationSec = (entry.dateObj - lastEntry.dateObj) / 1000;
                if (currentStatus === 'Connected' && entry.status === 'Stop') {
                    this.sessions.push({ start: lastEntry.dateObj, end: entry.dateObj, durationSec });
                    this.sessionSeconds.push(durationSec);
                } else if (currentStatus === 'Disconnected' && entry.status === 'Start') {
                    this.disconnects.push({ start: lastEntry.dateObj, end: entry.dateObj, durationSec });
                    this.reconnects.push(durationSec);
                    this.reconnectSeconds.push(durationSec);

                    // Bin disconnects
                    const hour = entry.dateObj.getHours();  // When reconnect happens (end of disconnect)
                    this.hourlyDisconnects[hour] += 1;

                    const dayKey = entry.dateObj.toISOString().split('T')[0];
                    this.dailyDisconnectsMap.set(dayKey, (this.dailyDisconnectsMap.get(dayKey) || 0) + 1);

                    // Business/off-hours (assuming 9-17 business)
                    if (hour >= 9 && hour < 17) {
                        this.businessDisconnects += 1;
                    } else {
                        this.offHoursDisconnects += 1;
                    }

                    // Long disconnects
                    if (durationSec > 1800) {  // >30min
                        this.longDisconnects.push({ start: lastEntry.dateObj, end: entry.dateObj, duration: formatDuration(durationSec) });
                    }
                }
            }

            // Update state
            currentStatus = entry.status === 'Start' ? 'Connected' : 'Disconnected';
            lastEntry = entry;
        });

        // Handle open session/disconnect at end (assume to now)
        const now = new Date();
        if (lastEntry && currentStatus === 'Connected') {
            const openDuration = (now - lastEntry.dateObj) / 1000;
            this.sessions.push({ start: lastEntry.dateObj, end: now, durationSec: openDuration });
            this.sessionSeconds.push(openDuration);
        } else if (lastEntry && currentStatus === 'Disconnected') {
            const openDuration = (now - lastEntry.dateObj) / 1000;
            this.disconnects.push({ start: lastEntry.dateObj, end: now, durationSec: openDuration });
            this.reconnectSeconds.push(openDuration);  // Or handle as ongoing disconnect
        }

        this.computeMetrics();
    }

    computeMetrics() {
        // Averages
        this.metrics.avgSessionSec = this.sessionSeconds.length > 0 ? this.sessionSeconds.reduce((a, b) => a + b, 0) / this.sessionSeconds.length : 0;
        this.metrics.avgReconnectSec = this.reconnectSeconds.length > 0 ? this.reconnectSeconds.reduce((a, b) => a + b, 0) / this.reconnectSeconds.length : 0;
        this.metrics.avgSession = formatDuration(this.metrics.avgSessionSec);
        this.metrics.avgReconnect = formatDuration(this.metrics.avgReconnectSec);

        // Disconnects
        this.metrics.disconnects = this.disconnects.length;

        // Percent connected (total session time / period time)
        const totalSessionSec = this.sessionSeconds.reduce((a, b) => a + b, 0);
        const totalPeriodSec = (this.cleanEntries[this.cleanEntries.length - 1].dateObj - this.cleanEntries[0].dateObj) / 1000 || 1;
        this.metrics.percentConnected = (totalSessionSec / totalPeriodSec) * 100;

        // Peak hour/day
        this.metrics.peakHourStr = /* calculate from hourlyDisconnects */;
        this.metrics.peakDayStr = /* calculate from dailyDisconnectsMap */;

        // Convert daily map to arrays
        const dailyKeys = Array.from(this.dailyDisconnectsMap.keys()).sort();
        this.metrics.dailyDisconnects = dailyKeys.map(key => this.dailyDisconnectsMap.get(key));
        this.metrics.dailyLabels = dailyKeys;

        // Other calculations (uptimeComponent, bonuses, penalties, rawScores, bins, rolling7Day, etc.)
        // ...

        this.metrics.username = this.username || 'Unknown';  // Set here if not already

        return this.metrics;
    }

    // ... other methods like computeSessionBins, computeReconnectBins, computeRolling7Day ...
}
