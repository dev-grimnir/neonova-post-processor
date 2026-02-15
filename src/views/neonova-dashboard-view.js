/**
 * Dashboard view — main UI for monitoring multiple customers.
 * Features customer list, add/remove, polling controls, and minimize/maximize.
 */
class NeonovaDashboardView extends BaseNeonovaView {
    /**
     * @param {NeonovaDashboardController} controller - Reference to the dashboard controller
     */
    constructor(controller) {
        super();
        this.controller = controller;
        this.isMinimized = true;

        this.#createMinimizeBar();
        this.#createMainPanel();
        this.#setupGlobalStyles();

        this.render();
    }

    /**
     * Creates the minimized bottom bar (shown when dashboard is minimized).
     */
    #createMinimizeBar() {
        this.minimizeBar = document.createElement('div');
        this.minimizeBar.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 92%;
            max-width: 1100px;
            background: #18181b;
            color: white;
            padding: 12px 32px;
            border-radius: 24px 24px 0 0;
            cursor: pointer;
            z-index: 10000;
            font-family: system-ui;
            display: none;
            box-shadow: 0 -12px 40px rgba(0,0,0,0.8);
            border: 1px solid #22ff88;
            border-bottom: none;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
        `;
        this.minimizeBar.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-8 h-8 bg-emerald-500 rounded-2xl flex items-center justify-center text-black font-bold text-xl">N</div>
                <h1 class="text-xl font-semibold" style="text-shadow: 0 0 15px #22ff88;">Neonova</h1>
                <span class="text-emerald-400 text-xs font-mono tracking-widest">DASHBOARD</span>
            </div>
            <button class="px-8 py-2.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-black rounded-2xl flex items-center gap-2 transition shadow-md">
                <i class="fas fa-chevron-up"></i> Maximize
            </button>
        `;

        this.minimizeBar.addEventListener('click', () => this.toggleMinimize());
        document.body.appendChild(this.minimizeBar);
    }

    /**
     * Creates the main dashboard panel.
     */
    #createMainPanel() {
        this.panel = document.createElement('div');
        this.panel.style.cssText = `
            position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
            width: 92%; max-width: 1100px; height: calc(100vh - 80px);
            background: #09090b; border: 1px solid #27272a;
            border-radius: 24px; box-shadow: 0 8px 40px rgba(0,0,0,0.8);
            padding: 0; font-family: system-ui; z-index: 9999; display: none;
            overflow: hidden;  
            transition: transform 500ms cubic-bezier(0.32, 0.72, 0, 1);
        `;
        document.body.appendChild(this.panel);
    }

    /**
     * Adds global scrollbar styling (emerald theme) once.
     */
    #setupGlobalStyles() {
        if (document.getElementById('neonova-scroll-style')) return;

        const style = document.createElement('style');
        style.id = 'neonova-scroll-style';
        style.innerHTML = `
            .neonova-scroll::-webkit-scrollbar {
                width: 7px;
            }
            .neonova-scroll::-webkit-scrollbar-track {
                background: #18181b;
                border-radius: 9999px;
            }
            .neonova-scroll::-webkit-scrollbar-thumb {
                background: #34d399;
                border-radius: 9999px;
                border: 2px solid #18181b;
            }
            .neonova-scroll::-webkit-scrollbar-thumb:hover {
                background: #10b981;
            }

            /* Firefox */
            .neonova-scroll {
                scrollbar-width: thin;
                scrollbar-color: #34d399 #18181b;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Main render method — orchestrates all sections.
     * Preserves scroll position when re-rendering.
     */
    render() {
        if (!this.panel) return;

        // Preserve scroll position
        const scrollContainer = this.panel.querySelector('.flex-1.overflow-y-auto');
        const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

        this.#renderHeader();
        this.#renderAddBar();
        this.#renderCustomerTable();
        this.#renderBottomBar();

        // Restore scroll
        const newScrollContainer = this.panel.querySelector('.flex-1.overflow-y-auto');
        if (newScrollContainer) newScrollContainer.scrollTop = savedScrollTop;

        this.#attachEventListeners();
    }

    #renderHeader() {
        const headerHTML = `
            <div class="flex items-center justify-between px-8 py-5 border-b border-zinc-800 bg-zinc-900 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-emerald-500 rounded-2xl flex items-center justify-center text-black font-bold text-xl">N</div>
                    <h1 class="text-2xl font-semibold" style="text-shadow: 0 0 15px #22ff88;">Neonova</h1>
                    <span class="text-emerald-400 text-sm font-mono tracking-widest">DASHBOARD</span>
                </div>
                <button class="minimize-btn px-6 py-2.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-black rounded-2xl flex items-center gap-2 transition">
                    <i class="fas fa-minus"></i> Minimize
                </button>
            </div>
        `;

        const container = this.panel.querySelector('.flex-col') || this.panel;
        let header = container.querySelector(':scope > div:first-child');
        if (header) {
            header.outerHTML = headerHTML;
        } else {
            this.panel.innerHTML = `<div class="flex flex-col h-full">${headerHTML}</div>`;
        }
    }

    #renderAddBar() {
        const addBarHTML = `
            <div class="shrink-0 px-8 pt-8 pb-6 bg-zinc-900 border-b border-zinc-700">
                <div class="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-5">
                            <input id="radiusId" type="text" placeholder="RADIUS Username" 
                                   class="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-emerald-500">
                        </div>
                        <div class="col-span-5">
                            <input id="friendlyName" type="text" placeholder="Friendly Name (optional)" 
                                   class="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-emerald-500">
                        </div>
                        <div class="col-span-2">
                            <button class="add-btn w-full h-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-2xl transition">ADD</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const container = this.panel.querySelector('.flex-col');
        let addBar = container.querySelector(':scope > div:nth-child(2)');
        if (addBar) {
            addBar.outerHTML = addBarHTML;
        } else {
            container.insertAdjacentHTML('beforeend', addBarHTML);
        }
    }

    #renderCustomerTable() {
        let rows = '';
        if (this.controller.customers.length === 0) {
            rows = '<tr><td colspan="5151" class="p-12 text-center text-zinc-500">No customers added yet</td></tr>';
        } else {
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
                            <button class="remove-btn text-zinc-400 hover:text-red-400 px-3 py-1 text-sm" data-username="${c.radiusUsername}">Remove</button>
                            <button class="report-btn ml-3 bg-emerald-600 hover:bg-emerald-500 px-5 py-2 rounded-2xl text-xs font-medium text-white" data-username="${c.radiusUsername}">Report</button>
                        </td>
                    </tr>
                `;
            });
        }

        const tableHTML = `
            <div class="flex-1 overflow-y-auto px-8 pb-8 neonova-scroll">
                <div class="bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden">
                    <table class="w-full">
                        <thead class="sticky top-0 bg-zinc-900 z-10">
                            <tr class="border-b border-zinc-800 text-xs uppercase tracking-widest text-zinc-500">
                                <th class="px-8 py-5 text-left">Friendly Name</th>
                                <th class="px-8 py-5 text-left">RADIUS Username</th>
                                <th class="px-8 py-5 text-left">Status</th>
                                <th class="px-8 py-5 text-left">Duration</th>
                                <th class="px-8 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;

        const container = this.panel.querySelector('.flex-col');
        let tableSection = container.querySelector('.flex-1.overflow-y-auto');
        if (tableSection) {
            tableSection.outerHTML = tableHTML;
        } else {
            container.insertAdjacentHTML('beforeend', tableHTML);
        }
    }

    #renderBottomBar() {
        const bottomBarHTML = `
            <div class="bg-zinc-900 border border-zinc-700 rounded-3xl px-8 py-5 mx-8 mb-8 shrink-0">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-8">
                        <div class="flex items-center gap-4">
                            <span class="text-xs uppercase tracking-widest text-zinc-500">Polling</span>
                            <input type="range" id="polling-interval-slider" min="1" max="60" value="${this.controller.pollingIntervalMinutes}" class="w-64 accent-emerald-500">
                            <span id="interval-value" class="font-mono text-emerald-400 w-12">${this.controller.pollingIntervalMinutes} min</span>
                        </div>
                        <button id="poll-toggle-btn" class="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-2xl flex items-center gap-2 transition">
                            ${this.controller.isPollingPaused 
                                ? '<i class="fas fa-play"></i> Resume Polling' 
                                : '<i class="fas fa-pause"></i> Pause Polling'}
                        </button>
                    </div>
                    <div class="flex items-center gap-6 text-sm">
                        <button class="refresh-btn flex items-center gap-2 text-emerald-400 hover:text-emerald-300">
                            <i class="fas fa-sync-alt"></i> Refresh Now
                        </button>
                        <div class="text-zinc-500 text-xs">
                            Last update: <span id="pollStatus" class="font-mono text-zinc-400">${new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const container = this.panel.querySelector('.flex-col');
        let bottomBar = container.querySelector(':scope > div:last-child');
        if (bottomBar && bottomBar.classList.contains('shrink-0')) {
            bottomBar.outerHTML = bottomBarHTML;
        } else {
            container.insertAdjacentHTML('beforeend', bottomBarHTML);
        }
    }

    #attachEventListeners() {
        // Clear old listeners by cloning nodes
        this.panel.querySelectorAll('.remove-btn, .report-btn, .add-btn, .refresh-btn, .minimize-btn, #poll-toggle-btn').forEach(el => {
            el.replaceWith(el.cloneNode(true));
        });

        // Remove buttons
        this.panel.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const username = btn.dataset.username;
                if (username) this.controller.remove(username);
            });
        });

        // Report buttons
        this.panel.querySelectorAll('.report-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const username = btn.dataset.username;
                const customer = this.controller.customers.find(c => c.radiusUsername === username);
                if (customer) {
                    const reportView = new NeonovaReportOrderView(null, username, customer.friendlyName || username);
                    reportView.controller = this.controller;
                    reportView.showModal();
                }
            });
        });

        // Add button
        const addBtn = this.panel.querySelector('.add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const idInput = this.panel.querySelector('#radiusId');
                const nameInput = this.panel.querySelector('#friendlyName');
                if (!idInput) return;
                setTimeout(() => {
                    const cleanedId = idInput.value.trim().replace(/\s+/g, '');
                    if (cleanedId) {
                        this.controller.add(cleanedId, nameInput ? nameInput.value.trim() : '');
                        idInput.value = '';
                        if (nameInput) nameInput.value = '';
                        idInput.focus();
                    }
                }, 100);
            });
        }

        // Refresh button
        const refreshBtn = this.panel.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.controller.poll());
        }

        // Minimize button
        const minimizeBtn = this.panel.querySelector('.minimize-btn');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => this.toggleMinimize());
        }

        // Poll toggle button
        const pollBtn = this.panel.querySelector('#poll-toggle-btn');
        if (pollBtn) {
            pollBtn.addEventListener('click', () => {
                this.controller.togglePolling();
            });
        }

        // Polling slider
        this.#setupPollingSlider();

        // Friendly name editing
        this.#setupFriendlyNameEditing();
    }

    #setupPollingSlider() {
        const slider = this.panel.querySelector('#polling-interval-slider');
        const display = this.panel.querySelector('#interval-value');
        if (!slider || !display) return;

        slider.addEventListener('input', () => {
            const minutes = parseInt(slider.value);
            display.textContent = minutes;
            this.controller.setPollingInterval(minutes);
        });

        let tooltip = document.getElementById('poll-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'poll-tooltip';
            tooltip.style.cssText = `
                position: absolute;
                background: #222;
                color: #fff;
                padding: 6px 10px;
                border-radius: 4px;
                font-size: 13px;
                font-family: Arial, sans-serif;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                transition: opacity .15s, transform .15s;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                z-index: 10001;
            `;
            document.body.appendChild(tooltip);
        }

        const showTooltip = (e) => {
            const rect = slider.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const value = Math.round(+slider.min + percent * (+slider.max - +slider.min));

            tooltip.textContent = `${value} minute${value === 1 ? '' : 's'}`;

            const thumbX = rect.left + percent * rect.width;
            tooltip.style.left = `${thumbX - tooltip.offsetWidth / 2}px`;
            tooltip.style.top = `${rect.top - 34}px`;
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateY(-4px)';
        };

        const hideTooltip = () => {
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateY(0)';
        };

        slider.addEventListener('mousemove', showTooltip);
        slider.addEventListener('input', showTooltip);
        slider.addEventListener('mouseleave', hideTooltip);
        slider.addEventListener('touchmove', (e) => {
            if (e.touches.length) showTooltip(e.touches[0]);
        });
    }

    #setupFriendlyNameEditing() {
        this.panel.querySelectorAll('.friendly-name').forEach(cell => {
            if (cell.dataset.editable === 'true') return;
            cell.dataset.editable = 'true';
            cell.style.cursor = 'pointer';
            cell.title = 'Click to edit friendly name (blank to reset to username)';

            cell.addEventListener('click', () => {
                if (cell.querySelector('input')) return;

                const username = cell.dataset.username;
                const currentDisplay = cell.textContent.trim();

                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentDisplay;
                input.style.cssText = 'width:100%; box-sizing:border-box; padding:2px 4px; font-size:inherit;';
                cell.innerHTML = '';
                cell.appendChild(input);
                input.focus();
                input.select();

                const save = () => {
                    const newName = input.value.trim();
                    const customer = this.controller.customers.find(c => c.radiusUsername === username);
                    if (customer) {
                        customer.friendlyName = newName || null;
                        cell.textContent = customer.friendlyName || customer.radiusUsername;
                    }
                };

                input.addEventListener('blur', save);
                input.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        save();
                    } else if (e.key === 'Escape') {
                        cell.textContent = currentDisplay;
                    }
                });
            });
        });
    }

    toggleMinimize() {
        const dash = this.panel;
        const bar = this.minimizeBar;
        this.isMinimized = !this.isMinimized;

        if (this.isMinimized) {
            dash.style.transform = 'translate(-50%, 100%)';
            setTimeout(() => {
                dash.style.display = 'none';
                bar.style.display = 'flex';
            }, 480);
        } else {
            bar.style.display = 'none';
            dash.style.display = 'block';
            dash.style.transform = 'translate(-50%, 100%)';
            void dash.offsetWidth;
            requestAnimationFrame(() => {
                dash.style.transform = 'translateX(-50%)';
            });
        }
    }

    update() { this.render(); }
}

/**
class NeonovaDashboardView extends BaseNeonovaView {
    constructor(controller) {
        super();
        this.controller = controller;
        this.isMinimized = true;

        this.#createMinimizeBar();
        this.#createMainPanel();
        this.#setupGlobalStyles();

        this.render();
    }


    #createMinimizeBar() {
        this.minimizeBar = document.createElement('div');
        this.minimizeBar.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 92%;
            max-width: 1100px;
            background: #18181b;
            color: white;
            padding: 12px 32px;
            border-radius: 24px 24px 0 0;
            cursor: pointer;
            z-index: 10000;
            font-family: system-ui;
            display: none;
            box-shadow: 0 -12px 40px rgba(0,0,0,0.8);
            border: 1px solid #22ff88;
            border-bottom: none;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
        `;
        this.minimizeBar.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="w-8 h-8 bg-emerald-500 rounded-2xl flex items-center justify-center text-black font-bold text-xl">N</div>
                <h1 class="text-xl font-semibold" style="text-shadow: 0 0 15px #22ff88;">Neonova</h1>
                <span class="text-emerald-400 text-xs font-mono tracking-widest">DASHBOARD</span>
            </div>
            <button class="px-8 py-2.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-black rounded-2xl flex items-center gap-2 transition shadow-md">
                <i class="fas fa-chevron-up"></i> Maximize
            </button>
        `;

        this.minimizeBar.addEventListener('click', () => this.toggleMinimize());
        document.body.appendChild(this.minimizeBar);
    }


    #createMainPanel() {
        this.panel = document.createElement('div');
        this.panel.style.cssText = `
            position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
            width: 92%; max-width: 1100px; height: calc(100vh - 80px);
            background: #09090b; border: 1px solid #27272a;
            border-radius: 24px; box-shadow: 0 8px 40px rgba(0,0,0,0.8);
            padding: 0; font-family: system-ui; z-index: 9999; display: none;
            overflow: hidden;  
            transition: transform 500ms cubic-bezier(0.32, 0.72, 0, 1);
        `;
        document.body.appendChild(this.panel);
    }


    #setupGlobalStyles() {
        if (document.getElementById('neonova-scroll-style')) return;

        const style = document.createElement('style');
        style.id = 'neonova-scroll-style';
        style.innerHTML = `
            .neonova-scroll::-webkit-scrollbar {
                width: 7px;
            }
            .neonova-scroll::-webkit-scrollbar-track {
                background: #18181b;
                border-radius: 9999px;
            }
            .neonova-scroll::-webkit-scrollbar-thumb {
                background: #34d399;
                border-radius: 9999px;
                border: 2px solid #18181b;
            }
            .neonova-scroll::-webkit-scrollbar-thumb:hover {
                background: #10b981;
            }

          
            .neonova-scroll {
                scrollbar-width: thin;
                scrollbar-color: #34d399 #18181b;
            }
        `;
        document.head.appendChild(style);
    }

    render() {
        if (!this.panel) return;

        // Preserve scroll position
        const scrollContainer = this.panel.querySelector('.flex-1.overflow-y-auto');
        const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

        this.#renderHeader();
        this.#renderAddBar();
        this.#renderCustomerTable();
        this.#renderBottomBar();

        // Restore scroll
        const newScrollContainer = this.panel.querySelector('.flex-1.overflow-y-auto');
        if (newScrollContainer) newScrollContainer.scrollTop = savedScrollTop;

        this.#attachEventListeners();
    }

    #renderHeader() {
        const headerHTML = `
            <div class="flex items-center justify-between px-8 py-5 border-b border-zinc-800 bg-zinc-900 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-emerald-500 rounded-2xl flex items-center justify-center text-black font-bold text-xl">N</div>
                    <h1 class="text-2xl font-semibold" style="text-shadow: 0 0 15px #22ff88;">Neonova</h1>
                    <span class="text-emerald-400 text-sm font-mono tracking-widest">DASHBOARD</span>
                </div>
                <button class="minimize-btn px-6 py-2.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-black rounded-2xl flex items-center gap-2 transition">
                    <i class="fas fa-minus"></i> Minimize
                </button>
            </div>
        `;

        const container = this.panel.querySelector('.flex-col') || this.panel;
        let header = container.querySelector(':scope > div:first-child');
        if (header) {
            header.outerHTML = headerHTML;
        } else {
            this.panel.innerHTML = `<div class="flex flex-col h-full">${headerHTML}</div>`;
        }
    }

    #renderAddBar() {
        const addBarHTML = `
            <div class="shrink-0 px-8 pt-8 pb-6 bg-zinc-900 border-b border-zinc-700">
                <div class="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-5">
                            <input id="radiusId" type="text" placeholder="RADIUS Username" 
                                   class="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-emerald-500">
                        </div>
                        <div class="col-span-5">
                            <input id="friendlyName" type="text" placeholder="Friendly Name (optional)" 
                                   class="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-emerald-500">
                        </div>
                        <div class="col-span-2">
                            <button class="add-btn w-full h-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-2xl transition">ADD</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const container = this.panel.querySelector('.flex-col');
        let addBar = container.querySelector(':scope > div:nth-child(2)');
        if (addBar) {
            addBar.outerHTML = addBarHTML;
        } else {
            container.insertAdjacentHTML('beforeend', addBarHTML);
        }
    }

    #renderCustomerTable() {
        let rows = '';
        if (this.controller.customers.length === 0) {
            rows = '<tr><td colspan="5151" class="p-12 text-center text-zinc-500">No customers added yet</td></tr>';
        } else {
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
                            <button class="remove-btn text-zinc-400 hover:text-red-400 px-3 py-1 text-sm" data-username="${c.radiusUsername}">Remove</button>
                            <button class="report-btn ml-3 bg-emerald-600 hover:bg-emerald-500 px-5 py-2 rounded-2xl text-xs font-medium text-white" data-username="${c.radiusUsername}">Report</button>
                        </td>
                    </tr>
                `;
            });
        }

        const tableHTML = `
            <div class="flex-1 overflow-y-auto px-8 pb-8 neonova-scroll">
                <div class="bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden">
                    <table class="w-full">
                        <thead class="sticky top-0 bg-zinc-900 z-10">
                            <tr class="border-b border-zinc-800 text-xs uppercase tracking-widest text-zinc-500">
                                <th class="px-8 py-5 text-left">Friendly Name</th>
                                <th class="px-8 py-5 text-left">RADIUS Username</th>
                                <th class="px-8 py-5 text-left">Status</th>
                                <th class="px-8 py-5 text-left">Duration</th>
                                <th class="px-8 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;

        const container = this.panel.querySelector('.flex-col');
        let tableSection = container.querySelector('.flex-1.overflow-y-auto');
        if (tableSection) {
            tableSection.outerHTML = tableHTML;
        } else {
            container.insertAdjacentHTML('beforeend', tableHTML);
        }
    }

    #renderBottomBar() {
        const bottomBarHTML = `
            <div class="bg-zinc-900 border border-zinc-700 rounded-3xl px-8 py-5 mx-8 mb-8 shrink-0">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-8">
                        <div class="flex items-center gap-4">
                            <span class="text-xs uppercase tracking-widest text-zinc-500">Polling</span>
                            <input type="range" id="polling-interval-slider" min="1" max="60" value="${this.controller.pollingIntervalMinutes}" class="w-64 accent-emerald-500">
                            <span id="interval-value" class="font-mono text-emerald-400 w-12">${this.controller.pollingIntervalMinutes} min</span>
                        </div>
                        <button id="poll-toggle-btn" class="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-2xl flex items-center gap-2 transition">
                            ${this.controller.isPollingPaused 
                                ? '<i class="fas fa-play"></i> Resume Polling' 
                                : '<i class="fas fa-pause"></i> Pause Polling'}
                        </button>
                    </div>
                    <div class="flex items-center gap-6 text-sm">
                        <button class="refresh-btn flex items-center gap-2 text-emerald-400 hover:text-emerald-300">
                            <i class="fas fa-sync-alt"></i> Refresh Now
                        </button>
                        <div class="text-zinc-500 text-xs">
                            Last update: <span id="pollStatus" class="font-mono text-zinc-400">${new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const container = this.panel.querySelector('.flex-col');
        let bottomBar = container.querySelector(':scope > div:last-child');
        if (bottomBar && bottomBar.classList.contains('shrink-0')) {
            bottomBar.outerHTML = bottomBarHTML;
        } else {
            container.insertAdjacentHTML('beforeend', bottomBarHTML);
        }
    }

    #attachEventListeners() {
        // Clear old listeners by cloning nodes
        this.panel.querySelectorAll('.remove-btn, .report-btn, .add-btn, .refresh-btn, .minimize-btn, #poll-toggle-btn').forEach(el => {
            el.replaceWith(el.cloneNode(true));
        });

        // Remove buttons
        this.panel.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const username = btn.dataset.username;
                if (username) this.controller.remove(username);
            });
        });

        // Report buttons
        this.panel.querySelectorAll('.report-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const username = btn.dataset.username;
                const customer = this.controller.customers.find(c => c.radiusUsername === username);
                if (customer) {
                    const reportView = new NeonovaReportOrderView(null, username, customer.friendlyName || username);
                    reportView.controller = this.controller;
                    reportView.showModal();
                }
            });
        });

        // Add button
        const addBtn = this.panel.querySelector('.add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const idInput = this.panel.querySelector('#radiusId');
                const nameInput = this.panel.querySelector('#friendlyName');
                if (!idInput) return;
                setTimeout(() => {
                    const cleanedId = idInput.value.trim().replace(/\s+/g, '');
                    if (cleanedId) {
                        this.controller.add(cleanedId, nameInput ? nameInput.value.trim() : '');
                        idInput.value = '';
                        if (nameInput) nameInput.value = '';
                        idInput.focus();
                    }
                }, 100);
            });
        }

        // Refresh button
        const refreshBtn = this.panel.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.controller.poll());
        }

        // Minimize button
        const minimizeBtn = this.panel.querySelector('.minimize-btn');
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => this.toggleMinimize());
        }

        // Poll toggle button
        const pollBtn = this.panel.querySelector('#poll-toggle-btn');
        if (pollBtn) {
            pollBtn.addEventListener('click', () => {
                this.controller.togglePolling();
            });
        }

        // Polling slider
        this.#setupPollingSlider();

        // Friendly name editing
        this.#setupFriendlyNameEditing();
    }

    #setupPollingSlider() {
        const slider = this.panel.querySelector('#polling-interval-slider');
        const display = this.panel.querySelector('#interval-value');
        if (!slider || !display) return;

        slider.addEventListener('input', () => {
            const minutes = parseInt(slider.value);
            display.textContent = minutes;
            this.controller.setPollingInterval(minutes);
        });

        let tooltip = document.getElementById('poll-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'poll-tooltip';
            tooltip.style.cssText = `
                position: absolute;
                background: #222;
                color: #fff;
                padding: 6px 10px;
                border-radius: 4px;
                font-size: 13px;
                font-family: Arial, sans-serif;
                white-space: nowrap;
                pointer-events: none;
                opacity: 0;
                transition: opacity .15s, transform .15s;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                z-index: 10001;
            `;
            document.body.appendChild(tooltip);
        }

        const showTooltip = (e) => {
            const rect = slider.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const value = Math.round(+slider.min + percent * (+slider.max - +slider.min));

            tooltip.textContent = `${value} minute${value === 1 ? '' : 's'}`;

            const thumbX = rect.left + percent * rect.width;
            tooltip.style.left = `${thumbX - tooltip.offsetWidth / 2}px`;
            tooltip.style.top = `${rect.top - 34}px`;
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateY(-4px)';
        };

        const hideTooltip = () => {
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateY(0)';
        };

        slider.addEventListener('mousemove', showTooltip);
        slider.addEventListener('input', showTooltip);
        slider.addEventListener('mouseleave', hideTooltip);
        slider.addEventListener('touchmove', (e) => {
            if (e.touches.length) showTooltip(e.touches[0]);
        });
    }

    #setupFriendlyNameEditing() {
        this.panel.querySelectorAll('.friendly-name').forEach(cell => {
            if (cell.dataset.editable === 'true') return;
            cell.dataset.editable = 'true';
            cell.style.cursor = 'pointer';
            cell.title = 'Click to edit friendly name (blank to reset to username)';

            cell.addEventListener('click', () => {
                if (cell.querySelector('input')) return;

                const username = cell.dataset.username;
                const currentDisplay = cell.textContent.trim();

                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentDisplay;
                input.style.cssText = 'width:100%; box-sizing:border-box; padding:2px 4px; font-size:inherit;';
                cell.innerHTML = '';
                cell.appendChild(input);
                input.focus();
                input.select();

                const save = () => {
                    const newName = input.value.trim();
                    const customer = this.controller.customers.find(c => c.radiusUsername === username);
                    if (customer) {
                        customer.friendlyName = newName || null;
                        cell.textContent = customer.friendlyName || customer.radiusUsername;
                    }
                };

                input.addEventListener('blur', save);
                input.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        save();
                    } else if (e.key === 'Escape') {
                        cell.textContent = currentDisplay;
                    }
                });
            });
        });
    }

    toggleMinimize() {
        const dash = this.panel;
        const bar = this.minimizeBar;
        this.isMinimized = !this.isMinimized;

        if (this.isMinimized) {
            dash.style.transform = 'translate(-50%, 100%)';
            setTimeout(() => {
                dash.style.display = 'none';
                bar.style.display = 'flex';
            }, 480);
        } else {
            bar.style.display = 'none';
            dash.style.display = 'block';
            dash.style.transform = 'translate(-50%, 100%)';
            void dash.offsetWidth;
            requestAnimationFrame(() => {
                dash.style.transform = 'translateX(-50%)';
            });
        }
    }

    update() { this.render(); }

    // ────────────────────────────────────────────────
    // Old massive render() method (commented out in one block for reference/rollback)
    // ────────────────────────────────────────────────

    /*
    render() {
        if (!this.panel) {
            console.warn('Panel not ready yet');
            return
        }

        const scrollContainer = this.panel.querySelector('.flex-1.overflow-y-auto');
        const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
        
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
                                    <button class="remove-btn text-zinc-400 hover:text-red-400 px-3 py-1 text-sm" data-username="${c.radiusUsername}">Remove</button>
                                    <button class="report-btn ml-3 bg-emerald-600 hover:bg-emerald-500 px-5 py-2 rounded-2xl text-xs font-medium text-white" data-username="${c.radiusUsername}">Report</button>
                                </td>
                            </tr>
                        `;
            });

                            this.panel.innerHTML = `
                                <div class="flex flex-col h-full">
                                
                                    <!-- HEADER -->
                                    <div class="flex items-center justify-between px-8 py-5 border-b border-zinc-800 bg-zinc-900 shrink-0">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 bg-emerald-500 rounded-2xl flex items-center justify-center text-black font-bold text-xl">N</div>
                                            <h1 class="text-2xl font-semibold" style="text-shadow: 0 0 15px #22ff88;">Neonova</h1>
                                            <span class="text-emerald-400 text-sm font-mono tracking-widest">DASHBOARD</span>
                                        </div>
                                        <button class="minimize-btn px-6 py-2.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-black rounded-2xl flex items-center gap-2 transition">
                                            <i class="fas fa-minus"></i> Minimize
                                        </button>
                                    </div>
                                
                                    <!-- FIXED ADD BAR (never scrolls) -->
                                    <div class="shrink-0 px-8 pt-8 pb-6 bg-zinc-900 border-b border-zinc-700">
                                        <div class="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
                                            <div class="grid grid-cols-12 gap-4">
                                                <div class="col-span-5">
                                                    <input id="radiusId" type="text" placeholder="RADIUS Username" 
                                                           class="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-emerald-500">
                                                </div>
                                                <div class="col-span-5">
                                                    <input id="friendlyName" type="text" placeholder="Friendly Name (optional)" 
                                                           class="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-emerald-500">
                                                </div>
                                                <div class="col-span-2">
                                                    <button class="add-btn w-full h-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-2xl transition">ADD</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                
                                    <!-- SCROLLABLE TABLE ONLY -->
                                    <div class="flex-1 overflow-y-auto px-8 pb-8 neonova-scroll">
                                        <div class="bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden">
                                            <table class="w-full">
                                                <thead class="sticky top-0 bg-zinc-900 z-10">
                                                    <tr class="border-b border-zinc-800 text-xs uppercase tracking-widest text-zinc-500">
                                                        <th class="px-8 py-5 text-left">Friendly Name</th>
                                                        <th class="px-8 py-5 text-left">RADIUS Username</th>
                                                        <th class="px-8 py-5 text-left">Status</th>
                                                        <th class="px-8 py-5 text-left">Duration</th>
                                                        <th class="px-8 py-5 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>${rows}</tbody>
                                            </table>
                                        </div>
                                    </div>
                                
                                    <!-- BOTTOM BAR -->
                                    <div class="bg-zinc-900 border border-zinc-700 rounded-3xl px-8 py-5 mx-8 mb-8 shrink-0">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-8">
                                                <div class="flex items-center gap-4">
                                                    <span class="text-xs uppercase tracking-widest text-zinc-500">Polling</span>
                                                    <input type="range" id="polling-interval-slider" min="1" max="60" value="${this.controller.pollingIntervalMinutes}" class="w-64 accent-emerald-500">
                                                    <span id="interval-value" class="font-mono text-emerald-400 w-12">${this.controller.pollingIntervalMinutes} min</span>
                                                </div>
                                                <button id="poll-toggle-btn" class="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-2xl flex items-center gap-2 transition">
                                                    ${this.controller.isPollingPaused 
                                                        ? '<i class="fas fa-play"></i> Resume Polling' 
                                                        : '<i class="fas fa-pause"></i> Pause Polling'}
                                                </button>
                                            </div>
                                            <div class="flex items-center gap-6 text-sm">
                                                <button class="refresh-btn flex items-center gap-2 text-emerald-400 hover:text-emerald-300">
                                                    <i class="fas fa-sync-alt"></i> Refresh Now
                                                </button>
                                                <div class="text-zinc-500 text-xs">
                                                    Last update: <span class="font-mono text-zinc-400">${new Date().toLocaleTimeString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `;

        // === RESTORE SCROLL POSITION AFTER REBUILD ===
        const newScrollContainer = this.panel.querySelector('.flex-1.overflow-y-auto');
        if (newScrollContainer) {
            newScrollContainer.scrollTop = savedScrollTop;
        }

                // === ALL LISTENERS ATTACHED DIRECTLY AFTER RENDER (no global listener) ===
        
        // Remove buttons
        this.panel.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const username = btn.dataset.username;
                if (username) this.controller.remove(username);
            });
        });

        // Report buttons
        this.panel.querySelectorAll('.report-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const username = btn.dataset.username;
                const customer = this.controller.customers.find(c => c.radiusUsername === username);
                if (customer) {
                    const reportView = new NeonovaReportOrderView(null, username, customer.friendlyName || username);
                    reportView.controller = this.controller;
                    reportView.showModal();
                }
            });
        });

        // Add button
        const addBtn = this.panel.querySelector('.add-btn');
        if (addBtn) addBtn.addEventListener('click', () => {
            const idInput = this.panel.querySelector('#radiusId');
            const nameInput = this.panel.querySelector('#friendlyName');
            if (!idInput) return;
            setTimeout(() => {
                const cleanedId = idInput.value.trim().replace(/\s+/g, '');
                if (cleanedId) {
                    this.controller.add(cleanedId, nameInput ? nameInput.value.trim() : '');
                    idInput.value = '';
                    if (nameInput) nameInput.value = '';
                    idInput.focus();
                }
            }, 100);
        });

        // Refresh button
        const refreshBtn = this.panel.querySelector('.refresh-btn');
        if (refreshBtn) refreshBtn.addEventListener('click', () => this.controller.poll());

        // Minimize button
        const minimizeBtn = this.panel.querySelector('.minimize-btn');
        if (minimizeBtn) minimizeBtn.addEventListener('click', () => this.toggleMinimize());

        // Poll toggle button
        const pollBtn = this.panel.querySelector('#poll-toggle-btn');
        if (pollBtn) pollBtn.addEventListener('click', () => {
            this.controller.togglePolling();
            // Update button text directly
            if (this.controller.isPollingPaused) {
                pollBtn.innerHTML = '<i class="fas fa-play"></i> Resume Polling';
            } else {
                pollBtn.innerHTML = '<i class="fas fa-pause"></i> Pause Polling';
            }
        });

        // Slider + tooltip
        const slider = this.panel.querySelector('#polling-interval-slider');
        const display = this.panel.querySelector('#interval-value');
        if (slider && display) {
            slider.addEventListener('input', () => {
                const minutes = parseInt(slider.value);
                display.textContent = minutes;
                this.controller.setPollingInterval(minutes);
            });

            let tooltip = document.getElementById('poll-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'poll-tooltip';
                tooltip.style.cssText = `
                    position: absolute;
                    background: #222;
                    color: #fff;
                    padding: 6px 10px;
                    border-radius: 4px;
                    font-size: 13px;
                    font-family: Arial, sans-serif;
                    white-space: nowrap;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity .15s, transform .15s;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                    z-index: 10001;
                `;
                document.body.appendChild(tooltip);
            }

            const showTooltip = (e) => {
                const rect = slider.getBoundingClientRect();
                const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const value = Math.round(+slider.min + percent * (+slider.max - +slider.min));

                tooltip.textContent = `${value} minute${value === 1 ? '' : 's'}`;

                const thumbX = rect.left + percent * rect.width;
                tooltip.style.left = `${thumbX - tooltip.offsetWidth / 2}px`;
                tooltip.style.top = `${rect.top - 34}px`;
                tooltip.style.opacity = '1';
                tooltip.style.transform = 'translateY(-4px)';
            };

            const hideTooltip = () => {
                tooltip.style.opacity = '0';
                tooltip.style.transform = 'translateY(0)';
            };

            slider.addEventListener('mousemove', showTooltip);
            slider.addEventListener('input', showTooltip);  // update while dragging
            slider.addEventListener('mouseleave', hideTooltip);
            slider.addEventListener('touchmove', (e) => {
                if (e.touches.length) showTooltip(e.touches[0]);
            });
        }

        // Friendly name editing
        this.panel.querySelectorAll('.friendly-name').forEach(cell => {
            if (cell.dataset.editable === 'true') return;
            cell.dataset.editable = 'true';
            cell.style.cursor = 'pointer';
            cell.title = 'Click to edit friendly name (blank to reset to username)';

            cell.addEventListener('click', () => {
                if (cell.querySelector('input')) return;

                const username = cell.dataset.username;
                const currentDisplay = cell.textContent.trim();

                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentDisplay;
                input.style.cssText = 'width:100%; box-sizing:border-box; padding:2px 4px; font-size:inherit;';
                cell.innerHTML = '';
                cell.appendChild(input);
                input.focus();
                input.select();

                const save = () => {
                    const newName = input.value.trim();
                    const customer = this.controller.customers.find(c => c.radiusUsername === username);
                    if (customer) {
                        customer.friendlyName = newName || null;
                        cell.textContent = customer.friendlyName || customer.radiusUsername;
                    }
                };

                input.addEventListener('blur', save);
                input.addEventListener('keydown', e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        save();
                    } else if (e.key === 'Escape') {
                        cell.textContent = currentDisplay;
                    }
                });
            });
        });
    
    }
    */
