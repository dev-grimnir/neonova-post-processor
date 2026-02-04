/**
 * @file src/controllers/neonova-collector.js
 * Handles page scraping, pagination, and entry cleaning
 * @requires ../models/log-entry
 */
class NeonovaCollector {
    constructor() {
        this.analysisMode = localStorage.getItem('novaAnalysisMode') === 'true';
        this.allEntries = JSON.parse(localStorage.getItem('novaEntries') || '[]');
        this.pages = parseInt(localStorage.getItem('novaPages') || '0');
        this.table = document.querySelector('table[cellspacing="2"][cellpadding="2"]');
    }

    collectFromPage() {
        if (!this.table) return;
        const rows = document.querySelectorAll("table tbody tr");
        rows.forEach(row => {
            const cells = row.querySelectorAll("td");
            if (cells.length < 7) return;
            const dateStr = cells[0].textContent.trim();
            const status = cells[4].textContent.trim();
            if ((status === "Start" || status === "Stop") && dateStr) {
                const date = new Date(dateStr.replace(" ", "T"));
                if (!isNaN(date)) {
                    this.allEntries.push(new LogEntry(date.getTime(), status, date));
                }
            }
        });
        localStorage.setItem('novaEntries', JSON.stringify(this.allEntries));
    }

    startAnalysis() {
        localStorage.setItem('novaAnalysisMode', 'true');
        localStorage.setItem('novaPages', '0');
        localStorage.setItem('novaEntries', JSON.stringify([]));
        location.reload();
    }

    advancePage() {
        const nextLink = Array.from(document.querySelectorAll('a'))
            .find(a => a.textContent.trim().startsWith('NEXT @') && a.href && a.href.includes('index.php'));
        if (nextLink) {
            this.pages++;
            localStorage.setItem('novaPages', this.pages);
            setTimeout(() => nextLink.click(), 10);
            return true;
        }
        return false;
    }

    cleanEntries(rawEntries) {
        if (!rawEntries || rawEntries.length === 0) return [];
    
        const cleaned = [rawEntries[0]];   // always keep the first one
    
        for (let i = 1; i < rawEntries.length; i++) {
            const prev = rawEntries[i - 1];
            const curr = rawEntries[i];
    
            // Keep everything EXCEPT consecutive identical status
            if (prev.status !== curr.status) {
                cleaned.push(curr);
            } else {
                console.log(`[CLEAN] Removed consecutive ${curr.status} @ ${curr.timestamp}`);
            }
        }
    
        console.log(`cleanEntries: ${rawEntries.length} raw → ${cleaned.length} kept`);
        return cleaned;
    }

    getPages() {
        return this.pages;
    }

    endAnalysis() {
        localStorage.removeItem('novaAnalysisMode');
        localStorage.removeItem('novaPages');
        localStorage.removeItem('novaEntries');
    }
}
