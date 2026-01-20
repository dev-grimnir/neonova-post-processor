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
        if (this.durationSec === 0) return 'Just now';
        const h = Math.floor(this.durationSec / 3600);
        const m = Math.floor((this.durationSec % 3600) / 60);
        const s = this.durationSec % 60;
        return `${h ? h + 'h ' : ''}${m ? m + 'm ' : ''}${s}s`;
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
