/**
 * @file src/controllers/BaseNeonovaController.js
 * 
 * Base controller for Neonova RADIUS log operations.
 * Provides core functionality for pagination, fetching, parsing, and searching logs.
 * Extended by dashboard and report controllers.
 */
class BaseNeonovaController {
    /**
     * Initializes the controller with base URL, default form parameters, and constants.
     */
    constructor() {
        // Base URL for all RADIUS admin searches
        this.baseSearchUrl = 'https://admin.neonova.net/rat/index.php';

        // Default form field values used when submitting searches
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
            hits: '100',           // Maximum entries per page supported by the admin interface
            order: 'date',
            submit: 'Search'
        };

        // Pagination constants
        this.HITS_PER_PAGE = 100;                 // Entries requested per page
        this.DELAY_BETWEEN_PAGES_MS = 200;        // Polite delay between page requests (ms)
    }

    /**
     * Fetches all log entries across paginated results for the given username and date range.
     * Primary entry point for full log collection.
     * 
     * @param {string} username - RADIUS username to query
     * @param {Date|null} [startDate=null] - Optional start date (defaults to current month start)
     * @param {Date|null} [endDate=null] - Optional end date (defaults to now)
     * @param {Function|null} [onProgress=null] - Callback: (collected, total, page)
     * @returns {Promise<Array>} Sorted array of cleaned log entries (newest first)
     */
    async paginateReportLogs(username, startDate = null, endDate = null, onProgress = null) {
        // Backward compatibility: allow onProgress as second argument
        if (typeof startDate === 'function') {
            onProgress = startDate;
            startDate = null;
            endDate = null;
        } else if (typeof endDate === 'function') {
            onProgress = endDate;
            endDate = null;
        }

        const now = new Date();
        const rangeStart = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
        const rangeEnd = endDate || now;

        try {
            return await this.#fetchAllLogPages(username, rangeStart, rangeEnd, onProgress);
        } catch (err) {
            console.error('paginateReportLogs failed:', err);
            alert('Report generation failed. Check the browser console for details.');
            return [];   // Fail gracefully with empty result
        }
    }

    /**
     * Gets the most recent RADIUS log entry for the user.
     * Returns null if no entries or on error.
     * 
     * @param {string} username - RADIUS username
     * @returns {Promise<Object|null>} Newest entry or null
     */
    async getLatestEntry(username) {
        try {
            const entries = await this.paginateReportLogs(username);
            
            if (entries.length === 0) {
                console.log(`getLatestEntry(${username}): No entries found`);
                return null;
            }
    
            const newest = entries[0];
            console.log(`getLatestEntry(${username}): Found latest entry at ${newest.timestamp}`);
            return newest;
    
        } catch (err) {
            console.error(`getLatestEntry(${username}) failed:`, err);
            return null;
        }
    }

    // ────────────────────────────────────────────────
    // Private helpers – internal pagination and parsing logic
    // ────────────────────────────────────────────────

    /**
     * Core pagination loop: fetches all pages until completion.
     * Handles total extraction, progress, stop conditions, and rate limiting.
     */
    async #fetchAllLogPages(username, start, end, onProgress) {
        const entries = [];
        let page = 1;
        let offset = 0;
        let knownTotal = null;

        while (true) {
            const url = this.#buildPaginationUrl(username, start, end, offset);
            const html = await this.#fetchPageHtml(url);
            if (!html) break;

            const doc = new DOMParser().parseFromString(html, 'text/html');
            const pageEntries = this.parsePageRows(doc);

            // Extract total count from first page (primary stop condition)
            if (page === 1) {
                knownTotal = this.#extractTotalFromFirstPage(doc);

                if (knownTotal === 0) {
                    break;                    // No results at all
                }
            }

            entries.push(...pageEntries);

            // Report progress to caller
            if (typeof onProgress === 'function') {
                const total = knownTotal !== null ? knownTotal : entries.length;
                onProgress(entries.length, total, page);
            }

            // Primary stop conditions
            if (pageEntries.length < this.HITS_PER_PAGE) break;           // Last page (short)
            if (knownTotal !== null && entries.length >= knownTotal) break; // Reached known total

            // Safety net if total extraction failed
            if (page > 200) break;

            offset += this.HITS_PER_PAGE;
            page++;

            // Be polite to the server
            await new Promise(r => setTimeout(r, this.DELAY_BETWEEN_PAGES_MS));
        }

        return this.#sortNewestFirst(entries);
    }

    /**
     * Builds the full URL for a specific paginated request.
     */
    #buildPaginationUrl(username, start, end, offset) {
        const params = new URLSearchParams({
            acctsearch: '2',
            sd: 'fairpoint.net',
            iuserid: username,
            ip: '',
            session: '',
            nasip: '',
            statusview: 'both',
            syear: start.getFullYear().toString(),
            smonth: (start.getMonth() + 1).toString().padStart(2, '0'),
            sday: start.getDate().toString().padStart(2, '0'),
            shour: '00',
            smin: '00',
            eyear: end.getFullYear().toString(),
            emonth: (end.getMonth() + 1).toString().padStart(2, '0'),
            eday: end.getDate().toString().padStart(2, '0'),
            ehour: '23',
            emin: '59',
            order: 'date',
            hits: this.HITS_PER_PAGE.toString(),
            location: offset.toString(),
            direction: '0',
            dump: ''
        });

        return `${this.baseSearchUrl}?${params.toString()}`;
    }

    /**
     * Fetches a single page's HTML content with appropriate headers.
     * Returns null on failure (non-OK response).
     */
    async #fetchPageHtml(url) {
        const res = await fetch(url, {
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

        if (!res.ok) return null;
        return await res.text();
    }

    /**
     * Extracts the total result count from the first page's status row.
     * Returns null if not found or unparseable.
     */
    #extractTotalFromFirstPage(doc) {
        const statusRow = Array.from(doc.querySelectorAll('tr'))
            .find(tr => tr.textContent.includes('Search Results') && tr.textContent.includes('of'));

        if (!statusRow) return null;

        const cells = statusRow.querySelectorAll('td');
        if (cells.length < 5) return null;

        let totalText = cells[cells.length - 1].textContent
            .trim()
            .replace(/&nbsp;/g, '')
            .replace(/\s+/g, '');

        const total = parseInt(totalText, 10);
        return isNaN(total) ? null : total;
    }

    /**
     * Sorts entries newest to oldest by timestamp.
     */
    #sortNewestFirst(entries) {
        return [...entries].sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
    }

    // ────────────────────────────────────────────────
    // Additional public utilities
    // ────────────────────────────────────────────────

    /**
     * Submits a search form via POST and returns the parsed result document.
     * Used for initial searches or alternative flows.
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
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString(),
            referrer: `${this.baseSearchUrl}?acctsearch=1&userid=${encodeURIComponent(username)}`,
        });

        if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`);

        const html = await res.text();
        return new DOMParser().parseFromString(html, 'text/html');
    }

    /**
     * Parses log entries from a result page document.
     * Extracts timestamp, status, and session time.
     */
    parsePageRows(doc) {
        const table = doc.querySelector('table[width="500"]') || 
                      doc.querySelector('table[cellspacing="2"][cellpadding="2"]');
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

            entries.push({ timestamp: timestampStr, status, sessionTime, dateObj });
        });

        return entries;
    }
}
