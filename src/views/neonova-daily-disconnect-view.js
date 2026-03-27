class NeonovaDailyDisconnectView extends NeonovaBaseModalView {
    constructor(controller, model) {
        super(controller);
        this.model = model;
    }

        show() {
        console.log('DailyDisconnectView.show() called');

        const modalHTML = `... your existing modalHTML here (same as before) ...`;

        super.createModal(modalHTML);

        // Wait until the modal is truly ready
        this.waitForModalReady(() => {
            this.render();
            this.attachListeners();
        });
    }

    waitForModalReady(callback) {
        if (this.modalReady) {
            callback();
            return;
        }

        const checkInterval = setInterval(() => {
            if (this.modalReady) {
                clearInterval(checkInterval);
                callback();
            }
        }, 5);   // check every 5ms – very fast, but safe
    }

    render() {
        if (!this.modal || !this.modalReady) {
            console.error('NeonovaDailyDisconnectView.render(): modal not ready yet');
            return;
        }

        const content = this.modal.querySelector('#daily-content');
        if (!content) {
            console.error('#daily-content not found');
            return;
        }

        content.innerHTML = this.generateEKGHTML();

        if (!this.model.events || this.model.events.length === 0) {
            content.innerHTML += `
                <div class="text-center text-zinc-400 py-20 text-lg">
                    No connection events found for this day.<br>
                    (The main report showed ${this.model.events ? '0' : '?'} events)
                </div>`;
            return;
        }

        requestAnimationFrame(() => this.initEKGChart());
    }

    attachListeners() {
        if (!this.modal || !this.modalReady) return;

        const closeBtn = this.modal.querySelector('#close-daily-btn');
        const modalEl  = this.modal.querySelector('#daily-modal');

        closeBtn?.addEventListener('click', () => this.hide());
        modalEl?.addEventListener('click', e => {
            if (e.target === modalEl) this.hide();
        });
    }

    generateEKGHTML() {
        return `
            <div class="max-w-6xl mx-auto">
                <h1 class="text-5xl font-bold text-white text-center tracking-tight">Connection Status – ${this.model.getDateString()}</h1>
                <div class="mt-12 bg-zinc-900 border border-zinc-700 rounded-3xl p-8">
                    <canvas id="ekgChart" class="w-full h-[520px]"></canvas>
                </div>
            </div>

            <style>
                #daily-content::-webkit-scrollbar { width: 10px; }
                #daily-content::-webkit-scrollbar-track { background: #18181b; }
                #daily-content::-webkit-scrollbar-thumb { background: #10b981; border-radius: 9999px; border: 2px solid #18181b; }
            </style>
        `;
    }

    initEKGChart() {
        console.log('🎨 initEKGChart called — events count:', this.model.events.length);

        const ctx = document.getElementById('ekgChart');
        if (!ctx) {
            console.error('❌ EKG canvas not found!');
            return;
        }

        if (this.model.events.length === 0) {
            console.warn('⚠️ No events in model — chart will be empty');
            // You can optionally show a message on the canvas here later
        }

        const labels = [];
        const dataPoints = [];
        const accent = '#10b981';

        this.model.events.forEach(event => {
            labels.push(event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            dataPoints.push(event.status === 'connected' ? 1 : 0);
        });

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.length ? labels : Array(24).fill('00:00'),
                datasets: [{
                    label: 'Connection Status',
                    data: dataPoints.length ? dataPoints : Array(24).fill(1),
                    borderColor: accent,
                    borderWidth: 3,
                    stepped: 'after',
                    tension: 0,
                    fill: false,
                    pointRadius: 0,
                    segment: { borderColor: ctx => (ctx.p0.parsed.y === 0 ? '#ef4444' : accent) }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { display: false, min: -0.1, max: 1.1 },
                    x: { grid: { color: '#27272a', lineWidth: 1 }, ticks: { color: '#64748b', maxRotation: 45 } }
                },
                layout: { padding: { right: 30 } }
            }
        });
    }
}
