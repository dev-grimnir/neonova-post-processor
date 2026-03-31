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
      console.log('🔵 [ReportController] showSnapshotForDate called for', snapshotDate);
    
      const modalContainer = document.createElement('div');
      modalContainer.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        z-index: 9999; background: rgba(0,0,0,0.7); 
        display: flex; align-items: center; justify-content: center;
      `;
    
      console.log('🔵 [ReportController] modalContainer created');
    
      const snapshotController = new NeonovaSnapshotController(modalContainer);
      console.log('🔵 [ReportController] snapshotController instantiated');
    
      document.body.appendChild(modalContainer);
      console.log('🔵 [ReportController] modalContainer appended to DOM');
    
      try {
        await snapshotController.loadForDate(snapshotDate, username, friendlyName);
        console.log('✅ [ReportController] loadForDate completed successfully');
      } catch (err) {
        console.error('❌ [ReportController] loadForDate failed:', err);
      }
    } 
}
