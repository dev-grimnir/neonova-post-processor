/**
 * @file src/utils/neonova-http-paginator.js
 * Static utility class responsible exclusively for HTTP pagination and raw data extraction.
 * 
 * Responsibilities:
 * - Build pagination URLs
 * - Fetch HTML pages (with abort support)
 * - Parse DOM
 * - Select the correct log table
 * - Extract raw LogEntry objects from each page
 * - Accumulate and return the complete array of raw entries
 * 
 * This class has NO knowledge of cleaning, deduplication, analysis, or rendering.
 * It returns only raw LogEntry[] for downstream processing.
 */
class NeonovaHttpPaginator {

    /** Base URL for the RADIUS admin interface */
    static BASE_URL = 'https://admin.neonova.net/rat/index.php';

    /** Fixed hits per page (server default) */
    static HITS_PER_PAGE = 100;

    /**
     * Fetches all raw log entries for a user within the given date range.
     * 
     * @param {string} username - The RADIUS username (e.g. 'greenlan')
     * @param {Date} start - Start date (inclusive)
     * @param {Date} end - End date (inclusive, up to 23:59:59)
     * @param {Object} [options]
     * @param {AbortSignal} [options.signal] - Optional AbortSignal for cancellation
     * @param {(progress: { fetched: number, total?: number, page: number }) => void} [options.onProgress] - Progress callback
     * @returns {Promise<{ rawEntries: LogEntry[], totalReported?: number }>}
     */
    static async fetchAllRawEntries(username, start, end, options = {}) {
        const { signal, onProgress } = options;

        const allRawEntries = [];
        let offset = 0;
        let page = 1;
        let knownTotal = null;

        while (true) {
            if (signal?.aborted) {
                throw new DOMException('Pagination aborted', 'AbortError');
            }

            const url = this.#buildPaginationUrl(username, start, end, offset);
            console.log(`[HttpPaginator] Fetching page ${page} (offset ${offset}) → ${url}`);

            const html = await this.#fetchPageHtml(url, signal);

            if (!html) {
                console.warn('[HttpPaginator] Empty HTML response — stopping');
                break;
            }

            const doc = new DOMParser().parseFromString(html, 'text/html');

            // Select the correct log table
            const table = this.#selectLogTable(doc);
            if (!table) {
                console.warn('[HttpPaginator] No log table found on page — stopping');
                break;
            }

            // Extract raw entries from this page's table
            const pageEntries = this.#extractRawEntriesFromTable(table);

            allRawEntries.push(...pageEntries);

            console.log(`[HttpPaginator] Page ${page} extracted ${pageEntries.length} raw entries (cumulative: ${allRawEntries.length})`);

            // On first page, try to extract the reported total
            if (page === 1) {
                knownTotal = this.#extractReportedTotal(doc);
                console.log(`[HttpPaginator] Server reported total entries: ${knownTotal ?? 'unknown'}`);
            }

            // Progress callback
            if (typeof onProgress === 'function') {
                onProgress({
                    fetched: allRawEntries.length,
                    total: knownTotal,
                    page
                });
            }

            // Stop conditions
            const tableRowCount = table.querySelectorAll('tr').length - 1; // subtract header
            if (pageEntries.length < this.HITS_PER_PAGE || tableRowCount < this.HITS_PER_PAGE) {
                console.log('[HttpPaginator] Last page detected (fewer than 100 entries)');
                break;
            }

            if (knownTotal !== null && allRawEntries.length >= knownTotal) {
                console.log(`[HttpPaginator] Reached reported total (${allRawEntries.length}/${knownTotal}) — stopping`);
                break;
            }

            // Next page
            offset += this.HITS_PER_PAGE;
            page++;
        }

        console.log(`[HttpPaginator] Pagination complete — ${allRawEntries.length} raw entries fetched (${page} pages)`);

        return {
            rawEntries: allRawEntries,
            totalReported: knownTotal
        };
    }

    /**
     * Builds the pagination URL with all required parameters.
     * @private
     */
    static #buildPaginationUrl(username, start, end, offset = 0) {
        const params = new URLSearchParams({
            acctsearch: '2',
            sd: 'fairpoint.net',
            iuserid: username,
            ip: '',
            session: '',
            nasip: '',
            statusview: 'both',
            syear: start.getFullYear().toString(),
            smonth: String(start.getMonth() + 1).padStart(2, '0'),
            sday: String(start.getDate()).padStart(2, '0'),
            shour: '00',
            smin: '00',
            eyear: end.getFullYear().toString(),
            emonth: String(end.getMonth() + 1).padStart(2, '0'),
            eday: String(end.getDate()).padStart(2, '0'),
            ehour: '23',
            emin: '59',
            order: 'date',
            hits: this.HITS_PER_PAGE.toString(),
            location: offset.toString(),
            direction: '0',
            dump: ''
        });

        return `${this.BASE_URL}?${params.toString()}`;
    }

    /**
     * Fetches a single page's HTML.
     * @private
     */
    static async #fetchPageHtml(url, signal) {
        try {
            const response = await fetch(url, {
                signal,
                credentials: 'include'  // Important for session cookies
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.text();
        } catch (err) {
            if (err.name === 'AbortError') throw err;
            console.error('[HttpPaginator] Fetch failed:', err);
            return null;
        }
    }

    /**
     * Selects the correct log results table from the document.
     * @private
     */
    static #selectLogTable(doc) {
        let table = null;

        // Primary: table containing "[Date]" header
        const candidates = doc.querySelectorAll('table[cellspacing="2"][cellpadding="2"]');
        for (const t of candidates) {
            if (t.innerHTML.includes('[Date]')) {
                table = t;
                break;
            }
        }

        // Fallback: width="500"
        if (!table) {
            table = doc.querySelector('table[width="500"][cellspacing="2"][cellpadding="2"]');
        }

        return table;
    }

    /**
     * Extracts raw LogEntry objects from a single table.
     * @private
     */
    static #extractRawEntriesFromTable(table) {
        let rows = table.querySelectorAll('tbody tr');
        if (rows.length === 0) {
            rows = table.querySelectorAll('tr');
        }

        const entries = [];

        rows.forEach(row => {
            // Skip obvious header/info rows
            if (row.innerHTML.includes('[Date]') || row.cells.length < 7) {
                return;
            }

            const cells = row.cells;
            const dateText = cells[0].textContent.trim();
            const statusText = cells[4].textContent.trim();

            if ((statusText === 'Start' || statusText === 'Stop') && dateText) {
                const iso = dateText.replace(/\s+/g, 'T');
                const date = new Date(iso);

                if (!isNaN(date.getTime())) {
                    entries.push(new LogEntry(date.getTime(), statusText, date));
                }
            }
        });

        return entries;
    }

    /**
     * Attempts to extract the server's reported total entry count from the first page.
     * @private
     */
    static #extractReportedTotal(doc) {
        // Example: look for text like "Total Records: 392" or similar pattern
        const totalText = doc.body.textContent.match(/Total Records?:\s*(\d+)/i);
        return totalText ? parseInt(totalText[1], 10) : null;
    }
}
