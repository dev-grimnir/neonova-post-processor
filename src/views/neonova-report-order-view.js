class NeonovaReportOrderView extends BaseNeonovaView {
    constructor(container, username, friendlyName) {
        super();
        this.container = container;
        this.username = username;
        this.friendlyName = friendlyName || username;
        this.onGenerateRequested = null;
    }

       render() {
        console.log('ReportOrderView.render() called – this =', this);
        this.container.innerHTML = `
            <div class="p-6">
                <h2 class="text-2xl font-bold mb-6" style="color: ${BaseNeonovaView.THEME.accent}; text-shadow: ${BaseNeonovaView.THEME.neonGlow}">
                    Generate Report for ${this.friendlyName || this.username}
                </h2>

                <!-- Your existing form fields, date pickers, etc. -->
                <div class="space-y-6">
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-2">Start Date</label>
                        <input type="date" id="startDate" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-zinc-300 mb-2">End Date</label>
                        <input type="date" id="endDate" class="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:border-emerald-500">
                    </div>
                    <!-- ... other fields ... -->
                    <button id="generateBtn" class="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-3 rounded-xl transition">
                        Generate Report
                    </button>
                </div>
            </div>
        `;

        // Attach event listeners
        this.container.querySelector('#generateBtn').addEventListener('click', () => {
            const start = this.container.querySelector('#startDate').value;
            const end = this.container.querySelector('#endDate').value;
            if (start && end) {
                if (this.onGenerateRequested) {
                    this.onGenerateRequested(start, end);
                }
            } else {
                alert('Please select both start and end dates');
            }
        });
    
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
