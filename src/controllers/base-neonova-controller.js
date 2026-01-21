// src/controllers/BaseNeoNovaController.js

class BaseNeoNovaController {
    constructor() {
        // Shared configuration constants
        this.baseSearchUrl = 'https://admin.neonova.net/rat/index.php?acctsearch=1&userid=';
    }

    getSearchUrl(username) {
        return this.baseSearchUrl + encodeURIComponent(username);
    }

    async safeFetch(url) {
        const res = await fetch(url, {
            credentials: 'include',
            cache: 'no-cache'
        });
        if (!res.ok) {
            throw new Error(`Fetch failed: HTTP ${res.status}`);
        }
        return res;
    }
}
