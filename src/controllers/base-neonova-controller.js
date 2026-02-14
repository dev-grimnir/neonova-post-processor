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
        this.DELAY_BETWEEN_PAGES_MS = 500;   // you said max 500ms is acceptable
    }

    // ────────────────────────────────────────────────
    // Public API – kept exactly the same as before
    // ────────────────────────────────────────────────

    async paginateReportLogs(username, startDate = null, endDate = null, onProgress = null) {
        // Legacy support
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
            return [];   // return empty instead of crashing everything
        }
    }

    async getLatestEntry(username) {
        try {
            const entries = await this.paginateReportLogs(username);
            return entries[0] || null;
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    // ────────────────────────────────────────────────
    // Private helpers – clean and focused
    // ────────────────────────────────────────────────

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

            // First page: extract total count (primary stop condition)
            if (page === 1) {
                knownTotal = this.#extractTotalFromFirstPage(doc);

                if (knownTotal === 0) {
                    break;                    // no results
                }
            }

            entries.push(...pageEntries);

            // Progress callback (now using collected first, total second – more conventional)
            if (typeof onProgress === 'function') {
                const total = knownTotal !== null ? knownTotal : entries.length;
                onProgress(entries.length, total, page);
            }

            // Stop conditions
            if (pageEntries.length < this.HITS_PER_PAGE) break;           // last page
            if (knownTotal !== null && entries.length >= knownTotal) break; // reached total

            // Safety: prevent infinite loop if total never parsed
            if (page > 200) break;

            offset += this.HITS_PER_PAGE;
            page++;

            await new Promise(r => setTimeout(r, this.DELAY_BETWEEN_PAGES_MS));
        }

        return this.#sortNewestFirst(entries);
    }

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

    #sortNewestFirst(entries) {
        return [...entries].sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
    }

    // ────────────────────────────────────────────────
    // Other existing methods (cleaned up slightly)
    // ────────────────────────────────────────────────

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
