class NeonovaDashboardController {
    constructor() {
        this.customers = this.load();
        this.pollingIntervalMinutes = 5;
        this.pollIntervalMs = 5 * 60 * 1000;
        this.pollInterval = null;  
        this.view = new NeonovaDashboardView(this);
        this.isPollingPaused = false;
    }

    startPolling() {
        if (this.pollInterval) return;
        this.poll();
        this.pollInterval = setInterval(() => this.poll(), this.pollIntervalMs);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    setPollingInterval(minutes) {
        minutes = Math.max(1, Math.min(60, parseInt(minutes) || 5));
        this.pollingIntervalMinutes = minutes;
        this.pollIntervalMs = minutes * 60 * 1000;
    
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = setInterval(() => this.poll(), this.pollIntervalMs);
        }
    }

    togglePolling() {
        this.isPollingPaused = !this.isPollingPaused;
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        if (!this.isPollingPaused) {
            this.poll();  // Immediate update on resume
            this.pollInterval = setInterval(() => this.poll(), this.pollIntervalMs);
        }
        this.view?.render();  // Refresh UI to show pause/resume state
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
        let url = NeonovaHTTPController.getSearchUrl(username);
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

    async updateCustomerStatus(customer) {
        try {
            // Compute sinceDate: prefer lastEventTime (event ms), fallback to lastUpdate
            let sinceDate = null;
            if (customer.lastEventTime !== null) {
                sinceDate = new Date(customer.lastEventTime);
            } else if (customer.lastUpdate) {
                const lastUpdateDate = new Date(customer.lastUpdate);
                if (!isNaN(lastUpdateDate.getTime())) {
                    sinceDate = lastUpdateDate;
                }
            }
    
            const latest = await NeonovaHTTPController.getLatestEntry(customer.radiusUsername, sinceDate);
            if (!latest) {
                // No new events: increment duration client-side using lastEventTime
                if (customer.lastEventTime !== null) {
                    const eventDate = new Date(customer.lastEventTime);
                    if (!isNaN(eventDate.getTime())) {
                        const durationSeconds = Math.floor((Date.now() - eventDate.getTime()) / 1000);
                        if (durationSeconds >= 0) {
                            customer.update(customer.status, durationSeconds);
                        }
                    }
                }
                return;
            }
    
            const eventDate = latest.dateObj;  // Already a Date object
            const eventMs = eventDate.getTime();
            let durationSeconds = Math.floor((Date.now() - eventMs) / 1000);
            if (durationSeconds < 0) durationSeconds = 0;
    
            const status = latest.status === 'Start' ? 'Connected' : 'Not Connected';
    
            // Check if truly new (timestamp > existing lastEventTime)
            const isNew = customer.lastEventTime === null || eventMs > customer.lastEventTime;
    
            if (isNew) {
                customer.update(status, durationSeconds);
                customer.lastEventTime = eventMs;
                console.log('[updateCustomerStatus] Updated with new event:', { status, durationSeconds, timestamp: latest.timestamp });
            } else {
                // No change: increment using existing lastEventTime
                if (customer.lastEventTime !== null) {
                    const existingEventDate = new Date(customer.lastEventTime);
                    durationSeconds = Math.floor((Date.now() - existingEventDate.getTime()) / 1000);
                    if (durationSeconds >= 0) {
                        customer.update(customer.status, durationSeconds);
                    }
                }
                console.log('[updateCustomerStatus] No new event; incremented duration');
            }
        } catch (err) {
            console.error('[updateCustomerStatus] error:', err);
            customer.update('Error', 0);
        }
    }

    getCurrentMonthStart() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }   

}
