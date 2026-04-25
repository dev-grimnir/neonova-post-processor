/**
 * Shared chart builder for both NeonovaSnapshotView (modal) and
 * NeonovaReportSnapshotView (inline). Views are dumb — they call
 * build() with a canvas, a model, and a click callback.
 *
 * Ported from the original NeonovaSnapshotView#initChart so behavior
 * matches the established modal chart 1:1. Both views now share this.
 */
class NeonovaSnapshotChart {

    /**
     * @param {HTMLCanvasElement} canvas
     * @param {NeonovaSnapshotModel} model
     * @param {(dateStr: string) => void} onDayClick
     *        Called with a YYYY-MM-DD string when the user clicks the
     *        bottom label zone. The view forwards this to its controller.
     * @returns {{ chart: Chart, periods: Array }}
     */
    static build(canvas, model, onDayClick) {
        const events = (model.getEvents ? model.getEvents() : model.events) || [];
        const sortedEvents = [...events].sort((a, b) =>
            (a.dateObj || new Date(0)) - (b.dateObj || new Date(0))
        );

        const startTime = model.startDate.getTime();
        const endTime   = model.endDate.getTime();

        // Build periods FIRST — single source of truth for tooltip
        const periods = [];
        let i = 0;
        while (i < sortedEvents.length) {
            const isConnected = (sortedEvents[i].status === 'Start' || sortedEvents[i].status === 'connected');
            const startMs = sortedEvents[i].dateObj.getTime();

            let j = i + 1;
            while (j < sortedEvents.length &&
                   (sortedEvents[j].status === 'Start' || sortedEvents[j].status === 'connected') === isConnected) {
                j++;
            }

            const endMs = j < sortedEvents.length
                ? sortedEvents[j].dateObj.getTime() - 1
                : endTime;

            periods.push({ startMs, endMs, isConnected });
            i = j;
        }

        // Build chart points from periods (two points each = no diagonals)
        const rawPeriods = [];
        periods.forEach(p => {
            const y = p.isConnected ? 1 : -1;
            rawPeriods.push({ x: p.startMs, y });
            rawPeriods.push({ x: p.endMs,   y });
        });

        const chart = new Chart(canvas, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Connected',
                        data: rawPeriods.map(pt => ({ x: pt.x, y: pt.y > 0 ? 1 : 0 })),
                        borderColor: '#10b981',
                        backgroundColor: '#10b98188',
                        borderWidth: 0,
                        stepped: 'after',
                        tension: 0,
                        fill: 'origin',
                        pointRadius: 0
                    },
                    {
                        label: 'Disconnected',
                        data: rawPeriods.map(pt => ({ x: pt.x, y: pt.y < 0 ? -1 : 0 })),
                        borderColor: '#ef4444',
                        backgroundColor: '#ef444488',
                        borderWidth: 0,
                        stepped: 'after',
                        tension: 0,
                        fill: 'origin',
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        intersect: false,
                        mode: 'index',
                        callbacks: {
                            title: (items) => {
                                if (!items.length) return '';
                                return new Date(items[0].parsed.x).toLocaleString([], {
                                    month: 'short', day: 'numeric',
                                    hour: 'numeric', minute: '2-digit'
                                });
                            },
                            label: (ctx) => {
                                if (ctx.parsed.y === 0) return '';

                                const currentX = ctx.parsed.x;
                                const period = periods.find(p => currentX >= p.startMs && currentX <= p.endMs);
                                if (!period) return '';

                                const fmt = (ms) => new Date(ms).toLocaleString([], {
                                    month: 'short', day: 'numeric',
                                    hour: 'numeric', minute: '2-digit'
                                });

                                const durMs  = period.endMs - period.startMs;
                                const hours  = Math.floor(durMs / 3600000);
                                const mins   = Math.floor((durMs % 3600000) / 60000);
                                const durStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

                                const label = period.isConnected ? 'Connected' : 'Disconnected';
                                return `${label} — ${fmt(period.startMs)} to ${fmt(period.endMs)} (${durStr})`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        min: startTime,
                        max: endTime,
                        grid: { color: '#27272a' },
                        ticks: {
                            color: '#64748b',
                            maxTicksLimit: 5,
                            callback: v => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        }
                    },
                    y: {
                        min: -1.2,
                        max: 1.2,
                        ticks: { display: false },
                        grid: {
                            color: ctx => ctx.tick.value === 0 ? '#a3a3a3' : '#27272a',
                            lineWidth: ctx => ctx.tick.value === 0 ? 4 : 1.5
                        }
                    }
                },
                layout: { padding: { right: 40, left: 20, top: 30, bottom: 20 } }
            }
        });

        setTimeout(() => chart?.resize(), 100);

        // Click in the bottom label zone to drill down to a single day.
        canvas.addEventListener('click', (e) => {
            if (!onDayClick) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (y < chart.chartArea.bottom - 30) return;

            const clickedMs = chart.scales.x.getValueForPixel(x);
            if (clickedMs == null || isNaN(clickedMs)) return;
            const d = new Date(clickedMs);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            onDayClick(dateStr);
        });

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const y = e.clientY - rect.top;
            canvas.style.cursor = y > chart.chartArea.bottom - 30 ? 'pointer' : 'default';
        });

        return { chart, periods };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NeonovaSnapshotChart;
}
