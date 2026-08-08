const { SEASON_CONFIG: browserConfig, buildSeasonConfig: buildBrowser } = require('../public/js/config/season-config.js');
const { SEASON_CONFIG: nodeConfig, buildSeasonConfig: buildNode } = require('../functions/seasonConfig.js');

// The two wrappers are hand-written mirrors (no shared module without a bundler).
// This suite is the drift guard: any divergence in data, paths, week math, or
// formatting between hosting and functions fails here.
describe('wrapper drift guard (browser vs functions)', () => {
    test('data blocks identical', () => {
        const dataOf = (c) => {
            const { paths, utils, format, ...data } = c;
            return data;
        };
        expect(dataOf(nodeConfig)).toEqual(dataOf(browserConfig));
    });

    test('every path builder identical across years, weeks, and users', () => {
        const weeks = [1, 5, 18];
        const years = [2024, 2025, 2026, 2027];
        const uid = 'drift-uid';
        for (const year of years) {
            expect(nodeConfig.paths.poolRoot(year)).toBe(browserConfig.paths.poolRoot(year));
            expect(nodeConfig.paths.poolMembers(year)).toBe(browserConfig.paths.poolMembers(year));
            expect(nodeConfig.paths.poolMembersOf(`nerduniverse-${year}`)).toBe(browserConfig.paths.poolMembersOf(`nerduniverse-${year}`));
            expect(nodeConfig.paths.aiCache(year)).toBe(browserConfig.paths.aiCache(year));
            expect(nodeConfig.paths.scoringUser(uid, year)).toBe(browserConfig.paths.scoringUser(uid, year));
            expect(nodeConfig.paths.survivorPicks(uid, year)).toBe(browserConfig.paths.survivorPicks(uid, year));
            expect(nodeConfig.paths.survivorStatus(year)).toBe(browserConfig.paths.survivorStatus(year));
            expect(nodeConfig.paths.survivorEliminations(uid, year)).toBe(browserConfig.paths.survivorEliminations(uid, year));
            expect(nodeConfig.paths.survivorDisplayCache(year)).toBe(browserConfig.paths.survivorDisplayCache(year));
            for (const week of weeks) {
                expect(nodeConfig.paths.gridCache(week, year)).toBe(browserConfig.paths.gridCache(week, year));
                expect(nodeConfig.paths.picks(week, uid, year)).toBe(browserConfig.paths.picks(week, uid, year));
                expect(nodeConfig.paths.picksWeek(week, year)).toBe(browserConfig.paths.picksWeek(week, year));
                expect(nodeConfig.paths.results(week, year)).toBe(browserConfig.paths.results(week, year));
                expect(nodeConfig.paths.games(week, year)).toBe(browserConfig.paths.games(week, year));
                expect(nodeConfig.paths.confidenceUser(week, uid, year)).toBe(browserConfig.paths.confidenceUser(week, uid, year));
                expect(nodeConfig.paths.survivorUser(week, uid, year)).toBe(browserConfig.paths.survivorUser(week, uid, year));
                expect(nodeConfig.paths.scoresUser(week, uid, year)).toBe(browserConfig.paths.scoresUser(week, uid, year));
                expect(nodeConfig.paths.weeklyRollupUser(week, uid, year)).toBe(browserConfig.paths.weeklyRollupUser(week, uid, year));
                expect(nodeConfig.paths.survivorWeek(week, year)).toBe(browserConfig.paths.survivorWeek(week, year));
                expect(nodeConfig.paths.scoringWeek(week, year)).toBe(browserConfig.paths.scoringWeek(week, year));
            }
        }
        expect(nodeConfig.paths.espnCache()).toBe(browserConfig.paths.espnCache());
    });

    test('week math identical across a full-season 6-hour sweep', () => {
        // Sweep, don't sample: hand-picked instants missed an off-by-one-day
        // hasWeekStarted mutation in review; the sweep catches any boundary drift.
        const start = new Date('2025-08-01T00:00:00Z').getTime();
        const end = new Date('2026-02-01T00:00:00Z').getTime();
        for (let t = start; t <= end; t += 6 * 60 * 60 * 1000) {
            const now = new Date(t);
            expect(nodeConfig.utils.getCurrentWeek(now)).toBe(browserConfig.utils.getCurrentWeek(now));
            expect(nodeConfig.utils.isSeasonActive(now)).toBe(browserConfig.utils.isSeasonActive(now));
            for (let w = 1; w <= nodeConfig.totalWeeks; w++) {
                expect(nodeConfig.utils.hasWeekStarted(w, now)).toBe(browserConfig.utils.hasWeekStarted(w, now));
            }
        }
        expect(nodeConfig.utils.getEspnScheduleUrl(9)).toBe(browserConfig.utils.getEspnScheduleUrl(9));
        expect(nodeConfig.utils.getAllEspnScheduleUrls()).toEqual(browserConfig.utils.getAllEspnScheduleUrls());
    });

    test('formatters identical', () => {
        for (const w of [1, 9, 18]) {
            expect(nodeConfig.format.weekDisplay(w)).toBe(browserConfig.format.weekDisplay(w));
            expect(nodeConfig.format.weekLabel(w)).toBe(browserConfig.format.weekLabel(w));
            expect(nodeConfig.format.scheduleFilename(w)).toBe(browserConfig.format.scheduleFilename(w));
        }
        expect(nodeConfig.format.seasonLabel()).toBe(browserConfig.format.seasonLabel());
        expect(nodeConfig.format.poolDisplay()).toBe(browserConfig.format.poolDisplay());
        expect(nodeConfig.format.scheduleFilename()).toBe(browserConfig.format.scheduleFilename());
    });

    test('factories agree on a non-live fixture (logic lockstep, not data coincidence)', () => {
        const FIXTURE = Object.freeze({
            year: 2031,
            weekAnchor: '2031-09-04',
            kickoffDateTime: '2031-09-04T20:20:00-04:00',
            seasonEndDate: '2032-01-07T23:59:59-05:00',
            totalWeeks: 18,
            poolId: 'nerduniverse-2031',
            poolDisplayName: 'Nerd Universe 2031',
            espnScheduleUrlTemplate: 'https://x/{WEEK}/{YEAR}'
        });
        const a = buildBrowser(FIXTURE);
        const b = buildNode(FIXTURE);
        expect(a.paths.picks(3, 'u', 2031)).toBe(b.paths.picks(3, 'u', 2031));
        expect(a.paths.picks(3, 'u', 2031)).toBe('artifacts/nerdfootball/pools/nerduniverse-2031/nerdfootball_picks/3/submissions/u');
        expect(a.utils.getEspnScheduleUrl(7)).toBe(b.utils.getEspnScheduleUrl(7));
        expect(a.format.scheduleFilename(2)).toBe(b.format.scheduleFilename(2));
    });

    test('error behavior identical for the full bad-input table', () => {
        // Guards the guards: a validation check removed or loosened in one wrapper
        // must fail here, not survive as silent divergence.
        const outcome = (fn) => {
            try {
                return { ok: true, value: fn() };
            } catch (e) {
                return { ok: false, message: e.message };
            }
        };
        const probes = [
            ['year null', (c) => c.paths.poolRoot(null)],
            ['year 0', (c) => c.paths.poolRoot(0)],
            ['year empty string', (c) => c.paths.poolRoot('')],
            ['year NaN', (c) => c.paths.poolRoot(NaN)],
            ['year 1999', (c) => c.paths.poolRoot(1999)],
            ['year 2101', (c) => c.paths.poolRoot(2101)],
            ['week 0', (c) => c.paths.picks(0, 'u1')],
            ['week -3', (c) => c.paths.picks(-3, 'u1')],
            ['week 99', (c) => c.paths.picks(99, 'u1')],
            ['week array', (c) => c.paths.picks([], 'u1')],
            ['week 1.5', (c) => c.paths.picks(1.5, 'u1')],
            ['espn week 0', (c) => c.utils.getEspnScheduleUrl(0)],
            ['missing userId', (c) => c.paths.picks(1, undefined)],
            ['null userId', (c) => c.paths.scoringUser(null)],
            ['date string', (c) => c.utils.getCurrentWeek('2025-10-01')],
            ['date NaN', (c) => c.utils.getCurrentWeek(new Date('nonsense'))],
            ['epoch accepted', (c) => c.utils.getCurrentWeek(new Date('2025-11-20T17:00:00Z').getTime())],
            ['schedule filename week 0', (c) => c.format.scheduleFilename(0)],
            ['survivorWeek week 0', (c) => c.paths.survivorWeek(0)],
            ['scoringWeek week 0', (c) => c.paths.scoringWeek(0)],
            ['survivorEliminations null userId', (c) => c.paths.survivorEliminations(null)],
            ['survivorDisplayCache year 0', (c) => c.paths.survivorDisplayCache(0)],
            ['slash userId', (c) => c.paths.picks(1, 'a/b')],
            ['numeric userId', (c) => c.paths.scoringUser(12345)],
            ['reserved userId', (c) => c.paths.picks(1, '..')],
            ['reserved userId dot', (c) => c.paths.picks(1, '.')],
            ['reserved userId underscores', (c) => c.paths.picks(1, '__proto__')],
            ['invalid poolId', (c) => c.paths.poolMembersOf('a/b')],
            ['reserved poolId', (c) => c.paths.poolMembersOf('..')]
        ];
        for (const [label, probe] of probes) {
            const a = outcome(() => probe(browserConfig));
            const b = outcome(() => probe(nodeConfig));
            expect({ label, ...b }).toEqual({ label, ...a });
        }
        const factoryA = outcome(() => buildBrowser(null));
        const factoryB = outcome(() => buildNode(null));
        expect(factoryA.ok).toBe(false);
        expect(factoryB).toEqual(factoryA);
    });
});
