/**
 * @file src/controllers/neonova-report-controller.js
 * @requires ../collectors/neonova-collector
 * @requires ../controllers/neonova-analyzer
 * @requires ../views/neonova-report-view
 */
class NeonovaReportController extends BaseNeonovaController {
    constructor() {
        super();
        this.progressView = new NeonovaProgressView();  // reusable
        this.collector = new NeonovaCollector();
        this.reportView = new NeonovaReportView();  // add this if missing
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
    async generateReportData(username, startDate, endDate = new Date()) {
        const entries = await this.paginateReportLogs(username, startDate, endDate);
        const cleaned = this.collector.cleanEntries(entries);
        const metrics = NeonovaAnalyzer.computeMetrics(cleaned);
    
        return {
            username,
            period: { start: startDate, end: endDate },
            entries,
            cleanedEntries: cleaned,
            metrics
        };
    }

    async generateReportHTMLForRange(startDate, endDate) {
    this.progressView.setStatus('Fetching logs...');
    this.progressView.setProgress(10);

    const entries = await paginateReportLogs(startDate, endDate);  // add date filtering if not already

    this.progressView.setProgress(40);
    this.progressView.setStatus('Cleaning entries...');

    const cleaned = this.collector.cleanEntries(entries);

    this.progressView.setProgress(70);
    this.progressView.setStatus('Calculating metrics...');

    const metrics = NeonovaAnalyzer.computeMetrics(cleaned);

    this.progressView.setProgress(90);
    this.progressView.setStatus('Building report...');

    const reportHTML = this.reportView.generateReportHTML(metrics);

    this.progressView.setProgress(100);
    this.progressView.setStatus('Complete!');

    return reportHTML;
    
    }
    
    async generateInTab(tab, startDate) {
        const progressView = this.progressView;
        progressView.setDocument(tab.document);  // if you add this method to progressView
        progressView.setStatus('Fetching logs...');
        progressView.setProgress(10);

        try {
            const entries = await this.paginateReportLogs(startDate, new Date());  // use instance method if exists
            progressView.setProgress(40);
            progressView.setStatus('Cleaning entries...');

            const cleaned = this.collector.cleanEntries(entries);

            progressView.setProgress(70);
            progressView.setStatus('Calculating metrics...');

            const metrics = NeonovaAnalyzer.computeMetrics(cleaned);

            progressView.setProgress(90);
            progressView.setStatus('Building report...');

            const reportHTML = this.reportView.generateReportHTML(metrics);

            progressView.setProgress(100);
            progressView.setStatus('Complete!');

            tab.document.getElementById('report-content').innerHTML = reportHTML;
            tab.document.getElementById('progress').style.display = 'none';
            tab.document.getElementById('status').style.display = 'none';
        } catch (err) {
            progressView.setStatus('Error: ' + err.message);
            console.error('Report generation failed:', err);
        }
    }

    async run(username = null, startDate = null) {
        if (!username) username = 'default-user'; // or throw error
        const baseUrl = super.getSearchUrl(username);

        this.progressView.show('Collecting RADIUS logs...');

        const entries = await paginateReportLogs(baseUrl, (currentEntries, page) => {
            this.progressView.update(currentEntries, `Page ${page}`);
        });

        if (entries.length === 0) {
            this.progressView.error('No entries found');
            return;
        }

        this.progressView.complete();

        const cleaned = this.collector.cleanEntries(entries);
        const metrics = NeonovaAnalyzer.computeMetrics(cleaned);
        const reportHTML = this.reportView.generateReportHTML(metrics);
        this.reportView.openReport(reportHTML);
    }
}
