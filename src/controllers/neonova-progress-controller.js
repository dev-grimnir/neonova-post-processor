/**
 * Controller for the progress modal during report generation.
 * 
 * Extends BaseNeonovaController to directly access paginateReportLogs and other core methods.
 * Owns the NeonovaProgressView instance, starts pagination with cancellation support,
 * handles success/failure/abort, and forwards progress updates to the view.
 * 
 * Keeps all business logic in the controller — view remains pure UI.
 */
class NeonovaProgressController extends BaseNeonovaController {
    /**
     * @param {string} username 
     * @param {string} friendlyName 
     * @param {Date} [customStart=null] - Optional custom start date for pagination
     * @param {Date} [customEnd=null] - Optional custom end date for pagination
     */
    constructor(username, friendlyName, customStart = null, customEnd = null) {
        super();  // Inherits base URL, defaults, constants, etc.

        this.username = username;
        this.friendlyName = friendlyName;
        this.customStart = customStart;
        this.customEnd = customEnd;

        // Bind handlers for callbacks
        this.handleProgress = this.handleProgress.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleSuccess = this.handleSuccess.bind(this);
        this.handleError = this.handleError.bind(this);

        // Create and own the view
        this.view = new NeonovaProgressView(this.friendlyName);

    }

    start() {
    // ────────────────────────────────────────────────
    // Show owned view and attach cancel handler
    // ────────────────────────────────────────────────
    this.view.showModal(this.handleCancel);

    // ────────────────────────────────────────────────
    // Setup cancellation
    // ────────────────────────────────────────────────
    const abortController = new AbortController();

    // Attach cancel from view
    this.view.onCancel = () => abortController.abort();

    // ────────────────────────────────────────────────
    // Start pagination (with custom dates if provided)
    // ────────────────────────────────────────────────
    this.paginateReportLogs(
        this.username,
        this.customStart,
        this.customEnd,
        this.handleProgress,
        abortController.signal
    ).then(result => {
        this.handleSuccess(result);  // ← pass the full result object
    }).catch(err => {
        this.handleError(err);
    });
}

/**
 * Handles successful completion — closes modal and opens report.
 */
handleSuccess(result) {
    const { entries, metrics } = result;  // ← destructure the new return shape

    // Debug logs (remove after testing)
    console.log('Raw fetched entries count:', entries.length);
    console.log('Computed metrics:', metrics);

    // ────────────────────────────────────────────────
    // Create and open report view in new tab
    // ────────────────────────────────────────────────
    const reportView = new NeonovaReportView(
        this.username,
        this.friendlyName,
        metrics,               // ← pass computed metrics (what the view likely expects)
        entries.length,
        metrics.longDisconnects || []  // ← use longDisconnects from analyzer, default to []
    );
    reportView.openInNewTab();

    // ────────────────────────────────────────────────
    // Close progress modal
    // ────────────────────────────────────────────────
    this.view.close();
}

}
