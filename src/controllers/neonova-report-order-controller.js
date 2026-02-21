class NeonovaReportOrderController {
    constructor(username, friendlyName) {
        super();
        this.username = username;
        this.friendlyName = friendlyName || username;
        this.view = view;

        // View notifies us when user clicks Generate
        this.view.onGenerateRequested = (startDate, endDate) => {
            this.generateReport(startDate, endDate);
        };
    }

    start() {
        try {
            this.view.renderOrderForm();
            this.view.showModal();  // Assuming view has this; if not, call it here or adjust
        } catch (err) {
            console.error('Failed to start order view:', err);
            // Show error in view or dashboard
        }
    }
}
