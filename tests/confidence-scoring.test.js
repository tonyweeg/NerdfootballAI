const fs = require('fs');
const path = require('path');
const scoring = require('../public/js/utils/confidence-scoring.js');

const game = (winner, status = 'STATUS_FINAL', awayScore = 0, homeScore = 0) =>
    ({ a: 'Away', h: 'Home', winner, status, awayScore, homeScore });

const WEEK = {
    _metadata: { week: 1 },
    101: game('Home', 'STATUS_FINAL', 10, 13),
    102: game('Away', 'final', 27, 7),
    103: game(null, 'scheduled'),
    104: game(null, 'STATUS_IN_PROGRESS', 7, 7)
};

describe('functions copy', () => {
    test('is byte-identical to the browser module', () => {
        const browser = fs.readFileSync(path.join(__dirname, '../public/js/utils/confidence-scoring.js'), 'utf8');
        const node = fs.readFileSync(path.join(__dirname, '../functions/confidenceScoring.js'), 'utf8');
        expect(node).toBe(browser);
    });
});

describe('isGameFinal', () => {
    test.each([
        [game(null, 'final'), true],
        [game(null, 'Final/OT'), true],
        [game(null, 'STATUS_FINAL'), true],
        [game('Home', 'scheduled'), true],
        [game('TBD', 'scheduled'), false],
        [game(null, 'scheduled'), false],
        [game(null, 'STATUS_IN_PROGRESS', 7, 7), false],
        [undefined, false],
        [null, false]
    ])('%j -> %s', (g, expected) => {
        expect(scoring.isGameFinal(g)).toBe(expected);
    });
});

describe('isTieGame', () => {
    test('a live tied score is not a tie', () => {
        expect(scoring.isTieGame(game(null, 'in_progress', 7, 7))).toBe(false);
    });
    test('final with equal scores is a tie', () => {
        expect(scoring.isTieGame(game(null, 'STATUS_FINAL', 20, 20))).toBe(true);
    });
    test.each(['TIE', 'tie/ot', 'DRAW'])('winner %s is a tie', (w) => {
        expect(scoring.isTieGame(game(w, 'final', 0, 0))).toBe(true);
    });
    test('final with a winner is not a tie', () => {
        expect(scoring.isTieGame(game('Home', 'final', 10, 13))).toBe(false);
    });
});

describe('gameStates', () => {
    test('counts completed, live and upcoming, ignoring metadata', () => {
        expect(scoring.gameStates(WEEK)).toEqual({ total: 4, completed: 2, live: 1, upcoming: 1 });
    });
    test('halftime counts as live', () => {
        expect(scoring.gameStates({ 1: game(null, 'STATUS_HALFTIME') }).live).toBe(1);
    });
});

describe('scoreWeek', () => {
    test('unplayed games are not losses: record uses decided games only', () => {
        const picks = {
            userName: 'x',
            101: { winner: 'Home', confidence: 4 },
            102: { winner: 'Home', confidence: 3 },
            103: { winner: 'Home', confidence: 2 },
            104: { winner: 'Home', confidence: 1 }
        };
        expect(scoring.scoreWeek(picks, WEEK)).toEqual({ points: 4, correct: 1, decided: 2, picksMade: 4 });
    });

    test('every pick on a tie is correct', () => {
        const games = { 1: game(null, 'final', 17, 17), 2: game('Home', 'final', 1, 2) };
        const picks = { 1: { winner: 'Away', confidence: 2 }, 2: { winner: 'Away', confidence: 1 } };
        expect(scoring.scoreWeek(picks, games)).toEqual({ points: 2, correct: 1, decided: 2, picksMade: 2 });
    });

    test('confidence outside 1..n or non-integer earns no points but the pick still counts', () => {
        const games = { 1: game('Home'), 2: game('Home'), 3: game('Home') };
        const picks = {
            1: { winner: 'Home', confidence: 4 },
            2: { winner: 'Home', confidence: 1.5 },
            3: { winner: 'Home', confidence: '3' }
        };
        expect(scoring.scoreWeek(picks, games)).toEqual({ points: 0, correct: 3, decided: 3, picksMade: 3 });
    });

    test('picks without a winner, corrupted winners and games not in the week are ignored', () => {
        const games = { 1: game('Home'), 2: game('Home') };
        const picks = {
            1: { confidence: 2 },
            2: { winner: { name: 'Home' }, confidence: 1 },
            999: { winner: 'Home', confidence: 1 },
            survivorPick: 'Home'
        };
        expect(scoring.scoreWeek(picks, games)).toEqual({ points: 0, correct: 0, decided: 0, picksMade: 0 });
    });

    test('empty or missing inputs score zero', () => {
        const zero = { points: 0, correct: 0, decided: 0, picksMade: 0 };
        expect(scoring.scoreWeek(null, WEEK)).toEqual(zero);
        expect(scoring.scoreWeek({ 101: { winner: 'Home', confidence: 1 } }, null)).toEqual(zero);
    });
});

describe('rankStandings', () => {
    test('equal points share a rank and the next rank skips', () => {
        const ranked = scoring.rankStandings([
            { userId: 'a', points: 10 },
            { userId: 'b', points: 30 },
            { userId: 'c', points: 10 },
            { userId: 'd', points: 5 }
        ]);
        expect(ranked.map(r => [r.userId, r.rank, r.pointsFromLeader])).toEqual([
            ['b', 1, 0], ['a', 2, 20], ['c', 2, 20], ['d', 4, 25]
        ]);
    });
    test('does not mutate the input', () => {
        const rows = [{ userId: 'a', points: 1 }];
        scoring.rankStandings(rows);
        expect(rows[0].rank).toBeUndefined();
    });
});

describe('isConfidencePlayer', () => {
    test('only members with confidence turned off are left out (the Grid rule)', () => {
        const off = { participation: { confidence: { enabled: false, status: 'disabled' }, survivor: { enabled: true } } };
        expect(scoring.isConfidencePlayer(off)).toBe(false);
        expect(scoring.isConfidencePlayer({ participation: { confidence: { enabled: true } } })).toBe(true);
        expect(scoring.isConfidencePlayer({ participation: { survivor: { enabled: true } } })).toBe(true);
        expect(scoring.isConfidencePlayer({ name: 'No participation data' })).toBe(true);
        expect(scoring.isConfidencePlayer({})).toBe(true);
        expect(scoring.isConfidencePlayer(null)).toBe(true);
    });
});

describe('survivor-only members stay off every confidence board', () => {
    const games = { 101: game('Home'), 102: game(null, 'scheduled') };
    const members = {
        c1: { name: 'Confidence', participation: { confidence: { enabled: true } } },
        c2: { name: 'Forgot To Pick', participation: { confidence: { enabled: true } } },
        s1: { name: 'Survivor Only', participation: { confidence: { enabled: false } } },
        s2: { name: 'Survivor With A Sheet', participation: { confidence: { enabled: false } } }
    };
    const picksByUser = {
        c1: { 101: { winner: 'Home', confidence: 2 }, 102: { winner: 'Home', confidence: 1 } },
        s2: { 101: { winner: 'Home', confidence: 2 }, 102: { winner: 'Home', confidence: 1 } }
    };

    test('weekStandings keeps confidence players, including one with no picks', () => {
        expect(scoring.weekStandings(members, picksByUser, games).map(r => [r.userId, r.hasPicks])).toEqual([
            ['c1', true], ['c2', false]
        ]);
    });

    test('seasonStandings', () => {
        expect(scoring.seasonStandings(members, [{ week: 1, games, picksByUser }]).map(r => r.userId)).toEqual(['c1', 'c2']);
    });

    test('upsideStandings', () => {
        expect(scoring.upsideStandings(members, picksByUser, games).map(r => r.userId)).toEqual(['c1']);
    });
});

describe('weekStandings', () => {
    const members = { u1: { name: 'Ann' }, u2: { email: 'bob@x.com' }, u3: {} };
    const picksByUser = {
        u1: { 101: { winner: 'Home', confidence: 4 }, 102: { winner: 'Away', confidence: 3 } },
        u2: { 101: { winner: 'Away', confidence: 4 }, 102: { winner: 'Away', confidence: 3 } },
        ghost: { 101: { winner: 'Home', confidence: 4 } }
    };

    test('one row per pool member, non-members excluded, ranked', () => {
        const rows = scoring.weekStandings(members, picksByUser, WEEK);
        expect(rows.map(r => [r.userId, r.name, r.rank, r.points, r.correct, r.decided, r.hasPicks])).toEqual([
            ['u1', 'Ann', 1, 7, 2, 2, true],
            ['u2', 'bob@x.com', 2, 3, 1, 2, true],
            ['u3', 'Unknown', 3, 0, 0, 0, false]
        ]);
    });
});

describe('seasonStandings', () => {
    const members = { u1: { name: 'Ann' }, u2: { name: 'Bob' } };
    const weeks = [
        { week: 1, games: { 1: game('Home'), 2: game('Home') }, picksByUser: {
            u1: { 1: { winner: 'Home', confidence: 2 }, 2: { winner: 'Away', confidence: 1 } },
            u2: {}
        } },
        { week: 2, games: { 1: game('Away'), 2: game(null, 'scheduled') }, picksByUser: {
            u1: { 1: { winner: 'Away', confidence: 1 }, 2: { winner: 'Away', confidence: 2 } },
            u2: { 1: { winner: 'Away', confidence: 2 }, 2: { winner: 'Home', confidence: 1 } }
        } }
    ];

    test('totals, decided-only record and weeks played agree with the weekly rows', () => {
        const rows = scoring.seasonStandings(members, weeks);
        expect(rows.map(r => [r.userId, r.rank, r.points, r.correct, r.decided, r.weeksPlayed, r.byWeek])).toEqual([
            ['u1', 1, 3, 2, 3, 2, { 1: 2, 2: 1 }],
            ['u2', 2, 2, 1, 1, 1, { 2: 2 }]
        ]);
        const weekTotals = weeks.map(w => scoring.weekStandings(members, w.picksByUser, w.games));
        for (const row of rows) {
            const sum = weekTotals.reduce((acc, wk) => acc + wk.find(r => r.userId === row.userId).points, 0);
            expect(row.points).toBe(sum);
        }
    });

    test('summary uses the same rows', () => {
        const rows = scoring.seasonStandings(members, weeks);
        expect(scoring.seasonSummary(rows, weeks)).toEqual({
            members: 2,
            weeksCompleted: 1,
            highScore: 3,
            averageScore: 2.5,
            bestWeek: { points: 2, week: 1, userId: 'u1' }
        });
    });

    test('summary for a season with no picks', () => {
        expect(scoring.seasonSummary([], [])).toEqual({
            members: 0, weeksCompleted: 0, highScore: 0, averageScore: 0, bestWeek: null
        });
    });
});

describe('rankStandings by another key', () => {
    test('ranks and measures distance from the leader on the given key', () => {
        const ranked = scoring.rankStandings([
            { userId: 'a', points: 9, maxPossible: 10 },
            { userId: 'b', points: 1, maxPossible: 14 },
            { userId: 'c', points: 5, maxPossible: 10 }
        ], 'maxPossible');
        expect(ranked.map(r => [r.userId, r.rank, r.pointsFromLeader])).toEqual([
            ['b', 1, 0], ['a', 2, 4], ['c', 2, 4]
        ]);
    });
});

describe('upsideWeek', () => {
    const games = {
        1: game('Home', 'final', 10, 13),
        2: game(null, 'STATUS_FINAL', 17, 17),
        3: game(null, 'STATUS_IN_PROGRESS', 7, 7),
        4: game(null, 'scheduled'),
        5: game(null, 'scheduled')
    };

    test('points so far use the scoring rules; points left count only real picks on unfinished games', () => {
        const picks = {
            1: { winner: 'Home', confidence: 5 },
            2: { winner: 'Away', confidence: 1 },
            3: { winner: 'Home', confidence: 4 },
            4: { winner: 'Away', confidence: 9 },
            5: { winner: '', confidence: 3 }
        };
        expect(scoring.upsideWeek(picks, games)).toEqual({
            points: 6, correct: 2, decided: 2, picksMade: 4,
            pointsLeft: 4, gamesLeft: 2, maxPossible: 10
        });
    });

    test('points so far always equal scoreWeek points', () => {
        const picks = { 1: { winner: 'Away', confidence: 2 }, 2: { winner: 'Home', confidence: 3 }, 3: { winner: 'Away', confidence: 5 } };
        expect(scoring.upsideWeek(picks, games).points).toBe(scoring.scoreWeek(picks, games).points);
    });

    test('no picks means no upside', () => {
        expect(scoring.upsideWeek(null, games)).toEqual({
            points: 0, correct: 0, decided: 0, picksMade: 0, pointsLeft: 0, gamesLeft: 0, maxPossible: 0
        });
    });
});

describe('upsideStandings', () => {
    test('members with picks ranked by max possible, ties share a rank, members without picks left out', () => {
        const members = { u1: { name: 'Ann' }, u2: { name: 'Bob' }, u3: { name: 'Cy' }, u4: { name: 'Dee' } };
        const games = { 1: game('Home'), 2: game(null, 'scheduled') };
        const picksByUser = {
            u1: { 1: { winner: 'Home', confidence: 2 }, 2: { winner: 'Home', confidence: 1 } },
            u2: { 1: { winner: 'Away', confidence: 1 }, 2: { winner: 'Home', confidence: 2 } },
            u3: { 1: { winner: 'Home', confidence: 1 }, 2: { winner: 'Away', confidence: 2 } },
            u4: { 1: { confidence: 2 } },
            ghost: { 1: { winner: 'Home', confidence: 2 } }
        };
        const rows = scoring.upsideStandings(members, picksByUser, games);
        expect(rows.map(r => [r.userId, r.name, r.rank, r.points, r.pointsLeft, r.maxPossible, r.gamesLeft, r.pointsFromLeader])).toEqual([
            ['u1', 'Ann', 1, 2, 1, 3, 1, 0],
            ['u3', 'Cy', 1, 1, 2, 3, 1, 0],
            ['u2', 'Bob', 3, 0, 2, 2, 1, 1]
        ]);
    });
});
