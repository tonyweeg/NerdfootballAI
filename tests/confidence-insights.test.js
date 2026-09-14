const Insights = require('../public/js/utils/confidence-insights.js');

// Game dt values are Eastern wall clock with a bare Z, like the real games docs.
const final = (a, h, winner, dt, awayScore = 0, homeScore = 0) => ({ a, h, status: 'STATUS_FINAL', winner, awayScore, homeScore, dt });
const scheduled = (a, h, dt) => ({ a, h, status: 'scheduled', winner: null, dt });

const games = {
    _metadata: {},
    1: final('Jets', 'Bills', 'Bills', '2026-09-13T13:00:00Z'),
    2: final('Rams', 'Niners', 'Rams', '2026-09-10T20:15:00Z'),
    3: final('Colts', 'Texans', 'TIE', '2026-09-13T16:25:00Z', 20, 20),
    4: scheduled('Bears', 'Lions', '2026-09-14T20:15:00Z'),
    5: scheduled('Chiefs', 'Broncos', '2026-09-13T20:20:00Z')
};
// Sunday night: games 2, 1, 3 are final, game 5 kicked off (not final yet), game 4 is Monday.
const NOW = new Date('2026-09-14T12:00:00Z');

const on = { participation: { confidence: { enabled: true } } };
const members = {
    ann: { name: 'Ann', ...on },
    bob: { name: 'Bob' },
    cy: { name: 'Cy', ...on },
    surv: { name: 'Survivor Only', participation: { confidence: { enabled: false } } }
};
const pick = (winner, confidence) => ({ winner, confidence });
const picksByUser = {
    ann: { 1: pick('Bills', 4), 2: pick('Rams', 3), 3: pick('Colts', 2), 4: pick('Lions', 1), 5: pick('Chiefs', 5) },
    bob: { 1: pick('Bills', 1), 2: pick('Niners', 4), 3: pick('Texans', 3), 4: pick('Lions', 2), 5: pick('Broncos', 5) },
    cy: { 1: pick('Jets', 2), 2: pick('Rams', 1), 5: pick('Chiefs', 3) },
    surv: { 1: pick('Jets', 4), 2: pick('Niners', 3), 3: pick('Colts', 2), 4: pick('Bears', 1) },
    stranger: { 1: pick('Jets', 4) }
};

describe('startedGameIds', () => {
    test('final, live or past kickoff, in kickoff order', () => {
        expect(Insights.startedGameIds(games, NOW)).toEqual(['2', '1', '3', '5']);
    });

    test('before the first kickoff nothing has started', () => {
        const preseason = { 1: scheduled('Jets', 'Bills', '2026-09-13T13:00:00Z'), 2: scheduled('Rams', 'Niners', '2026-09-10T20:15:00Z') };
        expect(Insights.startedGameIds(preseason, new Date('2026-09-10T20:00:00Z'))).toEqual([]);
    });

    test('a live game has started even without a kickoff time', () => {
        expect(Insights.startedGameIds({ 9: { a: 'A', h: 'B', status: 'STATUS_IN_PROGRESS' } }, NOW)).toEqual(['9']);
    });
});

describe('standings and weekSummary', () => {
    test('players with picks by points, with confidence still riding', () => {
        expect(Insights.standings(members, picksByUser, games).map((r) => [r.userId, r.points, r.correct, r.decided, r.pointsLeft, r.maxPossible])).toEqual([
            ['ann', 9, 3, 3, 6, 15],
            ['bob', 4, 2, 3, 7, 11],
            ['cy', 1, 1, 2, 3, 4]
        ]);
    });

    test('summary: accuracy on decided games, ties correct, survivor-only and non-members out', () => {
        expect(Insights.weekSummary(members, picksByUser, games)).toEqual({
            players: 3, gamesFinal: 3, gamesTotal: 5, poolAccuracy: 75, averagePoints: 4.7, highScore: 9, perfect: 1
        });
    });
});

describe('confidenceLevels and confidenceBands', () => {
    test('win rate per level from decided picks', () => {
        expect(Insights.confidenceLevels(members, picksByUser, games)).toEqual([
            { level: 1, wins: 2, total: 2, winRate: 100 },
            { level: 2, wins: 1, total: 2, winRate: 50 },
            { level: 3, wins: 2, total: 2, winRate: 100 },
            { level: 4, wins: 1, total: 2, winRate: 50 }
        ]);
    });

    test('confidence outside 1..n or non-integer is left out of the levels', () => {
        expect(Insights.confidenceLevels({ ann: on }, { ann: { 1: pick('Bills', 9), 2: pick('Rams', 1.5) } }, games)).toEqual([]);
    });

    const levels = Array.from({ length: 16 }, (_, i) => ({ level: i + 1, wins: i + 1 > 8 ? 2 : 1, total: 2 }));

    test('a 16-game week compares 1–5 with 12–16', () => {
        expect(Insights.confidenceBands(levels, 16)).toEqual({
            low: { from: 1, to: 5, wins: 5, total: 10, winRate: 50 },
            high: { from: 12, to: 16, wins: 10, total: 10, winRate: 100 }
        });
    });

    test('shorter weeks scale the bands; an empty band has a null win rate', () => {
        const bands = Insights.confidenceBands(levels.slice(0, 13), 13);
        expect([bands.low.from, bands.low.to, bands.high.from, bands.high.to]).toEqual([1, 4, 10, 13]);
        expect(Insights.confidenceBands([], 16).high.winRate).toBeNull();
    });
});

describe('accuracySpread', () => {
    test('players with decided games bucketed by accuracy', () => {
        expect(Insights.accuracySpread(members, picksByUser, games).map((b) => [b.label, b.players])).toEqual([
            ['0–20%', 0], ['21–40%', 0], ['41–60%', 1], ['61–80%', 1], ['81–100%', 1]
        ]);
    });
});

describe('gameAnalysis', () => {
    test('split, favourite, result and average confidence; highest confidence first, locked games last', () => {
        const rows = Insights.gameAnalysis(members, picksByUser, games, NOW);
        const byId = Object.fromEntries(rows.map((r) => [r.gameId, r]));

        expect(byId[1]).toMatchObject({ picks: 3, awayShare: 33, homeShare: 67, favourite: 'Bills', result: 'favourite', winner: 'Bills', averageConfidence: 2.3 });
        expect(byId[2]).toMatchObject({ favourite: 'Rams', result: 'favourite', averageConfidence: 2.7 });
        expect(byId[3]).toMatchObject({ favourite: null, tie: true, result: 'tie', winner: null });
        expect(byId[5]).toMatchObject({ final: false, locked: false, result: 'pending', favourite: 'Chiefs', averageConfidence: 4.3 });
        expect(rows.map((r) => r.gameId)).toEqual(['5', '2', '3', '1', '4']);
    });

    test('a game that has not kicked off reveals nothing about picks', () => {
        const monday = Insights.gameAnalysis(members, picksByUser, games, NOW).find((r) => r.gameId === '4');
        expect(monday).toEqual({
            gameId: '4', away: 'Bears', home: 'Lions', final: false, tie: false, locked: true,
            winner: null, picks: null, awayShare: null, homeShare: null, favourite: null, result: 'locked', averageConfidence: null
        });
    });

    test('an upset is a final game the favourite lost', () => {
        const rows = Insights.gameAnalysis({ ann: on, cy: on }, { ann: { 1: pick('Jets', 1) }, cy: { 1: pick('Jets', 2) } }, { 1: final('Jets', 'Bills', 'Bills', '2026-09-13T13:00:00Z') }, NOW);
        expect(rows[0]).toMatchObject({ favourite: 'Jets', result: 'upset', awayShare: 100 });
    });
});

describe('upsetCost', () => {
    test('confidence points lost on each final game, most expensive first; ties cost nothing', () => {
        expect(Insights.upsetCost(members, picksByUser, games).map((g) => [g.gameId, g.lost, g.missed, g.picks])).toEqual([
            ['2', 4, 1, 3],
            ['1', 2, 1, 3],
            ['3', 0, 0, 2]
        ]);
    });
});

describe('scoringRace', () => {
    test('cumulative points of the leaders through finished games in kickoff order', () => {
        expect(Insights.scoringRace(members, picksByUser, games, { top: 2, now: NOW })).toEqual({
            games: [{ gameId: '2', away: 'Rams', home: 'Niners' }, { gameId: '1', away: 'Jets', home: 'Bills' }, { gameId: '3', away: 'Colts', home: 'Texans' }],
            series: [
                { userId: 'ann', name: 'Ann', points: [3, 7, 9] },
                { userId: 'bob', name: 'Bob', points: [0, 1, 4] }
            ]
        });
    });

    test("the last point of each series equals the player's week score", () => {
        const race = Insights.scoringRace(members, picksByUser, games, { now: NOW });
        const rows = Insights.standings(members, picksByUser, games);
        race.series.forEach((s) => expect(s.points[s.points.length - 1]).toBe(rows.find((r) => r.userId === s.userId).points));
    });
});

describe('consensus', () => {
    test('share of picks agreeing with the pool favourite on started games; split games left out', () => {
        expect(Insights.consensus(members, picksByUser, games, NOW)).toEqual([
            { userId: 'ann', name: 'Ann', points: 9, picks: 3, agreement: 100 },
            { userId: 'bob', name: 'Bob', points: 4, picks: 3, agreement: 33 },
            { userId: 'cy', name: 'Cy', points: 1, picks: 3, agreement: 67 }
        ]);
    });

    test('before kickoff there is no consensus to show', () => {
        const unplayed = Object.fromEntries(Object.entries(games).filter(([id]) => id !== '_metadata')
            .map(([id, g]) => [id, scheduled(g.a, g.h, g.dt)]));
        expect(Insights.consensus(members, picksByUser, unplayed, new Date('2026-09-10T20:00:00Z'))).toEqual([]);
    });
});

describe('pickMatrix', () => {
    test('players by points × started games by kickoff; unstarted games are not columns', () => {
        const matrix = Insights.pickMatrix(members, picksByUser, games, NOW);
        expect(matrix.games.map((g) => g.gameId)).toEqual(['2', '1', '3', '5']);
        expect(matrix.rows.map((r) => [r.userId, r.cells.map((c) => (c.state === 'none' ? 'none' : `${c.team}:${c.confidence}:${c.state}`))])).toEqual([
            ['ann', ['Rams:3:correct', 'Bills:4:correct', 'Colts:2:correct', 'Chiefs:5:pending']],
            ['bob', ['Niners:4:wrong', 'Bills:1:correct', 'Texans:3:correct', 'Broncos:5:pending']],
            ['cy', ['Rams:1:correct', 'Jets:2:wrong', 'none', 'Chiefs:3:pending']]
        ]);
        expect(JSON.stringify(matrix)).not.toContain('Lions');
    });
});

describe('nerdFacts', () => {
    test('costliest game, boldest miss and the contrarian among the top half', () => {
        expect(Insights.nerdFacts(members, picksByUser, games, NOW)).toEqual({
            biggestUpset: null,
            costliestGame: { gameId: '2', away: 'Rams', home: 'Niners', lost: 4, missed: 1 },
            boldestMiss: { confidence: 4, players: 1, gameId: '2', team: 'Niners' },
            contrarian: { userId: 'bob', name: 'Bob', agreement: 33, points: 4 }
        });
    });

    test('biggest upset: the final game whose winner the fewest picked', () => {
        const upsetGames = {
            1: final('Jets', 'Bills', 'Jets', '2026-09-13T13:00:00Z'),
            2: final('Rams', 'Niners', 'Niners', '2026-09-13T16:25:00Z')
        };
        const picks = {
            ann: { 1: pick('Bills', 2), 2: pick('Rams', 1) },
            cy: { 1: pick('Bills', 1), 2: pick('Niners', 2) },
            bob: { 1: pick('Bills', 2), 2: pick('Rams', 1) }
        };
        expect(Insights.nerdFacts(members, picks, upsetGames, NOW).biggestUpset).toEqual({ gameId: '1', winner: 'Jets', loser: 'Bills', winnerShare: 0 });
    });

    test('an empty week has nothing to report', () => {
        expect(Insights.nerdFacts(members, {}, games, NOW)).toEqual({ biggestUpset: null, costliestGame: null, boldestMiss: null, contrarian: null });
    });
});
