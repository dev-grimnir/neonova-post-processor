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
     * Declared at the very top of the class for Tampermonkey compatibility
     * (it parses top-to-bottom and fails if a private method is called before
     * its declaration).
     **************************************************************************/

    /**
     * Builds the URLSearchParams for a specific pagination request.
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
     * Builds the full URL for a pagination request.
     * @private
     */
    #buildPageUrl(params) {
        return `${this.baseSearchUrl}?${params.toString()}`;
    }

    /**
     * Fetches a single pagination page.
     * - Returns HTML string on success (HTTP 200-299).
     * - Returns null on HTTP error status (!res.ok).
     * - Throws on network errors or AbortError (propagates to caller for special handling).
     * @private
     */
    async #fetchPageHtml(url, signal = null) {
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
            },
            signal
        });

        if (!res.ok) {
            console.warn(`HTTP ${res.status} while fetching pagination page`);
            return null;
        }

        return await res.text();
    }

    /**
     * Extracts the total number of entries from the results header on the first page.
     * Looks for the gray row (<tr bgcolor="gray">) and finds the "of" cell, then takes
     * the number from the next cell (robust against minor HTML changes).
     * Returns a number or null if not found.
     * @private
     */
    #extractTotalEntries(doc) {
        const grayTr = doc.querySelector('tr[bgcolor="gray"]');
        if (!grayTr) return null;

        const tds = Array.from(grayTr.querySelectorAll('td'));
        if (tds.length < 5) return null;

        const ofIndex = tds.findIndex(td => td.textContent.trim().toLowerCase().includes('of'));
        if (ofIndex === -1 || ofIndex + 1 >= tds.length) return null;

        const totalText = tds[ofIndex + 1].textContent.trim();
        const num = parseInt(totalText, 10);

        return isNaN(num) ? null : num;
    }

    /**
     * Parses the RADIUS log table rows from a DOM document.
     * Isolated as private because it's only used internally.
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

            const timestampStr = cells[0].textContent.trim();
            const status = cells[4].textContent.trim();
            const sessionTime = cells[6].textContent.trim();

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

    findNextPageLink(doc) {
        return Array.from(doc.querySelectorAll('a'))
            .find(a => a.textContent.trim().startsWith('NEXT @') && a.href && a.href.includes('index.php'));
    }

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
     * Main pagination method — enhanced orchestrator.
     * 
     * New features:
     * - Scrapes total entry count from first page header (for accurate progress + safety).
     * - Optional AbortSignal as final argument for cancellation support.
     * - Returns { entries, total } instead of just entries.
     * - onProgress now receives three arguments when total is known: (fetchedCount, page, total).
     *   Old callers that expect only two arguments will safely ignore the third.
     * - Added safety check using total to prevent infinite loops.
     * - On abort, returns partial results collected so far.
     * 
     * Backward compatibility for legacy argument order is preserved.
     */
    async paginateReportLogs(username, startDate = null, endDate = null, onProgress = null, signal = null) {
        // Backward-compatibility for legacy calls (onProgress as 2nd or 3rd arg)
        if (typeof startDate === 'function') {
            onProgress = startDate;
            startDate = null;
            endDate = null;
            signal = null;
        } else if (typeof endDate === 'function') {
            onProgress = endDate;
            endDate = null;
            signal = null;
        }

        const now = new Date();
        const sDate = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        const eDate = endDate ? new Date(endDate) : new Date(now);

        const hitsPerPage = 100;
        const entries = [];
        let offset = 0;
        let page = 1;
        let total = null; // Discovered from first page

        while (true) {
            const params = this.#buildPaginationParams(username, sDate, eDate, hitsPerPage, offset);
            const url = this.#buildPageUrl(params);

            let html;
            try {
                html = await this.#fetchPageHtml(url, signal);
            } catch (err) {
                if (err.name === 'AbortError') {
                    console.log('Pagination cancelled by user');
                    return { entries, total };
                }
                console.warn('Unexpected error fetching page:', err);
                break;
            }

            if (html === null) {
                break; // HTTP error — stop as in original behaviour
            }

            const doc = new DOMParser().parseFromString(html, 'text/html');

            // Extract total only from the very first page
            if (offset === 0 && total === null) {
                total = this.#extractTotalEntries(doc);
            }

            const pageEntries = this.#parsePageRows(doc);
            entries.push(...pageEntries);

            // Progress callback — third argument (total) is null until discovered
            if (typeof onProgress === 'function') {
                onProgress(entries.length, page, total);
            }

            // Termination conditions
            if (pageEntries.length < hitsPerPage) {
                break;
            }
            if (total !== null && entries.length >= total) {
                break; // Safety net using authoritative total count
            }

            offset += hitsPerPage;
            page++;
        }

        // Final sort newest-first
        entries.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

        return { entries, total };
    }

    /**
     * Returns the most recent RADIUS log entry for the user.
     * Updated to handle the new { entries, total } return shape from paginateReportLogs.
     */
    async getLatestEntry(username) {
        try {
            const result = await this.paginateReportLogs(username);
            if (!result.entries || result.entries.length === 0) {
                return null;
            }
            // Already sorted newest-first
            return result.entries[0];
        } catch (err) {
            console.error('getLatestEntry failed:', err);
            return null;
        }
    }
}
