class NeonovaDashboardController {
    constructor() {
        try {
            console.log('Constructor body start');
            this.customers = this.load();
            this.panelVisible = false;
            this.minimized = false;
            this.pollInterval = null;
            this.pollIntervalMs = 10000;
    
            console.log('Before creating view - NeonovaDashboardView exists?', typeof NeonovaDashboardView !== 'undefined');
    
            this.view = new NeonovaDashboardView(this);
    
            console.log('After view creation - this.view:', !!this.view);
        } catch (err) {
            console.error('Entire constructor failed:', err);
        }
    }

    togglePanel() {
        console.log('togglePanel started - panelVisible before:', this.panelVisible);
        this.panelVisible = !this.panelVisible;
        console.log('panelVisible after flip:', this.panelVisible);
    
        if (this.panelVisible) {
            console.log('Showing - checking view');
            if (!this.view) {
                console.log('View missing - attempting creation');
                try {
                    this.view = new NeonovaDashboardView(this);
                    console.log('View created OK');
                } catch (err) {
                    console.error('View creation error:', err);
                    return;
                }
            }
            console.log('Calling view.show()');
            this.view.show();
            this.startPolling();
            console.log('Show complete');
        } else {
            console.log('Hiding - calling view.hide()');
            this.view?.hide();
            this.stopPolling();
            console.log('Hide complete');
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
        if (this.view) this.view.updateMinimize();
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
        const url = `https://admin.neonova.netrat/index.php?acctsearch=1&userid=${encodeURIComponent(username)}`;
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

    // Add these methods

    getCurrentMonthStart() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    async fetchFullAccountHistory(username) {
        console.log(`Fetching full history for ${username}`);
        const entries = [];
        let url = `https://admin.neonova.netrat/index.php?acctsearch=1&userid=${encodeURIComponent(username)}`;
    
        // Add date range param if needed (site may support &fromdate=YYYY-MM-DD)
        // For now, assume it returns all; if not, we'll need to append date filters
    
        while (true) {
            const res = await fetch(url, { credentials: 'include', cache: 'no-cache' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
            const html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
    
            const table = doc.querySelector('table[cellspacing="2"][cellpadding="2"]');
            if (!table || table.rows.length < 2) break; // no more data
    
            // Parse rows (skip header)
            for (let i = 1; i < table.rows.length; i++) {
                const cells = table.rows[i].cells;
                if (cells.length < 5) continue;
    
                const timestamp = cells[0].textContent.trim();
                const status = cells[4].textContent.trim().toLowerCase();
    
                let dateObj;
                try {
                    // Assume format like "2026-01-15 14:30:00"
                    dateObj = new Date(timestamp.replace(' ', 'T'));
                    if (isNaN(dateObj.getTime())) continue;
                } catch {
                    continue;
                }
    
                entries.push({
                    date: timestamp,
                    status: status.includes('start') || status.includes('connect') ? 'Start' : 'Stop',
                    dateObj
                });
            }
    
            // Find next page link
            const nextLink = doc.querySelector('a[href*="acctsearch=1&userid="][href*="page="]'); // adjust selector if needed
            if (!nextLink) break;
    
            url = nextLink.href;
            if (!url.startsWith('http')) url = 'https://admin.neonova.netrat/' + url;
        }
    
        // Sort by date descending (newest first)
        entries.sort((a, b) => b.dateObj - a.dateObj);
    
        return entries;
    }
    
    async updateCustomerStatus(customer) {
        try {
            const history = await this.fetchFullAccountHistory(customer.radiusUsername);
            if (history.length === 0) {
                customer.update('Unknown', 0);
                return;
            }
    
            const latest = history[0];
            let status = latest.status === 'Start' ? 'Connected' : 'Not Connected';
            const durationSec = Math.round((Date.now() - latest.dateObj.getTime()) / 1000);
    
            customer.update(status, durationSec);
        } catch (err) {
            console.error(`Status update failed for ${customer.friendlyName}:`, err);
            customer.update('Error', 0);
        }
    }
    
    // Update poll to use the new method
    async poll() {
        for (const customer of this.customers) {
            await this.updateCustomerStatus(customer);
        }
        this.save();
        this.view.render();
    }
    
}
