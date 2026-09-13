const Board = require('../public/js/utils/survivor-board.js');

const alive = (name, pick) => ({ userId: name, name, status: 'ALIVE', isEliminated: false, currentWeekPick: pick });
const dead = (name, team, week) => ({ userId: name, name, status: `ELIMINATED (Week ${week})`, isEliminated: true, eliminatedBy: team, eliminatedWeek: week });

describe('boardRows', () => {
    const survivors = [
        alive('Zed', 'Buffalo Bills'),
        alive('Amy', 'Cincinnati Bengals'),
        alive('Blair', undefined),
        dead('Late', 'New York Jets', 2),
        dead('Early', 'Cleveland Browns', 1),
        dead('Forgot', 'NO_PICK_SUBMITTED', 1),
        dead('Blank', '', 1)
    ];

    test('before kickoff: every survivor is listed (picks unknown), fallen only by a team', () => {
        const rows = Board.boardRows(survivors, false);
        expect(rows.alive.map((s) => s.name)).toEqual(['Amy', 'Blair', 'Zed']);
        expect(rows.fallen.map((s) => s.name)).toEqual(['Early', 'Late']);
    });

    test('after kickoff: survivors without this week\'s pick are left off', () => {
        const rows = Board.boardRows(survivors, true);
        expect(rows.alive.map((s) => s.name)).toEqual(['Amy', 'Zed']);
        expect(rows.fallen.map((s) => s.name)).toEqual(['Early', 'Late']);
    });

    test('fallen sort by elimination week, then name', () => {
        const rows = Board.boardRows([dead('Bo', 'A', 2), dead('Al', 'B', 2), dead('Cy', 'C', 1)], true);
        expect(rows.fallen.map((s) => s.name)).toEqual(['Cy', 'Al', 'Bo']);
    });

    test('does not mutate the input order', () => {
        const input = [alive('Zed', 'X'), alive('Amy', 'Y')];
        Board.boardRows(input, true);
        expect(input.map((s) => s.name)).toEqual(['Zed', 'Amy']);
    });
});

describe('pickPiles', () => {
    test('counts every survivor pick for the week, largest pile first, ties by team name', () => {
        const piles = Board.pickPiles([
            alive('a', 'Jacksonville Jaguars'),
            alive('b', 'Cincinnati Bengals'),
            alive('c', 'Jacksonville Jaguars'),
            alive('d', 'Buffalo Bills'),
            alive('e', 'Cincinnati Bengals'),
            alive('f', 'Jacksonville Jaguars')
        ], 1);
        expect(piles).toEqual([
            { team: 'Jacksonville Jaguars', count: 3, fallen: false },
            { team: 'Cincinnati Bengals', count: 2, fallen: false },
            { team: 'Buffalo Bills', count: 1, fallen: false }
        ]);
    });

    test('players eliminated this week count toward their team, and a pile of only eliminated players is fallen', () => {
        const piles = Board.pickPiles([
            alive('a', 'Seattle Seahawks'),
            dead('b', 'New England Patriots', 1),
            dead('c', 'New England Patriots', 1)
        ], 1);
        expect(piles).toEqual([
            { team: 'New England Patriots', count: 2, fallen: true },
            { team: 'Seattle Seahawks', count: 1, fallen: false }
        ]);
    });

    test('earlier-week eliminations, no-pick eliminations and survivors without a pick are not counted', () => {
        const piles = Board.pickPiles([
            dead('old', 'New York Jets', 1),
            dead('forgot', 'NO_PICK_SUBMITTED', 2),
            alive('nopick', undefined),
            alive('a', 'Detroit Lions')
        ], 2);
        expect(piles).toEqual([{ team: 'Detroit Lions', count: 1, fallen: false }]);
    });

    test('pile totals equal the picks on the board after kickoff', () => {
        const survivors = [alive('a', 'X'), alive('b', 'X'), alive('c', undefined), dead('d', 'Y', 3)];
        const rows = Board.boardRows(survivors, true);
        const total = Board.pickPiles(survivors, 3).reduce((sum, p) => sum + p.count, 0);
        expect(total).toBe(rows.alive.length + rows.fallen.filter((s) => s.eliminatedWeek === 3).length);
    });

    test('empty input gives no piles', () => {
        expect(Board.pickPiles([], 1)).toEqual([]);
        expect(Board.pickPiles(undefined, 1)).toEqual([]);
    });
});

describe('pickGameStatus', () => {
    const week = {
        _metadata: {},
        103: { a: 'Tampa Bay Buccaneers', h: 'Cincinnati Bengals', status: 'STATUS_FINAL', winner: 'Cincinnati Bengals', awayScore: 27, homeScore: 33, dt: '2026-09-13T13:00:00Z' },
        109: { a: 'Cleveland Browns', h: 'Jacksonville Jaguars', status: 'STATUS_FINAL', winner: 'Jacksonville Jaguars', awayScore: 10, homeScore: 34 },
        110: { a: 'Buffalo Bills', h: 'Houston Texans', status: 'STATUS_FINAL', winner: null, awayScore: '20', homeScore: '20' },
        111: { a: 'Miami Dolphins', h: 'Las Vegas Raiders', status: 'STATUS_FINAL', winner: null, awayScore: '17', homeScore: '24' },
        114: { a: 'Arizona Cardinals', h: 'Los Angeles Chargers', status: 'IN_PROGRESS', winner: null, awayScore: 10, homeScore: 7 },
        116: { a: 'Denver Broncos', h: 'Kansas City Chiefs', status: 'scheduled', winner: null, awayScore: 0, homeScore: 0, dt: '2026-09-14T20:15:00Z' },
        117: { a: 'TBD', h: 'TBD', status: 'scheduled' }
    };

    test('real week 1 game 103: Bengals won at home', () => {
        expect(Board.pickGameStatus('Cincinnati Bengals', week)).toEqual({
            state: 'won', gameId: '103', opponent: 'Tampa Bay Buccaneers', isHome: true,
            teamScore: 33, opponentScore: 27, dt: '2026-09-13T13:00:00Z'
        });
    });

    test('away loser is lost, with scores from the picked team\'s side', () => {
        expect(Board.pickGameStatus('Cleveland Browns', week)).toMatchObject({
            state: 'lost', opponent: 'Jacksonville Jaguars', isHome: false, teamScore: 10, opponentScore: 34
        });
    });

    test('final with equal scores is a tie for both teams', () => {
        expect(Board.pickGameStatus('Buffalo Bills', week).state).toBe('tie');
        expect(Board.pickGameStatus('Houston Texans', week).state).toBe('tie');
    });

    test('final without a winner field is decided by the score', () => {
        expect(Board.pickGameStatus('Las Vegas Raiders', week).state).toBe('won');
        expect(Board.pickGameStatus('Miami Dolphins', week).state).toBe('lost');
    });

    test('in-progress games are live whatever the status prefix', () => {
        expect(Board.pickGameStatus('Los Angeles Chargers', week)).toMatchObject({ state: 'live', teamScore: 7, opponentScore: 10 });
    });

    test('not started is scheduled, and zero scores are not treated as a result', () => {
        expect(Board.pickGameStatus('Kansas City Chiefs', week)).toMatchObject({ state: 'scheduled', opponent: 'Denver Broncos', dt: '2026-09-14T20:15:00Z' });
    });

    test('unknown team, placeholders or no games give unknown', () => {
        expect(Board.pickGameStatus('Seattle Seahawks', week)).toEqual({ state: 'unknown' });
        expect(Board.pickGameStatus('TBD', week)).toEqual({ state: 'unknown' });
        expect(Board.pickGameStatus('Cincinnati Bengals', null)).toEqual({ state: 'unknown' });
        expect(Board.pickGameStatus(undefined, week)).toEqual({ state: 'unknown' });
    });
});

describe('gameForTeam / teamWeekStatus', () => {
    const week = {
        _metadata: {},
        103: { a: 'Tampa Bay Buccaneers', h: 'Cincinnati Bengals', status: 'STATUS_FINAL' },
        117: { a: 'TBD', h: 'TBD', status: 'scheduled' }
    };

    test('home and away teams resolve to the real game id', () => {
        expect(Board.gameForTeam('Cincinnati Bengals', week)).toBe('103');
        expect(Board.gameForTeam('Tampa Bay Buccaneers', week)).toBe('103');
    });

    test('a team without a game that week is a bye', () => {
        expect(Board.gameForTeam('Seattle Seahawks', week)).toBeNull();
        expect(Board.teamWeekStatus('Seattle Seahawks', week)).toBe('bye');
        expect(Board.teamWeekStatus('Cincinnati Bengals', week)).toBe('playing');
    });

    test('with no schedule loaded the status is unknown, never a false bye', () => {
        expect(Board.teamWeekStatus('Cincinnati Bengals', null)).toBe('unknown');
        expect(Board.teamWeekStatus('Cincinnati Bengals', {})).toBe('unknown');
        expect(Board.teamWeekStatus('Cincinnati Bengals', { _metadata: {} })).toBe('unknown');
        expect(Board.gameForTeam('Cincinnati Bengals', null)).toBeNull();
    });

    test('placeholder TBD entries are not games', () => {
        expect(Board.gameForTeam('TBD', week)).toBeNull();
    });
});

describe('buildPickRecord', () => {
    const week = { 103: { a: 'Tampa Bay Buccaneers', h: 'Cincinnati Bengals', status: 'scheduled' } };
    const now = new Date('2026-09-13T12:00:00Z');

    test('stores team, the real game id and when — never result or alive', () => {
        const record = Board.buildPickRecord({ team: 'Cincinnati Bengals', weekGames: week, now });
        expect(record).toEqual({ team: 'Cincinnati Bengals', gameId: '103', submittedAt: '2026-09-13T12:00:00.000Z' });
        expect(record).not.toHaveProperty('result');
        expect(record).not.toHaveProperty('alive');
    });

    test('records who submitted it when given (admin saves)', () => {
        expect(Board.buildPickRecord({ team: 'Cincinnati Bengals', weekGames: week, now, submittedBy: 'admin@x.com' }))
            .toEqual({ team: 'Cincinnati Bengals', gameId: '103', submittedAt: '2026-09-13T12:00:00.000Z', submittedBy: 'admin@x.com' });
    });

    test('a team with no game gets a null game id (admins may save it)', () => {
        expect(Board.buildPickRecord({ team: 'Seattle Seahawks', weekGames: week, now }).gameId).toBeNull();
    });

    test('requires a team', () => {
        expect(() => Board.buildPickRecord({ team: '', weekGames: week, now })).toThrow('buildPickRecord: team is required');
    });
});
