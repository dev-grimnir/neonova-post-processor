class NeonovaDashboardView {
    constructor(controller) {
        console.log('View constructor called - controller passed:', !!controller);
        this.controller = controller;
        this.panel = null;
        this.minimizeBar = null;
        this.createElements();
        console.log('View constructor finished - panel created?', !!this.panel);
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
        this.minimizeBar.onclick = () => this.controller.togglePanel();
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
            rows += `
                <tr>
                    <td>${c.friendlyName}</td>
                    <td>${c.radiusUsername}</td>
                    <td style="color:${color}; font-weight:bold;">${c.status}</td>
                    <td>${c.getDurationStr()}</td>
                    <td><button onclick="dashboardController.removeCustomer('${c.radiusUsername}')">Remove</button></td>
                </tr>
            `;
        });

        this.panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="margin:0;">Dashboard</h3>
                <button onclick="dashboardController.toggleMinimize()" style="padding:4px 8px; font-size:14px;">
                    ${this.controller.minimized ? 'Restore' : 'Minimize'}
                </button>
            </div>

            <div style="margin-bottom:12px;">
                <input id="radiusId" placeholder="RADIUS Username" style="width:220px; padding:6px; margin-right:6px;">
                <input id="friendlyName" placeholder="Friendly Name" style="width:220px; padding:6px; margin-right:6px;">
                <button onclick="dashboardController.addCustomer(document.getElementById('radiusId').value, document.getElementById('friendlyName').value)">Add</button>
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
                <button onclick="dashboardController.togglePanel()" style="padding:6px 12px;">Close</button>
            </div>
        `;
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

    show() {
        if (this.panel) this.panel.style.display = 'block';
        if (this.minimizeBar) this.minimizeBar.style.display = 'none';
    }

    hide() {
        if (this.panel) this.panel.style.display = 'none';
        if (this.minimizeBar) this.minimizeBar.style.display = 'block';
    }
}
