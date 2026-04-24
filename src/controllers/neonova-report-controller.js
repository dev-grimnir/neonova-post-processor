class NeonovaReportController {

    constructor(username, friendlyName, metrics, entryCount, longDisconnects, sanitizedEntries = [], requestedStart = null, requestedEnd = null) {
        this.username        = username;
        this.friendlyName    = friendlyName || username;
        this.metrics         = metrics;
        this.entryCount      = entryCount;
        this.longDisconnects = longDisconnects || [];
        this.sanitizedEntries = sanitizedEntries;

        // Used to seed the inline snapshot without a refetch
        this.requestedStart = requestedStart;
        this.requestedEnd   = requestedEnd;

        this.model = new NeonovaReportModel(
            username, friendlyName, metrics, entryCount, longDisconnects
        );
        this.view = new NeonovaReportView(this, this.model);
        this.view.show();
    }

    /**
     * Called by NeonovaReportView when it's ready to mount the inline
     * snapshot. Builds the snapshot model from in-memory report data
     * (no refetch), creates a headless snapshot controller, and seeds
     * its history stack so "Back" returns to the report's original range.
     *
     * Returns { snapshotController, snapshotModel } or nulls on failure.
     */
    createInlineSnapshot() {
        if (!this.requestedStart || !this.requestedEnd) {
            console.warn('NeonovaReportController: cannot mount inline snapshot without a requested range');
            return { snapshotController: null, snapshotModel: null };
        }

        const snapshotModel = new NeonovaSnapshotModel(
            this.username,
            this.friendlyName,
            this.requestedStart,
            this.requestedEnd,
            this.metrics,
            this.sanitizedEntries
        );

        // Headless controller — no ViewClass, so no spinner-and-show flow runs.
        const snapshotController = new NeonovaSnapshotController(
            this.username,
            this.friendlyName,
            this.requestedStart,
            this.requestedEnd,
            null
        );
        snapshotController.seedHistory(snapshotModel);

        return { snapshotController, snapshotModel };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeonovaReportController;
}
