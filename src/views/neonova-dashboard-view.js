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
                    <td class="friendly-name" data-username="${c.radiusUsername}" data-editable="false">${c.friendlyName || c.radiusUsername}</td>
                    <td>${c.radiusUsername}</td>
                    <td style="color:${statusColor};">${c.status}</td>
                    <td style="color:${durationColor};">${durationText}</td>
                    <td>
                        <button class="remove-btn" data-username="${c.radiusUsername}">Remove</button>
                        <button class="report-btn" data-username="${c.radiusUsername}">Generate Report</button>
                    </td>
                </tr>
            `;
        });
    
        this.panel.innerHTML = `
            <h3>Dashboard</h3>
            <button class="close-btn">Close</button>
            <button class="minimize-btn">${this.controller.minimized ? 'Restore' : 'Minimize'}</button>
            <span>Last update: ${new Date().toLocaleTimeString()}</span>
            <div>
                <input id="radiusId" type="text" placeholder="RADIUS Username">
                <input id="friendlyName" type="text" placeholder="Friendly Name (optional)">
                <button class="add-btn">Add</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Friendly Name</th>
                        <th>RADIUS Username</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <button class="refresh-btn">Refresh Now</button>
            <button id="poll-toggle-btn">${this.controller.isPollingPaused ? 'Resume Polling' : 'Pause Polling'}</button>
                        <div style="margin: 12px 0; padding: 8px; background: #f8f8f8; border-radius: 6px;">
                <label style="font-size: 14px;">
                    Polling interval: 
                    <span id="interval-value">${this.controller.pollingIntervalMinutes}</span> minutes
                </label><br>
                <input type="range" id="polling-interval-slider" 
                       min="1" max="60" value="${this.controller.pollingIntervalMinutes}"
                       style="width: 100%; accent-color: #006400;">
            </div>
        `;
    
        // === Event listeners ===

        //Poll interval slider
        const slider = this.panel.querySelector('#polling-interval-slider');
        const display = this.panel.querySelector('#interval-value');
        if (slider && display) {
            slider.addEventListener('input', () => {
                const minutes = parseInt(slider.value);
                display.textContent = minutes;
                this.controller.setPollingInterval(minutes);
            });
        }
        
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
            this.panel.innerHTML = '<div style="text-align:center;">▼</div>';
        } else {
            this.render();  // re-render full panel
        }
    }
    
    show() {
        if (this.panel) {
            this.panel.style.display = 'block';
        }
        this.updateMinimize();
    }

    hide() {
        if (this.panel) {
            this.panel.style.display = 'none';
        }
        this.updateMinimize();
    }
}
