/**
 * @file src/controllers/neonova-report-controller.js
 * @requires ../collectors/neonova-collector
 * @requires ../controllers/neonova-analyzer
 * @requires ../views/neonova-report-view
 */
class NeonovaReportController extends BaseNeonovaController{
    constructor() {
        super();
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

        async run() {
            // Assume username is known or from UI/input
            const username = 'kandkpepper'; // replace with real input
    
            const baseUrl = super.getSearchUrl(username);
    
            // Show progress
            this.view.showProgress('Collecting RADIUS logs...');
    
            const onProgress = (currentEntries, currentPage) => {
                this.view.updateProgress(currentEntries, `Page ${currentPage}`);
            };
    
            const entries = await paginateReportLogs(baseUrl, onProgress);
    
            // Hide progress when done
            this.view.hideProgress();
    
            if (entries.length === 0) {
                this.view.showError('No log entries found.');
                return;
            }
    
            // Continue with existing report workflow
            const cleanedEntries = this.collector.cleanEntries(entries);
            const analyzer = new NeonovaAnalyzer(cleanedEntries);
            const metrics = analyzer.computeMetrics();
            const csvContent = 'Date,Status\n' + cleanedEntries.map(e => `"${e.dateObj.toLocaleString()}","${e.status}"`).join('\n');
            const reportHTML = this.view.generateReportHTML(csvContent);
            this.view.openReport(reportHTML);
    
            // Update button
            this.reportButton.textContent = 'Report Complete!';
            this.reportButton.style.backgroundColor = '#008000';
            this.reportButton.disabled = true;
    }

}
