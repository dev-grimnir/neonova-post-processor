class NeonovaProgressView {
    constructor(){
    }

    showProgress(message = 'Processing...') {
        if (this.progressContainer) return;
        this.progressContainer = document.createElement('div');
        this.progressContainer.style.position = 'fixed';
        this.progressContainer.style.bottom = '80px';
        this.progressContainer.style.right = '20px';
        this.progressContainer.style.zIndex = '999999';
        this.progressContainer.style.backgroundColor = '#f0f0f0';
        this.progressContainer.style.padding = '15px';
        this.progressContainer.style.borderRadius = '10px';
        this.progressContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        this.progressContainer.innerHTML = `
            <div style="font-weight:bold; margin-bottom:8px;">${message}</div>
            <progress id="reportProgress" value="0" max="100" style="width:250px; height:20px;"></progress>
            <div id="progressText" style="margin-top:8px; font-size:14px;">0% (0 entries)</div>
        `;
        document.body.appendChild(this.progressContainer);
    }

    updateProgress(currentEntries, extraText = '') {
        if (!this.progressContainer) return;
        const progress = this.progressContainer.querySelector('#reportProgress');
        const text = this.progressContainer.querySelector('#progressText');
        // If total unknown, use indeterminate mode
        progress.removeAttribute('max');  // indeterminate progress
        text.textContent = `Processing ${currentEntries} entries ${extraText}`;
    }

    hideProgress() {
        if (this.progressContainer) {
            this.progressContainer.remove();
            this.progressContainer = null;
        }
    }
}
