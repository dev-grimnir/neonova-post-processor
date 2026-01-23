# Grok Memory – NeoNova RADIUS Dashboard & Headless Report Builder

## Project Overview
- Tampermonkey userscript + dashboard for NeoNova admin portal (https://admin.neonova.net/rat/)
- Purpose: Poll RADIUS logs for multiple customers, display real-time status (Connected / Not Connected) + session duration
- Key features already working:
  - Add/remove customers
  - Background polling (updateCustomerStatus)
  - Multi-customer concurrent display
  - In-place editing of friendly name (click name → input → save/Enter, blank resets to radiusUsername)
  - Headless pagination of RADIUS logs using `location` offset + `direction=0` (forward)
  - Parses table correctly (skips header, extracts timestamp[0], status[4], sessionTime[6])
  - Duration formatted DD:HH:MM:SS, resets to 00:00:00:00 on Stop
  - Status from most recent log entry (last row of last page)

## Important Technical Details
- Files & Classes:
  - `base-neonova-controller.js`: BaseNeoNovaController (pagination, parsing, getLatestEntry)
  - `neonova-dashboard-controller.js`: NeonovaDashboardController (poll, updateCustomerStatus)
  - `neonova-dashboard-view.js`: NeonovaDashboardView (render table, remove buttons, now with .friendly-name click-to-edit)
  - `customer.js`: Customer model (radiusUsername, friendlyName nullable, status, durationSec, getDurationStr)
- Pagination breakthrough: `location` = offset (0, 50, 100...), `direction=0` (next), `hits=50`
  - Stops when page returns <50 rows
  - Sorts entries newest-first after collection
- Report generation (WIP):
  - Button in dashboard → opens new tab
  - Tab UI: month/day/year dropdowns (default current), Generate button, progress bar
  - Next: headless fetch of logs for selected date range → build HTML report → display in tab

## Recent Fixes & Status
- Fixed NaN duration → pass numeric seconds to customer.update (view expects number, formats via getDurationStr)
- Friendly name editable in-place (added listener after render, no overwrite)
- Pagination now fetches all pages reliably (332 entries / 7 pages for test user)
- Current date in context: January 22, 2026

## Next Goal
Finish headless report in new tab:
- Add year dropdown
- On Generate: run paginateReportLogs with custom date range
- Build report HTML from entries (summary + table)
- Show progress (real % from page count)
- Open final report in same tab or download

Resume from here — ignore earlier chat bloat.
