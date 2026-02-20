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

    /**************************************************************************
     * PRIVATE METHODS
     * 
     * These are declared at the very top of the class (immediately after the
     * constructor) because Tampermonkey/Greasemonkey userscript environments
     * parse the class top-to-bottom and can throw if a private method is called
     * before its declaration is encountered.
     **************************************************************************/

    /**
     * Builds the URLSearchParams for a specific pagination request.
     * This exactly mirrors the original parameter logic but is now isolated
     * for readability and reusability.
     * 
     * Important note on pagination:
     * - direction='0' + increasing location=offset is the working forward pagination
     *   mechanism on this decades-old site. It does NOT fetch the same page repeatedly
     *   when offset is incremented — each new offset value requests the next page.
     * 
     * @private
     */
    #buildPaginationParams(username, sDate, eDate, hitsPerPage, offset) {
        return new URLSearchParams({
            acctsearch: '2',
            sd: 'fairpoint.net',
            iuserid: username,
            ip: '',
            session: '',
            nasip: '',
            statusview: 'both',
            syear: sDate.getFullYear().toString(),
            smonth: (sDate.getMonth() + 1).toString().padStart(2, '0'),
            sday: sDate.getDate().toString().padStart(2, '0'),
            shour: '00',
            smin: '00',
            eyear: eDate.getFullYear().toString(),
            emonth: (eDate.getMonth() + 1).toString().padStart(2, '0'),
            eday: eDate.getDate().toString().padStart(2, '0'),
            ehour: '23',
            emin: '59',
            order: 'date',
            hits: hitsPerPage.toString(),
            location: offset.toString(),
            direction: '0',     // forward pagination when combined with increasing offset
            dump: ''
        });
    }

    /**
     * Builds the full URL for a pagination request from the params object.
     * @private
     */
    #buildPageUrl(params) {
        return `${this.baseSearchUrl}?${params.toString()}`;
    }

    /**
     * Fetches a single pagination page.
     * Returns the raw HTML string on success, or null on any failure
     * (HTTP error, network error, etc.). This matches the original behavior
     * of breaking the loop on !res.ok without throwing.
     * 
     * All original headers are preserved exactly.
     * @private
     */
    async #fetchPageHtml(url) {
        try {
            const res = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                cache: 'no-cache',
                headers: {
                    'Referer': url,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'same-origin',
                    'Upgrade-Insecure-Requests': '1'
                }
            });

            if (!res.ok) {
                return null; // mimics original "break" on HTTP error
            }

            return await res.text();
        } catch (error) {
            // Network errors, aborted fetches, etc.
            console.warn('Pagination page fetch failed:', error);
            return null;
        }
    }

    /**
     * Parses the HTML of a results page into an array of entry objects.
     * Thin wrapper around #parsePageRows for clarity.
     * @private
     */
    #parsePageEntries(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return this.#parsePageRows(doc);
    }

    /**
     * Parses the RADIUS log table rows from a DOM document.
     * This is the original parsing logic, now made private because it is
     * only used internally by pagination.
     * @private
     */
    #parsePageRows(doc) {
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
            const status = cells[4].textContent.trim();        // "Start" or "Stop"
            const sessionTime = cells[6].textContent.trim();   // Duration string

            const dateObj = new Date(timestampStr);
            if (isNaN(dateObj.getTime())) {
                return;
            }

            entries.push({
                timestamp: timestampStr,
                status,
                sessionTime,
                dateObj
            });
        });

        return entries;
    }

    /**************************************************************************
     * PUBLIC METHODS
     **************************************************************************/

    /**
     * Generic safe fetch wrapper with defaults (credentials, no-cache).
     * Kept public in case other code uses it.
     */
    async safeFetch(url, options = {}) {
        const defaultOptions = {
            credentials: 'include',
            cache: 'no-cache',
        };
        const res = await fetch(url, { ...defaultOptions, ...options });
        if (!res.ok) {
            throw new Error(`Fetch failed: HTTP ${res.status}`);
        }
        return res;
    }

    /**
     * Submits the search form via POST and returns the parsed DOM.
     * Unchanged from original.
     */
    async submitSearch(username, overrides = {}) {
        const formData = new URLSearchParams({
            ...this.defaultFormData,
            iuserid: username,
            acctsearch: '2',
            ...overrides
        });

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
     * Finds the "NEXT @" link in a results page.
     * Kept public (original was public) in case other code uses it.
     */
    findNextPageLink(doc) {
        return Array.from(doc.querySelectorAll('a'))
            .find(a => a.textContent.trim().startsWith('NEXT @') && a.href && a.href.includes('index.php'));
    }

    /**
     * Builds a single-page search URL (first page only).
     * Unchanged from original.
     */
    getSearchUrl(username) {
        const now = new Date();
        const currentYear = now.getFullYear().toString();
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');

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
            sday: '01',
            shour: '00',
            smin: '00',
            emonth: '',
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
     * Main pagination method — now a clean orchestrator.
     * 
     * Changes from original:
     * - hits per page increased to 100
     * - artificial maxPages=50 limit removed (loop now relies solely on
     *   detecting an incomplete final page)
     * - broken into small private helpers for readability/maintainability
     * - legacy callback argument handling preserved exactly
     * 
     * Public signature is unchanged.
     */
    async paginateReportLogs(username, startDate = null, endDate = null, onProgress = null) {
        // Backward-compatibility for legacy calls that passed onProgress as 2nd arg
        if (typeof startDate === 'function') {
            onProgress = startDate;
            startDate = null;
            endDate = null;
        } else if (typeof endDate === 'function') {
            onProgress = endDate;
            endDate = null;
        }

        const now = new Date();
        const sDate = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const eDate = endDate ? new Date(endDate) : new Date(now);

        const hitsPerPage = 100; // increased as requested
        const entries = [];
        let offset = 0;
        let page = 1;

        while (true) {
            const params = this.#buildPaginationParams(username, sDate, eDate, hitsPerPage, offset);
            const url = this.#buildPageUrl(params);

            const html = await this.#fetchPageHtml(url);
            if (!html) {
                break; // HTTP or network error — stop pagination gracefully
            }

            const pageEntries = this.#parsePageEntries(html);
            entries.push(...pageEntries);

            if (typeof onProgress === 'function') {
                onProgress(entries.length, page);
            }

            // Last page detected when server returns fewer than a full page of results
            if (pageEntries.length < hitsPerPage) {
                break;
            }

            offset += hitsPerPage;
            page++;
        }

        // Final sort newest-first (critical for correct "latest entry" logic)
        entries.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

        return entries;
    }

    /**
     * Returns the most recent RADIUS log entry for the user.
     * Robust version with try/catch — the earlier stub version has been removed.
     */
    async getLatestEntry(username) {
        try {
            const entries = await this.paginateReportLogs(username);
            if (entries.length === 0) {
                return null;
            }

            // Already sorted newest-first by paginateReportLogs
            return entries[0];
        } catch (err) {
            console.error('getLatestEntry failed:', err);
            return null;
        }
    }
}
