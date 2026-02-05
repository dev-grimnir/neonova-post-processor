class NeonovaProgressView {
    constructor(container) {
        this.container = container;
    }

    render() {
        this.container.innerHTML = `
            <h1>Report Generation Progress</h1>
            <div id="progress" style="display:block;">
                <div id="progress-bar" style="width:0%; height:30px; background:#4CAF50; transition:width 0.4s;"></div>
            </div>
            <div id="status" style="margin-top:10px; font-weight:bold; text-align:center;">Starting...</div>
        `;
    }

    updateProgress(percent, text) {
        const bar = this.container.querySelector('#progress-bar');
        const status = this.container.querySelector('#status');
        if (bar) bar.style.width = percent + '%';
        if (status) status.textContent = text || 'Processing...';
    }

    showError(message) {
        const status = this.container.querySelector('#status');
        if (status) status.textContent = 'Error: ' + message;
    }
}
