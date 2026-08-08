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
            expect(nodeConfig.paths.aiCache(year)).toBe(browserConfig.paths.aiCache(year));
            expect(nodeConfig.paths.scoringUser(uid, year)).toBe(browserConfig.paths.scoringUser(uid, year));
            expect(nodeConfig.paths.survivorPicks(uid, year)).toBe(browserConfig.paths.survivorPicks(uid, year));
            expect(nodeConfig.paths.survivorStatus(year)).toBe(browserConfig.paths.survivorStatus(year));
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
            }
        }
        expect(nodeConfig.paths.espnCache()).toBe(browserConfig.paths.espnCache());
    });

    test('utils identical at fixed instants', () => {
        const instants = [
            '2025-07-01T00:00:00Z',
            '2025-09-10T23:59:00Z',
            '2025-09-11T00:01:00Z',
            '2025-11-20T17:00:00Z',
            '2026-03-01T00:00:00Z'
        ];
        for (const iso of instants) {
            const now = new Date(iso);
            expect(nodeConfig.utils.getCurrentWeek(now)).toBe(browserConfig.utils.getCurrentWeek(now));
            expect(nodeConfig.utils.isSeasonActive(now)).toBe(browserConfig.utils.isSeasonActive(now));
            for (const w of [1, 9, 18]) {
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
        expect(a.paths.picks(3, 'u', 2031)).toBe('artifacts/nerdfootball/pools/nerduniverse-2031/data/nerdfootball_picks/3/submissions/u');
        expect(a.utils.getEspnScheduleUrl(7)).toBe(b.utils.getEspnScheduleUrl(7));
        expect(a.format.scheduleFilename(2)).toBe(b.format.scheduleFilename(2));
    });
});
