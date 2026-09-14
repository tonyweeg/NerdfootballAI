const Insights = require('../public/js/utils/confidence-insights.js');

const final = (a, h, winner, awayScore = 0, homeScore = 0) => ({ a, h, status: 'STATUS_FINAL', winner, awayScore, homeScore });
const games = {
    _metadata: {},
    1: final('Jets', 'Bills', 'Bills'),
    2: final('Rams', 'Niners', 'Rams'),
    3: final('Colts', 'Texans', 'TIE', 20, 20),
    4: { a: 'Bears', h: 'Lions', status: 'scheduled', winner: null }
};
const on = { participation: { confidence: { enabled: true } } };
const members = {
    ann: { name: 'Ann', ...on },
    bob: { name: 'Bob' },
    cy: { name: 'Cy', ...on },
    surv: { name: 'Survivor Only', participation: { confidence: { enabled: false } } }
};
const pick = (winner, confidence) => ({ winner, confidence });
const picksByUser = {
    ann: { 1: pick('Bills', 4), 2: pick('Rams', 3), 3: pick('Colts', 2), 4: pick('Lions', 1) },
    bob: { 1: pick('Bills', 1), 2: pick('Niners', 4), 3: pick('Texans', 3), 4: pick('Lions', 2) },
    surv: { 1: pick('Jets', 4), 2: pick('Niners', 3), 3: pick('Colts', 2), 4: pick('Bears', 1) },
    stranger: { 1: pick('Jets', 4) }
};

describe('weekSummary', () => {
    test('players with picks only; accuracy on decided games; ties count as correct', () => {
        expect(Insights.weekSummary(members, picksByUser, games)).toEqual({
            players: 2,
            gamesFinal: 3,
            gamesTotal: 4,
            poolAccuracy: 83.3,
            averagePoints: 6.5,
            highScore: 9,
            perfect: 1
        });
    });
});

describe('confidenceLevels', () => {
    test('win rate per level from decided picks; unplayed games, survivor-only members and non-members ignored', () => {
        expect(Insights.confidenceLevels(members, picksByUser, games)).toEqual([
            { level: 1, wins: 1, total: 1, winRate: 100 },
            { level: 2, wins: 1, total: 1, winRate: 100 },
            { level: 3, wins: 2, total: 2, winRate: 100 },
            { level: 4, wins: 1, total: 2, winRate: 50 }
        ]);
    });

    test('confidence outside 1..n or non-integer is left out of the levels', () => {
        const levels = Insights.confidenceLevels({ ann: on }, { ann: { 1: pick('Bills', 9), 2: pick('Rams', 1.5) } }, games);
        expect(levels).toEqual([]);
    });
});

describe('confidenceBands', () => {
    const levels = Array.from({ length: 16 }, (_, i) => ({ level: i + 1, wins: i + 1 > 8 ? 2 : 1, total: 2 }));

    test('a 16-game week compares 1–5 with 12–16', () => {
        expect(Insights.confidenceBands(levels, 16)).toEqual({
            low: { from: 1, to: 5, wins: 5, total: 10, winRate: 50 },
            high: { from: 12, to: 16, wins: 10, total: 10, winRate: 100 }
        });
    });

    test('shorter weeks scale the bands', () => {
        const bands = Insights.confidenceBands(levels.slice(0, 13), 13);
        expect([bands.low.from, bands.low.to, bands.high.from, bands.high.to]).toEqual([1, 4, 10, 13]);
    });

    test('no picks in a band gives a null win rate', () => {
        expect(Insights.confidenceBands([], 16).high.winRate).toBeNull();
    });
});

describe('accuracySpread', () => {
    test('players with decided games bucketed by accuracy', () => {
        const spread = Insights.accuracySpread(members, picksByUser, games);
        expect(spread.map((b) => [b.label, b.players])).toEqual([
            ['0–20%', 0], ['21–40%', 0], ['41–60%', 0], ['61–80%', 1], ['81–100%', 1]
        ]);
    });
});

describe('gameAnalysis', () => {
    test('pick split, favourite, result and average confidence per game, highest confidence first', () => {
        const rows = Insights.gameAnalysis(members, picksByUser, games);
        const byId = Object.fromEntries(rows.map((r) => [r.gameId, r]));

        expect(byId[1]).toMatchObject({ picks: 2, awayShare: 0, homeShare: 100, favourite: 'Bills', result: 'favourite', winner: 'Bills', averageConfidence: 2.5 });
        expect(byId[2]).toMatchObject({ picks: 2, favourite: null, result: 'split', winner: 'Rams', averageConfidence: 3.5 });
        expect(byId[3]).toMatchObject({ tie: true, result: 'tie', winner: null });
        expect(byId[4]).toMatchObject({ final: false, result: 'pending', favourite: 'Lions', winner: null });
        expect(rows.map((r) => r.gameId)).toEqual(['2', '1', '3', '4']);
    });

    test('an upset is a final game the favourite lost', () => {
        const rows = Insights.gameAnalysis({ ann: on, cy: on }, { ann: { 1: pick('Jets', 1) }, cy: { 1: pick('Jets', 2) } }, { 1: final('Jets', 'Bills', 'Bills') });
        expect(rows[0]).toMatchObject({ favourite: 'Jets', result: 'upset', awayShare: 100 });
    });
});
