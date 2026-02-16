// ==UserScript==
// @name         NovaSubscriber - Dashboard (Class Checking)
// @namespace    http://tampermonkey.net/ - Clean
// @id           nova-dashboard-clean
// @version      1.0
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

    {

            
            
            
        const dashboardController = new NeonovaDashboardController();

    })();
})();
