class NeonovaDashboardView {
    constructor(controller) {
        this.controller = controller;
        this.panel = null;
        this.minimizeBar = null;
        this.createUI();
    }

    createUI() {
        // Persistent minimize bar (bottom of MAIN frame)
        this.minimizeBar = document.createElement('div');
        this.minimizeBar.style.cssText = `
          position: fixed; bottom: 0; left: 50%; transform: translateX(-50%);
          background: #333; color: white; padding: 8px 16px; border-radius: 8px 8px 0 0;
          cursor: pointer; z-index: 9999; font-family: Arial; display: none;
        `;
        this.minimizeBar.innerHTML = 'Dashboard (click to restore)';
        this.minimizeBar.onclick = () => this.controller.togglePanel();
        document.body.appendChild(this.minimizeBar);

        // Floating panel
        this.panel = document.createElement('div');
        this.panel.style.cssText = `
          position: fixed; bottom: 50px; left: 50%; transform: translateX(-50%);
          width: 800px; max-height: 60vh; background: #fff; border: 1px solid #ccc;
          overflow-y: auto; z-index: 9998; padding: 15px; box-shadow: 0 0 20px rgba(0,0,0,0.5);
          font-family: Arial; display: none;
        `;
        document.body.appendChild(this.panel);

        this.render();
    }

    render() {
        let rows = '';
        this.controller.customers.forEach(c => {
            const color = c.status === 'Connected' ? 'green' : c.status === 'Not Connected' ? 'red' : 'gray';
            rows += `
              <tr>
                <td>${c.friendlyName}</td>
                <td>${c.radiusUsername}</td>
                <td style="color:${color};">${c.status}</td>
                <td>${c.getDurationStr()}</td>
                <td><button onclick="dashboardController.removeCustomer('${c.radiusUsername}')">Remove</button></td>
              </tr>
            `;
        });

        this.panel.innerHTML = `
          <h3 style="margin-top:0;">Dashboard</h3>
          <div style="margin-bottom:15px;">
            <input id="radiusId" placeholder="RADIUS Username" style="width:200px; margin-right:8px;">
            <input id="friendlyName" placeholder="Friendly Name" style="width:200px; margin-right:8px;">
            <button onclick="dashboardController.addCustomer(document.getElementById('radiusId').value, document.getElementById('friendlyName').value)">Add</button>
          </div>

          <table style="width:100%; border-collapse:collapse;">
            <thead style="background:#eee;">
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

          <button onclick="dashboardController.togglePanel()" style="margin-top:15px;">Close</button>
        `;
    }

    update() {
        if (this.panel) this.render();
    }

    updateMinimize() {
        if (this.minimizeBar) {
            this.minimizeBar.style.display = this.controller.minimized ? 'block' : 'none';
        }
    }

    updateVisibility() {
        if (this.panel) {
            this.panel.style.display = this.controller.panelVisible ? 'block' : 'none';
        }
        this.updateMinimize();
    }
}
