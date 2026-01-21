/**
 * Reusable function to paginate NeoNova log tables and collect parsed entries.
 * Follows "NEXT @" links until no more pages.
 * Returns array of { timestamp, status, sessionTime, dateObj } — newest first.
 * 
 * @param {string} baseUrl - Starting URL (e.g., acctsearch with userid)
 * @param {number} [maxPages=50] - Safety limit
 * @returns {Promise<Array<{timestamp: string, status: 'Start'|'Stop', sessionTime: string, dateObj: Date}>>}
 */
async function paginateAndParseLogs(baseUrl, maxPages = 50) {
    const entries = [];
    let url = baseUrl;
    let page = 1;

    while (url && page <= maxPages) {
        console.log(`Fetching log page ${page}: ${url}`);

        const res = await fetch(url, {
            credentials: 'include',
            cache: 'no-cache'
        });

        if (!res.ok) {
            console.error(`Fetch failed: HTTP ${res.status}`);
            break;
        }

        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const table = doc.querySelector('table[cellspacing="2"][cellpadding="2"]');
        if (!table || table.rows.length <= 1) {
            console.log('No table or no data on page');
            break;
        }

        // Parse rows (skip header)
        for (let i = 1; i < table.rows.length; i++) {
            const cells = table.rows[i].cells;
            if (cells.length < 7) continue;

            const timestamp = cells[0].textContent.trim();
            const statusText = cells[4].textContent.trim();
            const sessionTime = cells[6].textContent.trim();

            let dateObj;
            try {
                dateObj = new Date(timestamp.replace(' ', 'T'));
                if (isNaN(dateObj.getTime())) continue;
            } catch {
                continue;
            }

            const status = statusText.includes('Start') ? 'Start' : 'Stop';

            entries.push({
                timestamp,
                status,
                sessionTime,
                dateObj
            });
        }

        // Find next page link (exact same logic as collector)
        const nextLink = Array.from(doc.querySelectorAll('a'))
            .find(a => a.textContent.trim().toUpperCase().includes('NEXT') || a.textContent.includes('@'));

        if (!nextLink || !nextLink.href) {
            console.log('No next page link found - this is the last page');
            break;
        }

        url = nextLink.href;
        if (!url.startsWith('http')) {
            url = 'https://admin.neonova.net' + (url.startsWith('/') ? '' : '/') + url;
        }
        page++;
    }

    // Sort newest first
    entries.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

    console.log(`Parsed ${entries.length} entries from ${page-1} pages`);
    return entries;
}
