# NeoNova Subscriber Dashboard & Reports

A powerful Tampermonkey userscript suite for NeoNova admins (`admin.neonova.net`). 

**Real-time customer monitoring + professional stability reports** with live polling, one-click customer addition, dual stability scores, rolling 7-day charts, and exports.

Built for field techs and small ISPs who need better visibility into modem flaps, uptime, and reconnect behavior.

![Dashboard Screenshot](https://github.com/dev-grimnir/neonova-post-processor/screenshots/dashboard-ss.png)
*(Live dashboard with polling controls, status table, and Add Customer modal)*

## ✨ Current Features

### Live Dashboard
- Real-time customer status polling (configurable interval)
- Pause/Resume + manual Refresh
- One-click **Add Customer** modal (no more inline form clutter)
- Remove & Report buttons per customer
- Clean, consistent UI with Tailwind styling

### Professional Reports
- Dual stability scores (mean + median session-based)
- Uptime %, session/reconnect stats, peak analysis
- Hourly, daily, and **rolling 7-day** disconnect charts (Chart.js)
- Long disconnect table + export (HTML / CSV / PDF)
- Handles 140k+ row reports without breaking
- Total results counted + duplicates ignored note restored

### Under the Hood
- Fully refactored `NeonovaAnalyzer` (clean private helpers, heavily commented)
- Stress-tested on massive admin accounts
- Zero console errors on normal use

## Installation

1. Install **Tampermonkey** (Chrome / Firefox / Edge).
2. Click these raw links — Tampermonkey will prompt to install:

   - **[NovaSubscriber Dashboard](https://raw.githubusercontent.com/dev-grimnir/neonova-post-processor/dev/src/scripts/NovaSubscriber-Dashboard.user.js)** ← Main script
   - All supporting files are auto-required

3. Visit `https://admin.neonova.net` → log in → the dashboard panel appears automatically.

## Usage

- **Dashboard**: Monitor multiple customers live. Use "Add Customer", Refresh, or let it poll.
- **Reports**: Click any "Report" button → generates beautiful HTML with charts and stats.
- **Export**: HTML, CSV, or PDF from any report.

## Recent Major Updates (2026)

- Live dashboard with polling and Add Customer modal
- Complete analyzer refactor (modular, testable, documented)
- Rolling 7-day chart fixed and scaled properly
- Total results counted / ignored duplicates restored
- Button styling unified across the entire UI
- 140k-row stress testing passed

## Tech Stack

- Tampermonkey userscript
- Pure JavaScript + Chart.js
- Tailwind CSS (via CDN for dev speed)
- jsPDF + html2canvas for PDF export

## Contributing

PRs welcome! Especially interested in:
- More chart types
- Configurable scoring weights
- Dark/light theme toggle
- CLI version for bulk reports

## License

MIT

---

**Made with ❤️ for NeoNova admins who hate guessing why the modem keeps dropping.**
