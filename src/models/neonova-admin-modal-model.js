// src/models/neonova-admin-modal-model.js

class NeonovaAdminModalModel {
    constructor() {
        this.admins = []; // array of NeonovaAdminController
    }

    addAdmin(adminController) {
        if (!this.admins.find(a => a.name === adminController.name)) {
            this.admins.push(adminController);
        }
    }

    removeAdmin(name) {
        this.admins = this.admins.filter(a => a.name !== name);
    }

    findAdmin(name) {
        return this.admins.find(a => a.name === name);
    }
}
