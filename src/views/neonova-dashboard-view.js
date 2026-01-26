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
        //const color = isConnected ? '#006400' : c.status === 'Offline' ? '#c00' : '#666';
        const color = c.status === 'Connected' ? '#006400' : '#c00';  // green for Connected, red for everything else
        const durationText = c.getDurationStr();
        const durationColor = isConnected ? '#006400' : '#c00';

        rows += `
            <tr>
                <td class="friendly-name" data-username="${c.radiusUsername}" style="cursor: pointer;">
                    ${c.friendlyName || c.radiusUsername}
                </td>
                <td>${c.radiusUsername}</td>
                //<td style="color:${color}; font-weight:bold;">${c.status}</td>
                //<td>${durationText}</td>
                <td style="color:${durationColor};">${durationText}</td>
                <td>
                    <button class="report-btn" data-username="${c.radiusUsername}">
                        Generate Report
                    </button>
                </td>
                <td><button class="remove-btn" data-username="${c.radiusUsername}">Remove</button></td>
            </tr>
        `;
    });

    // The rest of your render() code remains unchanged (panel.innerHTML, event listeners, etc.)
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
