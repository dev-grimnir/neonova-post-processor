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
        if (this.durationSec < 0 || !Number.isFinite(this.durationSec)) return 'N/A';
    
        const days = Math.floor(this.durationSec / 86400);  // 24 * 3600
        let seconds = this.durationSec % 86400;
    
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
    
        const minutes = Math.floor(seconds / 60);
        seconds %= 60;
    
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0 || days > 0) parts.push(`${hours}h`);
        if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
        parts.push(`${seconds}s`);
    
        return parts.join(' ');
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
