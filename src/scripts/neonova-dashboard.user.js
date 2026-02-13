// ==UserScript==
// @name         NovaSubscriber - Dashboard
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Real-time customer modem connection dashboard (separate script)
// @author       dev-grimnir
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/scripts/neonova-dashboard.user.js?v99
// @downloadURL  https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/scripts/neonova-dashboard.user.js?v99
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/base-neonova-controller.js?v99
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/views/base-neonova-view.js?v99
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-report-order-controller.js?v99
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/models/customer.js?v99
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-dashboard-controller.js?v99
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/views/neonova-dashboard-view.js?v99
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/views/neonova-report-order-view.js?v99
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/views/neonova-progress-view.js?v99
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/core/utils.js?v99
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/models/log-entry.js?v99
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-collector.js?v99
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-analyzer.js?v99
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/views/neonova-report-view.js?v99
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-report-controller.js?v99
// ==/UserScript==

(function() {
    'use strict';

    // Only run in the MAIN content frame (same as report script)
    if (window.name !== 'MAIN') {
        return;
    }

    const dashboardController = new NeonovaDashboardController();

})();

