// Season configuration for Firebase Functions (Node 20, CommonJS).
// Spec: claudedocs/specs/2026-08-07-season-config-centralization-design.md (v2)
//
// MIRROR: public/js/config/season-config.js carries an identical buildSeasonConfig —
// change both together (tests/season-config-drift.test.js enforces lockstep).
'use strict';

const SEASON_DATA = Object.freeze(require('./season-data.json'));

function buildSeasonConfig(SEASON_DATA) {
    if (!SEASON_DATA || typeof SEASON_DATA !== 'object') {
        throw new Error('SEASON_CONFIG: buildSeasonConfig requires a season data object');
    }
    // 2025 and earlier live in the legacy year-less tree; 2026+ lives under the
    // pool doc (spec D1/D5).
    const LEGACY_FINAL_YEAR = 2025;
    const DAY_MS = 24 * 60 * 60 * 1000;
    const LEGACY_DATA_ROOT = 'artifacts/nerdfootball/public/data';

    // A falsy or malformed year must fail loudly — silently defaulting would
    // route reads/writes to the wrong season's data tree.
    const resolveYear = (year) => {
        const y = year === undefined ? SEASON_DATA.year : Number(year);
        if (!Number.isInteger(y) || y < 2020 || y > 2100) {
            throw new Error(`SEASON_CONFIG: invalid year: ${year}`);
        }
        return y;
    };
    const reqUserId = (userId) => {
        if (typeof userId !== 'string' || userId === '' || userId.includes('/') ||
            userId === '.' || userId === '..' || /^__.*__$/.test(userId)) {
            throw new Error(`SEASON_CONFIG: invalid userId: ${userId}`);
        }
        return userId;
    };
    const timeOf = (now) => {
        const t = now instanceof Date ? now.getTime()
            : (typeof now === 'number' ? now : NaN);
        if (!Number.isFinite(t)) {
            throw new Error(`SEASON_CONFIG: invalid date: ${now}`);
        }
        return t;
    };
    const reqWeek = (week) => {
        const w = Number(week);
        if (!Number.isInteger(w) || w < 1 || w > SEASON_DATA.totalWeeks) {
            throw new Error(`SEASON_CONFIG: invalid week: ${week}`);
        }
        return w;
    };
    const dataRoot = (year) => {
        const y = resolveYear(year);
        return y <= LEGACY_FINAL_YEAR ? LEGACY_DATA_ROOT : `${paths.poolRoot(y)}/data`;
    };

    const paths = {
        poolRoot: (year) =>
            `artifacts/nerdfootball/pools/nerduniverse-${resolveYear(year)}`,
        poolMembers: (year) => `${paths.poolRoot(year)}/metadata/members`,
        aiCache: (year) => `${paths.poolRoot(year)}/cache/latest-ai-intel-sheet`,
        gridCache: (week, year) =>
            `${paths.poolRoot(year)}/cache/grid-week-${reqWeek(week)}`,
        scoringUser: (userId, year) =>
            `${paths.poolRoot(year)}/scoring-users/${reqUserId(userId)}`,

        confidenceUser: (week, userId, year) =>
            `${paths.poolRoot(year)}/confidence/${resolveYear(year)}/weeks/${reqWeek(week)}/users/${reqUserId(userId)}`,
        survivorUser: (week, userId, year) =>
            `${paths.poolRoot(year)}/survivor/${resolveYear(year)}/weeks/${reqWeek(week)}/users/${reqUserId(userId)}`,
        scoresUser: (week, userId, year) =>
            `${paths.poolRoot(year)}/scores/${resolveYear(year)}/weeks/${reqWeek(week)}/users/${reqUserId(userId)}`,
        weeklyRollupUser: (week, userId, year) =>
            `${paths.poolRoot(year)}/rollups/weekly/${resolveYear(year)}/week_${reqWeek(week)}/users/${reqUserId(userId)}`,
        survivorEliminations: (userId, year) =>
            `${paths.poolRoot(year)}/survivor/${resolveYear(year)}/eliminations/${reqUserId(userId)}`,
        survivorWeek: (week, year) =>
            `${paths.poolRoot(year)}/survivor/${resolveYear(year)}/weeks/${reqWeek(week)}`,
        // Shape mirrors espnScoreMonitor.js:242 exactly — no year segment, no weeks/ separator.
        scoringWeek: (week, year) =>
            `${paths.poolRoot(year)}/scoring/week${reqWeek(week)}`,
        survivorDisplayCache: (year) =>
            `${paths.poolRoot(year)}/cache/latest-survivor-display`,

        picks: (week, userId, year) =>
            `${dataRoot(year)}/nerdfootball_picks/${reqWeek(week)}/submissions/${reqUserId(userId)}`,
        picksWeek: (week, year) =>
            `${dataRoot(year)}/nerdfootball_picks/${reqWeek(week)}/submissions`,
        results: (week, year) =>
            `${dataRoot(year)}/nerdfootball_results/${reqWeek(week)}`,
        games: (week, year) =>
            `${dataRoot(year)}/nerdfootball_games/${reqWeek(week)}`,
        survivorPicks: (userId, year) =>
            `${dataRoot(year)}/nerdSurvivor_picks/${reqUserId(userId)}`,
        survivorStatus: (year) =>
            `${dataRoot(year)}/nerdSurvivor_status/status`,

        espnCache: () => 'cache/espn_current_data'
    };

    const utils = {
        // Boundary: weeks flip at midnight UTC on the Thursday date (Wed 8:00 PM
        // ET) — identical to legacy weekManager.js:47-49. `now` is injectable.
        getCurrentWeek: (now = new Date()) => {
            const t = timeOf(now);
            const anchor = new Date(SEASON_DATA.weekAnchor).getTime();
            if (t < anchor) return 1;
            const diffDays = Math.floor((t - anchor) / DAY_MS);
            return Math.min(SEASON_DATA.totalWeeks, Math.max(1, Math.floor(diffDays / 7) + 1));
        },
        // Week-window check (window opens at the weekly anchor boundary, not the
        // first kickoff) — NOT a substitute for per-game kickoff gating.
        hasWeekStarted: (week, now = new Date()) => {
            const w = reqWeek(week);
            const anchor = new Date(SEASON_DATA.weekAnchor).getTime();
            return timeOf(now) >= anchor + (w - 1) * 7 * DAY_MS;
        },
        // Derived from weekAnchor so it can never disagree with getCurrentWeek /
        // hasWeekStarted on opening day; kickoffDateTime stays display-only data.
        isSeasonActive: (now = new Date()) => {
            const t = timeOf(now);
            return t >= new Date(SEASON_DATA.weekAnchor).getTime()
                && t <= new Date(SEASON_DATA.seasonEndDate).getTime();
        },
        getEspnScheduleUrl: (week) =>
            SEASON_DATA.espnScheduleUrlTemplate
                .replace(/\{WEEK\}/g, reqWeek(week))
                .replace(/\{YEAR\}/g, SEASON_DATA.year),
        getAllEspnScheduleUrls: () =>
            Array.from({ length: SEASON_DATA.totalWeeks }, (_, i) => utils.getEspnScheduleUrl(i + 1))
    };

    const format = {
        weekDisplay: (week = null) => `WEEK ${week ?? utils.getCurrentWeek()} • ${SEASON_DATA.year}`,
        seasonLabel: () => `${SEASON_DATA.year} NFL Season`,
        weekLabel: (week = null) => `Week ${week ?? utils.getCurrentWeek()}, ${SEASON_DATA.year}`,
        poolDisplay: () => SEASON_DATA.poolDisplayName,
        scheduleFilename: (week = null, year) => {
            const y = resolveYear(year);
            return week === null ? `nfl_${y}_schedule_raw.json` : `nfl_${y}_week_${reqWeek(week)}.json`;
        }
    };

    return Object.freeze({
        ...SEASON_DATA,
        paths: Object.freeze(paths),
        utils: Object.freeze(utils),
        format: Object.freeze(format)
    });
}

const SEASON_CONFIG = buildSeasonConfig(SEASON_DATA);

module.exports = { SEASON_CONFIG, buildSeasonConfig };
