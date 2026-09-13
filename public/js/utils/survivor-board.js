// Survivor board rules for The 36 Chambers (NERD-28/29). Pure functions, no DOM.
//
// Rows come from getsurvivorpooldata plus this week's picks, shaped as:
//   { name, isEliminated, currentWeekPick?, eliminatedBy?, eliminatedWeek? }
(function () {
    'use strict';

    const NO_PICK = 'NO_PICK_SUBMITTED';

    // Final / live / tie rules come from the shared scorer so every page agrees.
    const Scoring = (typeof window !== 'undefined' && window.ConfidenceScoring)
        || (typeof require === 'function' ? require('./confidence-scoring.js') : null);

    const byName = (a, b) => a.name.localeCompare(b.name);

    // Eliminated by a team, not for failing to pick.
    const knockedOutByTeam = (s) => s.isEliminated && typeof s.eliminatedBy === 'string'
        && s.eliminatedBy !== '' && s.eliminatedBy !== NO_PICK;

    // No pick, not on the board. Before kickoff picks are unknown, so every survivor
    // is listed; once the board opens only survivors with this week's pick remain.
    function boardRows(survivors, weekHasStarted) {
        const list = survivors || [];
        const alive = list
            .filter((s) => !s.isEliminated && (!weekHasStarted || s.currentWeekPick))
            .sort(byName);
        const fallen = list
            .filter(knockedOutByTeam)
            .sort((a, b) => (a.eliminatedWeek - b.eliminatedWeek) || byName(a, b));
        return { alive, fallen };
    }

    // One pile per team picked this week: survivors' current picks plus players
    // eliminated this week by that team. A pile is fallen when nobody in it survived.
    function pickPiles(survivors, week) {
        const piles = new Map();
        const add = (team, survived) => {
            const pile = piles.get(team) || { team, count: 0, survivors: 0 };
            pile.count++;
            if (survived) pile.survivors++;
            piles.set(team, pile);
        };

        (survivors || []).forEach((s) => {
            if (!s.isEliminated && s.currentWeekPick) add(s.currentWeekPick, true);
            else if (knockedOutByTeam(s) && Number(s.eliminatedWeek) === Number(week)) add(s.eliminatedBy, false);
        });

        return [...piles.values()]
            .map(({ team, count, survivors: survived }) => ({ team, count, fallen: survived === 0 }))
            .sort((a, b) => (b.count - a.count) || a.team.localeCompare(b.team));
    }

    const score = (value) => {
        const n = parseInt(value, 10);
        return Number.isFinite(n) ? n : null;
    };

    // Live status of a survivor pick, read from this week's game data rather than
    // the result stored on the pick (which is written once, as "Pending", on save).
    function pickGameStatus(team, weekGames) {
        if (typeof team !== 'string' || team === '' || team === 'TBD' || !weekGames) return { state: 'unknown' };

        const gameId = Scoring.gameIds(weekGames).find((id) => {
            const g = weekGames[id];
            return g.a === team || g.h === team;
        });
        if (!gameId) return { state: 'unknown' };

        const game = weekGames[gameId];
        const isHome = game.h === team;
        const teamScore = score(isHome ? game.homeScore : game.awayScore);
        const opponentScore = score(isHome ? game.awayScore : game.homeScore);

        let state = 'scheduled';
        if (Scoring.isGameFinal(game)) {
            if (Scoring.isTieGame(game)) state = 'tie';
            else if (typeof game.winner === 'string' && game.winner !== '' && game.winner !== 'TBD') state = game.winner === team ? 'won' : 'lost';
            else if (teamScore !== null && opponentScore !== null) state = teamScore > opponentScore ? 'won' : teamScore < opponentScore ? 'lost' : 'tie';
            else state = 'unknown';
        } else if (Scoring.isGameLive(game)) {
            state = 'live';
        }

        return {
            state,
            gameId,
            opponent: isHome ? game.a : game.h,
            isHome,
            teamScore,
            opponentScore,
            dt: game.dt
        };
    }

    const SurvivorBoard = Object.freeze({ boardRows, pickPiles, pickGameStatus });

    if (typeof window !== 'undefined') window.SurvivorBoard = SurvivorBoard;
    if (typeof module !== 'undefined' && module.exports) module.exports = SurvivorBoard;
})();
