// ==UserScript==
// @name         NovaSubscriber - Bootloader
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Load required classes
// @author       dev-grimnir
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/scripts/neonova-entry-script.user.js
// @downloadURL  https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/scripts/neonova-entry-script.user.js

// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/base-neonova-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-dashboard-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-report-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-report-order-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-analyzer.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-collector.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/base-neonova-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-dashboard-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-progress-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-report-order-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-report-view.js

// ==/UserScript==

(function() {
    'use strict';

    if (window.name !== 'MAIN') return;

    (function waitForDependencies() {
        const required = [
            'BaseNeonovaController',
            'NeonovaDashboardController',
            'NeonovaAnalyzer',
            'NeonovaCollector',
            'NeonovaReportOrderController',
            'BaseNeonovaView',
            'NeonovaDashboardView',
            'NeonovaProgressView',
            'NeonovaReportOrderView',
            'NeonovaReportView'
        ];

        const missing = required.filter(name => typeof window[name] === 'undefined');

        if (missing.length === 0) {
            console.log('✅ All dependencies loaded');
            // TODO: start the dashboard
            // new NeonovaDashboardController();
        } else {
            console.group('⏳ Waiting for Neonova classes...');
            required.forEach(name => {
                console.log(`${name} = ${typeof window[name]}`);
            });
            console.log('Not ready, trying again in 100ms');
            console.groupEnd();

            setTimeout(waitForDependencies, 100);
        }
    })();
})();
