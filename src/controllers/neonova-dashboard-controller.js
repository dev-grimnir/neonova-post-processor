class NeonovaDashboardController {
    constructor() {
        this.customers = this.load();
        this.panelVisible = false;
        this.minimized = false;
        this.pollInterval = null;
        this.pollIntervalMs = 60000;
        console.log('Controller constructor started - view class exists?', typeof NeonovaDashboardView !== 'undefined');
        try {
            this.view = new NeonovaDashboardView(this);
            console.log('View instantiated successfully:', !!this.view);
        } catch (err) {
            console.error('View instantiation failed:', err);
            this.view = null; // explicit null to avoid undefined confusion
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

    togglePanel() {
        console.log('togglePanel called - before:', this.panelVisible);
        this.panelVisible = !this.panelVisible;
        console.log('togglePanel called - after:', this.panelVisible);
    
        this.view.toggle();  // <-- Call the existing toggle() in view
    
        if (this.panelVisible) {
            this.startPolling();
        } else {
            this.stopPolling();
        }
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
        for (const c of this.customers) {
            try {
                const { status, durationSec } = await this.getStatus(c.radiusUsername);
                c.update(status, durationSec);
            } catch {
                c.update('Error', 0);
            }
        }
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
}
