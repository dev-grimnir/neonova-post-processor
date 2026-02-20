class NeonovaCollector {
    // Remove constructor, table, localStorage stuff, collectFromPage, etc.
    // Keep only what's needed for cleaning

    static cleanEntries(entries) {
    if (!entries || entries.length === 0) {
        return { cleaned: [], ignoredCount: 0 };
    }

    console.log('[Collector Debug] Input entries count:', entries.length);
    console.log('[Collector Debug] First 5 statuses:', entries.slice(0, 5).map(e => e.status));
    console.log('[Collector Debug] Last 5 statuses:', entries.slice(-5).map(e => e.status));

    let normalized = this.#normalizeEntries(entries);
    normalized = this.#sortEntries(normalized);

    console.log('[Collector Debug] After normalize/sort:', normalized.length);

    const result = this.#deduplicateEntries(normalized);

    console.log('[Collector Debug] After dedup — cleaned count:', result.cleaned.length);
    console.log('[Collector Debug] Ignored count:', result.ignoredCount);
    console.log('[Collector Debug] First 5 cleaned statuses:', result.cleaned.slice(0, 5).map(e => e.status));
    console.log('[Collector Debug] Last 5 cleaned statuses:', result.cleaned.slice(-5).map(e => e.status));

    // TEMP: Check for any consecutive duplicates remaining
    let consec = 0;
    for (let i = 1; i < result.cleaned.length; i++) {
        if (result.cleaned[i].status === result.cleaned[i-1].status) {
            consec++;
            console.log(`[Collector Debug] Remaining consecutive duplicate at index ${i}: ${result.cleaned[i].status}`);
        }
    }
    console.log('[Collector Debug] Remaining consecutive duplicates after dedup:', consec);

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

    static #sortEntries(entries) {
        return [...entries].sort((a, b) => a.date - b.date);
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
