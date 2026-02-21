class NeonovaReportOrderController {
    constructor(username, friendlyName) {
        this.username = username;
        this.friendlyName = friendlyName || username;
        this.view = null;  // Created in start()
    }

    start() {
        // Controller creates its own view
        this.view = new NeonovaReportOrderView(null, this.username, this.friendlyName);

        // Listen to the view's events
        this.view.addEventListener('quickReportRequested', (event) => {
            const { timeframe } = event.detail;
            this.handleQuickReport(timeframe);
        });

        this.view.addEventListener('customReportRequested', (event) => {
            const { startIso, endIso } = event.detail;
            this.handleCustomReport(startIso, endIso);
        });

        // Now show the view (controller manages view lifecycle)
        this.view.renderOrderForm();
        this.view.showModal();
    }

    handleQuickReport(timeframe) {
        // Controller decides dates based on constant
        let startDate = null;
        const endDate = new Date();

        if (timeframe === '1_DAY') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 1);
        } else if (timeframe === '7_DAYS') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
        } else if (timeframe === '30_DAYS') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
        } else if (timeframe === '90_DAYS') {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 90);
        } else {
            this.view.showError('Invalid timeframe');
            return;
        }

        this.startProgressController(startDate, endDate);
    }

    handleCustomReport(startIso, endIso) {
        const startDate = new Date(startIso);
        const endDate = new Date(endIso);
        this.startProgressController(startDate, endDate);
    }

    startProgressController(startDate, endDate) {
        // Controller creates the next controller
        const progressCtrl = new NeonovaProgressController();
        progressCtrl.start(
            this.username,
            this.friendlyName,
            startDate,
            endDate
        );

        // Optionally close order modal after starting progress
        this.view.close();  // Add close() to view if not present
    }
}
