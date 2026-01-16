// ==UserScript==
// @name         NeoNova RADIUS Search Paginator (Proof of Concept)
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  OOP classes to paginate through RADIUS search results and collect Start/Stop events
// @author       dev-grimnir
// @match        https://admin.neonova.net/*
// @grant        none
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/scripts/neonova-radius-paginator.user.js
// @downloadURL  https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/scripts/neonova-radius-paginator.user.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/core/utils.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/models/radius-entry.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/models/radius-metrics.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/radius-collector.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/radius-analyzer.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/views/radius-report-view.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/controllers/radius-controller.js
// ==/UserScript==

(function() {
    'use strict';

    // All classes are now available globally via @require

    const controller = new RadiusController();
    controller.run();
})();
