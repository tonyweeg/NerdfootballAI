// MNF tiebreaker (NERD-41): the Monday night total breaks ties for the top three
// places. Display only — nothing in this module is persisted, and it never
// touches the DOM or Firebase so it can be unit tested directly.
(function () {
    'use strict';

    // Game IDs are week-scoped and chronological (week * 100 + n), so the highest
    // ID in a week is its last kickoff — the Monday nighter, or in a doubleheader
    // week, the nightcap.
    function mnfGameId(gameIds) {
        if (!Array.isArray(gameIds)) return null;
        let best = null;
        let bestNum = -Infinity;
        for (const id of gameIds) {
            const n = parseInt(id, 10);
            if (!Number.isFinite(n)) continue;
            if (n > bestNum) { bestNum = n; best = String(id); }
        }
        return best;
    }

    // Total points in the MNF game, or null while it is unplayed or unscored.
    // `isFinal` is injected by the caller — the page passes its own
    // isGameCompleted so this module cannot drift from the page's definition.
    function mnfActualTotal(bibleData, gameIds, isFinal) {
        const id = mnfGameId(gameIds);
        if (!id || !bibleData) return null;
        const game = bibleData[id];
        if (typeof isFinal !== 'function' || !isFinal(game)) return null;
        const away = Number(game.awayScore);
        const home = Number(game.homeScore);
        if (!Number.isFinite(away) || !Number.isFinite(home)) return null;
        return away + home;
    }

    function byName(a, b) {
        return String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase());
    }

    // A guess of 0 is a real guess; null, undefined and '' are not, and Number()
    // turns all three into 0, so they have to be screened out before coercion.
    function guessOf(player) {
        const raw = player.mnfGuess;
        if (raw === null || raw === undefined || raw === '') return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
    }

    // Closest without going over. At or under the actual total beats over it;
    // within a side the smaller miss wins; no guess ranks last; identical
    // guesses fall back to name, which is how this page has always broken ties.
    function compareByMnf(a, b, actual) {
        const ga = guessOf(a);
        const gb = guessOf(b);
        if (ga === null && gb === null) return byName(a, b);
        if (ga === null) return 1;
        if (gb === null) return -1;

        const aOver = ga > actual;
        const bOver = gb > actual;
        if (aOver !== bOver) return aOver ? 1 : -1;

        const da = Math.abs(actual - ga);
        const db = Math.abs(actual - gb);
        if (da !== db) return da - db;
        return byName(a, b);
    }

    function label(place, shared) {
        if (place === 1) return '🥇';
        if (place === 2) return '🥈';
        if (place === 3) return '🥉';
        return shared ? 'T' + place : String(place);
    }

    // Sets `place` on every player, and reorders tied top-three groups so the
    // tiebreak winner sorts first. `players` must already be sorted by score,
    // highest first. `actual` of null/undefined means the MNF game has not
    // finished — groups then share a place, which is this page's old behavior.
    function assignPlaces(players, actual) {
        if (!Array.isArray(players)) return players;
        const known = actual !== null && actual !== undefined;

        let i = 0;
        while (i < players.length) {
            let j = i;
            while (j + 1 < players.length && players[j + 1].score === players[i].score) j++;

            const basePlace = i + 1;
            const size = j - i + 1;

            if (size > 1 && basePlace <= 3 && known) {
                const group = players.slice(i, j + 1).sort((a, b) => compareByMnf(a, b, actual));
                group.forEach((player, k) => {
                    player.place = label(basePlace + k, false);
                    players[i + k] = player;
                });
            } else {
                for (let k = i; k <= j; k++) {
                    players[k].place = label(basePlace, size > 1);
                }
            }
            i = j + 1;
        }
        return players;
    }

    const MnfTiebreak = Object.freeze({ mnfGameId, mnfActualTotal, compareByMnf, assignPlaces });

    if (typeof window !== 'undefined') window.MnfTiebreak = MnfTiebreak;
    if (typeof module !== 'undefined' && module.exports) module.exports = MnfTiebreak;
})();
