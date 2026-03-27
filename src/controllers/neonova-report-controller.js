class NeonovaReportController {
    model;
    constructor(username, friendlyName, metrics, length, longDisconnects) {
        this.model = new NeonovaReportModel(
            username,
            friendlyName,
            metrics,
            length,
            metrics.longDisconnects || []
        );

        this.view = new NeonovaReportView(this, this.model);
        this.view.show();
    }

    async openDailyDisconnectDetail(dateStr) {   // dateStr like "2026-03-22"
        console.log('🚀 openDailyDisconnectDetail START for dateStr:', dateStr);

        try {
            // Parse the clean date string
            const [year, month, day] = dateStr.split('-').map(Number);

            const startDate = new Date(year, month - 1, day, 0, 0, 0);   // 00:00:00
            const endDate   = new Date(year, month - 1, day, 23, 59, 59); // 23:59:59

            console.log('📅 Using startDate:', startDate.toISOString(), 'endDate:', endDate.toISOString());

            // Call the battle-tested method with proper Date objects
            const entries = await NeonovaHTTPController.paginateReportLogs(
                this.model.username,
                startDate,
                endDate
                // No onProgress or signal for now (keep it simple)
            );

            console.log('📦 paginateReportLogs returned', entries ? entries.length : 0, 'entries');

            // Pass directly to cleanEntries (static class)
            const processed = NeonovaCollector.cleanEntries(entries || []);

            const events = Array.isArray(processed) ? processed : [];

            console.log('✅ After cleanEntries — events length:', events.length);

            const dailyModel = new NeonovaDailyDisconnectModel(
                this.model.username,
                this.model.friendlyName,
                new Date(dateStr),
                events
            );

            console.log('✅ Daily model created — launching view');

            const dailyView = new NeonovaDailyDisconnectView(this, dailyModel);
            dailyView.show();

        } catch (err) {
            console.error('❌ Daily detail failed:', err);
            alert('Could not load daily details. Check console.');
        }
    }
    
}
