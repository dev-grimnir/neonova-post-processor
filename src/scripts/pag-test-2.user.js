// ==UserScript==
// @name         NeoNova Exact Raw Match (Controller + Strict Stop)
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/base-neonova-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-collector.js
// ==/UserScript==

(async function () {
    'use strict';
    if (window.name !== 'MAIN') return;

    console.clear();
    console.log('=== EXACT RAW MATCH (Controller Strict Stop) ===');

    const username = 'kandkpepper';
    const startDate = new Date('2025-03-01T00:00:00');
    const endDate   = new Date();               // today
    endDate.setHours(23, 59, 59, 999);

    const controller = new BaseNeonovaController();
    const collector = new NeonovaCollector();

    console.log(`Range: ${startDate.toISOString()} → ${endDate.toISOString()}`);

    // === Strict pagination that stops exactly at total ===
    const entries = await (async function () {
        const list = [];
        let page = 1;
        let offset = 0;
        const hitsPerPage = 100;
        let totalEntries = null;

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
            const res = await fetch(url, {credentials: 'include', cache: 'no-cache', headers: {'Referer': url}});
            if (!res.ok) break;

            const doc = new DOMParser().parseFromString(await res.text(), 'text/html');

            if (page === 1) {
                totalEntries = controller._parseTotalEntries(doc);
                console.log(`Total detected: ${totalEntries}`);
            }

            const pageEntries = controller.parsePageRows(doc);
            list.push(...pageEntries);

            console.log(`Page ${page} → ${pageEntries.length} rows → total now ${list.length}`);

            if (totalEntries && list.length >= totalEntries) {
                console.log('Stopped exactly at total');
                break;
            }
            if (pageEntries.length < hitsPerPage) break;

            offset += hitsPerPage;
            page++;
        }
        console.log(`Raw fetched: ${list.length}`);
        return list;
    })();

    const cleaned = collector.cleanEntries(entries);

    console.log('\n=== FINAL RESULT ===');
    console.log(`Raw entries fetched : ${entries.length}`);
    console.log(`After cleanEntries  : ${cleaned.length}`);
    if (cleaned.length) {
        console.log('First :', cleaned[0].timestamp);
        console.log('Last  :', cleaned[cleaned.length-1].timestamp);
    }
})();
