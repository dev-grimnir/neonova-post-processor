// ==UserScript==
// @name         NeoNova Exact Raw Match (Ignore Faulty Total + Good Clean)
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/base-neonova-controller.js
// ==/UserScript==

(async function () {
    'use strict';
    if (window.name !== 'MAIN') return;

    console.clear();
    console.log('=== EXACT RAW MATCH (Ignore Total + Good Clean) ===');

    const username = 'kandkpepper';

    // Force local midnight March 1, 2025 → today 23:59:59 local
    const startDate = new Date(2025, 2, 1);               // March 1, 00:00 local
    const endDate   = new Date();
    endDate.setHours(23, 59, 59, 999);

    const controller = new BaseNeonovaController();

    console.log(`Range (local): ${startDate.toLocaleString()} → ${endDate.toLocaleString()}`);

    const entries = await (async () => {
        const list = [];
        let page = 1;
        let offset = 0;
        const hitsPerPage = 100;

        const sDate = new Date(startDate); sDate.setHours(0,0,0,0);
        const eDate = new Date(endDate);   eDate.setHours(23,59,59,999);

        while (true) {
            const params = new URLSearchParams({
                acctsearch: '2', sd: 'fairpoint.net', iuserid: username,
                syear: sDate.getFullYear(), smonth: (sDate.getMonth()+1).toString().padStart(2,'0'), sday: sDate.getDate().toString().padStart(2,'0'),
                shour: '00', smin: '00',
                eyear: eDate.getFullYear(), emonth: (eDate.getMonth()+1).toString().padStart(2,'0'), eday: eDate.getDate().toString().padStart(2,'0'),
                ehour: '23', emin: '59',
                order: 'date', hits: hitsPerPage.toString(),
                location: offset.toString(), direction: '0', dump: ''
            });

            const url = `https://admin.neonova.net/rat/index.php?${params}`;
            const res = await fetch(url, {credentials: 'include', cache: 'no-cache'});
            if (!res.ok) break;

            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            const pageEntries = controller.parsePageRows(doc);
            list.push(...pageEntries);

            console.log(`Page ${page} → ${pageEntries.length} rows (total now ${list.length})`);

            // Stop ONLY when the page returns fewer than 100 rows (no more data)
            if (pageEntries.length < hitsPerPage) {
                console.log('No more rows → stopping');
                break;
            }

            offset += hitsPerPage;
            page++;
        }

        console.log(`Raw fetched: ${list.length}`);
        return list;
    })();

    // Inline the latest cleanEntries from GitHub (unique timestamp + status)
    function cleanEntries(entries) {
        if (!entries || entries.length === 0) return [];

        let all = entries.map(e => ({
            date: e.dateObj ? e.dateObj.getTime() : NaN,
            status: e.status,
            raw: e
        })).filter(e => !isNaN(e.date));

        all.sort((a,b) => a.date - b.date);

        const seen = new Set();
        const cleaned = [];
        all.forEach(e => {
            const key = `${e.date}_${e.status}`;
            if (!seen.has(key)) {
                seen.add(key);
                cleaned.push(e.raw);
            }
        });
        return cleaned;
    }

    const cleaned = cleanEntries(entries);

    // Debug counts
    const starts = entries.filter(e => e.status === 'Start').length;
    const stops  = entries.filter(e => e.status === 'Stop').length;

    console.log('\n=== FINAL RESULT ===');
    console.log(`Raw entries fetched : ${entries.length}`);
    console.log(`Start / Stop in raw : ${starts} / ${stops}`);
    console.log(`After cleanEntries  : ${cleaned.length}`);
    if (cleaned.length) {
        console.log('First :', cleaned[0].timestamp, cleaned[0].status);
        console.log('Last  :', cleaned[cleaned.length-1].timestamp, cleaned[cleaned.length-1].status);
    }
})();
