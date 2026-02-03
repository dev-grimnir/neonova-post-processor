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
    
        // Populate dropdowns
        const today = new Date();
        const currentYear = today.getFullYear();
        const previousYear = currentYear - 1;
        const currentMonth = today.getMonth() + 1;
    
        const populateYears = (select, defaultYear) => {
            for (let y = previousYear; y <= currentYear; y++) {
                select.add(new Option(y, y, y === defaultYear));
            }
        };
    
        const populateMonths = (select, defaultMonth) => {
            for (let m = 1; m <= 12; m++) {
                select.add(new Option(new Date(2000, m-1, 1).toLocaleString('default', { month: 'long' }), m.toString().padStart(2, '0'), m === defaultMonth));
            }
        };
    
        const getDaysInMonth = (year, month) => {
            return new Date(year, month, 0).getDate();
        };
    
        const populateDays = (select, year, month, defaultDay) => {
            const daysInMonth = getDaysInMonth(year, month);
            select.innerHTML = '';
            for (let d = 1; d <= daysInMonth; d++) {
                select.add(new Option(d, d.toString().padStart(2, '0'), d === defaultDay));
            }
        };
    
        const updateDays = (daySelectId, yearSelectId, monthSelectId, defaultDay) => {
            const year = parseInt(this.container.querySelector(`#${yearSelectId}`).value);
            const month = parseInt(this.container.querySelector(`#${monthSelectId}`).value);
            const select = this.container.querySelector(`#${daySelectId}`);
            const currentValue = parseInt(select.value) || defaultDay;
            populateDays(select, year, month, defaultDay);
            select.value = Math.min(currentValue, getDaysInMonth(year, month)).toString().padStart(2, '0');
        };
    
        // Start date dropdowns
        const startYearSelect = this.container.querySelector('#start-year');
        populateYears(startYearSelect, previousYear);
    
        const startMonthSelect = this.container.querySelector('#start-month');
        populateMonths(startMonthSelect, currentMonth);
    
        const startDaySelect = this.container.querySelector('#start-day');
        const initialStartYear = parseInt(startYearSelect.value);
        const initialStartMonth = parseInt(startMonthSelect.value);
        populateDays(startDaySelect, initialStartYear, initialStartMonth, 1);
    
        startYearSelect.addEventListener('change', () => updateDays('start-day', 'start-year', 'start-month', 1));
        startMonthSelect.addEventListener('change', () => updateDays('start-day', 'start-year', 'start-month', 1));
    
        // End date dropdowns
        const endYearSelect = this.container.querySelector('#end-year');
        populateYears(endYearSelect, currentYear);
    
        const endMonthSelect = this.container.querySelector('#end-month');
        populateMonths(endMonthSelect, currentMonth);
    
        const endDaySelect = this.container.querySelector('#end-day');
        const initialEndYear = parseInt(endYearSelect.value);
        const initialEndMonth = parseInt(endMonthSelect.value);
        populateDays(endDaySelect, initialEndYear, initialEndMonth, 1);
    
        endYearSelect.addEventListener('change', () => updateDays('end-day', 'end-year', 'end-month', 1));
        endMonthSelect.addEventListener('change', () => updateDays('end-day', 'end-year', 'end-month', 1));
    
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
