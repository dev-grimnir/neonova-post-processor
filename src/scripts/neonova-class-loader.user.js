// ==UserScript==
// @name         NovaSubscriber - Class Loader
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Load required classes
// @author       dev-grimnir
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/scripts/neonova-class-loader.user.js
// @downloadURL  https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/scripts/neonova-class-loader.user.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/base-neonova-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-dashboard-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-report-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-report-order-controller.js

// ==/UserScript==

(function() {
    'use strict';

    // Only run in the MAIN content frame (same as report script)
    if (window.name !== 'MAIN') {
        return;
    }

    // Wait for all critical classes before starting the dashboard
    (function waitForDependencies() {
        // List all classes that must be defined before we proceed
        if (typeof BaseNeonovaController !== 'undefined' &&
            typeof NeonovaDashboardController !== 'undefined' &&
            typeof NeonovaAnalyzer !== 'undefined' &&
            typeof NeonovaCollector !== 'undefined' &&
            typeof NeonovaReportOrderController !== 'undefined' &&
            typeof BaseNeonovaView !== 'undefined' &&
            typeof NeonovaDashboardView !== 'undefined' &&
            typeof NeonovaProgressView !== 'undefined' &&
            typeof NeonovaReportOrderView !== 'undefined' &&
            typeof NeonovaReportView !== 'undefined') {

            console.log('All dependencies loaded');

        } else {
            // Not ready — retry every 100ms
            console.log('BaseneoNovaController = ' typeof BaseNeonovaController);
            console.log('NeonovaDashboardController = ' typeof NeonovaDashboardController);
            console.log('NeonovaAnalyzer = '  typeof NeonovaAnalyzer);
            console.log('NeonovaCollector = ' typeof NeonovaCollector);
            console.log('NeonovaReportOrderController = ' typeof NeonovaReportOrderController);
            console.log('BaseNeonovaView = ' typeof BaseNeonovaView);
            console.log('NeonovaDashboardView = ' typeof NeonovaDashboardView);
            console.log('NeonovaProgressView = ' typeof NeonovaProgressView);
            console.log('NeonovaReportOrderView = ' typeof NeonovaReportOrderView);
            console.log('NeonovaReportView = ' typeof NeonovaReportView);
            console.log('Not ready, trying again in 100ms');
            setTimeout(waitForDependencies, 100);
        }
    })();
})();
