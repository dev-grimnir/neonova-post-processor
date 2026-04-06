class NeonovaTabView extends BaseNeonovaView {
    constructor(tabController) {
        this.tabController = tabController;
        this.container = null;
    }

    mount(containerEl) {
        this.container = containerEl;
        this.render();
    }

    render() {
        if (!this.container) return;

        const activeTab = this.tabController.getActiveTab();
        if (!activeTab) return;

        this.container.innerHTML = '';

        const table = this._buildTable(activeTab.customers);
        this.container.appendChild(table);
    }

    _buildTable(customers) {
        const wrapper = document.createElement('div');

        if (!customers.length) {
            wrapper.textContent = 'No customers in this tab.';
            return wrapper;
        }

        const table = document.createElement('table');
        table.className = 'neonova-customer-table';

        for (const ctrl of customers) {
            const row = ctrl.getRowElement();
            if (row) table.appendChild(row);
        }

        wrapper.appendChild(table);
        return wrapper;
    }
}
