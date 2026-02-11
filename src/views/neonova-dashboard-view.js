class NeonovaDashboardView extends BaseNeonovaView{
    constructor(controller) {
        super();
        this.controller = controller;
        this.isMinimized = true;
        this.createElements();
    }

    createElements() {
        // Minimized bar – matches dashboard width exactly
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
            padding: 12px 32px;                /* same horizontal padding as dashboard content */
            border-radius: 24px 24px 0 0;      /* match dashboard's big radius */
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

        this.panel = document.createElement('div');
        this.panel.style.cssText = `
        position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
        width: 92%; max-width: 1100px; height: calc(100vh - 80px);
        background: #09090b; border: 1px solid #27272a;
        border-radius: 24px; box-shadow: 0 8px 40px rgba(0,0,0,0.8);
        padding: 0; font-family: system-ui; z-index: 9999; display: none;
        overflow: hidden;  /* important for internal scrolling */
        `;
        document.body.appendChild(this.panel);

        this.minimizeBar.style.display = 'flex';
        this.panel.style.display = 'none';
        this.render();
    }

    render() {
        if (!this.panel) {
            console.warn('Panel not ready yet');
            return
        }
        
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
            
                    <!-- HEADER (fixed) -->
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
            
                    <!-- SCROLLABLE CONTENT AREA -->
                    <div class="flex-1 overflow-hidden flex flex-col">
                        <!-- Add bar (fixed at top of scroll area) -->
                        <div class="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 mx-8 mt-8 mb-8 shrink-0">
                            <div class="grid grid-cols-12 gap-4">
                                <div class="col-span-5"><input id="radiusId" type="text" placeholder="RADIUS Username" class="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-emerald-500"></div>
                                <div class="col-span-5"><input id="friendlyName" type="text" placeholder="Friendly Name (optional)" class="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-emerald-500"></div>
                                <div class="col-span-2"><button class="add-btn w-full h-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-2xl transition">ADD</button></div>
                            </div>
                        </div>
            
                        <!-- SCROLLABLE TABLE -->
                        <div class="flex-1 overflow-y-auto px-8 pb-8">
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
            
                        <!-- BOTTOM BAR (fixed at bottom) -->
                        <div class="bg-zinc-900 border border-zinc-700 rounded-3xl px-8 py-5 mx-8 mb-8 shrink-0">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-8">
                                    <div class="flex items-center gap-4">
                                        <span class="text-xs uppercase tracking-widest text-zinc-500">Polling</span>
                                        <input type="range" id="polling-interval-slider" min="1" max="60" value="${this.controller.pollingIntervalMinutes}" class="w-64 accent-emerald-500">
                                        <span id="interval-value" class="font-mono text-emerald-400 w-12">${this.controller.pollingIntervalMinutes} min</span>
                                    </div>
                                    <button id="poll-toggle-btn" class="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-2xl flex items-center gap-2 transition">
                                        ${this.controller.isPollingPaused ? '<i class="fas fa-play"></i> Resume Polling' : '<i class="fas fa-pause"></i> Pause Polling'}
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
                </div>
            `;

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

        // Global delegation
        document.body.addEventListener('click', this.handleGlobalClick.bind(this), true);

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

    handleGlobalClick(e) {
        const btn = e.target.closest('button');
        if (!btn) return;

        // Ignore clicks on the minimized bar itself (prevents loop)
        if (e.target.closest('#minimize-bar') || this.minimizeBar.contains(e.target)) {
        return;
    }

    console.log('Button clicked:', btn.className);

        // Friendly name editing (on click of .friendly-name cell)
        if (e.target.classList.contains('friendly-name')) {
            const cell = e.target;
            if (cell.dataset.editable === 'true') return; // already set up
        
            cell.dataset.editable = 'true';
            cell.style.cursor = 'pointer';
            cell.title = 'Click to edit friendly name (blank to reset)';
        
            // We don't need to add the listener again — just run the editing logic here
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
        }

        console.log('Button clicked →', btn.className);

        if (btn.classList.contains('remove-btn')) {
            const username = btn.dataset.username;
            console.log('REMOVE clicked - username =', username);   // ← add this line
            if (username) this.controller.remove(username);
        }
        
        if (btn.classList.contains('report-btn') || btn.className.includes('report-btn')) {
            const username = btn.dataset.username;
            if (!username) return;
            const customer = this.controller.customers.find(c => c.radiusUsername === username);
            if (customer) this.openReportModal(username, customer.friendlyName || username);
        }

        if (btn.classList.contains('add-btn')) {
            const idInput = this.panel.querySelector('#radiusId');
            const nameInput = this.panel.querySelector('#friendlyName');
        
            if (!idInput) return;
        
            // Give autofill 100 ms to finish committing the value
            setTimeout(() => {
                const rawValue = idInput.value || '';
                const cleanedId = rawValue.trim().replace(/\s+/g, '').replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '');
        
                console.log('ADD attempt - Raw:', JSON.stringify(rawValue));
                console.log('ADD attempt - Cleaned:', JSON.stringify(cleanedId));
        
                if (cleanedId.length > 0) {
                    const name = nameInput ? nameInput.value.trim() : '';
                    console.log('Adding:', cleanedId, name);
                    this.controller.add(cleanedId, name);
                    idInput.value = '';
                    if (nameInput) nameInput.value = '';
                    idInput.focus();
                } 
            }, 100);  // 100 ms is usually enough for autofill to settle
        }
        if (btn.classList.contains('refresh-btn')) this.controller.poll();
        if (btn.classList.contains('minimize-btn')) this.toggleMinimize();
        if (btn.id === 'poll-toggle-btn') {
            this.controller.togglePolling();
            this.render();
        }
    }

    openReportModal(username, friendlyName) {
        console.log('openReportModal started for', username);

        const overlay = document.createElement('div');
        overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;`;
        document.body.appendChild(overlay);

        const modal = document.createElement('div');
        modal.style.cssText = `background:white;padding:20px;border-radius:8px;width:600px;max-height:80vh;overflow-y:auto;position:relative;`;
        overlay.appendChild(modal);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `position:absolute;top:10px;right:10px;`;
        closeBtn.addEventListener('click', () => overlay.remove());
        modal.appendChild(closeBtn);

        const container = document.createElement('div');
        modal.appendChild(container);

        const orderView = new NeonovaReportOrderView(container, username, friendlyName);
        orderView.renderOrderForm();

        orderView.onGenerateRequested = (startIso, endIso) => {
            overlay.remove();
            // ... rest of your original onGenerateRequested code exactly as before ...
            const progressOverlay = document.createElement('div');
            progressOverlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center;`;
            document.body.appendChild(progressOverlay);

            const progressModal = document.createElement('div');
            progressModal.style.cssText = `background:white;padding:20px;border-radius:8px;width:400px;position:relative;`;
            progressOverlay.appendChild(progressModal);

            const progressCloseBtn = document.createElement('button');
            progressCloseBtn.textContent = 'Cancel';
            progressCloseBtn.style.cssText = `position:absolute;top:10px;right:10px;`;
            progressCloseBtn.addEventListener('click', () => progressOverlay.remove());
            progressModal.appendChild(progressCloseBtn);

            const progressContainer = document.createElement('div');
            progressModal.appendChild(progressContainer);

            const progressView = new NeonovaProgressView(progressContainer);
            progressView.render();

            this.controller.generateReportData(
                username,
                friendlyName,
                new Date(startIso),
                new Date(endIso),
                (entries, page) => {
                    const percent = Math.min(100, (page / 50) * 100);
                    progressView.updateProgress(percent, `Fetched ${entries} entries (page ${page})`);
                }
            ).then(data => {
                progressOverlay.remove();
                const reportView = new NeonovaReportView(data.username, data.friendlyName, data.metrics, data.entries.length, data.metrics.longDisconnects);
                const reportHTML = reportView.generateReportHTML('');
                const newTab = window.open('', '_blank');
                newTab.document.write(reportHTML);
                newTab.document.close();
            }).catch(error => {
                progressView.showError(error.message);
            });
        };

        console.log('openReportModal finished creating modal');
    }

    toggleMinimize() {
        console.log('toggleMinimize called - was minimized:', this.isMinimized);
        this.isMinimized = !this.isMinimized;
        const dash = this.panel;
        const bar = this.minimizeBar;

        if (this.isMinimized) {
            dash.style.transition = 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)';
            dash.style.transform = 'translate(-50%, 85%)';
            setTimeout(() => { dash.style.display = 'none'; bar.style.display = 'flex'; }, 420);
        } else {
            bar.style.display = 'none';
            dash.style.display = 'block';
            setTimeout(() => { dash.style.transform = 'translateX(-50%)'; }, 10);
        }
    }

    update() { this.render(); }
}
