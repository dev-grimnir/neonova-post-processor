class NeonovaReportOrderController extends BaseNeonovaController {
    constructor(username, friendlyName, view) {
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

    async generateReport(startDate, endDate) {
        // Close order modal (let view handle if it has close, or force here)
        this.view.close();  // Add this method to view if missing (close overlay/modal)

        // Create and start progress controller — this is the hand-off
        const progressCtrl = new NeonovaProgressController();
        await progressCtrl.start(
            this.username,
            this.friendlyName,
            startDate,
            endDate
        );
    }
}
