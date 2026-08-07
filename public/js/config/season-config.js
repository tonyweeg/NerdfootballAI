// Season configuration — single source of truth for season paths, week math, and labels.
// Spec: claudedocs/specs/2026-08-07-season-config-centralization-design.md (v2)
//
// LOAD ORDER (browser): season-data.js MUST load before this file.
// MIRROR: functions/seasonConfig.js carries identical builders — change both together
// (tests/season-config-drift.test.js enforces lockstep).
(function () {
    'use strict';

    let SEASON_DATA;
    if (typeof window !== 'undefined') {
        if (!window.SEASON_DATA) {
            throw new Error('SEASON_CONFIG: load ./js/config/season-data.js before season-config.js');
        }
        SEASON_DATA = window.SEASON_DATA;
    } else {
        SEASON_DATA = require('./season-data.js').SEASON_DATA;
    }

    // 2025 and earlier live in the legacy year-less tree; 2026+ lives under the pool doc (spec D1/D5).
    const LEGACY_FINAL_YEAR = 2025;
    const DAY_MS = 24 * 60 * 60 * 1000;
    const LEGACY_DATA_ROOT = 'artifacts/nerdfootball/public/data';

    const paths = {
        poolRoot: (year = SEASON_DATA.year) =>
            `artifacts/nerdfootball/pools/nerduniverse-${year}`,
        poolMembers: (year = SEASON_DATA.year) =>
            `${paths.poolRoot(year)}/metadata/members`,
        aiCache: (year = SEASON_DATA.year) =>
            `${paths.poolRoot(year)}/cache/latest-ai-intel-sheet`,
        gridCache: (week, year = SEASON_DATA.year) =>
            `${paths.poolRoot(year)}/cache/grid-week-${week}`,
        scoringUser: (userId, year = SEASON_DATA.year) =>
            `${paths.poolRoot(year)}/scoring-users/${userId}`,

        confidenceUser: (week, userId, year = SEASON_DATA.year) =>
            `${paths.poolRoot(year)}/confidence/${year}/weeks/${week}/users/${userId}`,
        survivorUser: (week, userId, year = SEASON_DATA.year) =>
            `${paths.poolRoot(year)}/survivor/${year}/weeks/${week}/users/${userId}`,
        scoresUser: (week, userId, year = SEASON_DATA.year) =>
            `${paths.poolRoot(year)}/scores/${year}/weeks/${week}/users/${userId}`,
        weeklyRollupUser: (week, userId, year = SEASON_DATA.year) =>
            `${paths.poolRoot(year)}/rollups/weekly/${year}/week_${week}/users/${userId}`,

        picks: (week, userId, year = SEASON_DATA.year) =>
            year <= LEGACY_FINAL_YEAR
                ? `${LEGACY_DATA_ROOT}/nerdfootball_picks/${week}/submissions/${userId}`
                : `${paths.poolRoot(year)}/data/nerdfootball_picks/${week}/submissions/${userId}`,
        picksWeek: (week, year = SEASON_DATA.year) =>
            year <= LEGACY_FINAL_YEAR
                ? `${LEGACY_DATA_ROOT}/nerdfootball_picks/${week}/submissions`
                : `${paths.poolRoot(year)}/data/nerdfootball_picks/${week}/submissions`,
        results: (week, year = SEASON_DATA.year) =>
            year <= LEGACY_FINAL_YEAR
                ? `${LEGACY_DATA_ROOT}/nerdfootball_results/${week}`
                : `${paths.poolRoot(year)}/data/nerdfootball_results/${week}`,
        games: (week, year = SEASON_DATA.year) =>
            year <= LEGACY_FINAL_YEAR
                ? `${LEGACY_DATA_ROOT}/nerdfootball_games/${week}`
                : `${paths.poolRoot(year)}/data/nerdfootball_games/${week}`,
        survivorPicks: (userId, year = SEASON_DATA.year) =>
            year <= LEGACY_FINAL_YEAR
                ? `${LEGACY_DATA_ROOT}/nerdSurvivor_picks/${userId}`
                : `${paths.poolRoot(year)}/data/nerdSurvivor_picks/${userId}`,
        survivorStatus: (year = SEASON_DATA.year) =>
            year <= LEGACY_FINAL_YEAR
                ? `${LEGACY_DATA_ROOT}/nerdSurvivor_status/status`
                : `${paths.poolRoot(year)}/data/nerdSurvivor_status/status`,

        espnCache: () => 'cache/espn_current_data'
    };

    const utils = {
        // Boundary: weeks flip at midnight UTC on the Thursday date (Wed 8:00 PM ET) —
        // identical to legacy weekManager.js:47-49. `now` is injectable for tests.
        getCurrentWeek: (now = new Date()) => {
            const anchor = new Date(SEASON_DATA.weekAnchor);
            if (now < anchor) return 1;
            const diffDays = Math.floor((now - anchor) / DAY_MS);
            return Math.min(SEASON_DATA.totalWeeks, Math.max(1, Math.floor(diffDays / 7) + 1));
        },
        // Coarse week-level check — NOT a substitute for per-game kickoff gating.
        hasWeekStarted: (week, now = new Date()) => {
            const anchor = new Date(SEASON_DATA.weekAnchor);
            return now >= new Date(anchor.getTime() + (week - 1) * 7 * DAY_MS);
        },
        isSeasonActive: (now = new Date()) =>
            now >= new Date(SEASON_DATA.kickoffDateTime) && now <= new Date(SEASON_DATA.seasonEndDate),
        getEspnScheduleUrl: (week) =>
            SEASON_DATA.espnScheduleUrlTemplate
                .replace('{WEEK}', week)
                .replace('{YEAR}', SEASON_DATA.year),
        getAllEspnScheduleUrls: () =>
            Array.from({ length: SEASON_DATA.totalWeeks }, (_, i) => utils.getEspnScheduleUrl(i + 1))
    };

    const format = {
        weekDisplay: (week = null) => `WEEK ${week ?? utils.getCurrentWeek()} • ${SEASON_DATA.year}`,
        seasonLabel: () => `${SEASON_DATA.year} NFL Season`,
        weekLabel: (week = null) => `Week ${week ?? utils.getCurrentWeek()}, ${SEASON_DATA.year}`,
        poolDisplay: () => SEASON_DATA.poolDisplayName,
        scheduleFilename: (week = null, year = SEASON_DATA.year) =>
            week === null ? `nfl_${year}_schedule_raw.json` : `nfl_${year}_week_${week}.json`
    };

    const SEASON_CONFIG = Object.freeze({ ...SEASON_DATA, paths, utils, format });

    if (typeof window !== 'undefined') {
        window.SEASON_CONFIG = SEASON_CONFIG;
        window.getSeasonConfig = () => SEASON_CONFIG;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { SEASON_CONFIG };
    }
})();
