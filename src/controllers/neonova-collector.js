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
            console.warn('[Collector] No table set for extraction — returning empty array');
            console.groupEnd();
            return [];
        }
    
        console.log('[Collector] Table reference exists:', !!this.table);
        console.log('[Collector] Table outerHTML snippet:', this.table.outerHTML.substring(0, 200) + '...');
    
        // Find all <tr> inside the table (try both tbody and direct children)
        const rows = this.table.querySelectorAll("tbody tr");
        console.log(`[Collector] Found ${rows.length} rows via tbody tr`);
    
        // Fallback: if no tbody rows, try direct tr children
        if (rows.length === 0) {
            const fallbackRows = this.table.querySelectorAll("tr");
            console.log(`[Collector] Fallback: Found ${fallbackRows.length} direct tr elements`);
            if (fallbackRows.length > 0) {
                console.log('[Collector] Using fallback direct tr rows');
                rows = fallbackRows; // reassign for processing
            }
        }
    
        const newEntries = [];
    
        rows.forEach((row, index) => {
            console.group(`[Row ${index + 1}]`);
    
            const cells = row.querySelectorAll("td");
            console.log(`  Cells in row: ${cells.length}`);
    
            if (cells.length < 7) {
                console.log(`  Skipping row — too few cells (${cells.length} < 7)`);
                console.groupEnd();
                return;
            }
    
            const dateStr = cells[0].textContent.trim();
            const status = cells[4].textContent.trim();
    
            console.log(`  Raw date cell: "${cells[0].textContent}" → trimmed: "${dateStr}"`);
            console.log(`  Raw status cell: "${cells[4].textContent}" → trimmed: "${status}"`);
    
            if ((status === "Start" || status === "Stop") && dateStr) {
                console.log('  Status is valid (Start/Stop) and dateStr exists');
    
                const isoDateStr = dateStr.replace(" ", "T");
                console.log(`  Converted date string: "${isoDateStr}"`);
    
                const date = new Date(isoDateStr);
                console.log(`  Parsed date: ${date.toISOString()} | isValid: ${!isNaN(date.getTime())}`);
    
                if (!isNaN(date.getTime())) {
                    console.log('  Valid date — adding LogEntry');
                    newEntries.push(new LogEntry(date.getTime(), status, date));
                } else {
                    console.warn('  Invalid date — skipped');
                }
            } else {
                console.log('  Skipped: invalid status or no date string');
            }
    
            console.groupEnd();
        });
    
        console.log(`[Collector] Extracted ${newEntries.length} valid entries from page`);
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
