/**
 * Controller for the progress modal during report generation.
 * 
 * Owns the NeonovaProgressView instance, starts pagination with cancellation support,
 * handles success/failure/abort, and forwards progress updates to the view.
 * 
 * Keeps all business logic out of the view for clean separation.
 */
class NeonovaProgressController {
    /**
     * @param {string} username 
     * @param {string} friendlyName 
     * @param {BaseNeonovaController} baseController - Instance for pagination
     */
    constructor(username, friendlyName, baseController) {
        this.username = username;
        this.friendlyName = friendlyName;
        this.baseController = baseController;

        // Create and own the view
        this.view = new NeonovaProgressView(this.friendlyName);

        // Bind handlers
        this.handleProgress = this.handleProgress.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleSuccess = this.handleSuccess.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    /**
     * Starts the report generation flow: shows modal, begins pagination with abort support.
     */
    start() {
        this.view.showModal(this.handleCancel);

        const abortController = new AbortController();

        // Attach cancel from view
        this.view.onCancel = () => abortController.abort();

        this.baseController.paginateReportLogs(
            this.username,
            null, null,
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
        // Your existing finish logic (create report view, open tab, etc.)
        const reportView = new NeonovaReportView(
            this.username,
            this.friendlyName,
            /* metrics from entries */,
            entries.length,
            /* long disconnects */
        );
        reportView.openInNewTab();
        this.view.close();  // or trigger finish animation
    }

    /**
     * Handles errors/abort — shows message and closes modal.
     */
    handleError(err) {
        if (err.name === 'AbortError') {
            console.log('Report generation cancelled');
            this.view.showStatus('Cancelled');
        } else {
            console.error('Report generation failed:', err);
            this.view.showStatus('Generation failed');
        }
        setTimeout(() => this.view.close(), 1000);
    }
}
