// ==UserScript==
// @name         NovaSubscriber - Dashboard
// @namespace    http://tampermonkey.net/
// @version      38.1
// @description  Real-time customer modem connection dashboard (separate script)
// @author       dev-grimnir
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/scripts/neonova-dashboard.user.js
// @downloadURL  https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/scripts/neonova-dashboard.user.js
// @require https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/core/utils.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/models/log-entry.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/models/neonova-admin-model.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/models/neonova-admin-modal-model.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/models/neonova-customer-model.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/models/neonova-dashboard-model.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/models/neonova-tab-model.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/models/neonova-report-model.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/models/neonova-snapshot-model.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/controllers/neonova-crypto-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/controllers/neonova-http-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/controllers/neonova-progress-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/controllers/neonova-notifier-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/controllers/neonova-admin-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/controllers/neonova-admin-modal-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/controllers/neonova-collector.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/controllers/neonova-analyzer.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/controllers/neonova-passphrase-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/controllers/neonova-customer-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/controllers/neonova-report-order-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/controllers/neonova-report-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/controllers/neonova-snapshot-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/controllers/neonova-tab-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/controllers/neonova-add-customer-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/controllers/neonova-dashboard-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/base-neonova-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/neonova-base-modal-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/neonova-inline-snapshot-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/neonova-spinner-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/neonova-passphrase-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/neonova-customer-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/neonova-tab-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/neonova-snapshot-chart.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/neonova-snapshot-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/neonova-report-snapshot-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/neonova-report-order-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/neonova-progress-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/neonova-report-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/neonova-add-customer-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/neonova-dashboard-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/neonova-admin-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-insight/devsrc/views/neonova-admin-modal-view.js
// ==/UserScript==

(function() {
    'use strict';

    
    // Only run in the MAIN content frame
    if (window.name !== 'MAIN') {
        return;
    }

    (async () => {
        const dashboardController = await NeonovaDashboardController.create();
    })();
})();

