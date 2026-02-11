class NeonovaReportOrderView extends BaseNeonovaView {
    constructor(container, username, friendlyName) {
        super(container);
        this.username = username;
        this.friendlyName = friendlyName || username;
        this.onGenerateRequested = null;
        console.print('NeonovaReportOrderView.constructor() -> this.username = ' + this.username);
        console.print('NeonovaReportOrderView.constructor() -> this.friendlyName = ' + this.friendlyName);
        this.render();
    }

        render() {
        console.log('ReportOrderView.render() called – this =', this);

        this.container.innerHTML = `
            <div class="p-6 space-y-8">
                <h2 class="text-3xl font-bold mb-8 text-white" 
                    style="text-shadow: 0 0 25px ${this.theme.accentColor};">
                    Generate Report for ${this.friendlyName}
                </h2>
                <!-- Quick Presets -->
                <div class="flex flex-wrap gap-3">
                    <button class="quick-btn px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-medium rounded-2xl text-sm transition flex items-center gap-2 shadow-md" data-days="1">
                        <i class="fas fa-calendar-day"></i> Last 1 day
                    </button>
                    <button class="quick-btn px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-medium rounded-2xl text-sm transition flex items-center gap-2 shadow-md" data-days="7">
                        <i class="fas fa-calendar-week"></i> Last 7 days
                    </button>
                    <button class="quick-btn px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-medium rounded-2xl text-sm transition flex items-center gap-2 shadow-md" data-days="30">
                        <i class="fas fa-calendar"></i> Last 30 days
                    </button>
                    <button class="quick-btn px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-medium rounded-2xl text-sm transition flex items-center gap-2 shadow-md" data-days="90">
                        <i class="fas fa-calendar-alt"></i> Last 90 days
                    </button>
                </div>

                <!-- Custom Date Range -->
                <div class="grid grid-cols-2 gap-8">
                    <!-- Start Date -->
                    <div>
                        <label class="block text-xs uppercase tracking-widest text-zinc-500 mb-3">Start Date</label>
                        <div class="grid grid-cols-3 gap-3">
                            <select id="start-year" class="bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-3 text-white focus:border-emerald-500 text-sm"></select>
                            <select id="start-month" class="bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-3 text-white focus:border-emerald-500 text-sm"></select>
                            <select id="start-day" class="bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-3 text-white focus:border-emerald-500 text-sm"></select>
                        </div>
                    </div>

                    <!-- End Date -->
                    <div>
                        <label class="block text-xs uppercase tracking-widest text-zinc-500 mb-3">End Date</label>
                        <div class="grid grid-cols-3 gap-3">
                            <select id="end-year" class="bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-3 text-white focus:border-emerald-500 text-sm"></select>
                            <select id="end-month" class="bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-3 text-white focus:border-emerald-500 text-sm"></select>
                            <select id="end-day" class="bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-3 text-white focus:border-emerald-500 text-sm"></select>
                        </div>
                    </div>
                </div>

                <button id="generate-custom" class="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-4 rounded-2xl transition text-lg">
                    Generate Report
                </button>
            </div>
        `;

        // === CORRECT DEFAULTS + BULLETPROOF SELECTION ===
        const today = new Date();
        const currentYear  = today.getFullYear();
        const currentMonth = today.getMonth() + 1;   // 1-12
        const currentDay   = today.getDate();

        const populateYears = (select, defaultYear) => {
            if (!select) return;
            select.innerHTML = '';
            for (let y = currentYear - 1; y <= currentYear + 1; y++) {
                const opt = new Option(y, y);
                select.add(opt);
            }
            select.value = defaultYear;   // ← force correct selection
        };

        const populateMonths = (select, defaultMonth) => {
            if (!select) return;
            select.innerHTML = '';
            for (let m = 1; m <= 12; m++) {
                const name = new Date(2000, m-1, 1).toLocaleString('default', { month: 'long' });
                const opt = new Option(name, m.toString().padStart(2, '0'));
                select.add(opt);
            }
            select.value = defaultMonth.toString().padStart(2, '0');
        };

        const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate();

        const populateDays = (select, year, month, defaultDay) => {
            if (!select) return;
            select.innerHTML = '';
            const days = getDaysInMonth(year, month);
            for (let d = 1; d <= days; d++) {
                const opt = new Option(d, d.toString().padStart(2, '0'));
                select.add(opt);
            }
            select.value = Math.min(defaultDay, days).toString().padStart(2, '0');
        };

        // Start date = 1st of current month
        const sy = this.container.querySelector('#start-year');
        const sm = this.container.querySelector('#start-month');
        const sd = this.container.querySelector('#start-day');
        if (sy) populateYears(sy, currentYear);
        if (sm) populateMonths(sm, currentMonth);
        if (sd) populateDays(sd, currentYear, currentMonth, 1);

        // End date = today
        const ey = this.container.querySelector('#end-year');
        const em = this.container.querySelector('#end-month');
        const ed = this.container.querySelector('#end-day');
        if (ey) populateYears(ey, currentYear);
        if (em) populateMonths(em, currentMonth);
        if (ed) populateDays(ed, currentYear, currentMonth, currentDay);

        // Listeners (unchanged except null-safe)
        const updateDays = (dayId, yearId, monthId) => {
            const y = this.container.querySelector(`#${yearId}`);
            const m = this.container.querySelector(`#${monthId}`);
            const d = this.container.querySelector(`#${dayId}`);
            if (!y || !m || !d) return;
            populateDays(d, parseInt(y.value), parseInt(m.value), parseInt(d.value) || 1);
        };

        sy?.addEventListener('change', () => updateDays('start-day', 'start-year', 'start-month'));
        sm?.addEventListener('change', () => updateDays('start-day', 'start-year', 'start-month'));
        ey?.addEventListener('change', () => updateDays('end-day', 'end-year', 'end-month'));
        em?.addEventListener('change', () => updateDays('end-day', 'end-year', 'end-month'));

        // Quick buttons + Generate button (unchanged)
        this.container.querySelectorAll('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const days = parseInt(btn.dataset.days);
                let start = new Date();
                const end = new Date();
                if (days) start.setDate(start.getDate() - days);
                if (this.onGenerateRequested) this.onGenerateRequested(start.toISOString(), end.toISOString());
            });
        });

        const genBtn = this.container.querySelector('#generate-custom');
        if (genBtn) genBtn.addEventListener('click', () => {
            const startY = parseInt(this.container.querySelector('#start-year')?.value);
            const startM = parseInt(this.container.querySelector('#start-month')?.value) - 1;
            const startD = parseInt(this.container.querySelector('#start-day')?.value);
            const start = new Date(startY, startM, startD);

            const endY = parseInt(this.container.querySelector('#end-year')?.value);
            const endM = parseInt(this.container.querySelector('#end-month')?.value) - 1;
            const endD = parseInt(this.container.querySelector('#end-day')?.value);
            const end = new Date(endY, endM, endD);
            end.setHours(23, 59, 59, 999);

            if (start > end) {
                alert('Start date must be before end date.');
                return;
            }
            if (this.onGenerateRequested) this.onGenerateRequested(start.toISOString(), end.toISOString());
        });
    }

}
