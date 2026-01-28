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
            const isConnected = c.status === 'Connected';
            const statusColor = isConnected ? '#006400' : '#c00';  // green for Connected, red for Not Connected
            const durationColor = isConnected ? '#006400' : '#c00';  // red for offline durations
    
            const durationText = c.getDurationStr();
    
            rows += `
                <tr>
                    <td class="friendly-name" data-username="${c.radiusUsername}" style="cursor: pointer;">
                        ${c.friendlyName || c.radiusUsername}
                    </td>
                    <td>${c.radiusUsername}</td>
                    <td style="color:${statusColor}; font-weight:bold;">${c.status}</td>
                    <td style="color:${durationColor};">${durationText}</td>
                    <td>
                        <button class="report-btn" data-username="${c.radiusUsername}">
                            Generate Report
                        </button>
                    </td>
                    <td>
                        <button class="remove-btn" data-username="${c.radiusUsername}">Remove</button>
                    </td>
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
                <button id="poll-toggle-btn" style="padding:6px 12px; margin-left:10px; background: ${this.controller.isPollingPaused ? '#c00' : '#060'}; color: white;">
                    ${this.controller.isPollingPaused ? 'Resume Polling' : 'Pause Polling'}
                </button>
            </div>
        `;
    
        // === Event listeners ===
    
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
    
        this.panel.querySelectorAll('.report-btn').forEach(btn => {
            btn.addEventListener('click', () => {
            const username = btn.dataset.username;
            const customer = this.controller.customers.find(c => c.radiusUsername === username);
            if (!customer) return;
    
            const reportTab = window.open('', '_blank');
            if (!reportTab) return alert('Popup blocked');
    
            const view = new NeonovaReportOrderView(reportTab.document.body, username, customer.friendlyName);
            const controller = new NeonovaReportOrderController(username, customer.friendlyName, view);  // pass view
            controller.start();
    
            // Optional: loading message
            reportTab.document.body.innerHTML = '<h1>Loading...</h1>';
            });
        });
        
        this.panel.querySelector('#poll-toggle-btn').addEventListener('click', () => {
        this.controller.togglePolling();
        const btn = this.panel.querySelector('#poll-toggle-btn');
        btn.textContent = this.controller.isPollingPaused ? 'Resume Polling' : 'Pause Polling';
        btn.style.backgroundColor = this.controller.isPollingPaused ? '#c00' : '#060';
        });
    }

    updatePollingButton() {
        const btn = this.panel.querySelector('#poll-toggle-btn');
        if (btn) {
            btn.textContent = this.controller.isPollingPaused ? 'Resume Polling' : 'Pause Polling';
            btn.style.backgroundColor = this.controller.isPollingPaused ? '#c00' : '#060';
        }
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
