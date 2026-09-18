# The Grid → Pick Matrix layout

**Date:** 2026-09-18
**Page:** `public/nerd-universe-grid.html`
**Pattern source:** `public/tricked-out-ricky.html` (Pick Matrix section)

## Goal

Rebuild The Grid's picks table using the Tricked Out Ricky pick-matrix layout —
denser, responsive, more data in less space — while keeping The Grid's own color
language: team ombre gradients on every pick, greyed out when wrong.

Add a Monday Night Football tiebreaker column, and use it to resolve tied places
in the top three.

## Non-goals

Nothing else on the page changes. The sort toggle, user-detail modal, week
navigation, cache status/clear buttons, countdown timer, hide-picks-until-kickoff
security, tie-game credit, ghost-user blocking, and pool-member filtering all keep
working exactly as they do today.

No Firestore writes. No Cloud Function changes. No change to the season
leaderboard or to stored scoring documents — the tiebreak is resolved for this
page's display only.

The ESPN timezone parser (`easternTimeParser-v2.js`) is not touched. See CLAUDE.md
— its behavior is deliberately frozen for the season.

## Current state

`renderTableHeader()` emits `<th class="pick-cell">AWAY<br>@<br>HOME</th>` per game.
`createPickCellHTML()` emits a 45px `<td>` holding a team abbreviation over a
confidence number, painted by a `.team-*` gradient class and marked
`.pick-correct` / `.pick-incorrect` / `.pick-live` / `.pick-pending`.

Three columns are frozen: `.place-column` (60px, sticky left 0), `.user-name`
(150px, sticky left 60px), `.total-column` (60px, sticky right 0). On a 390px
phone that is 270px of frozen width, leaving room for roughly two and a half
game columns.

Ties are not broken. Two players on the same score both receive the same medal
and sort alphabetically. `mnfTotalPoints` is never read.

## Design

### Responsive cell tiers

| Tier | Breakpoint | Tile | Content |
|------|-----------|------|---------|
| A | `< 768px` | 26 × 24 | confidence number only |
| B | `768px – 1199px` | 40 × 30 | team abbrev over confidence |
| C | `≥ 1200px` | 48 × 20 | team abbrev + confidence, one line |

768px is already this file's breakpoint; 1200px is new.

Matrix chrome throughout, taken from Ricky: `border-collapse: separate`,
`border-spacing: 2px`, 4px rounded tiles, monospace type, sticky header row,
sticky left rail.

### Frozen rails

The rails compress at mobile rather than restructuring — pure CSS, no DOM change,
so `showUserDetails` and every existing handler keep their elements.

| | `< 768px` | `≥ 768px` |
|---|---|---|
| `.place-column` | 28px | 60px (unchanged) |
| `.user-name` | 68px, ellipsis | 150px (unchanged) |
| `.total-column` | 44px | 60px (unchanged) |

Frozen width on a 390px phone drops from 270px to 140px — about nine game
columns visible instead of two and a half.

### Cell paint rules

| State | Paint |
|-------|-------|
| Correct | team ombre gradient, full strength (existing `.team-*` classes) |
| Not yet final | team ombre gradient, full strength |
| Wrong | same gradient at `filter: saturate(.25) brightness(.5)`, text `#888`, weight 400 |
| Live (in progress) | team ombre gradient + static orange rim, `box-shadow: inset 0 0 0 2px rgba(243,156,18,.9)` |
| Top 3 confidence picks | gold rim, `box-shadow: inset 0 0 0 2px rgba(255,215,0,.85)` |
| No pick, or hidden before kickoff | slate `·` on `rgba(52,73,94,.4)` |

Confidence does **not** modulate color intensity. Gradients stay at full strength;
the gold rim is the only weight signal.

A live cell that is also a top-3 pick shows the orange rim — live state wins,
since it is the more time-sensitive signal.

A wrong cell that is also a top-3 pick keeps its gold rim, dimmed to 40% so the
cell still reads as greyed out. A big bet that lost is worth seeing.

"Top 3" means the three highest confidence values that player assigned that week.
Ranking by value rather than a fixed threshold keeps it correct in 14-, 15-, and
16-game weeks.

### Column header

Away helmet stacked over home helmet, from `window.TeamLogos.logoUrl()`. Once the
game is final the losing team's helmet drops to `opacity: .25; filter: grayscale(1)`
— the same greyed-out language as a wrong pick.

At tier B and C, team abbreviations appear under the helmets, carrying today's
signal: gold (`#ffd700`) for the team the viewer picked and won with, red
(`#ff4444`) for the team the viewer picked and lost with. Tier A shows helmets
only; the full matchup stays in the `title` attribute.

`js/utils/team-logos.js` must be added to this page's script tags — it is not
loaded there today.

### MNF column

A new column between the last game and TOTAL, showing every player's
`mnfTotalPoints`. Not sticky at any breakpoint, so it does not eat the mobile
game budget; TOTAL stays sticky right.

Visible to everyone at all times, including before the Monday game kicks off.

> Owner ruling, recorded deliberately: this shows every player's tiebreaker guess
> before Monday night, which differs from how the page treats regular picks
> (hidden until each game starts). Tony chose this with the tradeoff stated.

The value already rides along in `allPicks[memberId]`, which stores the whole
submission document. Zero additional Firestore reads.

Players with no guess render `—`.

### MNF tiebreak

**The MNF game** is the highest game ID in the week. IDs are chronological
(`week × 100 + n`), so the highest is always the last kickoff — in a Monday
doubleheader week that is the nightcap (Week 7 → `715` HOU@SEA, not `714`).

**The actual total** is `awayScore + homeScore` of that game, available only once
it is final. Until then, place assignment behaves exactly as it does today.

**The comparator**, closest without going over:

1. A player at or under the actual total outranks any player over it.
2. Within each side, the smaller absolute miss wins.
3. If every tied player went over, the smallest overshoot wins.
4. A player with no guess ranks last.
5. Remaining ties fall back to alphabetical, as today.

**Place assignment:**

```
sort players by score, descending
group players by equal score
for each group, base place = (index of its first member) + 1
  if base place is 1, 2, or 3
     and the group has more than one member
     and the actual MNF total is known:
       order the group with the comparator
       assign consecutive places from the base place
  otherwise:
       every member shares the base place (today's behavior)
```

A three-way tie at first resolves to 1st, 2nd, and 3rd — it consumes those medals.
A tie at fourth or lower is left shared as `T4`, unchanged. Resolved top-three
places lose the `T` prefix, since they are no longer tied.

### New module

The tiebreak lives in `public/js/utils/mnf-tiebreak.js`, following the
`team-logos.js` pattern — an IIFE assigning `window.MnfTiebreak` and exporting via
`module.exports` for jest. Three pure functions:

- `mnfGameId(gameIds)` → the highest ID
- `mnfActualTotal(bibleData, gameIds)` → number, or `null` when that game is not final
- `assignPlaces(players, actual)` → the same array with `place` set

Keeping it out of the HTML file is what makes it testable, and follows the
centralized-utility rule in CLAUDE.md.

## Implementation

| File | Change |
|------|--------|
| `public/js/utils/mnf-tiebreak.js` | new — three pure functions above |
| `tests/mnf-tiebreak.test.js` | new — unit tests, no network |
| `public/nerd-universe-grid.html` | matrix CSS replacing `.pick-cell` sizing and `.picks-table` chrome; three breakpoint blocks; helmet header builder in `renderTableHeader()`; tier-aware `createPickCellHTML()`; top-3 rim computed per player row; MNF `<th>` and `<td>`; place assignment calls `MnfTiebreak.assignPlaces`; `team-logos.js` and `mnf-tiebreak.js` script tags |

No other file is touched.

## Testing

**Unit** (`npx jest`, must be green before merge):

- `mnfGameId` picks the highest ID from unsorted input
- `mnfActualTotal` returns null when the game is not final, missing, or has no scores
- comparator: under beats over; nearer under beats further under; all-over falls back to smallest overshoot; missing guess ranks last; equal guesses fall back alphabetically
- `assignPlaces`: three-way tie at first resolves 1/2/3; tie at fourth stays shared `T4`; untied input is unchanged; unknown actual leaves today's behavior intact

**Browser** (console debugging, per CLAUDE.md):

Debug word for this work: **MATRIX**. Every log this feature emits is prefixed
`🎲 MATRIX` so console output can be filtered to just this change.

- 390px / 800px / 1400px — correct tier renders, game-column count as designed
- a wrong pick is greyed, a correct pick is full-strength team color
- a live game shows the orange rim, team color intact
- each player's top three confidence picks carry the gold rim
- helmets load; the loser is dimmed once final
- picks still hidden for other players before kickoff
- sort toggle, user modal, week nav, cache buttons, countdown all still work
- ghost user `okl4sw2aDhW3yKpOfOwe5lH7OQj1` absent

A test harness page is not needed — the Grid itself is the harness. Per Tony's
standing instruction, the browser session must be authenticated before testing.

## Risks

**Helmet loading.** 32 ESPN CDN images in the header. `team-logos.js` returns
`null` for unknown names, so the header falls back to text rather than rendering
a broken image. Images are 15–18px, cached after first paint.

**Tier B row height.** B is the tallest tier at 30px and lands on tablets, where
vertical space is tightest in landscape. Flagged for regression testing at 800px.

**MNF visibility.** Recorded above — an owner ruling, not an oversight.

**Rules page drift.** `public/nerdfootballRules.html` line 57 says "Closest
prediction breaks ties" with no mention of going over, which contradicts the rule
implemented here. Out of scope for this change; raised for a separate ticket.

## Decision log

| Decision | Choice |
|---|---|
| Cell content | A mobile / B tablet / C desktop |
| Column header | both helmets, loser dimmed |
| Confidence weight | full color + gold rim on top 3 |
| Live cells | team colors + static orange rim |
| MNF visibility | always visible to everyone |
| MNF scope | resolves places in this page's display only |
| All tied players over | closest over wins |
| Doubleheader week | last game of the week, by highest ID |
