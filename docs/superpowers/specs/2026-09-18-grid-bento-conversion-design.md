# The Grid onto the shared header, theme and bento

**Date:** 2026-09-18
**Page:** `public/nerd-universe-grid.html`
**Pattern source:** `public/tricked-out-ricky.html` (NERD-39 conversion)
**Follows:** `2026-09-18-grid-pick-matrix-design.md`

## Goal

The Grid is the last major page still wearing its own chrome. Put it on the
shared `nerd-header`, the `nerd-theme` token system, and the bento card layout
the other eight pages already use.

## Why now

Eight pages run the shared header today: Space Nerd Stats, both leaderboards,
Upside View, both survivor pages, the audit page and the picks landing. The Grid
runs a hand-rolled "terminal header" — neon `#89CFF0` buttons with glow shadows,
seven controls in one bar — and is the only one of the nine still loading Tailwind.

Half that header is about to become duplicate: the shared component already
provides back navigation, the site nav, theme toggle, signed-in user and logout.

## Non-goals

The pick matrix itself does not change. The tier system, team ombre gradients,
greyed-out wrong picks, helmet headers, gold rim, MNF column and the tiebreak all
stay exactly as they landed — this is chrome, not content.

The ESPN timezone parser stays frozen. No Firestore, Cloud Function or scoring
changes.

## Decisions

| Decision | Choice |
|---|---|
| Scope | Full conversion — shared header, theme, bento |
| Bento composition | A: four fact cards on top, matrix at `span-12` |
| Column-status filter | Deleted (was never wired to any UI) |
| Cache Status / Clear Cache | Dropped; `straight-cache-homey.html` owns cache work |
| Tailwind | Dropped entirely, all 76 class attributes rewritten |

## Page structure

Matching the NERD-39 pattern exactly:

```
<link> nerd-theme.css · nerd-header.css · nerd-loading.css · nerd-leaderboard.css
<div class="nerd-header-slot" data-nerd-header data-title="Picks Grid" data-back="true">
<script src="./js/components/nerd-header.js">

<main class="lb-main wide">                        max-width 1320px
  <section class="lb-hero">
    lb-kicker    Confidence Pool · Week N
    lb-title     The Grid
    lb-subtitle  Every pick from every player. Picks unlock game by game at kickoff.

  <div id="auth-section" class="card message-card hidden">    sign-in required

  <div id="main-content" class="hidden">
    <div class="card">
      .controls      week nav (prev · Week N · next) + toolbar-actions (sort, refresh)

    <section id="grid-loading" class="lb-loading" data-loader>   skeleton + load steps

    <div id="board" class="bento">
      .card.span-3   ⏱ Next kickoff     countdown + which game
      .card.span-3   👥 Players          count + "all picks in"
      .card.span-3   🏈 Games final      n / total
      .card.span-3   🏆 Leader           name + points · MNF guess
      .card.span-12  Pick Matrix         section-header + the table
```

`data-title="Picks Grid"` matches the label this page already carries in the
shared header's own `NAV_ITEMS`, so the nav highlight resolves correctly.

## What the four fact cards hold

All four are data the page already computes — no new reads.

- **Next kickoff** — the existing countdown, currently a header pill. Shows the
  matchup it is counting down to, which the pill never did.
- **Players** — `memberIds.length` after the confidence-participation filter.
- **Games final** — count of `isGameCompleted` over `gameIds`, out of the week's total.
- **Leader** — top row of the score-ordered ranking, with its MNF guess, so the
  tiebreak is legible without reading across the table.

## Theme conversion

**Delete, do not remap.** The terminal look goes; its rules are not re-pointed at
theme tokens behind the same class names:

`.terminal-header` · `.grid-title` · `.back-link` (+`:hover`) · `.nav-button`
(+`:hover`, `:disabled`) · `#week-display` · `.info-pill` · `.toggle-button`
(+`:hover`, `.active`) · the old `#loading-screen` markup and `.loading` bar ·
the `nerd-*` Tailwind palette · every inline `style=` on the old header buttons.

`.user-expanded` and `.overlay` (the user-detail modal) are **rethemed** rather
than deleted — the modal is a working feature. It moves onto `--md-surface`,
`--md-outline-variant`, `--md-shape-lg` and the type tokens.

**Kept verbatim** — this is the Grid's colour language and it just shipped:
all 32 `.team-*` gradients, the three tier media queries with `--tile-w` /
`--tile-h` / `--tile-font`, `.pick-cell`, `.pick-correct`, `.pick-incorrect`,
`.pick-live`, `.pick-pending`, `.big-bet`, `.helmet`, `.matchup-abbr`.

**Rethemed** — the four rail columns keep their structure and sticky offsets but
take their colours from tokens instead of hardcoded hex: `.place-column`,
`.user-name`, `.mnf-column`, `.total-column`.

The distinction that governs this: **team colours are data and stay literal;
chrome is theme and moves to tokens.**

## Dropping Tailwind

Remove the CDN script, `suppress-tailwind-warning.js`, and the `tailwind.config`
block. Then 76 class attributes need rewriting — 19 in static markup, 57 inside
JS template strings.

The 57 are almost all the user-detail modal (`showUserDetails`), which generates
markup with `bg-gray-100`, `text-nerd-grey`, `border-red-600`, `bg-opacity-20`
and friends. That is the risky part of this work and gets its own task with its
own before/after screenshot check.

`.hidden` is relied on by JS (`classList.add('hidden')`) in several places and is
defined by `nerd-leaderboard.css`, so it survives the Tailwind removal for free.

## Loading and auth

Both currently bespoke; both adopt the shared pattern.

**Loading** — replace the `#loading-screen` centred spinner with the
`lb-loading` skeleton shaped like the bento, plus `NerdLoadSteps` from
`js/components/load-steps.js`, as Space Nerd Stats does.

**Auth** — the page has no sign-in gate today; it renders a loading screen and
then content. Adopt the `#auth-section card message-card` pattern so an
unauthenticated visitor gets a clear "sign in required" card instead of an
indefinite loader.

## Risks

**The modal rewrite.** 57 generated class attributes, no test coverage, and it is
reached by clicking a player name — easy to miss in a quick pass. Its own task,
verified by opening it for a player with picks and a player without.

**Tailwind preflight removal.** The CDN's reset currently normalises margins,
borders and box-sizing across this page. Removing it can shift spacing in places
nothing obviously points at. `nerd-theme.css` carries its own reset; the browser
pass needs to look at the whole page, not only the parts deliberately changed.

**The countdown's game-time reads.** The countdown currently parses
`game.gameTime` / `game.date` / `game.time`. Moving it into a card must not
change that logic — the frozen-parser rule applies.

## Testing

`npx jest` must stay green (273 tests). `tests/nerd-header.test.js` keeps the
shared header's nav in lockstep with the nerd-universe menu — if this conversion
touches nav items that test will catch it.

Browser pass, console filtered to **`MATRIX`**, at 390 / 800 / 1400:
shared header renders and its menu opens; theme toggle flips light and dark;
hero reads correctly; the four fact cards populate; the matrix is unchanged from
the previous branch; week nav, sort and refresh work; the user modal opens and is
themed; no Tailwind classes remain visible in the DOM; signed-out state shows the
auth card.

## Decision log

| Question | Answer |
|---|---|
| How far does the conversion go? | Full — header, theme, bento |
| Bento composition | A — facts on top, matrix full width |
| Never-wired column filter | Remove it |
| Cache buttons | Drop from this page |
| Tailwind | Drop entirely, rewrite all 76 |
