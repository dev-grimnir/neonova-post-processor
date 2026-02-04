// ==UserScript==
// @name         NeoNova Debug Status
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
    console.log('=== DEBUG STATUS ===');

    const username = 'kandkpepper';
    const startDate = new Date('2025-03-01T00:00:00');
    const endDate   = new Date();
    endDate.setHours(23,59,59,999);

    const controller = new BaseNeonovaController();

    const entries = await (async () => {
        const list = [];
        let page = 1, offset = 0;
        const hits = 100;
        let total = null;

        while (true) {
            const params = new URLSearchParams({ /* same as before */ });
            // (paste the full params block from the previous script here)

            const url = `https://admin.neonova.net/rat/index.php?${params}`;
            const doc = new DOMParser().parseFromString(await (await fetch(url, {credentials:'include'})).text(), 'text/html');

            if (page === 1) total = controller._parseTotalEntries(doc);

            const pageRows = controller.parsePageRows(doc);
            list.push(...pageRows);

            console.log(`Page ${page} → ${pageRows.length} rows`);

            if (total && list.length >= total) break;
            if (pageRows.length < hits) break;

            offset += hits;
            page++;
        }
        return list;
    })();

    console.log(`Raw: ${entries.length}`);

    // Show status of first 10 and last 10 entries
    console.log('\nFirst 10 status:');
    entries.slice(0,10).forEach(e => console.log(e.timestamp, e.status));

    console.log('\nLast 10 status:');
    entries.slice(-10).forEach(e => console.log(e.timestamp, e.status));

    // Count Start vs Stop
    const starts = entries.filter(e => e.status === 'Start').length;
    const stops  = entries.filter(e => e.status === 'Stop').length;
    console.log(`\nStart count: ${starts} | Stop count: ${stops}`);
})();
