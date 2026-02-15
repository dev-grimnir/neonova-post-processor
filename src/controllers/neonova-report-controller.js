class NeonovaReportController extends BaseNeonovaController {
    constructor() {
        super();
        this.progressView = new NeonovaProgressView();
        this.collector = new NeonovaCollector();
        this.reportView = null;
        this.analyzer = new NeonovaAnalyzer();
    }

    /**
     * Returns a clean data object for exports.
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
        return this.getReportDataForExport(data);
    }

    /**
     * Rich CSV export.
     */
    getCsvContent(data) {
        const reportData = this.getReportDataForExport(data);
        let csv = 'Metric,Value\n';
        csv += `Total Disconnects,${reportData.metrics.disconnects || 0}\n`;
        csv += `Average Session Duration,${reportData.metrics.avgSessionMin ? formatDuration(reportData.metrics.avgSessionMin * 60) : 'N/A'}\n`;
        csv += `Average Reconnect Time,${reportData.metrics.avgReconnectMin ? formatDuration(reportData.metrics.avgReconnectMin * 60) : 'N/A'}\n`;
        csv += `Percent Connected,${Number(reportData.metrics.percentConnected || 0).toFixed(1)}%\n`;
        csv += `Business Hours Disconnects,${reportData.metrics.businessDisconnects || 0}\n`;
        csv += `Off-Hours Disconnects,${reportData.metrics.offHoursDisconnects || 0}\n`;
        csv += `Time Since Last Disconnect,${reportData.metrics.timeSinceLastStr || 'N/A'}\n`;
        csv += `Peak Disconnect Hour,${reportData.metrics.peakHourStr || 'None'}\n`;
        csv += `Peak Disconnect Day,${reportData.metrics.peakDayStr || 'None'}\n`;
        csv += `Mean Stability Score,${reportData.metrics.meanStabilityScore}\n`;
        csv += `Median Stability Score,${reportData.metrics.medianStabilityScore}\n`;
        csv += `Ignored Entries,${reportData.ignoredEntriesCount || 0}\n`;
        
        csv += '\nLong Disconnects\nDisconnected At,Reconnected At,Duration\n';
        (reportData.longDisconnects || []).forEach(ld => {
            csv += `${ld.stopDate.toLocaleString()},${ld.startDate.toLocaleString()},${formatDuration(ld.durationSec)}\n`;
        });
        return csv;
    }

    /**
     * JSON export.
     */
    getJsonContent(data) {
        const reportData = this.getReportDataForExport(data);
        return JSON.stringify(reportData, null, 2);
    }

    /**
     * Rich XML export.
     */
    getXmlContent(data) {
        const reportData = this.getReportDataForExport(data);
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<radiusReport>\n`;
        xml += `  <metadata>\n`;
        xml += `    <username>${reportData.username}</username>\n`;
        xml += `    <friendlyName>${reportData.friendlyName || reportData.username}</friendlyName>\n`;
        xml += `    <generatedAt>${reportData.generatedAt}</generatedAt>\n`;
        xml += `    <monitoringPeriod>${reportData.metrics.monitoringPeriod || 'N/A'}</monitoringPeriod>\n`;
        xml += `    <daysSpanned>${Number(reportData.metrics.daysSpanned || 0).toFixed(1)}</daysSpanned>\n`;
        xml += `    <ignoredEntries>${reportData.ignoredEntriesCount || 0}</ignoredEntries>\n`;
        xml += `  </metadata>\n`;
        xml += `  <summary>\n`;
        xml += `    <totalDisconnects>${reportData.metrics.disconnects || 0}</totalDisconnects>\n`;
        xml += `    <percentConnected>${Number(reportData.metrics.percentConnected || 0).toFixed(1)}</percentConnected>\n`;
        xml += `    <meanStabilityScore>${reportData.metrics.meanStabilityScore}</meanStabilityScore>\n`;
        xml += `    <medianStabilityScore>${reportData.metrics.medianStabilityScore}</medianStabilityScore>\n`;
        xml += `  </summary>\n`;
        xml += `  <longDisconnects>\n`;
        
        (reportData.longDisconnects || []).forEach(ld => {
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
