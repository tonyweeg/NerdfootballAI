# Backend Season-Path Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every deployed Cloud Function and the one remaining admin page off year-less 2025 data paths and onto `SEASON_CONFIG.paths.*` builders, so the 2026 season reads and writes its own data instead of last season's.

**Architecture:** The season-config wrapper pair (`public/js/config/season-config.js` for the browser, `functions/seasonConfig.js` for Node) already owns every path in the system. Year ≤ 2025 resolves to the legacy tree `artifacts/nerdfootball/public/data/…`; year ≥ 2026 resolves to `artifacts/nerdfootball/pools/nerduniverse-{year}/…`. This migration adds five missing builders and swaps 26 hardcoded path literals onto them. No new behavior, no new features — the same reads and writes, pointed at the correct season.

**Tech Stack:** Node 20 Cloud Functions (Firebase Functions v2), Firestore, vanilla-JS browser pages loading `season-config.js` as a plain script, Jest for tests, a portable-grep guard script for enforcement.

---

## Why This Exists (read before starting)

On 2026-08-08 the owner noticed the survivor pool "was not reset" for the new season. Investigation found the live endpoint `getsurvivorpooldata` returning **0 alive / 50 eliminated** for pool `nerduniverse-2026`.

The endpoint correctly loads the 2026 pool's 54 members, then reads their survivor *picks* and the *game results* from year-less legacy paths still pointing at 2025 data. It replays the completed 2025 season — all 18 weeks of final results — and reports its ending state. Nobody survives a whole season of survivor, so every player is marked eliminated. The survivor pick page (`NerdSurvivorPicks.html`) gates on that endpoint, so all 50 participants would see the death screen and be unable to pick.

This is the same defect class as the 2026-08-08 confidence-pick incident (commit `bfc45cd`), on the server side. Path literals that contain no year string were invisible to the hardcode guard until the third pattern class was added during that hotfix; the frontend pages were fixed then, but 14 deployed backend files carrying the same literals were incorrectly written off as unreachable.

**Consequences if this is not fixed before 2026-09-09:**

- Survivor: every player locked out at the death screen.
- Weekly and season leaderboards: scored against 2025 picks.
- `updateLiveScores` and `realtimeGameSync`: live ESPN scores written **into the 2025 game documents**, so 2026 games never receive results, nothing ever reaches FINAL, and no confidence pool scoring happens at all.

---

## Ground Rules (non-negotiable, from the owner)

1. **2026 behaves exactly as 2025 did.** No new features, no new endpoints, nothing that was dormant last season becomes active. This migration only redirects paths.
2. **Never touch `auraglow/`.** It is a separate project with a corrupted `package.json`. All Jest runs must be scoped: `npx jest --roots '<rootDir>/tests' --`.
3. **2025 data is written off.** Do not restore, migrate, or delete the legacy tree. Leave it exactly where it sits; after this migration nothing in 2026 reads it.
4. **The season stops at week 18.** No playoff weeks, no clamps above 18.
5. **The 7 `pickAnalytics.js` functions stay unexported** from `index.js`. They were never deployed in 2025 and must not start now.
6. **Do not touch `easternTimeParser-v2.js` or the bare-Z `dt` convention.** Its early-firing skew is a known, deliberately preserved 2025 behavior. Changing it is a separate future project.
7. **Do not touch the `nerdfootball_users` tree** (6 references, 3 pages). Deprecated ghost-user tree, tracked separately.
8. Production Firestore writes and `firebase deploy` are run by the owner, not the agent. Hand him exact commands.

---

## File Structure

**Modified — config wrappers (must stay byte-mirrored except indentation):**
- `public/js/config/season-config.js` — add 5 path builders (12-space indent)
- `functions/seasonConfig.js` — add the same 5 builders (8-space indent)

**Modified — tests:**
- `tests/season-config-drift.test.js` — assert the new builders match across wrappers
- `tests/season-config-parity.test.js` — segment parity + 2025/2026 value snapshots

**Modified — deployed Cloud Functions (10 files, 21 sites):**
- `functions/survivorPoolCache.js` (3), `functions/survivorAutoUpdate.js` (1)
- `functions/weeklyLeaderboardCache.js` (3), `functions/seasonLeaderboardCache.js` (2)
- `functions/bulletproofWeeklyScoring.js` (2)
- `functions/updateLiveScores.js` (1), `functions/realtimeGameSync.js` (1), `functions/espnScoreMonitor.js` (3)
- `functions/espnNerdApi.js` (1), `functions/index.js` (2)

**Modified — deployed 2025 forensic tools (5 files, 5 sites), pinned to an explicit 2025:**
- `functions/fixWeek3Data.js`, `functions/verifyWeeksData.js`, `functions/diagnosticWeeksData.js`, `functions/cleanWeek4Games.js`, `functions/forceUpdateGame401.js`

**Modified — frontend admin page (1 file, 9 sites):**
- `public/straight-cache-homey.html`

**Modified — guard:**
- `scripts/check-season-hardcodes.sh` — fourth pattern class for `_20XX` document names

**Created:**
- `scripts/reset-season-survivor-state.js` — clears the stale 2025 survivor block from the 2026 members doc

**Explicitly NOT changed (verified correct — do not "fix" these):**
- `functions/index.js:1150` — `artifacts/nerdfootball/users/{userId}/survivor_picks/{poolId}`. The `poolId` segment is already `nerduniverse-2026`, so this path is season-scoped as written.
- `functions/pickAnalytics.js` — dormant, intentionally excluded from the guard.
- `functions/leaderboardCache.js`, `justRunWeek4.js`, `simpleWeeklyScoring.js`, `weeklyScoring.js`, `survivorCacheUpdater.js` — carry legacy literals but are **not exported** from `index.js`. Confirm with `grep -n "exports\." functions/index.js` before assuming; leave them alone.

---

## Task 1: Add the five missing path builders

Five paths in the deployed code have no builder yet: three season cache documents, the ESPN schedule cache document, and the survivor-picks *collection* (as opposed to a single user's document). Write the tests first.

**Files:**
- Test: `tests/season-config-parity.test.js`
- Test: `tests/season-config-drift.test.js`
- Modify: `public/js/config/season-config.js:124` (the `espnCache` line)
- Modify: `functions/seasonConfig.js:110` (the `espnCache` line)

- [ ] **Step 1: Write the failing value-snapshot test**

Append to the end of `tests/season-config-parity.test.js`. The 2025 strings are the exact document names production used all last season — they are the regression guarantee that this refactor changes nothing for historical data.

```javascript
describe('season cache and collection builders (added 2026-08-08 backend migration)', () => {
    test('2025 values reproduce the literals production used all last season', () => {
        expect(CFG.paths.survivorPoolCache(2025)).toBe('cache/survivor_pool_2025');
        expect(CFG.paths.seasonLeaderboardCache(2025)).toBe('cache/season_leaderboard_2025');
        expect(CFG.paths.weeklyLeaderboardCache(4, 2025)).toBe('cache/weekly_leaderboard_2025_week_4');
        expect(CFG.paths.espnScheduleCache(2025)).toBe('artifacts/nerdfootball/espn/schedule_2025');
        expect(CFG.paths.survivorPicksAll(2025)).toBe('artifacts/nerdfootball/public/data/nerdSurvivor_picks');
    });

    test('2026 values carry the new season year and the pool-scoped tree', () => {
        expect(CFG.paths.survivorPoolCache(2026)).toBe('cache/survivor_pool_2026');
        expect(CFG.paths.seasonLeaderboardCache(2026)).toBe('cache/season_leaderboard_2026');
        expect(CFG.paths.weeklyLeaderboardCache(4, 2026)).toBe('cache/weekly_leaderboard_2026_week_4');
        expect(CFG.paths.espnScheduleCache(2026)).toBe('artifacts/nerdfootball/espn/schedule_2026');
        expect(CFG.paths.survivorPicksAll(2026))
            .toBe('artifacts/nerdfootball/pools/nerduniverse-2026/nerdSurvivor_picks');
    });

    test('week and year arguments are validated like every other builder', () => {
        expect(() => CFG.paths.weeklyLeaderboardCache(0, 2026)).toThrow();
        expect(() => CFG.paths.weeklyLeaderboardCache(19, 2026)).toThrow();
        expect(() => CFG.paths.survivorPoolCache(null)).toThrow();
    });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd /Users/tonyweeg/nerdfootball-project && npx jest --roots '<rootDir>/tests' -- season-config-parity
```

Expected: FAIL — `CFG.paths.survivorPoolCache is not a function`.

- [ ] **Step 3: Add the builders to the browser wrapper**

In `public/js/config/season-config.js`, replace this line (12-space indent, currently line 124):

```javascript
            espnCache: () => 'cache/espn_current_data'
```

with:

```javascript
            espnCache: () => 'cache/espn_current_data',

            // Season-scoped cache documents. These live in the top-level `cache`
            // collection (unchanged shape); only the year in the document name moves.
            survivorPoolCache: (year) => `cache/survivor_pool_${resolveYear(year)}`,
            seasonLeaderboardCache: (year) => `cache/season_leaderboard_${resolveYear(year)}`,
            weeklyLeaderboardCache: (week, year) =>
                `cache/weekly_leaderboard_${resolveYear(year)}_week_${reqWeek(week)}`,
            espnScheduleCache: (year) =>
                `artifacts/nerdfootball/espn/schedule_${resolveYear(year)}`,
            // COLLECTION reference (all users' survivor picks), not a document —
            // espnScoreMonitor sweeps every user's picks to resolve eliminations.
            survivorPicksAll: (year) => `${dataRoot(year)}/nerdSurvivor_picks`
```

- [ ] **Step 4: Add the identical builders to the functions wrapper**

In `functions/seasonConfig.js`, make the same replacement at the `espnCache` line (currently line 110), with **8-space** indentation to match that file:

```javascript
        espnCache: () => 'cache/espn_current_data',

        // Season-scoped cache documents. These live in the top-level `cache`
        // collection (unchanged shape); only the year in the document name moves.
        survivorPoolCache: (year) => `cache/survivor_pool_${resolveYear(year)}`,
        seasonLeaderboardCache: (year) => `cache/season_leaderboard_${resolveYear(year)}`,
        weeklyLeaderboardCache: (week, year) =>
            `cache/weekly_leaderboard_${resolveYear(year)}_week_${reqWeek(week)}`,
        espnScheduleCache: (year) =>
            `artifacts/nerdfootball/espn/schedule_${resolveYear(year)}`,
        // COLLECTION reference (all users' survivor picks), not a document —
        // espnScoreMonitor sweeps every user's picks to resolve eliminations.
        survivorPicksAll: (year) => `${dataRoot(year)}/nerdSurvivor_picks`
```

- [ ] **Step 5: Register the new builders in the segment-parity test**

The parity suite fails loudly when a builder exists without an argument list. In `tests/season-config-parity.test.js`, extend `COLLECTION_BUILDERS` — `survivorPicksAll` names a collection (odd segment count), like `picksWeek`:

```javascript
        const COLLECTION_BUILDERS = new Set(['picksWeek', 'survivorPicksAll']);
```

Then add these five entries to the `argsFor` map, immediately after the `espnCache: () => []` line (add a comma to that line):

```javascript
            espnCache: () => [],
            survivorPoolCache: (year) => [year],
            seasonLeaderboardCache: (year) => [year],
            weeklyLeaderboardCache: (year) => [week, year],
            espnScheduleCache: (year) => [year],
            survivorPicksAll: (year) => [year]
```

- [ ] **Step 6: Add the new builders to the drift guard**

In `tests/season-config-drift.test.js`, inside the test `every path builder identical across years, weeks, and users`, add these four lines next to the other year-only builders (after the `survivorDisplayCache` line):

```javascript
            expect(nodeConfig.paths.survivorPoolCache(year)).toBe(browserConfig.paths.survivorPoolCache(year));
            expect(nodeConfig.paths.seasonLeaderboardCache(year)).toBe(browserConfig.paths.seasonLeaderboardCache(year));
            expect(nodeConfig.paths.espnScheduleCache(year)).toBe(browserConfig.paths.espnScheduleCache(year));
            expect(nodeConfig.paths.survivorPicksAll(year)).toBe(browserConfig.paths.survivorPicksAll(year));
```

and this line inside the `for (const week of weeks)` loop:

```javascript
                expect(nodeConfig.paths.weeklyLeaderboardCache(week, year)).toBe(browserConfig.paths.weeklyLeaderboardCache(week, year));
```

- [ ] **Step 7: Run the full suite**

```bash
cd /Users/tonyweeg/nerdfootball-project && npx jest --roots '<rootDir>/tests' --
```

Expected: all tests pass. The parity suite's coverage-width assertion now reports 26 builders × 2 years.

- [ ] **Step 8: Commit**

```bash
git add public/js/config/season-config.js functions/seasonConfig.js tests/season-config-parity.test.js tests/season-config-drift.test.js && git commit -m "Add season cache + survivor-collection path builders"
```

---

## Task 2: Survivor pipeline (fixes the visible breakage)

Five sites. After this task the live endpoint should report real 2026 numbers instead of 0 alive.

**Files:**
- Modify: `functions/survivorPoolCache.js:56`, `:212`, `:402`
- Modify: `functions/survivorAutoUpdate.js:113`
- Modify: `functions/espnScoreMonitor.js:186`

All three files already import `SEASON_CONFIG` at the top — no new imports needed. Verify with `grep -n "require('./seasonConfig')" functions/survivorPoolCache.js`.

- [ ] **Step 1: `survivorPoolCache.js:56` — the cache document**

Replace:

```javascript
const SURVIVOR_CACHE_PATH = 'cache/survivor_pool_2025';
```

with:

```javascript
const SURVIVOR_CACHE_PATH = SEASON_CONFIG.paths.survivorPoolCache();
```

- [ ] **Step 2: `survivorPoolCache.js:212` — survivor picks read**

Replace:

```javascript
            const survivorPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${memberId}`;
```

with:

```javascript
            const survivorPicksPath = SEASON_CONFIG.paths.survivorPicks(memberId);
```

- [ ] **Step 3: `survivorPoolCache.js:402` — game results read**

Replace:

```javascript
            const weekPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;
```

with:

```javascript
            const weekPath = SEASON_CONFIG.paths.games(week);
```

- [ ] **Step 4: `survivorAutoUpdate.js:113` — elimination processing read**

Replace:

```javascript
            const individualPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;
```

with:

```javascript
            const individualPicksPath = SEASON_CONFIG.paths.survivorPicks(userId);
```

- [ ] **Step 5: `espnScoreMonitor.js:186` — survivor picks collection sweep**

Replace:

```javascript
        const survivorPicksPath = 'artifacts/nerdfootball/public/data/nerdSurvivor_picks';
```

with:

```javascript
        const survivorPicksPath = SEASON_CONFIG.paths.survivorPicksAll();
```

- [ ] **Step 6: Verify the files parse and the paths resolve**

```bash
cd /Users/tonyweeg/nerdfootball-project/functions && node -e "
const { SEASON_CONFIG: C } = require('./seasonConfig');
['survivorPoolCache.js','survivorAutoUpdate.js','espnScoreMonitor.js'].forEach(f => { require('./' + f); console.log('parsed OK:', f); });
console.log('survivorPoolCache ->', C.paths.survivorPoolCache());
console.log('survivorPicks     ->', C.paths.survivorPicks('UID123'));
console.log('survivorPicksAll  ->', C.paths.survivorPicksAll());
console.log('games(1)          ->', C.paths.games(1));
"
```

Expected output (all four paths must contain `nerduniverse-2026`, except the cache doc which must read `survivor_pool_2026`):

```
survivorPoolCache -> cache/survivor_pool_2026
survivorPicks     -> artifacts/nerdfootball/pools/nerduniverse-2026/nerdSurvivor_picks/UID123
survivorPicksAll  -> artifacts/nerdfootball/pools/nerduniverse-2026/nerdSurvivor_picks
games(1)          -> artifacts/nerdfootball/pools/nerduniverse-2026/nerdfootball_games/1
```

- [ ] **Step 7: Commit**

```bash
git add functions/survivorPoolCache.js functions/survivorAutoUpdate.js functions/espnScoreMonitor.js && git commit -m "Survivor pipeline reads 2026 picks and games, not 2025"
```

---

## Task 3: Scoring engine and leaderboard caches

Seven sites across three files. All three already import `SEASON_CONFIG`.

**Files:**
- Modify: `functions/bulletproofWeeklyScoring.js:36`, `:91`
- Modify: `functions/weeklyLeaderboardCache.js:19`, `:213`, `:379`
- Modify: `functions/seasonLeaderboardCache.js:17`, `:295`

- [ ] **Step 1: `bulletproofWeeklyScoring.js:36` — game data read**

Replace:

```javascript
            const bibleRef = admin.firestore().doc(`artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`);
```

with:

```javascript
            const bibleRef = admin.firestore().doc(SEASON_CONFIG.paths.games(weekNumber));
```

- [ ] **Step 2: `bulletproofWeeklyScoring.js:91` — user picks read**

Replace:

```javascript
    const picksRef = admin.firestore().doc(`artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions/${userId}`);
```

with:

```javascript
    const picksRef = admin.firestore().doc(SEASON_CONFIG.paths.picks(weekNumber, userId));
```

- [ ] **Step 3: `weeklyLeaderboardCache.js:19` — cache document prefix**

This constant is consumed at lines 40 and 117 as `` `${CACHE_PATH_PREFIX}${weekNumber}` ``. Because the year now sits in the middle of the document name, a prefix no longer works — replace the constant with a function so both call sites stay one-liners.

Replace:

```javascript
const CACHE_PATH_PREFIX = 'cache/weekly_leaderboard_2025_week_';
```

with:

```javascript
const cachePathForWeek = (weekNumber) => SEASON_CONFIG.paths.weeklyLeaderboardCache(weekNumber);
```

- [ ] **Step 4: `weeklyLeaderboardCache.js` — update both consumers**

At line 40 **and** line 117, replace this identical line:

```javascript
            const cacheRef = db.doc(`${CACHE_PATH_PREFIX}${weekNumber}`);
```

with:

```javascript
            const cacheRef = db.doc(cachePathForWeek(weekNumber));
```

Confirm none remain: `grep -n "CACHE_PATH_PREFIX" functions/weeklyLeaderboardCache.js` must print nothing.

- [ ] **Step 5: `weeklyLeaderboardCache.js:213` — user picks read**

Replace:

```javascript
            const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions/${memberId}`;
```

with:

```javascript
            const picksPath = SEASON_CONFIG.paths.picks(weekNumber, memberId);
```

- [ ] **Step 6: `weeklyLeaderboardCache.js:379` — game results read**

Replace:

```javascript
        const gameResultsPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`;
```

with:

```javascript
        const gameResultsPath = SEASON_CONFIG.paths.games(weekNumber);
```

- [ ] **Step 7: `seasonLeaderboardCache.js:17` — cache document**

Replace:

```javascript
const CACHE_PATH = 'cache/season_leaderboard_2025';
```

with:

```javascript
const CACHE_PATH = SEASON_CONFIG.paths.seasonLeaderboardCache();
```

Both consumers (lines 30 and 95) use the bare constant and need no change.

- [ ] **Step 8: `seasonLeaderboardCache.js:295` — game results read**

Replace:

```javascript
            const gameResultsPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;
```

with:

```javascript
            const gameResultsPath = SEASON_CONFIG.paths.games(week);
```

- [ ] **Step 9: Verify all three parse and resolve**

```bash
cd /Users/tonyweeg/nerdfootball-project/functions && node -e "
const { SEASON_CONFIG: C } = require('./seasonConfig');
['bulletproofWeeklyScoring.js','weeklyLeaderboardCache.js','seasonLeaderboardCache.js'].forEach(f => { require('./' + f); console.log('parsed OK:', f); });
console.log('weeklyLeaderboardCache(4) ->', C.paths.weeklyLeaderboardCache(4));
console.log('seasonLeaderboardCache    ->', C.paths.seasonLeaderboardCache());
console.log('picks(4, UID123)          ->', C.paths.picks(4, 'UID123'));
"
```

Expected: `cache/weekly_leaderboard_2026_week_4`, `cache/season_leaderboard_2026`, and a `nerduniverse-2026` picks path.

- [ ] **Step 10: Commit**

```bash
git add functions/bulletproofWeeklyScoring.js functions/weeklyLeaderboardCache.js functions/seasonLeaderboardCache.js && git commit -m "Scoring engine and leaderboard caches read and write the 2026 season"
```

---

## Task 4: Game-result writers

The highest-consequence task: two of these sites **write**. Left unchanged they push 2026 live scores into 2025 documents, and 2026 games never reach FINAL.

**Files:**
- Modify: `functions/updateLiveScores.js:76`
- Modify: `functions/realtimeGameSync.js:180`
- Modify: `functions/espnScoreMonitor.js:155`, `:306`
- Modify: `functions/espnNerdApi.js:453`

- [ ] **Step 1: `updateLiveScores.js:76` — live score WRITE target**

Replace:

```javascript
            const week4DocRef = db.doc(`artifacts/nerdfootball/public/data/nerdfootball_games/${currentWeek}`);
```

with (the variable is renamed because `week4DocRef` is a leftover from a week-4 hotfix and now holds the current week — the name is actively misleading in a write path):

```javascript
            const gamesDocRef = db.doc(SEASON_CONFIG.paths.games(currentWeek));
```

Then update every other use of the old name in the same function:

```bash
grep -n "week4DocRef" functions/updateLiveScores.js
```

Replace each remaining `week4DocRef` with `gamesDocRef`. Re-run the grep; it must print nothing.

- [ ] **Step 2: `realtimeGameSync.js:180` — bible data WRITE target**

Replace:

```javascript
                const biblePath = `artifacts/nerdfootball/public/data/nerdfootball_games/${currentWeek}`;
```

with:

```javascript
                const biblePath = SEASON_CONFIG.paths.games(currentWeek);
```

- [ ] **Step 3: `espnScoreMonitor.js:155` — per-game update WRITE target**

Replace:

```javascript
        const gamesPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;
```

with:

```javascript
        const gamesPath = SEASON_CONFIG.paths.games(week);
```

- [ ] **Step 4: `espnScoreMonitor.js:306` — existing-games read**

Replace:

```javascript
        const gamesPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${currentWeek}`;
```

with:

```javascript
        const gamesPath = SEASON_CONFIG.paths.games(currentWeek);
```

- [ ] **Step 5: `espnNerdApi.js:453` — ESPN schedule cache document**

Replace:

```javascript
            const docRef = db.collection('artifacts').doc('nerdfootball').collection('espn').doc('schedule_2025');
```

with:

```javascript
            const docRef = db.doc(SEASON_CONFIG.paths.espnScheduleCache());
```

- [ ] **Step 6: Verify no legacy game literals remain in any deployed writer**

```bash
cd /Users/tonyweeg/nerdfootball-project && grep -nE "artifacts/nerdfootball/public/data/nerdfootball_games" functions/updateLiveScores.js functions/realtimeGameSync.js functions/espnScoreMonitor.js
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add functions/updateLiveScores.js functions/realtimeGameSync.js functions/espnScoreMonitor.js functions/espnNerdApi.js && git commit -m "Live score and ESPN writers target the 2026 game documents"
```

---

## Task 5: index.js and the five 2025 forensic tools

`index.js` has two live sites. The five forensic tools are deployed HTTP endpoints written to repair specific 2025 weeks; their job is done, but they are footguns because two of them write. Rather than delete them (which would change the deployed surface and violate ground rule 1), pin them to an **explicit** 2025 so intent is visible in the code and the guard is satisfied.

**Files:**
- Modify: `functions/index.js:643`, `:1072`
- Modify: `functions/fixWeek3Data.js:162`, `verifyWeeksData.js:27`, `diagnosticWeeksData.js:27`, `cleanWeek4Games.js:10`, `forceUpdateGame401.js:10`

- [ ] **Step 1: `index.js:643` — admin pick deletion**

Replace:

```javascript
                await db.doc(`artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions/${userId}`).delete();
```

with:

```javascript
                await db.doc(SEASON_CONFIG.paths.picks(week, userId)).delete();
```

- [ ] **Step 2: `index.js:1072` — results read**

Replace:

```javascript
                .doc(`artifacts/nerdfootball/public/data/nerdfootball_results/${week}`)
```

with:

```javascript
                .doc(SEASON_CONFIG.paths.results(week))
```

- [ ] **Step 3: Add the config import to each forensic tool**

None of the five import `SEASON_CONFIG`. Add this line to each file immediately after its existing `require` block:

```javascript
const { SEASON_CONFIG } = require('./seasonConfig');
```

- [ ] **Step 4: Pin each forensic tool to an explicit 2025**

`SEASON_CONFIG.paths.games(week, 2025)` resolves to the legacy tree by design, so behavior is byte-identical to the current literals while making the 2025 scope explicit and self-documenting.

`fixWeek3Data.js:162` — replace:

```javascript
            const docRef = db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/3');
```

with:

```javascript
            // 2025-only forensic repair tool; pinned to the legacy season deliberately.
            const docRef = db.doc(SEASON_CONFIG.paths.games(3, 2025));
```

`verifyWeeksData.js:27` and `diagnosticWeeksData.js:27` — replace this identical line in both:

```javascript
                const docRef = db.doc(`artifacts/nerdfootball/public/data/nerdfootball_games/${week}`);
```

with:

```javascript
                // 2025-only diagnostic tool; pinned to the legacy season deliberately.
                const docRef = db.doc(SEASON_CONFIG.paths.games(week, 2025));
```

`cleanWeek4Games.js:10` — replace:

```javascript
        const week4DocRef = db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/4');
```

with:

```javascript
        // 2025-only repair tool (WRITES); pinned to the legacy season deliberately.
        const week4DocRef = db.doc(SEASON_CONFIG.paths.games(4, 2025));
```

`forceUpdateGame401.js:10` — replace:

```javascript
        const gamesPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/4';
```

with:

```javascript
        // 2025-only repair tool (WRITES); pinned to the legacy season deliberately.
        const gamesPath = SEASON_CONFIG.paths.games(4, 2025);
```

- [ ] **Step 5: Verify every file still loads and the pinned paths are unchanged**

```bash
cd /Users/tonyweeg/nerdfootball-project/functions && node -e "
const { SEASON_CONFIG: C } = require('./seasonConfig');
['index.js','fixWeek3Data.js','verifyWeeksData.js','diagnosticWeeksData.js','cleanWeek4Games.js','forceUpdateGame401.js'].forEach(f => { require('./' + f); console.log('parsed OK:', f); });
const pinned = C.paths.games(4, 2025);
console.log('pinned 2025 games(4) ->', pinned);
if (pinned !== 'artifacts/nerdfootball/public/data/nerdfootball_games/4') { throw new Error('PINNED PATH CHANGED — behavior is not identical'); }
console.log('pinned path verified byte-identical to the old literal');
"
```

Expected: every file parses, and the pinned-path assertion passes.

- [ ] **Step 6: Confirm the deployed surface is unchanged**

```bash
cd /Users/tonyweeg/nerdfootball-project/functions && grep -c "^exports\." index.js
```

Expected: `50` — the same count as before this plan started. If it changed, an export was added or lost; revert and investigate.

- [ ] **Step 7: Commit**

```bash
git add functions/index.js functions/fixWeek3Data.js functions/verifyWeeksData.js functions/diagnosticWeeksData.js functions/cleanWeek4Games.js functions/forceUpdateGame401.js && git commit -m "index.js on 2026 paths; 2025 forensic tools pinned to an explicit legacy year"
```

---

## Task 6: `straight-cache-homey.html` admin page

Nine sites: six live `doc()` calls and three display labels. The page already loads `season-config.js` at line 262 and already uses builders elsewhere (`aiCache` at line 570, `gridCache` at 689), so follow that established pattern.

**Files:**
- Modify: `public/straight-cache-homey.html` lines 360, 389, 421, 616, 640, 663, 865, 869, 872

- [ ] **Step 1: The three display labels**

Line 360 — replace:

```html
                        <p class="text-xs text-purple-300 break-all">cache/season_leaderboard_2025</p>
```

with:

```html
                        <p class="text-xs text-purple-300 break-all" id="seasonCachePathDisplay"></p>
```

Line 389 — replace:

```html
                        <p class="text-xs text-purple-300 break-all">cache/weekly_leaderboard_2025_week_*</p>
```

with:

```html
                        <p class="text-xs text-purple-300 break-all" id="weeklyCachePathDisplay"></p>
```

Line 421 — replace:

```html
                        <p class="text-xs text-purple-300 break-all">cache/survivor_pool_2025</p>
```

with:

```html
                        <p class="text-xs text-purple-300 break-all" id="survivorCachePathDisplay"></p>
```

- [ ] **Step 2: Populate the new labels**

Find line 512, which already populates a path label:

```javascript
        document.getElementById('aiCachePathDisplay').textContent = window.SEASON_CONFIG.paths.aiCache();
```

Add these three lines directly beneath it:

```javascript
        document.getElementById('seasonCachePathDisplay').textContent = window.SEASON_CONFIG.paths.seasonLeaderboardCache();
        document.getElementById('weeklyCachePathDisplay').textContent = window.SEASON_CONFIG.paths.weeklyLeaderboardCache(1).replace(/_week_1$/, '_week_*');
        document.getElementById('survivorCachePathDisplay').textContent = window.SEASON_CONFIG.paths.survivorPoolCache();
```

- [ ] **Step 3: The six live document references**

Line 616 — replace `doc(db, 'cache', 'season_leaderboard_2025')` with:

```javascript
                const cacheRef = doc(db, window.SEASON_CONFIG.paths.seasonLeaderboardCache());
```

Line 640 — replace `` doc(db, 'cache', `weekly_leaderboard_2025_week_${currentWeek}`) `` with:

```javascript
                const cacheRef = doc(db, window.SEASON_CONFIG.paths.weeklyLeaderboardCache(currentWeek));
```

Line 663 — replace `doc(db, 'cache', 'survivor_pool_2025')` with:

```javascript
                const cacheRef = doc(db, window.SEASON_CONFIG.paths.survivorPoolCache());
```

Lines 865, 869, 872 — the switch statement. Replace the three assignments with:

```javascript
                    case 'season':
                        cacheRef = doc(db, window.SEASON_CONFIG.paths.seasonLeaderboardCache());
                        break;
                    case 'weekly':
                        const week = getCurrentNFLWeek();
                        cacheRef = doc(db, window.SEASON_CONFIG.paths.weeklyLeaderboardCache(week));
                        break;
                    case 'survivor':
                        cacheRef = doc(db, window.SEASON_CONFIG.paths.survivorPoolCache());
                        break;
```

Note: `doc(db, path)` with a single slash-delimited string is the same call shape already used at line 570 — do not split the path into segments.

- [ ] **Step 4: Verify the page is clean**

```bash
cd /Users/tonyweeg/nerdfootball-project && grep -nE "_2025|nerdfootball/public/data" public/straight-cache-homey.html
```

Expected: no output.

- [ ] **Step 5: Fix the stale emergency-recovery instruction in the docs page**

`public/nerd-football-caching-and-scoring-process.html:674` documents a manual cache-clear step that names the 2025 document. Left alone it tells whoever is doing emergency recovery in 2026 to delete the wrong document. Replace:

```
# Delete document: /cache/weekly_leaderboard_2025_week_{N}
```

with:

```
# Delete document: /cache/weekly_leaderboard_{SEASON_YEAR}_week_{N}
```

- [ ] **Step 6: Commit**

```bash
git add public/straight-cache-homey.html public/nerd-football-caching-and-scoring-process.html && git commit -m "Cache admin page reads season cache paths from config; docs name the year generically"
```

---

## Task 7: Close the guard gap

The guard cannot currently see document names that embed a year without a path prefix (`cache/survivor_pool_2025`). That blind spot is why this whole class survived the previous migration. Add a fourth pattern class.

**Files:**
- Modify: `scripts/check-season-hardcodes.sh:23`

- [ ] **Step 1: Extend the pattern**

Replace the `PATTERN=` line:

```bash
PATTERN='nerduniverse-20[0-9][0-9]|20[0-9][0-9]-09-0[0-9]|artifacts/nerdfootball/public/data/(nerdfootball_picks|nerdfootball_results|nerdfootball_games|nerdSurvivor_)'
```

with:

```bash
# Fourth pattern class added 2026-08-08: season-year-suffixed DOCUMENT names
# (cache/survivor_pool_2025, cache/weekly_leaderboard_2025_week_N, espn/schedule_2025).
# These carry a year but no path prefix the earlier classes recognized, so the guard
# was blind to them while 14 deployed functions read and wrote last season's data.
PATTERN='nerduniverse-20[0-9][0-9]|20[0-9][0-9]-09-0[0-9]|artifacts/nerdfootball/public/data/(nerdfootball_picks|nerdfootball_results|nerdfootball_games|nerdSurvivor_)|(survivor_pool|season_leaderboard|weekly_leaderboard|schedule)_20[0-9][0-9]'
```

- [ ] **Step 2: Run the guard and record the result**

```bash
cd /Users/tonyweeg/nerdfootball-project && ./scripts/check-season-hardcodes.sh; echo "exit=$?"
```

The guard will still list files — the dead register (`public/backups` is excluded, but unreferenced pages and the non-exported functions modules are not). That is expected and pre-existing. What matters is the **live surface**, checked in the next step.

One file will be newly and permanently flagged by the fourth class: `functions/leaderboardCache.js`, which holds `cache/season_leaderboard_2025` but is **not exported** from `index.js` (it is a superseded twin of `seasonLeaderboardCache.js`). Leave it flagged rather than editing dead code — a guard hit on an unreachable file is the correct signal, and deleting the file is a separate cleanup decision for the owner. Verified 2026-08-08: the fourth class matches exactly seven files, all accounted for by this plan (`straight-cache-homey.html`, `nerd-football-caching-and-scoring-process.html`, `seasonLeaderboardCache.js`, `survivorPoolCache.js`, `weeklyLeaderboardCache.js`, `espnNerdApi.js`) or by this paragraph (`leaderboardCache.js`).

- [ ] **Step 3: Prove every live file is clean**

```bash
cd /Users/tonyweeg/nerdfootball-project && ./scripts/check-season-hardcodes.sh 2>/dev/null | grep -E "functions/(survivorPoolCache|survivorAutoUpdate|weeklyLeaderboardCache|seasonLeaderboardCache|bulletproofWeeklyScoring|updateLiveScores|realtimeGameSync|espnScoreMonitor|espnNerdApi|index|fixWeek3Data|verifyWeeksData|diagnosticWeeksData|cleanWeek4Games|forceUpdateGame401)\.js|public/straight-cache-homey\.html"; echo "matches=$?"
```

Expected: no output and `matches=1` (grep found nothing). If any of those 16 files is listed, it still contains a hardcode — fix it before continuing.

- [ ] **Step 4: Also verify the non-deployed leftovers are genuinely unexported**

`functions/leaderboardCache.js` and `scripts/clear-week4-cache.js` still contain 2025 literals and are intentionally untouched. Confirm they are not reachable:

```bash
cd /Users/tonyweeg/nerdfootball-project/functions && grep -nE "require\('\./(leaderboardCache|justRunWeek4|simpleWeeklyScoring|weeklyScoring|survivorCacheUpdater)'\)" index.js
```

Expected: no output. If any of them **is** required by `index.js`, stop and report — the scope of this plan was assessed on the assumption they are not.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-season-hardcodes.sh && git commit -m "Guard: fourth pattern class for year-suffixed cache document names"
```

---

## Task 8: Reset the stale survivor block in the 2026 members document

Provisioning copied all 54 members forward from 2025, including each member's embedded `survivor` block: 2025 pick history for 48 of them, and a 2025 `eliminationWeek` for six (Erik Weeg, Rob Altork, Andrew Kaufman, jim weeg, Turtlephoot, Scot Dailey). Two admin surfaces read that block.

**Deleting the block is the correct reset, not zeroing it.** Four members went through all of 2025 with no `survivor` block at all, and the reader at `public/survivor-admin-enhanced.js:75` is written as `if (userData.survivor) { … }` — absence is a state production already handles. Deleting is honest; fabricating a zero-state block is not.

`participation.survivor` (`enabled` / `status`) is the roster flag and is **already correct** — 51 enabled, 3 removed. The script must not touch it.

**Files:**
- Create: `scripts/reset-season-survivor-state.js`

- [ ] **Step 1: Write the script**

```javascript
#!/usr/bin/env node
/**
 * Clears the embedded per-member `survivor` block from a season's pool members
 * document. Provisioning copies members forward from the prior season, which also
 * carries that season's pick history and elimination weeks into the new year.
 *
 * Deletes ONLY the `survivor` key. Never touches `participation.survivor`, which is
 * the roster enabled/removed flag and is provisioned correctly.
 *
 * Usage (from the functions directory, so firebase-admin resolves):
 *   cd functions
 *   env -u GOOGLE_APPLICATION_CREDENTIALS GOOGLE_CLOUD_PROJECT=nerdfootball \
 *     node ../scripts/reset-season-survivor-state.js --year=2026 --dry-run
 *   env -u GOOGLE_APPLICATION_CREDENTIALS GOOGLE_CLOUD_PROJECT=nerdfootball \
 *     node ../scripts/reset-season-survivor-state.js --year=2026 --confirm
 */
const admin = require('firebase-admin');

const args = process.argv.slice(2);
const yearArg = args.find((a) => a.startsWith('--year='));
const dryRun = args.includes('--dry-run');
const confirmed = args.includes('--confirm');

if (!yearArg) {
    console.error('❌ --year=YYYY is required');
    process.exit(2);
}
const year = Number(yearArg.split('=')[1]);
if (!Number.isInteger(year) || year < 2026 || year > 2100) {
    console.error(`❌ refusing to run for year ${year}: only 2026+ may be reset (prior seasons are historical records)`);
    process.exit(2);
}
if (!dryRun && !confirmed) {
    console.error('❌ pass --dry-run to preview, or --confirm to write');
    process.exit(2);
}

admin.initializeApp({ projectId: 'nerdfootball' });
const db = admin.firestore();
const membersPath = `artifacts/nerdfootball/pools/nerduniverse-${year}/metadata/members`;

(async () => {
    const snap = await db.doc(membersPath).get();
    if (!snap.exists) {
        console.error(`❌ members document not found: ${membersPath}`);
        process.exit(1);
    }

    const members = snap.data();
    const uids = Object.keys(members);
    const carrying = uids.filter((uid) => members[uid].survivor !== undefined);

    console.log(`NERDCHECK: ${membersPath}`);
    console.log(`NERDCHECK: ${uids.length} members, ${carrying.length} carrying a stale survivor block`);
    for (const uid of carrying) {
        const s = members[uid].survivor || {};
        const elim = s.eliminationWeek ? ` eliminationWeek=${s.eliminationWeek}` : '';
        const hist = s.pickHistory ? ` pickHistory="${String(s.pickHistory).slice(0, 60)}"` : '';
        console.log(`  - ${members[uid].displayName || uid}:${elim}${hist}`);
    }

    if (carrying.length === 0) {
        console.log('✅ nothing to reset — already clean');
        process.exit(0);
    }
    if (dryRun) {
        console.log(`\nDRY RUN — no writes. Re-run with --confirm to delete ${carrying.length} survivor blocks.`);
        process.exit(0);
    }

    const updates = {};
    for (const uid of carrying) {
        updates[`${uid}.survivor`] = admin.firestore.FieldValue.delete();
    }
    await db.doc(membersPath).update(updates);

    // Verify by reading back, not by trusting the write.
    const after = (await db.doc(membersPath).get()).data();
    const remaining = Object.keys(after).filter((uid) => after[uid].survivor !== undefined);
    const rosterIntact = Object.keys(after).length === uids.length &&
        Object.keys(after).every((uid) => after[uid].participation?.survivor !== undefined ||
            members[uid].participation?.survivor === undefined);

    if (remaining.length > 0) {
        console.error(`❌ ${remaining.length} survivor blocks still present after write`);
        process.exit(1);
    }
    if (!rosterIntact) {
        console.error('❌ participation flags changed — this script must never touch them');
        process.exit(1);
    }
    console.log(`\n✅ deleted ${carrying.length} stale survivor blocks`);
    console.log(`✅ ${Object.keys(after).length} members intact, participation flags untouched`);
    process.exit(0);
})().catch((e) => {
    console.error('❌ failed:', e.message);
    process.exit(1);
});
```

- [ ] **Step 2: Dry run (safe, read-only)**

```bash
cd /Users/tonyweeg/nerdfootball-project/functions && env -u GOOGLE_APPLICATION_CREDENTIALS GOOGLE_CLOUD_PROJECT=nerdfootball node ../scripts/reset-season-survivor-state.js --year=2026 --dry-run
```

Expected: 54 members, 50 carrying a stale block, six listed with an `eliminationWeek`, and no writes.

- [ ] **Step 3: Commit the script (do not run the write yet)**

```bash
git add scripts/reset-season-survivor-state.js && git commit -m "Add annual survivor-state reset tool for provisioned seasons"
```

The `--confirm` run happens in Task 9 as an owner-executed step.

---

## Task 9: Full verification, deploy, and production proof

- [ ] **Step 1: Full test suite**

```bash
cd /Users/tonyweeg/nerdfootball-project && npx jest --roots '<rootDir>/tests' --
```

Expected: all suites pass. Never drop the `--roots`/`--` scoping — an unscoped run crashes on `auraglow/package.json`.

- [ ] **Step 2: Every deployed module still loads**

`index.js` initializes the Realtime Database at load, so a bare `require` fails with "Can't determine Firebase Database URL" — that is an environment error, not a code error. Supply the config (verified working 2026-08-08):

```bash
cd /Users/tonyweeg/nerdfootball-project/functions && env -u GOOGLE_APPLICATION_CREDENTIALS FIREBASE_CONFIG='{"projectId":"nerdfootball","databaseURL":"https://nerdfootball-default-rtdb.firebaseio.com","storageBucket":"nerdfootball.appspot.com"}' GOOGLE_CLOUD_PROJECT=nerdfootball node -e "require('./index.js'); console.log('✅ index.js and its whole require graph load cleanly');"
```

Expected: some startup chatter from the contact-form transport and the ESPN monitor, then the success line. Individual modules (the per-task checks above) do **not** need this env — only `index.js` does.

- [ ] **Step 3: Deployed surface unchanged**

```bash
cd /Users/tonyweeg/nerdfootball-project/functions && grep -c "^exports\." index.js
```

Expected: `50`.

- [ ] **Step 4: No legacy literal survives in any live file**

```bash
cd /Users/tonyweeg/nerdfootball-project && grep -rlE "artifacts/nerdfootball/public/data/(nerdfootball_picks|nerdfootball_results|nerdfootball_games|nerdSurvivor_)|(survivor_pool|season_leaderboard|weekly_leaderboard)_20[0-9][0-9]" functions --include='*.js' --exclude-dir=node_modules | grep -vE "(pickAnalytics|leaderboardCache|justRunWeek4|simpleWeeklyScoring|weeklyScoring|survivorCacheUpdater|seasonConfig)\.js"
```

Expected: no output.

- [ ] **Step 5: OWNER RUNS — deploy functions and hosting**

```bash
cd /Users/tonyweeg/nerdfootball-project && firebase deploy --only functions,hosting
```

Expected: 50 functions updated, hosting released, no errors.

- [ ] **Step 6: OWNER RUNS — reset the survivor blocks**

Run this **after** the deploy, so nothing regenerates the stale state mid-flight:

```bash
cd /Users/tonyweeg/nerdfootball-project/functions && env -u GOOGLE_APPLICATION_CREDENTIALS GOOGLE_CLOUD_PROJECT=nerdfootball node ../scripts/reset-season-survivor-state.js --year=2026 --confirm
```

Expected: `✅ deleted 50 stale survivor blocks` and `✅ 54 members intact, participation flags untouched`.

- [ ] **Step 7: Production proof — the survivor endpoint**

```bash
curl -s "https://getsurvivorpooldata-np7uealtnq-uc.a.run.app?t=$(date +%s)" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log('poolId:',r.poolId);console.log('summary:',JSON.stringify(r.data.summary));console.log('availableWeeks:',JSON.stringify(r.data.availableWeeks));});"
```

**Expected after the fix:** `alive: 0` must be gone. Because no 2026 games have been played, every participant has no picks yet, so the correct reading is `notParticipating: 51` (nobody has picked) with `eliminated: 0`, and `availableWeeks: []` — the 2026 game documents carry no winners yet. Any nonzero `eliminated` before week 1 kicks off means a legacy path survived.

- [ ] **Step 8: Production proof — the pick page admits a live user**

Sign in on `https://nerdfootball.web.app/NerdSurvivorPicks.html` and confirm the page renders the team picker rather than the death screen, and that the "teams used" counter reads 0.

- [ ] **Step 9: Production proof — no 2025 document was touched**

```bash
cd /Users/tonyweeg/nerdfootball-project/functions && env -u GOOGLE_APPLICATION_CREDENTIALS GOOGLE_CLOUD_PROJECT=nerdfootball node -e "
const admin=require('firebase-admin');admin.initializeApp({projectId:'nerdfootball'});const db=admin.firestore();
(async()=>{
  const legacy=await db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/1').get();
  console.log('legacy 2025 games wk1 last updated:', legacy.updateTime.toDate().toISOString());
  const cache=await db.doc('cache/survivor_pool_2026').get();
  console.log('new 2026 survivor cache exists:', cache.exists);
  process.exit(0);
})();"
```

Expected: the legacy timestamp still reads `2025-09-26T15:18:37.171Z` (untouched), and the 2026 survivor cache document now exists.

- [ ] **Step 10: Tag and push**

```bash
cd /Users/tonyweeg/nerdfootball-project && git tag SEASON-CONFIG-BACKEND-MIGRATION && git push origin main --tags
```

---

## Rollback

Every task is a separate commit, so a single bad task reverts cleanly with `git revert <sha>`.

Full rollback of the code:

```bash
cd /Users/tonyweeg/nerdfootball-project && git revert --no-commit SEASON-CONFIG-BACKEND-MIGRATION..HEAD && git commit -m "Revert backend season-path migration" && firebase deploy --only functions,hosting
```

The Task 8 data change is **not** revertible — it deletes stale 2025 survivor blocks from the 2026 members document, and point-in-time recovery is disabled on this database. That data is a copy of 2025 state the owner has explicitly written off, and the 2025 members document at `artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members` still holds the original blocks if anyone ever needs to read them.

---

## Definition of Done

- [ ] All 26 code sites migrated; the grep in Task 9 Step 4 returns nothing
- [ ] Full Jest suite green, including the new builder tests and the segment-parity width check
- [ ] `grep -c "^exports\." functions/index.js` still reports 50
- [ ] Guard's fourth pattern class in place; none of the 16 live files appear in its output
- [ ] Functions and hosting deployed
- [ ] Survivor reset script run with `--confirm`, verified readback clean
- [ ] Live endpoint reports `eliminated: 0` before week 1
- [ ] A real signed-in user reaches the survivor team picker, not the death screen
- [ ] The legacy 2025 game document's `updateTime` is unchanged
- [ ] Tagged `SEASON-CONFIG-BACKEND-MIGRATION` and pushed

---

## Appendix: Complete Site Inventory

Twenty-six sites. Every one was read directly from the source on 2026-08-08; line numbers are accurate as of commit `bfc45cd` and will shift as earlier tasks land — always match on the code text, not the line number.

| # | File | Line | Kind | Task |
|---|---|---|---|---|
| 1 | `functions/survivorPoolCache.js` | 56 | cache doc | 2 |
| 2 | `functions/survivorPoolCache.js` | 212 | survivor picks read | 2 |
| 3 | `functions/survivorPoolCache.js` | 402 | games read | 2 |
| 4 | `functions/survivorAutoUpdate.js` | 113 | survivor picks read | 2 |
| 5 | `functions/espnScoreMonitor.js` | 186 | survivor picks collection | 2 |
| 6 | `functions/bulletproofWeeklyScoring.js` | 36 | games read | 3 |
| 7 | `functions/bulletproofWeeklyScoring.js` | 91 | picks read | 3 |
| 8 | `functions/weeklyLeaderboardCache.js` | 19 | cache doc prefix | 3 |
| 9 | `functions/weeklyLeaderboardCache.js` | 40 | cache doc consumer | 3 |
| 10 | `functions/weeklyLeaderboardCache.js` | 117 | cache doc consumer | 3 |
| 11 | `functions/weeklyLeaderboardCache.js` | 213 | picks read | 3 |
| 12 | `functions/weeklyLeaderboardCache.js` | 379 | games read | 3 |
| 13 | `functions/seasonLeaderboardCache.js` | 17 | cache doc | 3 |
| 14 | `functions/seasonLeaderboardCache.js` | 295 | games read | 3 |
| 15 | `functions/updateLiveScores.js` | 76 | **games WRITE** | 4 |
| 16 | `functions/realtimeGameSync.js` | 180 | **games WRITE** | 4 |
| 17 | `functions/espnScoreMonitor.js` | 155 | **games WRITE** | 4 |
| 18 | `functions/espnScoreMonitor.js` | 306 | games read | 4 |
| 19 | `functions/espnNerdApi.js` | 453 | **schedule cache WRITE** | 4 |
| 20 | `functions/index.js` | 643 | **picks DELETE** | 5 |
| 21 | `functions/index.js` | 1072 | results read | 5 |
| 22 | `functions/fixWeek3Data.js` | 162 | pin to 2025 | 5 |
| 23 | `functions/verifyWeeksData.js` | 27 | pin to 2025 | 5 |
| 24 | `functions/diagnosticWeeksData.js` | 27 | pin to 2025 | 5 |
| 25 | `functions/cleanWeek4Games.js` | 10 | pin to 2025 | 5 |
| 26 | `functions/forceUpdateGame401.js` | 10 | pin to 2025 | 5 |

Plus, in Task 6: nine sites in `public/straight-cache-homey.html` (lines 360, 389, 421, 616, 640, 663, 865, 869, 872) and one stale emergency-recovery line in `public/nerd-football-caching-and-scoring-process.html:674`.

**Also verified and deliberately left alone:** `functions/leaderboardCache.js` (superseded twin, not exported), `functions/justRunWeek4.js`, `functions/simpleWeeklyScoring.js`, `functions/weeklyScoring.js`, `functions/survivorCacheUpdater.js`, `functions/pickAnalytics.js`, `scripts/clear-week4-cache.js`, and `functions/index.js:1150` (already season-scoped via its `poolId` segment).
