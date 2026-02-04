// ==UserScript==
// @name         NeoNova Real Search (POST like the normal UI)
// @match        https://admin.neonova.net/index.php
// @grant        none
// @run-at       document-end
// ==/UserScript==

(async function () {
    'use strict';

    console.clear();
    console.log('=== REAL POST SEARCH (mimics normal UI) ===');

    // Find the search form (the one with user/date fields)
    const form = Array.from(document.forms).find(f => 
        f.innerHTML.includes('iuserid') || f.querySelector('input[name="iuserid"]')
    );

    if (!form) {
        console.error('Search form not found on this page');
        return;
    }

    const action = form.action || location.href;
    console.log('Using real form action:', action);

    // Build the exact data the normal search sends
    const fd = new FormData(form);
    fd.set('iuserid', 'kandkpepper');
    fd.set('syear', '2025'); fd.set('smonth', '03'); fd.set('sday', '01'); fd.set('shour', '00'); fd.set('smin', '00');
    fd.set('eyear', '2026'); fd.set('emonth', '02'); fd.set('eday', '04'); fd.set('ehour', '23'); fd.set('emin', '59');
    fd.set('hits', '100');
    fd.set('order', 'date');
    fd.set('location', '0');

    let allRows = [];
    let page = 1;
    let location = 0;

    while (true) {
        fd.set('location', location.toString());

        const res = await fetch(action, {
            method: 'POST',
            body: fd,
            credentials: 'include'
        });

        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Parse real rows (skip junk header rows)
        const rows = [];
        doc.querySelectorAll('table tr').forEach(tr => {
            const tds = tr.querySelectorAll('td');
            if (tds.length >= 5) {
                const ts = tds[0].textContent.trim();
                const status = tds[1].textContent.trim();
                if (ts && ts.length > 10 && !ts.includes('Search Results')) {
                    rows.push({timestamp: ts, status});
                }
            }
        });

        allRows.push(...rows);
        console.log(`Page ${page} → ${rows.length} rows (total now ${allRows.length})`);

        if (rows.length < 100) break;

        location += 100;
        page++;
    }

    // Clean exact duplicates
    const seen = new Set();
    const cleaned = allRows.filter(r => {
        const key = `${r.timestamp}_${r.status}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    console.log('\n=== FINAL RESULT ===');
    console.log(`Raw fetched          : ${allRows.length}`);
    console.log(`After cleaning       : ${cleaned.length}`);
    if (cleaned.length) {
        console.log('First :', cleaned[0].timestamp, cleaned[0].status);
        console.log('Last  :', cleaned[cleaned.length-1].timestamp, cleaned[cleaned.length-1].status);
    }
})();
