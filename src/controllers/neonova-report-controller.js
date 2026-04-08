class NeonovaReportController {
    model;
    constructor(username, friendlyName, metrics, length, longDisconnects) {
        this.model = new NeonovaReportModel(
            username,
            friendlyName,
            metrics,
            length,
            metrics.longDisconnects || []
        );

        this.view = new NeonovaReportView(this, this.model);
        this.view.show();
    }

    openDailySnapshot(dateStr) {   // dateStr like "2026-03-22"
        const [year, month, day] = dateStr.split('-').map(Number);
        const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        const endDate   = new Date(year, month - 1, day, 23, 59, 59, 999);
    
        new NeonovaSnapshotController(
            this.model.username,
            this.model.friendlyName,
            startDate,
            endDate
        );
    }
    
}
