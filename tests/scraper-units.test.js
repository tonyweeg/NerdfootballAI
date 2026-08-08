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
// game-data `dt` convention: LEGACY bare-Z-meaning-Eastern (2026-08-08 review)
// ---------------------------------------------------------------------------
// Decisive, review-mandated correction: game-data / raw-schedule `dt` must
// NOT be explicit-offset ISO. The live consumer public/easternTimeParser-v2.js
// unconditionally strips 'Z' and subtracts a fixed 4 hours; feeding it
// offset-ISO applies that correction to an already-correct value ("double
// correction"), shifting pick-lock/game-start times 3-4h for non-Eastern
// viewers. season-data.js's kickoffDateTime/seasonEndDate correctly KEEP
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

describe('legacy dt convention vs. the live consumer public/easternTimeParser-v2.js (hasGameStarted) — 2026-08-08 review', () => {
    // Exact replication of public/easternTimeParser-v2.js's hasGameStarted
    // (verified against that file's actual source, 2026-08-08):
    //   const cleanTime = espnTimestamp.replace('Z', '');
    //   const wrongTime = new Date(cleanTime);
    //   const correctedGameTime = new Date(wrongTime.getTime() - (4*60*60*1000));
    //
    // `new Date(cleanTime)` has no offset, so per the ECMA-262 Date Time
    // String Format it is parsed in the *ambient* ("local") timezone of
    // whoever runs it. Empirically verified while writing this test
    // (2026-08-08): this repo's dev/CI process ambient TZ is
    // America/New_York (no jest.config TZ override exists) — AND Jest's
    // node test environment does NOT honor a runtime `process.env.TZ`
    // mutation after startup (confirmed: mutating it mid-test has zero
    // effect on Intl/Date, unlike a plain `node -e` script, presumably
    // because V8's local-timezone cache is warmed before test code runs).
    // So these tests rely on — and explicitly guard — the process's actual
    // ambient default rather than trying to force a different one.
    const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

    beforeAll(() => {
        const ambientTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (ambientTZ !== 'America/New_York') {
            throw new Error(
                `This suite assumes ambient TZ America/New_York (this repo's verified ` +
                `dev/CI default), because Jest does not honor runtime TZ mutation. ` +
                `Actual ambient TZ is ${ambientTZ}. Run with TZ=America/New_York, or ` +
                `update this guard and the expected values below if the environment's ` +
                `default has genuinely changed.`
            );
        }
    });

    function replicateHasGameStarted(espnTimestamp) {
        const cleanTime = espnTimestamp.replace('Z', '');
        const wrongTime = new Date(cleanTime);
        const correctedGameTime = new Date(wrongTime.getTime() - FOUR_HOURS_MS);
        return { wrongTime, correctedGameTime };
    }

    test('a generated September game-data dt: strip-and-parse (pre-correction) exactly recovers the true UTC kickoff instant', () => {
        // Thu Sep 4, 2025, 8:20 PM EDT — true UTC per ESPN's JSON API.
        const trueUtcInstant = new Date('2025-09-05T00:20:00Z');
        const dt = toLegacyBareZEastern(toEasternISO(trueUtcInstant.toISOString()));
        expect(dt).toBe('2025-09-04T20:20:00Z');

        const { wrongTime } = replicateHasGameStarted(dt);

        // Under this process's Eastern-ambient TZ (guarded above), the
        // parser's Z-strip-and-reparse step is an identity: Eastern digits
        // read back as Eastern local time land exactly on the true instant.
        expect(wrongTime.getTime()).toBe(trueUtcInstant.getTime());
    });

    test('hasGameStarted\'s FULL corrected value reproduces the same documented 4h-early behavior as production (CLAUDE.md "ESPN Timezone Bug") — not a new regression', () => {
        const trueUtcInstant = new Date('2025-09-05T00:20:00Z'); // 8:20 PM EDT, Sept 4
        const dt = toLegacyBareZEastern(toEasternISO(trueUtcInstant.toISOString()));

        const { correctedGameTime } = replicateHasGameStarted(dt);

        // hasGameStarted's fixed "-4h" on top of an already-correct value is
        // a pre-existing, documented quirk (CLAUDE.md: "SYMPTOM: Game times
        // show 4 hours early") that this fix deliberately preserves
        // byte-for-byte, so 2026 behaves exactly like 2025 did — it is NOT
        // fixed here. This is a known, CONSTANT 4-hour offset from true, not
        // the unpredictable multi-hour drift the reverted explicit-offset
        // convention would cause for non-Eastern viewers (next test).
        expect(correctedGameTime.getTime()).toBe(trueUtcInstant.getTime() - FOUR_HOURS_MS);
    });

    test('the reverted explicit-offset convention: parser subtracts an EXTRA 4h from an already-correct value, because offset parsing is TZ-independent', () => {
        // Offset-format dt (what this scraper produced before the fix) has
        // no 'Z' at all, so `.replace('Z','')` is a no-op and `new Date()`
        // parses the explicit offset deterministically (NOT ambient-TZ-
        // dependent — this is standard, spec-guaranteed Date behavior,
        // true in every environment) straight to the true instant — then
        // the parser subtracts another 4h on top, unconditionally. That
        // determinism is exactly why the bug this fix corrects is uniform
        // "every non-Eastern viewer" rather than something that happens to
        // self-correct for some viewers.
        const trueUtcInstant = new Date('2025-09-05T00:20:00Z');
        const brokenOffsetDt = toEasternISO(trueUtcInstant.toISOString());
        expect(brokenOffsetDt).toBe('2025-09-04T20:20:00-04:00');

        const { wrongTime, correctedGameTime } = replicateHasGameStarted(brokenOffsetDt);

        expect(wrongTime.getTime()).toBe(trueUtcInstant.getTime());
        expect(correctedGameTime.getTime()).toBe(trueUtcInstant.getTime() - FOUR_HOURS_MS);
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
