/**
 * @file src/views/radius-report-view.js
 * @requires ../models/radius-metrics
 */
class RadiusReportView {
    constructor(metrics) {
        this.metrics = metrics;
    }

    render() {
        const summary = this.metrics.getSummary();
        return `
            <div style="font-family: Arial, sans-serif; padding: 30px; background: #f8f9fa; border-radius: 12px;">
                <h1 style="color: #2c3e50;">RADIUS Search Summary</h1>
                <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
                    <tr style="background:#e9ecef;"><th style="padding:12px; text-align:left;">Metric</th><th style="padding:12px; text-align:right;">Value</th></tr>
                    <tr><td>Total Entries</td><td style="text-align:right;">${summary.total}</td></tr>
                    <tr><td>Starts</td><td style="text-align:right;">${summary.starts}</td></tr>
                    <tr><td>Stops</td><td style="text-align:right;">${summary.stops}</td></tr>
                    <tr><td>Complete Sessions</td><td style="text-align:right;">${summary.sessions}</td></tr>
                    <tr><td>Avg Session Duration</td><td style="text-align:right;">${summary.avgSessionSec} seconds</td></tr>
                </table>
            </div>
        `;
    }
}
