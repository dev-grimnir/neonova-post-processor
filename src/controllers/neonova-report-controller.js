class NeonovaReportController {
    model;
    constructor(username, friendlyName, metrics, length, longDisconnects) {
        this.model = new NeonovaReportModel(
            username,
            friendlyName,
            metrics,
            length,
            metrics.longDisconnects || []
        );

        this.view = new NeonovaReportView(this, this.model);
        this.view.show();
    }

    /**
   * Open Neonova Snapshot modal for any day in the report
   * This is how we "wire it in" – zero changes to your existing report logic.
   * Just call this from any row click, date link, or "View EKG" button.
   */
    async showSnapshotForDate(snapshotDate, username, friendlyName = 'Modem') {
      const modalContainer = document.createElement('div');
      modalContainer.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        z-index: 99999; background: rgba(0,0,0,0.8);
        display: flex; align-items: center; justify-content: center;
      `;
    
      const snapshotController = new NeonovaSnapshotController(modalContainer);
      document.body.appendChild(modalContainer);
    
      await snapshotController.loadForDate(snapshotDate, username, friendlyName);
    
      // Click outside to close
      modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) modalContainer.remove();
      });
    }
}
