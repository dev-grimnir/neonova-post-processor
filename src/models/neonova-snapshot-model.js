// =============================================
// NeonovaSnapshotModel
// Pure data container only – private fields
// src/models/NeonovaSnapshotModel.js
// =============================================

class NeonovaSnapshotModel {
  #rawEvents = [];
  #snapshotDate = null;
  #friendlyName = '';

  constructor(rawEventsArray, targetDate, friendlyName = 'Modem') {
    this.#rawEvents = Array.isArray(rawEventsArray) ? [...rawEventsArray] : [];
    this.#snapshotDate = new Date(targetDate);
    this.#friendlyName = String(friendlyName);
  }

  get rawEvents() {
    return this.#rawEvents;
  }

  get snapshotDate() {
    return this.#snapshotDate;
  }

  get friendlyName() {
    return this.#friendlyName;
  }
}
