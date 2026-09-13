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
