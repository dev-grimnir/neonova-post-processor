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
   * NEW: Open Neonova Snapshot modal for any day in the report
   * This is how we "wire it in" – zero changes to your existing report logic.
   * Just call this from any row click, date link, or "View EKG" button.
   */
  async showSnapshotForDate(snapshotDate, username, friendlyName = 'Modem') {
    // 1. Create a fresh container (or reuse a dedicated modal container in your report UI)
    const modalContainer = document.createElement('div');
    modalContainer.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:9999; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center;';

    // 2. Instantiate the fully self-contained snapshot trio
    const snapshotController = new NeonovaSnapshotController(modalContainer);

    // 3. Wire the model + view + data in one line
    //    (Controller handles creation of model + view internally)
    await snapshotController.loadForDate(snapshotDate, username, friendlyName);

    // 4. Append to DOM (the view's show() will handle modal visibility via NeonovaBaseModalView)
    document.body.appendChild(modalContainer);

    // Optional: Clean up on close (the view's hide() removes it)
    const cleanup = () => {
      if (modalContainer.parentNode) modalContainer.parentNode.removeChild(modalContainer);
      snapshotController.hide();
    };

    // Example: wire close button inside the view if you want (already handled by NeonovaBaseModalView)
    modalContainer.addEventListener('click', (e) => {
      if (e.target === modalContainer) cleanup();
    });
  }

    async openDailyDisconnectDetail(dateStr) {   // dateStr like "2026-03-22"
        console.log('NeonovaReportController.openDailyDisconnectDetail() -> START for date:', dateStr);

        try {
            // Parse the date string (YYYY-MM-DD)
            const [year, month, day] = dateStr.split('-').map(Number);

            const startDate = new Date(year, month - 1, day);
            const endDate   = new Date(year, month - 1, day);

            // Use the NEW paginateReportLogs with full day hour/minute support
            const entries = await NeonovaHTTPController.paginateReportLogs(
                this.model.username,
                startDate,      // startDate
                endDate,        // endDate (same day)
                0,              // startHour
                0,              // startMinute  → 00:00
                23,             // endHour
                59              // endMinute    → 23:59
                // onProgress and signal left as undefined (defaults)
            );

            console.log(`paginateReportLogs returned ${entries ? entries.length : 0} entries for ${dateStr}`);

            // Existing processing (unchanged)
            const result = NeonovaCollector.cleanEntries(entries || []);
            const events = result.cleanedEntries || [];
            console.log(`cleanEntries returned ${events.length} cleaned events (ignored ${result.ignored || 0})`);

            const dailyModel = new NeonovaDailyDisconnectModel(
                this.model.username,
                this.model.friendlyName,
                new Date(dateStr),
                events
            );

            const dailyView = new NeonovaDailyDisconnectView(this, dailyModel);
            dailyView.show();

        } catch (err) {
            console.error('Daily detail failed:', err);
            alert('Could not load daily connection details. Check console for details.');
        }
    }
    
}
