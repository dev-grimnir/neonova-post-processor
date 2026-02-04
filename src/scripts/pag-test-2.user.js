// ==UserScript==
// @name         NeoNova Exact Raw Match - FINAL
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(async function () {
    'use strict';
    if (window.name !== 'MAIN') return;

    console.clear();
    console.log('=== FINAL EXACT MATCH v3 ===');

    const username = 'kandkpepper';
    const startDate = new Date('2025-03-01T00:00:00');
    const endDate   = new Date();
    endDate.setHours(23,59,59,999);

    console.log(`Range: ${startDate.toISOString()} → ${endDate.toISOString()}`);

    const entries = [];
    let page = 1;
    let offset = 0;
    const hitsPerPage = 100;
    let totalEntries = null;

    while (true) {
        const params = new URLSearchParams({
            acctsearch: '2', sd: 'fairpoint.net', iuserid: username,
            syear: startDate.getFullYear(), smonth: (startDate.getMonth()+1).toString().padStart(2,'0'), sday: startDate.getDate().toString().padStart(2,'0'),
            shour: '00', smin: '00',
            eyear: endDate.getFullYear(), emonth: (endDate.getMonth()+1).toString().padStart(2,'0'), eday: endDate.getDate().toString().padStart(2,'0'),
            ehour: '23', emin: '59',
            order: 'date', hits: hitsPerPage.toString(),
            location: offset.toString(), direction: '0', dump: ''
        });

        const url = `https://admin.neonova.net/rat/index.php?${params}`;
        const res = await fetch(url, {credentials: 'include', cache: 'no-cache', headers: {'Referer': url}});
        if (!res.ok) break;

        const doc = new DOMParser().parseFromString(await res.text(), 'text/html');

        // Total parser (the one that always worked)
        if (page === 1) {
            let cell = doc.querySelector('table[cellspacing="2"][cellpadding="2"][border="0"] tr[bgcolor="gray"] td:last-child');
            if (cell) {
                console.log('Total cell text:', cell.textContent);
                const m = cell.textContent.match(/[\d,]+/);
                if (m) totalEntries = parseInt(m[0].replace(/,/g,''), 10);
            }
            if (!totalEntries) {
                const m = (doc.body.textContent || '').match(/of\s*([\d,]+)/i);
                if (m) totalEntries = parseInt(m[1].replace(/,/g,''), 10);
            }
            console.log(`Total detected: ${totalEntries}`);
        }

        // EXACT row parser from the versions that worked
        const table = doc.querySelector('table[cellspacing="2"][cellpadding="2"][border="0"]');
        const rows = table ? table.querySelectorAll('tr[bgcolor="#eeeeee"], tr[bgcolor="#ffffff"]') : [];
        console.log(`Page ${page} - found ${rows.length} data rows`);

        const pageEntries = [];
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 10) return;

            const ts0 = cells[0].textContent.trim();
            const ts1 = cells[1].textContent.trim();
            const statusText = cells[3].textContent.trim();

            if (!ts0 || !ts1) return;

            const timestamp = `${ts0} ${ts1}`;
            const dateObj = new Date(timestamp);
            if (isNaN(dateObj.getTime())) return;

            const status = statusText.toLowerCase().includes('start') ? 'Start' : 'Stop';

            pageEntries.push({ timestamp, status, dateObj });
        });

        entries.push(...pageEntries);
        console.log(`Page ${page} → ${pageEntries.length} parsed → total now ${entries.length}`);

        if (totalEntries && entries.length >= totalEntries) break;
        if (pageEntries.length < hitsPerPage) break;

        offset += hitsPerPage;
        page++;
    }

    console.log(`\n=== RAW RESULT ===`);
    console.log(`Raw fetched: ${entries.length}`);

    // Clean: keep only ONE of any consecutive identical status
    const cleaned = entries.length ? [entries[0]] : [];
    for (let i = 1; i < entries.length; i++) {
        if (entries[i].status === entries[i-1].status) {
            cleaned[cleaned.length-1] = entries[i];
        } else {
            cleaned.push(entries[i]);
        }
    }

    console.log(`After cleanEntries: ${cleaned.length} entries`);
    if (cleaned.length) {
        console.log('First:', cleaned[0].timestamp);
        console.log('Last :', cleaned[cleaned.length-1].timestamp);
    }
})();
