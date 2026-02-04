// ==UserScript==
// @name         NeoNova Pagination Debug (Clean Console Only)
// @namespace    http://tampermonkey.net/
// @version      0.0.1
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
    console.log('=== CLEAN PAGINATION DEBUG START ===');

    const username = 'kandkpepper';
    const startDate = new Date('2025-03-01T00:00:00');
    const endDate   = new Date('2026-02-03T23:59:59');   // full last day

    const controller = new BaseNeonovaController();
    const collector = new NeonovaCollector();

    console.log(`Range: ${startDate.toISOString()} → ${endDate.toISOString()}`);

    // === OVERRIDE with the exact parser that worked in DevTools ===
    controller._parseTotalEntries = function (doc) {
        let cell = doc.querySelector('table[cellspacing="2"][cellpadding="2"][border="0"] tr[bgcolor="gray"] td:last-child');
        if (cell) {
            const m = cell.textContent.match(/[\d,]+/);
            if (m) return parseInt(m[0].replace(/,/g, ''), 10);
        }
        const m = (doc.body.textContent || '').match(/of\s*([\d,]+)/i);
        return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
    };

    const entries = await controller.paginateReportLogs(username, startDate, endDate, (count, page, total) => {
        const pct = total ? Math.round(count / total * 100) : 0;
        console.log(`Page ${page} → ${count} entries (${pct}%)  [total=${total}]`);
    });

    console.log('\n=== RAW RESULT ===');
    console.log(`Raw entries fetched : ${entries.length}`);
    console.log(`First timestamp     : ${entries[0]?.timestamp}`);
    console.log(`Last timestamp      : ${entries[entries.length-1]?.timestamp}`);

    const cleaned = collector.cleanEntries(entries);
    console.log(`After cleanEntries  : ${cleaned.length} entries`);
})();
