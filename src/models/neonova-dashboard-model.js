class NeonovaDashboardModel {
    constructor() {
        this.customers = [];  // Array of plain objects: { radiusUsername, friendlyName?, status, durationSec, lastEventTime?, ... }
        this.pollingIntervalMinutes = 1;
        this.isPollingPaused = false;
        this.lastUpdate = null;
        this.lastUpdatedDisplay = '--';
    }

    // ─── Basic accessors ─────────────────────────────────────────────

    getCustomer(username) {
        return this.customers.find(c => c.radiusUsername === username);
    }

    addOrUpdateCustomer(customerData) {
        const idx = this.customers.findIndex(c => c.radiusUsername === customerData.radiusUsername);
        if (idx >= 0) {
            this.customers[idx] = { ...this.customers[idx], ...customerData };
        } else {
            this.customers.push(customerData);
        }
    }

    removeCustomer(username) {
        this.customers = this.customers.filter(c => c.radiusUsername !== username);
    }

    getCustomersArray() {
        return [...this.customers];
    }

    // Polling settings
    setPollingInterval(minutes) {
        const safe = Math.max(1, Math.min(60, Number(minutes)));
        this.pollingIntervalMinutes = safe;
    }

    togglePolling() {
        this.isPollingPaused = !this.isPollingPaused;
    }

    // Optional: simple computed / status
    get isPollingActive() {
        return !this.isPollingPaused;
    }

    get lastUpdateFormatted() {
        return this.lastUpdate ? this.lastUpdate.toLocaleTimeString() : 'Never';
    }

    toJSON() {
        return {
            customers: this.customers,
            pollingIntervalMinutes: this.pollingIntervalMinutes,
            isPollingPaused: this.isPollingPaused,
            lastUpdate: this.lastUpdate?.toISOString(),
            lastUpdatedDisplay: this.lastUpdatedDisplay
        };
    }
}
