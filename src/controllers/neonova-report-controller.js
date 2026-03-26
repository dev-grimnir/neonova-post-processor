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

    async openDailyDisconnectDetail(clickedDate) {
        console.log('🚀 openDailyDisconnectDetail START for date:', clickedDate);

        try {
            const startDate = new Date(clickedDate);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(clickedDate);
            endDate.setHours(23, 59, 59, 999);

            const overrides = {
                syear:  startDate.getFullYear().toString(),
                smonth: (startDate.getMonth() + 1).toString().padStart(2, '0'),
                sday:   startDate.getDate().toString().padStart(2, '0'),
                eyear:  endDate.getFullYear().toString(),
                emonth: (endDate.getMonth() + 1).toString().padStart(2, '0'),
                eday:   endDate.getDate().toString().padStart(2, '0')
            };

            console.log('📡 Calling paginateReportLogs with overrides:', overrides);

            const searchDoc = await NeonovaHTTPController.paginateReportLogs(
                this.model.username,
                overrides
            );

            console.log('📦 paginateReportLogs returned:', searchDoc ? 'document object' : 'null/undefined');

            const collector = new NeonovaCollector();
            const processed = collector.process(searchDoc);   // ← change to collector.processDailyLogs if that's what the main report uses

            console.log('🔧 Collector processed result:', processed);
            console.log('🔑 Has .events?', !!processed.events);
            console.log('🔑 Events length:', processed.events ? processed.events.length : 'N/A');

            const dailyModel = new NeonovaDailyDisconnectModel(
                this.model.username,
                this.model.friendlyName,
                clickedDate,
                processed.events || processed   // fallback in case collector returns array directly
            );

            console.log('✅ Daily model created with', dailyModel.events.length, 'events');

            const dailyView = new NeonovaDailyDisconnectView(this, dailyModel);
            dailyView.show();

        } catch (err) {
            console.error('❌ Daily detail failed:', err);
        }
    }
    
}
