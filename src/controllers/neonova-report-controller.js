class NeonovaReportController extends BaseNeonovaController {
    constructor() {
        super();
        this.progressView = new NeonovaProgressView();
        this.collector = new NeonovaCollector();
        this.reportView = null  
        this.analyzer = null
    }

        getCsvContent(data) {
        let csv = 'Metric,Value\n';
        csv += `Total Disconnects,${data.metrics.disconnects || 0}\n`;
        csv += `Average Session Duration,${data.metrics.avgSessionMin ? formatDuration(data.metrics.avgSessionMin * 60) : 'N/A'}\n`;
        csv += `Average Reconnect Time,${data.metrics.avgReconnectMin ? formatDuration(data.metrics.avgReconnectMin * 60) : 'N/A'}\n`;
        csv += `Percent Connected,${Number(data.metrics.percentConnected || 0).toFixed(1)}%\n`;
        csv += `Business Hours Disconnects,${data.metrics.businessDisconnects || 0}\n`;
        csv += `Off-Hours Disconnects,${data.metrics.offHoursDisconnects || 0}\n`;
        csv += `Time Since Last Disconnect,${data.metrics.timeSinceLastStr || 'N/A'}\n`;
        csv += `Peak Disconnect Hour,${data.metrics.peakHourStr || 'None'}\n`;
        csv += `Peak Disconnect Day,${data.metrics.peakDayStr || 'None'}\n`;
        csv += `Mean Stability Score,${data.metrics.meanStabilityScore}\n`;
        csv += `Median Stability Score,${data.metrics.medianStabilityScore}\n`;
        csv += `Ignored Entries,${data.ignoredEntriesCount || 0}\n`;
        
        csv += '\nLong Disconnects\nDisconnected At,Reconnected At,Duration\n';
        (data.longDisconnects || []).forEach(ld => {
            csv += `${ld.stopDate.toLocaleString()},${ld.startDate.toLocaleString()},${formatDuration(ld.durationSec)}\n`;
        });
        return csv;
    }

    getXmlContent(data) {
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<radiusReport>\n`;
        xml += `  <metadata>\n`;
        xml += `    <username>${data.username}</username>\n`;
        xml += `    <friendlyName>${data.friendlyName || data.username}</friendlyName>\n`;
        xml += `    <generatedAt>${new Date().toISOString()}</generatedAt>\n`;
        xml += `    <monitoringPeriod>${data.metrics.monitoringPeriod || 'N/A'}</monitoringPeriod>\n`;
        xml += `    <daysSpanned>${Number(data.metrics.daysSpanned || 0).toFixed(1)}</daysSpanned>\n`;
        xml += `  </metadata>\n`;
        xml += `  <summary>\n`;
        xml += `    <totalDisconnects>${data.metrics.disconnects || 0}</totalDisconnects>\n`;
        xml += `    <percentConnected>${Number(data.metrics.percentConnected || 0).toFixed(1)}</percentConnected>\n`;
        xml += `    <meanStabilityScore>${data.metrics.meanStabilityScore}</meanStabilityScore>\n`;
        xml += `    <medianStabilityScore>${data.metrics.medianStabilityScore}</medianStabilityScore>\n`;
        xml += `    <ignoredEntries>${data.ignoredEntriesCount || 0}</ignoredEntries>\n`;
        xml += `  </summary>\n`;
        xml += `  <longDisconnects>\n`;
        
        (data.longDisconnects || []).forEach(ld => {
            xml += `    <disconnect>\n`;
            xml += `      <disconnectedAt>${ld.stopDate.toISOString()}</disconnectedAt>\n`;
            xml += `      <reconnectedAt>${ld.startDate.toISOString()}</reconnectedAt>\n`;
            xml += `      <durationSeconds>${ld.durationSec}</durationSeconds>\n`;
            xml += `    </disconnect>\n`;
        });
        
        xml += `  </longDisconnects>\n`;
        xml += `</radiusReport>`;
        return xml;
    }

        /**
     * Returns a clean data object that can be used for JSON, XML, CSV, etc.
     * This is the single source of truth for all export formats.
     */
    getReportDataForExport(data) {
        return {
            username: data.username,
            friendlyName: data.friendlyName,
            metrics: data.metrics,
            entriesCount: data.entries ? data.entries.length : data.numEntries || 0,
            longDisconnects: data.longDisconnects || data.metrics.longDisconnects || [],
            ignoredEntriesCount: data.ignoredEntriesCount || 0,
            generatedAt: new Date().toISOString()
        };
    }

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
