class BaseNeonovaView extends EventTarget{
    constructor(container = null) {
        super();
        this.theme = {
            accent: 'emerald',
            accentColor: '#34d399',
            primary: 'emerald'
        };
        this.accent = 'emerald';
        this.accentColor = 'emerald-500';

        if (container) {
            this.container = container;        // ← for report/progress views
        } else {
            this.panel = this.createPanelContainer();
        }

        this.ensureTailwind();
    }

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

    onTailwindReady() {
        this.render();   // subclass will override render()
    }

    render() {
        if (!this.panel) return;
        this.panel.innerHTML = "";
        this.renderContent();
    }

    renderContent() {
        this.panel.innerHTML = '<div class="p-8 text-center text-zinc-400">Loading...</div>';
    }

    show()  { this.panel.style.display = 'block'; }
    hide()  { this.panel.style.display = 'none'; }

    $(sel)  { return this.panel.querySelector(sel); }
}
