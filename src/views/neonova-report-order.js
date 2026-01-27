class NeonovaReportOrderView {
    constructor(username, friendlyName) {
        this.username = username;
        this.friendlyName = friendlyName || username;
        this.tab = null;
        this.onGenerate = null;  // callback to start real generation (passed from controller)
    }

    open() {
        this.tab = window.open('', '_blank');
        if (!this.tab) {
            alert('Popup blocked. Please allow popups for this site.');
            return;
        }

        this.tab.document.write(this.generateOrderHTML());
        this.tab.document.close();

        // Wire up buttons in the new tab
        this.tab.addEventListener('load', () => this.wireEvents());
    }

    generateOrderHTML() {
        return `
            <html>
            <head>
                <title>Report Request - ${this.friendlyName} (${this.username})</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 30px; max-width: 900px; margin: auto; background: #f9f9f9; }
                    h1 { margin-bottom: 20px; }
                    .quick-buttons { margin: 20px 0; text-align: center; }
                    .quick-btn { padding: 12px 24px; margin: 8px; font-size: 16px; cursor: pointer; border: none; border-radius: 6px; background: #1e40af; color: white; }
                    .quick-btn:hover { background: #1e3a8a; }
                    .custom-range { margin: 30px 0; display: flex; align-items: center; gap: 12px; justify-content: center; }
                    select, button { padding: 10px 16px; font-size: 16px; border-radius: 6px; border: 1px solid #ccc; }
                    #generate-custom { background: #059669; color: white; cursor: pointer; }
                    #generate-custom:hover { background: #047857; }
                    #progress { margin: 40px auto; width: 80%; height: 30px; background: #e5e7eb; border-radius: 15px; overflow: hidden; display: none; }
                    #progress-bar { height: 100%; width: 0%; background: linear-gradient(to right, #10b981, #34d399); transition: width 0.4s ease; }
                    #status { margin-top: 12px; font-weight: bold; text-align: center; color: #374151; }
                    #report-content { margin-top: 40px; }
                </style>
            </head>
            <body>
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

                <div id="progress"><div id="progress-bar"></div></div>
                <div id="status"></div>
                <div id="report-content"></div>

                <script>
                    // Populate dropdowns
                    const today = new Date();
                    const yearSelect = document.getElementById('year');
                    for (let y = today.getFullYear() - 2; y <= today.getFullYear(); y++) {
                        yearSelect.add(new Option(y, y, y === today.getFullYear()));
                    }

                    const monthSelect = document.getElementById('month');
                    for (let m = 1; m <= 12; m++) {
                        monthSelect.add(new Option(new Date(2000, m-1, 1).toLocaleString('default', { month: 'long' }), m.toString().padStart(2, '0'), m === today.getMonth() + 1));
                    }

                    const daySelect = document.getElementById('day');
                    for (let d = 1; d <= 31; d++) {
                        daySelect.add(new Option(d, d.toString().padStart(2, '0'), d === 1));
                    }

                    // Quick buttons
                    document.querySelectorAll('.quick-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const hours = parseInt(btn.dataset.hours);
                            const days = parseInt(btn.dataset.days);
                            let start = new Date();
                            if (hours) start.setHours(start.getHours() - hours);
                            if (days) start.setDate(start.getDate() - days);
                            window.generateReport(start);
                        });
                    });

                    // Custom button
                    document.getElementById('generate-custom').addEventListener('click', () => {
                        const y = document.getElementById('year').value;
                        const m = document.getElementById('month').value - 1;
                        const d = document.getElementById('day').value;
                        const start = new Date(y, m, d);
                        window.generateReport(start);
                    });

                    // Global generate function (called from buttons)
                    window.generateReport = function(startDate) {
                        const status = document.getElementById('status');
                        const progress = document.getElementById('progress');
                        const bar = document.getElementById('progress-bar');
                        const content = document.getElementById('report-content');

                        status.textContent = 'Starting...';
                        progress.style.display = 'block';
                        bar.style.width = '0%';

                        // Simulate progress (replace with real callback later)
                        let pct = 0;
                        const interval = setInterval(() => {
                            pct += Math.random() * 20;
                            if (pct > 100) pct = 100;
                            bar.style.width = pct + '%';
                            status.textContent = pct < 100 ? 'Generating...' : 'Complete!';
                            if (pct === 100) {
                                clearInterval(interval);
                                content.innerHTML = '<h2>Report Ready</h2><p>Full report will appear here.</p>';
                            }
                        }, 400);
                    };
                </script>
            </body>
            </html>
        `;
    }

    // Called from controller when report is ready
    showReport(htmlContent) {
        if (this.tab && !this.tab.closed) {
            const content = this.tab.document.getElementById('report-content');
            if (content) content.innerHTML = htmlContent;
        }
    }

    updateProgress(percent, statusText) {
        if (this.tab && !this.tab.closed) {
            const bar = this.tab.document.getElementById('progress-bar');
            const status = this.tab.document.getElementById('status');
            if (bar) bar.style.width = percent + '%';
            if (status) status.textContent = statusText || 'Processing...';
        }
    }
}
