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
        // No parameters needed
    }

    /**
     * Starts the full report generation pipeline.
     * 
     * @param {string} username 
     * @param {Date|null} startDate 
     * @param {Date|null} endDate 
     * @param {NeonovaProgressView} view 
     * @param {AbortSignal|null} signal 
     */
    async start(username, startDate, endDate, view, signal) {
        let rawEntries = [];

        try {
            // Fetch raw entries using static NeonovaHTTPController
            rawEntries = await NeonovaHTTPController.paginateReportLogs(
                username,
                startDate,              // Customizable startDate
                endDate,                // Customizable endDate
                view.updateProgress.bind(view), // onProgress
                signal                  // AbortSignal for cancellation
            );

            // Sanitize/dedupe using static NeonovaCollector
            const sanitizedEntries = NeonovaCollector.cleanEntries(rawEntries);

            // Generate metrics using static NeonovaAnalyzer
            const metrics = NeonovaAnalyzer.computeMetrics(sanitizedEntries);

            // Success — hand final data to view (view handles report creation in new tab)
            view.finish({
                username: view.username,
                friendlyName: view.friendlyName,
                metrics,
                entries: sanitizedEntries  // cleaned/deduped entries (for length, etc.)
            });
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Report generation cancelled by user');
                return;
            }

            console.error('Report generation failed:', err);
            view.showError(err.message || 'Failed to generate report');
        }
    }
}
