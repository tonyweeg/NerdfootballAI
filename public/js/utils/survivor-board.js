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

    const isRealTeam = (team) => typeof team === 'string' && team !== '' && team !== 'TBD';

    // Scheduled matchups only: TBD placeholders are not games.
    const realGameIds = (weekGames) => (weekGames ? Scoring.gameIds(weekGames) : [])
        .filter((id) => isRealTeam(weekGames[id].a) && isRealTeam(weekGames[id].h));

    // The id of the game this team plays in this week, or null (bye, or no schedule).
    function gameForTeam(team, weekGames) {
        if (!isRealTeam(team)) return null;
        return realGameIds(weekGames).find((id) => weekGames[id].a === team || weekGames[id].h === team) || null;
    }

    // playing | bye | unknown. Without a loaded schedule nobody is called a bye.
    function teamWeekStatus(team, weekGames) {
        if (realGameIds(weekGames).length === 0) return 'unknown';
        return gameForTeam(team, weekGames) ? 'playing' : 'bye';
    }

    // What a survivor pick stores: the team, its real game and when. Result and
    // alive are never stored — they are derived from game data (pickGameStatus).
    function buildPickRecord({ team, weekGames, now = new Date(), submittedBy } = {}) {
        if (!isRealTeam(team)) throw new Error('buildPickRecord: team is required');
        const record = { team, gameId: gameForTeam(team, weekGames), submittedAt: now.toISOString() };
        if (submittedBy) record.submittedBy = submittedBy;
        return record;
    }

    // Live status of a survivor pick, read from this week's game data rather than
    // the result stored on the pick (which is written once, as "Pending", on save).
    function pickGameStatus(team, weekGames) {
        const gameId = gameForTeam(team, weekGames);
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

    const SurvivorBoard = Object.freeze({ boardRows, pickPiles, pickGameStatus, gameForTeam, teamWeekStatus, buildPickRecord });

    if (typeof window !== 'undefined') window.SurvivorBoard = SurvivorBoard;
    if (typeof module !== 'undefined' && module.exports) module.exports = SurvivorBoard;
})();
