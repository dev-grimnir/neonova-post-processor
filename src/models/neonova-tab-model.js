class NeonovaTabModel {
    constructor(label, isActive = false) {
        this.label = label;
        this.isActive = isActive;
        this.customers = [];
    }

    addCustomer(customerController) {
        if (!this.customers.find(c => c.radiusUsername === customerController.radiusUsername)) {
            this.customers.push(customerController);
        }
    }

    removeCustomer(radiusUsername) {
        this.customers = this.customers.filter(c => c.radiusUsername !== radiusUsername);
    }

    rename(newLabel) {
        this.label = newLabel;
    }

    toJSON() {
        return {
            label: this.label,
            isActive: this.isActive,
            customers: this.customers.map(c => c.toJSON())
        };
    }

    static fromJSON(json, dashboardController) {
        const tab = new NeonovaTabModel(json.label, json.isActive);
        tab.customers = json.customers.map(c => NeonovaCustomerController.fromJSON(c, dashboardController));
        return tab;
    }
}
