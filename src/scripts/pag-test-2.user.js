// ==UserScript==
// @name         NeoNova Exact Raw (Site-Reported Total + Sample Row)
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(async function () {
    'use strict';
    if (window.name !== 'MAIN') return;

    console.clear();
    console.log('=== EXACT RAW MATCH (diagnostics) ===');

    const username = 'kandkpepper';

    const startDate = new Date(2025, 2, 1);           // March 1 00:00 local
    const endDate   = new Date();
    endDate.setHours(23, 59, 59, 999);

    console.log(`Range (local): ${startDate.toLocaleString()} → ${endDate.toLocaleString()}`);

    let allRows = [];
    let page = 1;
    let offset = 0;
    let siteReportedTotal = null;

    while (true) {
        const params = new URLSearchParams({
            acctsearch: '2', sd: 'fairpoint.net', iuserid: username,
            syear: startDate.getFullYear(), smonth: (startDate.getMonth()+1).toString().padStart(2,'0'), sday: startDate.getDate().toString().padStart(2,'0'),
            shour: '00', smin: '00',
            eyear: endDate.getFullYear(), emonth: (endDate.getMonth()+1).toString().padStart(2,'0'), eday: endDate.getDate().toString().padStart(2,'0'),
            ehour: '23', emin: '59',
            order: 'date', hits: '100',
            location: offset.toString(), direction: '0'
        });

        const res = await fetch(`https://admin.neonova.net/rat/index.php?${params}`, {credentials: 'include'});
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // === Extract the number the site claims ===
        if (page === 1) {
            const text = doc.body.textContent;
            const match = text.match(/(?:of|total|records).*?(\d{3,6})/i);
            siteReportedTotal = match ? parseInt(match[1]) : 'not found';
            console.log(`Site-reported total on page 1: ${siteReportedTotal}`);
        }

        const rows = [...doc.querySelectorAll('table tr')].slice(1)   // skip header
            .map(tr => {
                const cells = tr.querySelectorAll('td');
                if (cells.length < 5) return null;
                return {
                    timestamp: cells[0]?.textContent.trim(),
                    status:    cells[1]?.textContent.trim(),   // usually "Start" or "Stop"
                    ip:        cells[2]?.textContent.trim(),
                    // add more if you want
                };
            })
            .filter(Boolean);

        allRows.push(...rows);
        console.log(`Page ${page} → ${rows.length} rows (total now ${allRows.length})`);

        if (rows.length < 100) break;

        offset += 100;
        page++;
    }

    console.log('\n=== FINAL RESULT ===');
    console.log(`Raw fetched          : ${allRows.length}`);
    console.log(`Site claimed total   : ${siteReportedTotal}`);
    console.log(`Unique timestamps    : ${new Set(allRows.map(r => r.timestamp)).size}`);

    // Sample row so we can see why everything is Stop
    if (allRows.length) {
        console.log('Sample raw row:', allRows[0]);
    }
})();
