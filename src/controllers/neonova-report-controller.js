class NeonovaReportController extends BaseNeonovaController {
    constructor() {
        super();
        this.progressView = new NeonovaProgressView();
        this.collector = new NeonovaCollector();
        this.reportView = null  
        this.analyzer = null
    }

        // Add these five methods to your report controller

    getReportData(data) {
        return {
            username: data.username,
            friendlyName: data.friendlyName,
            metrics: data.metrics,
            entriesCount: data.entries.length,
            longDisconnects: data.longDisconnects || [],
            ignoredEntriesCount: data.ignoredEntriesCount || 0,
            generatedAt: new Date().toISOString()
        };
    }

    getCsvContent(data) {
        // Move your existing generateCsvContent logic here
        let csv = 'Metric,Value\n';
        csv += `Total Disconnects,${data.metrics.disconnects || 0}\n`;
        // ... rest of your CSV logic
        return csv;
    }

    getJsonContent(data) {
        return JSON.stringify(this.getReportData(data), null, 2);
    }

    getXmlContent(data) {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<radiusReport>\n`;
        xml += `  <metadata>\n`;
        xml += `    <username>${data.username}</username>\n`;
        xml += `    <friendlyName>${data.friendlyName || data.username}</friendlyName>\n`;
        xml += `    <generatedAt>${new Date().toISOString()}</generatedAt>\n`;
        xml += `  </metadata>\n`;
        xml += `  <summary>\n`;
        xml += `    <totalDisconnects>${data.metrics.disconnects || 0}</totalDisconnects>\n`;
        xml += `    <percentConnected>${Number(data.metrics.percentConnected || 0).toFixed(1)}</percentConnected>\n`;
        xml += `  </summary>\n`;
        xml += `</radiusReport>`;
        return xml;
    }

    // PDF is special — we still need the full HTML for rendering
    getFullReportHtml(data) {
        const reportView = new NeonovaReportView(
            data.username,
            data.friendlyName,
            data.metrics,
            data.entries.length,
            data.longDisconnects
        );
        return reportView.generateReportHTML();
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
