// src/controllers/BaseNeonovaController.js

class BaseNeoNovaController {
    constructor() {
        this.baseSearchUrl = 'https://admin.neonova.net/rat/index.php';
        // You can add defaults for form fields here if they rarely change
        this.defaultFormData = {
            ip: '',
            session: '',
            nasip: '',
            statusview: 'both',
            sd: 'fairpoint.net',  // domain — make configurable if needed
            shour: '00',
            smin: '00',
            emonth: '',
            eday: '',
            eyear: '',
            ehour: '',
            emin: '',
            hits: '50',
            order: 'date',
            submit: 'Search'
        };
    }

    /**
     * Submits the search form and returns the parsed DOM document of the results page.
     * @param {string} username 
     * @param {Object} [overrides={}] - optional overrides for form fields
     * @returns {Promise<Document>} parsed DOM
     */
    async submitSearch(username, overrides = {}) {
        const formData = new URLSearchParams({
            ...this.defaultFormData,
            iuserid: username,
            acctsearch: '2',
            ...overrides
        });

        // Dynamic current month start (can be overridden)
        const now = new Date();
        const currentYear = now.getFullYear().toString();
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
        const currentDay = '01';
        if (!formData.has('syear')) formData.set('syear', currentYear);
        if (!formData.has('smonth')) formData.set('smonth', currentMonth);
        if (!formData.has('sday')) formData.set('sday', currentDay);

        const res = await fetch(this.baseSearchUrl, {
            method: 'POST',
            credentials: 'include',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
            referrer: `${this.baseSearchUrl}?acctsearch=1&userid=${encodeURIComponent(username)}`,
        });

        if (!res.ok) {
            throw new Error(`Search failed: HTTP ${res.status}`);
        }

        const html = await res.text();
        return new DOMParser().parseFromString(html, 'text/html');
    }

    /**
     * Parses a single page's table rows into entry objects.
     * @param {Document} doc 
     * @returns {Array<Object>} entries
     */
    parsePageRows(doc) {
        const entries = [];
        const table = doc.querySelector('table[cellspacing="2"][cellpadding="2"]');
        if (!table || table.rows.length <= 1) return entries;

        for (let i = 1; i < table.rows.length; i++) {
            const cells = table.rows[i].cells;
            if (cells.length < 7) continue;

            const timestamp = cells[0].textContent.trim();
            const statusText = cells[4].textContent.trim();
            const sessionTime = cells[6].textContent.trim();

            let dateObj;
            try {
                dateObj = new Date(timestamp.replace(' ', 'T'));
                if (isNaN(dateObj.getTime())) continue;
            } catch {
                continue;
            }

            const status = statusText.includes('Start') ? 'Start' : 'Stop';

            entries.push({ timestamp, status, sessionTime, dateObj });
        }

        return entries;
    }

    /**
     * Finds the next page link using the exact logic from the report builder.
     * @param {Document} doc 
     * @returns {HTMLAnchorElement|null}
     */
    findNextPageLink(doc) {
        return Array.from(doc.querySelectorAll('a'))
            .find(a => a.textContent.trim().startsWith('NEXT @') && a.href && a.href.includes('index.php'));
    }

    /**
     * Full pagination - collects all entries (used by report).
     * @param {string} username 
     * @param {Function} [onProgress] optional callback (currentEntries, page)
     * @returns {Promise<Array<Object>>}
     */
    async paginateReportLogs(username, onProgress = null) {
        const entries = [];
        let url = this.baseSearchUrl;  // initial form submit happens in submitSearch
        let page = 1;

        // First page: submit the search form
        const initialDoc = await this.submitSearch(username);
        let pageEntries = this.parsePageRows(initialDoc);
        entries.push(...pageEntries);
        if (onProgress) onProgress(entries.length, page);

        while (true) {
            const nextLink = this.findNextPageLink(initialDoc);  // use the current doc for link
            if (!nextLink || !nextLink.href) break;

            url = nextLink.href;
            if (!url.startsWith('http')) url = 'https://admin.neonova.net' + url;

            console.log(`Fetching page ${page + 1}: ${url}`);
            const res = await fetch(url, { credentials: 'include', cache: 'no-cache' });
            if (!res.ok) break;

            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            pageEntries = this.parsePageRows(doc);
            entries.push(...pageEntries);

            if (onProgress) onProgress(entries.length, page + 1);

            page++;
        }

        entries.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
        return entries;
    }

    /**
     * Dashboard convenience method - gets only the most recent entry.
     * @param {string} username 
     * @returns {Promise<Object|null>}
     */
    async getLatestEntry(username) {
        const entries = await this.paginateReportLogs(username);
        return entries[0] || null;
    }
}
