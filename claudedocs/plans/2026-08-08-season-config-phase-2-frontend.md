# Season Config Phase 2 (Frontend — Live Surface) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Two-stage review after every batch. Grounded in the 2026-08-08 frontend inventory (full report in the Phase 2 planning record; line references below are from it — re-grep before editing).

**Goal:** Every LIVE page reads season values from `window.SEASON_CONFIG`. Zero behavior change except four explicitly-dispositioned live defects (table below). Dead files are not migrated — they are registered for an owner decision at Phase 5.

**Owner ground rule (governs everything):** 2026 runs exactly as 2025 did. Plumbing only. Nothing dormant activates. Where two live pages currently *disagree* with each other (they do — see P2-B), making them agree is restoring intended behavior, not adding features; each such change is dispositioned explicitly, never folded into a mechanical sweep.

**The decisive inventory finding:** only **21 of 84** guard-flagged public/ files are reachable in the live app. All four legacy bundles (`core-bundle.js`, `survivor-bundle.js`, `features-bundle.js`, `confidence-bundle.js`) are **dead** — no live page loads them; the five core pages are self-contained ES-module pages. 63 files (bundles, 27 orphaned modules, 20 debug harnesses, 11 repair scripts) go to the dead register, untouched.

---

## Script-injection architecture (applies to every migrated page)

Insert as classic scripts, in this order, immediately after the page's `./js/utils/logger-compat.js` include (last element before `</head>` on all five core pages):

```html
<script src="./js/config/season-data.js"></script>
<script src="./js/config/season-config.js"></script>
```

Why this is ordering-safe: both are synchronous classic IIFEs publishing `window.SEASON_DATA`/`window.SEASON_CONFIG`; `<script type="module">` blocks are deferred by spec, so the globals exist before any page logic runs. `season-config.js` throws loudly if `season-data.js` didn't load first. CSP allows same-origin scripts; hosting is globally no-cache; no service worker is registered by any current code (residual pre-2025 workers cache only `/`, `manifest.json`, `gameStateCache.js` — cannot affect these files).

Pages NOT at the standard pattern (compat-SDK or mixed pages in P2-C) still take the same two tags in `<head>` before any script that uses the config.

---

## P2-A: Core pages — mechanical (zero behavior change)

**A1 — `nerd-universe.html`:** inject the two script tags (after line ~198). No literals exist on this page; injection makes the hub a config host for future use. Nothing else.

**A2 — `nerdfootballConfidencePicks.html`:** inject tags (after ~319). Replace:
- `:520` members path literal → `SEASON_CONFIG.paths.poolMembers()`
- `:491-495` local `getCurrentWeek` (conforming formula — anchor 09-04, floor, clamp; verified equivalent in inventory §4) → body delegates to `SEASON_CONFIG.utils.getCurrentWeek()`; keep the local function name (4 call sites at :533, :735, :795, :904 untouched)
- `:607` `` `/game-data/nfl_2025_week_${currentWeek}.json?v=${Date.now()}` `` → `` `/game-data/${SEASON_CONFIG.format.scheduleFilename(currentWeek)}?v=${Date.now()}` ``

**A3 — `leaderboard.html`:** inject tags (after ~124). Replace `:267` members literal → builder; `:443-448` conforming local formula → delegate (call site :297 untouched).

**A4 — `NerdSurvivorPicks.html` and `nerdfootballTheGrid.html`:** tags injected in this batch, but their week formulas are P2-B decisions — do NOT touch the formulas in P2-A. `NerdSurvivorPicks.html:483` members literal → builder (that part is mechanical). `nerdfootballTheGrid.html:398` schedule-filename fetch → `SEASON_CONFIG.format.scheduleFilename(weekNumber)`.

Per-page gate (each page, after edit): page loads via local static serve, browser console clean, `window.SEASON_CONFIG.poolId === 'nerduniverse-2025'` in console, page renders its data. Commit per page or per two pages.

**P2-A execution record (2026-08-08):** landed as `ec81c59` + `67f9f3e` + a round-2 fix commit. Corrections from review: (1) FOUR pages call the config (confidence, leaderboard, survivor via poolMembers, Grid via scheduleFilename) — only the hub is tag-only; (2) **schedule-directory decision:** the public-ROOT `nfl_YYYY_week_N.json` copies are a hand-maintained legacy duplicate the scraper does not write — `/game-data/` is the canonical tree; the Grid's fetch moves there (diff-gated against the 2025 root copies first). The 8 other root-tree consumers are all dead-register files — no live impact; the flip runbook does NOT need to populate root copies. (3) All four calling pages carry a config-failure banner — inert normally, surfaces the migration-introduced outage mode instead of plausible-looking empty states.

## P2-B: Live divergences — explicit dispositions

| # | Site | Facts (inventory-verified) | Disposition |
|---|---|---|---|
| B1 | `NerdSurvivorPicks.html:614-618` anchors weeks on **`2025-09-03`** — one day earlier than every other surface; its comment ("Week 1 starts Sep 3") is factually wrong (2025 kickoff was Thu Sep 4) | Survivor page week boundaries flip a day before the rest of the app | **Adopt canonical** — delegate to `SEASON_CONFIG.utils.getCurrentWeek()`. Behavior change: boundaries move one day later, aligning survivor with confidence/leaderboard/backend. Flagged to owner; overridable |
| B2 | `nerdfootballTheGrid.html:414-422` — `Math.abs` + double-`Math.ceil` (days AND weeks), one-sided clamp; overshoots up to a week vs canonical | Also: the page appears **orphaned** (only inbound link is a docs page; the live grid is `nerd-universe-grid.html`) | **Adopt canonical** (cheap, 1 site) regardless of reachability; separately ask owner whether TheGrid is still used by direct URL — if not, it joins the dead register at Phase 5 |
| B3 | `ai-picks-helper.html:1226` and `help-ai-picks.html:1156` — `const currentWeek = 4; // Dynamic: getCurrentNFLWeek()` — hardcoded week on a LIVE admin page, invisible to the guard | The comment documents the intent the code doesn't implement | **Adopt canonical** — `SEASON_CONFIG.utils.getCurrentWeek()` (requires tag injection on those pages; ai-picks-helper is compat-pattern — same head insertion). This restores the page's own documented intent |
| B4 | `weekly-leaderboard.html:13-52` — `window.NFL_2025_WEEKS` Monday-boundary table + hardcoded `2026-01-10` season end + `'2025-09-04'` fallback. **Disagrees with `leaderboard.html`'s formula today** (e.g. Sep 8-10: table says week 2, formula says week 1); both pages are one click apart | This is the frontend twin of the C2 backend tables (`functions/weeklyLeaderboardCache.js:368`, `functions/survivorPoolCache.js:508`) | **Coordinated retirement, one change, all three files:** frontend `getCurrentNFLWeek()` → canonical; `getMostRecentWeekWithData()` derives week dates from `SEASON_CONFIG` arithmetic (weekAnchor + (w-1)·7d) instead of the `.games` column; backend twins' tables → same arithmetic via their `seasonConfig`. **This closes the C2 Phase-3 time bomb early** (the stuck-week-18 stale-cache failure recorded in the Phase 1 plan). Boundary semantics change from Monday-flip to canonical Thursday-flip on this page — flagged to owner |
| B5 | `nerdfootball-comprehensive-docs.html:936-947,1043-1044` — documents a THIRD week-table variant and claims sync that doesn't exist | Docs lie to the next admin | Update the code block + prose to describe the canonical config formula |

Each B-item is its own commit with before/after behavior stated in the message.

## P2-C: Live secondary + admin pages — mechanical sweep (~17 files)

Same patterns as P2-A (tag injection + builder/delegate swaps; conforming formulas verified per-site before swap, kill-list rule applies). From inventory §1C/§1D:
`nerd-universe-grid.html` · `nerds-battlestar-galactica.html` · `tricked-out-ricky.html` · `the-survival-chamber-36-degrees.html` · `weekly-leaderboard.html` (B4 does its week logic; this sweep does any remaining literals) · `masters-of-the-nerdUniverse-audit.html` · `NerdSurvivorAdmin.html` · `confidencePicksAdmin.html` · `picks-viewer-auth.html` · `nerd-scoring-audit-tool.html` · `nerd-messaging.html` · `ai-picks-helper.html` (B3 does the week; sweep does literals) · `nerd-game-updater.html` · `wu-tang-admin-dashboard.html` · `straight-cache-homey.html` · `nerdfootball-nerd-crud.html` · `nerdfootball-comprehensive-docs.html` (prose updates only where literals are instructional).

Batched by 5-6 files per commit; per-file verification: `node --check` n/a (HTML) → browser load + console-clean + a `NERDCHECK` log probe; guard count recorded per commit (monotonic decrease).

## Dead register (NOT migrated — Phase 5 owner decision)

63 files per inventory §1B/§1F/§1G/§1H (bundles ×4, orphaned modules ×27, harness pages ×20, repair scripts ×11, plus `nerdfootball-system-architecture.html`'s three orphan module loads). Disposition options at Phase 5, owner's call:
- **(a) Archive** (move to `archive/`, guards exclude, deploy surface shrinks) — flags: any direct-URL bookmark Tony uses would 404; per ground rule this is a change requiring his explicit OK.
- **(b) Leave deployed, untouched** — flags: after the 2026 flip these pages still operate on 2025 paths; anyone opening one by direct URL performs wrong-season reads/writes. If chosen, the flip runbook gains a "do not use unmigrated harnesses" warning list.
- Guard exit criteria for Phase 5 will be defined against the chosen disposition (clean live set + enumerated dead list either way).

## Exit criteria (Phase 2)

- [ ] All 21 live files read season values only via `SEASON_CONFIG`; guard's public/ list = dead register only (recorded count)
- [ ] `leaderboard.html` and `weekly-leaderboard.html` agree on the current week for every day of the season (spot-check table in the B4 commit message)
- [ ] Suite green (29 + scraper units when landed); both function-side C2 tables retired (B4)
- [ ] Browser smoke on all 5 core pages + weekly-leaderboard: console clean, data renders, `NERDCHECK` probe logs config poolId
- [ ] Owner regression pass on the live pages (his gate, per Diamond workflow) — the phase tag waits for it
- [ ] Tag `SEASON-CONFIG-PHASE-2`
