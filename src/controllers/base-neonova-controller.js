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
        const table = doc.querySelector('table[cellspacing="2"][cellpadding="2"]');
    
        if (!table) {
            console.log('No table found with cellspacing=2 cellpadding=2');
            // Fallback attempt - any table with rows
            const fallback = doc.querySelector('table');
            if (fallback) {
                console.log('Fallback table found - rows:', fallback.rows.length);
            }
            return entries;
        }
    
        console.log('Table found - total rows:', table.rows.length);
    
        for (let i = 1; i < table.rows.length; i++) {
            const row = table.rows[i];
            const cells = row.cells;
    
            console.log(`Row ${i}: ${cells.length} cells`);
    
            if (cells.length < 5) {  // Lowered from 7 to be more forgiving
                console.log(`Skipping row ${i} - too few cells`);
                continue;
            }
    
            const timestamp = cells[0]?.textContent?.trim() || '';
            const statusText = cells[4]?.textContent?.trim() || '';
            const sessionTime = cells[6]?.textContent?.trim() || '';
    
            console.log(`Row ${i} - timestamp: "${timestamp}", status: "${statusText}", sessionTime: "${sessionTime}"`);
    
            let dateObj;
            try {
                // More lenient parsing - handle various timestamp formats
                const normalized = timestamp.replace(/\s+/g, 'T').replace(/(\d{2}):(\d{2}):(\d{2})/, '$1:$2:$3');
                dateObj = new Date(normalized);
                if (isNaN(dateObj.getTime())) {
                    console.log(`Invalid date on row ${i}: "${timestamp}"`);
                    continue;
                }
            } catch (err) {
                console.log(`Date parse error on row ${i}:`, err.message);
                continue;
            }
    
            const status = statusText.toLowerCase().includes('start') ? 'Start' : 'Stop';
    
            entries.push({
                timestamp,
                status,
                sessionTime,
                dateObj
            });
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
        const maxPages = 50;  // Hard safety limit
    
        // Step 1: Initial POST search
        let currentDoc = await this.submitSearch(username);
        let currentUrl = currentDoc.location?.href || 'initial-post';
    
        // Parse page 1
        let pageEntries = this.parsePageRows(currentDoc);
        entries.push(...pageEntries);
    
        if (onProgress) onProgress(entries.length, page);
        console.log(`Page ${page}: ${pageEntries.length} entries parsed`);
    
        while (true) {
            if (seenUrls.has(currentUrl)) {
                console.warn(`Loop detected - same URL repeated (${currentUrl}). Stopping.`);
                break;
            }
            seenUrls.add(currentUrl);
    
            if (page >= maxPages) {
                console.warn(`Reached max pages (${maxPages}). Stopping.`);
                break;
            }
    
            const nextLink = this.findNextPageLink(currentDoc);
            if (!nextLink || !nextLink.href) {
                console.log(`No valid NEXT @ link found on page ${page}. Ending.`);
                break;
            }
    
            let nextUrl = nextLink.href;
            if (!nextUrl.startsWith('http')) {
                nextUrl = 'https://admin.neonova.net' + nextUrl;
            }
    
            if (nextUrl === currentUrl) {
                console.warn(`Next link points to current page (${nextUrl}). Stopping.`);
                break;
            }
    
            console.log(`Following next link to page ${page + 1}: ${nextUrl}`);
    
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
            currentUrl = res.url || nextUrl;  // Use final redirected URL
    
            pageEntries = this.parsePageRows(currentDoc);
            entries.push(...pageEntries);
    
            if (onProgress) onProgress(entries.length, page + 1);
            console.log(`Page ${page + 1}: ${pageEntries.length} entries parsed`);
    
            page++;
        }
    
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
