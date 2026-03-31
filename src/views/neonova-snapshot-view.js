// =============================================
// NeonovaSnapshotView
// Dumb UI container only – extends NeonovaBaseModalView
// Receives single source of truth via setData() and controls all rendering
// src/views/NeonovaSnapshotView.js
// =============================================

class NeonovaSnapshotView extends NeonovaBaseModalView {
  #chart = null;
  #periodsList = null;
  #uptimePercent = 0;
  #snapshotDate = null;
  #container = null;

  constructor(containerElement) {
    super();
    this.#container = containerElement;
  }

  /**
   * Single source of truth from controller.
   * periodsList = [{ start: Date, end: Date, connected: boolean, duration: number }, ...]
   * View builds EVERYTHING (header + Chart.js) from this list only.
   */
  setData(periodsList, uptimePercent, snapshotDate) {
    this.#periodsList = Array.isArray(periodsList) ? periodsList : [];
    this.#uptimePercent = Number(uptimePercent) || 0;
    this.#snapshotDate = new Date(snapshotDate);

    this.#renderChart();
  }

  show() {
    super.show(); // inherited from NeonovaBaseModalView – shows the modal
  }

  hide() {
    super.hide(); // inherited from NeonovaBaseModalView – hides the modal
  }

  #renderChart() {
    // Header (date + uptime)
    const formattedDate = this.#snapshotDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let header = this.#container.querySelector('.neonova-snapshot-header');
    if (!header) {
      header = document.createElement('div');
      header.className = 'neonova-snapshot-header';
      header.style.cssText = 'margin-bottom:12px;font-weight:600;font-size:17px;color:#111;';
      this.#container.prepend(header);
    }
    header.innerHTML = `${formattedDate} – <span style="color:#10b981;">${this.#uptimePercent}% uptime</span>`;

    // Canvas (create once)
    let canvas = this.#container.querySelector('canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      this.#container.appendChild(canvas);
    }

    const ctx = canvas.getContext('2d');

    // Destroy previous chart if any
    if (this.#chart) {
      this.#chart.destroy();
      this.#chart = null;
    }

    // Build Chart.js datasets from the single periodsList (one source of truth)
    const { connectedData, disconnectedData, centerData, startOfDay, endOfDay } = this.#buildDatasetsFromPeriods();

    this.#chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Connected',
            data: connectedData,
            borderColor: 'transparent',
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            fill: 'origin',
            stepped: 'after',
            borderWidth: 0,
            pointRadius: 0,
            tension: 0
          },
          {
            label: 'Disconnected',
            data: disconnectedData,
            borderColor: 'transparent',
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            fill: 'origin',
            stepped: 'after',
            borderWidth: 0,
            pointRadius: 0,
            tension: 0
          },
          {
            label: 'Center Line',
            data: centerData,
            borderColor: '#1f2937',
            borderWidth: 4,
            fill: false,
            pointRadius: 0,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: { unit: 'minute', displayFormats: { minute: 'HH:mm' } },
            min: startOfDay,
            max: endOfDay,
            grid: { color: '#e5e7eb', lineWidth: 1 },
            ticks: { maxRotation: 0, autoSkipPadding: 15 }
          },
          y: {
            min: -1.2,
            max: 1.2,
            display: false,
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            mode: 'nearest',
            intersect: false,
            backgroundColor: '#111827',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#374151',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              title: () => '',
              label: (context) => {
                if (context.dataset.label === 'Center Line') return '';
                const xValue = context.parsed.x;
                const period = this.#periodsList.find(
                  p => xValue >= p.start.getTime() && xValue < p.end.getTime()
                );
                if (!period) return context.dataset.label;

                const status = period.connected ? 'Connected' : 'Disconnected';
                const startStr = period.start.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                });
                const endStr = period.end.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                });
                const durationStr = this.#formatDuration(period.duration);

                return `${status} - ${startStr} - ${endStr} = Duration: ${durationStr}`;
              }
            }
          }
        }
      }
    });
  }

  #buildDatasetsFromPeriods() {
    const startOfDay = new Date(this.#snapshotDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    // Convert single periodsList into the minimal points needed for Chart.js
    const chartPoints = [];
    for (const period of this.#periodsList) {
      chartPoints.push({ time: period.start, connected: period.connected });
    }
    // Ensure final point at midnight
    if (chartPoints.length > 0) {
      chartPoints.push({ time: endOfDay, connected: chartPoints[chartPoints.length - 1].connected });
    } else {
      chartPoints.push({ time: startOfDay, connected: false });
      chartPoints.push({ time: endOfDay, connected: false });
    }

    const connectedData = chartPoints.map(p => ({ x: p.time, y: p.connected ? 1 : 0 }));
    const disconnectedData = chartPoints.map(p => ({ x: p.time, y: p.connected ? 0 : -1 }));
    const centerData = chartPoints.map(p => ({ x: p.time, y: 0 }));

    return { connectedData, disconnectedData, centerData, startOfDay, endOfDay };
  }

  #formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}
