// ⚠️ GENERATED FILE FORMAT — produced by espn-schedule-scraper.js (spec D4).
// DATA ONLY — no logic, ever.
// Companion: functions/season-data.json must contain identical values
// (enforced by tests/season-config-drift.test.js).
(function () {
    'use strict';

    const SEASON_DATA = {
        year: 2026,
        weekAnchor: '2026-09-09',
        kickoffDateTime: '2026-09-09T20:20:00-04:00',
        seasonEndDate: '2027-01-11T23:59:59-05:00',
        totalWeeks: 18,
        poolId: 'nerduniverse-2026',
        poolDisplayName: 'Nerd Universe 2026',
        espnScheduleUrlTemplate: 'https://www.espn.com/nfl/schedule/_/week/{WEEK}/year/{YEAR}/seasontype/2'
    };

    Object.freeze(SEASON_DATA);

    if (typeof window !== 'undefined') {
        window.SEASON_DATA = SEASON_DATA;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { SEASON_DATA };
    }
})();
