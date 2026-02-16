// ==UserScript==
// @name         NovaSubscriber - Dashboard
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Real-time customer modem connection dashboard (separate script)
// @author       dev-grimnir
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/scripts/neonova-dashboard.user.js
// @downloadURL  https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/scripts/neonova-dashboard.user.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-analyzer.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-report-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/base-neonova-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-dashboard-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-report-order-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/neonova-collector.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/views/base-neonova-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/models/customer.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/views/neonova-dashboard-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/views/neonova-report-order-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/views/neonova-progress-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/core/utils.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/models/log-entry.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/views/neonova-report-view.js

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
        if (typeof BaseNeonovaController      !== 'undefined' &&
            typeof NeonovaDashboardController !== 'undefined' &&
            typeof NeonovaAnalyzer            !== 'undefined' &&
            typeof NeonovaCollector           !== 'undefined' &&
            typeof NeonovaReportController    !== 'undefined' &&
            typeof BaseNeonovaView            !== 'undefined' &&
            typeof NeonovaDashboardView       !== 'undefined' &&
            typeof NeonovaProgressView        !== 'undefined' &&
            typeof NeonovaReportOrderView     !== 'undefined' &&
            typeof NeonovaReportView          !== 'undefined') {

            console.log('All dependencies loaded — starting dashboard');
            
            // Safe to instantiate now
            const dashboardController = new NeonovaDashboardController();

        } else {
            // Not ready — retry every 100ms
            console.log('Not ready, trying again in 100ms');
            setTimeout(waitForDependencies, 100);
        }
    })();
})();
