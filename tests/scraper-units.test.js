const fs = require('fs');
const os = require('os');
const path = require('path');

const {
    toEasternISO,
    easternOffsetFor,
    deriveSeasonData,
    validateSeason,
    TEAM_MAPPINGS,
    formatSeasonDataJs,
    formatSeasonDataJson,
    toLegacyBareZEastern,
    formatWeekGameData,
    formatScheduleRaw
} = require('../espn-schedule-scraper.js');

// ---------------------------------------------------------------------------
// toEasternISO
// ---------------------------------------------------------------------------

describe('toEasternISO', () => {
    test('a September instant converts at -04:00 (EDT)', () => {
        // Real sample from the 2025 parity gate: 1:00 PM ET Sunday game.
        expect(toEasternISO('2025-09-07T17:00:00Z')).toBe('2025-09-07T13:00:00-04:00');
    });

    test('a January instant converts at -05:00 (EST)', () => {
        expect(toEasternISO('2026-01-05T00:00:00Z')).toBe('2026-01-04T19:00:00-05:00');
    });

    test('the November DST-end boundary week: just before flips EDT, just at/after flips EST', () => {
        // 2025 DST end: first Sunday of November = Nov 2, 2025, 07:00 UTC (2:00 AM local).
        expect(toEasternISO('2025-11-02T06:59:00Z')).toBe('2025-11-02T02:59:00-04:00');
        expect(toEasternISO('2025-11-02T07:00:00Z')).toBe('2025-11-02T02:00:00-05:00');
        // A day on each side, well clear of the boundary hour.
        expect(toEasternISO('2025-11-01T18:00:00Z')).toBe('2025-11-01T14:00:00-04:00');
        expect(toEasternISO('2025-11-03T18:00:00Z')).toBe('2025-11-03T13:00:00-05:00');
    });

    test('throws on an unparseable UTC string', () => {
        expect(() => toEasternISO('not-a-date')).toThrow('invalid UTC ISO string');
    });
});

describe('easternOffsetFor', () => {
    test('the March DST-start boundary: just before flips EST, just at/after flips EDT', () => {
        // 2025 DST start: second Sunday of March = Mar 9, 2025, 07:00 UTC.
        expect(easternOffsetFor(new Date('2025-03-09T06:59:00Z'))).toBe(-5);
        expect(easternOffsetFor(new Date('2025-03-09T07:00:00Z'))).toBe(-4);
    });
});

// ---------------------------------------------------------------------------
// deriveSeasonData
// ---------------------------------------------------------------------------

// Real per-week counts from the live 2025 season (sums to 272) — reused here
// purely as a realistic distribution for synthetic fixtures, independent of
// any live data file.
const REAL_2025_WEEK_COUNTS = [16, 16, 16, 16, 14, 15, 15, 13, 14, 14, 15, 14, 16, 14, 16, 16, 16, 16];

/**
 * Builds a synthetic, self-consistent 18-week fixture. `week1FirstGameUtcISO`
 * lets callers control week 1's earliest kickoff (in true UTC) to exercise
 * the Eastern-date-rollover behavior explicitly.
 */
function buildFixture({ week1FirstGameUtcISO = '2026-09-11T00:20:00Z' } = {}) {
    const week1FirstGameEastern = toEasternISO(week1FirstGameUtcISO);
    const anchorDate = week1FirstGameEastern.slice(0, 10);
    const anchorMidnight = new Date(`${anchorDate}T00:00:00-04:00`);

    const allWeeksGames = REAL_2025_WEEK_COUNTS.map((count, i) => {
        const week = i + 1;
        const games = [];
        for (let idx = 0; idx < count; idx++) {
            const id = week * 100 + idx + 1;
            let dt;
            if (week === 1 && idx === 0) {
                dt = week1FirstGameEastern; // exact controlled kickoff
            } else {
                // Day offset starts at 1 (never 0) so no other week-1 game can
                // land on the anchor date and out-race the controlled kickoff
                // above — (idx % 4) + 1 keeps every offset in 1..4, still well
                // inside each week's +-2d tolerance window.
                const dayOffset = (idx % 4) + 1;
                const gameInstant = new Date(anchorMidnight.getTime() + (week - 1) * 7 * 86400000 + dayOffset * 86400000 + 18 * 3600000);
                dt = toEasternISO(gameInstant.toISOString());
            }
            games.push({ id, a: `AwayTeam${id}`, h: `HomeTeam${id}`, dt, stadium: 'Test Stadium' });
        }
        return { week, games };
    });

    return allWeeksGames;
}

describe('deriveSeasonData', () => {
    test('synthetic 18-week fixture derives correct anchor/kickoff/end', () => {
        const allWeeksGames = buildFixture({ week1FirstGameUtcISO: '2026-09-11T00:20:00Z' });
        const seasonData = deriveSeasonData(2026, allWeeksGames);

        expect(seasonData.year).toBe(2026);
        expect(seasonData.weekAnchor).toBe('2026-09-10');
        expect(seasonData.kickoffDateTime).toBe('2026-09-10T20:20:00-04:00');
        expect(seasonData.totalWeeks).toBe(18);
        expect(seasonData.poolId).toBe('nerduniverse-2026');
        expect(seasonData.poolDisplayName).toBe('Nerd Universe 2026');
        expect(new Date(seasonData.seasonEndDate) > new Date(seasonData.kickoffDateTime)).toBe(true);
    });

    test('night-game UTC-date-rollover: kickoff 00:20Z means the anchor is the PREVIOUS Eastern date', () => {
        // 2026-09-11T00:20:00Z is a Thursday-night 8:20 PM EDT kickoff — the
        // UTC calendar date (Sept 11) has already rolled to Friday, but the
        // Eastern calendar date (and thus weekAnchor) must stay Sept 10.
        const allWeeksGames = buildFixture({ week1FirstGameUtcISO: '2026-09-11T00:20:00Z' });
        const seasonData = deriveSeasonData(2026, allWeeksGames);

        const utcDatePart = '2026-09-11T00:20:00Z'.slice(0, 10);
        expect(seasonData.weekAnchor).not.toBe(utcDatePart);
        expect(seasonData.weekAnchor).toBe('2026-09-10');
    });

    test('throws loudly when week 1 has no games', () => {
        const allWeeksGames = buildFixture();
        const withoutWeek1 = allWeeksGames.filter((w) => w.week !== 1);
        expect(() => deriveSeasonData(2026, withoutWeek1)).toThrow('week 1 has no games');
    });

    test('throws loudly when week 18 has no games', () => {
        const allWeeksGames = buildFixture();
        const withoutWeek18 = allWeeksGames.filter((w) => w.week !== 18);
        expect(() => deriveSeasonData(2026, withoutWeek18)).toThrow('week 18 has no games');
    });
});

// ---------------------------------------------------------------------------
// validateSeason
// ---------------------------------------------------------------------------

describe('validateSeason', () => {
    test('a clean fixture passes (A10 unmapped-name warnings do not fail it)', () => {
        const allWeeksGames = buildFixture();
        const seasonData = deriveSeasonData(2026, allWeeksGames);
        const result = validateSeason(2026, allWeeksGames, seasonData);

        expect(result.pass).toBe(true);
        // The synthetic fixture uses fake team names, so A10 warns but must
        // still be recorded as passing (warning, not failure).
        const a10 = result.results.find((r) => r.id === 'A10');
        expect(a10.pass).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('A2 violation (bad per-week count) fails with A2 named', () => {
        const allWeeksGames = buildFixture();
        allWeeksGames[0] = { week: 1, games: allWeeksGames[0].games.slice(0, 2) }; // 2 games, outside 13-16
        const seasonData = deriveSeasonData(2026, allWeeksGames);
        const result = validateSeason(2026, allWeeksGames, seasonData);

        expect(result.pass).toBe(false);
        const a2 = result.results.filter((r) => r.id === 'A2');
        expect(a2.some((r) => !r.pass)).toBe(true);
    });

    test('A4 violation (weekAnchor not a Thursday) fails with A4 named', () => {
        const allWeeksGames = buildFixture();
        const seasonData = deriveSeasonData(2026, allWeeksGames);
        seasonData.weekAnchor = '2026-09-09'; // a Wednesday
        const result = validateSeason(2026, allWeeksGames, seasonData);

        expect(result.pass).toBe(false);
        const a4 = result.results.find((r) => r.id === 'A4');
        expect(a4.pass).toBe(false);
    });

    test('A6 violation (seasonEndDate not after kickoff) fails with A6 named', () => {
        const allWeeksGames = buildFixture();
        const seasonData = deriveSeasonData(2026, allWeeksGames);
        seasonData.seasonEndDate = seasonData.kickoffDateTime; // not strictly after
        const result = validateSeason(2026, allWeeksGames, seasonData);

        expect(result.pass).toBe(false);
        const a6 = result.results.find((r) => r.id === 'A6');
        expect(a6.pass).toBe(false);
    });

    test('A9 violation (duplicate game id) fails with A9 named', () => {
        const allWeeksGames = buildFixture();
        // Force a duplicate: week 2's first game reuses week 1's first game id.
        allWeeksGames[1].games[0] = { ...allWeeksGames[1].games[0], id: allWeeksGames[0].games[0].id };
        const seasonData = deriveSeasonData(2026, allWeeksGames);
        const result = validateSeason(2026, allWeeksGames, seasonData);

        expect(result.pass).toBe(false);
        const a9 = result.results.filter((r) => r.id === 'A9');
        expect(a9.some((r) => !r.pass)).toBe(true);
    });

    test('A11 violation (kickoffDateTime is legacy bare-Z, not explicit-offset) fails with A11 named', () => {
        // Closes the silent leak path: a bare-Z kickoffDateTime reaching
        // derivation would shift by hours with every other assert green.
        const allWeeksGames = buildFixture();
        const seasonData = deriveSeasonData(2026, allWeeksGames);
        seasonData.kickoffDateTime = toLegacyBareZEastern(seasonData.kickoffDateTime); // '...Z' instead of '...-04:00'
        const result = validateSeason(2026, allWeeksGames, seasonData);

        expect(result.pass).toBe(false);
        const a11 = result.results.find((r) => r.id === 'A11');
        expect(a11.pass).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Format check: generated season-data.js parses via require() and
// deep-equals the JSON twin
// ---------------------------------------------------------------------------

describe('output format (season-data.js / season-data.json parity)', () => {
    test('generated season-data.js text requires cleanly and deep-equals the JSON twin', () => {
        const allWeeksGames = buildFixture();
        const seasonData = deriveSeasonData(2031, allWeeksGames); // an obviously-synthetic year

        const jsText = formatSeasonDataJs(seasonData);
        const jsonText = formatSeasonDataJson(seasonData);

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scraper-format-check-'));
        try {
            const jsPath = path.join(tmpDir, 'season-data.js');
            const jsonPath = path.join(tmpDir, 'season-data.json');
            fs.writeFileSync(jsPath, jsText);
            fs.writeFileSync(jsonPath, jsonText);

            delete require.cache[require.resolve(jsPath)];
            const { SEASON_DATA } = require(jsPath);
            const jsonTwin = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

            expect(SEASON_DATA).toEqual(jsonTwin);
            expect(SEASON_DATA.year).toBe(2031);
            expect(Object.isFrozen(SEASON_DATA)).toBe(true);
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });
});

// ---------------------------------------------------------------------------
// game-data `dt` convention: LEGACY bare-Z-meaning-Eastern (2026-08-08 review;
// rationale corrected post-quality-review)
// ---------------------------------------------------------------------------
// Decisive, review-mandated correction: game-data / raw-schedule `dt` must
// NOT be explicit-offset ISO. The HONEST reason (see toLegacyBareZEastern's
// comment in espn-schedule-scraper.js for the full derivation): the live
// consumer public/easternTimeParser-v2.js unconditionally strips 'Z' and
// subtracts a fixed 4 hours. With bare-Z input that computation is skewed
// EARLY by a VIEWER-TIMEZONE-DEPENDENT amount (measured: Eastern −4h,
// Central −3h, Pacific −1h, UTC −8h, Tokyo −17h) — it is NOT "correct" for
// anyone. Explicit-offset ISO input would give a UNIFORM −4h for every
// viewer instead — arguably better, but different from what every 2025 user
// actually experienced. We emit bare-Z solely because the ground rule is
// byte-identical 2025 behavior, not because bare-Z produces correct times.
// season-data.js's kickoffDateTime/seasonEndDate correctly KEEP
// explicit-offset format (a different consumer path) and must stay untouched
// by this fix — covered below.

describe('toLegacyBareZEastern', () => {
    test('swaps the explicit Eastern offset for a literal Z, keeping the same digits', () => {
        expect(toLegacyBareZEastern('2025-09-04T20:20:00-04:00')).toBe('2025-09-04T20:20:00Z');
        expect(toLegacyBareZEastern('2026-01-04T19:00:00-05:00')).toBe('2026-01-04T19:00:00Z');
    });
});

describe('formatWeekGameData / formatScheduleRaw emit the legacy bare-Z dt convention', () => {
    // Fixture dt is explicit-offset Eastern ISO — exactly what parseScoreboard
    // stores internally (unchanged by this fix; toEasternISO(event.date)).
    const weekObj = {
        week: 1,
        games: [
            { id: 101, a: 'Dallas Cowboys', h: 'Philadelphia Eagles', dt: '2025-09-04T20:20:00-04:00', stadium: 'Lincoln Financial Field' }
        ]
    };

    test('formatWeekGameData emits bare-Z dt matching the live production format', () => {
        const parsed = JSON.parse(formatWeekGameData(weekObj));
        expect(parsed['101']).toEqual({
            a: 'Dallas Cowboys',
            h: 'Philadelphia Eagles',
            dt: '2025-09-04T20:20:00Z',
            stadium: 'Lincoln Financial Field'
        });
    });

    test('formatScheduleRaw emits bare-Z dt for every game, in the existing key order', () => {
        const parsed = JSON.parse(formatScheduleRaw(2025, [weekObj]));
        expect(parsed.weeks[0].games[0]).toEqual({
            id: 101,
            a: 'Dallas Cowboys',
            h: 'Philadelphia Eagles',
            dt: '2025-09-04T20:20:00Z',
            stadium: 'Lincoln Financial Field'
        });
        expect(Object.keys(parsed.weeks[0].games[0])).toEqual(['id', 'a', 'h', 'dt', 'stadium']);
    });

    test('season-data.js / season-data.json fields are untouched: kickoffDateTime/seasonEndDate KEEP explicit-offset format', () => {
        const allWeeksGames = buildFixture();
        const seasonData = deriveSeasonData(2026, allWeeksGames);
        expect(seasonData.kickoffDateTime).toMatch(/[+-]\d{2}:\d{2}$/);
        expect(seasonData.seasonEndDate).toMatch(/[+-]\d{2}:\d{2}$/);
        expect(seasonData.kickoffDateTime).not.toMatch(/Z$/);
        expect(seasonData.seasonEndDate).not.toMatch(/Z$/);
    });
});

describe('legacy dt convention vs. the live consumer public/easternTimeParser-v2.js (hasGameStarted) — 2026-08-08 review, TZ-portable', () => {
    // Exact replication of public/easternTimeParser-v2.js's hasGameStarted
    // (verified against that file's actual source, 2026-08-08):
    //   const cleanTime = espnTimestamp.replace('Z', '');
    //   const wrongTime = new Date(cleanTime);
    //   const correctedGameTime = new Date(wrongTime.getTime() - (4*60*60*1000));
    //
    // `new Date(cleanTime)` has no offset, so per the ECMA-262 Date Time
    // String Format it is parsed in the *ambient* ("local") timezone of
    // whoever runs it — so hasGameStarted's skew from the true instant is
    // VIEWER-TIMEZONE-DEPENDENT, not a fixed correction (measured: Eastern
    // −4h, Central −3h, Pacific −1h, UTC −8h, Tokyo −17h — see CLAUDE.md
    // "MEASURED REALITY" and toLegacyBareZEastern's comment). A test that
    // hardcodes any ONE of those numbers only passes on a machine/CI runner
    // in that specific timezone. Instead, this test DERIVES the expected
    // skew from the machine's own measured ambient UTC offset at runtime —
    // genuinely pinning the production quirk's formula/mechanism, correct
    // on any machine (verified: Eastern dev box, and — separately, in a
    // freshly spawned process, since V8 caches the resolved zone per
    // process — TZ=UTC).
    const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

    function replicateHasGameStarted(espnTimestamp) {
        const cleanTime = espnTimestamp.replace('Z', '');
        const wrongTime = new Date(cleanTime);
        const correctedGameTime = new Date(wrongTime.getTime() - FOUR_HOURS_MS);
        return { wrongTime, correctedGameTime };
    }

    test.each([
        ['Thu opener, 8:20 PM EDT', '2025-09-05T00:20:00Z'],
        ['Sun early window, 1:00 PM EDT', '2025-09-07T17:00:00Z'],
        ['Sun night, 8:20 PM EDT', '2025-09-15T00:20:00Z'],
        ['Mon night, 8:15 PM EDT', '2025-09-16T00:15:00Z']
    ])('%s: hasGameStarted\'s skew from the true instant matches the formula derived from this machine\'s own measured ambient offset', (_label, trueUtcISO) => {
        const trueUtcInstant = new Date(trueUtcISO);
        const dt = toLegacyBareZEastern(toEasternISO(trueUtcInstant.toISOString()));

        const { wrongTime, correctedGameTime } = replicateHasGameStarted(dt);

        // Measure — don't assume — this machine's own ambient UTC offset at
        // this specific instant (DST-correct for whichever zone the process
        // actually runs in), and Eastern's offset for the same instant
        // (independently, via the scraper's own easternOffsetFor). Derive
        // the expected skew purely from those two measured numbers: the
        // parser's fixed "-4h" is calibrated for Eastern (4 === Eastern's
        // own offset magnitude), so any ambient zone that differs from
        // Eastern by D hours is off from the true instant by (4 + D) hours.
        const ambientOffsetHours = -wrongTime.getTimezoneOffset() / 60;
        const easternOffsetHours = easternOffsetFor(trueUtcInstant);
        const expectedSkewHours = FOUR_HOURS_MS / (60 * 60 * 1000) + (ambientOffsetHours - easternOffsetHours);

        const actualSkewHours = (trueUtcInstant.getTime() - correctedGameTime.getTime()) / (60 * 60 * 1000);

        expect(actualSkewHours).toBe(expectedSkewHours);
    });
});

// ---------------------------------------------------------------------------
// TEAM_MAPPINGS sanity
// ---------------------------------------------------------------------------

describe('TEAM_MAPPINGS', () => {
    test('carried over verbatim: 32 short-name keys resolving to 32 unique full names', () => {
        const keys = Object.keys(TEAM_MAPPINGS);
        const values = new Set(Object.values(TEAM_MAPPINGS));
        expect(keys.length).toBe(32);
        expect(values.size).toBe(32);
    });
});
