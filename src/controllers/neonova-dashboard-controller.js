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
async updateCustomerStatus(customer) {
    try {
        const latest = await this.getLatestEntry(customer.radiusUsername);
        if (!latest) {
            console.log(`No latest entry for ${customer.radiusUsername}`);
            console.log('Passing to update - status:', status, 'duration (string):', formattedDuration, 'type:', typeof formattedDuration);
            customer.update(status, formattedDuration);
            customer.update('Unknown', '00:00:00:00');
            return;
        }

        console.log(`Latest entry raw for ${customer.radiusUsername}:`, latest);

        let durationSeconds = 0;

        // 1. Try to parse sessionTime if present
        if (latest.sessionTime && latest.sessionTime.trim() !== '') {
            console.log('Attempting to parse sessionTime:', latest.sessionTime);
            const match = latest.sessionTime.match(/(\d+)h?\s*(\d+)m?\s*(\d*)s?/i);
            if (match) {
                const hours = parseInt(match[1] || '0', 10);
                const minutes = parseInt(match[2] || '0', 10);
                const seconds = parseInt(match[3] || '0', 10);
                durationSeconds = (hours * 3600) + (minutes * 60) + seconds;
                console.log('Parsed sessionTime →', durationSeconds, 'seconds');
            } else {
                console.log('sessionTime format not recognized:', latest.sessionTime);
            }
        }

        // 2. Fallback: time elapsed since the timestamp (if no sessionTime or parsing failed)
        if (durationSeconds === 0 && latest.dateObj && latest.dateObj.getTime) {
            const now = Date.now();
            const timeSinceMs = now - latest.dateObj.getTime();
            console.log('Raw time since timestamp (ms):', timeSinceMs);

            if (Number.isFinite(timeSinceMs) && timeSinceMs >= 0) {
                durationSeconds = Math.floor(timeSinceMs / 1000);
                console.log('Fallback duration (seconds):', durationSeconds);
            } else {
                console.warn('Invalid or negative timeSinceMs:', timeSinceMs);
            }
        }

        // 3. If last event was a Stop, no active session → force duration to 0
        if (latest.status === 'Stop') {
            console.log('Last event was Stop → resetting duration to 0');
            durationSeconds = 0;
        }

        // 4. Final safety guard: ensure durationSeconds is a valid non-negative number
        if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
            console.warn(`Invalid durationSeconds detected: ${durationSeconds} — forcing to 0`);
            durationSeconds = 0;
        }

        console.log('Final durationSeconds before formatting:', durationSeconds);

        // 5. Format as DD:HH:MM:SS with guards against NaN
        const days    = Math.floor(durationSeconds / 86400) || 0;
        const hours   = Math.floor((durationSeconds % 86400) / 3600) || 0;
        const minutes = Math.floor((durationSeconds % 3600) / 60) || 0;
        const seconds = (durationSeconds % 60) || 0;

        const formattedDuration = `${days.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        console.log('Formatted duration:', formattedDuration);

        const status = latest.status === 'Start' ? 'Connected' : 'Not Connected';

        customer.update(status, formattedDuration);
        console.log(`Dashboard updated: ${customer.radiusUsername} → ${status}, ${formattedDuration}`);
    } catch (err) {
        console.error('updateCustomerStatus failed:', err);
        customer.update('Error', '00:00:00:00');
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
