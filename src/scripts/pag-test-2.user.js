// ==UserScript==
// @name         NeoNova Pagination FINAL (Trust Total)
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
    console.log('=== FINAL TRUST-TOTAL TEST ===');

    const username = 'kandkpepper';
    const startDate = new Date('2025-03-01T00:00:00');
    const endDate   = new Date('2026-02-03T23:59:59');

    const controller = new BaseNeonovaController();

    // Force full end-of-day
    startDate.setHours(0,0,0,0);
    endDate.setHours(23,59,59,999);

    console.log(`Range: ${startDate.toISOString()} → ${endDate.toISOString()}`);

    const entries = await controller.paginateReportLogs(username, startDate, endDate, (count, page, total) => {
        const pct = total ? Math.round(count / total * 100) : 0;
        console.log(`Page ${page} → ${count} entries (${pct}%)  total=${total}`);
    });

    console.log('\n=== RAW RESULT ===');
    console.log(`Raw entries fetched : ${entries.length}`);
    console.log(`First : ${entries[0]?.timestamp}`);
    console.log(`Last  : ${entries[entries.length-1]?.timestamp}`);

    const collector = new NeonovaCollector();
    const cleaned = collector.cleanEntries(entries);
    console.log(`After cleanEntries  : ${cleaned.length} entries`);
})();
