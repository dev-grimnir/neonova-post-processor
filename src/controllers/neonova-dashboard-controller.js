class NeonovaDashboardController {
    constructor() {
        try {
            this.customers = this.load();
            this.panelVisible = false;
            this.minimized = false;
            this.pollInterval = null;
            this.pollIntervalMs = 10000;
            this.view = new NeonovaDashboardView(this);
        } catch (err) {
            console.error('Entire constructor failed:', err);
        }
    }

    async getLatestEntry(username) {
        const baseUrl = `https://admin.neonova.net/rat/index.php?acctsearch=&userid=${encodeURIComponent(username)}`;
    
        const allEntries = await paginateAndParseLogs(baseUrl);
    
        if (allEntries.length === 0) {
            console.log(`No entries found for ${username}`);
            return null;
        }

        return allEntries[0];  // newest entry (helper sorts newest first)
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

    async updateCustomerStatus(customer) {
    try {
        const latest = await this.getLatestEntry(customer.radiusUsername);
        if (!latest) {
            customer.update('Unknown', 0);
            return;
        }

        let status = latest.status === 'Start' ? 'Connected' : 'Not Connected';
        let durationSec = 0;

        const now = Date.now();

        if (latest.status === 'Start') {
            const startTime = latest.dateObj.getTime();
            durationSec = Math.round((now - startTime) / 1000);
        } else if (latest.sessionTime) {
            const match = latest.sessionTime.match(/(\d+)h\s*(\d+)m\s*(\d+)s|(\d+)m\s*(\d+)s|(\d+)s/);
            if (match) {
                const h = parseInt(match[1] || 0);
                const m = parseInt(match[2] || match[4] || 0);
                const s = parseInt(match[3] || match[5] || match[6] || 0);
                durationSec = h * 3600 + m * 60 + s;
            }
        } else {
            const stopTime = latest.dateObj.getTime();
            durationSec = Math.round((now - stopTime) / 1000);
        }

        customer.update(status, durationSec);
        console.log(`Updated ${customer.friendlyName}: ${status}, duration ${durationSec}s`);
    } catch (err) {
        console.error('Status update failed:', err);
        customer.update('Error', 0);
    }
}

    getCurrentMonthStart() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
        async fetchFullAccountHistory(username) {
            console.log(`Fetching full history for ${username}`);
    
            const now = new Date();
            const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; // YYYY-MM-DD
            const endDate = now.toISOString().split('T')[0];
    
            let url = `https://admin.neonova.net/rat/index.php?acctsearch=&userid=${encodeURIComponent(username)}&fromdate=${startDate}&todate=${endDate}`;
    
            const entries = [];
    
        while (url) {
            const res = await fetch(url, {
                credentials: 'include',
                cache: 'no-cache'
            });
    
            if (!res.ok) {
                console.error(`Fetch failed for ${url}: HTTP ${res.status}`);
                throw new Error(`HTTP ${res.status}`);
            }
    
            const html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
    
            const table = doc.querySelector('table[cellspacing="2"][cellpadding="2"]');
            if (!table || table.rows.length <= 1) {
                console.log('No more data or no table found');
                break;
            }
    
            // Parse data rows (skip header row 0)
            for (let i = 1; i < table.rows.length; i++) {
                const cells = table.rows[i].cells;
                if (cells.length < 5) continue;
    
                const timestamp = cells[0].textContent.trim();
                const statusText = cells[4].textContent.trim().toLowerCase();
    
                let dateObj;
                try {
                    // Convert "YYYY-MM-DD HH:MM:SS" to Date (replace space with T for ISO)
                    dateObj = new Date(timestamp.replace(' ', 'T'));
                    if (isNaN(dateObj.getTime())) continue;
                } catch (e) {
                    console.warn('Invalid date:', timestamp);
                    continue;
                }
    
                const status = statusText.includes('start') || statusText.includes('connect') ? 'Start' : 'Stop';
    
                entries.push({
                    date: timestamp,
                    status,
                    dateObj
                });
            }
    
            // Find "NEXT @" link for pagination (adjust selector if needed)
            const nextLink = Array.from(doc.querySelectorAll('a'))
                .find(a => a.textContent.includes('NEXT') || a.textContent.includes('@'));
            if (!nextLink || !nextLink.href) {
                console.log('No next page link found');
                break;
            }
    
            url = nextLink.href;
            if (!url.startsWith('http')) {
                url = 'https://admin.neonova.net' + url;  // make absolute
            }
        }
    
        // Sort newest first
        entries.sort((a, b) => b.dateObj - a.dateObj);
    
        console.log(`Fetched ${entries.length} entries for ${username}`);
        return entries;
    }
    

    
    // Update poll to use the new method
    async poll() {
        for (const customer of this.customers) {
            await this.updateCustomerStatus(customer);
        }
        this.save();
        this.view.render();
    }

    async fetchLatestEntry(username) {
        //const baseUrl = `https://admin.neonova.net/rat/index.php?acctsearch=&userid=${encodeURIComponent(username)}`;
        const BASE_SEARCH_URL = 'https://admin.neonova.net/rat/index.php?acctsearch=&userid=';
        url = BASE_SEARCH_URL + username
        const allEntries = await paginateAndParseLogs(url);

        if (allEntries.length === 0) {
            console.log(`No entries found for ${username}`);
            return null;
        }

        return allEntries[0];  // newest entry (helper sorts newest first)
    }
    
}
