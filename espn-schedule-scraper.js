#!/usr/bin/env node

/**
 * ESPN NFL Schedule Scraper (spec D4)
 *
 * Fetches a full 18-week NFL regular season from ESPN's JSON scoreboard API,
 * derives season-level config (weekAnchor/kickoffDateTime/seasonEndDate) from
 * the actual game data, validates everything (asserts A0-A10), and — only if
 * every assert passes — writes:
 *   - public/js/config/season-data.js
 *   - functions/season-data.json
 *   - public/game-data/nfl_{year}_week_{n}.json (weeks 1-18)
 *   - public/nfl_{year}_schedule_raw.json
 *
 * All-or-nothing: fetches and validates ALL 18 weeks in memory first, then
 * writes all outputs. Any failure prints the specific assert and writes
 * nothing. There is no sample-data fallback.
 *
 * Usage:
 *   node espn-schedule-scraper.js --year=2026 [--dry-run] [--week=N]
 *
 *   --year=YYYY   REQUIRED. Integer 2020-2100. No default — an accidental
 *                 bare run must not scrape an unintended season.
 *   --dry-run     Fetch + parse + validate + print the summary; write nothing.
 *   --week=N      Fetch a single week for debugging; prints parsed games;
 *                 never writes.
 */

'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Team name mappings (carried over verbatim from the old scraper — correct)
// ---------------------------------------------------------------------------

const TEAM_MAPPINGS = {
    'Arizona': 'Arizona Cardinals',
    'Atlanta': 'Atlanta Falcons',
    'Baltimore': 'Baltimore Ravens',
    'Buffalo': 'Buffalo Bills',
    'Carolina': 'Carolina Panthers',
    'Chicago': 'Chicago Bears',
    'Cincinnati': 'Cincinnati Bengals',
    'Cleveland': 'Cleveland Browns',
    'Dallas': 'Dallas Cowboys',
    'Denver': 'Denver Broncos',
    'Detroit': 'Detroit Lions',
    'Green Bay': 'Green Bay Packers',
    'Houston': 'Houston Texans',
    'Indianapolis': 'Indianapolis Colts',
    'Jacksonville': 'Jacksonville Jaguars',
    'Kansas City': 'Kansas City Chiefs',
    'Las Vegas': 'Las Vegas Raiders',
    'LA Chargers': 'Los Angeles Chargers',
    'LA Rams': 'Los Angeles Rams',
    'Miami': 'Miami Dolphins',
    'Minnesota': 'Minnesota Vikings',
    'New England': 'New England Patriots',
    'New Orleans': 'New Orleans Saints',
    'NY Giants': 'New York Giants',
    'NY Jets': 'New York Jets',
    'Philadelphia': 'Philadelphia Eagles',
    'Pittsburgh': 'Pittsburgh Steelers',
    'San Francisco': 'San Francisco 49ers',
    'Seattle': 'Seattle Seahawks',
    'Tampa Bay': 'Tampa Bay Buccaneers',
    'Tennessee': 'Tennessee Titans',
    'Washington': 'Washington Commanders'
};

// ---------------------------------------------------------------------------
// Timezone conversion (the critical correctness rule)
// ---------------------------------------------------------------------------
// ESPN's scoreboard `date` field is TRUE UTC. Our storage convention is
// explicit-offset Eastern ISO. EDT = UTC-4 from the second Sunday of March
// through the first Sunday of November; EST = UTC-5 otherwise. Boundary
// Sundays are computed at 07:00 UTC (~2:00 AM local transition) — no NFL
// game occurs within the ambiguous hour, so this is exact enough.

/** Nth (1-based) Sunday of a given UTC month (0-indexed month). */
function nthSundayOfMonth(year, month, n) {
    const first = new Date(Date.UTC(year, month, 1));
    const dow = first.getUTCDay(); // 0 = Sunday
    const firstSunday = dow === 0 ? 1 : 8 - dow;
    return firstSunday + (n - 1) * 7;
}

/** Returns the Eastern UTC offset in hours (-4 or -5) for a given UTC Date. */
function easternOffsetFor(utcDate) {
    const year = utcDate.getUTCFullYear();
    const marchSecondSunday = nthSundayOfMonth(year, 2, 2); // March, 2nd Sunday
    const novemberFirstSunday = nthSundayOfMonth(year, 10, 1); // November, 1st Sunday
    const dstStart = new Date(Date.UTC(year, 2, marchSecondSunday, 7, 0, 0));
    const dstEnd = new Date(Date.UTC(year, 10, novemberFirstSunday, 7, 0, 0));
    return utcDate >= dstStart && utcDate < dstEnd ? -4 : -5;
}

const pad2 = (n) => String(n).padStart(2, '0');

/** Converts a true-UTC ISO string to explicit-offset Eastern ISO. */
function toEasternISO(utcISO) {
    const utcDate = new Date(utcISO);
    if (isNaN(utcDate.getTime())) {
        throw new Error(`toEasternISO: invalid UTC ISO string: ${utcISO}`);
    }
    const offsetHours = easternOffsetFor(utcDate);
    const shifted = new Date(utcDate.getTime() + offsetHours * 60 * 60 * 1000);
    const y = shifted.getUTCFullYear();
    const mo = pad2(shifted.getUTCMonth() + 1);
    const da = pad2(shifted.getUTCDate());
    const h = pad2(shifted.getUTCHours());
    const mi = pad2(shifted.getUTCMinutes());
    const s = pad2(shifted.getUTCSeconds());
    const offsetStr = offsetHours === -4 ? '-04:00' : '-05:00';
    return `${y}-${mo}-${da}T${h}:${mi}:${s}${offsetStr}`;
}

/**
 * ⚠️⚠️⚠️  LEGACY CONVENTION — REQUIRED. DO NOT "FIX" THIS.  ⚠️⚠️⚠️
 * ---------------------------------------------------------------------------
 * Converts an explicit-offset Eastern ISO string (as produced by toEasternISO
 * above, e.g. "2025-09-04T20:20:00-04:00") into the LEGACY bare-Z-meaning-
 * Eastern format used ONLY by game-data / raw-schedule JSON outputs: the
 * IDENTICAL Eastern wall-clock digits, but with a literal 'Z' suffix in
 * place of the real offset (e.g. "2025-09-04T20:20:00Z" — despite the
 * trailing 'Z', this is NOT UTC).
 *
 * This convention is REQUIRED by the live consumer
 * public/easternTimeParser-v2.js: hasGameStarted() / formatGameTime() /
 * getTimeUntilGameStart() all unconditionally `.replace('Z', '')` and then
 * subtract a fixed 4 hours to recover Eastern time. Feeding that parser
 * proper explicit-offset ISO (what this scraper produced before the
 * 2026-08-08 spec review) makes it apply its fixed correction on top of an
 * ALREADY-correct value ("double correction"), shifting every computed
 * pick-lock / game-start time by 3-4 hours for non-Eastern viewers.
 *
 * DO NOT change this to real UTC or to explicit-offset ISO without first
 * updating every consumer of easternTimeParser-v2.js in lockstep. See
 * claudedocs/plans/2026-08-08-season-config-scraper-rework.md ("Outputs"
 * item 3) and the 2026-08-08 spec review that mandated this correction.
 *
 * season-data.js's kickoffDateTime / seasonEndDate are a DIFFERENT consumer
 * path (season-config.js, not easternTimeParser-v2.js) and correctly KEEP
 * explicit-offset ISO — never apply this function to those.
 */
function toLegacyBareZEastern(easternOffsetISO) {
    return easternOffsetISO.replace(/[+-]\d{2}:\d{2}$/, 'Z');
}

// ---------------------------------------------------------------------------
// ESPN fetch + parse
// ---------------------------------------------------------------------------

const ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

/**
 * Fetches one week's scoreboard JSON from ESPN.
 * Param contract (empirically verified 2026-08-08): `dates={year}` is the
 * real season selector; `year={year}` is silently IGNORED by this endpoint.
 * User-Agent (empirically verified 2026-08-08): this endpoint's edge
 * protection returns 403 for Node's default (blank) UA and for realistic
 * browser UA strings, but 200 for a plain curl UA — reproduced consistently
 * across repeated trials. Not a spoof of a specific browser/version, just
 * the one client signature this public endpoint currently accepts.
 */
function fetchWeekScoreboard(week, year) {
    return new Promise((resolve, reject) => {
        const url = `${ESPN_SCOREBOARD_URL}?week=${week}&dates=${year}&seasontype=2&limit=100`;
        https.get(url, { headers: { 'User-Agent': 'curl/8.7.1' } }, (res) => {
            if (res.statusCode !== 200) {
                res.resume();
                reject(new Error(`fetchWeekScoreboard: week ${week}: HTTP ${res.statusCode} for ${url}`));
                return;
            }
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`fetchWeekScoreboard: week ${week}: invalid JSON response: ${e.message}`));
                }
            });
        }).on('error', (err) => {
            reject(new Error(`fetchWeekScoreboard: week ${week}: request failed: ${err.message}`));
        });
    });
}

/**
 * Parses one week's ESPN scoreboard JSON into { week, games: [{id,a,h,dt,stadium}] }.
 * `requestedYear` is required so callers can enforce A0 (season.year lockstep)
 * without re-parsing; parseScoreboard itself throws loudly on structural
 * problems (missing events, missing competitors, unparseable dates) since
 * there is no fallback data.
 */
function parseScoreboard(json, week) {
    if (!json || !Array.isArray(json.events)) {
        throw new Error(`parseScoreboard: week ${week}: response has no events array`);
    }
    const games = json.events.map((event, index) => {
        const competition = event.competitions && event.competitions[0];
        if (!competition) {
            throw new Error(`parseScoreboard: week ${week}: event ${event.id} has no competitions[0]`);
        }
        const competitors = competition.competitors || [];
        const home = competitors.find((c) => c.homeAway === 'home');
        const away = competitors.find((c) => c.homeAway === 'away');
        if (!home || !away) {
            throw new Error(`parseScoreboard: week ${week}: event ${event.id} missing home/away competitor`);
        }
        const homeNameRaw = home.team && home.team.displayName;
        const awayNameRaw = away.team && away.team.displayName;
        if (!homeNameRaw || !awayNameRaw) {
            throw new Error(`parseScoreboard: week ${week}: event ${event.id} missing team.displayName`);
        }
        if (!event.date) {
            throw new Error(`parseScoreboard: week ${week}: event ${event.id} missing date`);
        }
        const homeName = TEAM_MAPPINGS[homeNameRaw] || homeNameRaw;
        const awayName = TEAM_MAPPINGS[awayNameRaw] || awayNameRaw;
        const stadium = (competition.venue && competition.venue.fullName) || '';
        const dt = toEasternISO(event.date);
        const id = week * 100 + index + 1;
        return { id, a: awayName, h: homeName, dt, stadium };
    });
    return { week, games };
}

// ---------------------------------------------------------------------------
// Season data derivation
// ---------------------------------------------------------------------------

const ESPN_SCHEDULE_URL_TEMPLATE = 'https://www.espn.com/nfl/schedule/_/week/{WEEK}/year/{YEAR}/seasontype/2';

/**
 * Derives season-level config from the full set of parsed weeks.
 * weekAnchor = the Eastern CALENDAR DATE of the first week-1 game (never the
 * UTC date — that is off by one for every night game, since a Thursday
 * 8:20 PM ET kickoff is already past midnight UTC).
 */
function deriveSeasonData(year, allWeeksGames) {
    const week1 = allWeeksGames.find((w) => w.week === 1);
    if (!week1 || !week1.games || week1.games.length === 0) {
        throw new Error('deriveSeasonData: week 1 has no games');
    }
    const week18 = allWeeksGames.find((w) => w.week === 18);
    if (!week18 || !week18.games || week18.games.length === 0) {
        throw new Error('deriveSeasonData: week 18 has no games');
    }

    const firstGame = [...week1.games].sort((a, b) => new Date(a.dt) - new Date(b.dt))[0];
    const kickoffDateTime = firstGame.dt;
    const weekAnchor = kickoffDateTime.slice(0, 10); // YYYY-MM-DD (Eastern calendar date)

    const lastGame = [...week18.games].sort((a, b) => new Date(b.dt) - new Date(a.dt))[0];
    const [datePart] = lastGame.dt.split('T');
    const [ly, lmo, lda] = datePart.split('-').map(Number);
    const plusOneDay = new Date(Date.UTC(ly, lmo - 1, lda + 1)); // JS normalizes month/day overflow
    const endOffset = easternOffsetFor(new Date(Date.UTC(
        plusOneDay.getUTCFullYear(), plusOneDay.getUTCMonth(), plusOneDay.getUTCDate(), 17, 0, 0
    ))); // ~noon Eastern on the end date, just to pick the correct DST bucket
    const endOffsetStr = endOffset === -4 ? '-04:00' : '-05:00';
    const seasonEndDate =
        `${plusOneDay.getUTCFullYear()}-${pad2(plusOneDay.getUTCMonth() + 1)}-${pad2(plusOneDay.getUTCDate())}` +
        `T23:59:59${endOffsetStr}`;

    return {
        year,
        weekAnchor,
        kickoffDateTime,
        seasonEndDate,
        totalWeeks: 18,
        poolId: `nerduniverse-${year}`,
        poolDisplayName: `Nerd Universe ${year}`,
        espnScheduleUrlTemplate: ESPN_SCHEDULE_URL_TEMPLATE
    };
}

// ---------------------------------------------------------------------------
// Validation (A0-A10)
// ---------------------------------------------------------------------------

/**
 * Runs every validation assert against the fetched season. Returns
 * { pass, results: [{id, pass, message}], warnings: [string] }.
 * A10 unmapped-team-name is a warning, never a failure, per spec.
 */
function validateSeason(year, allWeeksGames, seasonData, responseSeasonYears) {
    const results = [];
    const warnings = [];
    const record = (id, pass, message) => results.push({ id, pass, message });

    // A0: response season.year === requested year for every fetched week
    if (responseSeasonYears && responseSeasonYears.length > 0) {
        const mismatches = responseSeasonYears.filter((r) => r.seasonYear !== year);
        if (mismatches.length === 0) {
            record('A0', true, `every fetched week's response season.year === ${year}`);
        } else {
            for (const m of mismatches) {
                record('A0', false, `week ${m.week}: response season.year=${m.seasonYear}, expected ${year} (dates= param not honored?)`);
            }
        }
    }

    // A1: every week 1..18 fetched and parsed; no week empty
    let a1 = true;
    for (let w = 1; w <= 18; w++) {
        const wk = allWeeksGames.find((x) => x.week === w);
        if (!wk || !wk.games || wk.games.length === 0) {
            a1 = false;
            record('A1', false, `week ${w} missing or empty`);
        }
    }
    if (a1) record('A1', true, 'every week 1..18 fetched and parsed; none empty');

    // A2: per-week game count in 13..16; total === 272
    let a2 = true;
    let total = 0;
    for (const wk of allWeeksGames) {
        total += wk.games.length;
        if (wk.games.length < 13 || wk.games.length > 16) {
            a2 = false;
            record('A2', false, `week ${wk.week} has ${wk.games.length} games (expected 13-16)`);
        }
    }
    if (total !== 272) {
        a2 = false;
        record('A2', false, `total games ${total} !== 272`);
    }
    if (a2) record('A2', true, `all weeks in 13-16 games; total = ${total}`);

    // A3: every game has id, both teams, valid parseable date; home != away
    let a3 = true;
    for (const wk of allWeeksGames) {
        for (const g of wk.games) {
            if (!g.id || !g.a || !g.h || !g.dt || isNaN(new Date(g.dt).getTime())) {
                a3 = false;
                record('A3', false, `week ${wk.week} game ${JSON.stringify(g)}: missing required field or unparseable date`);
            } else if (g.a === g.h) {
                a3 = false;
                record('A3', false, `week ${wk.week} game ${g.id}: home === away (${g.h})`);
            }
        }
    }
    if (a3) record('A3', true, 'every game has id/teams/valid date; home != away');

    // A4: weekAnchor falls on a Thursday (Eastern)
    const anchorNoonUTC = new Date(`${seasonData.weekAnchor}T12:00:00Z`);
    const dow = anchorNoonUTC.getUTCDay(); // 4 = Thursday
    if (dow === 4) {
        record('A4', true, `weekAnchor ${seasonData.weekAnchor} is a Thursday`);
    } else {
        record('A4', false, `weekAnchor ${seasonData.weekAnchor} is NOT a Thursday (getUTCDay=${dow})`);
    }

    // A5: kickoffDateTime within 24h after weekAnchor 00:00 Eastern
    const anchorOffsetMatch = seasonData.kickoffDateTime.match(/([+-]\d{2}:\d{2})$/);
    const anchorOffset = anchorOffsetMatch ? anchorOffsetMatch[1] : '-04:00';
    const anchorMidnightEastern = new Date(`${seasonData.weekAnchor}T00:00:00${anchorOffset}`);
    const kickoff = new Date(seasonData.kickoffDateTime);
    const kickoffDiffHours = (kickoff - anchorMidnightEastern) / (1000 * 60 * 60);
    if (kickoffDiffHours >= 0 && kickoffDiffHours <= 24) {
        record('A5', true, `kickoffDateTime is ${kickoffDiffHours.toFixed(2)}h after weekAnchor 00:00 Eastern`);
    } else {
        record('A5', false, `kickoffDateTime is ${kickoffDiffHours.toFixed(2)}h after weekAnchor 00:00 Eastern (expected 0-24)`);
    }

    // A6: seasonEndDate > kickoffDateTime; span(weekAnchor -> seasonEndDate) in 17..19 weeks
    const endDate = new Date(seasonData.seasonEndDate);
    if (endDate <= kickoff) {
        record('A6', false, `seasonEndDate ${seasonData.seasonEndDate} is not after kickoffDateTime ${seasonData.kickoffDateTime}`);
    } else {
        const spanWeeks = (endDate - anchorMidnightEastern) / (1000 * 60 * 60 * 24 * 7);
        if (spanWeeks >= 17 && spanWeeks <= 19) {
            record('A6', true, `seasonEndDate > kickoffDateTime; span = ${spanWeeks.toFixed(2)} weeks`);
        } else {
            record('A6', false, `span(weekAnchor, seasonEndDate) = ${spanWeeks.toFixed(2)} weeks, not in 17..19`);
        }
    }

    // A7: every game's date within [weekAnchor + (week-1)*7d - 2d, weekAnchor + week*7d + 2d]
    let a7 = true;
    const DAY_MS = 24 * 60 * 60 * 1000;
    for (const wk of allWeeksGames) {
        const lower = new Date(anchorMidnightEastern.getTime() + (wk.week - 1) * 7 * DAY_MS - 2 * DAY_MS);
        const upper = new Date(anchorMidnightEastern.getTime() + wk.week * 7 * DAY_MS + 2 * DAY_MS);
        for (const g of wk.games) {
            const gd = new Date(g.dt);
            if (gd < lower || gd > upper) {
                a7 = false;
                record('A7', false, `week ${wk.week} game ${g.id} (${g.a} @ ${g.h}, ${g.dt}) outside expected window [${lower.toISOString()}, ${upper.toISOString()}]`);
            }
        }
    }
    if (a7) record('A7', true, 'every game within its week +-2d tolerance window');

    // A8: poolId === 'nerduniverse-' + year and weekAnchor starts with '{year}-' (lockstep guard)
    const expectedPoolId = `nerduniverse-${year}`;
    if (seasonData.poolId === expectedPoolId && seasonData.weekAnchor.startsWith(`${year}-`)) {
        record('A8', true, `poolId (${seasonData.poolId}) and weekAnchor (${seasonData.weekAnchor}) are in lockstep with year ${year}`);
    } else {
        record('A8', false, `poolId=${seasonData.poolId} (expected ${expectedPoolId}) / weekAnchor=${seasonData.weekAnchor} (expected prefix ${year}-)`);
    }

    // A9: no duplicate game ids within the season
    const seenIds = new Set();
    let a9 = true;
    for (const wk of allWeeksGames) {
        for (const g of wk.games) {
            if (seenIds.has(g.id)) {
                a9 = false;
                record('A9', false, `duplicate game id ${g.id} (week ${wk.week})`);
            }
            seenIds.add(g.id);
        }
    }
    if (a9) record('A9', true, 'no duplicate game ids');

    // A10: every team name resolved through TEAM_MAPPINGS (unmapped = WARNING, not failure)
    const mappedFullNames = new Set(Object.values(TEAM_MAPPINGS));
    const unmapped = new Set();
    for (const wk of allWeeksGames) {
        for (const g of wk.games) {
            if (!mappedFullNames.has(g.a)) unmapped.add(g.a);
            if (!mappedFullNames.has(g.h)) unmapped.add(g.h);
        }
    }
    if (unmapped.size > 0) {
        const list = [...unmapped].sort().join(', ');
        warnings.push(`A10: ${unmapped.size} unmapped team name(s) (pass through unchanged): ${list}`);
        record('A10', true, `${unmapped.size} unmapped name(s) — WARNING only, not a failure: ${list}`);
    } else {
        record('A10', true, 'every team name resolved through TEAM_MAPPINGS');
    }

    const pass = results.every((r) => r.pass);
    return { pass, results, warnings };
}

// ---------------------------------------------------------------------------
// Output formatting (pure string builders, so tests can check text without
// touching disk — writeOutputs() below is the only function that does I/O)
// ---------------------------------------------------------------------------

function formatSeasonDataJs(seasonData) {
    return `// ⚠️ GENERATED FILE FORMAT — produced by espn-schedule-scraper.js (spec D4).
// DATA ONLY — no logic, ever.
// Companion: functions/season-data.json must contain identical values
// (enforced by tests/season-config-drift.test.js).
(function () {
    'use strict';

    const SEASON_DATA = {
        year: ${seasonData.year},
        weekAnchor: '${seasonData.weekAnchor}',
        kickoffDateTime: '${seasonData.kickoffDateTime}',
        seasonEndDate: '${seasonData.seasonEndDate}',
        totalWeeks: ${seasonData.totalWeeks},
        poolId: '${seasonData.poolId}',
        poolDisplayName: '${seasonData.poolDisplayName}',
        espnScheduleUrlTemplate: '${seasonData.espnScheduleUrlTemplate}'
    };

    Object.freeze(SEASON_DATA);

    if (typeof window !== 'undefined') {
        window.SEASON_DATA = SEASON_DATA;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { SEASON_DATA };
    }
})();
`;
}

function formatSeasonDataJson(seasonData) {
    // Same key order as season-data.js's object literal; 4-space indent,
    // matching functions/season-data.json's current shape.
    const ordered = {
        year: seasonData.year,
        weekAnchor: seasonData.weekAnchor,
        kickoffDateTime: seasonData.kickoffDateTime,
        seasonEndDate: seasonData.seasonEndDate,
        totalWeeks: seasonData.totalWeeks,
        poolId: seasonData.poolId,
        poolDisplayName: seasonData.poolDisplayName,
        espnScheduleUrlTemplate: seasonData.espnScheduleUrlTemplate
    };
    return JSON.stringify(ordered, null, 4) + '\n';
}

/**
 * Per-week game-data file: an ID-keyed map (NOT {week, games:[...]}) —
 * matches the shape actually consumed by production (verified against
 * nerdfootballConfidencePicks.html's `weekBible = await response.json()`
 * followed by `Object.keys(weekBible).filter(k => k !== '_metadata')`).
 * No _metadata block: that provenance data belongs to a later
 * results-verification pass, not the pre-season scraper (zero fallback
 * data — we do not fabricate scores/status for unplayed games).
 *
 * `dt` uses the LEGACY bare-Z-meaning-Eastern convention (toLegacyBareZEastern
 * above), NOT explicit-offset ISO — see that function's comment block for
 * why. Decisive, review-mandated correction, 2026-08-08.
 */
function formatWeekGameData(weekObj) {
    const obj = {};
    for (const g of weekObj.games) {
        obj[String(g.id)] = { a: g.a, h: g.h, dt: toLegacyBareZEastern(g.dt), stadium: g.stadium };
    }
    return JSON.stringify(obj, null, 2) + '\n';
}

/**
 * Per-game `dt` uses the LEGACY bare-Z-meaning-Eastern convention here too
 * (toLegacyBareZEastern) — same reasoning as formatWeekGameData above; this
 * file feeds the same production consumers.
 */
function formatScheduleRaw(year, allWeeksGames) {
    const payload = {
        year,
        generatedAt: new Date().toISOString(),
        weeks: allWeeksGames.map((w) => ({
            week: w.week,
            games: w.games.map((g) => ({ id: g.id, a: g.a, h: g.h, dt: toLegacyBareZEastern(g.dt), stadium: g.stadium }))
        }))
    };
    return JSON.stringify(payload, null, 2) + '\n';
}

function writeOutputs(year, allWeeksGames, seasonData) {
    const seasonDataJsPath = path.join(__dirname, 'public', 'js', 'config', 'season-data.js');
    fs.writeFileSync(seasonDataJsPath, formatSeasonDataJs(seasonData));
    console.log(`  wrote ${seasonDataJsPath}`);

    const seasonDataJsonPath = path.join(__dirname, 'functions', 'season-data.json');
    fs.writeFileSync(seasonDataJsonPath, formatSeasonDataJson(seasonData));
    console.log(`  wrote ${seasonDataJsonPath}`);

    const gameDataDir = path.join(__dirname, 'public', 'game-data');
    if (!fs.existsSync(gameDataDir)) {
        fs.mkdirSync(gameDataDir, { recursive: true });
    }
    for (const wk of allWeeksGames) {
        const p = path.join(gameDataDir, `nfl_${year}_week_${wk.week}.json`);
        fs.writeFileSync(p, formatWeekGameData(wk));
        console.log(`  wrote ${p}`);
    }

    const rawPath = path.join(__dirname, 'public', `nfl_${year}_schedule_raw.json`);
    fs.writeFileSync(rawPath, formatScheduleRaw(year, allWeeksGames));
    console.log(`  wrote ${rawPath}`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
    const args = { year: null, dryRun: false, week: null };
    for (const arg of argv) {
        if (arg.startsWith('--year=')) {
            args.year = parseInt(arg.slice('--year='.length), 10);
        } else if (arg === '--dry-run') {
            args.dryRun = true;
        } else if (arg.startsWith('--week=')) {
            args.week = parseInt(arg.slice('--week='.length), 10);
        }
    }
    return args;
}

function printUsage() {
    console.log('Usage: node espn-schedule-scraper.js --year=YYYY [--dry-run] [--week=N]');
    console.log('');
    console.log('  --year=YYYY   REQUIRED. Integer 2020-2100. No default.');
    console.log('  --dry-run     Fetch + validate + print the summary; write nothing.');
    console.log('  --week=N      Fetch a single week for debugging; never writes.');
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    if (!Number.isInteger(args.year) || args.year < 2020 || args.year > 2100) {
        printUsage();
        process.exit(1);
    }

    if (args.week !== null) {
        if (!Number.isInteger(args.week) || args.week < 1 || args.week > 18) {
            console.error(`❌ --week must be an integer 1-18 (got ${args.week})`);
            process.exit(1);
        }
        console.log(`Fetching week ${args.week} of ${args.year} for debugging (no writes)...`);
        const json = await fetchWeekScoreboard(args.week, args.year);
        console.log(`  response season.year = ${json.season && json.season.year}`);
        const parsed = parseScoreboard(json, args.week);
        console.log(JSON.stringify(parsed, null, 2));
        return;
    }

    console.log(`🏈 Scraping ${args.year} season (weeks 1-18) from ESPN (dates=${args.year})...`);
    const allWeeksGames = [];
    const responseSeasonYears = [];
    for (let week = 1; week <= 18; week++) {
        console.log(`  Fetching week ${week}...`);
        let json;
        try {
            json = await fetchWeekScoreboard(week, args.year);
        } catch (err) {
            console.error(`❌ FAILED fetching week ${week}: ${err.message}`);
            process.exit(1);
        }
        responseSeasonYears.push({ week, seasonYear: json.season && json.season.year });
        let parsed;
        try {
            parsed = parseScoreboard(json, week);
        } catch (err) {
            console.error(`❌ FAILED parsing week ${week}: ${err.message}`);
            process.exit(1);
        }
        allWeeksGames.push(parsed);
        if (week < 18) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 req/sec
        }
    }

    let seasonData;
    try {
        seasonData = deriveSeasonData(args.year, allWeeksGames);
    } catch (err) {
        console.error(`❌ FAILED deriving season data: ${err.message}`);
        process.exit(1);
    }

    const validation = validateSeason(args.year, allWeeksGames, seasonData, responseSeasonYears);

    console.log('');
    console.log('=== Validation Results ===');
    for (const r of validation.results) {
        console.log(`${r.pass ? '✅ PASS' : '❌ FAIL'} ${r.id}: ${r.message}`);
    }
    if (validation.warnings.length > 0) {
        console.log('');
        console.log('=== Warnings ===');
        validation.warnings.forEach((w) => console.log(`⚠️  ${w}`));
    }

    console.log('');
    console.log('=== Season Summary ===');
    console.log(`  year: ${seasonData.year}`);
    console.log(`  weekAnchor: ${seasonData.weekAnchor}`);
    console.log(`  kickoffDateTime: ${seasonData.kickoffDateTime}`);
    console.log(`  seasonEndDate: ${seasonData.seasonEndDate}`);
    console.log(`  poolId: ${seasonData.poolId}`);
    console.log(`  per-week game counts: ${allWeeksGames.map((w) => w.games.length).join(', ')}`);
    console.log(`  total games: ${allWeeksGames.reduce((s, w) => s + w.games.length, 0)}`);

    if (!validation.pass) {
        console.error('');
        console.error('❌ VALIDATION FAILED — writing NOTHING.');
        process.exit(1);
    }

    if (args.dryRun) {
        const week1 = allWeeksGames.find((w) => w.week === 1);
        const sampleGame = week1 && week1.games && week1.games[0];
        if (sampleGame) {
            console.log('');
            console.log('=== Sample game-data dt (legacy bare-Z Eastern convention, as written to game-data files) ===');
            console.log(`  week 1 game ${sampleGame.id} (${sampleGame.a} @ ${sampleGame.h}):`);
            console.log(`    internal / season-data path (explicit-offset): ${sampleGame.dt}`);
            console.log(`    game-data file output (legacy bare-Z):         ${toLegacyBareZEastern(sampleGame.dt)}`);
        }

        console.log('');
        console.log('=== seasonEndDate parity: derived vs live functions/season-data.json ===');
        try {
            const liveSeasonDataPath = path.join(__dirname, 'functions', 'season-data.json');
            const liveSeasonData = JSON.parse(fs.readFileSync(liveSeasonDataPath, 'utf8'));
            const liveSeasonEndDate = liveSeasonData.seasonEndDate;
            const deltaDays = (new Date(seasonData.seasonEndDate).getTime() - new Date(liveSeasonEndDate).getTime()) / (1000 * 60 * 60 * 24);
            console.log(`  derived: ${seasonData.seasonEndDate}`);
            console.log(`  live:    ${liveSeasonEndDate}  (functions/season-data.json)`);
            console.log(`  delta:   ${deltaDays.toFixed(2)} day(s) (derived - live) — MAY differ from live; informational only, not a failure`);
        } catch (err) {
            console.log(`  could not read live functions/season-data.json for comparison: ${err.message}`);
        }

        console.log('');
        console.log('✅ DRY RUN — all validations passed. No files written.');
        return;
    }

    console.log('');
    console.log('✅ All validations passed. Writing outputs...');
    writeOutputs(args.year, allWeeksGames, seasonData);
    console.log('✅ Done.');
}

if (require.main === module) {
    main().catch((err) => {
        console.error(`❌ Fatal error: ${err.message}`);
        process.exit(1);
    });
}

module.exports = {
    parseScoreboard,
    toEasternISO,
    easternOffsetFor,
    deriveSeasonData,
    validateSeason,
    TEAM_MAPPINGS,
    // Additive exports beyond the plan's minimum list — required by the
    // "Format check" unit test (generated season-data.js text parses via
    // require() and deep-equals the JSON twin). Both are pure string
    // builders with no I/O.
    formatSeasonDataJs,
    formatSeasonDataJson,
    // Additive exports for the game-data dt legacy-convention fix
    // (2026-08-08 review) — pure functions, no I/O.
    toLegacyBareZEastern,
    formatWeekGameData,
    formatScheduleRaw
};
