class NeonovaDashboardView {
    constructor(controller) {
        this.controller = controller;
        this.panel = null;
        this.minimizeBar = null;
        this.createElements();
    }

    createElements() {
        // Minimize bar (shown when minimized)
        this.minimizeBar = document.createElement('div');
        this.minimizeBar.style.cssText = `
            position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
            background: #444; color: white; padding: 6px 12px; border-radius: 6px 6px 0 0;
            cursor: pointer; z-index: 9999; font-family: Arial; display: none;
        `;
        this.minimizeBar.textContent = 'Dashboard (click to show)';
        this.minimizeBar.addEventListener('click', () => this.controller.togglePanel());
        document.body.appendChild(this.minimizeBar);
        
        // Main panel
        this.panel = document.createElement('div');
        this.panel.style.cssText = `
            position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%);
            width: 90%; max-width: 900px; max-height: 50vh; overflow-y: auto;
            background: #fff; border: 1px solid #999; border-bottom: none;
            border-radius: 8px 8px 0 0; box-shadow: 0 -4px 12px rgba(0,0,0,0.3);
            padding: 12px; font-family: Arial; z-index: 9998; display: none;
            `;
        document.body.appendChild(this.panel);
        
        this.render();
    }

    render() {
        let rows = '';
        this.controller.customers.forEach(c => {
            const color = c.status === 'Connected' ? '#006400' : c.status === 'Not Connected' ? '#c00' : '#666';
            const durationStyle = (c.status === 'Not Connected' && c.durationSec > 1800) ? 'color:red;' : '';
            rows += `
                <tr>
                    <td class="friendly-name" data-username="${c.radiusUsername}" style="cursor: pointer;">
                        ${c.friendlyName || c.radiusUsername}
                    </td>
                    <td>${c.radiusUsername}</td>
                    <td style="color:${color}; font-weight:bold;">${c.status}</td>
                    <td style="${durationStyle}">${c.getDurationStr()}</td>
                    <td>
                        <button class="report-btn" data-username="${c.radiusUsername}">
                            Generate Report
                        </button>
                    </td>
                    <td><button class="remove-btn" data-username="${c.radiusUsername}">Remove</button></td>
                </tr>
            `;
        });
        
        this.panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h3 style="margin:0;">Dashboard</h3>
            <button class="minimize-btn" style="padding:4px 8px; font-size:14px;">
            ${this.controller.minimized ? 'Restore' : 'Minimize'}
            </button>
            </div>
            
            <div id="pollStatus" style="color:#888; font-size:12px; margin-bottom:10px;">
            Last update: ${new Date().toLocaleTimeString()}
            </div>
            
            <div style="margin-bottom:12px;">
            <input id="radiusId" placeholder="RADIUS Username" style="width:220px; padding:6px; margin-right:6px;">
            <input id="friendlyName" placeholder="Friendly Name" style="width:220px; padding:6px; margin-right:6px;">
            <button class="add-btn">Add</button>
            </div>
            
            <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <thead style="background:#eee;">
            <tr>
            <th style="padding:8px;">Friendly Name</th>
            <th style="padding:8px;">RADIUS Username</th>
            <th style="padding:8px;">Status</th>
            <th style="padding:8px;">Duration</th>
            <th style="padding:8px;">Action</th>
            </tr>
            </thead>
            <tbody>${rows}</tbody>
            </table>
            
            <div style="margin-top:12px; text-align:center;">
            <button class="close-btn" style="padding:6px 12px;">Close</button>
            <button class="refresh-btn" style="padding:6px 12px; margin-left:10px;">Refresh Now</button>
            </div>
        `;
        
        // Wire up buttons with event listeners (no globals needed)
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
        
        this.panel.querySelector('.close-btn').addEventListener('click', () => {
            this.controller.togglePanel();
        });
        
        this.panel.querySelector('.minimize-btn').addEventListener('click', () => {
            this.controller.toggleMinimize();
        });
        
        this.panel.querySelector('.refresh-btn').addEventListener('click', () => {
            this.controller.poll();
        });
        
        // Remove buttons (dynamic)
        this.panel.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', () => {
            const username = btn.dataset.username;
            this.controller.remove(username);
            });
        });
        
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
                        console.log(`Friendly name updated for ${username}: ${customer.friendlyName || '(default)'}`);
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

        // Report generation button
        this.panel.querySelectorAll('.report-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const username = btn.dataset.username;
                const customer = this.controller.customers.find(c => c.radiusUsername === username);
                if (!customer) return;
        
                // Open new tab with report interface
                const reportTab = window.open('', '_blank');
                if (!reportTab) {
                    alert('Popup blocked. Please allow popups for this site.');
                    return;
                }
        
                // Build simple report UI in the new tab
                reportTab.document.write(`
                    <html>
                    <head>
                        <title>Report for ${customer.friendlyName || username}</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: auto; }
                            h1 { margin-bottom: 10px; }
                            .form-group { margin: 15px 0; }
                            select, button { padding: 8px 12px; font-size: 16px; }
                            #progress { margin-top: 20px; height: 20px; background: #eee; display: none; }
                            #progress-bar { height: 100%; width: 0%; background: #4CAF50; transition: width 0.3s; }
                            #status { margin-top: 10px; font-weight: bold; }
                        </style>
                    </head>
                    <body>
                        <h1>Report for ${customer.friendlyName || username} (${username})</h1>
        
                        <div class="form-group">
                            <label>Month:</label>
                            <select id="month">
                                ${Array.from({length: 12}, (_, i) => {
                                    const m = (i + 1).toString().padStart(2, '0');
                                    const selected = m === new Date().toISOString().slice(5,7) ? 'selected' : '';
                                    return `<option value="${m}" ${selected}>${new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}</option>`;
                                }).join('')}
                            </select>
                        </div>
        
                        <div class="form-group">
                            <label>Day:</label>
                            <select id="day">
                                ${Array.from({length: 31}, (_, i) => {
                                    const d = (i + 1).toString().padStart(2, '0');
                                    const selected = d === new Date().toISOString().slice(8,10) ? 'selected' : '';
                                    return `<option value="${d}" ${selected}>${d}</option>`;
                                }).join('')}
                            </select>
                        </div>
        
                        <button id="generate">Generate Report</button>
        
                        <div id="progress"><div id="progress-bar"></div></div>
                        <div id="status"></div>
        
                        <script>
                            const generateBtn = document.getElementById('generate');
                            const progressBar = document.getElementById('progress-bar');
                            const statusDiv = document.getElementById('status');
                            const progressDiv = document.getElementById('progress');
        
                            generateBtn.addEventListener('click', () => {
                                const month = document.getElementById('month').value;
                                const day = document.getElementById('day').value;
        
                                statusDiv.textContent = 'Starting report generation...';
                                progressDiv.style.display = 'block';
                                progressBar.style.width = '0%';
        
                                // Simulate progress (real progress would come from background script)
                                let pct = 0;
                                const interval = setInterval(() => {
                                    pct += Math.random() * 15;
                                    if (pct > 100) pct = 100;
                                    progressBar.style.width = pct + '%';
                                    if (pct === 100) {
                                        clearInterval(interval);
                                        statusDiv.textContent = 'Report ready! Opening...';
                                        // In real version, open the actual report here
                                        setTimeout(() => {
                                            window.open('about:blank', '_self'); // placeholder
                                        }, 1000);
                                    }
                                }, 300);
                            });
                        </script>
                    </body>
                    </html>
                `);
                reportTab.document.close();
        
                // Real implementation would be more involved:
                // - Send message to background script
                // - Background script runs headless pagination for the date range
                // - Builds HTML report
                // - Opens/sends it back to tab
            });
        });
        
    }

    update() {
        this.render();
    }

    toggleMinimize() {
        this.controller.toggleMinimize();
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

    updateMinimize() {
        if (this.controller.minimized) {
        this.panel.style.width = '50px';
        this.panel.style.height = '30px';
        this.panel.innerHTML = '<div style="cursor:pointer; text-align:center;">▼</div>';
        } else {
            this.render();  // re-render full panel
        }
    }
    
    show() {
        console.log('view.show() called - panel exists?', !!this.panel);
        if (this.panel) {
            console.log('Setting display to block');
            this.panel.style.display = 'block';
            console.log('Panel display now:', this.panel.style.display);
        } else {
            console.log('Panel not created yet');
        }
        this.updateMinimize();
    }

    hide() {
        console.log('view.hide() called - panel exists?', !!this.panel);
        if (this.panel) {
            console.log('Setting display to none');
            this.panel.style.display = 'none';
            console.log('Panel display now:', this.panel.style.display);
        }
        this.updateMinimize();
    }
}
