class NeonovaReportOrderView {
    constructor(container, username, friendlyName) {
        this.container = container;
        this.username = username;
        this.friendlyName = friendlyName || username;
        this.onGenerateRequested = null;
    }

    renderOrderForm() {
        this.container.innerHTML = `
            <h1>Report Request - ${this.friendlyName} (${this.username})</h1>
    
            <div class="quick-buttons">
                <button class="quick-btn" data-hours="24">Last 24 hours</button>
                <button class="quick-btn" data-hours="48">Last 48 hours</button>
                <button class="quick-btn" data-hours="72">Last 72 hours</button>
            </div>
    
            <div class="quick-buttons">
                <button class="quick-btn" data-days="7">Last 1 week</button>
                <button class="quick-btn" data-days="30">Last 30 days</button>
                <button class="quick-btn" data-days="90">Last 90 days</button>
            </div>
    
            <div class="custom-range">
                <label>Custom Start Date:</label>
                <select id="start-month"></select>
                <select id="start-day"></select>
                <select id="start-year"></select>
    
                <label>Custom End Date:</label>
                <select id="end-month"></select>
                <select id="end-day"></select>
                <select id="end-year"></select>
    
                <button id="generate-custom">Generate Custom Report</button>
            </div>
        `;
    
         const today = new Date();
        const currentYear = today.getFullYear();
        const previousYear = currentYear - 1;
        const currentMonth = today.getMonth() + 1;   // 1-12

        const populateYears = (select, defaultYear) => {
            for (let y = previousYear; y <= currentYear; y++) {
                select.add(new Option(y, y, false, y === defaultYear));
            }
        };

        const populateMonths = (select, defaultMonth) => {
            for (let m = 1; m <= 12; m++) {
                const name = new Date(2000, m-1, 1).toLocaleString('default', { month: 'long' });
                select.add(new Option(name, m.toString().padStart(2, '0'), false, m === defaultMonth));
            }
        };

        const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

        const populateDays = (select, year, month, defaultDay) => {
            const days = getDaysInMonth(year, month);
            select.innerHTML = '';
            for (let d = 1; d <= days; d++) {
                select.add(new Option(d, d.toString().padStart(2, '0'), false, d === defaultDay));
            }
        };

        const updateDays = (dayId, yearId, monthId, defaultDay) => {
            const y = parseInt(this.container.querySelector(`#${yearId}`).value);
            const m = parseInt(this.container.querySelector(`#${monthId}`).value);
            const sel = this.container.querySelector(`#${dayId}`);
            populateDays(sel, y, m, defaultDay);
        };

        // ── Start date: 1st of current month of previous year ──
        const startYear = this.container.querySelector('#start-year');
        populateYears(startYear, previousYear);

        const startMonth = this.container.querySelector('#start-month');
        populateMonths(startMonth, currentMonth);

        const startDay = this.container.querySelector('#start-day');
        populateDays(startDay, previousYear, currentMonth, 1);

        startYear.addEventListener('change', () => updateDays('start-day', 'start-year', 'start-month', 1));
        startMonth.addEventListener('change', () => updateDays('start-day', 'start-year', 'start-month', 1));

        // ── End date: 1st of current month of current year ──
        const endYear = this.container.querySelector('#end-year');
        populateYears(endYear, currentYear);

        const endMonth = this.container.querySelector('#end-month');
        populateMonths(endMonth, currentMonth);

        const endDay = this.container.querySelector('#end-day');
        populateDays(endDay, currentYear, currentMonth, 1);

        endYear.addEventListener('change', () => updateDays('end-day', 'end-year', 'end-month', 1));
        endMonth.addEventListener('change', () => updateDays('end-day', 'end-year', 'end-month', 1));

    
        // Quick buttons
        this.container.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const hours = parseInt(btn.dataset.hours);
                const days = parseInt(btn.dataset.days);
                let start = new Date();
                const end = new Date();
                if (hours) start.setHours(start.getHours() - hours);
                if (days) start.setDate(start.getDate() - days);
                if (this.onGenerateRequested) this.onGenerateRequested(start.toISOString(), end.toISOString());
            });
        });
    
        // Custom button
        this.container.querySelector('#generate-custom').addEventListener('click', () => {
            const startY = parseInt(this.container.querySelector('#start-year').value);
            const startM = parseInt(this.container.querySelector('#start-month').value) - 1;
            const startD = parseInt(this.container.querySelector('#start-day').value);
            const start = new Date(startY, startM, startD);
    
            const endY = parseInt(this.container.querySelector('#end-year').value);
            const endM = parseInt(this.container.querySelector('#end-month').value) - 1;
            const endD = parseInt(this.container.querySelector('#end-day').value);
            const end = new Date(endY, endM, endD);
    
            // Set end time to end of day
            end.setHours(23, 59, 59, 999);
    
            if (start > end) {
                alert('Start date must be before end date.');
                return;
            }
    
            if (this.onGenerateRequested) this.onGenerateRequested(start.toISOString(), end.toISOString());
        });
    }
}
