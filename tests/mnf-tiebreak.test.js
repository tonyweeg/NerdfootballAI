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
