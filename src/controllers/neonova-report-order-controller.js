class NeonovaReportOrderController extends BaseNeonovaController{
    constructor(username, friendlyName, view) {
    super();
    this.username = username;
    this.friendlyName = friendlyName || username;
    this.view = view;
    this.view.onGenerateRequested = (startDate) => this.generateReport(startDate);
    }

    start() {
        console.log('Controller start() - view exists?', !!this.view);
        if (this.view) {
            console.log('Calling renderOrderForm');
            this.view.renderOrderForm();
        } else {
            console.log('No view in controller!');
        }
    }

    handleGenerate(startDate) {
        this.view.showProgress();
        this.view.updateProgress(10, 'Fetching logs...');

        // Real generation (placeholder - expand with headless pagination)
        setTimeout(() => {
            this.view.updateProgress(40, 'Cleaning entries...');
        }, 1000);

        setTimeout(() => {
            this.view.updateProgress(70, 'Calculating metrics...');
        }, 2500);

        setTimeout(() => {
            this.view.updateProgress(90, 'Building report...');
        }, 4000);

        setTimeout(() => {
            // Real report HTML (from NeonovaReportView)
            const reportHTML = new NeonovaReportView().generateReportHTML(/* metrics */);
            this.view.showReport(reportHTML);
            if (this.onReportComplete) this.onReportComplete(reportHTML);
        }, 5500);
    }
}
