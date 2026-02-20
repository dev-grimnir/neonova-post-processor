// src/controllers/BaseNeonovaController.js

class BaseNeonovaController {
    constructor() {
        console.log("BaseController v2 being constructed.");
        this.baseSearchUrl = 'https://admin.neonova.net/rat/index.php';
        this.defaultFormData = {
            ip: '',
            session: '',
            nasip: '',
            statusview: 'both',
            sd: 'fairpoint.net',
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
     * PRIVATE METHODS — declared first for Tampermonkey compatibility
     **************************************************************************/

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
            direction: '0',
            dump: ''
        });
    }

    #buildPageUrl(params) {
        return `${this.baseSearchUrl}?${params.toString()}`;
    }

    /**
     * Fetches a page — returns HTML string or null on HTTP error.
     * Throws on network errors or AbortError (handled by caller).
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
     * Extracts the total entry count from the gray header row on the first results page.
     * Returns a number or null if the header is missing/not parsable.
     */
    #extractTotalEntries(doc) {
        const grayTr = doc.querySelector('tr[bgcolor="gray"]');
        if (!grayTr) return null;

        const tds = Array.from(grayTr.querySelectorAll('td'));
        if (tds.length < 5) return null;

        const ofIndex = tds.findIndex(td => td.textContent.trim().toLowerCase().includes('of'));
        if (ofIndex === -1 || ofIndex + 1 >= tds.length) return null;

        const totalText = tds[ofIndex + 1].textContent.trim();
        const num = parseInt(totalText.replace(/[^0-9]/g, ''), 10); // strip any non-digits just in case

        return isNaN(num) ? null : num;
    }

    #parsePageRows(doc) {
        const table = doc.querySelector('table[width="500"]') || doc.querySelector('table[cellspacing="2"][cellpadding="2"]');
        if (!table) return [];

        const rows = Array.from(table.querySelectorAll('tr'));
        const entries = [];

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 7) return;

            const timestampStr = cells[0].textContent.trim();
            const status = cells[4].textContent.trim();
            const sessionTime = cells[6].textContent.trim();

            const dateObj = new Date(timestampStr);
            if (isNaN(dateObj.getTime())) return;

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
     * paginateReportLogs — now with:
     *   • Total count scraped from first page and passed to onProgress as 3rd arg
     *   • AbortSignal support for cancellation (pass as final argument)
     *   • Returns the entries array directly (fixes .map error in NeonovaProgressView)
     *   • Backward-compatible: old onProgress handlers ignoring the 3rd arg still work
     */
    async paginateReportLogs(username, startDate = null, endDate = null, onProgress = null, signal = null) {
        // Legacy argument handling
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
        let total = null;

        while (true) {
            const params = this.#buildPaginationParams(username, sDate, eDate, hitsPerPage, offset);
            const url = this.#buildPageUrl(params);

            let html;
            try {
                html = await this.#fetchPageHtml(url, signal);
            } catch (err) {
                if (err.name === 'AbortError') {
                    console.log('Pagination cancelled by user');
                    // Return whatever was collected so far
                    entries.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
                    return entries;
                }
                console.warn('Unexpected error fetching page:', err);
                break;
            }

            if (html === null) {
                break; // HTTP error
            }

            const doc = new DOMParser().parseFromString(html, 'text/html');

            // Extract total only from the first page
            if (page === 1 && total === null) {
                total = this.#extractTotalEntries(doc);
            }

            const pageEntries = this.#parsePageRows(doc);
            entries.push(...pageEntries);

            // onProgress: (fetchedCount, page, total|null)
            if (typeof onProgress === 'function') {
                onProgress(entries.length, page, total);
            }

            // Termination: incomplete page OR we have reached/exceeded the authoritative total
            if (pageEntries.length < hitsPerPage || (total !== null && entries.length >= total)) {
                break;
            }

            offset += hitsPerPage;
            page++;
        }

        entries.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
        return entries;
    }

    async getLatestEntry(username) {
        try {
            const entries = await this.paginateReportLogs(username);
            return entries.length > 0 ? entries[0] : null;
        } catch (err) {
            console.error('getLatestEntry failed:', err);
            return null;
        }
    }
}
