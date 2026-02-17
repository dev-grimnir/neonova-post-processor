/**
 * Controller for the report order modal (date selection).
 * 
 * Owns NeonovaReportOrderView, collects user date input, validates,
 * closes its view, and hands off to NeonovaProgressController for actual generation.
 * 
 * No direct knowledge of progress or report views — pure orchestration.
 */
class NeonovaReportOrderController extends BaseNeonovaController {
    /**
     * @param {string} username 
     * @param {string} friendlyName 
     */
    constructor(username, friendlyName) {
        super();  // Inherits pagination methods/constants if needed later

        this.username = username;
        this.friendlyName = friendlyName || username;

        // Create and own the view
        this.view = new NeonovaReportOrderView(this.friendlyName, this.handleGenerateRequested);

        // Bind handler
        this.handleGenerateRequested = this.handleGenerateRequested.bind(this);
    }

    /**
     * Starts the order flow: shows modal and attaches generate handler.
     */
    start() {
        // Pass callback to view — view will call it with selected dates
        this.view.showModal(this.handleGenerateRequested);
    }

    /**
     * Called by view when user clicks generate (with validated dates).
     * Closes order modal and starts progress controller.
     * 
     * @param {Date} startDate 
     * @param {Date} endDate 
     */
    handleGenerateRequested(startDate, endDate) {
        // Close order modal cleanly
        this.view.close();

        // Hand off to progress controller with selected range
        const progressController = new NeonovaProgressController(
            this.username,
            this.friendlyName,
            startDate,
            endDate  // Pass custom dates
        );
        progressController.start();
    }
}
