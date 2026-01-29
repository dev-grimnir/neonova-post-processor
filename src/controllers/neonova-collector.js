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
        console.log('[Collector] No entries provided to clean.');
        return [];
    }

    // Map to standardized format
    let allEntries = entries.map(entry => {
        const timestamp = Number(entry.timestamp);
        const fixedDate = new Date(timestamp);
        return { date: timestamp, status: entry.status, dateObj: fixedDate };
    });

    // Sort ascending by date (oldest to newest)
    allEntries.sort((a, b) => a.date - b.date);

    // De-dupe: Keep unique by timestamp + status (use a Set for seen keys)
    const seen = new Set();
    const cleaned = [];
    allEntries.forEach(entry => {
        const key = `${entry.date}_${entry.status}`;
        if (!seen.has(key)) {
            seen.add(key);
            cleaned.push(entry);
        } else {
            console.log('Skipped duplicate entry:', entry);  // Should be rare/none per your data
        }
    });

    console.log('[Collector] cleanEntries finished');
    console.log('  - Raw entries before clean:', allEntries.length);
    console.log('  - Cleaned entries after:', cleaned.length);
    console.log('  - Sample cleaned:', cleaned.slice(0, 3));

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
