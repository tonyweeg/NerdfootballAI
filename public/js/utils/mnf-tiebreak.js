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

    const MnfTiebreak = Object.freeze({ mnfGameId });

    if (typeof window !== 'undefined') window.MnfTiebreak = MnfTiebreak;
    if (typeof module !== 'undefined' && module.exports) module.exports = MnfTiebreak;
})();
