/**
 * @file src/collectors/radius-collector.js
 * @requires ../models/radius-entry
 */
class RadiusCollector {
    constructor() {
        this.analysisMode = localStorage.getItem('radiusAnalysisMode') === 'true';
        this.entries = JSON.parse(localStorage.getItem('radiusEntries') || '[]');
        this.pages = parseInt(localStorage.getItem('radiusPages') || '0');
        this.tableSelector = 'table[cellspacing="2"][cellpadding="2"]';
    }

    collectFromPage() {
        const table = document.querySelector(this.tableSelector);
        if (!table) {
            console.log('[Collector] No table found with selector:', this.tableSelector);
            return;
        }

        const rows = table.querySelectorAll("tbody tr");
        console.log('[Collector] Found', rows.length, 'rows');

        rows.forEach(row => {
            const cells = row.querySelectorAll("td");
            if (cells.length < 5) return;

            const dateStr = cells[0].textContent.trim();
            const statusCellIndex = 4; // CHANGE THIS to match your RADIUS table
            const statusStr = cells[statusCellIndex]?.textContent.trim().toLowerCase() || '';

            const date = new Date(dateStr.replace(" ", "T"));
            if (isNaN(date.getTime())) return;

            const isStart = statusStr.includes('acct-start') ||
                            statusStr.includes('accounting start') ||
                            statusStr.includes('access-accept') ||
                            statusStr.includes('begin');

            this.entries.push(new RadiusEntry(date.getTime(), isStart));
            console.log('[Collector] Added entry:', isStart ? 'START' : 'STOP', date.toISOString());
        });

        localStorage.setItem('radiusEntries', JSON.stringify(this.entries));
        console.log('[Collector] Total entries collected:', this.entries.length);
    }

    startAnalysis() {
        localStorage.setItem('radiusAnalysisMode', 'true');
        localStorage.setItem('radiusPages', '0');
        localStorage.setItem('radiusEntries', JSON.stringify([]));
        location.reload();
    }

    advancePage() {
        const nextLink = Array.from(document.querySelectorAll('a'))
            .find(a => a.textContent.trim().startsWith('NEXT @') && a.href && a.href.includes('index.php'));
        console.log('[Collector] Next link found?', !!nextLink);
        if (nextLink) {
            this.pages++;
            localStorage.setItem('radiusPages', this.pages);
            setTimeout(() => nextLink.click(), 10);
            return true;
        }
        console.log('[Collector] No NEXT @ link - analysis complete');
        return false;
    }

    getEntries() {
        return this.entries;
    }

    getPages() {
        return this.pages;
    }

    endAnalysis() {
        localStorage.removeItem('radiusAnalysisMode');
        localStorage.removeItem('radiusPages');
        localStorage.removeItem('radiusEntries');
    }
}
