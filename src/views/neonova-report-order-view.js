class NeonovaReportOrderView {
    constructor(container, username, friendlyName) {
        this.container = container;  // tab's document.body or div
        this.username = username;
        this.friendlyName = friendlyName || username;
        this.onGenerateRequested = null;  // callback: (startDate) => {}
    }

    renderOrderForm() {
        console.log('renderOrderForm called - container type:', typeof this.container, this.container?.nodeName || 'no node');
        if (!this.container || typeof this.container !== 'object') {
            console.error('Invalid container in renderOrderForm');
            return;
        }
    
        // Clear any loading message
        this.container.innerHTML = '';
    
        // Create a full document structure
        const fullHTML = `
            <!DOCTYPE html>
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
    
                <div id="progress" style="display:none;">
                    <div id="progress-bar" style="width:0%; height:30px; background:#4CAF50; transition:width 0.4s;"></div>
                </div>
                <div id="status" style="margin-top:10px; font-weight:bold; text-align:center;"></div>
                <div id="report-content" style="margin-top:30px;"></div>
    
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
                            window.parent.postMessage({ type: 'generateRequested', startDate: start.toISOString() }, '*');
                        });
                    });
    
                    // Custom button
                    document.getElementById('generate-custom').addEventListener('click', () => {
                        const y = document.getElementById('year').value;
                        const m = document.getElementById('month').value - 1;
                        const d = document.getElementById('day').value;
                        const start = new Date(y, m, d);
                        window.parent.postMessage({ type: 'generateRequested', startDate: start.toISOString() }, '*');
                    });
    
                    // Listen for messages from opener (progress, report, error)
                    window.addEventListener('message', (event) => {
                        if (event.source !== window.opener) return;
                        const data = event.data;
                        if (data.type === 'progress') {
                            document.getElementById('progress').style.display = 'block';
                            document.getElementById('progress-bar').style.width = data.percent + '%';
                            document.getElementById('status').textContent = data.text;
                        } else if (data.type === 'report') {
                            document.getElementById('progress').style.display = 'none';
                            document.getElementById('status').style.display = 'none';
                            document.getElementById('report-content').innerHTML = data.html;
                        } else if (data.type === 'error') {
                            document.getElementById('status').textContent = 'Error: ' + data.message;
                        }
                    });
                </script>
            </body>
            </html>
        `;
    
        // Write full document
        this.container.ownerDocument.open();
        this.container.ownerDocument.write(fullHTML);
        this.container.ownerDocument.close();
    
        console.log('Form HTML written - document readyState:', this.container.ownerDocument.readyState);
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
