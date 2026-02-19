class NeonovaProgressController {
    constructor(username, friendlyName, customStart = null, customEnd = null) {
        this.username = username;
        this.friendlyName = friendlyName;
        this.customStart = customStart;
        this.customEnd = customEnd;

        this.view = new NeonovaProgressView(this.friendlyName);

        this.handleCancel = this.handleCancel.bind(this);
        this.handleSuccess = this.handleSuccess.bind(this);
        this.handleError = this.handleError.bind(this);
        this.handleProgress = this.handleProgress.bind(this);
    }

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
        
            const { cleaned, ignoredCount } = NeonovaCollector.cleanEntries(rawResult.rawEntries);
        
            const analyzer = new NeonovaAnalyzer(cleaned);
            const metrics = analyzer.computeMetrics();
            console.log('[ProgressCtrl] Metrics ready');
        
            this.handleSuccess({ entries: cleaned, metrics, ignoredCount });
        })
        .catch(err => {
            console.error('[ProgressCtrl] Error during fetch/clean/analyze:', err);
            this.handleError(err);
        });
    }

    handleProgress(progress) {
        this.view.updateProgress(
            progress.fetched,
            progress.total || 0,
            progress.page
        );
    }

    handleCancel() {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.view.close();
    }

    handleSuccess(result) {
        const { entries, metrics, ignoredCount } = result;

        console.log('Raw fetched entries count:', entries.length);
        console.log('Computed metrics:', metrics);

        const reportView = new NeonovaReportView(
            this.username,
            this.friendlyName,
            metrics,
            entries.length,
            ignoredCount,
            metrics.longDisconnects || []
        );
        reportView.openInNewTab();

        this.view.close();
    }

    handleError(err) {
        let message = 'An error occurred during report generation.';
        if (err.name === 'AbortError') {
            message = 'Report generation cancelled.';
        } else if (err.message.includes('HTTP')) {
            message = 'Failed to fetch logs from server.';
        }

        // Temporary fallback since showError might not exist yet
        console.error('Error:', message, err);
        // this.view.showError(message);  // comment if method missing

        setTimeout(() => this.view.close(), 3000);
    }
}
