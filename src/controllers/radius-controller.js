/**
 * @file src/controllers/radius-controller.js
 * @requires ../collectors/radius-collector
 * @requires ../analyzers/radius-analyzer
 * @requires ../views/radius-report-view
 */
class RadiusController {
    constructor() {
        this.collector = new RadiusCollector();
        this.reportButton = null;
        this.initUI();
    }

initUI() {
    this.reportButton = document.querySelector('#radiusReportButton');
    if (!this.reportButton) {
        this.reportButton = document.createElement('button');
        this.reportButton.id = 'radiusReportButton';
        this.reportButton.textContent = this.collector.analysisMode ? 'Analyzing...' : 'Run RADIUS Analysis';
        this.reportButton.style.position = 'fixed';
        this.reportButton.style.bottom = '20px';          // ← Changed to bottom
        this.reportButton.style.right = '20px';
        this.reportButton.style.zIndex = '999999';
        this.reportButton.style.padding = '20px 30px';
        this.reportButton.style.fontSize = '18px';
        this.reportButton.style.fontWeight = 'bold';
        this.reportButton.style.backgroundColor = this.collector.analysisMode ? '#ff8c00' : '#006400';
        this.reportButton.style.color = 'white';
        this.reportButton.style.border = 'none';
        this.reportButton.style.borderRadius = '12px';
        this.reportButton.style.boxShadow = '0 6px 15px rgba(0,0,0,0.4)';
        this.reportButton.style.cursor = 'pointer';

        this.reportButton.onclick = () => {
            if (this.collector.analysisMode) return;
            this.collector.startAnalysis();
        };

        document.body.appendChild(this.reportButton);
    } else {
        this.reportButton.textContent = this.collector.analysisMode ? 'Analyzing...' : 'Run RADIUS Analysis';
        this.reportButton.style.backgroundColor = this.collector.analysisMode ? '#ff8c00' : '#006400';
    }
}
    run() {
        this.collector.collectFromPage();

        if (this.collector.analysisMode) {
            if (!this.collector.advancePage()) {
                this.collector.pages++;
                localStorage.setItem('radiusPages', this.collector.pages);

                setTimeout(() => {
                    const entries = this.collector.getEntries();
                    const analyzer = new RadiusAnalyzer(entries);
                    const metrics = analyzer.getMetrics();
                    const view = new RadiusReportView(metrics);
                    const html = view.render();
                    this.openReport(html);
                    this.collector.endAnalysis();
                    this.reportButton.textContent = 'Analysis Complete';
                    this.reportButton.style.backgroundColor = '#28a745';
                    this.reportButton.disabled = true;
                }, 300);
            }
        }
    }

    openReport(html) {
        const win = window.open('', '_blank');
        if (win) {
            win.document.open();
            win.document.write(html);
            win.document.close();
        } else {
            alert('Popup blocked. Please allow popups.');
        }
    }
}
