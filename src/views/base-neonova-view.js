class BaseNeonovaView {
    constructor() {
        this.ensureTailwind();
        this.panel = null;            // main container
        this.isVisible = false;
        this.createBaseElements();
    }

    ensureTailwind() {
        if (!document.getElementById('tailwind-css')) {
            const script = document.createElement('script');
            script.id = 'tailwind-css';
            script.src = 'https://cdn.tailwindcss.com';
            script.onload = () => {
                console.log('[BaseView] Tailwind loaded');
                this.onTailwindReady?.();
            };
            document.head.appendChild(script);
        }
    }

    createBaseElements() {
        // Common container styles (dark, rounded, shadowed)
        this.panel = document.createElement('div');
        this.panel.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            width: 92%;
            max-width: 1100px;
            height: calc(100vh - 80px);
            background: #09090b;
            border: 1px solid #27272a;
            border-radius: 24px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.8);
            overflow: hidden;
            font-family: system-ui;
            z-index: 9999;
            display: none;
        `;
        document.body.appendChild(this.panel);
    }

    // Hook for subclasses to define content after Tailwind is ready
    render() {
        if (!this.panel) return;

        // Subclasses override this
        this.panel.innerHTML = '<div class="p-8 text-center text-zinc-400">Loading...</div>';
    }

    show() {
        this.panel.style.display = 'block';
        this.isVisible = true;
    }

    hide() {
        this.panel.style.display = 'none';
        this.isVisible = false;
    }

    // Utility: safe querySelector with log
    $(selector) {
        const el = this.panel.querySelector(selector);
        if (!el) console.warn(`Element not found: ${selector}`);
        return el;
    }

    // Utility: add delegation once
    addGlobalDelegation() {
        if (this._delegationAdded) return;
        document.body.addEventListener('click', this.handleClick.bind(this), true);
        this._delegationAdded = true;
    }

    // Subclasses can override or extend
    handleClick(e) {
        // Default: do nothing
    }

    // Common constants (easily override in subclasses if needed)
    static THEME = {
        bg: '#09090b',
        border: '#27272a',
        accent: '#10b981',        // emerald-500
        accentHover: '#059669',
        text: '#e5e7eb',
        textSecondary: '#9ca3af',
        shadow: 'rgba(0,0,0,0.8)',
        neonGlow: '0 0 15px #22ff88',
    };
}
