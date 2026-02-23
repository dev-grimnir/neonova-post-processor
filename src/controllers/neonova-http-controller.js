// src/controllers/NeonovaHTTPController.js

class NeonovaHTTPController {
    /**************************************************************************
     * STATIC PROPERTIES
     **************************************************************************/

    static baseSearchUrl = 'https://admin.neonova.net/rat/index.php';

    static defaultFormData = {
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

    /**************************************************************************
     * STATIC PRIVATE METHODS — declared first for Tampermonkey compatibility
     **************************************************************************/

    static #buildPaginationParams(username, sDate, eDate, hitsPerPage, offset) {
        console.log("#buildPaginationParams -> START");
        const params = new URLSearchParams({
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
            order: 'date',
            hits: hitsPerPage.toString(),
            location: offset.toString(),
            direction: '0',
            dump: ''
        });
    
        // Critical change: if endDate is null or today, use blank end fields (server's "up to now")
        const now = new Date();
        const isToday = eDate.getFullYear() === now.getFullYear() &&
                        eDate.getMonth() === now.getMonth() &&
                        eDate.getDate() === now.getDate();
    
        if (!eDate || isToday) {
            // Blank end = include everything up to the present moment
            params.append('eyear', '');
            params.append('emonth', '');
            params.append('eday', '');
            params.append('ehour', '');
            params.append('emin', '');
        } else {
            // Explicit end date (for custom reports)
            params.append('eyear', eDate.getFullYear().toString());
            params.append('emonth', (eDate.getMonth() + 1).toString().padStart(2, '0'));
            params.append('eday', eDate.getDate().toString().padStart(2, '0'));
            params.append('ehour', '23');
            params.append('emin', '59');
        }
    
        return params;
    }

    static #buildPageUrl(params) {
        return `${this.baseSearchUrl}?${params.toString()}`;
    }

    /**
     * Fetches a page — returns HTML string or null on HTTP error.
     * Throws on network errors or AbortError (handled by caller).
     */
    static async #fetchPageHtml(url, signal = null) {
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
    static #extractTotalEntries(doc) {
    
        // Scope search to likely header areas (first few tables or top 2000 chars)
        const bodyText = doc.body.textContent || '';
        const headerText = bodyText.substring(0, 5000);  // Limit to top of page
    
        // Tight regexes - match known patterns from your sample
        const patterns = [
            /Entry:\s*\d+-\d+\s*of\s*([\d,]+)/i,              // "Entry: 1-100 of 484"
            /of\s*([\d,]+)/i,                                 // "of 484"
            /Results\s*of\s*([\d,]+)/i,                       // "Search Results of 484"
            /Displaying.*?of\s*([\d,]+)/i,                    // fallback
            /Total.*?([\d,]+)/i                               // broad fallback
        ];
    
        for (const regex of patterns) {
            const match = headerText.match(regex);
            if (match && match[1]) {
                // Clean commas and parse
                const cleaned = match[1].replace(/,/g, '');
                const total = parseInt(cleaned, 10);
                if (!isNaN(total) && total > 0) {
                    return total;
                }
            }
        }
    
        return null;
    }

    static #parsePageRows(doc) {
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

            const dateObj = new Date(timestampStr + ' EST');
            dateObj.setTime(dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000) + (5 * 3600000));

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
     * STATIC PUBLIC METHODS
     **************************************************************************/

    static async safeFetch(url, options = {}) {
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

    static async submitSearch(username, overrides = {}) {
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

    static findNextPageLink(doc) {
        return Array.from(doc.querySelectorAll('a'))
            .find(a => a.textContent.trim().startsWith('NEXT @') && a.href && a.href.includes('index.php'));
    }

    static getSearchUrl(username) {
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
     *   • Returns the entries array directly
     *   • Backward-compatible: old onProgress handlers ignoring the 3rd arg still work
     */
    static async paginateReportLogs(username, startDate = null, endDate = null, onProgress = null, signal = null) {
        console.log('[paginateReportLogs] === START ===', { username, startDate: startDate?.toISOString(), endDate: endDate?.toISOString() });
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

        console.log('[paginateReportLogs] Using date range:', { sDate: sDate.toISOString(), eDate: eDate.toISOString() });

        while (true) {
            const params = this.#buildPaginationParams(username, sDate, eDate, hitsPerPage, offset);
            const url = this.#buildPageUrl(params);
            console.log(`[paginateReportLogs] Fetching page ${page} (offset ${offset}) → ${url}`);
            let html;
            try {
                html = await this.#fetchPageHtml(url, signal);
            } catch (err) {
                if (err.name === 'AbortError') {
                    // Return whatever was collected so far
                    entries.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
                    return entries;
                }
                console.warn('Unexpected error fetching page:', err);
                break;
            }

            if (html === null) {
                console.log('[paginateReportLogs] HTTP error on page', page, '- stopping');
                break; // HTTP error
            }

            const doc = new DOMParser().parseFromString(html, 'text/html');

            // Extract total only from the first page
            if (page === 1 && total === null) {
                console.log('[paginateReportLogs] Total extracted from page 1:', total);
                total = this.#extractTotalEntries(doc);
                
            }

            const pageEntries = this.#parsePageRows(doc);
            console.log(`[paginateReportLogs] Page ${page} parsed ${pageEntries.length} entries`);
            entries.push(...pageEntries);

            // onProgress: (fetchedCount, page, total|null)
            if (typeof onProgress === 'function') {
                onProgress(entries.length, page, total);
            }

            // Termination: incomplete page OR we have reached/exceeded the authoritative total
        if (pageEntries.length < hitsPerPage) {
            console.log(`[paginateReportLogs] Incomplete page detected on page ${page} (${pageEntries.length} entries) - stopping`);
            break;
        }
        if (total !== null && entries.length >= total) {
            console.log(`[paginateReportLogs] Reached total count on page ${page} - stopping`);
            break;
        }

            offset += hitsPerPage;
            page++;
        }

        //console.log(`[paginateReportLogs] === END === No sort applied. Total entries: ${entries.length}`);
        //console.log('[paginateReportLogs] Last parsed page had', pageEntries.length, 'entries');  // ← This line is the culprit — remove or comment it out
        // Comment or remove the above line for now
        // console.log('[paginateReportLogs] === END === No sort applied. Total entries: ${entries.length}');

        // Log the very last entry we received (should be the newest)
        if (entries.length > 0) {
            console.log('[paginateReportLogs] Last entry in result set (should be newest):', 
                entries[entries.length - 1].timestamp, entries[entries.length - 1].status);
        }

        return entries;
    }

    static async getLatestEntry(username) {
    try {
        const now = new Date();
        const startDate = new Date(now.getTime() - (30 * 24 * 3600 * 1000));
        const endDate = now;

        console.log('[getLatestEntry] Fetching 30-day range for latest:', {
            start: startDate.toISOString(),
            end: endDate.toISOString()
        });

        const entries = await this.paginateReportLogs(
            username,
            startDate,
            endDate
        );

        console.log('[getLatestEntry] Fetched', entries.length, 'entries over 30 days');

        if (entries.length === 0) {
            console.log('[getLatestEntry] No entries — returning null');
            return null;
        }

        // NO SORT — trust the server's natural order (last entry should be newest)
        const newest = entries[entries.length - 1];
        console.log('[getLatestEntry] *** FINAL NEWEST ENTRY (from last in array) ***', {
            timestamp: newest.timestamp,
            status: newest.status,
            dateObj: newest.dateObj.toISOString(),
            dateObjMs: newest.dateObj.getTime()
        });

        if (entries.length > 1) {
            console.log('[getLatestEntry] Second last (for comparison):', {
                timestamp: entries[entries.length - 2].timestamp,
                status: entries[entries.length - 2].status,
                dateObj: entries[entries.length - 2].dateObj.toISOString()
            });
        }

        return newest;
    } catch (err) {
        console.error('[getLatestEntry] failed:', err);
        return null;
    }
}
}
