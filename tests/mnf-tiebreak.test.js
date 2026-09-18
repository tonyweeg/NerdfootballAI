const MnfTiebreak = require('../public/js/utils/mnf-tiebreak.js');

describe('mnfGameId', () => {
    test('returns the highest game ID of the week', () => {
        expect(MnfTiebreak.mnfGameId(['101', '102', '116', '115'])).toBe('116');
    });

    test('picks the nightcap in a Monday doubleheader week', () => {
        expect(MnfTiebreak.mnfGameId(['713', '714', '715'])).toBe('715');
    });

    test('does not compare IDs as strings', () => {
        // '9' > '10' lexically; numerically it is not
        expect(MnfTiebreak.mnfGameId(['9', '10'])).toBe('10');
    });

    test('returns null for empty or invalid input', () => {
        expect(MnfTiebreak.mnfGameId([])).toBeNull();
        expect(MnfTiebreak.mnfGameId(null)).toBeNull();
        expect(MnfTiebreak.mnfGameId(['nope'])).toBeNull();
    });
});

describe('mnfActualTotal', () => {
    const isFinal = (game) => !!game && String(game.status || '').toLowerCase() === 'final';

    const BIBLE = {
        '714': { a: 'Tampa Bay Buccaneers', h: 'Detroit Lions', awayScore: 24, homeScore: 17, status: 'FINAL' },
        '715': { a: 'Houston Texans', h: 'Seattle Seahawks', awayScore: 20, homeScore: 13, status: 'FINAL' }
    };

    test('adds both scores of the last game of the week', () => {
        expect(MnfTiebreak.mnfActualTotal(BIBLE, ['714', '715'], isFinal)).toBe(33);
    });

    test('ignores earlier Monday games in a doubleheader week', () => {
        // 714 totals 41; only 715 counts
        expect(MnfTiebreak.mnfActualTotal(BIBLE, ['714', '715'], isFinal)).not.toBe(41);
    });

    test('returns null while the game is not final', () => {
        const live = { '116': { awayScore: 7, homeScore: 3, status: 'IN_PROGRESS' } };
        expect(MnfTiebreak.mnfActualTotal(live, ['116'], isFinal)).toBeNull();
    });

    test('returns null when scores are missing on a final game', () => {
        const noScores = { '116': { status: 'FINAL' } };
        expect(MnfTiebreak.mnfActualTotal(noScores, ['116'], isFinal)).toBeNull();
    });

    test('handles a 0-0 final as a real total, not as missing', () => {
        const shutout = { '116': { awayScore: 0, homeScore: 0, status: 'FINAL' } };
        expect(MnfTiebreak.mnfActualTotal(shutout, ['116'], isFinal)).toBe(0);
    });

    test('returns null for missing game data', () => {
        expect(MnfTiebreak.mnfActualTotal({}, ['116'], isFinal)).toBeNull();
        expect(MnfTiebreak.mnfActualTotal(null, ['116'], isFinal)).toBeNull();
    });

    test('accepts string scores, which is how ESPN sometimes stores them', () => {
        const strings = { '116': { awayScore: '21', homeScore: '17', status: 'FINAL' } };
        expect(MnfTiebreak.mnfActualTotal(strings, ['116'], isFinal)).toBe(38);
    });
});

describe('assignPlaces', () => {
    // helper: build players already sorted by score descending
    const P = (name, score, mnfGuess) => ({ name, score, mnfGuess });
    const places = (players, actual) =>
        MnfTiebreak.assignPlaces(players, actual).map((p) => [p.name, p.place]);

    test('leaves an untied field exactly as it is', () => {
        expect(places([P('Ann', 90, 40), P('Bob', 80, 40), P('Cal', 70, 40)], 47))
            .toEqual([['Ann', '🥇'], ['Bob', '🥈'], ['Cal', '🥉']]);
    });

    test('under beats over — 46 wins over 51 when the actual is 47', () => {
        expect(places([P('Tony', 88, 51), P('Dave', 88, 46), P('Ric', 85, 40)], 47))
            .toEqual([['Dave', '🥇'], ['Tony', '🥈'], ['Ric', '🥉']]);
    });

    test('nearer under beats further under', () => {
        expect(places([P('Ann', 88, 30), P('Bob', 88, 46)], 47))
            .toEqual([['Bob', '🥇'], ['Ann', '🥈']]);
    });

    test('an exact guess wins outright', () => {
        expect(places([P('Ann', 88, 40), P('Bob', 88, 47)], 47))
            .toEqual([['Bob', '🥇'], ['Ann', '🥈']]);
    });

    test('when everyone went over, the smallest overshoot wins', () => {
        expect(places([P('Ann', 88, 58), P('Bob', 88, 52)], 47))
            .toEqual([['Bob', '🥇'], ['Ann', '🥈']]);
    });

    test('a player with no guess ranks last in the group', () => {
        expect(places([P('Ann', 88, null), P('Bob', 88, 58)], 47))
            .toEqual([['Bob', '🥇'], ['Ann', '🥈']]);
    });

    test('identical guesses fall back to alphabetical', () => {
        expect(places([P('Zed', 88, 44), P('Abe', 88, 44)], 47))
            .toEqual([['Abe', '🥇'], ['Zed', '🥈']]);
    });

    test('a three-way tie at first consumes all three medals', () => {
        expect(places([P('Ann', 88, 30), P('Bob', 88, 46), P('Cal', 88, 52)], 47))
            .toEqual([['Bob', '🥇'], ['Ann', '🥈'], ['Cal', '🥉']]);
    });

    test('a tie for second resolves into second and third', () => {
        expect(places([P('Ann', 99, 40), P('Bob', 88, 52), P('Cal', 88, 46)], 47))
            .toEqual([['Ann', '🥇'], ['Cal', '🥈'], ['Bob', '🥉']]);
    });

    test('a tie outside the top three stays shared', () => {
        const out = places(
            [P('Ann', 99, 40), P('Bob', 95, 40), P('Cal', 92, 40), P('Dee', 80, 46), P('Eve', 80, 52)],
            47
        );
        expect(out).toEqual([['Ann', '🥇'], ['Bob', '🥈'], ['Cal', '🥉'], ['Dee', 'T4'], ['Eve', 'T4']]);
    });

    test('with no actual total yet, tied players share a medal as before', () => {
        expect(places([P('Tony', 88, 51), P('Dave', 88, 46)], null))
            .toEqual([['Tony', '🥇'], ['Dave', '🥇']]);
    });

    test('a 0-0 actual total still resolves — 0 is not "unknown"', () => {
        expect(places([P('Ann', 88, 10), P('Bob', 88, 3)], 0))
            .toEqual([['Bob', '🥇'], ['Ann', '🥈']]);
    });
});
