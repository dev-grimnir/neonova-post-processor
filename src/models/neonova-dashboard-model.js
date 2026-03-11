// src/models/neonova-dashboard-model.js  (or wherever models live)

export class NeonovaDashboardModel {
    constructor() {
        // Core data
        this.customers = new Map();           // radiusUsername → customer object (we'll keep plain objects for now)
        this.pollingIntervalMinutes = 5;
        this.isPollingPaused = false;
        this.lastUpdate = null;

        // Optional future extensions
        // this.sortColumn = 'status';
        // this.sortDirection = 'desc';
        // this.filters = {};
    }

    // ─── Basic accessors ─────────────────────────────────────────────

    getCustomersArray() {
        return Array.from(this.customers.values());
    }

    getCustomer(username) {
        return this.customers.get(username);
    }

    addOrUpdateCustomer(customerData) {
        const username = customerData.radiusUsername;
        if (!username) return null;

        // If we already have it → shallow merge (protect friendlyName etc.)
        const existing = this.customers.get(username);
        if (existing) {
            Object.assign(existing, customerData);
        } else {
            this.customers.set(username, { ...customerData });
        }

        this.lastUpdate = new Date();
        return this.customers.get(username);
    }

    removeCustomer(username) {
        this.customers.delete(username);
        this.lastUpdate = new Date();
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

    // For future persistence / debug
    toJSON() {
        return {
            customers: Array.from(this.customers.values()),
            pollingIntervalMinutes: this.pollingIntervalMinutes,
            isPollingPaused: this.isPollingPaused,
            lastUpdate: this.lastUpdate?.toISOString() ?? null,
        };
    }
}
