/**
 * Modal view for ordering a custom RADIUS report.
 * 
 * Collects date range input from the user (quick presets or custom selectors),
 * validates, and fires a callback with the selected start/end dates.
 * 
 * Pure UI class — no knowledge of pagination, progress views, or report generation.
 * All business logic (starting progress, running pagination) is handled by the
 * owning controller via the onGenerateRequested callback.
 */
class NeonovaReportOrderView extends BaseNeonovaView {
    /**
     * @param {Element} container - Parent container (passed to super)
     * @param {string} username - RADIUS username
     * @param {string} friendlyName - Display name for title
     * @param {Function} onGenerateRequested - Callback(startDateIso, endDateIso) when generate clicked
     */
    constructor(container, username, friendlyName, onGenerateRequested) {
        super(container);
        this.username = username;
        this.friendlyName = friendlyName || username;
        this.onGenerateRequested = onGenerateRequested;  // Provided by controller
        this._close = null;
    }

    /**
     * Shows the modal with entrance animation and sets up input handlers.
     */
    showModal() {
        // ────────────────────────────────────────────────
        // Create overlay (dark blurred backdrop)
        // ────────────────────────────────────────────────
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
            z-index: 10000; display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 400ms ease;
        `;

        // ────────────────────────────────────────────────
        // Create modal card
        // ────────────────────────────────────────────────
        const modal = document.createElement('div');
        modal.classList.add('neonova-modal');
        modal.style.cssText = `
            background: #18181b; border: 1px solid #27272a; border-radius: 24px;
            width: 820px; max-width: 92vw; max-height: 92vh;
            overflow: hidden; box-shadow: 0 25px 70px rgba(0,0,0,0.95);
            display: flex; flex-direction: column;
            transform: translateX(60px); opacity: 0; transition: all 500ms cubic-bezier(0.32, 0.72, 0, 1);
        `;

        // Append to DOM
        document.body.appendChild(overlay);
        overlay.appendChild(modal);

        // ────────────────────────────────────────────────
        // Header
        // ────────────────────────────────────────────────
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 24px 32px; border-bottom: 1px solid #27272a;
            background: #09090b; flex-shrink: 0;
            display: flex; align-items: center; justify-content: space-between;
        `;
        header.innerHTML = `
            <div>
                <div class="text-emerald-400 text-xs font-mono tracking-widest">GENERATE REPORT</div>
                <div class="text-2xl font-semibold text-white mt-1">${this.friendlyName}</div>
            </div>
            <button class="close-btn px-6 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl flex items-center gap-2 transition">
                <i class="fas fa-times"></i> Close
            </button>
        `;
        modal.appendChild(header);

        // ────────────────────────────────────────────────
        // Content area
        // ────────────────────────────────────────────────
        const content = document.createElement('div');
        content.style.cssText = `flex: 1; overflow-y: auto; padding: 32px 40px; background: #18181b;`;
        modal.appendChild(content);

        this.container = content;
        this.render();
        this.attachListeners();

        // ────────────────────────────────────────────────
        // Close handler (animation + DOM removal)
        // ────────────────────────────────────────────────
        const close = () => {
            overlay.style.opacity = '0';
            modal.style.transform = 'translateX(60px)';
            modal.style.opacity = '0';
            setTimeout(() => overlay.remove(), 500);
        };
        this._close = close;

        header.querySelector('.close-btn').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

        // ────────────────────────────────────────────────
        // Entrance animation
        // ────────────────────────────────────────────────
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'translateX(0)';
            modal.style.opacity = '1';
        });
    }

    // render() and attachListeners() unchanged — they only populate UI and fire this.onGenerateRequested
    // (your existing implementations are fine — they already call this.onGenerateRequested with ISO strings)

    render() {
        // ... your existing render code (unchanged) ...
    }

    attachListeners() {
        // ... your existing listeners (quick buttons, generate custom) ...
        // They call this.onGenerateRequested(startIso, endIso) — perfect
    }
}
