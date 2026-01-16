/**
 * @file src/controllers/neonova-report-controller.js
 * @requires ../collectors/neonova-collector
 * @requires ../controllers/neonova-analyzer
 * @requires ../views/neonova-report-view
 */
class NeonovaReportController {
    constructor() {
        this.collector = new NeonovaCollector();
        this.reportButton = null;
        this.initUI();
    }

    initUI() {
        this.reportButton = document.querySelector('#novaReportButton');
        if (!this.reportButton) {
            this.reportButton = document.createElement('button');
            this.reportButton.id = 'novaReportButton';
            this.reportButton.textContent = this.collector.analysisMode ? 'Analysis Running...' : 'Run Full Report';
            this.reportButton.style.position = 'fixed';
            this.reportButton.style.bottom = '20px';
            this.reportButton.style.right = '20px';
            this.reportButton.style.zIndex = '999999';
            this.reportButton.style.padding = '20px 30px';
            this.reportButton.style.fontSize = '20px';
            this.reportButton.style.fontWeight = 'bold';
            this.reportButton.style.backgroundColor = this.collector.analysisMode ? '#ff8c00' : '#006400';
            this.reportButton.style.color = 'white';
            this.reportButton.style.border = 'none';
            this.reportButton.style.borderRadius = '15px';
            this.reportButton.style.boxShadow = '0 8px 20px rgba(0,0,0,0.6)';
            this.reportButton.style.cursor = 'pointer';
            this.reportButton.style.writingMode = 'vertical-rl';
            this.reportButton.style.textOrientation = 'mixed';

            this.reportButton.onclick = function() {
                if (this.collector.analysisMode) return;
                this.collector.startAnalysis();
            }.bind(this);

            document.body.appendChild(this.reportButton);
        } else {
            this.reportButton.textContent = this.collector.analysisMode ? 'Analysis Running...' : 'Run Full Report';
            this.reportButton.style.backgroundColor = this.collector.analysisMode ? '#ff8c00' : '#006400';
        }
    }

    run() {
        this.collector.collectFromPage();

        if (this.collector.analysisMode) {
            if (!this.collector.advancePage()) {
                this.collector.pages++;
                localStorage.setItem('novaPages', this.collector.pages);

                setTimeout(() => {
                    const cleanedEntries = this.collector.cleanEntries();
                    const analyzer = new NeonovaAnalyzer(cleanedEntries);
                    const metrics = analyzer.computeMetrics();
                    const view = new NeonovaReportView(metrics, this.collector.getPages(), analyzer.longDisconnects);
                    const csvContent = 'Date,Status\n' + cleanedEntries.map(e => `"${e.dateObj.toLocaleString()}","${e.status}"`).join('\n');
                    const reportHTML = view.generateReportHTML(csvContent);
                    view.openReport(reportHTML);
                    this.collector.endAnalysis();
                    this.reportButton.textContent = 'Report Complete!';
                    this.reportButton.style.backgroundColor = '#008000';
                    this.reportButton.disabled = true;
                }, 300);
            }
        }
    }
}
