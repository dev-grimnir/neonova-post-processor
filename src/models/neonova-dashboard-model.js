class NeonovaDashboardModel {
    constructor() {
        // Core data
        this.customers = [];           // array of Customer instances
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
        return [...this.customers];
    }

    getCustomer(username) {
        return this.customers.find(c => c.radiusUsername === username);
    }

    addOrUpdateCustomer(customerData) {
        if (!customerData || !customerData.radiusUsername) return null;

        const username = customerData.radiusUsername;
        const existing = this.getCustomer(username);
        if (existing) {
            Object.assign(existing, customerData);
        } else {
            // Ensure we always store a real Customer instance (with .update etc.)
            const customer = customerData instanceof Customer ? customerData : new Customer(username, customerData.friendlyName || '');
            Object.assign(customer, customerData);
            this.customers.push(customer);
        }

        this.lastUpdate = new Date();
        return this.getCustomer(username);
    }

    removeCustomer(username) {
        this.customers = this.customers.filter(c => c.radiusUsername !== username);
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
            customers: this.customers,
            pollingIntervalMinutes: this.pollingIntervalMinutes,
            isPollingPaused: this.isPollingPaused,
            lastUpdate: this.lastUpdate?.toISOString() ?? null,
        };
    }
}
