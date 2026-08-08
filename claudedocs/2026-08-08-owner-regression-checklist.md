# Owner Regression Checklist — Season Config Migration

**What you're testing:** the branch runs on 2025 values — every page should look and behave EXACTLY as production does today. Any difference you notice is a finding. Console word to filter on: `NERDCHECK` (plus watch for the red `CONFIG LOAD FAILURE` banner, which should NEVER appear).

**Setup (2 minutes):** from the worktree root:

```bash
cd /Users/tonyweeg/nerdfootball-project/.claude/worktrees/2026-season-config-plan-509f05 && python3 -m http.server 8642 --directory public
```

Open `http://localhost:8642/nerd-universe.html` and **sign in with your real account** — the pages talk to production Firestore, so all your real 2025 data renders. (Read-mostly pages; avoid submitting picks from the local session if you don't want test writes in prod.)

## The pass (15-20 min)

| Page | What to check |
|---|---|
| `nerd-universe.html` | Hub loads, hamburger + tiles all present, no banner |
| `leaderboard.html` | Season + weekly standings render with your real data; week number correct |
| `weekly-leaderboard.html` | **The important one.** Current week displays correctly; weekly data loads; the page and `leaderboard.html` agree on the week (they now share one formula) |
| `nerdfootballConfidencePicks.html` | Your picks render; KILLER BEES dropdown filtering intact; locked games locked |
| `NerdSurvivorPicks.html` | Survivor status + picks render. **Known behavior change:** week boundaries here shifted one day later (was counting from Sept 3 — a bug; now aligned with everything else) |
| `nerd-universe-grid.html` | Grid renders picks correctly |
| `ai-picks-helper.html` | Loads; week number now live (was hardcoded to 4) |
| 2-3 admin tools you actually use | Load + data renders (straight-cache-homey, scoring audit, etc.) |

In any page's console, paste for a quick sanity line:
```js
console.log('NERDCHECK', window.SEASON_CONFIG.poolId, window.SEASON_CONFIG.utils.getCurrentWeek())
```
Expect: `NERDCHECK nerduniverse-2025 18` (18 = correct post-season clamp in August).

## The decision batch (answer any time)

1. **63 dead files** (old bundles, orphaned modules, debug harnesses — none reachable from any live page): (a) archive them out of `public/` before the flip, or (b) leave deployed. Note if left: after the flip they'd still operate on 2025 paths if you open one by direct URL.
2. **`nerdfootballTheGrid.html`** — appears orphaned (live grid is `nerd-universe-grid.html`). Do you still use it by direct URL?
3. **Pick-lock timing quirk** (pre-existing, all of 2025): locks fire early by a viewer-timezone-dependent amount (Eastern −4h … Tokyo −17h). Preserved for 2026 per your ground rule. Fix properly for 2026, or keep another year?
4. **Ship path:** merge to main / PR / keep on branch — then push (tags ride along) and deploy on your word.

## What's already proven (no action needed)

- Flip drill round 2: complete 2026 rehearsal passed end-to-end on the emulator, zero overrides
- 56/56 tests; hardcode guard = dead-register only; backend at zero hardcodes
- Deploy surface = your 2025-equivalent 45 functions; analytics stays off per your ruling
- September runbook: scraper (one command, validated 12 ways), copy members to the 2026 pool, load game data, deploy
