class NeonovaReportController {
    constructor(username, friendlyName, metrics, length, longDisconnects) {
        this.username = username;
        this.friendlyName = friendlyName;
        this.metrics = metrics;
        this.length = sanitizedEntries.length;
        this longDisconnects = metrics.longDisconnects;
        
    }

    generateAndOpen() {
        const reportView = new NeonovaReportView(
            this.username,
            this.friendlyName,
            this.metrics,
            this.entryCount,
            this.longDisconnects
        );

        const reportHTML = reportView.generateReportHTML('');
        const newTab = window.open('', '_blank');
        newTab.document.write(reportHTML);
        newTab.document.close();
    }
}
