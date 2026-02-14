class NeonovaDashboardController extends BaseNeonovaController {
    constructor() {
        super();

        // Load persisted customer list from localStorage
        this.customers = this.#loadCustomers();

        // Polling configuration
        this.pollingIntervalMinutes = 5;              // Default interval in minutes
        this.pollIntervalMs = this.pollingIntervalMinutes * 60 * 1000;
        this.pollInterval = null;                     // setInterval reference
        this.isPollingPaused = false;

        // View reference (set after instantiation in main script)
        this.view = new NeonovaDashboardView(this);
    }

    // ────────────────────────────────────────────────
    // Polling control methods
    // ────────────────────────────────────────────────

    /**
     * Starts automatic polling if not already running.
     * Performs an immediate poll, then sets up the interval.
     */
    startPolling() {
        if (this.pollInterval) return;   // Already running

        this.poll();                     // Immediate first poll
        this.pollInterval = setInterval(() => this.poll(), this.pollIntervalMs);
    }

    /**
     * Stops automatic polling.
     */
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    /**
     * Changes the polling interval (1–60 minutes).
     * If polling is active, restarts the interval with the new value.
     */
    setPollingInterval(minutes) {
        minutes = Math.max(1, Math.min(60, parseInt(minutes, 10) || 5));
        this.pollingIntervalMinutes = minutes;
        this.pollIntervalMs = minutes * 60 * 1000;

        if (this.pollInterval) {
            this.stopPolling();
            this.startPolling();
        }
    }

    /**
     * Toggles pause/resume of polling.
     * When resumed, performs an immediate poll.
     */
    togglePolling() {
        this.isPollingPaused = !this.isPollingPaused;

        if (!this.isPollingPaused) {
            this.poll();   // Immediate poll when resuming
        }

        this.view?.update();   // Refresh UI (e.g. button text)
    }

    /**
     * Returns true if polling is active and not paused.
     */
    isPollingActive() {
        return !this.isPollingPaused && !!this.pollInterval;
    }

    // ────────────────────────────────────────────────
    // Customer management (persisted in localStorage)
    // ────────────────────────────────────────────────

    /**
     * Loads the customer list from localStorage.
     * Returns an empty array on error or missing data.
     */
    #loadCustomers() {
        const data = localStorage.getItem('novaDashboardCustomers');
        if (!data) return [];

        try {
            return JSON.parse(data).map(c => Object.assign(new Customer('', ''), c));
        } catch (err) {
            console.error('Failed to load customers from localStorage:', err);
            return [];
        }
    }

    /**
     * Saves the current customer list to localStorage.
     */
    #saveCustomers() {
        localStorage.setItem('novaDashboardCustomers', JSON.stringify(this.customers));
    }

    /**
     * Adds a new customer to the dashboard.
     * Prevents duplicates and immediately polls for status.
     */
    add(radiusUsername, friendlyName = '') {
        const trimmedUsername = radiusUsername?.trim();
        if (!trimmedUsername) return;

        if (this.customers.some(c => c.radiusUsername === trimmedUsername)) {
            alert('Customer already added');
            return;
        }

        this.customers.push(new Customer(trimmedUsername, friendlyName));
        this.#saveCustomers();
        this.view?.render();
        this.poll();   // Immediate status update for the new customer
    }

    /**
     * Removes a customer from the dashboard.
     */
    remove(radiusUsername) {
        this.customers = this.customers.filter(c => c.radiusUsername !== radiusUsername);
        this.#saveCustomers();
        this.view?.render();
    }

    // ────────────────────────────────────────────────
    // Polling and status update logic
    // ────────────────────────────────────────────────

    /**
     * Performs a status poll for all customers.
     * Skips if polling is paused.
     * Updates UI with "Fetching..." and last update time.
     */
    async poll() {
        if (this.isPollingPaused) return;

        const pollStatusEl = this.view?.panel?.querySelector('#pollStatus');
        if (pollStatusEl) pollStatusEl.textContent = 'Fetching...';

        for (const customer of this.customers) {
            await this.#updateSingleCustomerStatus(customer);
        }

        this.#saveCustomers();
        this.view?.render();

        if (pollStatusEl) {
            pollStatusEl.textContent = 'Last update: ' + new Date().toLocaleTimeString();
        }
    }

    /**
     * Updates status for a single customer using the latest log entry.
     * Calculates duration in seconds since the last event.
     */
    async #updateSingleCustomerStatus(customer) {
        try {
            const latest = await this.getLatestEntry(customer.radiusUsername);
            if (!latest) {
                customer.update('Unknown', 0);
                return;
            }

            let durationSeconds = 0;
            if (latest.dateObj?.getTime) {
                const msSince = Date.now() - latest.dateObj.getTime();
                if (Number.isFinite(msSince) && msSince >= 0) {
                    durationSeconds = Math.floor(msSince / 1000);
                }
            }

            // Safety guard
            durationSeconds = Number.isFinite(durationSeconds) && durationSeconds >= 0 ? durationSeconds : 0;

            const status = latest.status === 'Start' ? 'Connected' : 'Not Connected';
            customer.update(status, durationSeconds);
        } catch (err) {
            console.error(`Failed to update status for ${customer.radiusUsername}:`, err);
            customer.update('Error', 0);
        }
    }

    // ────────────────────────────────────────────────
    // Utility methods
    // ────────────────────────────────────────────────

    /**
     * Returns a Date object for the first day of the current month.
     * Used as default start date for reports.
     */
    getCurrentMonthStart() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }

    /**
     * Delegates report generation to the dedicated report controller.
     */
    async generateReportData(username, friendlyName, startDate, endDate, onProgress) {
        const reportCtrl = new NeonovaReportController();
        return reportCtrl.generateReportData(username, friendlyName, startDate, endDate, onProgress);
    }

    // ────────────────────────────────────────────────
    // Old/unused methods (commented out for reference)
    // ────────────────────────────────────────────────

    /*
    async getStatus(username) {
        let url = super.getSearchUrl(username)
        const res = await fetch(url, { credentials: 'include', cache: 'no-cache' });
        if (!res.ok) throw new Error('Fetch failed');

        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const table = doc.querySelector('table[cellspacing="2"][cellpadding="2"]');
        if (!table || table.rows.length < 2) return { status: 'Unknown', durationSec: 0 };

        // Assume newest row first, status in cell 4 (adjust index if needed)
        const latest = table.rows[1];
        const statusText = latest.cells[4]?.textContent.trim().toLowerCase() || '';
        const timestamp = latest.cells[0]?.textContent.trim() || '';

        let status = 'Unknown';
        let durationSec = 0;

        if (statusText.includes('start') || statusText.includes('connect')) {
            status = 'Connected';
        } else if (statusText.includes('stop') || statusText.includes('disconnect')) {
            status = 'Not Connected';
            // Rough duration: from timestamp to now (improve with last Start if available)
            const lastTime = new Date(timestamp).getTime();
            durationSec = Math.round((Date.now() - lastTime) / 1000);
        }

        return { status, durationSec };
    }

    load() {
        const data = localStorage.getItem('novaDashboardCustomers');
        if (!data) return [];
        try {
            return JSON.parse(data).map(c => Object.assign(new Customer('', ''), c));
        } catch {
            return [];
        }
    }

    save() {
        localStorage.setItem('novaDashboardCustomers', JSON.stringify(this.customers));
    }
    */
}
