// ==UserScript==
// @name         Headless report builder - POC
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Live monitoring dashboard for NeoNova subscriber RADIUS status
// @author       You
// @match        https://admin.neonova.net/*
// @grant        none
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/base-neonova-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/models/customer.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/controllers/neonova-dashboard-controller.js
// @require      https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/views/neonova-dashboard-view.js
// ==/UserScript==

(function () {
    'use strict';

    // Only run in the MAIN frame (search screen)
    if (window.name !== 'MAIN') return;

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        try {
            // Instantiate the controller (it handles loading customers, creating view, etc.)
            const dashboardController = new NeonovaDashboardController();

            // Create the fixed button
            const openBtn = document.createElement('button');
            openBtn.textContent = 'Dashboard';
            openBtn.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                z-index: 999999;
                padding: 15px 30px;
                background: #1e40af;
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 6px 15px rgba(0,0,0,0.4);
                transition: all 0.2s;
            `;

            // Hover effect
            openBtn.addEventListener('mouseover', () => {
                openBtn.style.transform = 'scale(1.05)';
                openBtn.style.boxShadow = '0 8px 20px rgba(0,0,0,0.5)';
            });
            openBtn.addEventListener('mouseout', () => {
                openBtn.style.transform = 'scale(1)';
                openBtn.style.boxShadow = '0 6px 15px rgba(0,0,0,0.4)';
            });

            // Click handler
            openBtn.addEventListener('click', () => {
                dashboardController.togglePanel();
            });

            document.body.appendChild(openBtn);
        } catch (err) {
        }
    }
})();
