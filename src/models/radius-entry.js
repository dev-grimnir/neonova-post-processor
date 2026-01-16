/**
 * @file src/models/radius-entry.js
 * @requires ../../core/utils   (only if you later add formatting methods here)
 */
class RadiusEntry {
    constructor(timestamp, isStart) {
        this.timestamp = timestamp;
        this.isStart = isStart; // true = Start, false = Stop
    }

    getDate() {
        return new Date(this.timestamp);
    }
}
