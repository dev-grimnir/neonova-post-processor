class NeonovaDailyDisconnectView extends NeonovaBaseModalView {
    constructor(controller, model) {
        super(controller);
        this.model = model;
        this._hasShown = false;
    }

    show() {
        if (this._hasShown) return;
        this._hasShown = true;

        console.log('DailyDisconnectView.show() called');

        const modalHTML = `
            <div id="daily-modal" class="fixed inset-0 bg-black/85 flex items-center justify-center z-[10001] opacity-0 transition-opacity duration-400">
                <div class="bg-[#18181b] border border-[#27272a] rounded-3xl w-[1280px] max-w-[96vw] max-h-[96vh] overflow-hidden shadow-2xl flex flex-col transform scale-95 transition-all duration-500">
                    <!-- Header -->
                    <div class="px-8 py-6 border-b border-[#27272a] bg-[#09090b] flex-shrink-0 flex items-center justify-between">
                        <div>
                            <div class="text-emerald-400 text-xs font-mono tracking-widest">${this.model.friendlyName || 'User'}</div>
                            <div class="text-3xl font-semibold text-white mt-1">${this.model.getDateString ? this.model.getDateString() : 'Selected Date'}</div>
                        </div>
                        <button id="close-daily-btn" class="px-6 py-2.5 text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl flex items-center gap-2 transition">
                            ✕ Close
                        </button>
                    </div>
                    
                    <!-- Content -->
                    <div id="daily-content" class="flex-1 overflow-y-auto p-8 bg-[#18181b]">
                    </div>
                </div>
            </div>
        `;

        super.createModal(modalHTML).then(() => {
            this.render();
            this.attachListeners();
        }).catch(err => console.error('Modal creation failed:', err));
    }

    render() {
        const content = this.modal.querySelector('#daily-content');
        if (!content) return;

        content.innerHTML = this.generateEKGHTML();

        if (!this.model.events || this.model.events.length < 2) {
            content.innerHTML += `<div class="text-center text-zinc-400 py-20 text-lg">No events found.</div>`;
            return;
        }

        requestAnimationFrame(() => this.initEKGChart());
    }

    generateEKGHTML() {
        return `
            <div class="max-w-6xl mx-auto">
                <h1 class="text-5xl font-bold text-white text-center tracking-tight mb-8">Connection Status – ${this.model.getDateString ? this.model.getDateString() : ''}</h1>
                <div class="bg-zinc-900 border border-zinc-700 rounded-3xl p-8" style="height: 620px;">
                    <canvas id="ekgChart" class="w-full h-full"></canvas>
                </div>
            </div>
        `;
    }

    initEKGChart() {
        console.log('initEKGChart called — events count:', this.model.events ? this.model.events.length : 0);
    
        const canvas = document.getElementById('ekgChart');
        if (!canvas) {
            console.error('EKG canvas #ekgChart not found!');
            return;
        }
    
        if (!this.model.events || this.model.events.length < 2) {
            // Optional: you could draw a static "no data" message on the canvas if you want
            return;
        }
    
        const labels = [];
        const dataPoints = [];
    
        // Ensure events are sorted by time (just in case the model doesn't guarantee it)
        const sortedEvents = [...this.model.events].sort((a, b) => 
            (a.dateObj || new Date(0)) - (b.dateObj || new Date(0))
        );
    
        sortedEvents.forEach(event => {
            const timeStr = event.dateObj 
                ? event.dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '??:??';
    
            labels.push(timeStr);
            // +1 = connected (green bar above center), -1 = disconnected (red bar below center)
            dataPoints.push(event.status === 'connected' || event.status === 'Start' ? 1 : -1);
        });
    
        // Destroy any previous chart instance on this canvas (prevents duplicate charts if show() is called again)
        if (this._ekgChartInstance) {
            this._ekgChartInstance.destroy();
        }
    
        this._ekgChartInstance = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Modem Status',
                    data: dataPoints,
                    borderWidth: 4,                    // thicker "top" of the bar
                    stepped: 'after',                  // holds value until next change → rectangular blocks
                    tension: 0,                        // sharp corners
                    fill: 'origin',                    // fills from the line down/up to the horizontal center line (y=0)
                    pointRadius: 0,
                    segment: {
                        borderColor: (ctx) => (ctx.p0.parsed.y < 0 ? '#ef4444' : '#10b981'),
                        backgroundColor: (ctx) => (ctx.p0.parsed.y < 0 ? '#ef444488' : '#10b98188')
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    // Optional tooltip that shows exact time + status
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ctx.parsed.y > 0 ? 'Connected' : 'Disconnected'
                        }
                    }
                },
                scales: {
                    y: { 
                        display: true,
                        min: -1.2,
                        max: 1.2,
                        ticks: { display: false },
                        grid: {
                            color: (context) => context.tick.value === 0 ? '#a3a3a3' : '#27272a',
                            lineWidth: (context) => context.tick.value === 0 ? 4 : 1.5,
                            drawOnChartArea: true
                        }
                    },
                    x: { 
                        grid: { color: '#27272a', lineWidth: 1 },
                        ticks: { 
                            color: '#64748b', 
                            maxRotation: 45,
                            minRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: 18
                        }
                    }
                },
                layout: { 
                    padding: { right: 40, left: 20, top: 30, bottom: 10 } 
                }
            }
        });
    }
    
    attachListeners() {
        const closeBtn = this.modal.querySelector('#close-daily-btn');
        const modalEl  = this.modal.querySelector('#daily-modal');

        closeBtn?.addEventListener('click', () => this.hide());
        modalEl?.addEventListener('click', e => {
            if (e.target === modalEl) this.hide();
        });
    }
}
