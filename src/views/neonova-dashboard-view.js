class NeonovaDashboardView {
    constructor(controller) {
        this.controller = controller;
        this.panel = null;
        this.minimizeBar = null;
        this.createElements();
    }

    createElements() {
        // Tailwind (one-time)
        if (!document.getElementById('tailwind-css')) {
            const s = document.createElement('script');
            s.id = 'tailwind-css';
            s.src = 'https://cdn.tailwindcss.com';
            document.head.appendChild(s);
        }

        // ────── MINIMIZED BAR (slim header at bottom) ──────
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
            <button class="ml-auto px-6 py-2 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 rounded-2xl flex items-center gap-2 transition">
                <i class="fas fa-chevron-up"></i> Maximize
            </button>
        `;
        this.minimizeBar.addEventListener('click', () => this.toggleMinimize());
        document.body.appendChild(this.minimizeBar);

        // ────── MAIN PANEL ──────
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
        // Start minimized
        this.minimizeBar.style.display = 'flex';
        this.panel.style.display = 'none';
        this.render();
    }

    render() {
        let rows = '';
        this.controller.customers.forEach(c => {
            const isConnected = c.status === 'Connected';
            const statusColor = isConnected ? '#006400' : '#c00';  // green for Connected, red for Not Connected
            const durationColor = isConnected ? '#006400' : '#c00';  // red for offline durations
    
            const durationText = c.getDurationStr();
    
            rows += `
                <tr class="hover:bg-zinc-800 transition group">
                    <td class="friendly-name px-8 py-5 font-medium text-zinc-100" 
                        data-username="${c.radiusUsername}" data-editable="false">
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
    
                this.panel.innerHTML = `
                    <!-- HEADER -->
                    <div class="flex items-center justify-between px-8 py-5 border-b border-zinc-800 bg-zinc-900">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-emerald-500 rounded-2xl flex items-center justify-center text-black font-bold text-xl">N</div>
                            <h1 class="text-2xl font-semibold" style="text-shadow: 0 0 15px #22ff88;">Neonova</h1>
                            <span class="text-emerald-400 text-sm font-mono tracking-widest">DASHBOARD</span>
                    </div>
                        <button class="minimize-btn px-6 py-2.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-black rounded-2xl flex items-center gap-2 transition">
                            <i class="fas fa-minus"></i> Minimize
                        </button>
                    </div>
        
                    <!-- MAIN CONTENT -->
                    <div class="p-8">
        
                        <!-- ADD BAR -->
                        <div class="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 mb-8">
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
        
                        <!-- TABLE -->
                        <div class="bg-zinc-900 border border-zinc-700 rounded-3xl overflow-hidden">
                            <table class="w-full">
                                <thead>
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
        
                        <!-- BOTTOM BAR -->
                        <div class="mt-8 flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-3xl px-8 py-5">
                            <div class="flex items-center gap-8">
                                <!-- Slider -->
                                <div class="flex items-center gap-4">
                                    <span class="text-xs uppercase tracking-widest text-zinc-500">Polling</span>
                                    <input type="range" id="polling-interval-slider" min="1" max="60" value="${this.controller.pollingIntervalMinutes}" class="w-64 accent-emerald-500">
                                    <span id="interval-value" class="font-mono text-emerald-400 w-12">${this.controller.pollingIntervalMinutes} min</span>
                                </div>
        
                                <!-- Pause button -->
                                <button id="poll-toggle-btn" 
                                        class="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-2xl flex items-center gap-2 transition">
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
                `;

        // === Polling interval slider + live tooltip ===
        const slider = this.panel.querySelector('#polling-interval-slider');
        const display = this.panel.querySelector('#interval-value');

        if (slider && display) {
            // Existing listener (keep this)
            slider.addEventListener('input', () => {
                const minutes = parseInt(slider.value);
                display.textContent = minutes;
                this.controller.setPollingInterval(minutes);
            });

            // ────── Tooltip setup ──────
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

                // Position tooltip above the thumb
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
            slider.addEventListener('input', showTooltip);   // also update while dragging
            slider.addEventListener('mouseleave', hideTooltip);
            slider.addEventListener('touchmove', (e) => {    // optional mobile support
                if (e.touches.length) showTooltip(e.touches[0]);
            });
        }

        // === Event listeners ===
        // Poll toggle button
        const pollBtn = this.panel.querySelector('#poll-toggle-btn');
        if (pollBtn) {
            pollBtn.addEventListener('click', () => {
                console.log('Poll button clicked – current paused:', this.controller.isPollingPaused);
                
                this.controller.togglePolling();   // ← just toggle, no if/else needed
                
                console.log('After toggle – now paused:', this.controller.isPollingPaused);
                this.render();                     // forces fresh button text
            });
        }
        
        this.panel.querySelector('.add-btn').addEventListener('click', () => {
            const id = this.panel.querySelector('#radiusId').value.trim();
            const name = this.panel.querySelector('#friendlyName').value.trim();
            if (id) {
                this.controller.add(id, name);
                this.panel.querySelector('#radiusId').value = '';
                this.panel.querySelector('#friendlyName').value = '';
            } else {
                alert('RADIUS username required');
            }
        });
    
        this.panel.querySelector('.minimize-btn').addEventListener('click', () => {
            this.toggleMinimize();
        });
    
        this.panel.querySelector('.refresh-btn').addEventListener('click', () => {
            this.controller.poll();
        });
    
        // Remove buttons
        this.panel.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const username = btn.dataset.username;
                this.controller.remove(username);
            });
        });
    
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
                input.style.width = '100%';
                input.style.boxSizing = 'border-box';
                input.style.padding = '2px 4px';
                input.style.fontSize = 'inherit';
    
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
    
        // Report buttons - modal for order, then progress modal
        this.panel.querySelectorAll('.report-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const username = btn.dataset.username;
                const customer = this.controller.customers.find(c => c.radiusUsername === username);
                if (!customer) return;

                const friendlyName = customer.friendlyName || username;
    
                // Create overlay for order modal
                const overlay = document.createElement('div');
                overlay.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.5); z-index: 10000; display: flex;
                    align-items: center; justify-content: center;
                `;
                document.body.appendChild(overlay);
    
                // Create order modal
                const modal = document.createElement('div');
                modal.style.cssText = `
                    background: white; padding: 20px; border-radius: 8px;
                    width: 600px; max-height: 80vh; overflow-y: auto;
                    position: relative;
                `;
                overlay.appendChild(modal);
    
                // Close button for order
                const closeBtn = document.createElement('button');
                closeBtn.textContent = 'Close';
                closeBtn.style.cssText = `position: absolute; top: 10px; right: 10px;`;
                closeBtn.addEventListener('click', () => overlay.remove());
                modal.appendChild(closeBtn);
    
                // Container for order view
                const container = document.createElement('div');
                modal.appendChild(container);
    
                // Instantiate order view
                const orderView = new NeonovaReportOrderView(container, username, friendlyName);
                orderView.renderOrderForm();
    
                // Set callback for generate request
                orderView.onGenerateRequested = (startIso, endIso) => {
                    // Close order modal
                    overlay.remove();
    
                    // Create progress overlay
                    const progressOverlay = document.createElement('div');
                    progressOverlay.style.cssText = `
                        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                        background: rgba(0,0,0,0.5); z-index: 10001; display: flex;
                        align-items: center; justify-content: center;
                    `;
                    document.body.appendChild(progressOverlay);
    
                    // Create progress modal
                    const progressModal = document.createElement('div');
                    progressModal.style.cssText = `
                        background: white; padding: 20px; border-radius: 8px;
                        width: 400px; position: relative;
                    `;
                    progressOverlay.appendChild(progressModal);
    
                    // Close button for progress (optional, since auto-closes on complete)
                    const progressCloseBtn = document.createElement('button');
                    progressCloseBtn.textContent = 'Cancel';
                    progressCloseBtn.style.cssText = `position: absolute; top: 10px; right: 10px;`;
                    progressCloseBtn.addEventListener('click', () => progressOverlay.remove());
                    progressModal.appendChild(progressCloseBtn);
    
                    // Container for progress view
                    const progressContainer = document.createElement('div');
                    progressModal.appendChild(progressContainer);
    
                    // Instantiate progress view
                    const progressView = new NeonovaProgressView(progressContainer);
                    progressView.render();
    
                    // Call controller to generate report data
                    this.controller.generateReportData(
                        username,
                        friendlyName,
                        new Date(startIso),
                        new Date(endIso),
                        (entries, page) => {
                            const percent = Math.min(100, (page / 50) * 100); // Assuming max 50 pages
                            progressView.updateProgress(percent, `Fetched ${entries} entries (page ${page})`);
                        }
                    ).then(data => {
                        // Close progress modal
                        progressOverlay.remove();
    
                        // Generate report HTML
                        const reportView = new NeonovaReportView(data.username, data.friendlyName, data.metrics, data.entries.length, data.metrics.longDisconnects);
                        const reportHTML = reportView.generateReportHTML('');
    
                        // Open in new tab
                        const newTab = window.open('', '_blank');
                        newTab.document.write(reportHTML);
                        newTab.document.close();
                    }).catch(error => {
                        progressView.showError(error.message);
                        // Keep modal open for user to see error and close manually
                    });
                };
            });
        });
    }
    
    update() {
        this.render();
    }

    toggleMinimize() {
        this.controller.minimized = !this.controller.minimized;

        const dash = this.panel;
        const minBar = this.minimizeBar;

        if (this.controller.minimized) {
            // Slide down
            dash.style.transition = 'transform 0.45s cubic-bezier(0.4, 0.0, 0.2, 1)';
            dash.style.transform = 'translate(-50%, 85%)';
            setTimeout(() => {
                dash.style.display = 'none';
                minBar.style.display = 'flex';
            }, 420);
        } else {
            // Slide up
            minBar.style.display = 'none';
            dash.style.display = 'block';
            setTimeout(() => {
                dash.style.transform = 'translateX(-50%)';
            }, 10);
        }
    }

    show() {
        this.panel.style.display = 'block';
        this.panel.style.transform = 'translateX(-50%)';
        this.minimizeBar.style.display = 'none';
    }

    hide() {
        this.panel.style.display = 'none';
        this.minimizeBar.style.display = 'none';
    }
    
    toggle() {
        if (this.panel) {
            const isVisible = this.panel.style.display !== 'none';
            if (isVisible) {
                this.panel.style.display = 'none';
                this.minimizeBar.style.display = 'block';
            } else {
                this.panel.style.display = 'block';
                this.minimizeBar.style.display = 'none';
            }
        }
    }
}
