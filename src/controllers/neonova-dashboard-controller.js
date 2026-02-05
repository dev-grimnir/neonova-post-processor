class NeonovaDashboardController extends BaseNeonovaController{
    constructor() {
        super();
        this.customers = this.load();
        this.panelVisible = false;
        this.minimized = false;
        this.pollInterval = null;
        this.pollIntervalMs = 10000;
        this.view = new NeonovaDashboardView(this);
        this.isPollingPaused = false;
        
    }

    togglePolling() {
        this.isPollingPaused = !this.isPollingPaused;
        if (this.isPollingPaused) {
        } else {
            this.poll(); // immediate update when resuming
        }
        //if (this.view) this.view.updatePollingButton(); // optional: refresh button text
    }

    togglePanel() {
        this.panelVisible = !this.panelVisible;
        if (this.panelVisible) {
            if (!this.view) {
                try {
                    this.view = new NeonovaDashboardView(this);
                } catch (err) {
                    return;
                }
            }
            this.view.show();
            this.startPolling();
        } else {
            this.view?.hide();
            this.stopPolling();
        }
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

    add(radiusUsername, friendlyName) {
        if (!radiusUsername?.trim()) {
            alert('RADIUS username required');
            return;
        }
        if (this.customers.some(c => c.radiusUsername === radiusUsername.trim())) {
            alert('Already added');
            return;
        }
        this.customers.push(new Customer(radiusUsername, friendlyName));
        this.save();
        if (this.view) this.view.render();
        this.poll();  // Immediate update for the new customer
    }

    remove(radiusUsername) {
        this.customers = this.customers.filter(c => c.radiusUsername !== radiusUsername);
        this.save();
        if (this.view) this.view.render();
    }

    toggleMinimize() {
        this.minimized = !this.minimized;
        //if (this.view) this.view.updateMinimize();
    }


    startPolling() {
        if (this.pollInterval) return;
        this.poll();
        this.pollInterval = setInterval(() => this.poll(), 60000); // 1 min - adjust later
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    async poll() {
        if (this.isPollingPaused) {
            return;
        }
    
        const pollStatusEl = this.view?.panel?.querySelector('#pollStatus');
        if (pollStatusEl) pollStatusEl.textContent = 'Fetching...';
    
        for (const customer of this.customers) {
            try {
                await this.updateCustomerStatus(customer);
            } catch (err) {
                customer.update('Error', 0);
            }
        }
    
        this.save();
        if (this.view) this.view.render();
        if (pollStatusEl) pollStatusEl.textContent = 'Last update: ' + new Date().toLocaleTimeString();
    }

    isPollingActive() {
        return !this.isPollingPaused && !!this.pollInterval;
    }

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

    /**
     * Updates the customer's status and duration on the dashboard.
     * Fetches the most recent log entry, determines current state,
     * calculates duration in seconds (numeric), and passes it to customer.update.
     * The view will handle formatting via c.getDurationStr().
     */
    async updateCustomerStatus(customer) {
        try {
            const latest = await this.getLatestEntry(customer.radiusUsername);
            if (!latest) {
                customer.update('Unknown', 0);
                return;
            }
    
            let durationSeconds = 0;

            if (latest.dateObj && latest.dateObj.getTime) {
                const now = Date.now();
                const ms = now - latest.dateObj.getTime();
                
                if (Number.isFinite(ms) && ms >= 0) {
                        durationSeconds = Math.floor(ms / 1000);
                }
            }

            // Guard (should almost never trigger, but safe)
            durationSeconds = Number.isFinite(durationSeconds) && durationSeconds >= 0 ? durationSeconds : 0;
    
            const status = latest.status === 'Start' ? 'Connected' : 'Not Connected';
            customer.update(status, durationSeconds);
            } catch (err) {
                customer.update('Error', 0);
            }
        }


    getCurrentMonthStart() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }   

    async generateReportData(username, friendlyName, startDate, endDate, onProgress) {
        const reportCtrl = new NeonovaReportController();
        return reportCtrl.generateReportData(username, friendlyName, startDate, endDate, onProgress);
    }
}
