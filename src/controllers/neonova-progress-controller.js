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

        // Create and own the view
        this.view = new NeonovaProgressView(this.friendlyName);

        // Bind handlers for callbacks
        this.handleProgress = this.handleProgress.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleSuccess = this.handleSuccess.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    /**
     * Starts the report generation flow: shows modal, begins pagination with abort support.
     */
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
        ).then(entries => {
            this.handleSuccess(entries);
        }).catch(err => {
            this.handleError(err);
        });
    }

    /**
     * Forwards progress updates to the view.
     */
    handleProgress(collected, total, page) {
        this.view.updateProgress(collected, total, page);
    }

    /**
     * Handles successful completion — closes modal and opens report.
     */
    handleSuccess(entries) {
        // ────────────────────────────────────────────────
        // Create and open report view in new tab
        // ────────────────────────────────────────────────
        const reportView = new NeonovaReportView(
            this.username,
            this.friendlyName,
            /* metrics from entries */,
            entries.length,
            /* long disconnects */
        );
        reportView.openInNewTab();

        // ────────────────────────────────────────────────
        // Close progress modal
        // ────────────────────────────────────────────────
        this.view.close();
    }

    /**
     * Handles errors/abort — shows message and closes modal.
     */
    handleError(err) {
        if (err.name === 'AbortError') {
            console.log('Report generation cancelled by user');
            this.view.showStatus('Cancelled');
        } else {
            console.error('Report generation failed:', err);
            this.view.showStatus('Generation failed');
        }
        setTimeout(() => this.view.close(), 1000);
    }
}
