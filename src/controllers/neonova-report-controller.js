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
        console.log(`Generating report for ${username}, range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

        const entries = await this.paginateReportLogs(username, startDate, endDate, onProgress);
        console.log(`Raw entries fetched: ${entries.length}`, entries.slice(0, 3));  // First 3 for sample
        
        const cleaned = this.collector.cleanEntries(entries);
        console.log(`Cleaned entries: ${cleaned.length}`, cleaned.slice(0, 3));

        this.analyzer = new NeonovaAnalyzer(cleaned);
        const metrics = this.analyzer.computeMetrics();
        console.log('Computed metrics:', metrics);  // Full object for inspection
    
        return {
            username,
            period: { start: startDate, end: endDate },
            entries,
            cleanedEntries: cleaned,
            metrics
        };
    }
}
