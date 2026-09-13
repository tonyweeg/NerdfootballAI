# Masters Audit — 2026 Data and Scoring Plan

**Goal:** `masters-of-the-nerdUniverse-audit.html` and the `getWeeklyLeaderboard` / `generateWeeklyLeaderboardCache` functions read the current season through `SEASON_CONFIG` and score with one shared, tested rule.

**Decisions (Tony, 2026-09-13):**
- Scope: page + Cloud Function in one ticket and PR.
- Record/accuracy denominator: decided (final) games only.

## Evidence

| Surface | Reads | Result today |
|---|---|---|
| Weekly cards | `getweeklyleaderboard` → `public/data/nerdfootball_picks`, `nerdfootball_games`, cache `weekly_leaderboard_2025_week_N` | 2025 Week 1, cached 2025-09-28 |
| Season table + stat cards | page reads `public/data/...` directly | 2025 season |
| Survivor | `getsurvivorpooldata` via `SEASON_CONFIG` | correct |

2026 data: `artifacts/nerdfootball/pools/nerduniverse-2026/nerdfootball_games/1` (16 games, 2 final), 36 pick sheets.

## Scoring rule (canonical = the Grid, `nerd-universe-grid.html:2135`)

- **Final:** status `final` | `final/ot` | `status_final` (case-insensitive), or `winner` set and not `TBD`.
- **Tie:** final **and** (winner contains `TIE` or equals `DRAW`, or away/home scores equal and > 0). Every pick on a tie is correct.
- **Points:** confidence counts only if it is an integer in 1..n (n = games in the week).
- **Record:** `correct / decided`, where decided = picks on final games.
- Pick keys: everything except the metadata keys already listed in both files.

Bugs this removes: unplayed games counted as losses; ties ignored on the page; a live tied score treated as a final tie in the function; stat cards counting a different week range than the season table; `weeksPlayed` counting empty sheets.

## Tasks

- [ ] 1. JIRA ticket, branch `NERD-XX-audit-2026-maths`
- [ ] 2. `public/js/utils/confidence-scoring.js` (UMD: `window.ConfidenceScoring` + `module.exports`) — `isGameFinal`, `isTieGame`, `pickGameIds`, `scoreWeek(picks, games)`, `buildStandings(weeks, members)`
- [ ] 3. `functions/confidenceScoring.js` — identical body; `tests/confidence-scoring.test.js` unit cases + drift guard (same inputs → same outputs, both copies)
- [ ] 4. Page:
  - picks/games via `SEASON_CONFIG.paths.picksWeek(w)` / `paths.games(w)`, fetched once for weeks 1..current, shared by all sections
  - names and count from pool members (drop `nerdfootball_users`)
  - weekly cards built client-side from the same data (no function call)
  - stat cards derived from the season standings (same range)
  - `totalWeeks` instead of 18; remove "All 53 users" and the `5` placeholder
- [ ] 5. Function: `SEASON_CONFIG.paths.picks` / `paths.games`, cache prefix `weekly_leaderboard_${year}_week_`, version strings from year, scoring via `confidenceScoring.js`
- [ ] 6. `npm run test:unit` green; load page on PR preview (public data, no sign-in needed), console marker `NERD_AUDIT`
- [ ] 7. PR → CI green → Tony review
- [ ] 8. Merge → deploy hosting + `functions:getWeeklyLeaderboard,functions:generateWeeklyLeaderboardCache` → smoke → drift → generate week 1 cache and verify response is 2026
- [ ] 9. Ticket → Done
