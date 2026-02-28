class NeonovaAddCustomerController {
    constructor(dashboardController) {
        this.dashboardController = dashboardController;
        this.view = new NeonovaAddCustomerView(this);
    }

    show() {
        this.view.show();
    }

    /**
     * Called by view on form submit.
     * Uses the exact existing method on dashboard controller.
     * Closes modal automatically after add (as requested).
     */
    handleSubmit(radiusUsername, friendlyName) {
        this.dashboardController.add(radiusUsername, friendlyName);
        // Auto-close + refresh happens in dashboardController.add()
        this.view.hide();
    }
}
