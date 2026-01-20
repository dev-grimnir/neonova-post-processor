// ==UserScript==
// @name         NovaSubscriber - Full Session Report (Modular)
// @namespace    http://tampermonkey.net/
// @version      8.19
// @description  Full report with graphs, collapsible long disconnects, stats table, and HTML export
// @author       dev-grimnir
// @match        https://admin.neonova.net/index.php*
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/scripts/neonova-full-report.user.js
// @downloadURL  https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/scripts/neonova-full-report.user.js

// Load shared utilities first
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/core/utils.js

// Models (data/domain)
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/models/log-entry.js

// Collectors + Analyzers + Views + Controllers (all in controllers/ per your rule)
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-collector.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-analyzer.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/views/neonova-report-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-report-controller.js
// ==/UserScript==

(function() {
    'use strict';

    // Only run in the main content frame (named "MAIN")
    if (window.name !== 'MAIN') {
        console.log('[Script] Skipping execution in frame:', window.name);
        return;
    }

    console.log('[Entry] Script started in MAIN frame');
    const controller = new NeonovaReportController();
    console.log('[Entry] Controller instantiated');
    controller.run();
    console.log('[Entry] run() called');
})();
