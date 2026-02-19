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
        this.view.showModal(this.handleCancel);
    
        this.abortController = new AbortController();
    
        NeonovaHTTPController.fetchAllRawEntries(
            this.username,
            this.customStart || new Date(),
            this.customEnd || new Date(),
            {
                signal: this.abortController.signal,
                onProgress: this.handleProgress
            }
        )
        .then(rawResult => {
            console.log('[ProgressCtrl] Raw result received — entries:', rawResult.rawEntries.length);
        
            // No inner try/catch needed unless you want very granular logging
            const { cleaned, ignoredCount } = NeonovaCollector.cleanEntries(rawResult.rawEntries);
            console.log('[ProgressCtrl] Cleaned:', cleaned.length, 'Ignored:', ignoredCount);
        
            const analyzer = new NeonovaAnalyzer(cleaned);
            const metrics = analyzer.computeMetrics();
            console.log('[ProgressCtrl] Metrics ready');
        
            this.handleSuccess({ entries: cleaned, metrics, ignoredCount });
        })
        .catch(err => {
            console.error('[ProgressCtrl] Error during fetch/clean/analyze:', err);
            this.handleError(err);
        });

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
