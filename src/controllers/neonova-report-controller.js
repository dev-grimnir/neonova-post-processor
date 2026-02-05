class NeonovaReportController extends BaseNeonovaController {
    constructor() {
        super();
        this.progressView = new NeonovaProgressView();
        this.collector = new NeonovaCollector();
        this.reportView = null  
        this.analyzer = null
    }

    async generateReportData(username, friendlyName, startDate, endDate = new Date(), onProgress = null) {
        const entries = await this.paginateReportLogs(username, startDate, endDate, onProgress);
        const cleaned = this.collector.cleanEntries(entries);
        this.analyzer = new NeonovaAnalyzer(cleaned);
        const metrics = this.analyzer.computeMetrics();
        return {
            username,
            friendlyName,
            period: { start: startDate, end: endDate },
            entries,
            cleanedEntries: cleaned,
            metrics
        };
    }
}
