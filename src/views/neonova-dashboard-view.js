class NeonovaDashboardView {
    constructor(controller) {
        this.controller = controller;
        this.panel = null;
        this.minimizeBar = null;
        this.createElements();
    }

    createElements() {
        if (!document.getElementById('tailwind-css')) {
            const s = document.createElement('script');
            s.id = 'tailwind-css';
            s.src = 'https://cdn.tailwindcss.com';
            document.head.appendChild(s);
        }

        this.minimizeBar = document.createElement('div');
        this.minimizeBar.style.cssText = `
            position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
            background: #18181b; color: white; padding: 12px 28px; border-radius: 20px 20px 0 0;
            cursor: pointer; z-index: 10000; font-family: system-ui; display: none;
            box-shadow: 0 -10px 30px rgba(34, 255, 136, 0.25);
            border: 1px solid #22ff88; border-bottom: none;
            display: flex; align-items: center; gap: 16px;
        `;
        this.minimizeBar.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-emerald-500 rounded-2xl flex items-center justify-center text-black font-bold text-xl">N</div>
                <h1 class="text-xl font-semibold" style="text-shadow: 0 0 15px #22ff88;">Neonova</h1>
                <span class="text-emerald-400 text-xs font-mono tracking-widest">DASHBOARD</span>
            </div>
            <button class="ml-auto px-6 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-black rounded-2xl flex items-center gap-2 transition">
                <i class="fas fa-chevron-up"></i> Maximize
            </button>
        `;
        this.minimizeBar.addEventListener('click', () => this.toggleMinimize());
        document.body.appendChild(this.minimizeBar);

        this.panel = document.createElement('div');
        this.panel.style.cssText = `
            position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%);
            width: 92%; max-width: 1100px; max-height: 78vh;
            background: #09090b; border: 1px solid #27272a; border-bottom: none;
            border-radius: 24px 24px 0 0; box-shadow: 0 -12px 40px rgba(0,0,0,0.8);
            padding: 0; font-family: system-ui; z-index: 9999; display: none;
            overflow-y: auto;
        `;
        document.body.appendChild(this.panel);

        this.minimizeBar.style.display = 'flex';
        this.panel.style.display = 'none';
        this.render();
    }

    render() {
        let rows = '';
        this.controller.customers.forEach(c => {
            const isConnected = c.status === 'Connected';
            const durationText = c.getDurationStr();
            rows += `
                <tr class="hover:bg-zinc-800 transition group">
                    <td class="friendly-name px-8 py-5 font-medium text-zinc-100" data-username="${c.radiusUsername}" data-editable="false">
                        ${c.friendlyName || c.radiusUsername}
                    </td>
                    <td class="px-8 py-5 font-mono text-zinc-400">${c.radiusUsername}</td>
                    <td class="px-8 py-5">
                        <span class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-2xl text-xs font-semibold ${isConnected ? 'bg-emerald-500' : 'bg-red-500'} text-white">
                            <span class="w-2 h-2 rounded-full bg-current"></span>
                            ${c.status}
                        </span>
                    </td>
                    <td class="px-8 py-5 font-mono ${isConnected ? 'text-emerald-400' : 'text-red-400'}">
                        ${durationText}
                    </td>
                    <td class="px-8 py-5 text-right">
                        <button class="remove-btn text-zinc-400 hover:text-red-400 px-3 py-1 text-sm">Remove</button>
                        <button class="report-btn ml-3 bg-emerald-600 hover:bg-emerald-500 px-5 py-2 rounded-2xl text-xs font-medium text-white">Report</button>
                    </td>
                </tr>
            `;
        });

        this.panel.innerHTML = `... (your current innerHTML string - keep it exactly as you have it) ...`;

        // Slider + tooltip (keep exactly as you have it)

        // Global delegation
        document.body.addEventListener('click', this.handleGlobalClick.bind(this), true);
    }

    handleGlobalClick(e) {
        const btn = e.target.closest('button');
        if (!btn) return;

        console.log('Button clicked:', btn.className);

        if (btn.classList.contains('remove-btn')) {
            this.controller.remove(btn.dataset.username);
        }

        if (btn.classList.contains('report-btn')) {
            const username = btn.dataset.username;
            const customer = this.controller.customers.find(c => c.radiusUsername === username);
            if (customer) this.openReportModal(username, customer.friendlyName || username);
        }

        if (btn.classList.contains('add-btn')) { /* your add code */ }
        if (btn.classList.contains('refresh-btn')) this.controller.poll();
        if (btn.classList.contains('minimize-btn')) this.toggleMinimize();
        if (btn.id === 'poll-toggle-btn') {
            this.controller.togglePolling();
            this.render();
        }
    }

    openReportModal(username, friendlyName) {
        console.log('openReportModal called for', username);   // ← this will appear

        try {
            const overlay = document.createElement('div');
            overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;`;
            document.body.appendChild(overlay);

            const modal = document.createElement('div');
            modal.style.cssText = `background:white;padding:20px;border-radius:8px;width:600px;max-height:80vh;overflow-y:auto;position:relative;`;
            overlay.appendChild(modal);

            // ... your full original modal code continues here ...
            // (the rest is exactly what you had before)

            console.log('Modal created successfully');
        } catch (err) {
            console.error('openReportModal error:', err);
        }
    }

    toggleMinimize() { /* your current toggleMinimize */ }
    update() { this.render(); }
}
