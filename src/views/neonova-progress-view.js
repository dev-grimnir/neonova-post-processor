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
                opacity: 0; transition: opacity 0.3s ease;
            `;
    
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: #18181b; border: 1px solid #27272a; border-radius: 24px;
                width: 460px; padding: 32px; box-shadow: 0 25px 70px rgba(0,0,0,0.95);
                text-align: center;
                transform: translateX(-40px); opacity: 0; transition: all 0.4s cubic-bezier(0.32, 0.72, 0, 1);
            `;
    
            document.body.appendChild(overlay);
            overlay.appendChild(modal);
    
            // Trigger animations
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                modal.style.transform = 'translateX(0)';
                modal.style.opacity = '1';
            });
    
            this.container = modal;
            this._close = () => {
                overlay.style.opacity = '0';
                modal.style.transform = 'translateX(-40px)';
                modal.style.opacity = '0';
                setTimeout(() => overlay.remove(), 400);
            };
    
            // ... rest of your modal.innerHTML and listeners ...
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
