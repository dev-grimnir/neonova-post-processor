// ==UserScript==
// @name         NovaSubscriber - Class Loader
// @namespace    http://tampermonkey.net/
// @version      1.3
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
    console.group('⏳ Waiting for Neonova classes...');
    
    const deps = {
        BaseNeonovaController,
        NeonovaDashboardController,
        NeonovaAnalyzer,
        NeonovaCollector,
        NeonovaReportOrderController,
        BaseNeonovaView,
        NeonovaDashboardView,
        NeonovaProgressView,
        NeonovaReportOrderView,
        NeonovaReportView
    };

    Object.entries(deps).forEach(([name, value]) => {
        console.log(`${name} = ${typeof value}`);
    });

    console.log('Not ready, trying again in 100ms');
    console.groupEnd();

    setTimeout(waitForDependencies, 100);
}
    })();
})();
