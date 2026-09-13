// Survivor board rules for The 36 Chambers (NERD-28/29). Pure functions, no DOM.
//
// Rows come from getsurvivorpooldata plus this week's picks, shaped as:
//   { name, isEliminated, currentWeekPick?, eliminatedBy?, eliminatedWeek? }
(function () {
    'use strict';

    const NO_PICK = 'NO_PICK_SUBMITTED';

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

    const SurvivorBoard = Object.freeze({ boardRows, pickPiles });

    if (typeof window !== 'undefined') window.SurvivorBoard = SurvivorBoard;
    if (typeof module !== 'undefined' && module.exports) module.exports = SurvivorBoard;
})();
