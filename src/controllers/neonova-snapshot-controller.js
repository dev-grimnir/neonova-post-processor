// =============================================
// NeonovaSnapshotController
// src/controllers/NeonovaSnapshotController.js
// =============================================

class NeonovaSnapshotController {
  #model = null;
  #view = null;

  constructor(containerElement) {
    // Controller creates and manages the view (per your exact spec)
    this.#view = new NeonovaSnapshotView(containerElement);
  }

  // PRIMARY ENTRY POINT – fully self-contained
async showSnapshotForDate(snapshotDate, username, friendlyName = 'Modem') {
  console.log('🔵 [ReportController] showSnapshotForDate called for', snapshotDate);

  const modalContainer = document.createElement('div');
  modalContainer.style.cssText = `
    position: fixed; 
    top: 0; left: 0; 
    width: 100%; height: 100%; 
    z-index: 99999; 
    background: rgba(0,0,0,0.75); 
    display: flex; 
    align-items: center; 
    justify-content: center;
  `;

  const snapshotController = new NeonovaSnapshotController(modalContainer);

  document.body.appendChild(modalContainer);
  console.log('🔵 [ReportController] modalContainer appended to DOM');

  await snapshotController.loadForDate(snapshotDate, username, friendlyName);

  // Force visibility in case base modal does nothing
  modalContainer.style.display = 'flex';

  // Click outside to close
  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
      modalContainer.remove();
    }
  });

  console.log('✅ [ReportController] showSnapshotForDate completed');
}

  // Optional direct-load path (pre-cleaned events already available)
  loadSnapshot(snapshotDate, preCleanedEvents, friendlyName = 'Modem') {
    this.#model = new NeonovaSnapshotModel(preCleanedEvents, snapshotDate, friendlyName);

    const startOfDay = new Date(snapshotDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    const metricsBlob = NeonovaAnalyzer.computeMetrics(preCleanedEvents, startOfDay, endOfDay);
    const uptimePercent = metricsBlob.percentConnected || 0;

    const periodsList = NeonovaAnalyzer.computeSnapshotPeriods(preCleanedEvents, startOfDay, endOfDay);

    this.#view.setData(periodsList, uptimePercent, this.#model.snapshotDate);
    this.#view.show();
  }

  // Public API for the caller to close the snapshot
  hide() {
    if (this.#view) this.#view.hide();
  }
}
