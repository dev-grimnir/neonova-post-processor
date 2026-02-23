class Customer {
    constructor(radiusUsername, friendlyName = '') {
        this.radiusUsername = radiusUsername.trim();
        this.friendlyName = (friendlyName.trim() || radiusUsername.trim());
        this.status = 'Unknown';               // 'Connected' / 'Not Connected' / 'Error' / 'Unknown'
        this.durationSec = 0;                  // seconds in current status
        this.lastUpdate = new Date().toLocaleString();
    }

    update(status, durationSec) {
        this.status = status;
        this.durationSec = durationSec;
        this.lastUpdate = new Date().toLocaleString();
    }

getDurationStr() {
    const seconds = this.durationSec || 0;

    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    let str = '';
    if (days > 0) str += `${days}d `;
    if (hours > 0) str += `${hours}h `;
    if (minutes > 0) str += `${minutes}m `;
    if (secs > 0 || str === '') str += `${secs}s`;

    str = str.trim() || '0s';

    // Always add the event time in 12-hour AM/PM (no "Just Now")
    if (this.lastEventTime) {
        const eventDate = new Date(this.lastEventTime);
        const timeStr = eventDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        str += ` (${timeStr})`;
    }

    return str;
}

    toJSON() {
        return {
            radiusUsername: this.radiusUsername,
            friendlyName: this.friendlyName,
            status: this.status,
            durationSec: this.durationSec,
            lastUpdate: this.lastUpdate
        };
    }
}
