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

## Features
- Handles logs that start with Stop events
- Normalizes penalties by report duration (fairer for long vs short periods)
- Fast reconnect bonus (<30s events, capped per day)
- Export to CSV, HTML, or print-to-PDF
- Mobile-friendly report view

## Installation
1. Install Tampermonkey extension (Chrome/Firefox/Edge)
2. Click the raw link below → Tampermonkey will prompt to install  
   [Install script](https://raw.githubusercontent.com/YOURUSERNAME/neonova-subscriber-report/main/neonova-report.user.js)
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

