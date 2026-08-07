# Season Config Phase 0 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the season config foundation — generated-format data files (2025 values), browser + functions wrappers, parity/drift tests, and the hardcode guard script — with zero behavior change to production.

**Architecture:** One data block in two generated-format files (`public/js/config/season-data.js`, `functions/season-data.json`); two hand-written wrapper scripts exposing identical `paths`/`utils`/`format` APIs (browser + Node 20 CJS — no shared module possible without a bundler); Jest tests prove (a) week math matches the legacy `weekManager.js` formula exactly and (b) the two wrappers never drift.

**Tech Stack:** Vanilla JS (no build step), Jest 29 (already installed, `npm test` = `jest`, default Node test environment), ripgrep (`rg`), bash.

**Spec:** `claudedocs/specs/2026-08-07-season-config-centralization-design.md` (v2, decisions D1-D5)

**Branch:** All work on `claude/2026-season-config-plan-509f05` (this worktree). Run every command from the worktree root. Do not touch `main`. Do not deploy anything in Phase 0.

**Known repo condition (discovered during Task 1, 2026-08-07):** `auraglow/package.json` is truncated mid-file (unterminated string in devDependencies), which crashes any unscoped Jest run during project scanning. All Jest commands in this plan are therefore scoped with `--roots '<rootDir>/tests'`. The Task 1 baseline of root-level unit tests could not run — recorded as pre-existing breakage; Task 5 compares against that recorded state. Fixing auraglow is out of Phase 0 scope (flagged as a separate task).

---

## Design note: why the wrappers are plain scripts, not ES modules

The spec sketched an ESM wrapper. Refinement locked in here: both wrappers are **plain dual-environment scripts** (no `import`/`export` syntax), because:

1. Most of the 100 HTML files load scripts with plain `<script src>` (compat style). An ESM file would force a third `-compat` variant (the `firebase-config.js` / `firebase-config-compat.js` split). A plain script serves every page type with one file.
2. `functions/` runs **Node 20 CommonJS** — it cannot `require()` an ES module.
3. Jest (CJS, node environment) can `require()` both wrappers with zero transform config, which is what makes the drift test trivial.

Consumption pattern for later phases (reference only — no page edits in Phase 0):

```html
<!-- Compat pages: order matters, data before config -->
<script src="./js/config/season-data.js"></script>
<script src="./js/config/season-config.js"></script>
<script>
  const membersPath = window.SEASON_CONFIG.paths.poolMembers();
</script>
```

```javascript
// ES6-module pages: side-effect imports, then the window global
import './js/config/season-data.js';
import './js/config/season-config.js';
const cfg = window.SEASON_CONFIG;
```

```javascript
// Firebase Functions (Phase 1+)
const { SEASON_CONFIG } = require('./seasonConfig');
```

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `public/js/config/season-data.js` | Create | GENERATED-format data block, 2025 values (hand-authored until scraper rework lands) |
| `functions/season-data.json` | Create | Same data as JSON for Node `require()` |
| `public/js/config/season-config.js` | Create | Browser wrapper: `paths`/`utils`/`format` builders |
| `functions/seasonConfig.js` | Create | Node wrapper: identical builders (lockstep mirror) |
| `tests/season-config-parity.test.js` | Create | Legacy-formula parity + 2025 path snapshots + 2026 tree shapes |
| `tests/season-config-drift.test.js` | Create | Browser wrapper ≡ Node wrapper |
| `scripts/check-season-hardcodes.sh` | Create | Migration progress meter; Phase 5 exit gate |
| `firebase.json` | **None** | Verified 2026-08-07: global `Cache-Control: no-cache, no-store, must-revalidate` on `source: "**"` already covers `/js/config/**` — the spec's caching requirement is already met |

---

### Task 1: Season data files (2025 values)

**Files:**
- Create: `public/js/config/season-data.js`
- Create: `functions/season-data.json`

- [ ] **Step 1: Baseline the existing unit tests (pre-existing failures are not yours to fix)**

Run: `npx jest pool-members-unit app-structure-simple 2>&1 | tail -5`
Expected: note pass/fail counts. If anything fails here, record it in the commit message as pre-existing and continue — Phase 0 must not change these results in either direction.

- [ ] **Step 2: Create `public/js/config/season-data.js`**

```javascript
// ⚠️ GENERATED FILE FORMAT — espn-schedule-scraper.js will emit this file (spec D4).
// Hand-authored for Phase 0 with 2025 season values. DATA ONLY — no logic, ever.
// Companion: functions/season-data.json must contain identical values
// (enforced by tests/season-config-drift.test.js).
const SEASON_DATA = {
    year: 2025,
    weekAnchor: '2025-09-04',
    kickoffDateTime: '2025-09-04T20:20:00-04:00',
    seasonEndDate: '2026-01-07T23:59:59-05:00',
    totalWeeks: 18,
    poolId: 'nerduniverse-2025',
    poolDisplayName: 'Nerd Universe 2025',
    espnScheduleUrlTemplate: 'https://www.espn.com/nfl/schedule/_/week/{WEEK}/year/{YEAR}/seasontype/2'
};

if (typeof window !== 'undefined') {
    window.SEASON_DATA = SEASON_DATA;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SEASON_DATA };
}
```

Value provenance: `weekAnchor` matches the legacy literal `new Date('2025-09-04')` (weekManager.js:47) — this is what guarantees week parity. `kickoffDateTime` is the real 2025 opener (Thu Sept 4, 8:20 PM EDT, explicit offset per spec — never bare `Z`). `seasonEndDate` is Jan 7 2026 per the season definition in CLAUDE.md.

- [ ] **Step 3: Create `functions/season-data.json`**

```json
{
    "year": 2025,
    "weekAnchor": "2025-09-04",
    "kickoffDateTime": "2025-09-04T20:20:00-04:00",
    "seasonEndDate": "2026-01-07T23:59:59-05:00",
    "totalWeeks": 18,
    "poolId": "nerduniverse-2025",
    "poolDisplayName": "Nerd Universe 2025",
    "espnScheduleUrlTemplate": "https://www.espn.com/nfl/schedule/_/week/{WEEK}/year/{YEAR}/seasontype/2"
}
```

- [ ] **Step 4: Verify the two files carry identical data**

Run:
```bash
node -e "const a=require('./public/js/config/season-data.js').SEASON_DATA;const b=require('./functions/season-data.json');require('assert').deepStrictEqual(a,b);console.log('✅ season-data files identical')"
```
Expected: `✅ season-data files identical`

- [ ] **Step 5: Commit**

```bash
git add public/js/config/season-data.js functions/season-data.json
git commit -m "Phase 0: Season data files (2025 values, generated format)"
```

---

### Task 2: Browser wrapper via parity tests (TDD)

**Files:**
- Test: `tests/season-config-parity.test.js`
- Create: `public/js/config/season-config.js`

- [ ] **Step 1: Write the failing parity test**

Create `tests/season-config-parity.test.js`:

```javascript
const { SEASON_CONFIG } = require('../public/js/config/season-config.js');

// Legacy week formula, verbatim from public/weekManager.js:47-49.
// This is the parity reference: the config util must agree with it for every
// instant of the 2025 season window, or migration changes behavior.
function legacyGetCurrentWeek(now) {
    const seasonStart = new Date('2025-09-04');
    const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
    return Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);
}

describe('week parity with legacy weekManager formula', () => {
    test('matches legacy every 6 hours across the 2025 season window', () => {
        const start = new Date('2025-08-01T00:00:00Z').getTime();
        const end = new Date('2026-02-01T00:00:00Z').getTime();
        for (let t = start; t <= end; t += 6 * 60 * 60 * 1000) {
            const now = new Date(t);
            expect(SEASON_CONFIG.utils.getCurrentWeek(now)).toBe(legacyGetCurrentWeek(now));
        }
    });

    test('matches legacy at ±1 minute around every weekly boundary', () => {
        const anchor = new Date('2025-09-04').getTime();
        for (let k = 0; k <= 18; k++) {
            for (const offset of [-60000, 0, 60000]) {
                const now = new Date(anchor + k * 7 * 24 * 60 * 60 * 1000 + offset);
                expect(SEASON_CONFIG.utils.getCurrentWeek(now)).toBe(legacyGetCurrentWeek(now));
            }
        }
    });
});

describe('2025 path snapshots (must equal current production strings)', () => {
    test('pool paths', () => {
        expect(SEASON_CONFIG.paths.poolMembers()).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        expect(SEASON_CONFIG.paths.aiCache()).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/cache/latest-ai-intel-sheet');
        expect(SEASON_CONFIG.paths.poolRoot()).toBe('artifacts/nerdfootball/pools/nerduniverse-2025');
        expect(SEASON_CONFIG.paths.gridCache(6)).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/cache/grid-week-6');
        expect(SEASON_CONFIG.paths.scoringUser('u1')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/u1');
        expect(SEASON_CONFIG.paths.espnCache()).toBe('cache/espn_current_data');
    });

    test('picks paths match The Grid (nerdfootballTheGrid.html:624)', () => {
        expect(SEASON_CONFIG.paths.picks(5, 'abc123')).toBe('artifacts/nerdfootball/public/data/nerdfootball_picks/5/submissions/abc123');
        expect(SEASON_CONFIG.paths.picksWeek(5)).toBe('artifacts/nerdfootball/public/data/nerdfootball_picks/5/submissions');
    });

    test('results, games, survivor paths', () => {
        expect(SEASON_CONFIG.paths.results(3)).toBe('artifacts/nerdfootball/public/data/nerdfootball_results/3');
        expect(SEASON_CONFIG.paths.games(3)).toBe('artifacts/nerdfootball/public/data/nerdfootball_games/3');
        expect(SEASON_CONFIG.paths.survivorPicks('abc123')).toBe('artifacts/nerdfootball/public/data/nerdSurvivor_picks/abc123');
        expect(SEASON_CONFIG.paths.survivorStatus()).toBe('artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
    });

    test('year-segmented pool families (functions/index.js:659-690 shapes)', () => {
        expect(SEASON_CONFIG.paths.confidenceUser(4, 'u1')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/confidence/2025/weeks/4/users/u1');
        expect(SEASON_CONFIG.paths.survivorUser(4, 'u1')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/survivor/2025/weeks/4/users/u1');
        expect(SEASON_CONFIG.paths.scoresUser(4, 'u1')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/scores/2025/weeks/4/users/u1');
        expect(SEASON_CONFIG.paths.weeklyRollupUser(4, 'u1')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/rollups/weekly/2025/week_4/users/u1');
    });
});

describe('2026+ pool-scoped tree (spec D1/D5)', () => {
    test('season data moves under the pool document', () => {
        expect(SEASON_CONFIG.paths.picks(1, 'u1', 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdfootball_picks/1/submissions/u1');
        expect(SEASON_CONFIG.paths.picksWeek(1, 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdfootball_picks/1/submissions');
        expect(SEASON_CONFIG.paths.results(1, 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdfootball_results/1');
        expect(SEASON_CONFIG.paths.games(1, 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdfootball_games/1');
        expect(SEASON_CONFIG.paths.survivorPicks('u1', 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdSurvivor_picks/u1');
        expect(SEASON_CONFIG.paths.survivorStatus(2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/data/nerdSurvivor_status/status');
    });

    test('explicit prior-year access still resolves the legacy tree', () => {
        expect(SEASON_CONFIG.paths.picks(1, 'u1', 2025)).toBe('artifacts/nerdfootball/public/data/nerdfootball_picks/1/submissions/u1');
        expect(SEASON_CONFIG.paths.poolMembers(2025)).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
    });
});

describe('utils boundary semantics', () => {
    test('pre-season returns week 1', () => {
        expect(SEASON_CONFIG.utils.getCurrentWeek(new Date('2025-07-01T00:00:00Z'))).toBe(1);
    });

    test('post-season clamps to week 18', () => {
        expect(SEASON_CONFIG.utils.getCurrentWeek(new Date('2026-03-01T00:00:00Z'))).toBe(18);
    });

    test('week flips at midnight UTC on the Thursday date (Wed 8:00 PM ET)', () => {
        expect(SEASON_CONFIG.utils.getCurrentWeek(new Date('2025-09-10T23:59:00Z'))).toBe(1);
        expect(SEASON_CONFIG.utils.getCurrentWeek(new Date('2025-09-11T00:01:00Z'))).toBe(2);
    });

    test('hasWeekStarted', () => {
        expect(SEASON_CONFIG.utils.hasWeekStarted(1, new Date('2025-09-04T00:01:00Z'))).toBe(true);
        expect(SEASON_CONFIG.utils.hasWeekStarted(2, new Date('2025-09-05T00:00:00Z'))).toBe(false);
    });

    test('isSeasonActive', () => {
        expect(SEASON_CONFIG.utils.isSeasonActive(new Date('2025-10-15T12:00:00Z'))).toBe(true);
        expect(SEASON_CONFIG.utils.isSeasonActive(new Date('2025-08-07T12:00:00Z'))).toBe(false);
        expect(SEASON_CONFIG.utils.isSeasonActive(new Date('2026-02-01T12:00:00Z'))).toBe(false);
    });
});

describe('formatters and ESPN urls', () => {
    test('display strings', () => {
        expect(SEASON_CONFIG.format.weekDisplay(7)).toBe('WEEK 7 • 2025');
        expect(SEASON_CONFIG.format.seasonLabel()).toBe('2025 NFL Season');
        expect(SEASON_CONFIG.format.weekLabel(7)).toBe('Week 7, 2025');
        expect(SEASON_CONFIG.format.poolDisplay()).toBe('Nerd Universe 2025');
        expect(SEASON_CONFIG.format.scheduleFilename(3)).toBe('nfl_2025_week_3.json');
        expect(SEASON_CONFIG.format.scheduleFilename()).toBe('nfl_2025_schedule_raw.json');
    });

    test('espn schedule urls', () => {
        expect(SEASON_CONFIG.utils.getEspnScheduleUrl(9)).toBe('https://www.espn.com/nfl/schedule/_/week/9/year/2025/seasontype/2');
        expect(SEASON_CONFIG.utils.getAllEspnScheduleUrls()).toHaveLength(18);
        expect(SEASON_CONFIG.utils.getAllEspnScheduleUrls()[0]).toBe('https://www.espn.com/nfl/schedule/_/week/1/year/2025/seasontype/2');
    });
});
```

- [ ] **Step 2: Run it to verify it fails for the right reason**

Run: `npx jest --roots '<rootDir>/tests' tests/season-config-parity.test.js 2>&1 | tail -5`
Expected: FAIL — `Cannot find module '../public/js/config/season-config.js'`

- [ ] **Step 3: Create `public/js/config/season-config.js`**

```javascript
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
```

- [ ] **Step 4: Run the parity tests to verify they pass**

Run: `npx jest --roots '<rootDir>/tests' tests/season-config-parity.test.js 2>&1 | tail -5`
Expected: PASS — `Tests: 15 passed, 15 total`

- [ ] **Step 5: Commit**

```bash
git add tests/season-config-parity.test.js public/js/config/season-config.js
git commit -m "Phase 0: Browser season-config wrapper + legacy parity tests"
```

---

### Task 3: Functions wrapper via drift test (TDD)

**Files:**
- Test: `tests/season-config-drift.test.js`
- Create: `functions/seasonConfig.js`

- [ ] **Step 1: Write the failing drift test**

Create `tests/season-config-drift.test.js`:

```javascript
const { SEASON_CONFIG: browserConfig } = require('../public/js/config/season-config.js');
const { SEASON_CONFIG: nodeConfig } = require('../functions/seasonConfig.js');

// The two wrappers are hand-written mirrors (no shared module without a bundler).
// This suite is the drift guard: any divergence in data, paths, week math, or
// formatting between hosting and functions fails here.
describe('wrapper drift guard (browser vs functions)', () => {
    test('data blocks identical', () => {
        const dataOf = (c) => {
            const { paths, utils, format, ...data } = c;
            return data;
        };
        expect(dataOf(nodeConfig)).toEqual(dataOf(browserConfig));
    });

    test('every path builder identical across years, weeks, and users', () => {
        const weeks = [1, 5, 18];
        const years = [2024, 2025, 2026, 2027];
        const uid = 'drift-uid';
        for (const year of years) {
            expect(nodeConfig.paths.poolRoot(year)).toBe(browserConfig.paths.poolRoot(year));
            expect(nodeConfig.paths.poolMembers(year)).toBe(browserConfig.paths.poolMembers(year));
            expect(nodeConfig.paths.aiCache(year)).toBe(browserConfig.paths.aiCache(year));
            expect(nodeConfig.paths.scoringUser(uid, year)).toBe(browserConfig.paths.scoringUser(uid, year));
            expect(nodeConfig.paths.survivorPicks(uid, year)).toBe(browserConfig.paths.survivorPicks(uid, year));
            expect(nodeConfig.paths.survivorStatus(year)).toBe(browserConfig.paths.survivorStatus(year));
            for (const week of weeks) {
                expect(nodeConfig.paths.gridCache(week, year)).toBe(browserConfig.paths.gridCache(week, year));
                expect(nodeConfig.paths.picks(week, uid, year)).toBe(browserConfig.paths.picks(week, uid, year));
                expect(nodeConfig.paths.picksWeek(week, year)).toBe(browserConfig.paths.picksWeek(week, year));
                expect(nodeConfig.paths.results(week, year)).toBe(browserConfig.paths.results(week, year));
                expect(nodeConfig.paths.games(week, year)).toBe(browserConfig.paths.games(week, year));
                expect(nodeConfig.paths.confidenceUser(week, uid, year)).toBe(browserConfig.paths.confidenceUser(week, uid, year));
                expect(nodeConfig.paths.survivorUser(week, uid, year)).toBe(browserConfig.paths.survivorUser(week, uid, year));
                expect(nodeConfig.paths.scoresUser(week, uid, year)).toBe(browserConfig.paths.scoresUser(week, uid, year));
                expect(nodeConfig.paths.weeklyRollupUser(week, uid, year)).toBe(browserConfig.paths.weeklyRollupUser(week, uid, year));
            }
        }
        expect(nodeConfig.paths.espnCache()).toBe(browserConfig.paths.espnCache());
    });

    test('utils identical at fixed instants', () => {
        const instants = [
            '2025-07-01T00:00:00Z',
            '2025-09-10T23:59:00Z',
            '2025-09-11T00:01:00Z',
            '2025-11-20T17:00:00Z',
            '2026-03-01T00:00:00Z'
        ];
        for (const iso of instants) {
            const now = new Date(iso);
            expect(nodeConfig.utils.getCurrentWeek(now)).toBe(browserConfig.utils.getCurrentWeek(now));
            expect(nodeConfig.utils.isSeasonActive(now)).toBe(browserConfig.utils.isSeasonActive(now));
            for (const w of [1, 9, 18]) {
                expect(nodeConfig.utils.hasWeekStarted(w, now)).toBe(browserConfig.utils.hasWeekStarted(w, now));
            }
        }
        expect(nodeConfig.utils.getEspnScheduleUrl(9)).toBe(browserConfig.utils.getEspnScheduleUrl(9));
        expect(nodeConfig.utils.getAllEspnScheduleUrls()).toEqual(browserConfig.utils.getAllEspnScheduleUrls());
    });

    test('formatters identical', () => {
        for (const w of [1, 9, 18]) {
            expect(nodeConfig.format.weekDisplay(w)).toBe(browserConfig.format.weekDisplay(w));
            expect(nodeConfig.format.weekLabel(w)).toBe(browserConfig.format.weekLabel(w));
            expect(nodeConfig.format.scheduleFilename(w)).toBe(browserConfig.format.scheduleFilename(w));
        }
        expect(nodeConfig.format.seasonLabel()).toBe(browserConfig.format.seasonLabel());
        expect(nodeConfig.format.poolDisplay()).toBe(browserConfig.format.poolDisplay());
        expect(nodeConfig.format.scheduleFilename()).toBe(browserConfig.format.scheduleFilename());
    });
});
```

- [ ] **Step 2: Run it to verify it fails for the right reason**

Run: `npx jest --roots '<rootDir>/tests' tests/season-config-drift.test.js 2>&1 | tail -5`
Expected: FAIL — `Cannot find module '../functions/seasonConfig.js'`

- [ ] **Step 3: Create `functions/seasonConfig.js`**

Identical builder bodies to the browser wrapper — only the data load and export differ:

```javascript
// Season configuration for Firebase Functions (Node 20, CommonJS).
// Spec: claudedocs/specs/2026-08-07-season-config-centralization-design.md (v2)
//
// MIRROR: public/js/config/season-config.js carries identical builders — change both
// together (tests/season-config-drift.test.js enforces lockstep).
'use strict';

const SEASON_DATA = require('./season-data.json');

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

module.exports = { SEASON_CONFIG };
```

- [ ] **Step 4: Run the full new suite to verify everything passes**

Run: `npx jest --roots '<rootDir>/tests' tests/season-config-parity.test.js tests/season-config-drift.test.js 2>&1 | tail -5`
Expected: PASS — `Tests: 19 passed, 19 total` (15 parity + 4 drift)

- [ ] **Step 5: Commit**

```bash
git add tests/season-config-drift.test.js functions/seasonConfig.js
git commit -m "Phase 0: Functions season config wrapper + drift guard tests"
```

---

### Task 4: Hardcode guard script

**Files:**
- Create: `scripts/check-season-hardcodes.sh`

- [ ] **Step 1: Create `scripts/check-season-hardcodes.sh`**

```bash
#!/bin/bash
# Season hardcode guard — fails when season literals exist outside config/generated/archived files.
# Spec: claudedocs/specs/2026-08-07-season-config-centralization-design.md (v2), success criterion 2.
#
# Phases 0-4: EXPECTED TO FAIL — the file list is the migration progress meter.
# Phase 5 exit gate: this script passes, then it joins the pre-deploy checklist.
PATTERN='nerduniverse-20[0-9][0-9]|20[0-9][0-9]-09-0[0-9]'
MATCHES=$(rg -l -e "$PATTERN" public functions \
  --glob '!**/node_modules/**' \
  --glob '!**/season-data.js' \
  --glob '!**/season-data.json' \
  --glob '!**/season-config.js' \
  --glob '!**/seasonConfig.js' \
  --glob '!**/game-data/**' \
  --glob '!**/nfl_*_week_*.json' \
  --glob '!**/nfl_*_schedule_raw.json' \
  --glob '!**/nfl_*_week_*_corrected.json' \
  --glob '!**/archive/**' \
  --glob '!**/*BACKUP*' \
  2>/dev/null | sort)

if [ -n "$MATCHES" ]; then
  COUNT=$(echo "$MATCHES" | wc -l | tr -d ' ')
  echo "❌ Season hardcodes remain in ${COUNT} files:"
  echo "$MATCHES"
  exit 1
fi
echo "✅ No season hardcodes outside config."
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x scripts/check-season-hardcodes.sh`

- [ ] **Step 3: Verify it detects today's hardcodes (correct current behavior = failure)**

Run (works in bash and zsh):
```bash
OUT=$(./scripts/check-season-hardcodes.sh); CODE=$?; echo "$OUT" | head -3; echo "exit=$CODE"
```
Expected: `❌ Season hardcodes remain in N files:` where N is roughly 100-140, followed by file paths, and `exit=1`

- [ ] **Step 4: Verify the config files themselves are excluded**

Run: `./scripts/check-season-hardcodes.sh | rg 'season-data|season-config|seasonConfig'; echo "excluded-check exit=$? (1 means correctly excluded)"`
Expected: no file lines printed; `excluded-check exit=1 (1 means correctly excluded)`

- [ ] **Step 5: Commit**

```bash
git add scripts/check-season-hardcodes.sh
git commit -m "Phase 0: Season hardcode guard script (migration progress meter)"
```

---

### Task 5: Regression + Phase 0 exit checklist

**Files:** none created — verification only.

- [ ] **Step 1: Confirm the pre-existing Jest condition is unchanged from Task 1 Step 1**

Run: `npx jest pool-members-unit app-structure-simple 2>&1 | tail -5`
Expected: the same pre-existing failure recorded at the Task 1 baseline (unscoped Jest crashes on the truncated `auraglow/package.json` before running any tests). Phase 0 must not change this in either direction; Phase 0's own suites are verified via the scoped command in the exit checklist.

- [ ] **Step 2: Confirm the config caching requirement is already met (no firebase.json edit)**

Run: `rg -A2 '"source": "\*\*"' firebase.json | rg 'no-store'`
Expected: one line containing `no-cache, no-store, must-revalidate` — the global hosting header already prevents stale `season-config.js` after the annual flip. Do not edit firebase.json.

- [ ] **Step 3: Confirm nothing deploys from Phase 0**

Run: `git status --short`
Expected: clean tree (everything committed). No `firebase deploy` in this phase — the new files ship with the Phase 1 deploy after human sign-off.

**Phase 0 exit checklist:**
- [ ] `npx jest --roots '<rootDir>/tests' tests/season-config-parity.test.js tests/season-config-drift.test.js` → 19 passed
- [ ] Baseline unit tests unchanged
- [ ] Guard script runs, exits 1, lists ~100-140 files (the Phase 1-5 worklist), excludes config files
- [ ] Four commits on `claude/2026-season-config-plan-509f05`, tree clean
- [ ] No production deploy occurred

---

## What Phase 0 explicitly does NOT do

- No HTML page, bundle, or function is modified — `firebase-cache.js` lazy registration, the pool-scoped picks trigger, and the games rules block all land in Phase 1+
- No scraper changes (spec D4 is its own workstream)
- No deploy, no push to main — human review gates per the Diamond workflow
