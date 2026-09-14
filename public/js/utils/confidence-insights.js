// Confidence pool insights for Tricked Out Ricky (NERD-39). Pure functions over one
// week's members, picks and games. Correctness, ties, final games, valid confidence
// and who counts as a player all come from ConfidenceScoring, so these numbers
// agree with every leaderboard.
(function () {
    'use strict';

    const Scoring = (typeof window !== 'undefined' && window.ConfidenceScoring)
        || (typeof require === 'function' ? require('./confidence-scoring.js') : null);

    const playerIds = (members) =>
        Object.keys(members || {}).filter((userId) => Scoring.isConfidencePlayer(members[userId]));

    const validConfidence = (value, games) =>
        Number.isInteger(value) && value >= 1 && value <= games;

    const madePick = (pick) => !!pick && typeof pick === 'object' && typeof pick.winner === 'string' && pick.winner !== '';

    // Every decided pick by a confidence player, with its confidence and result.
    function decidedPicks(members, picksByUser, games) {
        const ids = Scoring.gameIds(games);
        const out = [];
        playerIds(members).forEach((userId) => {
            const picks = (picksByUser || {})[userId];
            if (!picks) return;
            ids.forEach((gameId) => {
                const pick = picks[gameId];
                const game = games[gameId];
                if (!madePick(pick) || !Scoring.isGameFinal(game)) return;
                out.push({
                    userId,
                    gameId,
                    confidence: validConfidence(pick.confidence, ids.length) ? pick.confidence : null,
                    correct: Scoring.isTieGame(game) || game.winner === pick.winner
                });
            });
        });
        return out;
    }

    function weekSummary(members, picksByUser, games) {
        const rows = Scoring.weekStandings(members, picksByUser, games).filter((row) => row.hasPicks);
        const states = Scoring.gameStates(games);
        const correct = rows.reduce((sum, row) => sum + row.correct, 0);
        const decided = rows.reduce((sum, row) => sum + row.decided, 0);
        return {
            players: rows.length,
            gamesFinal: states.completed,
            gamesTotal: states.total,
            poolAccuracy: decided > 0 ? Math.round((correct / decided) * 1000) / 10 : null,
            averagePoints: rows.length > 0 ? Math.round((rows.reduce((sum, row) => sum + row.points, 0) / rows.length) * 10) / 10 : 0,
            highScore: rows.length > 0 ? rows[0].points : 0,
            perfect: rows.filter((row) => row.decided > 0 && row.correct === row.decided).length
        };
    }

    // Win rate at each confidence level 1..n that has at least one decided pick.
    function confidenceLevels(members, picksByUser, games) {
        const levels = {};
        decidedPicks(members, picksByUser, games).forEach(({ confidence, correct }) => {
            if (confidence === null) return;
            const level = levels[confidence] || (levels[confidence] = { level: confidence, wins: 0, total: 0 });
            level.total++;
            if (correct) level.wins++;
        });
        return Object.values(levels)
            .sort((a, b) => a.level - b.level)
            .map((level) => ({ ...level, winRate: Math.round((level.wins / level.total) * 1000) / 10 }));
    }

    // Low and high bands sized to the week: 5 of 16 levels on a full slate
    // (1–5 vs 12–16), scaled for shorter weeks.
    function confidenceBands(levels, gameCount) {
        const size = Math.max(1, Math.round((gameCount * 5) / 16));
        const band = (from, to) => {
            const inBand = levels.filter((l) => l.level >= from && l.level <= to);
            const wins = inBand.reduce((sum, l) => sum + l.wins, 0);
            const total = inBand.reduce((sum, l) => sum + l.total, 0);
            return { from, to, wins, total, winRate: total > 0 ? Math.round((wins / total) * 1000) / 10 : null };
        };
        return { low: band(1, size), high: band(gameCount - size + 1, gameCount) };
    }

    const SPREAD = [[0, 20], [21, 40], [41, 60], [61, 80], [81, 100]];

    // How many players land in each accuracy range (decided games only).
    function accuracySpread(members, picksByUser, games) {
        const counts = SPREAD.map(([from, to]) => ({ label: `${from}–${to}%`, from, to, players: 0 }));
        Scoring.weekStandings(members, picksByUser, games)
            .filter((row) => row.decided > 0)
            .forEach((row) => {
                const pct = Math.round((row.correct / row.decided) * 100);
                const bucket = counts.find((b) => pct >= b.from && pct <= b.to);
                bucket.players++;
            });
        return counts;
    }

    // Per game: how the pool split, the favourite, whether the favourite won, and the
    // average confidence riding on it. Sorted by average confidence, highest first.
    function gameAnalysis(members, picksByUser, games) {
        const ids = Scoring.gameIds(games);
        const players = playerIds(members);
        return ids.map((gameId) => {
            const game = games[gameId];
            let away = 0;
            let home = 0;
            let confidenceSum = 0;
            let confidenceCount = 0;
            players.forEach((userId) => {
                const pick = ((picksByUser || {})[userId] || {})[gameId];
                if (!madePick(pick)) return;
                if (pick.winner === game.a) away++;
                else if (pick.winner === game.h) home++;
                else return;
                if (validConfidence(pick.confidence, ids.length)) {
                    confidenceSum += pick.confidence;
                    confidenceCount++;
                }
            });
            const picks = away + home;
            const favourite = picks === 0 || away === home ? null : (away > home ? game.a : game.h);
            const final = Scoring.isGameFinal(game);
            const tie = Scoring.isTieGame(game);
            let result = 'pending';
            if (final && tie) result = 'tie';
            else if (final && favourite) result = game.winner === favourite ? 'favourite' : 'upset';
            else if (final) result = 'split';
            return {
                gameId,
                away: game.a,
                home: game.h,
                winner: final && !tie ? game.winner : null,
                final,
                tie,
                picks,
                awayShare: picks > 0 ? Math.round((away / picks) * 100) : null,
                homeShare: picks > 0 ? Math.round((home / picks) * 100) : null,
                favourite,
                result,
                averageConfidence: confidenceCount > 0 ? Math.round((confidenceSum / confidenceCount) * 10) / 10 : null
            };
        }).sort((a, b) => (b.averageConfidence || 0) - (a.averageConfidence || 0));
    }

    const ConfidenceInsights = Object.freeze({ weekSummary, confidenceLevels, confidenceBands, accuracySpread, gameAnalysis });

    if (typeof window !== 'undefined') window.ConfidenceInsights = ConfidenceInsights;
    if (typeof module !== 'undefined' && module.exports) module.exports = ConfidenceInsights;
})();
