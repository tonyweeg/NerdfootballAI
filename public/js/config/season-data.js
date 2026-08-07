// ⚠️ GENERATED FILE FORMAT — espn-schedule-scraper.js will emit this file (spec D4).
// Hand-authored for Phase 0 with 2025 season values. DATA ONLY — no logic, ever.
// Companion: functions/season-data.json must contain identical values
// (enforced by tests/season-config-drift.test.js).
const SEASON_DATA = {
    year: 2025,
    weekAnchor: '2025-09-04',
    kickoffDateTime: '2025-09-04T20:20:00-04:00',
    seasonEndDate: '2026-01-07T23:59:59-05:00',
    totalWeeks: 18,
    poolId: 'nerduniverse-2025',
    poolDisplayName: 'Nerd Universe 2025',
    espnScheduleUrlTemplate: 'https://www.espn.com/nfl/schedule/_/week/{WEEK}/year/{YEAR}/seasontype/2'
};

Object.freeze(SEASON_DATA);

if (typeof window !== 'undefined') {
    window.SEASON_DATA = SEASON_DATA;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SEASON_DATA };
}
