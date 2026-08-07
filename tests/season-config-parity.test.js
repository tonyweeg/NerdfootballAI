const { SEASON_CONFIG } = require('../public/js/config/season-config.js');

// Legacy week formula, verbatim from public/weekManager.js:47-49.
// This is the parity reference: the config util must agree with it for every
// instant of the 2025 season window, or migration changes behavior.
function legacyGetCurrentWeek(now) {
    const seasonStart = new Date('2025-09-04');
    const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
    return Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);
}

describe('week parity with legacy weekManager formula', () => {
    test('matches legacy every 6 hours across the 2025 season window', () => {
        const start = new Date('2025-08-01T00:00:00Z').getTime();
        const end = new Date('2026-02-01T00:00:00Z').getTime();
        for (let t = start; t <= end; t += 6 * 60 * 60 * 1000) {
            const now = new Date(t);
            expect(SEASON_CONFIG.utils.getCurrentWeek(now)).toBe(legacyGetCurrentWeek(now));
        }
    });

    test('matches legacy at ±1 minute around every weekly boundary', () => {
        const anchor = new Date('2025-09-04').getTime();
        for (let k = 0; k <= 18; k++) {
            for (const offset of [-60000, 0, 60000]) {
                const now = new Date(anchor + k * 7 * 24 * 60 * 60 * 1000 + offset);
                expect(SEASON_CONFIG.utils.getCurrentWeek(now)).toBe(legacyGetCurrentWeek(now));
            }
        }
    });
});

describe('2025 path snapshots (must equal current production strings)', () => {
    test('pool paths', () => {
        expect(SEASON_CONFIG.paths.poolMembers()).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        expect(SEASON_CONFIG.paths.aiCache()).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/cache/latest-ai-intel-sheet');
        expect(SEASON_CONFIG.paths.poolRoot()).toBe('artifacts/nerdfootball/pools/nerduniverse-2025');
        expect(SEASON_CONFIG.paths.gridCache(6)).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/cache/grid-week-6');
        expect(SEASON_CONFIG.paths.scoringUser('u1')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/u1');
        expect(SEASON_CONFIG.paths.espnCache()).toBe('cache/espn_current_data');
    });

    test('picks paths match The Grid (nerdfootballTheGrid.html:624)', () => {
        expect(SEASON_CONFIG.paths.picks(5, 'abc123')).toBe('artifacts/nerdfootball/public/data/nerdfootball_picks/5/submissions/abc123');
        expect(SEASON_CONFIG.paths.picksWeek(5)).toBe('artifacts/nerdfootball/public/data/nerdfootball_picks/5/submissions');
    });

    test('results, games, survivor paths', () => {
        expect(SEASON_CONFIG.paths.results(3)).toBe('artifacts/nerdfootball/public/data/nerdfootball_results/3');
        expect(SEASON_CONFIG.paths.games(3)).toBe('artifacts/nerdfootball/public/data/nerdfootball_games/3');
        expect(SEASON_CONFIG.paths.survivorPicks('abc123')).toBe('artifacts/nerdfootball/public/data/nerdSurvivor_picks/abc123');
        expect(SEASON_CONFIG.paths.survivorStatus()).toBe('artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
    });

    test('year-segmented pool families (functions/index.js:659-690 shapes)', () => {
        expect(SEASON_CONFIG.paths.confidenceUser(4, 'u1')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/confidence/2025/weeks/4/users/u1');
        expect(SEASON_CONFIG.paths.survivorUser(4, 'u1')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/survivor/2025/weeks/4/users/u1');
        expect(SEASON_CONFIG.paths.scoresUser(4, 'u1')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/scores/2025/weeks/4/users/u1');
        expect(SEASON_CONFIG.paths.weeklyRollupUser(4, 'u1')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/rollups/weekly/2025/week_4/users/u1');
    });
});

describe('2026+ pool-scoped tree (spec D1/D5)', () => {
    test('season data moves under the pool document', () => {
        expect(SEASON_CONFIG.paths.picks(1, 'u1', 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdfootball_picks/1/submissions/u1');
        expect(SEASON_CONFIG.paths.picksWeek(1, 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdfootball_picks/1/submissions');
        expect(SEASON_CONFIG.paths.results(1, 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdfootball_results/1');
        expect(SEASON_CONFIG.paths.games(1, 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdfootball_games/1');
        expect(SEASON_CONFIG.paths.survivorPicks('u1', 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdSurvivor_picks/u1');
        expect(SEASON_CONFIG.paths.survivorStatus(2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdSurvivor_status/status');
    });

    test('explicit prior-year access still resolves the legacy tree', () => {
        expect(SEASON_CONFIG.paths.picks(1, 'u1', 2025)).toBe('artifacts/nerdfootball/public/data/nerdfootball_picks/1/submissions/u1');
        expect(SEASON_CONFIG.paths.poolMembers(2025)).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
    });
});

describe('utils boundary semantics', () => {
    test('pre-season returns week 1', () => {
        expect(SEASON_CONFIG.utils.getCurrentWeek(new Date('2025-07-01T00:00:00Z'))).toBe(1);
    });

    test('post-season clamps to week 18', () => {
        expect(SEASON_CONFIG.utils.getCurrentWeek(new Date('2026-03-01T00:00:00Z'))).toBe(18);
    });

    test('week flips at midnight UTC on the Thursday date (Wed 8:00 PM ET)', () => {
        expect(SEASON_CONFIG.utils.getCurrentWeek(new Date('2025-09-10T23:59:00Z'))).toBe(1);
        expect(SEASON_CONFIG.utils.getCurrentWeek(new Date('2025-09-11T00:01:00Z'))).toBe(2);
    });

    test('hasWeekStarted', () => {
        expect(SEASON_CONFIG.utils.hasWeekStarted(1, new Date('2025-09-04T00:01:00Z'))).toBe(true);
        expect(SEASON_CONFIG.utils.hasWeekStarted(2, new Date('2025-09-05T00:00:00Z'))).toBe(false);
    });

    test('isSeasonActive', () => {
        expect(SEASON_CONFIG.utils.isSeasonActive(new Date('2025-10-15T12:00:00Z'))).toBe(true);
        expect(SEASON_CONFIG.utils.isSeasonActive(new Date('2025-08-07T12:00:00Z'))).toBe(false);
        expect(SEASON_CONFIG.utils.isSeasonActive(new Date('2026-02-01T12:00:00Z'))).toBe(false);
    });
});

describe('formatters and ESPN urls', () => {
    test('display strings', () => {
        expect(SEASON_CONFIG.format.weekDisplay(7)).toBe('WEEK 7 • 2025');
        expect(SEASON_CONFIG.format.seasonLabel()).toBe('2025 NFL Season');
        expect(SEASON_CONFIG.format.weekLabel(7)).toBe('Week 7, 2025');
        expect(SEASON_CONFIG.format.poolDisplay()).toBe('Nerd Universe 2025');
        expect(SEASON_CONFIG.format.scheduleFilename(3)).toBe('nfl_2025_week_3.json');
        expect(SEASON_CONFIG.format.scheduleFilename()).toBe('nfl_2025_schedule_raw.json');
    });

    test('espn schedule urls', () => {
        expect(SEASON_CONFIG.utils.getEspnScheduleUrl(9)).toBe('https://www.espn.com/nfl/schedule/_/week/9/year/2025/seasontype/2');
        expect(SEASON_CONFIG.utils.getAllEspnScheduleUrls()).toHaveLength(18);
        expect(SEASON_CONFIG.utils.getAllEspnScheduleUrls()[0]).toBe('https://www.espn.com/nfl/schedule/_/week/1/year/2025/seasontype/2');
    });
});
