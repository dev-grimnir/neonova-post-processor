// src/controllers/NeonovaProgressController.js

/**
 * NeonovaProgressController
 * 
 * Dedicated controller for the progress modal and pagination flow.
 * Separates concerns completely:
 * - Drives NeonovaHTTPController for raw data fetching
 * - Uses NeonovaCollector to sanitize/dedupe the raw entries
 * - Uses NeonovaAnalyzer to generate metrics from the sanitized entries
 * - Manages NeonovaProgressView (pure UI)
 * - Handles progress, cancellation, success, and errors
 */
class NeonovaProgressController {
    constructor() {
        // No parameters needed — all handled in start()
    }

    /**
     * Starts the progress modal and begins the full report generation pipeline.
     * 
     * @param {string} username 
     * @param {string} friendlyName 
     */
    async start(username, friendlyName) {
        const progressView = new NeonovaProgressView(username, friendlyName);
        progressView.showModal();

        let rawEntries = [];

        try {
            // Fetch raw entries using static NeonovaHTTPController
            rawEntries = await NeonovaHTTPController.paginateReportLogs(
                username,
                null,                                           // startDate
                null,                                           // endDate
                progressView.updateProgress.bind(progressView), // onProgress
                progressView.signal                             // AbortSignal
            );

            // Sanitize/dedupe using static NeonovaCollector
            const sanitizedEntries = NeonovaCollector.cleanEntries(rawEntries);

            // Generate metrics using static NeonovaAnalyzer
            const metrics = NeonovaAnalyzer.computeMetrics(sanitizedEntries);

            // Success — hand final data to view (view handles report creation in new tab)
            progressView.finish({
                username,
                friendlyName,
                metrics,
                entries: sanitizedEntries  // cleaned/deduped entries
            });
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Report generation cancelled by user');
                return;
            }

            console.error('Report generation failed:', err);
            progressView.showError(err.message || 'Failed to generate report');
        }
    }
}
