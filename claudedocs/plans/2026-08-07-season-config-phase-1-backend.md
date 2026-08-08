# Season Config Phase 1 (Backend Migration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Two-stage review (spec, then quality) after every batch. Steps use checkbox syntax.

**Goal:** Migrate all `functions/` season hardcodes onto `functions/seasonConfig.js` with zero behavior change (2025 config values produce byte-identical paths and identical week numbers), plus the pool-scoped infrastructure (picks trigger, games rule) needed before the 2026 flip.

**Architecture:** Batch-by-risk, not batch-by-file. Batch 0 extends the wrapper contract additively (5 new builders, both wrappers, drift-guarded). Batch A is mechanical literal replacement provably equal at runtime. Batch B swaps week formulas ONLY after per-site verification that the local formula ≡ the canonical one. Batch C is per-site judgment (divergent formulas, date tables, legacy-detection logic) with each decision recorded here. Batch D is new infrastructure (trigger, rules, bare-year gate).

**Ground rules (every batch):**
- Branch `claude/2026-season-config-plan-509f05`, worktree root, no push, no deploy to production.
- Every modified function file gets `const { SEASON_CONFIG } = require('./seasonConfig');` at top (once, near other requires).
- Jest always scoped: `npx jest --roots '<rootDir>/tests' -- tests/season-config-parity.test.js tests/season-config-drift.test.js`
- After each batch: `node --check` every modified file; suite green; guard count recorded (it must only ever decrease); commit; tag nothing (phase tag comes at the end: `SEASON-CONFIG-PHASE-1`).
- The kill-list rule is law: **blind swaps of divergent week formulas are forbidden.** A subagent that cannot prove formula equivalence reports BLOCKED with the formula body — it does not "fix" it.

**Verified inventory (2026-08-07, line-exact):** see tables in each batch. Re-verify lines before editing — they shift as batches land.

---

## Batch 0: Extend wrappers with the five missing builders

**Files:** Modify `public/js/config/season-config.js`, `functions/seasonConfig.js`, `tests/season-config-parity.test.js`, `tests/season-config-drift.test.js`

New builders (add after `weeklyRollupUser` in BOTH wrappers, identical bodies):

```javascript
        survivorEliminations: (userId, year) =>
            `${paths.poolRoot(year)}/survivor/${resolveYear(year)}/eliminations/${reqUserId(userId)}`,
        survivorWeek: (week, year) =>
            `${paths.poolRoot(year)}/survivor/${resolveYear(year)}/weeks/${reqWeek(week)}`,
        scoringWeek: (week, year) =>
            `${paths.poolRoot(year)}/scoring/week${reqWeek(week)}`,
        survivorDisplayCache: (year) =>
            `${paths.poolRoot(year)}/cache/latest-survivor-display`,
```

(Functions wrapper: same lines at its indent level.)

Test additions — inside EXISTING tests so counts stay 23 + 6 = 29:

In `tests/season-config-parity.test.js`, append to the `'year-segmented pool families (functions/index.js:659-690 shapes)'` test:

```javascript
        expect(CFG.paths.survivorEliminations('u1')).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/survivor/2025/eliminations/u1');
        expect(CFG.paths.survivorWeek(3)).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/survivor/2025/weeks/3');
        expect(CFG.paths.scoringWeek(4)).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/scoring/week4');
        expect(CFG.paths.survivorDisplayCache()).toBe('artifacts/nerdfootball/pools/nerduniverse-2025/cache/latest-survivor-display');
```

Append to the `'cache/scoring/segmented families under a 2026 pool'` test:

```javascript
        expect(CFG.paths.survivorEliminations('u1', 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/survivor/2026/eliminations/u1');
        expect(CFG.paths.scoringWeek(4, 2026)).toBe('artifacts/nerdfootball/pools/nerduniverse-2026/scoring/week4');
```

In `tests/season-config-drift.test.js`, inside the `'every path builder identical…'` test — add to the per-year block (outside the week loop):

```javascript
            expect(nodeConfig.paths.survivorEliminations(uid, year)).toBe(browserConfig.paths.survivorEliminations(uid, year));
            expect(nodeConfig.paths.survivorDisplayCache(year)).toBe(browserConfig.paths.survivorDisplayCache(year));
```

and inside the week loop:

```javascript
                expect(nodeConfig.paths.survivorWeek(week, year)).toBe(browserConfig.paths.survivorWeek(week, year));
                expect(nodeConfig.paths.scoringWeek(week, year)).toBe(browserConfig.paths.scoringWeek(week, year));
```

- [x] Apply all four file changes; run suite → 29/29; commit `Phase 1: Five additive path builders (survivor/rollup/scoring families)`. *(Executed as `afae3e5` with five builders; revision below removes one.)*

### Batch 0 revision (quality review, 2026-08-07)

Findings: (1) `seasonRollupUser` emitted a **9-segment (odd) Firestore doc path** — structurally invalid for `db.doc()`, and demonstrably why its production source (`index.js:683-684`, comment "skip if bad path") is dead code. Removed; resolving the dead code is Batch C4. (2) All five new builders + `reqUserId`'s slash branch dodged the drift error-parity table (5/5 guard mutations survived). (3) `reqUserId` accepted Firestore-reserved ids (`.`, `..`, `__x__`).

Revision content — apply to both wrappers and both test files:

`reqUserId` hardened (both wrappers, at each file's indent):

```javascript
        const reqUserId = (userId) => {
            if (typeof userId !== 'string' || userId === '' || userId.includes('/') ||
                userId === '.' || userId === '..' || /^__.*__$/.test(userId)) {
                throw new Error(`SEASON_CONFIG: invalid userId: ${userId}`);
            }
            return userId;
        };
```

Remove `seasonRollupUser` from both wrappers and its three test assertions (locations per the pre-revision lists above).

Parity test — append inside `'missing or out-of-range week/userId throw instead of minting garbage paths'`:

```javascript
        expect(() => CFG.paths.picks(1, '.')).toThrow('invalid userId');
        expect(() => CFG.paths.picks(1, '..')).toThrow('invalid userId');
        expect(() => CFG.paths.picks(1, '__proto__')).toThrow('invalid userId');
```

*(Note: `/^__.*__$/` catches `__proto__` since it both starts and ends with double underscores.)*

Drift test — append to the `probes` array inside `'error behavior identical for the full bad-input table'`:

```javascript
            ['survivorWeek week 0', (c) => c.paths.survivorWeek(0)],
            ['scoringWeek week 0', (c) => c.paths.scoringWeek(0)],
            ['survivorEliminations null userId', (c) => c.paths.survivorEliminations(null)],
            ['survivorDisplayCache year 0', (c) => c.paths.survivorDisplayCache(0)],
            ['slash userId', (c) => c.paths.picks(1, 'a/b')],
            ['numeric userId', (c) => c.paths.scoringUser(12345)],
            ['reserved userId', (c) => c.paths.picks(1, '..')]
```

Add one inline comment above `scoringWeek` in both wrappers (its shape intentionally has no year segment and no `weeks/` separator — mirrors espnScoreMonitor.js:242; do not "normalize"):

```javascript
        // Shape mirrors espnScoreMonitor.js:242 exactly — no year segment, no weeks/ separator.
```

- [ ] Revision applied; suite 29/29; commit `Phase 1: Batch 0 revision — drop invalid seasonRollupUser, guard-drift the new builders`.

---

## Batch A: Mechanical pool-ID replacement (~20 files, zero behavior change)

**Replacement rules, in priority order:**

| # | Pattern found | Replace with |
|---|---|---|
| R1 | Full path string matching a builder family (poolMembers, scoringUser, survivorWeek, scoringWeek, survivorDisplayCache…) | The builder call, e.g. `SEASON_CONFIG.paths.poolMembers()` / `` `${SEASON_CONFIG.paths.scoringUser(userId)}` `` |
| R2 | `const poolId = 'nerduniverse-2025'` / `= 'nerduniverse-2025'` assignments | `SEASON_CONFIG.poolId` |
| R3 | Default parameters `poolId = 'nerduniverse-2025'` (incl. destructuring and `req.query.poolId \|\| '…'`) | `poolId = SEASON_CONFIG.poolId` / `\|\| SEASON_CONFIG.poolId` |
| R4 | Array/collection literals (`activePools = ['nerduniverse-2025']`) | `[SEASON_CONFIG.poolId]` |
| R5 | Pool-ID inside a longer template that matches NO builder | `` `…/pools/${SEASON_CONFIG.poolId}/…` `` (keep the rest of the literal) |
| R6 | Comments containing the literal | Reword without the literal (guard greps comments too) |

**Worklist (verify lines before editing):**
`checkUserPicks.js:22` · `leaderboardCache.js:148` · `bulletproofWeeklyScoring.js:21,142` · `weeklyLeaderboardCache.js:172` · `simpleWeeklyScoring.js:93` · `survivorAutoUpdate.js:25,135`(→`survivorWeek(weekNumber)`) · `espnScoreMonitor.js:242`(→`scoringWeek(week)`) · `addMissingUsersToPool.js:9` · `seasonLeaderboardCache.js:147,194` · `weeklyScoring.js:164,281` · `survivorCacheUpdater.js:86`(→`survivorDisplayCache()`)`,103,259` · `index.js:610,744,825,898,1068,1270,1287` · `contactHandler.js:51,89,106,112,116,120` · `realtimeGameSync.js:256,274,327` · `survivorPoolCache.js:71` · `justRunWeek4.js:16,110`

**Excluded from Batch A (Batch C judgment):** `pickAnalytics.js:16,420-421` (legacy-pool detection semantics — see C3).

**Carry-in from Batch 0 review (fold into commit A1):** append two probes to the drift error-parity `probes` array (closes MUT-6b/6c sub-branch gap):

```javascript
            ['reserved userId dot', (c) => c.paths.picks(1, '.')],
            ['reserved userId underscores', (c) => c.paths.picks(1, '__proto__')]
```

- [ ] Split into two commits (≤11 files each) for reviewable diffs. Per commit: `node --check` each file, suite 29/29, guard count recorded.
- Commit msgs: `Phase 1: Pool-ID migration batch A1 — <files>` / `…A2 — <files>`

---

## Batch B: Canonical week-formula replacement (verify-then-swap)

Candidate sites (each has a local `seasonStart` + formula):
`bulletproofWeeklyScoring.js:167` · `updateLiveScores.js:14` · `espnScoreMonitor.js:30` · `weeklyScoring.js:121` · `survivorCacheUpdater.js:243` · `realtimeGameSync.js:461` · `survivorAutoUpdate.js:405`

**Per site, the subagent MUST:**
1. Read the full local function; extract anchor + formula + clamp.
2. Prove equivalence with canonical (`anchor 2025-09-04 midnight-UTC` — the `T00:00:00Z` variants are the same instant — formula `floor(days/7)+1` or an equivalent, clamp 1..18). Alternate-but-equivalent forms are fine IF provable at every instant; when in doubt, sweep-compare the two formulas hourly across 2025-08-01→2026-02-15 with a throwaway node script.
3. If equivalent: replace the whole local computation with `SEASON_CONFIG.utils.getCurrentWeek()` (keep any surrounding caching). Delete the local anchor.
4. If NOT equivalent: do NOT touch it — report the site + formula body for Batch C.

- [ ] One commit: `Phase 1: Canonical week-formula sites onto utils.getCurrentWeek — <files>`; suite green; guard count recorded.

---

## Batch C: Per-site judgment (decisions recorded here as they land)

| # | Site | Facts | Decision |
|---|---|---|---|
| C1 | `espnNerdApi.js:85` (getCurrentWeek, clamp 1-22) and `:338` | Playoff-week detection is intentional divergence | Keep local formula; replace only the anchor literal: `new Date(SEASON_CONFIG.weekAnchor)`. Add comment: `// playoff clamp intentional — see spec kill-list` |
| C2 | `survivorPoolCache.js:507-528` and `weeklyLeaderboardCache.js:367-410` (hand week→date tables + `< '2025-09-04'` fallbacks) | Tables encode their own week-boundary semantics; replacing with anchor math changes boundaries | Phase 1: replace ONLY the `'2025-09-04'` fallback-comparison literals with `SEASON_CONFIG.weekAnchor`; leave the tables intact and add `// TODO(Phase 3): derive table from config; verify boundary semantics first`. Tables get resolved with the frontend bundles phase where the same pattern recurs |
| C3 | `pickAnalytics.js:16,421` (`poolId === 'nerduniverse-2025'` legacy detection) | The check means "is this a 2025-era legacy pool", which stays true forever — `SEASON_CONFIG.poolId` would silently break it in 2026 | Rewrite as year-parse: `const y = parseInt(String(poolId).split('-').pop(), 10); const isLegacyPool = Number.isInteger(y) && y <= 2025;` (plus the `nerdfootball-2025` alias check). Line 421's `const poolId = 'nerduniverse-2025'` in the legacy handler stays semantically 2025 → use `` `nerduniverse-${y}` `` derived from parsed year or keep via the same isLegacy path — subagent proposes, reviewer verifies |
| C4 | `index.js:682-686` — dead season-rollup writer (comment: "skip if bad path") | The path `rollups/season/{year}/users/{uid}` has 9 segments (odd) — structurally invalid for `db.doc()`; that's why it was disabled. A season-rollup builder was removed from Batch 0 for the same reason | **Owner decision required:** delete the dead block outright, or define the correct season-rollup document shape (needs one more document level, like weekly's `week_{n}`) and add a builder then. Default action if no preference: delete the dead code |
| C5 | 6 sites hand-build `` `…/pools/${poolId}/metadata/members` `` with a DYNAMIC poolId (from query/data params) — Batch A centralized the default literal but not the path construction | Dynamic poolId doesn't fit the year-param builders | Add a poolId-parameterized builder to both wrappers (e.g. `poolMembersOf(poolId)` validating non-empty slash-free poolId), migrate the 6 sites, drift-guard it |
| C6 | `survivorCacheUpdater.js` is dead AND pre-broken: `onSchedule` (line ~38) AND `onRequest` (line ~253) both used without imports → ReferenceError at load. Never deployed (index.js doesn't reference it). Deeper findings (2026-08-07 investigation): unconditional `initializeApp()` would crash the deploy if wired in; its `survivor-cache/…` tree has zero readers; core computation is a stub ("Would need ESPN API integration"); superseded by survivorPoolCache + survivorAutoUpdate | Owner presented delete/restore/leave options 2026-08-07 and did not choose | **RESOLVED: leave as-is** (no deletion without owner's word, no restoration investment in a superseded experiment). Batches A/B already migrated its literals, so it no longer trips the guard. Deletion stays a one-line owner call any time |
| C7 | `realtimeGameSync.js:~462` and `survivorAutoUpdate.js:~406` — `getCurrentNflWeek` uses `Math.ceil(diffTime/weekMs)` (identical bodies). Batch B sweep: diverges from canonical at exactly the 17 weekly-boundary milliseconds (e.g. at 2025-09-11T00:00:00.000Z canonical=2, ceil=1); agrees everywhere else | The divergence is an accidental off-by-one at measure-zero instants, not a semantic choice (contrast espnNerdApi's deliberate playoff clamp) | **Adopt canonical:** swap both to `SEASON_CONFIG.utils.getCurrentWeek()` in Batch C, recording this as a deliberate micro-fix (behavior change only at exact boundary milliseconds, in the correct direction) |
| C8 | Bare season-year literals desynchronized from config-driven weeks (Batch B review): `updateLiveScores.js:~20` (`year=2025` in ESPN URL), `espnScoreMonitor.js:~37` (`fetchESPNScoreboard(week, year = 2025)`), `realtimeGameSync.js:~111`, `espnNerdApi.js:~423`, `mlPredictionManager.js:62,434` | Week now follows config; year doesn't → at the 2026 flip, ESPN requests would say `?week=<2026>&year=2025` — silent wrong-season data. Invisible to the current guard patterns | Per site: where the literal means "current season" (ESPN request params, default year args), replace with `SEASON_CONFIG.year`. Where it means something else (e.g. mlPredictionManager's `ml_learning/2025` tree — see spec inventory), classify and report rather than swap. The widened D3 bare-year gate (below) becomes the permanent detector |

- [ ] One commit per decision cluster; suite green; guard count recorded.

---

## Batch D: Infrastructure (trigger, rules, bare-year gate)

**D1 — Pool-scoped picks trigger.** In `functions/pickAnalytics.js`, add a sibling to `onLegacyPicksUpdate` (mirror its handler wiring exactly; only the path and export name differ):

```javascript
exports.onPoolPicksUpdate = functions.firestore.onDocumentWritten(
    'artifacts/nerdfootball/pools/{poolId}/data/nerdfootball_picks/{week}/submissions/{userId}',
    async (event) => {
        // identical body/delegation to onLegacyPicksUpdate — read that handler and reuse its core
    }
);
```
The subagent reads `onLegacyPicksUpdate`'s body and reuses its core function rather than duplicating logic — if the body isn't cleanly reusable, report DONE_WITH_CONCERNS with the structure found.

**D2 — Games rule.** In `firestore.rules`, after the pool-scoped survivorStatus block (~line 137), add a games block mirroring the legacy games rule body at lines 68-73 exactly (same allow expressions), with the pool-scoped path:

```
    match /artifacts/nerdfootball/pools/{poolId}/data/nerdfootball_games/{week} {
      // body copied verbatim from the legacy nerdfootball_games rule
    }
```

**D3 — Bare-year sweep gate.** Create `scripts/check-bare-year-functions.sh` (portable grep, same conventions as the hardcode guard: repo-root cd, loud exit 2 on tool failure):

```bash
#!/bin/bash
# Phase 1 gate: bare year segments in functions/ that the main guard cannot see.
# Flags /2025/-style path segments and quoted year literals OUTSIDE seasonConfig/season-data.
cd "$(dirname "$0")/.." || exit 2
[ -d functions ] || { echo "❌ bare-year: functions/ not found" >&2; exit 2; }
PATTERN="/20[0-9][0-9]/|/20[0-9][0-9]\`|'20[0-9][0-9]'|\"20[0-9][0-9]\"|year[[:space:]]*[=:][[:space:]]*20[0-9][0-9]|[?&]year=20[0-9][0-9]|/year/20[0-9][0-9]"
RAW=$(grep -rEl --binary-files=without-match "$PATTERN" functions \
    --exclude-dir=node_modules \
    --exclude='season-data.json' \
    --exclude='seasonConfig.js')
STATUS=$?
if [ "$STATUS" -gt 1 ]; then echo "❌ bare-year: grep failed (status ${STATUS})" >&2; exit 2; fi
MATCHES=$(printf '%s\n' "$RAW" | sed '/^$/d' | sort)
if [ -n "$MATCHES" ]; then
  COUNT=$(printf '%s\n' "$MATCHES" | wc -l | tr -d ' ')
  echo "❌ Bare year literals remain in ${COUNT} functions files:"
  echo "$MATCHES"
  exit 1
fi
echo "✅ No bare year literals in functions/."
```
Expect it to FAIL initially (that's the meter); Phase 1 exit wants the count driven to the C2-documented survivors only (tables), each carrying a TODO comment — record the final accepted list here.

- [ ] Commit: `Phase 1: Pool picks trigger + pool games rule + bare-year gate`

---

## Phase 1 exit checklist

- [ ] Suite 29/29 (scoped command)
- [ ] `node --check` clean on every modified functions file
- [ ] Hardcode guard: functions/ files remaining = only C2 survivors with TODO comments (record exact list + count)
- [ ] Bare-year gate: same recorded survivor list only
- [ ] `firebase emulators:start --only functions` boots without error (if emulator unavailable locally, record why and substitute `node --check` + a require-smoke of seasonConfig)
- [ ] Guard total count recorded (started 103; functions portion should be near zero)
- [ ] Tag `SEASON-CONFIG-PHASE-1` (annotated), tree clean, nothing pushed/deployed
