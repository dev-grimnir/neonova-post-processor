// src/core/paginate-logs-headless.js
// Headless pagination - fetches pages, parses rows, follows hrefs
// Returns all entries (report uses full, dashboard uses [0] for latest)

async function paginateLogs(baseUrl, onProgress = null) {
    const entries = [];
    let url = baseUrl;
    let page = 1;

    while (url) {
        console.log(`Fetching page ${page}: ${url}`);
        const res = await fetch(url, { credentials: 'include', cache: 'no-cache' });
        if (!res.ok) {
            console.error(`Fetch failed: ${res.status}`);
            break;
        }

        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const table = doc.querySelector('table[cellspacing="2"][cellpadding="2"]');
        if (!table || table.rows.length <= 1) break;

        const pageEntries = [];
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

            pageEntries.push({ timestamp, status, sessionTime, dateObj });
        }

        entries.push(...pageEntries);

        // Progress callback (e.g., for bar update)
        if (onProgress) onProgress(entries.length, page);

        // Next link (exact from report builder)
        const nextLink = Array.from(doc.querySelectorAll('a'))
            .find(a => a.textContent.trim().startsWith('NEXT @') && a.href && a.href.includes('index.php'));
        if (!nextLink) break;

        url = nextLink.href;
        if (!url.startsWith('http')) url = 'https://admin.neonova.net' + url;
        page++;
    }

    entries.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime()); // newest first
    return entries;
}
