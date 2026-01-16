/**
 * @file src/analyzers/radius-analyzer.js
 * @requires ../models/radius-entry
 * @requires ../models/radius-metrics
 */
class RadiusAnalyzer {
    constructor(entries) {
        this.entries = entries.sort((a, b) => a.timestamp - b.timestamp);
        this.metrics = new RadiusMetrics();
        this.analyze();
    }

    analyze() {
        this.metrics.totalEntries = this.entries.length;

        let activeSessions = 0;
        let totalDuration = 0;

        this.entries.forEach(entry => {
            if (entry.isStart) {
                activeSessions++;
                this.metrics.startCount++;
            } else {
                if (activeSessions > 0) {
                    activeSessions--;
                    this.metrics.stopCount++;
                    this.metrics.sessionCount++;
                    // Add real duration pairing logic here later
                }
            }
        });

        this.metrics.averageSessionDurationSec = this.metrics.sessionCount > 0 ? totalDuration / this.metrics.sessionCount : 0;
    }

    getMetrics() {
        return this.metrics;
    }
}
