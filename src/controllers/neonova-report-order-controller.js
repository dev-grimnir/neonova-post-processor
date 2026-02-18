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

        // Bind handler
        this.handleGenerateRequested = this.handleGenerateRequested.bind(this);
        
        // Create and own the view
        this.view = new NeonovaReportOrderView(this.friendlyName, this.handleGenerateRequested);
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
    handleGenerateRequested(startIso, endIso) {
        // Convert ISO strings to Date objects
        const startDate = new Date(startIso);
        const endDate = new Date(endIso);
    
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
            console.error('Invalid date range');
            // Optional: alert('Invalid date range selected');
            return;  // Early exit on bad dates
        }
    
        // Close order modal
        this.view.close();
    
        // Pass Date objects to progress controller
        const progressController = new NeonovaProgressController(
            this.username,
            this.friendlyName,
            startDate,  // ← Date
            endDate     // ← Date
        );
        progressController.start();
    }
}
