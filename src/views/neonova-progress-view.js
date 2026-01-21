class NeonovaProgressView {
    constructor() {
        this.container = null;
        this.progressElement = null;
        this.textElement = null;
        this.message = 'Processing...';
    }

    show(message = 'Processing RADIUS logs...') {
        if (this.container) return; // already shown

        this.message = message;

        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            z-index: 999999;
            background-color: #f8f9fa;
            padding: 15px 20px;
            border-radius: 12px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.25);
            font-family: Arial, sans-serif;
            min-width: 280px;
            border: 1px solid #dee2e6;
        `;

        this.container.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; color: #333;">${this.message}</div>
            <progress id="progressBar" value="0" max="100" style="width: 100%; height: 18px;"></progress>
            <div id="progressText" style="margin-top: 10px; font-size: 14px; color: #555; text-align: center;">
                0% (0 entries processed)
            </div>
        `;

        document.body.appendChild(this.container);

        this.progressElement = this.container.querySelector('#progressBar');
        this.textElement = this.container.querySelector('#progressText');
    }

    update(currentEntries = 0, extraText = '') {
        if (!this.progressElement) return;

        // Indeterminate mode (no known total)
        this.progressElement.removeAttribute('max');
        this.progressElement.removeAttribute('value');

        const text = `Processing ${currentEntries} entries${extraText ? ' - ' + extraText : ''}`;
        this.textElement.textContent = text;
    }

    updateDeterminate(current, total) {
        if (!this.progressElement) return;

        // Switch to determinate mode if total is known
        this.progressElement.max = total;
        this.progressElement.value = current;

        const percent = total > 0 ? Math.round((current / total) * 100) : 0;
        this.textElement.textContent = `${percent}% (${current} of ${total} entries)`;
    }

    hide() {
        if (this.container) {
            this.container.remove();
            this.container = null;
            this.progressElement = null;
            this.textElement = null;
        }
    }

    complete(message = 'Complete!') {
        if (!this.container) return;
        this.container.querySelector('div').textContent = message;
        this.progressElement.style.display = 'none';
        this.textElement.style.color = '#28a745';
        this.textElement.textContent = 'Report generated successfully';
        setTimeout(() => this.hide(), 3000);
    }

    error(message = 'Error occurred') {
        if (!this.container) return;
        this.container.querySelector('div').textContent = message;
        this.progressElement.style.display = 'none';
        this.textElement.style.color = '#dc3545';
        this.textElement.textContent = 'Failed to process logs';
        setTimeout(() => this.hide(), 5000);
    }
}
