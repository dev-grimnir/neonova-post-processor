# neonova-post-processor
# NeoNova Subscriber Report Analyzer

Tampermonkey userscript that scrapes NeoNova admin logs (admin.neonova.net), processes disconnect/start events, and generates a detailed HTML report with:

- Dual stability scores (mean-based & median-based)
- Uptime percentage
- Session length distribution
- Reconnect time histograms
- Long disconnect table
- Hourly/daily/rolling 7-day charts (via Chart.js)

Designed for DSL/field techs and small ISP admins dealing with frequent modem flaps and wanting better visibility into subscriber reliability.

![Dashboard Screenshot](https://github.com/dev-grimnir/neonova-post-processor/screenshots/dashboard-ss.png)

## Features
- Handles logs that start with Stop events
- Normalizes penalties by report duration (fairer for long vs short periods)
- Fast reconnect bonus (<30s events, capped per day)
- Export to CSV, HTML, or print-to-PDF
- Mobile-friendly report view

## Installation

1. Install Tampermonkey extension.
2. Click the raw links below — Tampermonkey will install:

   - [Full Session Report](https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/scripts/neonova-full-report.user.js)  
     (Main: stability scores, charts, exports)

   - [Reconnect Time Fill](https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/main/src/scripts/neonova-reconnect-fill.user.js)  
     (Helper: fills reconnect times with colors)
3. Go to https://admin.neonova.net → login → search for a customer → run a radius search → click "Run Full Report" button

## Usage
- Navigate through paginated log pages (script auto-advances)
- When finished, report opens in new tab with charts & stats

## Development / Contributing
Want to add features (e.g., configurable thresholds, JSON export, CLI version)?  
Fork → PR welcome.

## License
MIT

 [NovaSubscriber Session Report.pdf](https://github.com/user-attachments/files/24676085/NovaSubscriber.Session.Report.pdf)

