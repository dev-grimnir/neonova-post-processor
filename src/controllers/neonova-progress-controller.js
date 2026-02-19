/**
 * Controller for the progress modal during report generation.
 * Owns the NeonovaProgressView instance, starts raw data fetching via NeonovaHTTPController,
 * handles progress/cancellation/success/error, and forwards cleaned data to analyzer + report view.
 */
class NeonovaProgressController {
    /**
     * @param {string} username 
     * @param {string} friendlyName 
     * @param {Date} [customStart=null] - Optional custom start date
     * @param {Date} [customEnd=null] - Optional custom end date
     */
    constructor(username, friendlyName, customStart = null, customEnd = null) {
        this.username = username;
        this.friendlyName = friendlyName;
        this.customStart = customStart;
        this.customEnd = customEnd;

        // Create and own the view
        this.view = new NeonovaProgressView(this.friendlyName);

        // Bind handlers
        this.handleCancel = this.handleCancel.bind(this);
        this.handleSuccess = this.handleSuccess.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleProgress = this.handleProgress.bind(this);
    }

    /**
     * Starts the report generation process.
     */
    start() {
        // Show modal and attach cancel handler
        this.view.showModal(this.handleCancel);

        // Setup cancellation
        this.abortController = new AbortController();

        // Start fetching raw entries
        NeonovaHTTPController.fetchAllRawEntries(
            this.username,
            this.customStart || new Date(),  // fallback to today if no custom start
            this.customEnd || new Date(),
            {
                signal: this.abortController.signal,
                onProgress: this.handleProgress
            }
        )
        .then(rawResult => {
            // Raw fetch complete → clean → analyze → success
            const { rawEntries } = rawResult;

            // Clean (dedup, normalize) via Collector
            const { cleaned, ignoredCount } = NeonovaCollector.cleanEntries(rawEntries);

            // Analyze
            const analyzer = new NeonovaAnalyzer(cleaned);
            const metrics = analyzer.computeMetrics();

            // Success with cleaned entries + metrics
            this.handleSuccess({ entries: cleaned, metrics, ignoredCount });
        })
        .catch(err => {
            this.handleError(err);
        });
    }

    /**
     * Progress callback – forwards to view
     * @param {{fetched: number, total?: number, page: number}} progress
     */
    handleProgress(progress) {
        this.view.updateProgress(
            progress.fetched,
            progress.total || 0,
            progress.page
        );
    }

    /**
     * Cancel handler – aborts fetch and closes modal
     */
    handleCancel() {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.view.close();
    }

    /**
     * Success handler – opens report and closes modal
     * @param {{entries: LogEntry[], metrics: Object, ignoredCount: number}} result
     */
    handleSuccess(result) {
        const { entries, metrics, ignoredCount } = result;

        console.log('Raw fetched entries count:', entries.length); // debug
        console.log('Computed metrics:', metrics);

        // Create and open report view
        const reportView = new NeonovaReportView(
            this.username,
            this.friendlyName,
            metrics,
            entries.length,
            ignoredCount,
            metrics.longDisconnects || []
        );
        reportView.openInNewTab();

        // Close progress modal
        this.view.close();
    }

    /**
     * Error handler – shows error in view and closes modal
     * @param {Error} err
     */
    handleError(err) {
        let message = 'An error occurred during report generation.';
        if (err.name === 'AbortError') {
            message = 'Report generation cancelled.';
        } else if (err.message.includes('HTTP')) {
            message = 'Failed to fetch logs from server.';
        }

        this.view.showError(message);
        console.error('Report error:', err);

        // Close modal after short delay so user sees error
        setTimeout(() => this.view.close(), 3000);
    }
}
