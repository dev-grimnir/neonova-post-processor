class NeonovaCollector {
    // Remove constructor, table, localStorage stuff, collectFromPage, etc.
    // Keep only what's needed for cleaning

    static cleanEntries(entries) {
        if (!entries || entries.length === 0) {
            return { cleaned: [], ignoredCount: 0 };
        }
    
        let normalized = this.#normalizeEntries(entries);
        const result = this.#deduplicateEntries(normalized);
    
        // TEMP: Check for any consecutive duplicates remaining
        let consec = 0;
        for (let i = 1; i < result.cleaned.length; i++) {
            if (result.cleaned[i].status === result.cleaned[i-1].status) {
                consec++;
            }
        }
    
        return result;
    }

    static #normalizeEntries(entries) {
        return entries
            .map(entry => {
                const dateMs = entry.dateObj.getTime();
                if (isNaN(dateMs)) return null;
                return { date: dateMs, status: entry.status, dateObj: entry.dateObj };
            })
            .filter(entry => entry !== null);
    }

    static #deduplicateEntries(entries) {
        if (entries.length <= 1) return { cleaned: entries, ignoredCount: 0 };

        const cleaned = [entries[0]];
        let ignoredCount = 0;

        for (let i = 1; i < entries.length; i++) {
            if (entries[i].status !== cleaned[cleaned.length - 1].status) {
                cleaned.push(entries[i]);
            } else {
                ignoredCount++;
            }
        }

        return { cleaned, ignoredCount };
    }
}
