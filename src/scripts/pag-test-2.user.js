// ==UserScript==
// @name         NeoNova Exact Raw Match (Standalone)
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(async function () {
    'use strict';
    if (window.name !== 'MAIN') return;

    console.clear();
    console.log('=== STANDALONE EXACT MATCH ===');

    const username = 'kandkpepper';
    const startDate = new Date('2025-03-01T00:00:00');
    const endDate   = new Date();               // today
    endDate.setHours(23, 59, 59, 999);

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
        const res = await fetch(url, { credentials: 'include', cache: 'no-cache', headers: { 'Referer': url } });
        if (!res.ok) break;

        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Parse total from the exact table you showed us
        if (page === 1) {
            let cell = doc.querySelector('table[cellspacing="2"][cellpadding="2"][border="0"] tr[bgcolor="gray"] td:last-child');
            if (cell) {
                const m = cell.textContent.match(/[\d,]+/);
                if (m) totalEntries = parseInt(m[0].replace(/,/g, ''), 10);
            }
            if (!totalEntries) {
                const m = doc.body.textContent.match(/of\s*([\d,]+)/i);
                if (m) totalEntries = parseInt(m[1].replace(/,/g, ''), 10);
            }
            console.log(`Total detected on page 1: ${totalEntries}`);
        }

        // Parse rows (same as the real controller)
        const rows = doc.querySelectorAll('table[cellspacing="2"][cellpadding="2"][border="0"] tr[bgcolor="#eeeeee"], table[cellspacing="2"][cellpadding="2"][border="0"] tr[bgcolor="#ffffff"]');
        const pageEntries = [];
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length < 10) return;
            const timestamp = cells[0].textContent.trim() + ' ' + cells[1].textContent.trim();
            const status = cells[3].textContent.trim().toLowerCase().includes('start') ? 'Start' : 'Stop';
            pageEntries.push({ timestamp, status, dateObj: new Date(timestamp) });
        });

        entries.push(...pageEntries);
        console.log(`Page ${page} → ${entries.length} entries (total=${totalEntries})`);

        // STOP exactly at total
        if (totalEntries && entries.length >= totalEntries) break;
        if (pageEntries.length < hitsPerPage) break;

        offset += hitsPerPage;
        page++;
    }

    console.log(`\nRaw fetched: ${entries.length}`);

    // === Your cleaning rule: keep ONE of any consecutive duplicates ===
    const cleaned = [entries[0]];
    for (let i = 1; i < entries.length; i++) {
        if (entries[i].status === entries[i-1].status) {
            cleaned[cleaned.length - 1] = entries[i];   // replace with later timestamp
        } else {
            cleaned.push(entries[i]);
        }
    }

    console.log(`After cleanEntries: ${cleaned.length} entries`);
    console.log('First:', cleaned[0].timestamp);
    console.log('Last :', cleaned[cleaned.length-1].timestamp);
})();
