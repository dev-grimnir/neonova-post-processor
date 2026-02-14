/**
 * Base class for all Neonova views.
 * Handles common functionality like Tailwind loading, panel creation, and basic rendering.
 * Subclasses override renderContent() for their specific UI.
 */
class BaseNeonovaView {
    /**
     * @param {HTMLElement|null} container - Optional existing container (used for modals); if null, creates a floating panel.
     */
    constructor(container = null) {
        // Theme configuration (consistent across all views)
        this.theme = {
            accent: 'emerald',
            accentColor: '#34d399',
            primary: 'emerald'
        };
        this.accent = 'emerald';
        this.accentColor = 'emerald-500';

        if (container) {
            this.container = container;        // For modal/content views that use an existing element
        } else {
            this.panel = this.createPanelContainer();  // Floating dashboard-style panel
        }

        this.ensureTailwind();
    }

    /**
     * Ensures Tailwind CSS is loaded (idempotent).
     * Calls onTailwindReady() once loaded.
     */
    ensureTailwind() {
        if (document.getElementById('tailwind-css')) {
            this.onTailwindReady();
            return;
        }
        const s = document.createElement('script');
        s.id = 'tailwind-css';
        s.src = 'https://cdn.tailwindcss.com';
        s.onload = () => this.onTailwindReady();
        document.head.appendChild(s);
    }

    /**
     * Creates the floating panel container used by dashboard/report views.
     * Applies consistent styling for the Neonova UI.
     */
    createPanelContainer() {
        const panel = document.createElement('div');
        panel.style.cssText = `
            position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
            width: 92%; max-width: 1100px; height: calc(100vh - 80px);
            background: #09090b; border: 1px solid #27272a; border-radius: 24px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.8); overflow: hidden;
            font-family: system-ui; z-index: 9999; display: none;
        `;
        document.body.appendChild(panel);
        return panel;
    }

    /**
     * Callback invoked when Tailwind is ready.
     * Subclasses typically override render() which calls renderContent().
     */
    onTailwindReady() {
        this.render();
    }

    /**
     * Re-renders the view by clearing the panel and calling renderContent().
     * Safe to call multiple times.
     */
    render() {
        if (!this.panel) return;
        this.panel.innerHTML = "";
        this.renderContent();
    }

    /**
     * Subclasses override this to build their specific content.
     * Default shows a simple loading message.
     */
    renderContent() {
        this.panel.innerHTML = '<div class="p-8 text-center text-zinc-400">Loading...</div>';
    }

    /** Shows the panel/modal */
    show()  { this.panel.style.display = 'block'; }

    /** Hides the panel/modal */
    hide()  { this.panel.style.display = 'none'; }

    /**
     * Convenience query selector scoped to the panel/container.
     */
    $(sel)  { return this.panel.querySelector(sel); }
}
