class NeonovaPassphraseController {
    constructor(dashboardController) {
        this.dashboardController = dashboardController;
        this.view = new NeonovaPassphraseView(this);
    }

    show() {
        return new Promise(resolve => {
            this._resolve = resolve;
            this.view.show();
        });
    }

    async handleSubmit(passphrase, rememberDevice) {
        this.view.hide();

        if (!passphrase?.trim()) {
            console.warn("🔓 Encryption disabled – plaintext mode");
            this._resolve(null);
            return;
        }

        const { key, salt } = await deriveKey(passphrase);
        masterKey = { key, salt };

        if (rememberDevice) {
            await saveRememberedMasterKey(key);
            console.log('🔑 Encryption key remembered on this device');
        }

        this._resolve(passphrase);
    }

    handleCancel() {
        this.view.hide();
        this._resolve(null);
    }
}
