class NeonovaSnapshotModel {
    constructor(username, friendlyName, startDate, endDate, metrics, entries = []) {
        this.username     = username;
        this.friendlyName = friendlyName || username;
        this.startDate    = startDate;
        this.endDate      = endDate;
        this.metrics      = metrics || {};
        this.entries      = entries || [];
    }

    getUsername()     { return this.username; }
    getFriendlyName() { return this.friendlyName; }
    getStartDate()    { return this.startDate; }
    getEndDate()      { return this.endDate; }
    getMetrics()      { return this.metrics; }
    getEntries()      { return this.entries; }

    getLongDisconnects() {
        return this.metrics.longDisconnects || [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeonovaSnapshotModel;
}
