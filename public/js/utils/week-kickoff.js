// Week kickoff (NERD-38): a week starts at its first game, read from that week's
// games doc — not from a fixed weekday.
//
// Game `dt` values are Eastern wall-clock time written with a bare "Z"
// ("2026-09-09T20:20:00Z" is 8:20 PM ET). The real instant applies the US Eastern
// offset for that date; display reads the stored parts, so it never shifts with
// the viewer's timezone.
(function () {
    'use strict';

    const DT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;
    const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'];

    const isRealTeam = (team) => typeof team === 'string' && team !== '' && team !== 'TBD';

    function nthSunday(year, monthIndex, n) {
        const firstDay = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
        return Date.UTC(year, monthIndex, 1 + ((7 - firstDay) % 7) + (n - 1) * 7);
    }

    // US rule since 2007: daylight time from the 2nd Sunday in March to the 1st Sunday
    // in November. Games never start between midnight and the 2 AM switch.
    function easternOffsetHours({ year, month, day }) {
        const date = Date.UTC(year, month - 1, day);
        return date >= nthSunday(year, 2, 2) && date < nthSunday(year, 10, 1) ? 4 : 5;
    }

    function parseEastern(dt) {
        const m = typeof dt === 'string' ? dt.match(DT) : null;
        if (!m) return null;
        const [year, month, day, hour, minute] = m.slice(1).map(Number);
        const eastern = { year, month, day, hour, minute };
        const at = new Date(Date.UTC(year, month - 1, day, hour + easternOffsetHours(eastern), minute));
        return Number.isNaN(at.getTime()) ? null : { eastern, at };
    }

    function firstKickoff(weekGames) {
        if (!weekGames || typeof weekGames !== 'object') return null;
        let first = null;
        Object.keys(weekGames).forEach((gameId) => {
            const game = weekGames[gameId];
            if (gameId.startsWith('_') || !game || typeof game !== 'object') return;
            if (!isRealTeam(game.a) || !isRealTeam(game.h)) return;
            const kickoff = parseEastern(game.dt);
            if (kickoff && (!first || kickoff.at < first.at)) first = { gameId, ...kickoff };
        });
        return first;
    }

    function hasKickedOff(weekGames, now = new Date()) {
        const first = firstKickoff(weekGames);
        return !!first && now.getTime() >= first.at.getTime();
    }

    function formatKickoff(kickoff) {
        if (!kickoff) return '';
        const { year, month, day, hour, minute } = kickoff.eastern;
        const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
        const hour12 = hour % 12 === 0 ? 12 : hour % 12;
        const time = `${hour12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
        return `${weekday}, ${MONTHS[month - 1]} ${day} at ${time} ET`;
    }

    const WeekKickoff = Object.freeze({ firstKickoff, hasKickedOff, formatKickoff });

    if (typeof window !== 'undefined') window.WeekKickoff = WeekKickoff;
    if (typeof module !== 'undefined' && module.exports) module.exports = WeekKickoff;
})();
