class NeonovaReportOrderView {
    constructor(container, username, friendlyName) {
        this.container = container;  // tab's document.body or div
        this.username = username;
        this.friendlyName = friendlyName || username;
        this.onGenerateRequested = null;  // callback: (startDate) => {}
    }

    renderOrderForm() {
        console.log('renderOrderForm called - this.container:', this.container?.nodeName || typeof this.container);
        if (!this.container || typeof this.container !== 'object') {
            console.error('Invalid container in renderOrderForm');
            return;
        }
        this.container.innerHTML = `... your form HTML ...`;
        console.log('Form HTML set - container now has children?', this.container.children.length > 0);
        
        this.container.innerHTML = `
            <h1>Report Request - ${this.friendlyName} (${this.username})</h1>

            <div class="quick-buttons">
                <button class="quick-btn" data-hours="24">Last 24 hours</button>
                <button class="quick-btn" data-hours="48">Last 48 hours</button>
                <button class="quick-btn" data-hours="72">Last 72 hours</button>
                <button class="quick-btn" data-days="30">Last 30 days</button>
                <button class="quick-btn" data-days="60">Last 60 days</button>
                <button class="quick-btn" data-days="90">Last 90 days</button>
            </div>

            <div class="custom-range">
                <label>Custom Start Date:</label>
                <select id="month"></select>
                <select id="day"></select>
                <select id="year"></select>
                <button id="generate-custom">Generate Custom Report</button>
            </div>

            <div id="progress" style="display:none;">
                <div id="progress-bar" style="width:0%; height:30px; background:#4CAF50; transition:width 0.4s;"></div>
            </div>
            <div id="status" style="margin-top:10px; font-weight:bold; text-align:center;"></div>
            <div id="report-content" style="margin-top:30px;"></div>
        `;

        // Populate dropdowns (pure UI)
        const today = new Date();
        const yearSelect = this.container.querySelector('#year');
        for (let y = today.getFullYear() - 2; y <= today.getFullYear(); y++) {
            yearSelect.add(new Option(y, y, y === today.getFullYear()));
        }

        const monthSelect = this.container.querySelector('#month');
        for (let m = 1; m <= 12; m++) {
            monthSelect.add(new Option(new Date(2000, m-1, 1).toLocaleString('default', { month: 'long' }), m.toString().padStart(2, '0'), m === today.getMonth() + 1));
        }

        const daySelect = this.container.querySelector('#day');
        for (let d = 1; d <= 31; d++) {
            daySelect.add(new Option(d, d.toString().padStart(2, '0'), d === 1));
        }

        // Wire events — emit to controller
        this.container.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const hours = parseInt(btn.dataset.hours);
                const days = parseInt(btn.dataset.days);
                let start = new Date();
                if (hours) start.setHours(start.getHours() - hours);
                if (days) start.setDate(start.getDate() - days);
                this.onGenerateRequested?.(start);
            });
        });

        this.container.querySelector('#generate-custom').addEventListener('click', () => {
            const y = this.container.querySelector('#year').value;
            const m = this.container.querySelector('#month').value - 1;
            const d = this.container.querySelector('#day').value;
            const start = new Date(y, m, d);
            this.onGenerateRequested?.(start);
        });
    }

    showProgress() {
        this.container.querySelector('.quick-buttons').style.display = 'none';
        this.container.querySelector('.custom-range').style.display = 'none';
        this.container.querySelector('#progress').style.display = 'block';
        this.container.querySelector('#status').textContent = 'Starting...';
    }

    updateProgress(percent, text) {
        const bar = this.container.querySelector('#progress-bar');
        const status = this.container.querySelector('#status');
        if (bar) bar.style.width = percent + '%';
        if (status) status.textContent = text || 'Processing...';
    }

    showReport(reportHTML) {
        this.container.querySelector('#progress').style.display = 'none';
        this.container.querySelector('#status').style.display = 'none';
        const content = this.container.querySelector('#report-content');
        if (content) content.innerHTML = reportHTML;
    }
}
