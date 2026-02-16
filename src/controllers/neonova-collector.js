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
        const rows = document.querySelectorAll("table tbody tr");
        const newEntries = [];

        rows.forEach(row => {
            const cells = row.querySelectorAll("td");
            if (cells.length < 7) return;

            const dateStr = cells[0].textContent.trim();
            const status = cells[4].textContent.trim();

            if ((status === "Start" || status === "Stop") && dateStr) {
                // Convert space-separated date to ISO-like for reliable parsing
                const isoDateStr = dateStr.replace(" ", "T");
                const date = new Date(isoDateStr);

                if (!isNaN(date)) {
                    newEntries.push(new LogEntry(date.getTime(), status, date));
                }
            }
        });

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
