class NeonovaProgressView extends BaseNeonovaView {
    constructor(username, friendlyName) {
        super(null);                              // container will be set later

        this.username = username;
        this.friendlyName = friendlyName;
        this._close = null;
    }

    showModal() {
        // Overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
            z-index: 10001; display: flex; align-items: center; justify-content: center;
        `;
        document.body.appendChild(overlay);

        // Modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #18181b; border: 1px solid #27272a; border-radius: 24px;
            width: 460px; padding: 32px; box-shadow: 0 25px 70px rgba(0,0,0,0.95);
            text-align: center;
        `;
        overlay.appendChild(modal);

        // Header
        modal.innerHTML = `
            <div class="text-emerald-400 text-xs font-mono tracking-widest mb-2">GENERATING REPORT</div>
            <div class="text-2xl font-semibold text-white mb-8">${this.friendlyName}</div>
            
            <div id="progress-container" class="mb-6">
                <div class="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div id="progress-bar" class="h-full bg-emerald-500 transition-all duration-300" style="width: 0%"></div>
                </div>
            </div>
            
            <div id="status" class="font-mono text-emerald-400 text-sm mb-8">Starting fetch...</div>
            
            <button id="cancel-btn" class="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl text-sm font-medium transition">
                Cancel
            </button>
        `;

        // Give the progress view a container so updateProgress etc. still work
        this.container = modal;

        // Render the inner content (in case you ever override render())
        this.render();

        // Close handlers
        const close = () => overlay.remove();
        this._close = close;

        modal.querySelector('#cancel-btn').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    }

    render() {
        // Optional – you can put anything here if you ever want to re-render the whole thing
        // For now we leave it empty because we already built the HTML in showModal()
    }

    updateProgress(percent, text) {
        const bar = this.container.querySelector('#progress-bar');
        const status = this.container.querySelector('#status');
        if (bar) bar.style.width = percent + '%';
        if (status) status.textContent = text || 'Processing...';
    }

    finish(data) {
        this._close && this._close();

        const reportView = new NeonovaReportView(
            data.username,
            data.friendlyName,
            data.metrics,
            data.entries.length,
            data.metrics.longDisconnects
        );

        const reportHTML = reportView.generateReportHTML('');
        const newTab = window.open('', '_blank');
        newTab.document.write(reportHTML);
        newTab.document.close();
    }

    showError(message) {
        const status = this.container.querySelector('#status');
        if (status) status.textContent = 'Error: ' + message;
    }
}
