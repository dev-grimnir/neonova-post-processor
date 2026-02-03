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

cleanEntries(entries) {
    if (!entries || entries.length === 0) {
        return [];
    }

    // Map to standardized format (use getTime() for numeric date)
    let allEntries = entries.map(entry => {
        const date = entry.dateObj.getTime();  // Unix ms (numeric, unique)
        if (isNaN(date)) {
            return null;
        }
        return { date, status: entry.status, dateObj: entry.dateObj };
    }).filter(entry => entry !== null);  // Remove invalids

    // Sort ascending by date (oldest to newest)
    allEntries.sort((a, b) => a.date - b.date);

    // De-dupe: Keep unique by date + status
    const seen = new Set();
    const cleaned = [];
    allEntries.forEach(entry => {
        const key = `${entry.date}_${entry.status}`;
        if (!seen.has(key)) {
            seen.add(key);
            cleaned.push(entry);
        } else {
        }
    });

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
