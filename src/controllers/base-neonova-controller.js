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
            hits: '100',
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
 * Parses the RADIUS log table from a parsed document.
 * Skips header row, extracts timestamp, status, session time.
 * Returns array of entry objects.
 * 
 * @param {Document} doc
 * @returns {Array<{timestamp: string, status: string, sessionTime: string, dateObj: Date}>}
 */
parsePageRows(doc) {
    const table = doc.querySelector('table[width="500"]') || doc.querySelector('table[cellspacing="2"][cellpadding="2"]');
    if (!table) {
        return [];
    }

    const rows = Array.from(table.querySelectorAll('tr'));
    const entries = [];

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 7) return;  // Skip headers/short rows

        const timestampStr = cells[0].textContent.trim();  // e.g., "2026-01-29 22:14:00"
        const status = cells[4].textContent.trim();  // Assuming "Start" or "Stop"
        const sessionTime = cells[6].textContent.trim();  // Duration string

        const dateObj = new Date(timestampStr);  // Parses ISO-like strings
        if (isNaN(dateObj.getTime())) {
            return;
        }

        entries.push({
            timestamp: timestampStr,  // Keep raw for debug
            status,
            sessionTime,
            dateObj  // Valid Date
        });
    });
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
            hits: '100',
            order: 'date',
            location: '0',
            direction: '1',
            dump: ''
        });
    
        return `https://admin.neonova.net/rat/index.php?${params.toString()}`;
    }
    
    /**
     * Fetches all available RADIUS log pages for a user using predictable offset pagination.
     * Uses location=0,50,100,... with direction=0 (forward).
     * Parses total entry count from the "Entry: X-Y of Z" header table on page 1.
     * Stops precisely at calculated total pages or when last page has < hitsPerPage rows.
     * Returns all entries sorted newest-first.
     * @param {string} username
     * @param {Date|null} startDate - Optional start date for the search range (defaults to start of current month).
     * @param {Date|null} endDate - Optional end date for the search range (defaults to now).
     * @param {Function|null} onProgress - Optional callback (totalEntriesSoFar, currentPage)
     * @returns {Promise<Array<{timestamp: string, status: string, sessionTime: string, dateObj: Date}>>}
     */
    async paginateReportLogs(username, startDate = null, endDate = null, onProgress = null) {
        // Legacy support
        if (typeof startDate === 'function') { onProgress = startDate; startDate = null; endDate = null; }
        else if (typeof endDate === 'function') { onProgress = endDate; endDate = null; }
    
        const entries = [];
        let page = 1;
        let offset = 0;
        const hitsPerPage = 100;
    
        let totalEntries = null;
        let totalPages = null;
    
        const now = new Date();
    
        // === FORCE FULL DAYS (this fixes the cutoff) ===
        let sDate = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        let eDate = endDate ? new Date(endDate) : now;
    
        sDate.setHours(0, 0, 0, 0);           // start of day
        eDate.setHours(23, 59, 59, 999);      // end of day (critical!)
    
        while (true) {
            const params = new URLSearchParams({
                acctsearch: '2', sd: 'fairpoint.net', iuserid: username,
                ip: '', session: '', nasip: '', statusview: 'both',
                syear: sDate.getFullYear().toString(),
                smonth: (sDate.getMonth() + 1).toString().padStart(2, '0'),
                sday: sDate.getDate().toString().padStart(2, '0'),
                shour: '00', smin: '00',
                eyear: eDate.getFullYear().toString(),
                emonth: (eDate.getMonth() + 1).toString().padStart(2, '0'),
                eday: eDate.getDate().toString().padStart(2, '0'),
                ehour: '23', emin: '59',
                order: 'date', hits: hitsPerPage.toString(),
                location: offset.toString(), direction: '0', dump: ''
            });
    
            const url = `https://admin.neonova.net/rat/index.php?${params.toString()}`;
    
            const res = await fetch(url, { credentials: 'include', cache: 'no-cache', headers: { Referer: url, Accept: 'text/html,...', ... } });
    
            if (!res.ok) { console.warn(`Fetch failed page ${page}`); break; }
    
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
    
            // === ROBUST TOTAL PARSER (fixes the 3446 vs 3454 mismatch) ===
            if (page === 1) {
                console.log('Attempting total-entries parse (page 1)');
                let ofText = '';
    
                // Exact selector
                let headerRow = doc.querySelector('table[cellspacing="2"][cellpadding="2"][border="0"] tr[bgcolor="gray"]');
                if (headerRow) {
                    const cells = headerRow.querySelectorAll('td');
                    if (cells.length >= 5) ofText = cells[4].textContent.trim();
                }
                // Fallback: search entire page
                if (!ofText) {
                    const match = (doc.body.textContent || '').match(/of\s*([\d,]+)/i);
                    if (match) ofText = match[0];
                }
    
                if (ofText) {
                    const num = ofText.match(/[\d,]+/);
                    if (num) {
                        totalEntries = parseInt(num[0].replace(/,/g, ''), 10);
                        if (!isNaN(totalEntries) && totalEntries > 0) {
                            totalPages = Math.ceil(totalEntries / hitsPerPage);
                            console.log(`Total entries detected: ${totalEntries} → ${totalPages} pages`);
                        }
                    }
                }
            }
    
            const pageEntries = this.parsePageRows(doc);
            entries.push(...pageEntries);
    
            if (typeof onProgress === 'function') {
                const percent = totalEntries ? Math.round((entries.length / totalEntries) * 100) : 0;
                onProgress(entries.length, page, totalEntries, percent);
            }
    
            if (pageEntries.length < hitsPerPage) break;
            if (totalPages !== null && page >= totalPages) break;
            if (page > 1000) break;
    
            offset += hitsPerPage;
            page++;
        }
    
        entries.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
        console.log(`Pagination finished with ${entries.length} raw entries`);
        return entries;
    }

    
/**
 * Gets the most recent RADIUS log entry for the user.
 * Fetches all pages and returns the newest (most recent timestamp).
 * 
 * @param {string} username
 * @returns {Promise<Object|null>} Newest entry or null
 */
async getLatestEntry(username) {
        try {
            const entries = await this.paginateReportLogs(username);
            if (entries.length === 0) {
                return null;
            }
    
            // Already sorted newest-first in paginateReportLogs
            const newest = entries[0];
    
            return newest;
        } catch (err) {
            return null;
        }
    }
}
