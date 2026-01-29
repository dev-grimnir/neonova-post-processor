/**
 * @file src/controllers/neonova-report-controller.js
 * @requires ../collectors/neonova-collector
 * @requires ../controllers/neonova-analyzer
 * @requires ../views/neonova-report-view
 */
class NeonovaReportController extends BaseNeonovaController {
    constructor() {
        super();
        this.progressView = new NeonovaProgressView();
        this.collector = new NeonovaCollector();
        this.reportView = null  
        this.analyzer = null
    }

    /**
     * @returns {Promise<object>} Raw report data
     * {
     *   username: string,
     *   period: { start: Date, end: Date },
     *   entries: LogEntry[],
     *   cleanedEntries: LogEntry[],
     *   metrics: {
     *     uptimePercent: number,
     *     longDisconnects: { durationSec: number, start: Date }[],
     *     stabilityScore: number,
     *     // ... all other computed values
     *   }
     * }
     */
    async generateReportData(username, startDate, endDate = new Date(), onProgress = null) {
        const entries = await this.paginateReportLogs(username, startDate, endDate, onProgress);
        const cleaned = this.collector.cleanEntries(entries);
        const metrics = analyzer = new NeonovaAnalyzer(cleaned);
    
        return {
            username,
            period: { start: startDate, end: endDate },
            entries,
            cleanedEntries: cleaned,
            metrics
        };
    }
}
