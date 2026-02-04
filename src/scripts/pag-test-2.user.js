// ==UserScript==
// @name         NeoNova Full Search (Forced Correct URL + Robust Parser)
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(async function () {
    'use strict';
    if (window.name !== 'MAIN') return;

    console.clear();
    console.log('=== FULL SEARCH (Forced URL + Robust Parser) ===');

    const username = 'kandkpepper';

    // Exact parameters that the normal search UI uses
    const params = new URLSearchParams({
        acctsearch: '2',
        sd: 'fairpoint.net',
        iuserid: username,
        syear: '2025', smonth: '03', sday: '01', shour: '00', smin: '00',
        eyear: '2026', emonth: '02', eday: '04', ehour: '23', emin: '59',
        order: 'date',
        hits: '100',
        location: '0',
        direction: '0'
    });

    const baseUrl = 'https://admin.neonova.net/rat/index.php';

    console.log('Using forced search URL:', baseUrl + '?' + params.toString());

    let allRows = [];
    let page = 1;
    let offset = 0;

    while (true) {
        params.set('location', offset.toString());
        const url = baseUrl + '?' + params.toString();

        const res = await fetch(url, {credentials: 'include', cache: 'no-cache'});
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Robust parser: look for the real data table (skip any summary/header rows)
        const tables = doc.querySelectorAll('table');
        let rows = [];
        for (const table of tables) {
            const trs = table.querySelectorAll('tr');
            for (const tr of trs) {
                const tds = tr.querySelectorAll('td');
                if (tds.length >= 5) {
                    const timestamp = tds[0]?.textContent.trim();
                    const status = tds[1]?.textContent.trim();
                    if (timestamp && timestamp !== 'Search Results' && timestamp !== 'Entry:') {
                        rows.push({timestamp, status});
                    }
                }
            }
        }

        allRows.push(...rows);
        console.log(`Page ${page} → ${rows.length} rows (total now ${allRows.length})`);

        if (rows.length < 100) {
            console.log('No more rows → stopping');
            break;
        }

        offset += 100;
        page++;
    }

    // Clean duplicates (exact timestamp + status)
    const seen = new Set();
    const cleaned = allRows.filter(row => {
        const key = `${row.timestamp}_${row.status}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    console.log('\n=== FINAL RESULT ===');
    console.log(`Raw fetched          : ${allRows.length}`);
    console.log(`After cleaning       : ${cleaned.length}`);
    console.log(`Unique timestamps    : ${new Set(cleaned.map(r => r.timestamp)).size}`);

    if (cleaned.length) {
        console.log('First :', cleaned[0].timestamp, cleaned[0].status);
        console.log('Last  :', cleaned[cleaned.length-1].timestamp, cleaned[cleaned.length-1].status);
    }

    // Optional: copy to clipboard for easy pasting
    const json = JSON.stringify(cleaned, null, 2);
    navigator.clipboard.writeText(json).then(() => console.log('Cleaned data copied to clipboard'));
})();
