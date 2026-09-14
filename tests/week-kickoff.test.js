const Kickoff = require('../public/js/utils/week-kickoff.js');

const game = (dt, a = 'Away', h = 'Home') => ({ a, h, dt, status: 'scheduled' });

describe('firstKickoff', () => {
    test('real 2026 week 1: the Wednesday opener is the first game, whatever order the doc lists them in', () => {
        const week = {
            _metadata: { lastUpdated: '2026-09-01T00:00:00Z' },
            103: game('2026-09-13T13:00:00Z'),
            101: game('2026-09-09T20:20:00Z', 'New England Patriots', 'Seattle Seahawks'),
            102: game('2026-09-10T20:35:00Z')
        };
        const first = Kickoff.firstKickoff(week);
        expect(first.gameId).toBe('101');
        expect(first.eastern).toEqual({ year: 2026, month: 9, day: 9, hour: 20, minute: 20 });
        // Stored "20:20Z" is 8:20 PM Eastern (EDT, UTC-4) = 00:20 UTC the next day.
        expect(first.at.toISOString()).toBe('2026-09-10T00:20:00.000Z');
    });

    test('after the November rollback the Eastern offset is UTC-5', () => {
        const first = Kickoff.firstKickoff({ 1001: game('2026-11-12T20:15:00Z') });
        expect(first.at.toISOString()).toBe('2026-11-13T01:15:00.000Z');
    });

    test('the rollback Sunday itself is already standard time; the day before is still daylight time', () => {
        // 2026: DST ends Sunday November 1.
        expect(Kickoff.firstKickoff({ 1: game('2026-11-01T13:00:00Z') }).at.toISOString()).toBe('2026-11-01T18:00:00.000Z');
        expect(Kickoff.firstKickoff({ 1: game('2026-10-31T13:00:00Z') }).at.toISOString()).toBe('2026-10-31T17:00:00.000Z');
    });

    test('games without a usable time, placeholders and metadata are ignored', () => {
        expect(Kickoff.firstKickoff({
            _metadata: {},
            1: { a: 'TBD', h: 'TBD', dt: '2026-09-01T10:00:00Z' },
            2: game(''),
            3: game('not a date'),
            4: game('2026-09-17T20:15:00Z')
        }).gameId).toBe('4');
    });

    test('no schedule gives null', () => {
        expect(Kickoff.firstKickoff(null)).toBeNull();
        expect(Kickoff.firstKickoff({})).toBeNull();
        expect(Kickoff.firstKickoff({ _metadata: {}, 1: game(undefined) })).toBeNull();
    });
});

describe('hasKickedOff', () => {
    const week = { 101: game('2026-09-09T20:20:00Z'), 116: game('2026-09-14T20:15:00Z') };

    test('true from the first kickoff instant on', () => {
        expect(Kickoff.hasKickedOff(week, new Date('2026-09-10T00:19:59Z'))).toBe(false);
        expect(Kickoff.hasKickedOff(week, new Date('2026-09-10T00:20:00Z'))).toBe(true);
    });

    test('a week with no schedule has not kicked off', () => {
        expect(Kickoff.hasKickedOff({}, new Date('2030-01-01T00:00:00Z'))).toBe(false);
    });
});

describe('formatKickoff', () => {
    test('reads the Eastern wall clock, so every viewer sees the same day and time', () => {
        expect(Kickoff.formatKickoff(Kickoff.firstKickoff({ 1: game('2026-09-09T20:20:00Z') }))).toBe('Wednesday, September 9 at 8:20 PM ET');
        expect(Kickoff.formatKickoff(Kickoff.firstKickoff({ 1: game('2026-09-13T13:00:00Z') }))).toBe('Sunday, September 13 at 1:00 PM ET');
        expect(Kickoff.formatKickoff(Kickoff.firstKickoff({ 1: game('2026-12-25T00:05:00Z') }))).toBe('Friday, December 25 at 12:05 AM ET');
    });

    test('nothing to format gives an empty string', () => {
        expect(Kickoff.formatKickoff(null)).toBe('');
    });
});
