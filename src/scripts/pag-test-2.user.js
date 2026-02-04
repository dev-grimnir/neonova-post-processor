// ==UserScript==
// @name         NeoNova Pagination FINAL (Exact Match)
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
    console.log('=== EXACT MATCH TEST ===');

    const username = 'kandkpepper';
    const startDate = new Date('2025-03-01T00:00:00');
    const endDate   = new Date();   // today, full end-of-day
    endDate.setHours(23,59,59,999);

    const controller = new BaseNeonovaController();

    console.log(`Range: ${startDate.toISOString()} → ${endDate.toISOString()}`);

    // Force stop exactly at total (no extra page)
    controller.paginateReportLogs = async function (username, startDate, endDate, onProgress) {
        const entries = [];
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
                totalEntries = this._parseTotalEntries(doc);
                console.log(`Total detected: ${totalEntries}`);
            }

            const pageEntries = this.parsePageRows(doc);
            entries.push(...pageEntries);

            if (typeof onProgress === 'function') onProgress(entries.length, page, totalEntries);

            // STOP EXACTLY at total — no extra page
            if (totalEntries && entries.length >= totalEntries) break;
            if (pageEntries.length < hitsPerPage) break;

            offset += hitsPerPage;
            page++;
        }

        console.log(`Raw fetched: ${entries.length}`);
        return entries;
    };

    const entries = await controller.paginateReportLogs(username, startDate, endDate, (c, p, t) => {
        console.log(`Page ${p} → ${c} entries (total=${t})`);
    });

    const collector = new NeonovaCollector();
    const cleaned = collector.cleanEntries(entries);

    console.log('\n=== FINAL RESULT ===');
    console.log(`Raw entries fetched : ${entries.length}`);
    console.log(`After cleanEntries  : ${cleaned.length}`);
})();
