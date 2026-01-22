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
     * Parses table rows from a parsed document into entry objects.
     * Includes logging for diagnostics.
     * @param {Document} doc - Parsed DOM document
     * @returns {Array<{timestamp: string, status: string, sessionTime: string, dateObj: Date}>}
     */
    parsePageRows(doc) {
    const entries = [];

    // Prefer the wide data table (from your HTML)
    let table = doc.querySelector('table[width="500"]') ||
                doc.querySelector('table[cellspacing="2"][cellpadding="2"]') ||
                doc.querySelector('table');

    if (!table) {
        console.log('No data table found on page');
        return entries;
    }

    console.log('Table found - total rows:', table.rows.length);
    console.log('Table width/attrs:', table.getAttribute('width'), table.getAttribute('cellspacing'));

    // Skip header row (usually row 0)
    for (let i = 1; i < table.rows.length; i++) {
        const row = table.rows[i];
        const cells = row.cells;

        if (cells.length < 6) {
            console.log(`Skipping row ${i} - too few cells (${cells.length})`);
            continue;
        }

        const timestamp = cells[0]?.textContent?.trim() || '';
        const statusText = cells[4]?.textContent?.trim() || '';
        const sessionTime = cells[6]?.textContent?.trim() || '';

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

    console.log(`Parsed ${entries.length} valid entries from page`);
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
     * Builds the full search URL for a given username.
     * Uses current month start as the default from-date.
     * All other params match the working cURL capture.
     * @param {string} username
     * @returns {string} Full search URL
     */
    getSearchUrl(username) {
        const now = new Date();
        const currentYear = now.getFullYear().toString();
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0'); // 01-12
    
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
            sday: '01',                     // Start of current month
            shour: '00',
            smin: '00',
            emonth: '',                     // Empty end = up to present
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
    
        return `https://admin.neonova.net/rat/index.php?${params.toString()}`;
    }
    
             /**
         * Headless pagination for NeoNova RADIUS logs.
         * Uses POST for initial search, GET for subsequent pages.
         * Includes safety checks to prevent infinite loops.
         * @param {string} username
         * @param {Function} [onProgress] - (currentEntries, page)
         * @returns {Promise<Array>}
         */
        async paginateReportLogs(username, onProgress = null) {
        const entries = [];
        let page = 1;
        const seenUrls = new Set();
        const maxPages = 50; // safety cap
    
        // Start with POST for the first page
        let currentDoc = await this.submitSearch(username);
        let currentUrl = currentDoc.location?.href || 'post-submit';
    
        seenUrls.add(currentUrl);
    
        // Parse page 1
        let pageEntries = this.parsePageRows(currentDoc);
        entries.push(...pageEntries);
    
        if (onProgress) onProgress(entries.length, page);
        console.log(`Page ${page} parsed: ${pageEntries.length} entries`);
    
        while (true) {
            if (page >= maxPages) {
                console.warn(`Max pages reached (${maxPages}). Stopping.`);
                break;
            }
    
            const nextLink = Array.from(currentDoc.querySelectorAll('a'))
                .find(a => {
                    const text = a.textContent.trim();
                    return text.startsWith('NEXT @') && a.href && a.href.includes('index.php');
                });
    
            if (!nextLink) {
                console.log(`No NEXT @ link found on page ${page}. Ending pagination.`);
                break;
            }
    
            let nextUrl = nextLink.href;
            if (!nextUrl.startsWith('http')) {
                nextUrl = 'https://admin.neonova.net' + nextUrl;
            }
    
            if (nextUrl === currentUrl || seenUrls.has(nextUrl)) {
                console.warn(`Next link does not advance (${nextUrl} same as current or seen). Stopping.`);
                break;
            }
    
            console.log(`Following NEXT link to page ${page + 1}: ${nextUrl}`);
    
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
            currentUrl = res.url || nextUrl;
    
            seenUrls.add(currentUrl);
    
            pageEntries = this.parsePageRows(currentDoc);
            entries.push(...pageEntries);
    
            if (onProgress) onProgress(entries.length, page + 1);
            console.log(`Page ${page + 1} parsed: ${pageEntries.length} entries`);
    
            page++;
        }
    
        // Sort newest first (though page 1 is newest)
        entries.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
    
        console.log(`Total collected: ${entries.length} entries over ${page} pages`);
        if (entries.length > 0) {
            console.log('Newest entry (for status):', entries[0]);
        }
    
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
