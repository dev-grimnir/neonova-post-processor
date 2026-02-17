// src/controllers/BaseNeonovaController.js

class BaseNeonovaController {
    constructor() {
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
            hits: '100',           // ← changed to 100 as you want
            order: 'date',
            submit: 'Search'
        };

        // Constants
        this.HITS_PER_PAGE = 100;
        this.DELAY_BETWEEN_PAGES_MS = 200;   // you said max 500ms is acceptable
    }

    /**
     * Core method: Paginates through ALL RADIUS log pages for a given username within a date range.
     * 
     * This is the single most important method in the project — almost every report, dashboard stat,
     * stability score, and long-disconnect list starts here. It handles:
     *   - Legacy callback-only calling style (for backward compatibility)
     *   - Automatic default range (current month → now)
     *   - Progress reporting during long fetches
     *   - Graceful error handling with user feedback
     *   - Delegation to the private paginator (#fetchAllLogPages)
     * 
     * @param {string} username - The RADIUS username (e.g., "elray1287") to search logs for
     * @param {Date|null} [startDate=null] - Optional start of the date range.
     *                                       Defaults to first day of current month.
     * @param {Date|null} [endDate=null] - Optional end of the date range.
     *                                     Defaults to current date/time.
     * @param {Function|null} [onProgress=null] - Optional callback for real-time progress updates.
     *                                            Signature: (collectedCount, estimatedTotal, currentPage) => void
     * 
     * @legacy-support This method supports the old callback-only style:
     *   - paginateReportLogs(username, onProgress)
     *   - paginateReportLogs(username, startDate, onProgress)
     *   These still work and are converted internally to the modern signature.
     * 
     * @returns {Promise<Array<Object>>} Promise that resolves to an array of log entry objects,
     *                                   sorted newest-first. Each object typically contains:
     *                                   - timestamp (string)
     *                                   - status ("Start" | "Stop")
     *                                   - sessionTime (string)
     *                                   - dateObj (Date)
     *                                   Returns empty array [] on any error (never rejects).
     * 
     * @throws Never rejects — all errors are caught, logged, and shown to the user via alert.
     *         Returns [] instead so the rest of the app doesn't crash.
     */
    async paginateReportLogs(username, startDate = null, endDate = null, onProgress = null) {
        // ────────────────────────────────────────────────
        // 1. Legacy callback support (backward compatibility)
        // ────────────────────────────────────────────────
        // Older callers used callback-only style, e.g.:
        //   paginateReportLogs("user", (progress) => {...})
        // or
        //   paginateReportLogs("user", someStartDate, (progress) => {...})
        // We detect and normalize these to the modern signature.
        if (typeof startDate === 'function') {
            onProgress = startDate;
            startDate = null;
            endDate = null;
        } else if (typeof endDate === 'function') {
            onProgress = endDate;
            endDate = null;
        }

        // ────────────────────────────────────────────────
        // 2. Determine the date range
        // ────────────────────────────────────────────────
        // Default: current month start → right now
        // This ensures we always have a sensible range even if caller provides nothing.
        const now = new Date();
        const rangeStart = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
        const rangeEnd = endDate || now;

        // ────────────────────────────────────────────────
        // 3. Execute the paginated fetch with error safety net
        // ────────────────────────────────────────────────
        try {
            // Delegate to the private worker method that handles actual pagination,
            // page delays, total extraction, progress callbacks, etc.
            return await this.#fetchAllLogPages(username, rangeStart, rangeEnd, onProgress);
        } catch (err) {
            // ────────────────────────────────────────────────
            // 4. Failure handling — never let the app crash
            // ────────────────────────────────────────────────
            // Log full error for debugging (console.error preserves stack trace)
            console.error('paginateReportLogs failed:', err);

            // Show user-friendly message (only alert once per failure)
            alert('Report generation failed. Check the browser console for details.');

            // Return empty array so downstream code (scoring, views, charts) can continue
            // gracefully instead of throwing unhandled promise rejections.
            return [];
        }
    }

    /**
     * Gets the most recent RADIUS log entry for the user.
     * Returns null if no entries or on error.
     * 
     * @param {string} username
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
            // Optional: show user-friendly alert only on dashboard path
            // alert(`Failed to get status for ${username}. Check console.`);
            return null;
        }
    }

    /**
     * Recursively fetches all paginated log pages and aggregates entries.
     * @private
     * @param {string} username
     * @param {Date} start
     * @param {Date} end
     * @param {Function} [onProgress]
     * @returns {Promise<Array<Object>>}
     */
    async #fetchAllLogPages(username, start, end, onProgress) {
        const entries = [];
        let page = 1;
        let offset = 0;
        let knownTotal = null;

        while (true) {
            const url = this.#buildPaginationUrl(username, start, end, offset);
            const html = await this.#fetchPageHtml(url);
            if (!html) {
                console.log("BaseNeonovaController.#fetchAllLogPages -> Not HTML Ending pagination.");
                break;
            }

            const doc = new DOMParser().parseFromString(html, 'text/html');
            const pageEntries = this.parsePageRows(doc);

            // First page: extract total count (primary stop condition)
            if (page === 1) {
                knownTotal = this.#extractTotalFromFirstPage(doc);

                if (knownTotal === 0) {
                    break;
                }
            }

            entries.push(...pageEntries);

            // Progress callback (now using collected first, total second – more conventional)
            if (typeof onProgress === 'function') {
                const total = knownTotal !== null ? knownTotal : entries.length;
                onProgress(entries.length, total, page);
            }

            // Stop conditions
            if (pageEntries.length < this.HITS_PER_PAGE) {
                console.log("BaseNeonovaController.#fetchallLogPages() -> less entries than 100.  Ending pagination.");
                break;           // last page
            }
            
            if (knownTotal !== null && entries.length >= knownTotal) {
                console.log("BaseNeonovaController.#fetchallLogPages() -> length is greater than or equal to known total.  Ending pagination.");
                break; // reached total
            }
            

            // Safety: prevent infinite loop if total never parsed
            if (page > 200) break;

            offset += this.HITS_PER_PAGE;
            page++;

            await new Promise(r => setTimeout(r, this.DELAY_BETWEEN_PAGES_MS));
        }

        return this.#sortNewestFirst(entries);
    }

    /**
     * Builds the full pagination URL with query parameters.
     * @private
     * @param {string} username
     * @param {Date} start
     * @param {Date} end
     * @param {number} offset
     * @returns {string} Full URL
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
     * Fetches HTML for a single search results page.
     * @private
     * @param {string} url
     * @returns {Promise<string|null>} HTML string or null on failure
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
     * Extracts the total number of log entries from the first page's status row.
     * @private
     * @param {Document} doc
     * @returns {number|null} Total count or null if not found
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
     * Sorts entries newest first by timestamp.
     * @private
     * @param {Array<Object>} entries
     * @returns {Array<Object>}
     */
    #sortNewestFirst(entries) {
        return [...entries].sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
    }
        
    /**
     * Submits a search form for a username with optional overrides.
     * @param {string} username
     * @param {Object} [overrides={}] - Optional form field overrides
     * @returns {Promise<Document>} Parsed HTML document
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
     * Parses log entry rows from a search results table.
     * @param {Document} doc
     * @returns {Array<Object>} Array of entry objects with timestamp, status, sessionTime, dateObj
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
