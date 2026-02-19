/**
 * @file src/controllers/neonova-collector.js
 * Handles page scraping, pagination, and entry cleaning
 * @requires ../models/log-entry
 */
class NeonovaCollector {
    constructor() {
        this.analysisMode = localStorage.getItem('novaAnalysisMode') === 'true';
        this.allEntries = JSON.parse(localStorage.getItem('novaEntries') || '[]');
        this.pages = parseInt(localStorage.getItem('novaPages') || '0');
        this.table = document.querySelector('table[cellspacing="2"][cellpadding="2"]');
    }

    /**
     * Scrapes the current page for valid log entries and appends them to the persisted collection.
     * This is the main method called on each paginated page during analysis.
     */
    collectFromPage() {
        if (!this.table) return;

        const newEntries = this.#extractEntriesFromCurrentPage();
        if (newEntries.length > 0) {
            this.allEntries.push(...newEntries);
            this.#saveProgress();
        }
    }

    /**
     * Starts a new analysis session by resetting all persisted state and reloading the page.
     */
    startAnalysis() {
        localStorage.setItem('novaAnalysisMode', 'true');
        this.pages = 0;
        this.allEntries = [];
        this.#saveProgress();
        location.reload();
    }

    /**
     * Attempts to navigate to the next pagination page.
     * Returns true if a next page link was found and clicked, false otherwise.
     */
    advancePage() {
        const nextLink = this.#findNextPageLink();
        if (nextLink) {
            this.pages++;
            this.#saveProgress();
            setTimeout(() => nextLink.click(), 10);
            return true;
        }
        return false;
    }

    /**
     * Cleans and normalizes a full array of entries.
     * Returns both the cleaned entries AND the count of ignored duplicates.
     */
    cleanEntries(entries) {
        if (!entries || entries.length === 0) {
            return { cleaned: [], ignoredCount: 0 };
        }

        let normalized = this.#normalizeEntries(entries);
        normalized = this.#sortEntries(normalized);
        const result = this.#deduplicateEntries(normalized);

        return result;   // { cleaned, ignoredCount }
    }

    /**
     * Returns the number of pages processed so far.
     */
    getPages() {
        return this.pages;
    }

    /**
     * Ends the analysis session by clearing all persisted state.
     */
    endAnalysis() {
        localStorage.removeItem('novaAnalysisMode');
        localStorage.removeItem('novaPages');
        localStorage.removeItem('novaEntries');
    }

    // ────────────────────────────────────────────────
    // Private helpers — focused, single-responsibility methods
    // ────────────────────────────────────────────────

    /**
     * Extracts valid log entries from the current page's table.
     * Returns an array of new LogEntry objects (does not mutate state).
     */
    #extractEntriesFromCurrentPage() {
        console.groupCollapsed('[Collector] extractEntriesFromCurrentPage()');
    
        if (!this.table) {
            console.warn('[Collector] No table set');
            console.groupEnd();
            return [];
        }
    
        console.log('[Collector] Table OK — attrs:', this.table.outerHTML.match(/<table[^>]*>/)[0]);
    
        let rows = this.table.querySelectorAll("tbody tr");
        console.log(`[Collector] tbody tr rows: ${rows.length}`);
    
        if (rows.length === 0) {
            rows = this.table.querySelectorAll("tr");
            console.log(`[Collector] direct tr fallback: ${rows.length}`);
        }
    
        if (rows.length === 0) {
            console.warn('[Collector] Zero rows — table snippet:', this.table.innerHTML.substring(0, 500) + '...');
            console.groupEnd();
            return [];
        }
    
        const newEntries = [];
    
        rows.forEach((row, i) => {
            console.group(`[Row ${i+1}] Raw HTML: ${row.outerHTML.substring(0, 300) + (row.outerHTML.length > 300 ? '...' : '')}`);
    
            const cells = row.querySelectorAll("td");
            console.log(`  → ${cells.length} <td> cells`);
    
            if (cells.length < 7) {
                console.log('  → Skipped: <7 cells');
                console.groupEnd();
                return;
            }
    
            const dateTd = cells[0];
            const statusTd = cells[4];
    
            const dateRaw = dateTd.innerHTML.trim();
            const statusRaw = statusTd.innerHTML.trim();
    
            console.log(`  Date cell innerHTML: "${dateRaw}"`);
            console.log(`  Status cell innerHTML: "${statusRaw}"`);
    
            const dateText = dateTd.textContent.trim();
            const statusText = statusTd.textContent.trim();
    
            console.log(`  Date textContent: "${dateText}"`);
            console.log(`  Status textContent: "${statusText}"`);
    
            if ((statusText === "Start" || statusText === "Stop") && dateText) {
                console.log('  → Valid status + date — parsing');
    
                const iso = dateText.replace(/\s+/g, 'T');
                console.log(`  → ISO attempt: "${iso}"`);
    
                const date = new Date(iso);
                const valid = !isNaN(date.getTime());
    
                console.log(`  → Parsed date: ${valid ? date.toISOString() : 'INVALID'}`);
    
                if (valid) {
                    console.log('  → SUCCESS: LogEntry added');
                    newEntries.push(new LogEntry(date.getTime(), statusText, date));
                } else {
                    console.warn('  → Date parse failed');
                }
            } else {
                console.log('  → Skip: bad status or no date');
            }
    
            console.groupEnd();
        });
    
        console.log(`[Collector] Final valid entries: ${newEntries.length}`);
        console.groupEnd();
    
        return newEntries;
    }

    /**
     * Finds the "NEXT @" pagination link on the current page.
     * Returns the <a> element or null.
     */
    #findNextPageLink() {
        return Array.from(document.querySelectorAll('a'))
            .find(a => a.textContent.trim().startsWith('NEXT @') && a.href && a.href.includes('index.php'));
    }

    /**
     * Normalizes LogEntry objects to a simple comparable format.
     * Filters out any with invalid dates.
     */
    #normalizeEntries(entries) {
        return entries
            .map(entry => {
                const dateMs = entry.dateObj.getTime();
                if (isNaN(dateMs)) return null;

                return {
                    date: dateMs,
                    status: entry.status,
                    dateObj: entry.dateObj
                };
            })
            .filter(entry => entry !== null);
    }

    /**
     * Sorts entries chronologically (oldest first).
     */
    #sortEntries(entries) {
        return [...entries].sort((a, b) => a.date - b.date);
    }

    /**
     * Removes consecutive duplicate statuses and counts how many were ignored.
     * Preserves the first occurrence in each run of identical statuses.
     */
    #deduplicateEntries(entries) {
        if (entries.length <= 1) return { cleaned: entries, ignoredCount: 0 };

        const cleaned = [entries[0]];
        let ignoredCount = 0;

        for (let i = 1; i < entries.length; i++) {
            const current = entries[i];
            const previous = cleaned[cleaned.length - 1];

            if (current.status !== previous.status) {
                cleaned.push(current);
            } else {
                ignoredCount++;
            }
        }

        return { cleaned, ignoredCount };
    }

    /**
     * Persists current scraping progress to localStorage.
     */
    #saveProgress() {
        localStorage.setItem('novaEntries', JSON.stringify(this.allEntries));
        localStorage.setItem('novaPages', this.pages.toString());
    }
}
