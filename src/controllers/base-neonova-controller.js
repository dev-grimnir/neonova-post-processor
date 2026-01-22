// src/controllers/BaseNeonovaController.js

class BaseNeonovaController {
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

    async getLatestEntry(username) {
        const url = this.baseSearchUrl + encodeURIComponent(username); // missing separator? Add & if needed
        const entries = await this.paginateReportLogs(username); // or pass url
        return entries[0] || null;
    }
    
    async safeFetch(url, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            cache: 'no-cache',
            // add signal if needed for abort
        };
        const res = await fetch(url, { ...defaultOptions, ...options });
        if (!res.ok) {
            throw new Error(`Fetch failed: HTTP ${res.status}`);
        }
        return res;
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

    getSearchUrl(username) {
        const now = new Date();
        const currentYear = now.getFullYear().toString();
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');  // 01–12
    
        const params = new URLSearchParams({
            acctsearch: '2',
            sd: 'fairpoint.net',
            iuserid: username,
            ip: '',
            session: '',
            nasip: '',
            statusview: 'both',
            syear: currentYear,
            smonth: currentMonth,
            sday: '01',  // fixed to start of month
            shour: '00',
            smin: '00',
            emonth: '',  // empty end = up to today
            eday: '',
            eyear: '',
            ehour: '',
            emin: '',
            hits: '50',
            order: 'date',
            location: '0',
            direction: '1',
            dump: ''
        });
    
        return `${this.baseSearchUrl}?${params.toString()}`;
    }
    
    /**
     * Full pagination - collects all entries (used by report).
     * @param {string} username 
     * @param {Function} [onProgress] optional callback (currentEntries, page)
     * @returns {Promise<Array<Object>>}
     */
    /**
 * Headless pagination for NeoNova RADIUS logs.
 * Submits the search form (POST), parses the first page, then follows "NEXT @" links.
 * Stops when no valid next link is found or safety limits are hit.
 * Returns sorted array of entries (newest first).
 * 
 * @param {string} username - The RADIUS username to search
 * @param {Function} [onProgress] - Optional callback (currentEntries, page)
 * @returns {Promise<Array<{timestamp: string, status: string, sessionTime: string, dateObj: Date}>>}
 */
async paginateReportLogs(username, onProgress = null) {
    const entries = [];
    let page = 1;
    const seenUrls = new Set();           // Prevent infinite loops on same URL
    const maxPages = 50;                   // Hard cap to avoid spamming server

    // Step 1: Submit the initial search form (POST)
    const initialDoc = await this.submitSearch(username);
    let currentDoc = initialDoc;

    // Parse first page
    let pageEntries = this.parsePageRows(currentDoc);
    entries.push(...pageEntries);

    if (onProgress) onProgress(entries.length, page);

    console.log(`Page ${page}: ${pageEntries.length} entries parsed`);

    while (true) {
        // Safety: stop if we've seen this URL before
        const currentUrl = currentDoc.location?.href || 'unknown';
        if (seenUrls.has(currentUrl)) {
            console.warn(`Loop detected - same URL repeated (${currentUrl}). Stopping.`);
            break;
        }
        seenUrls.add(currentUrl);

        // Safety: max pages reached
        if (page >= maxPages) {
            console.warn(`Reached max pages (${maxPages}). Stopping to prevent spam.`);
            break;
        }

        // Find next page link using your exact report-builder logic
        const nextLink = Array.from(currentDoc.querySelectorAll('a'))
            .find(a => a.textContent.trim().startsWith('NEXT @') && a.href && a.href.includes('index.php'));

        if (!nextLink || !nextLink.href) {
            console.log(`No valid NEXT @ link found on page ${page}. Ending pagination.`);
            break;
        }

        // Resolve relative href to absolute
        let nextUrl = nextLink.href;
        if (!nextUrl.startsWith('http')) {
            nextUrl = 'https://admin.neonova.net' + nextUrl;
        }

        // Extra safety: don't follow if it's the same page
        if (nextUrl === currentUrl) {
            console.warn(`Next link points to current page (${nextUrl}). Stopping.`);
            break;
        }

        console.log(`Following next link to page ${page + 1}: ${nextUrl}`);

        // Fetch the next page
        const res = await fetch(nextUrl, {
            credentials: 'include',
            cache: 'no-cache'
        });

        if (!res.ok) {
            console.error(`Fetch failed for page ${page + 1}: HTTP ${res.status}`);
            break;
        }

        const html = await res.text();
        currentDoc = new DOMParser().parseFromString(html, 'text/html');

        // Parse this page
        pageEntries = this.parsePageRows(currentDoc);
        entries.push(...pageEntries);

        if (onProgress) onProgress(entries.length, page + 1);

        console.log(`Page ${page + 1}: ${pageEntries.length} entries parsed`);

        page++;
    }

    // Sort newest first
    entries.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

    console.log(`Total collected: ${entries.length} entries over ${page} pages`);

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
