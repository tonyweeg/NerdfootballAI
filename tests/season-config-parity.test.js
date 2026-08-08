const { SEASON_CONFIG, buildSeasonConfig } = require('../public/js/config/season-config.js');

// Fixed 2025 fixture — historical truth, intentionally independent of season-data.js,
// so the annual data flip can never silently rewrite these parity guarantees.
const FIXTURE_2025 = Object.freeze({
    year: 2025,
    weekAnchor: '2025-09-04',
    kickoffDateTime: '2025-09-04T20:20:00-04:00',
    seasonEndDate: '2026-01-07T23:59:59-05:00',
    totalWeeks: 18,
    poolId: 'nerduniverse-2025',
    poolDisplayName: 'Nerd Universe 2025',
    espnScheduleUrlTemplate: 'https://www.espn.com/nfl/schedule/_/week/{WEEK}/year/{YEAR}/seasontype/2'
});
const CFG = buildSeasonConfig(FIXTURE_2025);

// Legacy week formula, verbatim from public/weekManager.js:47-49 — the CANONICAL week
// semantic per spec D3. Scope note: production also contains divergent variants
// (core-bundle.js anchors on 2025-09-05; espnNerdApi.js clamps 1-22 for playoffs;
// poolParticipationManager.js uses Math.abs/Math.ceil). Those are NOT certified here —
// the migration kill-list requires a per-site decision before moving any divergent
// site onto this util. Blind swaps of divergent sites are forbidden.
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
            expect(CFG.utils.getCurrentWeek(now)).toBe(legacyGetCurrentWeek(now));
        }
    });

    test('matches legacy at ±1 minute around every weekly boundary', () => {
        const anchor = new Date('2025-09-04').getTime();
        for (let k = 0; k <= 18; k++) {
            for (const offset of [-60000, 0, 60000]) {
                const now = new Date(anchor + k * 7 * 24 * 60 * 60 * 1000 + offset);
                expect(CFG.utils.getCurrentWeek(now)).toBe(legacyGetCurrentWeek(now));
            }
        }
    });
});

describe('2025 path snapshots (must equal current production strings)', () => {
    test('pool paths', () => {
        expect(CFG.paths.poolMembers()).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        expect(CFG.paths.aiCache()).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/cache/latest-ai-intel-sheet');
        expect(CFG.paths.poolRoot()).toBe('artifacts/nerdfootball/pools/nerduniverse-2025');
        expect(CFG.paths.gridCache(6)).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/cache/grid-week-6');
        expect(CFG.paths.scoringUser('u1')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/u1');
        expect(CFG.paths.espnCache()).toBe('cache/espn_current_data');
    });

    test('picks paths match The Grid (nerdfootballTheGrid.html:624)', () => {
        expect(CFG.paths.picks(5, 'abc123')).toBe('artifacts/nerdfootball/public/data/nerdfootball_picks/5/submissions/abc123');
        expect(CFG.paths.picksWeek(5)).toBe('artifacts/nerdfootball/public/data/nerdfootball_picks/5/submissions');
    });

    test('results, games, survivor paths', () => {
        expect(CFG.paths.results(3)).toBe('artifacts/nerdfootball/public/data/nerdfootball_results/3');
        expect(CFG.paths.games(3)).toBe('artifacts/nerdfootball/public/data/nerdfootball_games/3');
        expect(CFG.paths.survivorPicks('abc123')).toBe('artifacts/nerdfootball/public/data/nerdSurvivor_picks/abc123');
        expect(CFG.paths.survivorStatus()).toBe('artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
    });

    test('year-segmented pool families (functions/index.js:659-690 shapes)', () => {
        expect(CFG.paths.confidenceUser(4, 'u1')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/confidence/2025/weeks/4/users/u1');
        expect(CFG.paths.survivorUser(4, 'u1')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/survivor/2025/weeks/4/users/u1');
        expect(CFG.paths.scoresUser(4, 'u1')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/scores/2025/weeks/4/users/u1');
        expect(CFG.paths.weeklyRollupUser(4, 'u1')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/rollups/weekly/2025/week_4/users/u1');
    });
});

describe('2026+ pool-scoped tree (spec D1/D5)', () => {
    test('season data moves under the pool document', () => {
        expect(CFG.paths.picks(1, 'u1', 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdfootball_picks/1/submissions/u1');
        expect(CFG.paths.picksWeek(1, 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdfootball_picks/1/submissions');
        expect(CFG.paths.results(1, 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdfootball_results/1');
        expect(CFG.paths.games(1, 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdfootball_games/1');
        expect(CFG.paths.survivorPicks('u1', 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdSurvivor_picks/u1');
        expect(CFG.paths.survivorStatus(2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdSurvivor_status/status');
    });

    test('explicit prior-year access still resolves the legacy tree', () => {
        expect(CFG.paths.picks(1, 'u1', 2025)).toBe('artifacts/nerdfootball/public/data/nerdfootball_picks/1/submissions/u1');
        expect(CFG.paths.poolMembers(2025)).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
    });
});

describe('utils boundary semantics', () => {
    test('pre-season returns week 1', () => {
        expect(CFG.utils.getCurrentWeek(new Date('2025-07-01T00:00:00Z'))).toBe(1);
    });

    test('post-season clamps to week 18', () => {
        expect(CFG.utils.getCurrentWeek(new Date('2026-03-01T00:00:00Z'))).toBe(18);
    });

    test('week flips at midnight UTC on the Thursday date (Wed 8:00 PM ET)', () => {
        expect(CFG.utils.getCurrentWeek(new Date('2025-09-10T23:59:00Z'))).toBe(1);
        expect(CFG.utils.getCurrentWeek(new Date('2025-09-11T00:01:00Z'))).toBe(2);
        expect(CFG.utils.getCurrentWeek(new Date('2025-09-11T00:01:00Z').getTime())).toBe(2);
    });

    test('hasWeekStarted', () => {
        expect(CFG.utils.hasWeekStarted(1, new Date('2025-09-04T00:01:00Z'))).toBe(true);
        expect(CFG.utils.hasWeekStarted(2, new Date('2025-09-05T00:00:00Z'))).toBe(false);
    });

    test('isSeasonActive spans weekAnchor through seasonEndDate', () => {
        expect(CFG.utils.isSeasonActive(new Date('2025-10-15T12:00:00Z'))).toBe(true);
        expect(CFG.utils.isSeasonActive(new Date('2025-09-04T12:00:00Z'))).toBe(true);
        expect(CFG.utils.isSeasonActive(new Date('2025-08-07T12:00:00Z'))).toBe(false);
        expect(CFG.utils.isSeasonActive(new Date('2026-02-01T12:00:00Z'))).toBe(false);
    });
});

describe('formatters and ESPN urls', () => {
    test('display strings', () => {
        expect(CFG.format.weekDisplay(7)).toBe('WEEK 7 • 2025');
        expect(CFG.format.seasonLabel()).toBe('2025 NFL Season');
        expect(CFG.format.weekLabel(7)).toBe('Week 7, 2025');
        expect(CFG.format.poolDisplay()).toBe('Nerd Universe 2025');
        expect(CFG.format.scheduleFilename(3)).toBe('nfl_2025_week_3.json');
        expect(CFG.format.scheduleFilename()).toBe('nfl_2025_schedule_raw.json');
    });

    test('espn schedule urls', () => {
        expect(CFG.utils.getEspnScheduleUrl(9)).toBe('https://www.espn.com/nfl/schedule/_/week/9/year/2025/seasontype/2');
        expect(CFG.utils.getAllEspnScheduleUrls()).toHaveLength(18);
        expect(CFG.utils.getAllEspnScheduleUrls()[0]).toBe('https://www.espn.com/nfl/schedule/_/week/1/year/2025/seasontype/2');
    });
});

describe('singleton mirrors the loaded season-data file', () => {
    test('data fields match require(season-data) and builders exist', () => {
        const { SEASON_DATA } = require('../public/js/config/season-data.js');
        const { paths, utils, format, ...data } = SEASON_CONFIG;
        expect(data).toEqual({ ...SEASON_DATA });
        expect(typeof paths.picks).toBe('function');
        expect(typeof utils.getCurrentWeek).toBe('function');
        expect(typeof format.weekDisplay).toBe('function');
    });

    test('config object and module groups are frozen', () => {
        expect(Object.isFrozen(SEASON_CONFIG)).toBe(true);
        expect(Object.isFrozen(SEASON_CONFIG.paths)).toBe(true);
        expect(Object.isFrozen(SEASON_CONFIG.utils)).toBe(true);
        expect(Object.isFrozen(SEASON_CONFIG.format)).toBe(true);
    });
});

describe('loud failures on bad input (falsy-year footgun class)', () => {
    test('null/0/empty/NaN/out-of-range years throw instead of routing to the legacy tree', () => {
        for (const bad of [null, 0, '', NaN, 'nope', 1999, 2101]) {
            expect(() => CFG.paths.picks(1, 'u1', bad)).toThrow('invalid year');
            expect(() => CFG.paths.poolRoot(bad)).toThrow('invalid year');
        }
    });

    test('missing or out-of-range week/userId throw instead of minting garbage paths', () => {
        expect(() => CFG.paths.picks(undefined, 'u1')).toThrow('invalid week');
        expect(() => CFG.paths.picks(1, undefined)).toThrow('missing required userId');
        expect(() => CFG.paths.gridCache()).toThrow('invalid week');
        expect(() => CFG.paths.scoringUser(null)).toThrow('missing required userId');
        expect(() => CFG.paths.picks(0, 'u1')).toThrow('invalid week');
        expect(() => CFG.paths.picks(99, 'u1')).toThrow('invalid week');
        expect(() => CFG.paths.picks([], 'u1')).toThrow('invalid week');
        expect(() => CFG.utils.getEspnScheduleUrl(0)).toThrow('invalid week');
        expect(() => CFG.format.scheduleFilename(0)).toThrow('invalid week');
    });

    test('invalid dates and out-of-range weeks throw instead of returning NaN', () => {
        expect(() => CFG.utils.getCurrentWeek(new Date('nonsense'))).toThrow('invalid date');
        expect(() => CFG.utils.hasWeekStarted(1, new Date('nonsense'))).toThrow('invalid date');
        expect(() => CFG.utils.hasWeekStarted(0)).toThrow('invalid week');
        expect(() => CFG.utils.hasWeekStarted(99)).toThrow('invalid week');
    });

    test('string years and weeks from URL params are accepted when valid integers', () => {
        expect(CFG.paths.poolRoot('2026')).toBe('artifacts/nerdfootball/pools/nerduniverse-2026');
        expect(CFG.paths.gridCache('6')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/cache/grid-week-6');
    });
});

describe('remaining 2026 branches + poolId invariant', () => {
    test('cache/scoring/segmented families under a 2026 pool', () => {
        expect(CFG.paths.aiCache(2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/cache/latest-ai-intel-sheet');
        expect(CFG.paths.gridCache(3, 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/cache/grid-week-3');
        expect(CFG.paths.scoringUser('u1', 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/scoring-users/u1');
        expect(CFG.paths.confidenceUser(4, 'u1', 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/confidence/2026/weeks/4/users/u1');
        expect(CFG.paths.survivorUser(4, 'u1', 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/survivor/2026/weeks/4/users/u1');
        expect(CFG.paths.scoresUser(4, 'u1', 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/scores/2026/weeks/4/users/u1');
        expect(CFG.paths.weeklyRollupUser(4, 'u1', 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/rollups/weekly/2026/week_4/users/u1');
    });

    test('default poolRoot stays locked to poolId (no drift by coincidence)', () => {
        expect(CFG.paths.poolRoot()).toBe(`artifacts/nerdfootball/pools/${FIXTURE_2025.poolId}`);
        expect(SEASON_CONFIG.paths.poolRoot()).toBe(`artifacts/nerdfootball/pools/${SEASON_CONFIG.poolId}`);
    });
});
