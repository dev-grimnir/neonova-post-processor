// ==UserScript==
// @name         NeoNova Pagination Test (Console Only)
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  Pure pagination tester – no GUI, full logging
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/base-neonova-controller.js
// ==/UserScript==

(async function () {
    'use strict';

    console.clear();
    console.log('=== Pagination Test Started ===');

    // === CONFIGURE HERE ===
    const username = 'kandkpepper';                    // ← change if you want a different customer
    const startDate = new Date('2025-03-01T00:00:00'); // inclusive
    const endDate   = new Date('2026-02-03T23:59:59'); // ← full end of day

    const controller = new BaseNeonovaController();    // the only class we need

    console.log(`Testing ${username} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    try {
        const entries = await controller.paginateReportLogs(username, startDate, endDate, (count, page, total) => {
            const pct = total ? Math.round(count / total * 100) : 0;
            console.log(`  Page ${page} → ${count} entries (${pct}%)`);
        });

        console.log('=== RAW PAGINATION RESULT ===');
        console.log(`Total raw entries fetched: ${entries.length}`);
        console.log(`First entry: ${entries[0]?.timestamp}`);
        console.log(`Last entry:  ${entries[entries.length-1]?.timestamp}`);

        // Also run the collector so we can see if cleaning is dropping rows
        const collector = new NeonovaCollector();               // needs the collector too
        const cleaned = collector.cleanEntries(entries);
        console.log(`After cleanEntries: ${cleaned.length} entries`);

    } catch (err) {
        console.error('Pagination failed:', err);
    }
})();
