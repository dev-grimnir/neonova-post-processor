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
                syear: startDate.getFullYear().toString(),
                smonth: (startDate.getMonth() + 1).toString().padStart(2, '0'),
                sday: startDate.getDate().toString().padStart(2, '0'),
                eyear: endDate.getFullYear().toString(),
                emonth: (endDate.getMonth() + 1).toString().padStart(2, '0'),
                eday: endDate.getDate().toString().padStart(2, '0')
            };

            console.log('📡 overrides:', overrides);

            // Direct call — no extra logic that could retry
            const searchDoc = await NeonovaHTTPController.paginateReportLogs(this.model.username, overrides);

            console.log('📦 paginateReportLogs returned:', typeof searchDoc, searchDoc ? 'non-null' : 'null');

            // Minimal processing
            let rawEntries = [];
            if (searchDoc instanceof Map) rawEntries = Array.from(searchDoc.values());
            else if (Array.isArray(searchDoc)) rawEntries = searchDoc;
            else if (searchDoc && typeof searchDoc === 'object') rawEntries = Object.values(searchDoc);

            console.log('🔄 rawEntries length:', rawEntries.length);

            const validEntries = rawEntries.filter(e => e && typeof e === 'object');

            const processed = NeonovaCollector.cleanEntries(validEntries);
            const events = Array.isArray(processed) ? processed : [];

            console.log('✅ events length:', events.length);

            const dailyModel = new NeonovaDailyDisconnectModel(
                this.model.username,
                this.model.friendlyName,
                clickedDate,
                events
            );

            console.log('✅ Model ready — launching view');

            const dailyView = new NeonovaDailyDisconnectView(this, dailyModel);
            dailyView.show();

        } catch (err) {
            console.error('❌ openDailyDisconnectDetail failed:', err);
        }
    }
    
}
