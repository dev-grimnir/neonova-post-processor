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
        const seconds = this.durationSeconds || 0;
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
    
        let str = '';
        if (days > 0) str += `${days}d `;
        if (hours % 24 > 0) str += `${hours % 24}h `;
        if (minutes % 60 > 0) str += `${minutes % 60}m `;
        if (str === '') str = 'Just Now';  // Only if literally 0 seconds
    
        // Add the event timestamp in 12-hour AM/PM
        if (this.lastUpdate) {  // Assuming you store lastUpdate as Date or timestamp
            const eventTime = new Date(this.lastUpdate);
            const formattedTime = eventTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            str += ` (${formattedTime})`;
        }
    
        return str.trim();
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
