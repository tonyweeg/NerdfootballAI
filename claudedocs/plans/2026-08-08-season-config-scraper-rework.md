# Scraper Rework (Spec D4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Two-stage review after implementation. This plan is requirements-complete with exact contracts; the implementation is delegated (standalone tooling, not production-serving code — the review pair closes the gap).

**Goal:** Replace `espn-schedule-scraper.js` (repo root) with a version that produces a complete, validated season — config data + schedule files — for any year, from ESPN's JSON API, failing loudly on anything suspicious. This is the tool that generates the 2026 season.

**Ground rule applies:** output formats must be byte-compatible with what exists today. Scraping 2025 must reproduce the current live data (parity gate below). No new consumer-facing formats.

**Branch/rules:** `claude/2026-season-config-plan-509f05`, worktree root, no push/deploy. The old scraper's contents are fully replaced; filename stays (`espn-schedule-scraper.js` — the annual runbook references it).

---

## CLI contract

```
node espn-schedule-scraper.js --year=2026 [--dry-run] [--week=N]
```

- `--year=YYYY` — REQUIRED, no default (an accidental bare run must not scrape an unintended season). Integer 2020-2100.
- `--dry-run` — fetch + parse + validate + print the derived season summary and per-week game counts; write NOTHING.
- `--week=N` — optional single-week fetch for debugging (prints that week's parsed games; never writes).
- Any parse/validation failure: print the specific assert that failed, exit non-zero, write nothing. There is NO sample-data fallback, no partial write. All-or-nothing: fetch and validate ALL 18 weeks in memory first, then write all outputs.

## Data source

`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week={W}&dates={Y}&seasontype=2&limit=100`

**Param contract (empirically verified 2026-08-08):** `dates={Y}` is the season selector; `year={Y}` is silently IGNORED by this endpoint (returns the current season regardless — verified: `year=2025` returned season.year 2026, `dates=2025` returned true 2025 data with first game `2025-09-05T00:20Z` = Thu Sep 4 8:20 PM EDT, matching the live config exactly). The scraper must additionally assert the response's `season.year === requested year` (new assert A0) so a future API change fails loudly instead of silently serving the wrong season.

**Companion fix (C9, same discovery):** `functions/updateLiveScores.js` and `functions/espnScoreMonitor.js` pass `year=${SEASON_CONFIG.year}` — a no-op; they get the API's default (current) season and only ever worked by coincidence. Change both to `dates=${SEASON_CONFIG.year}` so the config genuinely pins the season. Also inspect `functions/espnNerdApi.js`'s `year: SEASON_CONFIG.year` usage (~:423) — trace how it reaches a URL and apply the same correction if it feeds this endpoint. `realtimeGameSync.js` already uses `dates=` correctly.

Per event: `id`, `date` (ISO UTC — this endpoint returns true UTC with `Z`), `competitions[0].competitors` (two entries with `homeAway` = 'home'/'away', `team.displayName`), `competitions[0].venue.fullName` (may be absent → empty string). Team names normalized through the existing TEAM_MAPPINGS table (carry it over from the old scraper verbatim — it is correct) applied to `team.displayName`; unmapped names pass through unchanged BUT count toward a validation warning list printed in the summary.

Rate limit: 1 request/second between weeks (as the old scraper did).

## Timezone conversion (the critical correctness rule)

This endpoint's `date` is TRUE UTC. Our storage convention is explicit-offset Eastern ISO. Conversion:

- Eastern offset rule (as documented in CLAUDE.md): EDT = UTC-4 from the second Sunday of March through the first Sunday of November; EST = UTC-5 otherwise. Implement `easternOffsetFor(utcDate)` computing those two boundary instants for the given year (2:00 AM local transitions; for game-time purposes, computing the boundary Sundays at 07:00 UTC is exact enough — no NFL game occurs within the ambiguous hour).
- `toEasternISO(utcISO)` → `YYYY-MM-DDTHH:mm:ss-04:00` / `-05:00` (shift the UTC instant by the offset to get wall-clock, format with the offset suffix).
- **weekAnchor = the Eastern calendar DATE of the first week-1 game** (e.g., kickoff 2026-09-11T00:20Z → Eastern 2026-09-10T20:20:00-04:00 → anchor `2026-09-10`). Never derive the anchor from the UTC date — that's off by one for every night game.

## Outputs (only after full validation passes)

1. `public/js/config/season-data.js` — EXACTLY the current file's shape (read the existing file and reproduce its structure byte-for-byte except values): the `⚠️ GENERATED` comment header, IIFE, `const SEASON_DATA = {...}` with the same 8 keys in the same order, `Object.freeze`, window + module guards. Generated values:
   - `year`
   - `weekAnchor` (derived above)
   - `kickoffDateTime` (first week-1 game, Eastern-offset ISO)
   - `seasonEndDate` (last week-18 game's Eastern ISO + 1 day, formatted `YYYY-MM-DDT23:59:59{offset}` on that +1 day)
   - `totalWeeks: 18`
   - `poolId: 'nerduniverse-{year}'`
   - `poolDisplayName: 'Nerd Universe {year}'`
   - `espnScheduleUrlTemplate` unchanged (the existing literal)
2. `functions/season-data.json` — same values, same key order, 4-space JSON (current file's exact shape).
3. `public/game-data/nfl_{year}_week_{n}.json` for weeks 1-18 — the EXISTING consumed format (read `public/game-data/nfl_2025_week_1.json` and match its schema exactly: `{week, games:[{id, a, h, dt, stadium}]}` with the same id-numbering convention `BASE_GAME_ID(100) + week*100 + index + 1` and `dt` in our Eastern-offset ISO).
4. `public/nfl_{year}_schedule_raw.json` — all 18 weeks' parsed data in one file `{year, generatedAt, weeks:[{week, games:[...]}]}` (matches the spec's `scheduleFilename()` naming).

## Validation asserts (every one required; print PASS/FAIL per assert in the summary)

```
A1  every week 1..18 fetched and parsed; no week empty
A2  per-week game count in 13..16; total === 272
A3  every game has id, both teams, valid parseable date; home ≠ away
A4  weekAnchor falls on a Thursday (Eastern)
A5  kickoffDateTime within 24h after weekAnchor 00:00 Eastern
A6  seasonEndDate > kickoffDateTime; span(weekAnchor → seasonEndDate) in 17..19 weeks
A7  every game's date falls within [weekAnchor + (week-1)*7d - 2d, weekAnchor + week*7d + 2d]  (±2d tolerance for scheduling oddities; violations listed with game details)
A8  poolId === 'nerduniverse-' + year and weekAnchor starts with '{year}-'  (lockstep guard)
A9  no duplicate game ids within the season
A10 every team name resolved through TEAM_MAPPINGS (unmapped names are a WARNING, not a failure — listed in summary)
```

## The 2025 parity gate (proves the scraper against known truth)

`node espn-schedule-scraper.js --year=2025 --dry-run` must derive:
- `weekAnchor === '2025-09-04'` (must match the live config exactly)
- `kickoffDateTime === '2025-09-04T20:20:00-04:00'` (must match exactly)
- `poolId === 'nerduniverse-2025'`
- `seasonEndDate` MAY differ from the live hand-set value (`2026-01-07T23:59:59-05:00` came from the season definition, not from game data; the derived value will be last-game+1day ≈ early January). Print both and the delta; do not fail on it. Record the derived value in the report.
- Per-week game counts must sum to 272.

If the environment has no network access to ESPN: record the exact failure, then substitute the fixture path — save one week's real response JSON as `tests/fixtures/espn-scoreboard-sample.json` is NOT possible without network either, so in that case implement + unit-test the pure functions (below) and report the parity gate as BLOCKED-pending-network for the controller to run.

## Testability requirements

Export the pure functions for testing: `module.exports = { parseScoreboard, toEasternISO, easternOffsetFor, deriveSeasonData, validateSeason, TEAM_MAPPINGS }` (guarded so CLI behavior is unchanged when run directly). Add `tests/scraper-units.test.js` (scoped Jest, counts additive to the suite) covering:
- `toEasternISO`: a September instant (-04:00), a January instant (-05:00), the November boundary week
- `deriveSeasonData`: synthetic 18-week fixture → correct anchor/kickoff/end; night-game UTC-date-rollover case explicitly (kickoff 00:20Z → anchor is the PREVIOUS Eastern date)
- `validateSeason`: fixtures violating A2, A4, A6, A9 each fail with the right assert named; a clean fixture passes
- Format check: generated season-data.js text (from a synthetic fixture) parses via `require` in a temp dir and deep-equals the JSON twin

## Verification checklist for the implementer

- [ ] `node espn-schedule-scraper.js` (no args) → usage + exit non-zero, writes nothing
- [ ] `--year=2025 --dry-run` → parity gate results printed (or BLOCKED-pending-network with the exact error)
- [ ] Unit tests green alongside the existing suite: `npx jest --roots '<rootDir>/tests' -- tests/season-config-parity.test.js tests/season-config-drift.test.js tests/scraper-units.test.js`
- [ ] `node --check espn-schedule-scraper.js`
- [ ] NO writes occurred to season-data.js / season-data.json / game-data during any of the above (git status clean apart from the new scraper + test files)
- [ ] Both guards unchanged (86 / 3)
- [ ] Commit: `Scraper rework (D4): ESPN JSON API, --year, Eastern conversion, loud validation`
