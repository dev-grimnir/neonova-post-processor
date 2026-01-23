class NeonovaDashboardController extends BaseNeonovaController{
    constructor() {
        super();
            this.customers = this.load();
            this.panelVisible = false;
            this.minimized = false;
            this.pollInterval = null;
            this.pollIntervalMs = 10000;
            this.view = new NeonovaDashboardView(this);
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
        this.view.panel.querySelector('#pollStatus').textContent = 'Fetching...';
        for (const c of this.customers) {
            try {
                const { status, durationSec } = await this.getStatus(c.radiusUsername);
                c.update(status, durationSec);
            } catch {
                c.update('Error', 0);
            }
        }
        this.view.panel.querySelector('#pollStatus').textContent = 'Last update: ' + new Date().toLocaleTimeString();
        this.save();
        if (this.view) this.view.render();
    }

    async getStatus(username) {
        let url = super.getSearchUrl('kandkpepper')
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
     * Uses the most recent log entry to determine current state.
     * Duration formatted as DD:HH:MM:SS, resets to 00:00:00:00 on Stop.
     * Includes extensive logging to catch NaN sources.
     * 
     * @param {Customer} customer
     */
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
    
                if (latest.sessionTime && latest.sessionTime.trim() !== '') {
                    const match = latest.sessionTime.match(/(\d+)h?\s*(\d+)m?\s*(\d*)s?/i);
                    if (match) {
                        const hours   = parseInt(match[1] || '0', 10);
                        const minutes = parseInt(match[2] || '0', 10);
                        const seconds = parseInt(match[3] || '0', 10);
                        durationSeconds = (hours * 3600) + (minutes * 60) + seconds;
                    }
                }
    
                if (durationSeconds === 0 && latest.dateObj && latest.dateObj.getTime) {
                    const now = Date.now();
                    const timeSinceMs = now - latest.dateObj.getTime();
                    if (Number.isFinite(timeSinceMs) && timeSinceMs >= 0) {
                        durationSeconds = Math.floor(timeSinceMs / 1000);
                    }
                }
    
                if (latest.status === 'Stop') {
                    durationSeconds = 0;
                }
    
                durationSeconds = Number.isFinite(durationSeconds) && durationSeconds >= 0 ? durationSeconds : 0;
    
                const status = latest.status === 'Start' ? 'Connected' : 'Not Connected';
                customer.update(status, durationSeconds);
            } catch (err) {
                console.error('updateCustomerStatus failed:', err);
                customer.update('Error', 0);
            }
        }


    getCurrentMonthStart() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    async poll() {
        for (const customer of this.customers) {
            await this.updateCustomerStatus(customer);
        }
        this.save();
        this.view.render();
    }    
}
