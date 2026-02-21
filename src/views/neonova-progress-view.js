class NeonovaProgressView extends BaseNeonovaView {
    constructor(username, friendlyName) {
        super(null);                              // container will be set later
        this.abortController = null;
        this.username = username;
        this.friendlyName = friendlyName;
        this._close = null;
    }

    get signal() {
        return this.abortController?.signal ?? null;
    }

    showModal() {
        const overlay = document.createElement('div');

        this.abortController = new AbortController();
        
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
            z-index: 10001; display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 400ms ease;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #18181b; border: 1px solid #27272a; border-radius: 24px;
            width: 460px; padding: 32px; box-shadow: 0 25px 70px rgba(0,0,0,0.95);
            text-align: center;
            transform: translateX(-60px); opacity: 0; transition: all 500ms cubic-bezier(0.32, 0.72, 0, 1);
        `;

        document.body.appendChild(overlay);
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

        // Trigger entrance
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'translateX(0)';
            modal.style.opacity = '1';
        });

        this._close = () => {
            overlay.style.opacity = '0';
            modal.style.transform = 'translateX(-60px)';
            modal.style.opacity = '0';
            setTimeout(() => overlay.remove(), 500);
        };

        const cancelBtn = modal.querySelector('#cancel-btn');
        cancelBtn.addEventListener('click', () => {
            if (this.abortController) {
                this.abortController.abort();
            }
            this._close();
        });
    }

    /**
     * New signature matches the updated callback from paginateReportLogs:
     * onProgress(totalRows, currentEntries, currentPage)
     */
    updateProgress(fetchedCount, page, total = null) {
        const bar = this.container.querySelector('#progress-bar');
        const status = this.container.querySelector('#status');
    
        let percent = 0;
        let statusText = 'Starting fetch...';
    
        if (total !== null && total > 0) {
            // Main case: we have total from first page
            percent = Math.min(99, Math.round((fetchedCount / total) * 100));
            const totalPages = Math.ceil(total / 100);  // assuming 100 hits/page
    
            statusText = `Page ${page} of ${totalPages} — ` +
                         `${fetchedCount.toLocaleString()} of ${total.toLocaleString()} entries ` +
                         `(${percent}%)`;
        } else {
            // Fallback: before total known — show page and entries only
            percent = Math.min(99, page * 3);  // rough ramp-up
            statusText = `Fetching page ${page}... (${fetchedCount.toLocaleString()} entries so far)`;
        }
    
        if (bar) bar.style.width = `${percent}%`;
        if (status) status.textContent = statusText;
    }

    finish(data) {
        const bar = this.container.querySelector('#progress-bar');
        if (bar) bar.style.width = '100%';
        
        const status = this.container.querySelector('#status');
        if (status) status.textContent = 'Report complete — opening...';
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
