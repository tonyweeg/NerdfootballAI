// Confidence pool insights for Space Nerd Stats (NERD-39, NERD-40). Pure functions
// over one week's members, picks and games. Correctness, ties, final games, valid
// confidence and who counts as a player all come from ConfidenceScoring, so these
// numbers agree with every leaderboard.
//
// Pick security (CLAUDE.md: picks are shown only after games start): anything that
// reveals which team people picked is limited to started games — final, live, or
// past kickoff. Counts of confidence still riding stay whole-week, as on Upside View.
(function () {
    'use strict';

    const Scoring = (typeof window !== 'undefined' && window.ConfidenceScoring)
        || (typeof require === 'function' ? require('./confidence-scoring.js') : null);
    const Kickoff = (typeof window !== 'undefined' && window.WeekKickoff)
        || (typeof require === 'function' ? require('./week-kickoff.js') : null);

    const round1 = (value) => Math.round(value * 10) / 10;

    const playerIds = (members) =>
        Object.keys(members || {}).filter((userId) => Scoring.isConfidencePlayer(members[userId]));

    const validConfidence = (value, games) =>
        Number.isInteger(value) && value >= 1 && value <= games;

    const madePick = (pick) => !!pick && typeof pick === 'object' && typeof pick.winner === 'string' && pick.winner !== '';

    const pickOf = (picksByUser, userId, gameId) => ((picksByUser || {})[userId] || {})[gameId];

    function hasStarted(game, now) {
        if (Scoring.isGameFinal(game) || Scoring.isGameLive(game)) return true;
        const kickoff = Kickoff.gameKickoff(game);
        return !!kickoff && now.getTime() >= kickoff.at.getTime();
    }

    // Started games in kickoff order (game id breaks ties and orders games without a time).
    function startedGameIds(games, now = new Date()) {
        const kickoffTime = (id) => {
            const kickoff = Kickoff.gameKickoff(games[id]);
            return kickoff ? kickoff.at.getTime() : Infinity;
        };
        return Scoring.gameIds(games)
            .filter((id) => hasStarted(games[id], now))
            .sort((a, b) => (kickoffTime(a) - kickoffTime(b)) || a.localeCompare(b, undefined, { numeric: true }));
    }

    const finalGameIds = (games, now) => startedGameIds(games, now).filter((id) => Scoring.isGameFinal(games[id]));

    // Every decided pick by a confidence player, with its confidence and result.
    function decidedPicks(members, picksByUser, games) {
        const ids = Scoring.gameIds(games);
        const out = [];
        playerIds(members).forEach((userId) => {
            ids.forEach((gameId) => {
                const pick = pickOf(picksByUser, userId, gameId);
                const game = games[gameId];
                if (!madePick(pick) || !Scoring.isGameFinal(game)) return;
                out.push({
                    userId,
                    gameId,
                    team: pick.winner,
                    confidence: validConfidence(pick.confidence, ids.length) ? pick.confidence : null,
                    correct: Scoring.isTieGame(game) || game.winner === pick.winner
                });
            });
        });
        return out;
    }

    // Players with picks, ranked by points, with confidence still riding on unfinished games.
    function standings(members, picksByUser, games) {
        return Scoring.weekStandings(members, picksByUser, games)
            .filter((row) => row.hasPicks)
            .map((row) => {
                const upside = Scoring.upsideWeek((picksByUser || {})[row.userId], games);
                return { ...row, pointsLeft: upside.pointsLeft, maxPossible: upside.maxPossible };
            });
    }

    function weekSummary(members, picksByUser, games) {
        const rows = standings(members, picksByUser, games);
        const states = Scoring.gameStates(games);
        const correct = rows.reduce((sum, row) => sum + row.correct, 0);
        const decided = rows.reduce((sum, row) => sum + row.decided, 0);
        return {
            players: rows.length,
            gamesFinal: states.completed,
            gamesTotal: states.total,
            poolAccuracy: decided > 0 ? round1((correct / decided) * 100) : null,
            averagePoints: rows.length > 0 ? round1(rows.reduce((sum, row) => sum + row.points, 0) / rows.length) : 0,
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
            .map((level) => ({ ...level, winRate: round1((level.wins / level.total) * 100) }));
    }

    // Low and high bands sized to the week: 5 of 16 levels on a full slate
    // (1–5 vs 12–16), scaled for shorter weeks.
    function confidenceBands(levels, gameCount) {
        const size = Math.max(1, Math.round((gameCount * 5) / 16));
        const band = (from, to) => {
            const inBand = levels.filter((l) => l.level >= from && l.level <= to);
            const wins = inBand.reduce((sum, l) => sum + l.wins, 0);
            const total = inBand.reduce((sum, l) => sum + l.total, 0);
            return { from, to, wins, total, winRate: total > 0 ? round1((wins / total) * 100) : null };
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
                counts.find((b) => pct >= b.from && pct <= b.to).players++;
            });
        return counts;
    }

    // How the pool split on one started game.
    function splitOf(members, picksByUser, games, gameId) {
        const game = games[gameId];
        const gameCount = Scoring.gameIds(games).length;
        let away = 0;
        let home = 0;
        let confidenceSum = 0;
        let confidenceCount = 0;
        playerIds(members).forEach((userId) => {
            const pick = pickOf(picksByUser, userId, gameId);
            if (!madePick(pick)) return;
            if (pick.winner === game.a) away++;
            else if (pick.winner === game.h) home++;
            else return;
            if (validConfidence(pick.confidence, gameCount)) {
                confidenceSum += pick.confidence;
                confidenceCount++;
            }
        });
        const picks = away + home;
        return {
            away,
            home,
            picks,
            favourite: picks === 0 || away === home ? null : (away > home ? game.a : game.h),
            averageConfidence: confidenceCount > 0 ? round1(confidenceSum / confidenceCount) : null
        };
    }

    // Per game: how the pool split, the favourite, whether the favourite won, and the
    // average confidence riding on it. Games that have not started are locked.
    // Sorted by average confidence, highest first; locked games last in id order.
    function gameAnalysis(members, picksByUser, games, now = new Date()) {
        const started = new Set(startedGameIds(games, now));
        return Scoring.gameIds(games).map((gameId) => {
            const game = games[gameId];
            const base = { gameId, away: game.a, home: game.h, final: Scoring.isGameFinal(game), tie: Scoring.isTieGame(game) };
            if (!started.has(gameId)) {
                return { ...base, locked: true, winner: null, picks: null, awayShare: null, homeShare: null, favourite: null, result: 'locked', averageConfidence: null };
            }
            const split = splitOf(members, picksByUser, games, gameId);
            let result = 'pending';
            if (base.final && base.tie) result = 'tie';
            else if (base.final && split.favourite) result = game.winner === split.favourite ? 'favourite' : 'upset';
            else if (base.final) result = 'split';
            return {
                ...base,
                locked: false,
                winner: base.final && !base.tie ? game.winner : null,
                picks: split.picks,
                awayShare: split.picks > 0 ? Math.round((split.away / split.picks) * 100) : null,
                homeShare: split.picks > 0 ? Math.round((split.home / split.picks) * 100) : null,
                favourite: split.favourite,
                result,
                averageConfidence: split.averageConfidence
            };
        }).sort((a, b) => (a.locked - b.locked)
            || ((b.averageConfidence || 0) - (a.averageConfidence || 0))
            || a.gameId.localeCompare(b.gameId, undefined, { numeric: true }));
    }

    // Confidence points the pool lost on each final game (ties cost nothing).
    function upsetCost(members, picksByUser, games) {
        const byGame = {};
        decidedPicks(members, picksByUser, games).forEach(({ gameId, confidence, correct }) => {
            const row = byGame[gameId] || (byGame[gameId] = { gameId, away: games[gameId].a, home: games[gameId].h, winner: games[gameId].winner, lost: 0, missed: 0, picks: 0 });
            row.picks++;
            if (!correct) {
                row.missed++;
                row.lost += confidence || 0;
            }
        });
        return Object.values(byGame)
            .sort((a, b) => (b.lost - a.lost) || a.gameId.localeCompare(b.gameId, undefined, { numeric: true }));
    }

    // Cumulative points of the top players through the finished games, in kickoff order.
    function scoringRace(members, picksByUser, games, { top = 5, now = new Date() } = {}) {
        const finals = finalGameIds(games, now);
        const gameCount = Scoring.gameIds(games).length;
        const leaders = standings(members, picksByUser, games).slice(0, top);
        return {
            games: finals.map((gameId) => ({ gameId, away: games[gameId].a, home: games[gameId].h })),
            series: leaders.map((row) => {
                let total = 0;
                return {
                    userId: row.userId,
                    name: row.name,
                    points: finals.map((gameId) => {
                        const pick = pickOf(picksByUser, row.userId, gameId);
                        const game = games[gameId];
                        if (madePick(pick) && validConfidence(pick.confidence, gameCount)
                            && (Scoring.isTieGame(game) || game.winner === pick.winner)) {
                            total += pick.confidence;
                        }
                        return total;
                    })
                };
            })
        };
    }

    // How often each player sided with the pool's favourite on started games, against
    // what they scored. Games the pool split evenly are left out.
    function consensus(members, picksByUser, games, now = new Date()) {
        const favourites = {};
        startedGameIds(games, now).forEach((gameId) => {
            const { favourite } = splitOf(members, picksByUser, games, gameId);
            if (favourite) favourites[gameId] = favourite;
        });
        return standings(members, picksByUser, games)
            .map((row) => {
                let agreed = 0;
                let picks = 0;
                Object.keys(favourites).forEach((gameId) => {
                    const pick = pickOf(picksByUser, row.userId, gameId);
                    if (!madePick(pick)) return;
                    picks++;
                    if (pick.winner === favourites[gameId]) agreed++;
                });
                return { userId: row.userId, name: row.name, points: row.points, picks, agreement: picks > 0 ? Math.round((agreed / picks) * 100) : null };
            })
            .filter((row) => row.picks > 0);
    }

    // Players (by points) × started games (by kickoff): what they picked and how it went.
    function pickMatrix(members, picksByUser, games, now = new Date()) {
        const columns = startedGameIds(games, now);
        const gameCount = Scoring.gameIds(games).length;
        return {
            games: columns.map((gameId) => ({ gameId, away: games[gameId].a, home: games[gameId].h, final: Scoring.isGameFinal(games[gameId]) })),
            rows: standings(members, picksByUser, games).map((row) => ({
                userId: row.userId,
                name: row.name,
                points: row.points,
                cells: columns.map((gameId) => {
                    const pick = pickOf(picksByUser, row.userId, gameId);
                    if (!madePick(pick)) return { state: 'none' };
                    const game = games[gameId];
                    const confidence = validConfidence(pick.confidence, gameCount) ? pick.confidence : null;
                    let state = 'pending';
                    if (Scoring.isGameFinal(game)) state = Scoring.isTieGame(game) || game.winner === pick.winner ? 'correct' : 'wrong';
                    return { state, team: pick.winner, confidence };
                })
            }))
        };
    }

    // The week in four headlines. Each is null when there is nothing to report yet.
    function nerdFacts(members, picksByUser, games, now = new Date()) {
        const analysis = gameAnalysis(members, picksByUser, games, now);
        const upsets = analysis.filter((g) => g.result === 'upset');
        const winnerShare = (g) => (g.winner === g.away ? g.awayShare : g.homeShare);
        const biggest = upsets.sort((a, b) => winnerShare(a) - winnerShare(b))[0];

        const costliest = upsetCost(members, picksByUser, games).find((g) => g.lost > 0);

        const misses = decidedPicks(members, picksByUser, games).filter((p) => !p.correct && p.confidence !== null);
        const top = misses.reduce((max, p) => Math.max(max, p.confidence), 0);
        const boldest = misses.filter((p) => p.confidence === top);

        const rows = consensus(members, picksByUser, games, now).sort((a, b) => b.points - a.points);
        const topHalf = rows.slice(0, Math.max(1, Math.ceil(rows.length / 2)));
        const contrarian = topHalf.length > 0
            ? topHalf.reduce((best, row) => (row.agreement < best.agreement ? row : best))
            : null;

        return {
            biggestUpset: biggest ? { gameId: biggest.gameId, winner: biggest.winner, loser: biggest.winner === biggest.away ? biggest.home : biggest.away, winnerShare: winnerShare(biggest) } : null,
            costliestGame: costliest ? { gameId: costliest.gameId, away: costliest.away, home: costliest.home, lost: costliest.lost, missed: costliest.missed } : null,
            boldestMiss: boldest.length > 0 ? { confidence: top, players: new Set(boldest.map((p) => p.userId)).size, gameId: boldest[0].gameId, team: boldest[0].team } : null,
            contrarian: contrarian ? { userId: contrarian.userId, name: contrarian.name, agreement: contrarian.agreement, points: contrarian.points } : null
        };
    }

    const ConfidenceInsights = Object.freeze({
        startedGameIds, standings, weekSummary, confidenceLevels, confidenceBands, accuracySpread,
        gameAnalysis, upsetCost, scoringRace, consensus, pickMatrix, nerdFacts
    });

    if (typeof window !== 'undefined') window.ConfidenceInsights = ConfidenceInsights;
    if (typeof module !== 'undefined' && module.exports) module.exports = ConfidenceInsights;
})();
