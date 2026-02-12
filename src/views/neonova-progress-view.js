class NeonovaProgressView extends BaseNeonovaView {
    constructor(username, friendlyName) {
        super(null);                              // container will be set later

        this.username = username;
        this.friendlyName = friendlyName;
        this._close = null;
    }

    showModal() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
            z-index: 10001; display: flex; align-items: center; justify-content: center;
        `;
        document.body.appendChild(overlay);

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #18181b; border: 1px solid #27272a; border-radius: 24px;
            width: 460px; padding: 32px; box-shadow: 0 25px 70px rgba(0,0,0,0.95);
            text-align: center;
        `;
        overlay.appendChild(modal);

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

        this.container = modal;
        this._close = () => overlay.remove();

        modal.querySelector('#cancel-btn').addEventListener('click', this._close);
        overlay.addEventListener('click', e => { if (e.target === overlay) this._close(); });
    }

    /**
     * New signature matches the updated callback from paginateReportLogs:
     * onProgress(totalRows, currentEntries, currentPage)
     */
    updateProgress(totalRows, currentEntries, currentPage) {
        const bar = this.container.querySelector('#progress-bar');
        const status = this.container.querySelector('#status');

        let percent = 0;
        let statusText = 'Starting fetch...';

        if (totalRows && totalRows > 0) {
            percent = Math.min(99, Math.round((currentEntries / totalRows) * 100));
            const totalPages = Math.ceil(totalRows / 100);

            statusText = `Page ${currentPage} of ${totalPages} — ` +
                        `${currentEntries.toLocaleString()} / ${totalRows.toLocaleString()} entries ` +
                        `(${percent}%)`;
        } else {
            // fallback (should never happen now)
            percent = Math.min(99, currentPage * 2);
            statusText = `Fetching page ${currentPage}...`;
        }

        if (bar) bar.style.width = percent + '%';
        if (status) status.textContent = statusText;
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
