class NeonovaReportModel {
    constructor(username, friendlyName, metrics, entryCount, longDisconnects, sanitizedEntries = []) {
        this.username = username;
        this.friendlyName = friendlyName || username;
        this.metrics = metrics;
        this.entryCount = entryCount;
        this.longDisconnects = longDisconnects || [];
        this.sanitizedEntries = sanitizedEntries;   // for future daily EKG feature
    }

    get totalEntries() {
        return this.entryCount;
    }

    get disconnectCount() {
        return this.longDisconnects.length;
    }
}
