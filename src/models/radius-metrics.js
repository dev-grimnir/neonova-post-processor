/**
 * @file src/models/radius-metrics.js
 * No dependencies
 */
class RadiusMetrics {
    constructor() {
        this.totalEntries = 0;
        this.startCount = 0;
        this.stopCount = 0;
        this.sessionCount = 0;
        this.averageSessionDurationSec = 0;
    }

    getSummary() {
        return {
            total: this.totalEntries,
            starts: this.startCount,
            stops: this.stopCount,
            sessions: this.sessionCount,
            avgSessionSec: this.averageSessionDurationSec.toFixed(1)
        };
    }
}
