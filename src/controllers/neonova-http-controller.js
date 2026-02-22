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

    static async getLatestEntry(username) {
        try {
            // Build params for MOST RECENT page only
            const params = new URLSearchParams({
                acctsearch: '2',
                sd: 'fairpoint.net',
                iuserid: username,
                ip: '',
                session: '',
                nasip: '',
                statusview: 'both',
                // No start date — let site default to oldest, but we only take first page
                shour: '00',
                smin: '00',
                // Blank end = up to now
                emonth: '',
                eday: '',
                eyear: '',
                ehour: '',
                emin: '',
                hits: '100',  // Enough for recent activity
                order: 'date',  // Hopefully descending
                location: '0',
                direction: '0',
                dump: ''
            });
    
            const url = `https://admin.neonova.net/rat/index.php?${params}`;
            console.log('[getLatestEntry] Fetching recent page only:', url);
    
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
    
            if (!res.ok) {
                console.warn('[getLatestEntry] HTTP error:', res.status);
                return null;
            }
    
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
    
            const pageEntries = this.#parsePageRows(doc);
            console.log('[getLatestEntry] Parsed', pageEntries.length, 'entries from recent page');
    
            if (pageEntries.length === 0) {
                console.log('[getLatestEntry] No entries on recent page');
                return null;
            }
    
            // Sort this single page newest-first
            pageEntries.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
    
            const newest = pageEntries[0];
            console.log('[getLatestEntry] Newest from recent page:', {
                timestamp: newest.timestamp,
                status: newest.status,
                dateObj: newest.dateObj?.toISOString()
            });
    
            // Optional: log second for sanity
            if (pageEntries.length > 1) {
                console.log('[getLatestEntry] Second newest:', {
                    timestamp: pageEntries[1].timestamp,
                    status: pageEntries[1].status
                });
            }
    
            return newest;
        } catch (err) {
            console.error('[getLatestEntry] failed:', err);
            return null;
        }
    }
}
