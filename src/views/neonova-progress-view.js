/**
 * Progress modal shown during report generation.
 * Displays progress bar, status text, and cancel button.
 * 
 * Pure UI class — no business logic, no direct knowledge of pagination or controllers.
 * All interactions (progress updates, status, cancel, close) are driven by callbacks
 * provided by the owning controller.
 */
class NeonovaProgressView extends BaseNeonovaView {
    /**
     * @param {string} friendlyName - Display name for the modal title
     */
    constructor(friendlyName) {
        super(null);  // Container set in showModal()

        this.friendlyName = friendlyName;
        this._close = null;
    }

    /**
     * Shows the progress modal with smooth entrance animation.
     * 
     * Creates the overlay and modal elements dynamically, injects the progress UI
     * (title, bar, status text, cancel button), applies entrance animation,
     * and sets up close handlers.
     * 
     * Cancel button triggers the onCancel callback (provided by controller).
     * 
     * @param {Function} onCancelCallback - Called when user clicks cancel or overlay
     */
    showModal(onCancelCallback) {
        // ────────────────────────────────────────────────
        // Create overlay (dark blurred backdrop)
        // ────────────────────────────────────────────────
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
            z-index: 10001; display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 400ms ease;
        `;

        // ────────────────────────────────────────────────
        // Create modal card
        // ────────────────────────────────────────────────
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #18181b; border: 1px solid #27272a; border-radius: 24px;
            width: 460px; padding: 32px; box-shadow: 0 25px 70px rgba(0,0,0,0.95);
            text-align: center;
            transform: translateX(-60px); opacity: 0; transition: all 500ms cubic-bezier(0.32, 0.72, 0, 1);
        `;

        // Append to DOM
        document.body.appendChild(overlay);
        overlay.appendChild(modal);

        // ────────────────────────────────────────────────
        // Inject modal content
        // ────────────────────────────────────────────────
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

        // Store reference for later updates
        this.container = modal;

        // ────────────────────────────────────────────────
        // Entrance animation
        // ────────────────────────────────────────────────
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'translateX(0)';
            modal.style.opacity = '1';
        });

        // ────────────────────────────────────────────────
        // Close handler (animation only)
        // ────────────────────────────────────────────────
        this._close = () => {
            overlay.style.opacity = '0';
            modal.style.transform = 'translateX(-60px)';
            modal.style.opacity = '0';
            setTimeout(() => overlay.remove(), 500);
        };

        // ────────────────────────────────────────────────
        // Cancel/close listeners (trigger controller callback + animation)
        // ────────────────────────────────────────────────
        modal.querySelector('#cancel-btn').addEventListener('click', () => {
            if (typeof onCancelCallback === 'function') onCancelCallback();
            this._close();
        });

        overlay.addEventListener('click', e => {
            if (e.target === overlay) {
                if (typeof onCancelCallback === 'function') onCancelCallback();
                this._close();
            }
        });
    }

    /**
     * Updates the progress bar and status text.
     */
    updateProgress(collected, total, currentPage) {
        const bar = this.container.querySelector('#progress-bar');
        const status = this.container.querySelector('#status');

        let percent = 0;
        let statusText = 'Starting fetch...';

        if (total && total > 0) {
            percent = Math.min(99, Math.round((collected / total) * 100));
            const totalPages = Math.ceil(total / 100);

            statusText = `Page ${currentPage} of ${totalPages} — ` +
                         `${collected.toLocaleString()} / ${total.toLocaleString()} entries ` +
                         `(${percent}%)`;
        } else {
            percent = Math.min(99, currentPage * 5);
            statusText = `Fetching page ${currentPage}...`;
        }

        if (bar) bar.style.width = percent + '%';
        if (status) status.textContent = statusText;
    }

    /**
     * Shows a status/error message in the modal (e.g., "Cancelled", "Generation failed").
     * @param {string} message
     */
    showStatus(message) {
        const status = this.container.querySelector('#status');
        if (status) status.textContent = message;
    }

    /**
     * Closes the modal with exit animation.
     */
    close() {
        this._close?.();
    }
}

