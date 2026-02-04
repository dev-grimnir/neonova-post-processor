// ==UserScript==
// @name         NeoNova Pagination Tester (Console Only)
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Minimal, non-blocking pagination test
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/base-neonova-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-collector.js
// ==/UserScript==

(async function () {
    'use strict';

    // Only run in the MAIN frame where cookies live
    if (window.name !== 'MAIN') return;

    console.clear();
    console.log('=== Pagination Tester Started ===');

    const username = 'kandkpepper';                    // ← change if you want
    const startDate = new Date('2025-03-01T00:00:00');
    const endDate   = new Date('2026-02-03T23:59:59'); // full end-of-day

    const controller = new BaseNeonovaController();

    console.log(`Fetching ${username} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    try {
        const entries = await controller.paginateReportLogs(username, startDate, endDate, (count, page, total) => {
            const pct = total ? Math.round(count / total * 100) : '?';
            console.log(`  Page ${page} → ${count} entries (${pct}%)`);
        });

        console.log('\n=== PAGINATION COMPLETE ===');
        console.log(`Raw entries fetched : ${entries.length}`);
        console.log(`First timestamp     : ${entries[0]?.timestamp || 'none'}`);
        console.log(`Last timestamp      : ${entries[entries.length-1]?.timestamp || 'none'}`);

        // Optional: see what cleanEntries does
        const collector = new NeonovaCollector();
        const cleaned = collector.cleanEntries(entries);
        console.log(`After cleanEntries  : ${cleaned.length} entries`);

    } catch (err) {
        console.error('Pagination crashed:', err);
    }
})();
