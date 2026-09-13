// Confidence pool scoring — one rule for every page and function that totals points.
// Final/tie rules match nerd-universe-grid.html isGameCompleted + tie logic.
//
// MIRROR: functions/confidenceScoring.js must stay byte-identical to this file
// (tests/confidence-scoring.test.js enforces it).
(function () {
    'use strict';

    const META_KEYS = new Set([
        'userName', 'submittedAt', 'weekNumber', 'timestamp', 'mondayNightPoints',
        'mnfTotalPoints', 'tiebreaker', 'totalPoints', 'userId', 'lastUpdated',
        'poolId', 'survivorPick', 'createdAt', 'week', 'games', '_metadata'
    ]);
    const FINAL_STATUSES = new Set(['final', 'final/ot']);
    const LIVE_STATUSES = new Set(['in_progress', 'halftime', 'end_period']);

    const normalizedStatus = (game) =>
        String((game && game.status) || '').toLowerCase().replace(/^status_/, '');

    const isEntry = (key, value) =>
        !META_KEYS.has(key) && value !== null && typeof value === 'object';

    function gameIds(games) {
        if (!games || typeof games !== 'object') return [];
        return Object.keys(games).filter((id) => isEntry(id, games[id]));
    }

    function isGameFinal(game) {
        if (!game) return false;
        return FINAL_STATUSES.has(normalizedStatus(game)) ||
            (typeof game.winner === 'string' && game.winner !== '' && game.winner !== 'TBD');
    }

    function isGameLive(game) {
        return !!game && !isGameFinal(game) && LIVE_STATUSES.has(normalizedStatus(game));
    }

    function isTieGame(game) {
        if (!isGameFinal(game)) return false;
        const winner = typeof game.winner === 'string' ? game.winner.toUpperCase() : '';
        if (winner.includes('TIE') || winner === 'DRAW') return true;
        const away = parseInt(game.awayScore, 10);
        const home = parseInt(game.homeScore, 10);
        return Number.isFinite(away) && away === home && away > 0;
    }

    function gameStates(games) {
        const ids = gameIds(games);
        let completed = 0;
        let live = 0;
        ids.forEach((id) => {
            if (isGameFinal(games[id])) completed++;
            else if (isGameLive(games[id])) live++;
        });
        return { total: ids.length, completed, live, upcoming: ids.length - completed - live };
    }

    function scoreWeek(picks, games) {
        const result = { points: 0, correct: 0, decided: 0, picksMade: 0 };
        if (!picks || typeof picks !== 'object') return result;
        const ids = gameIds(games);
        const maxConfidence = ids.length;

        ids.forEach((id) => {
            const pick = picks[id];
            if (!isEntry(id, pick) || typeof pick.winner !== 'string' || pick.winner === '') return;
            result.picksMade++;

            const game = games[id];
            if (!isGameFinal(game)) return;
            result.decided++;

            if (isTieGame(game) || game.winner === pick.winner) {
                result.correct++;
                const confidence = pick.confidence;
                if (Number.isInteger(confidence) && confidence >= 1 && confidence <= maxConfidence) {
                    result.points += confidence;
                }
            }
        });
        return result;
    }

    function rankStandings(rows) {
        const sorted = rows
            .map((row, index) => ({ row, index }))
            .sort((a, b) => (b.row.points - a.row.points) || (a.index - b.index))
            .map(({ row }) => ({ ...row }));
        const leader = sorted.length > 0 ? sorted[0].points : 0;
        sorted.forEach((row, i) => {
            row.rank = i > 0 && row.points === sorted[i - 1].points ? sorted[i - 1].rank : i + 1;
            row.pointsFromLeader = leader - row.points;
        });
        return sorted;
    }

    const memberName = (member) =>
        (member && (member.name || member.displayName || member.email)) || 'Unknown';

    function weekStandings(members, picksByUser, games) {
        const rows = Object.keys(members || {}).map((userId) => {
            const score = scoreWeek((picksByUser || {})[userId], games);
            return {
                userId,
                name: memberName(members[userId]),
                ...score,
                hasPicks: score.picksMade > 0
            };
        });
        return rankStandings(rows);
    }

    function seasonStandings(members, weeks) {
        const totals = {};
        Object.keys(members || {}).forEach((userId) => {
            totals[userId] = {
                userId,
                name: memberName(members[userId]),
                points: 0, correct: 0, decided: 0, picksMade: 0,
                weeksPlayed: 0,
                byWeek: {}
            };
        });

        (weeks || []).forEach(({ week, games, picksByUser }) => {
            Object.keys(totals).forEach((userId) => {
                const score = scoreWeek((picksByUser || {})[userId], games);
                if (score.picksMade === 0) return;
                const row = totals[userId];
                row.points += score.points;
                row.correct += score.correct;
                row.decided += score.decided;
                row.picksMade += score.picksMade;
                row.weeksPlayed++;
                row.byWeek[week] = score.points;
            });
        });

        return rankStandings(Object.values(totals));
    }

    function seasonSummary(rows, weeks) {
        const players = rows.filter((row) => row.weeksPlayed > 0);
        let bestWeek = null;
        rows.forEach((row) => {
            Object.keys(row.byWeek).forEach((week) => {
                const points = row.byWeek[week];
                if (!bestWeek || points > bestWeek.points) {
                    bestWeek = { points, week: Number(week), userId: row.userId };
                }
            });
        });
        return {
            members: rows.length,
            weeksCompleted: (weeks || []).filter(({ games }) => {
                const states = gameStates(games);
                return states.total > 0 && states.completed === states.total;
            }).length,
            highScore: rows.length > 0 ? rows[0].points : 0,
            averageScore: players.length > 0
                ? Math.round((players.reduce((sum, row) => sum + row.points, 0) / players.length) * 10) / 10
                : 0,
            bestWeek
        };
    }

    const ConfidenceScoring = Object.freeze({
        gameIds,
        isGameFinal,
        isGameLive,
        isTieGame,
        gameStates,
        scoreWeek,
        rankStandings,
        weekStandings,
        seasonStandings,
        seasonSummary
    });

    if (typeof window !== 'undefined') {
        window.ConfidenceScoring = ConfidenceScoring;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ConfidenceScoring;
    }
})();
