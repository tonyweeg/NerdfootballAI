# Grid Pick Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild The Grid's picks table on the Tricked Out Ricky pick-matrix layout — denser and responsive across three tiers — keeping The Grid's team ombre gradients and greyed-out wrong picks, and add an MNF points column that resolves tied top-three places.

**Architecture:** The tiebreaker becomes a standalone pure-function module (`public/js/utils/mnf-tiebreak.js`) so it is unit-testable outside a browser, following the existing `team-logos.js` pattern. Everything else is CSS plus two render functions inside `public/nerd-universe-grid.html`. Responsive tiers are driven by CSS custom properties on `.picks-table`, so the existing dynamic-scaling feature multiplies a variable instead of writing inline pixel values that would fight the breakpoints.

**Tech Stack:** Vanilla ES modules + Firebase v10 compat-style globals, Tailwind CDN for utility classes only, jest for unit tests, Firebase Hosting.

**Spec:** `docs/superpowers/specs/2026-09-18-grid-pick-matrix-design.md`

---

## Background for someone new to this repo

`public/nerd-universe-grid.html` is a single 2,415-line file: `<style>` block, markup, then one big `<script type="module">`. There is no build step — the file is served as-is by Firebase Hosting. Edit it directly.

Data already in memory when the table renders:

- `bibleData` — object keyed by game ID (`"116"`, `"715"`) → `{ a, h, awayScore, homeScore, winner, status }`. `a` is the away team's full name (`"Buffalo Bills"`), `h` the home team's.
- `gameIds` — the week's game IDs, strings, sorted ascending. IDs are `week * 100 + n` and chronological, so the highest ID is the week's last kickoff.
- `allPicks[memberId]` — the player's whole Firestore submission document. Numeric keys are game picks (`{ winner, confidence }`); it also carries `mnfTotalPoints`. **The MNF value is already loaded — do not add a fetch.**
- `poolMembers[memberId]` — `{ name, email, participation }`.

Helpers already defined in the file: `isGameCompleted(game)`, `isGameInProgress(game)`, `hasGameStarted(game)`, `getTeamShort(fullName)` → `"BUF"`, `getTeamColorClass(fullName)` → `"team-buffalo"`, `calculateUserTotal(userPicks)`.

Run the unit tests with `npx jest` from the repo root. They must be green before merge.

**Shell note:** Tony's `~/.zshrc` exports another project's `GOOGLE_APPLICATION_CREDENTIALS`. Any command that talks to Firebase must be prefixed `env -u GOOGLE_APPLICATION_CREDENTIALS`. Plain `npx jest` does not need it.

**Do not touch** `public/js/utils/easternTimeParser-v2.js` or any game-time parsing. Its behavior is deliberately frozen (see CLAUDE.md).

---

## File structure

| File | Responsibility |
|------|----------------|
| `public/js/utils/mnf-tiebreak.js` | **New.** Pure functions: find the MNF game, read its total, assign places. No DOM, no Firebase. |
| `tests/mnf-tiebreak.test.js` | **New.** Unit tests for the above. No network. |
| `public/nerd-universe-grid.html` | **Modified.** Matrix CSS + tiers, helmet header, tier-aware cells, MNF column, place assignment wired to the module, dynamic scaling converted to a CSS variable. |

No other file changes.

---

## Task 1: MNF game identification

**Files:**
- Create: `public/js/utils/mnf-tiebreak.js`
- Test: `tests/mnf-tiebreak.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/mnf-tiebreak.test.js`:

```js
const MnfTiebreak = require('../public/js/utils/mnf-tiebreak.js');

describe('mnfGameId', () => {
    test('returns the highest game ID of the week', () => {
        expect(MnfTiebreak.mnfGameId(['101', '102', '116', '115'])).toBe('116');
    });

    test('picks the nightcap in a Monday doubleheader week', () => {
        expect(MnfTiebreak.mnfGameId(['713', '714', '715'])).toBe('715');
    });

    test('does not compare IDs as strings', () => {
        // '9' > '10' lexically; numerically it is not
        expect(MnfTiebreak.mnfGameId(['9', '10'])).toBe('10');
    });

    test('returns null for empty or invalid input', () => {
        expect(MnfTiebreak.mnfGameId([])).toBeNull();
        expect(MnfTiebreak.mnfGameId(null)).toBeNull();
        expect(MnfTiebreak.mnfGameId(['nope'])).toBeNull();
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest tests/mnf-tiebreak.test.js`
Expected: FAIL — `Cannot find module '../public/js/utils/mnf-tiebreak.js'`

- [ ] **Step 3: Write the minimal implementation**

Create `public/js/utils/mnf-tiebreak.js`:

```js
// MNF tiebreaker (NERD-41): the Monday night total breaks ties for the top three
// places. Display only — nothing in this module is persisted, and it never
// touches the DOM or Firebase so it can be unit tested directly.
(function () {
    'use strict';

    // Game IDs are week-scoped and chronological (week * 100 + n), so the highest
    // ID in a week is its last kickoff — the Monday nighter, or in a doubleheader
    // week, the nightcap.
    function mnfGameId(gameIds) {
        if (!Array.isArray(gameIds)) return null;
        let best = null;
        let bestNum = -Infinity;
        for (const id of gameIds) {
            const n = parseInt(id, 10);
            if (!Number.isFinite(n)) continue;
            if (n > bestNum) { bestNum = n; best = String(id); }
        }
        return best;
    }

    const MnfTiebreak = Object.freeze({ mnfGameId });

    if (typeof window !== 'undefined') window.MnfTiebreak = MnfTiebreak;
    if (typeof module !== 'undefined' && module.exports) module.exports = MnfTiebreak;
})();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest tests/mnf-tiebreak.test.js`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add public/js/utils/mnf-tiebreak.js tests/mnf-tiebreak.test.js
git commit -m "NERD-41: identify the MNF game as the week's highest game ID"
```

---

## Task 2: Reading the actual MNF total

`isFinal` is injected rather than reimplemented, so the module cannot drift from the page's own `isGameCompleted`.

**Files:**
- Modify: `public/js/utils/mnf-tiebreak.js`
- Test: `tests/mnf-tiebreak.test.js`

- [ ] **Step 1: Write the failing test**

Append to `tests/mnf-tiebreak.test.js`:

```js
describe('mnfActualTotal', () => {
    const isFinal = (game) => !!game && String(game.status || '').toLowerCase() === 'final';

    const BIBLE = {
        '714': { a: 'Tampa Bay Buccaneers', h: 'Detroit Lions', awayScore: 24, homeScore: 17, status: 'FINAL' },
        '715': { a: 'Houston Texans', h: 'Seattle Seahawks', awayScore: 20, homeScore: 13, status: 'FINAL' }
    };

    test('adds both scores of the last game of the week', () => {
        expect(MnfTiebreak.mnfActualTotal(BIBLE, ['714', '715'], isFinal)).toBe(33);
    });

    test('ignores earlier Monday games in a doubleheader week', () => {
        // 714 totals 41; only 715 counts
        expect(MnfTiebreak.mnfActualTotal(BIBLE, ['714', '715'], isFinal)).not.toBe(41);
    });

    test('returns null while the game is not final', () => {
        const live = { '116': { awayScore: 7, homeScore: 3, status: 'IN_PROGRESS' } };
        expect(MnfTiebreak.mnfActualTotal(live, ['116'], isFinal)).toBeNull();
    });

    test('returns null when scores are missing on a final game', () => {
        const noScores = { '116': { status: 'FINAL' } };
        expect(MnfTiebreak.mnfActualTotal(noScores, ['116'], isFinal)).toBeNull();
    });

    test('handles a 0-0 final as a real total, not as missing', () => {
        const shutout = { '116': { awayScore: 0, homeScore: 0, status: 'FINAL' } };
        expect(MnfTiebreak.mnfActualTotal(shutout, ['116'], isFinal)).toBe(0);
    });

    test('returns null for missing game data', () => {
        expect(MnfTiebreak.mnfActualTotal({}, ['116'], isFinal)).toBeNull();
        expect(MnfTiebreak.mnfActualTotal(null, ['116'], isFinal)).toBeNull();
    });

    test('accepts string scores, which is how ESPN sometimes stores them', () => {
        const strings = { '116': { awayScore: '21', homeScore: '17', status: 'FINAL' } };
        expect(MnfTiebreak.mnfActualTotal(strings, ['116'], isFinal)).toBe(38);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest tests/mnf-tiebreak.test.js`
Expected: FAIL — `MnfTiebreak.mnfActualTotal is not a function`

- [ ] **Step 3: Write the minimal implementation**

In `public/js/utils/mnf-tiebreak.js`, add this function after `mnfGameId`:

```js
    // Total points in the MNF game, or null while it is unplayed or unscored.
    // `isFinal` is injected by the caller — the page passes its own
    // isGameCompleted so this module cannot drift from the page's definition.
    function mnfActualTotal(bibleData, gameIds, isFinal) {
        const id = mnfGameId(gameIds);
        if (!id || !bibleData) return null;
        const game = bibleData[id];
        if (typeof isFinal !== 'function' || !isFinal(game)) return null;
        const away = Number(game.awayScore);
        const home = Number(game.homeScore);
        if (!Number.isFinite(away) || !Number.isFinite(home)) return null;
        return away + home;
    }
```

Update the frozen export:

```js
    const MnfTiebreak = Object.freeze({ mnfGameId, mnfActualTotal });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest tests/mnf-tiebreak.test.js`
Expected: PASS, 11 tests

- [ ] **Step 5: Commit**

```bash
git add public/js/utils/mnf-tiebreak.js tests/mnf-tiebreak.test.js
git commit -m "NERD-41: read the actual MNF total from the week's final game"
```

---

## Task 3: The comparator and place assignment

**Files:**
- Modify: `public/js/utils/mnf-tiebreak.js`
- Test: `tests/mnf-tiebreak.test.js`

- [ ] **Step 1: Write the failing test**

Append to `tests/mnf-tiebreak.test.js`:

```js
describe('assignPlaces', () => {
    // helper: build players already sorted by score descending
    const P = (name, score, mnfGuess) => ({ name, score, mnfGuess });
    const places = (players, actual) =>
        MnfTiebreak.assignPlaces(players, actual).map((p) => [p.name, p.place]);

    test('leaves an untied field exactly as it is', () => {
        expect(places([P('Ann', 90, 40), P('Bob', 80, 40), P('Cal', 70, 40)], 47))
            .toEqual([['Ann', '🥇'], ['Bob', '🥈'], ['Cal', '🥉']]);
    });

    test('under beats over — 46 wins over 51 when the actual is 47', () => {
        expect(places([P('Tony', 88, 51), P('Dave', 88, 46), P('Ric', 85, 40)], 47))
            .toEqual([['Dave', '🥇'], ['Tony', '🥈'], ['Ric', '🥉']]);
    });

    test('nearer under beats further under', () => {
        expect(places([P('Ann', 88, 30), P('Bob', 88, 46)], 47))
            .toEqual([['Bob', '🥇'], ['Ann', '🥈']]);
    });

    test('an exact guess wins outright', () => {
        expect(places([P('Ann', 88, 40), P('Bob', 88, 47)], 47))
            .toEqual([['Bob', '🥇'], ['Ann', '🥈']]);
    });

    test('when everyone went over, the smallest overshoot wins', () => {
        expect(places([P('Ann', 88, 58), P('Bob', 88, 52)], 47))
            .toEqual([['Bob', '🥇'], ['Ann', '🥈']]);
    });

    test('a player with no guess ranks last in the group', () => {
        expect(places([P('Ann', 88, null), P('Bob', 88, 58)], 47))
            .toEqual([['Bob', '🥇'], ['Ann', '🥈']]);
    });

    test('identical guesses fall back to alphabetical', () => {
        expect(places([P('Zed', 88, 44), P('Abe', 88, 44)], 47))
            .toEqual([['Abe', '🥇'], ['Zed', '🥈']]);
    });

    test('a three-way tie at first consumes all three medals', () => {
        expect(places([P('Ann', 88, 30), P('Bob', 88, 46), P('Cal', 88, 52)], 47))
            .toEqual([['Bob', '🥇'], ['Ann', '🥈'], ['Cal', '🥉']]);
    });

    test('a tie for second resolves into second and third', () => {
        expect(places([P('Ann', 99, 40), P('Bob', 88, 52), P('Cal', 88, 46)], 47))
            .toEqual([['Ann', '🥇'], ['Cal', '🥈'], ['Bob', '🥉']]);
    });

    test('a tie outside the top three stays shared', () => {
        const out = places(
            [P('Ann', 99, 40), P('Bob', 95, 40), P('Cal', 92, 40), P('Dee', 80, 46), P('Eve', 80, 52)],
            47
        );
        expect(out).toEqual([['Ann', '🥇'], ['Bob', '🥈'], ['Cal', '🥉'], ['Dee', 'T4'], ['Eve', 'T4']]);
    });

    test('with no actual total yet, tied players share a medal as before', () => {
        expect(places([P('Tony', 88, 51), P('Dave', 88, 46)], null))
            .toEqual([['Tony', '🥇'], ['Dave', '🥇']]);
    });

    test('a 0-0 actual total still resolves — 0 is not "unknown"', () => {
        expect(places([P('Ann', 88, 10), P('Bob', 88, 3)], 0))
            .toEqual([['Bob', '🥇'], ['Ann', '🥈']]);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest tests/mnf-tiebreak.test.js`
Expected: FAIL — `MnfTiebreak.assignPlaces is not a function`

- [ ] **Step 3: Write the minimal implementation**

In `public/js/utils/mnf-tiebreak.js`, add after `mnfActualTotal`:

```js
    function byName(a, b) {
        return String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase());
    }

    function guessOf(player) {
        const n = Number(player.mnfGuess);
        return Number.isFinite(n) ? n : null;
    }

    // Closest without going over. At or under the actual total beats over it;
    // within a side the smaller miss wins; no guess ranks last; identical
    // guesses fall back to name, which is how this page has always broken ties.
    function compareByMnf(a, b, actual) {
        const ga = guessOf(a);
        const gb = guessOf(b);
        if (ga === null && gb === null) return byName(a, b);
        if (ga === null) return 1;
        if (gb === null) return -1;

        const aOver = ga > actual;
        const bOver = gb > actual;
        if (aOver !== bOver) return aOver ? 1 : -1;

        const da = Math.abs(actual - ga);
        const db = Math.abs(actual - gb);
        if (da !== db) return da - db;
        return byName(a, b);
    }

    function label(place, shared) {
        if (place === 1) return '🥇';
        if (place === 2) return '🥈';
        if (place === 3) return '🥉';
        return shared ? 'T' + place : String(place);
    }

    // Sets `place` on every player, and reorders tied top-three groups so the
    // tiebreak winner sorts first. `players` must already be sorted by score,
    // highest first. `actual` of null/undefined means the MNF game has not
    // finished — groups then share a place, which is this page's old behavior.
    function assignPlaces(players, actual) {
        if (!Array.isArray(players)) return players;
        const known = actual !== null && actual !== undefined;

        let i = 0;
        while (i < players.length) {
            let j = i;
            while (j + 1 < players.length && players[j + 1].score === players[i].score) j++;

            const basePlace = i + 1;
            const size = j - i + 1;

            if (size > 1 && basePlace <= 3 && known) {
                const group = players.slice(i, j + 1).sort((a, b) => compareByMnf(a, b, actual));
                group.forEach((player, k) => {
                    player.place = label(basePlace + k, false);
                    players[i + k] = player;
                });
            } else {
                for (let k = i; k <= j; k++) {
                    players[k].place = label(basePlace, size > 1);
                }
            }
            i = j + 1;
        }
        return players;
    }
```

Update the frozen export:

```js
    const MnfTiebreak = Object.freeze({ mnfGameId, mnfActualTotal, compareByMnf, assignPlaces });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest tests/mnf-tiebreak.test.js`
Expected: PASS, 23 tests

- [ ] **Step 5: Run the whole suite to confirm nothing regressed**

Run: `npx jest`
Expected: PASS, all suites green

- [ ] **Step 6: Commit**

```bash
git add public/js/utils/mnf-tiebreak.js tests/mnf-tiebreak.test.js
git commit -m "NERD-41: resolve tied top-three places, closest without going over"
```

---

## Task 4: Wire the module into the Grid page

This task also fixes a pre-existing bug: places are currently computed from whatever order the table is sorted in, so in alphabetical mode the PLACE column is meaningless. The tiebreak cannot be correct on top of that, so places now always come from a score-ordered copy.

**Files:**
- Modify: `public/nerd-universe-grid.html:651-653` (script tags)
- Modify: `public/nerd-universe-grid.html:1308-1354` (rankings and place assignment)

- [ ] **Step 1: Add the script tags**

At `public/nerd-universe-grid.html` line 653, after the `season-config.js` tag, add two lines:

```html
    <script src="./js/utils/team-logos.js"></script>
    <script src="./js/utils/mnf-tiebreak.js"></script>
```

`team-logos.js` is needed by Task 7 and is not currently loaded on this page. Both are plain scripts assigning to `window`, so they are available before the module script runs.

- [ ] **Step 2: Replace the rankings and place block**

In `renderTableBody()`, find the block that begins `// Calculate rankings with scores for all players` (around line 1308) and ends with the closing `});` of the `playerRankings.forEach` place loop (around line 1354). Replace that entire block with:

```javascript
            // Calculate rankings with scores for all players
            const playerRankings = sortedMemberIds.map(memberId => ({
                memberId,
                member: poolMembers[memberId],
                userPicks: allPicks[memberId],
                isCurrentUser: memberId === currentUserId,
                score: calculateUserTotal(allPicks[memberId]),
                name: poolMembers[memberId].name || poolMembers[memberId].email || 'Unknown',
                mnfGuess: allPicks[memberId] ? allPicks[memberId].mnfTotalPoints : null
            }));

            // Places always come from score order, never from the table's current
            // sort — otherwise alphabetical mode hands out places alphabetically.
            const mnfActual = window.MnfTiebreak.mnfActualTotal(bibleData, gameIds, isGameCompleted);
            const byScore = playerRankings.slice().sort((a, b) => {
                if (a.score !== b.score) return b.score - a.score;
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            });
            window.MnfTiebreak.assignPlaces(byScore, mnfActual);

            logger.grid(`🎲 MATRIX places assigned — MNF actual: ${mnfActual === null ? 'not final' : mnfActual}`);
```

`assignPlaces` sets `place` on the same objects that `playerRankings` holds, so no copying back is needed — `byScore` and `playerRankings` share element references.

- [ ] **Step 3: Verify in the browser**

Serve locally and open the page signed in:

```bash
cd /Users/tonyweeg/nerdfootball-project && npx http-server public -p 8080 -c-1
```

Open `http://localhost:8080/nerd-universe-grid.html`, sign in, open the console and filter for `MATRIX`.

Expected: one `🎲 MATRIX places assigned` line per render. Medals still appear in the PLACE column. Toggle the sort button — places stay attached to the same players in both sort modes (this is the bug fix; before the change they would shuffle).

- [ ] **Step 4: Commit**

```bash
git add public/nerd-universe-grid.html
git commit -m "NERD-41: place the Grid's rankings by score and break top-three ties on MNF"
```

---

## Task 5: The MNF column

**Files:**
- Modify: `public/nerd-universe-grid.html` — `renderTableHeader()` around line 1261, `renderTableBody()` around lines 1388 and 1408, and the `<style>` block

- [ ] **Step 1: Add the header cell**

In `renderTableHeader()`, find:

```javascript
            headerHTML += '<th class="total-column">TOTAL</th>';
```

Replace with:

```javascript
            headerHTML += '<th class="mnf-column">MNF</th>';
            headerHTML += '<th class="total-column">TOTAL</th>';
```

- [ ] **Step 2: Add the body cells**

`renderTableBody()` emits rows in two places — the pinned current-user row and the loop over everyone else. Both end the same way. Find each of these two lines:

```javascript
                rowsHTML += `<td class="total-column">${currentUserRow.score}</td>`;
```

```javascript
                rowsHTML += `<td class="total-column">${player.score}</td>`;
```

and insert an MNF cell immediately before each, using the matching variable:

```javascript
                rowsHTML += `<td class="mnf-column">${formatMnfGuess(currentUserRow.mnfGuess)}</td>`;
```

```javascript
                rowsHTML += `<td class="mnf-column">${formatMnfGuess(player.mnfGuess)}</td>`;
```

- [ ] **Step 3: Add the formatter**

Add this function next to `getTeamShort` in the script block:

```javascript
        // MNF tiebreaker guesses are visible to everyone at all times — an
        // explicit product decision, unlike game picks which stay hidden until
        // kickoff. See docs/superpowers/specs/2026-09-18-grid-pick-matrix-design.md
        function formatMnfGuess(value) {
            const n = Number(value);
            return Number.isFinite(n) ? String(n) : '—';
        }
```

- [ ] **Step 4: Style the column**

In the `<style>` block, immediately before the `.total-column` rule, add:

```css
        .mnf-column {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%) !important;
            font-weight: 700;
            text-align: center !important;
            padding: 6px 4px !important;
            min-width: 44px;
            max-width: 44px;
            color: #89CFF0;
            font-size: 14px !important;
            border-left: 2px solid rgba(137, 207, 240, 0.4);
        }
```

The column is deliberately not sticky, so it does not eat into the mobile game budget. TOTAL stays sticky on the right.

- [ ] **Step 5: Verify in the browser**

Reload `http://localhost:8080/nerd-universe-grid.html` signed in.

Expected: an MNF column sits between the last game and TOTAL. Players who entered a tiebreaker show a number; players who did not show `—`. Scroll horizontally — TOTAL stays pinned right, MNF scrolls in just before it.

- [ ] **Step 6: Commit**

```bash
git add public/nerd-universe-grid.html
git commit -m "NERD-41: show every player's MNF tiebreaker guess"
```

---

## Task 6: Matrix chrome and the three responsive tiers

Tier sizes live in CSS custom properties so Task 10 can scale them with a single multiplier.

**Files:**
- Modify: `public/nerd-universe-grid.html` — `<style>` block, the `.picks-table`, `.pick-cell`, `.pick-correct`, `.pick-incorrect`, `.pick-live` rules and the `@media (max-width: 768px)` block

- [ ] **Step 1: Convert the table to matrix chrome**

Find the `.picks-table` rule (around line 81) and change `border-collapse: collapse;` to the separated-tile model, adding the tier variables. The rule becomes:

```css
        .picks-table {
            --tile-w: 48px;
            --tile-h: 20px;
            --tile-font: 10px;
            --matrix-scale: 1;
            width: max-content;
            min-width: 100%;
            border-collapse: separate;
            border-spacing: 2px;
            font-size: 12px;
            background: rgba(15, 15, 30, 0.5);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 100, 255, 0.2);
            border: 1px solid rgba(137, 207, 240, 0.1);
        }
```

- [ ] **Step 2: Rewrite the pick cell**

Replace the whole `.pick-cell` rule (around line 230) with:

```css
        .pick-cell {
            width: calc(var(--tile-w) * var(--matrix-scale));
            min-width: calc(var(--tile-w) * var(--matrix-scale));
            max-width: calc(var(--tile-w) * var(--matrix-scale));
            height: calc(var(--tile-h) * var(--matrix-scale));
            font-size: calc(var(--tile-font) * var(--matrix-scale));
            line-height: 1.2;
            padding: 0 !important;
            border: none !important;
            border-radius: 4px;
            background: rgba(15, 25, 40, 0.8);
            overflow: hidden;
            white-space: nowrap;
        }
```

- [ ] **Step 3: Add the tier rules**

Immediately after the `.pick-cell` rule, add:

```css
        /* Tier A — phones: the tile colour is the team, the number is the confidence */
        @media (max-width: 767px) {
            .picks-table { --tile-w: 26px; --tile-h: 24px; --tile-font: 11px; }
            .pick-cell .team-short { display: none; }
        }

        /* Tier B — tablets: abbreviation stacked over confidence */
        @media (min-width: 768px) and (max-width: 1199px) {
            .picks-table { --tile-w: 40px; --tile-h: 30px; --tile-font: 9px; }
            .pick-cell .team-short { display: block; font-size: 1.1em; }
            .pick-cell .confidence-num { display: block; font-size: 1.2em; }
        }

        /* Tier C — desktop: abbreviation and confidence on one line */
        @media (min-width: 1200px) {
            .picks-table { --tile-w: 48px; --tile-h: 20px; --tile-font: 10px; }
            .pick-cell .team-short { display: inline; margin-right: 3px; }
            .pick-cell .confidence-num { display: inline; opacity: 0.85; }
        }
```

- [ ] **Step 4: Repaint the pick states**

Replace the `.pick-correct` rule (around line 239) with one that lets the team gradient show through — the white gradient it used to force is exactly what this change removes:

```css
        .pick-correct {
            color: #ffffff !important;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
            font-weight: 700;
        }
```

Replace the `.pick-incorrect` rule (around line 259) and its two child rules with:

```css
        .pick-incorrect {
            filter: saturate(0.25) brightness(0.5) !important;
            color: #888888 !important;
            text-shadow: none !important;
            font-weight: 400 !important;
        }

        .pick-incorrect .team-short,
        .pick-incorrect .confidence-num {
            color: #888888 !important;
            font-weight: 400 !important;
        }
```

Replace the `.pick-live` rule (around line 287) and the `.pick-live:hover` rule with a rim that leaves the team colour alone:

```css
        .pick-live {
            box-shadow: inset 0 0 0 2px rgba(243, 156, 18, 0.9);
            color: #ffffff !important;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
            font-weight: 700;
        }
```

- [ ] **Step 5: Add the big-bet rim**

After the `.pick-live` rule, add — order matters, `.pick-live` must win over `.big-bet`, so these go first and `.pick-live` is restated after:

```css
        .pick-cell.big-bet {
            box-shadow: inset 0 0 0 2px rgba(255, 215, 0, 0.85);
        }

        /* A big bet that lost keeps its rim, dimmed, so the cell still reads greyed out */
        .pick-cell.pick-incorrect.big-bet {
            box-shadow: inset 0 0 0 2px rgba(255, 215, 0, 0.34);
        }

        /* Live is the more time-sensitive signal, so it outranks the gold rim */
        .pick-cell.pick-live,
        .pick-cell.pick-live.big-bet {
            box-shadow: inset 0 0 0 2px rgba(243, 156, 18, 0.9);
        }
```

- [ ] **Step 6: Strip the old mobile cell sizing**

In the `@media (max-width: 768px)` block (around line 570), delete the `.pick-cell` rule inside it — the tier rules own cell sizing now. Leave `.picks-table`, `.user-name`, `.team-short` and `.confidence-num` rules in that block alone; Task 9 revisits them.

- [ ] **Step 7: Verify in the browser**

Reload signed in and resize the window through 390px, 800px and 1400px.

Expected: at 390px the tiles show only a confidence number; at 800px the abbreviation sits above the number; at 1400px they share one line. Correct picks show team colours, wrong picks are dark and grey, live games carry an orange rim. Tiles are rounded with visible gaps.

- [ ] **Step 8: Commit**

```bash
git add public/nerd-universe-grid.html
git commit -m "NERD-41: matrix tiles and three responsive tiers on the Grid"
```

---

## Task 7: Helmet column headers

**Files:**
- Modify: `public/nerd-universe-grid.html` — `renderTableHeader()` lines 1188-1259, and the `<style>` block

- [ ] **Step 1: Add the header styles**

In the `<style>` block, after the tier rules from Task 6, add:

```css
        .picks-table thead th.pick-cell {
            height: auto;
            padding: 4px 2px !important;
            vertical-align: bottom;
        }

        .pick-cell .helmet {
            display: block;
            margin: 0 auto;
            width: 15px;
            height: 15px;
            object-fit: contain;
        }

        .pick-cell .helmet.lost {
            opacity: 0.25;
            filter: grayscale(1);
        }

        .pick-cell .matchup-abbr {
            font-size: 8px;
            letter-spacing: 0;
            line-height: 1.2;
        }

        /* Phones show helmets only — the matchup stays in the tooltip */
        @media (max-width: 767px) {
            .pick-cell .matchup-abbr { display: none; }
        }

        @media (min-width: 768px) {
            .pick-cell .helmet { width: 18px; height: 18px; }
        }
```

- [ ] **Step 2: Replace the header cell builder**

In `renderTableHeader()`, replace everything inside the `gameIds.forEach(gameId => { ... });` loop — from `const game = bibleData[gameId];` down to the closing `});` — with:

```javascript
                const game = bibleData[gameId];
                if (game && game.h && game.a) {
                    const homeShort = getTeamShort(game.h);
                    const awayShort = getTeamShort(game.a);
                    const winner = game.winner;
                    const decided = winner &&
                        winner !== 'TBD' &&
                        !winner.toUpperCase().includes('TIE') &&
                        winner !== 'DRAW';

                    const currentUserPicks = allPicks[auth.currentUser?.uid];
                    const myPick = currentUserPicks && currentUserPicks[gameId]
                        ? currentUserPicks[gameId].winner
                        : null;

                    // Gold for the team you picked and won with, red for the one
                    // you picked and lost with — the Grid's existing signal.
                    const abbrClass = (team) => {
                        if (!decided || myPick !== team) return '';
                        return winner === team ? 'gold-text' : 'red-text';
                    };

                    const helmetFor = (team, short) => {
                        const url = window.TeamLogos.logoUrl(team);
                        const lost = decided && winner !== team ? ' lost' : '';
                        return url
                            ? `<img class="helmet${lost}" src="${url}" alt="${short}" loading="lazy">`
                            : `<span class="matchup-abbr">${short}</span>`;
                    };

                    const title = `${awayShort} @ ${homeShort}`;
                    headerHTML += `<th class="pick-cell" title="${title}">` +
                        helmetFor(game.a, awayShort) +
                        helmetFor(game.h, homeShort) +
                        `<div class="matchup-abbr">` +
                            `<span class="${abbrClass(game.a)}">${awayShort}</span>/` +
                            `<span class="${abbrClass(game.h)}">${homeShort}</span>` +
                        `</div>` +
                    `</th>`;
                } else {
                    headerHTML += `<th class="pick-cell">G${gameId}</th>`;
                }
```

- [ ] **Step 3: Verify in the browser**

Reload signed in.

Expected: each game column shows two helmets, away above home. On a finished game the loser's helmet is faded and grey. At 768px and wider, abbreviations appear beneath — gold where you picked the winner, red where you picked the loser. Hovering a header shows `AWAY @ HOME`.

Check the console for 404s on helmet images. There should be none; `team-logos.js` returns `null` for unknown names and the code falls back to text.

- [ ] **Step 4: Commit**

```bash
git add public/nerd-universe-grid.html
git commit -m "NERD-41: helmet column headers with the loser dimmed"
```

---

## Task 8: Tier-aware cells and the big-bet rim

**Files:**
- Modify: `public/nerd-universe-grid.html` — `renderTableBody()` game-cell loops around lines 1385 and 1404, `createPickCellHTML()` around lines 1416-1482

- [ ] **Step 1: Compute each player's top three**

Add this function next to `formatMnfGuess`:

```javascript
        // The three highest confidence values this player assigned. Ranking by
        // value rather than a fixed number keeps it right in 14-, 15- and
        // 16-game weeks.
        function topConfidenceValues(userPicks) {
            if (!userPicks) return new Set();
            const values = Object.keys(userPicks)
                .filter(k => k.match(/^\d+$/))
                .map(k => Number(userPicks[k] && userPicks[k].confidence))
                .filter(n => Number.isFinite(n) && n > 0);
            values.sort((a, b) => b - a);
            return new Set(values.slice(0, 3));
        }
```

- [ ] **Step 2: Pass it into the cell builder**

`createPickCellHTML` is called from two loops. Replace the pinned current-user loop:

```javascript
                gameIds.forEach(gameId => {
                    rowsHTML += createPickCellHTML(gameId, currentUserRow.userPicks, currentUserRow.memberId);
                });
```

with:

```javascript
                const currentUserTop = topConfidenceValues(currentUserRow.userPicks);
                gameIds.forEach(gameId => {
                    rowsHTML += createPickCellHTML(gameId, currentUserRow.userPicks, currentUserRow.memberId, currentUserTop);
                });
```

and the everyone-else loop:

```javascript
                gameIds.forEach(gameId => {
                    rowsHTML += createPickCellHTML(gameId, player.userPicks, player.memberId);
                });
```

with:

```javascript
                const playerTop = topConfidenceValues(player.userPicks);
                gameIds.forEach(gameId => {
                    rowsHTML += createPickCellHTML(gameId, player.userPicks, player.memberId, playerTop);
                });
```

- [ ] **Step 3: Accept and apply the rim**

Change the signature of `createPickCellHTML`:

```javascript
        function createPickCellHTML(gameId, userPicks, memberId, topConfidence) {
```

Then replace the function's final return block — from `let cellClass = 'pick-cell ';` to the closing backtick of the returned template — with:

```javascript
            let cellClass = 'pick-cell ';

            if (isGameComplete) {
                cellClass += isCorrect ? 'pick-correct' : 'pick-incorrect';
            } else if (isGameLive) {
                cellClass += 'pick-live';
            } else {
                cellClass += 'pick-pending';
            }

            const confidence = pick.confidence || 0;
            if (topConfidence && topConfidence.has(Number(confidence))) {
                cellClass += ' big-bet';
            }

            const teamShort = getTeamShort(pick.winner);
            // The team gradient now stays on wrong picks too — the greyed-out
            // look comes from the .pick-incorrect filter, not from dropping it.
            const teamColorClass = getTeamColorClass(pick.winner);
            const title = `${teamShort} · confidence ${confidence}`;

            return `<td class="${cellClass} ${teamColorClass}" title="${title}">
                <div class="team-short">${teamShort}</div>
                <div class="confidence-num">${confidence}</div>
            </td>`;
```

Note the deliberate change on the `teamColorClass` line: it used to be blanked out for wrong picks, which is why they went flat dark. Keeping the class is what makes the greyed-out team gradient possible.

- [ ] **Step 4: Verify in the browser**

Reload signed in, at desktop width.

Expected: each player's three biggest confidence picks carry a gold rim. A wrong big bet still shows a rim, dimmed. A live game shows orange, not gold. Wrong picks show a dark, desaturated version of the team's colours rather than flat slate. Hovering a tile shows `TEAM · confidence N`.

- [ ] **Step 5: Commit**

```bash
git add public/nerd-universe-grid.html
git commit -m "NERD-41: team colours on wrong picks, gold rim on each player's top three"
```

---

## Task 9: Compress the frozen rails on phones

**Files:**
- Modify: `public/nerd-universe-grid.html` — the `@media (max-width: 768px)` block around line 570

- [ ] **Step 1: Replace the mobile block**

Replace the entire `@media (max-width: 768px) { ... }` block with a 767px block matching the tier boundary:

```css
        @media (max-width: 767px) {
            .picks-table {
                font-size: 9px;
            }

            /* The rails eat 270px of a 390px phone at desktop sizes. Compressed
               they cost 140px, which is the difference between two games on
               screen and nine. */
            .place-column {
                min-width: 28px !important;
                max-width: 28px !important;
                font-size: 13px !important;
                padding: 4px 2px !important;
                border-right-width: 2px !important;
            }

            .picks-table th.user-name,
            .user-name {
                left: 28px !important;
                min-width: 68px !important;
                max-width: 68px !important;
                font-size: 11px !important;
                padding: 4px 6px !important;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                border-right-width: 2px !important;
            }

            .total-column {
                min-width: 44px !important;
                max-width: 44px !important;
                font-size: 15px !important;
            }

            .mnf-column {
                min-width: 34px !important;
                max-width: 34px !important;
                font-size: 12px !important;
            }

            .no-picks-pill {
                display: none;
            }
        }
```

The `.user-name` rule sets `left` for both the header cell and the body cells, which carry `left: 60px !important` at desktop.

- [ ] **Step 2: Verify in the browser**

Reload signed in at 390px wide.

Expected: the place badge, a truncated player name, then roughly nine game tiles before you have to scroll. The place and name columns stay pinned while games scroll under them, with no gap or overlap between them. TOTAL stays pinned right.

- [ ] **Step 3: Commit**

```bash
git add public/nerd-universe-grid.html
git commit -m "NERD-41: compress the Grid's frozen rails on phones"
```

---

## Task 10: Make dynamic scaling multiply the tier, not overwrite it

`updateDynamicScaling()` writes `minWidth`, `maxWidth` and `fontSize` inline onto every `.pick-cell` from a hardcoded 45px base. Inline styles beat stylesheet rules, so as written it would erase the tier sizing the moment a column-group filter is toggled.

**Files:**
- Modify: `public/nerd-universe-grid.html` — `updateDynamicScaling()` around line 2330

- [ ] **Step 1: Replace the function body**

Replace the whole of `updateDynamicScaling()` with:

```javascript
        function updateDynamicScaling() {
            const visibleGroups = Object.values(columnGroups).filter(group => group.visible).length;

            let fontScale = 1;
            if (visibleGroups === 2) {
                fontScale = 1.25;
            } else if (visibleGroups === 1) {
                fontScale = 1.5;
            }

            const table = document.getElementById('picks-table');
            if (!table) return;

            // One variable, multiplied into the tier sizes by the stylesheet.
            // Writing pixel values onto each cell here would override whichever
            // responsive tier is active.
            table.style.setProperty('--matrix-scale', fontScale);
            table.style.fontSize = `${12 * fontScale}px`;

            logger.grid(`🎲 MATRIX scaling: ${visibleGroups} groups visible, scale ${fontScale}`);
        }
```

- [ ] **Step 2: Verify in the browser**

Reload signed in. Toggle the column-group filters, then resize the window.

Expected: hiding a group makes the tiles proportionally larger at every width, and the tier layout still switches correctly at 768px and 1200px. Console shows `🎲 MATRIX scaling` on each toggle.

- [ ] **Step 3: Commit**

```bash
git add public/nerd-universe-grid.html
git commit -m "NERD-41: scale matrix tiles through a CSS variable so tiers survive filtering"
```

---

## Task 11: Full regression

**Files:** none — verification only

- [ ] **Step 1: Run the unit suite**

Run: `npx jest`
Expected: every suite green, including the new `mnf-tiebreak` tests.

- [ ] **Step 2: Walk the regression checklist in the browser**

Signed in at `http://localhost:8080/nerd-universe-grid.html`, console filtered to `MATRIX`:

- [ ] 390px — tier A, roughly nine games visible, rails pinned
- [ ] 800px — tier B, abbreviation over confidence
- [ ] 1400px — tier C, abbreviation and confidence on one line
- [ ] Wrong picks show dark desaturated team colours; correct picks show full team colours
- [ ] A live game shows an orange rim with the team colour intact
- [ ] Each player's top three confidence picks carry a gold rim
- [ ] Helmets load, loser dimmed once final, no console 404s
- [ ] Other players' picks still hidden before each game kicks off
- [ ] Sort toggle works, and places stay with their players in both modes
- [ ] Clicking a player name still opens the detail modal
- [ ] Week prev/next still load, refresh and cache buttons still work
- [ ] Countdown timer still updates
- [ ] MNF column shows guesses, `—` where none
- [ ] Ghost user `okl4sw2aDhW3yKpOfOwe5lH7OQj1` is absent from the table

- [ ] **Step 3: Check a tied week if one exists**

Use the week navigation to find a week where two players finished level in the top three, with the Monday game final.

Expected: they no longer share a medal. The one closest to the MNF total without going over holds the higher place, and the console `🎲 MATRIX places assigned` line reports the actual total.

If no such week exists in the current data, note that in the handoff rather than inventing one.

- [ ] **Step 4: Commit any fixes, then stop**

Deployment is Tony's call and his keystroke. Do not run `firebase deploy`. Hand back a summary of what passed and anything that needs his eye.

---

## Out of scope, noted while reading the code

These are real, adjacent, and deliberately not fixed here:

1. `updateColumnVisibility()` computes `columnIndex = index + 2` with the comment "first column is player names", but there are two leading columns (PLACE and PLAYER), so game columns start at index 3. The off-by-one predates this work. Appending the MNF column after the games does not shift any game index, so this change neither fixes nor worsens it.
2. `public/nerdfootballRules.html:57` says "Closest prediction breaks ties" with no going-over rule, contradicting the rule implemented here. Tony asked for closest-without-going-over; the rules page needs its own ticket.
