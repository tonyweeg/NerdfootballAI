# Grid Bento Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put `public/nerd-universe-grid.html` on the shared `nerd-header`, the `nerd-theme` token system, and a bento card layout — including the sign-in gate the page has never had — without touching the pick matrix itself.

**Architecture:** Follow the NERD-39 conversion of `public/tricked-out-ricky.html` exactly: theme stylesheets in the head, a `nerd-header-slot` before paint, then `<main class="lb-main wide">` holding hero, auth card, controls card, loading skeleton and a 12-column `.bento`. Tailwind is removed last so intermediate states stay legible.

**Tech Stack:** Vanilla ES modules, Firebase v10, `nerd-theme.css` / `nerd-header.css` / `nerd-loading.css` / `nerd-leaderboard.css`, jest.

**Spec:** `docs/superpowers/specs/2026-09-18-grid-bento-conversion-design.md`

---

## Background for someone new to this repo

`public/nerd-universe-grid.html` is one 2,267-line file: `<style>`, markup, one `<script type="module">`. No build step — Firebase Hosting serves it as-is.

**The reference implementation is `public/tricked-out-ricky.html`.** Read it first. Every structural question in this plan is answered by looking at what that file does.

Eight pages already run the shared header: `leaderboard.html`, `weekly-leaderboard.html`, `nerds-battlestar-galactica.html`, `picks-landing.html`, `NerdSurvivorPicks.html`, `the-survival-chamber-36-degrees.html`, `tricked-out-ricky.html`, `masters-of-the-nerdUniverse-audit.html`. None of them load Tailwind.

**The shared header component** (`public/js/components/nerd-header.js`) provides brand, page title, theme toggle, the site nav, signed-in user and logout. It knows nothing about Firebase; the page tells it who is signed in:

```javascript
window.NerdHeader.current.setUser(user);          // { email } or null
window.NerdHeader.current.setLogoutHandler(fn);   // logout hidden until set
```

**Theme tokens** live in `public/css/nerd-theme.css`. The ones this plan uses:
`--md-surface` `#101411`, `--md-surface-container` `#182018`,
`--md-surface-container-high` `#1f281f`, `--md-on-surface` `#f1f5ec`,
`--md-on-surface-muted` `#aeb8ad`, `--md-primary` `#b5ff45` (the signature),
`--md-outline` `#465046`, `--md-outline-variant` `#232b23`,
`--md-shape-lg` `12px`, `--md-shape-md` `9px`, `--md-font`, `--md-font-mono`.
There is a light theme too — never hardcode a colour the theme has a token for.

**Card and layout classes** come from `public/css/nerd-leaderboard.css`: `.card`,
`.section-header`, `.message-card`, `.message-title`, `.lb-main`, `.lb-hero`,
`.lb-kicker`, `.lb-title`, `.lb-subtitle`, `.controls`, `.week-nav`,
`.week-display`, `.btn`, `.btn-label`, `.stat-box`, `.stat-label`, `.stat-value`,
`.lb-loading`, `.lb-load-steps`, `.sk`, and `.hidden { display: none !important }`.
The `.bento` / `.span-N` grid is defined per-page — copy it from
`tricked-out-ricky.html` lines 21-36.

Run the unit tests with `npx jest` from the repo root — **273 tests, 15 suites, must stay green.** `tests/nerd-header.test.js` keeps the shared header's nav list in lockstep with the nerd-universe menu.

**Shell note:** Tony's `~/.zshrc` exports another project's `GOOGLE_APPLICATION_CREDENTIALS`. Prefix any Firebase command with `env -u GOOGLE_APPLICATION_CREDENTIALS`. Plain `npx jest` does not need it.

**Do not touch** `public/js/utils/easternTimeParser-v2.js` or any game-time parsing. Its behaviour is deliberately frozen (see CLAUDE.md). The countdown's existing `game.gameTime` / `game.date` / `game.time` reads move verbatim or not at all.

**Do not touch the pick matrix.** These all just shipped on this branch and are the point of the page: the three tier media queries and `--tile-w` / `--tile-h` / `--tile-font`, `.pick-cell`, `.pick-correct`, `.pick-incorrect`, `.pick-live`, `.pick-pending`, `.big-bet`, `.helmet`, `.matchup-abbr`, all 32 `.team-*` gradients, `createPickCellHTML`, `renderTableHeader`, `topConfidenceValues`, `formatMnfGuess`, and `js/utils/mnf-tiebreak.js`.

**The governing rule for colour:** team colours are *data* and stay literal hex. Chrome is *theme* and moves to tokens.

---

## File structure

| File | Responsibility |
|------|----------------|
| `public/nerd-universe-grid.html` | Everything. Head/stylesheets, header slot, hero, auth gate, controls, loading, bento, rails retheme, modal retheme, Tailwind removal, old-CSS deletion. |

No other file changes. No new files.

---

## Task 1: Theme stylesheets, shared header, hero and main wrapper

Tailwind stays loaded through this task, so the page keeps working while the new chrome goes in around it.

**Files:** `public/nerd-universe-grid.html` — `<head>`, and the opening of `<body>`

- [ ] **Step 1: Add the fonts and theme stylesheets to the head**

Find the existing `<head>` block. After the `<title>` line, add:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="./css/nerd-theme.css">
    <link rel="stylesheet" href="./css/nerd-header.css">
    <link rel="stylesheet" href="./css/nerd-loading.css">
    <link rel="stylesheet" href="./css/nerd-leaderboard.css">
    <script src="./js/utils/theme-toggle.js"></script>
```

`theme-toggle.js` must be a plain `<script>` in the head, not deferred — it sets the theme before first paint to avoid a flash.

- [ ] **Step 2: Add the header slot and main wrapper**

Find the opening `<body class="min-h-screen">` and the `<div class="terminal-header">` that follows it. Change the body tag to plain `<body>` and insert the header slot before the terminal header.

**Expect an ugly intermediate state, and do not try to fix it.** The old terminal header ends up sitting inside `<main>`, below the new hero, so the page will briefly show both sets of chrome. Task 2 deletes the terminal header. Leaving it functional through this task is deliberate: the week nav and sort button live in it, so removing it here would break the page before its replacement exists.

```html
<body>
    <div class="nerd-header-slot" data-nerd-header data-title="Picks Grid" data-back="true"></div>
    <script src="./js/components/nerd-header.js"></script>

    <main class="lb-main wide">
        <section class="lb-hero">
            <p class="lb-kicker">Confidence Pool<span class="lb-kicker-rule" aria-hidden="true"></span><span id="grid-kicker">Week -</span></p>
            <h1 class="lb-title">The Grid</h1>
            <p class="lb-subtitle">Every pick from every player. Picks unlock game by game at kickoff.</p>
        </section>
```

`data-title="Picks Grid"` must match the label this page carries in the shared header's own `NAV_ITEMS` (see `js/components/nerd-header.js`) so the nav highlights the current page.

- [ ] **Step 3: Close the main wrapper**

The old markup ends with the user modal, then `<script type="module">`. Find the closing `</div>` of the user modal and add `</main>` immediately after it, before the `<script type="module">` line. The modal must stay OUTSIDE `<main>` — it is a fixed overlay. So the order becomes:

```html
        </div>   <!-- end #main-content -->
    </main>

    <div id="user-modal" class="hidden">
        ...
    </div>

    <script type="module">
```

Move the `<div id="user-modal">` block below `</main>` if it is not already.

- [ ] **Step 4: Add the max-width and bento grid CSS**

At the very top of the existing `<style>` block, add:

```css
        .lb-main.wide { max-width: 1320px; }

        .bento {
            display: grid;
            grid-template-columns: repeat(12, minmax(0, 1fr));
            grid-auto-flow: row dense;
            gap: 1.25rem;
        }
        .bento > .card { margin-bottom: 0; min-width: 0; display: flex; flex-direction: column; }
        .span-3 { grid-column: span 3; }
        .span-12 { grid-column: span 12; }

        @media (max-width: 900px) {
            .bento > .card { grid-column: span 12; }
        }
```

- [ ] **Step 5: Set the kicker week**

In the script, find where `week-display` is set inside `initialize()`:

```javascript
                document.getElementById('week-display').textContent = window.SEASON_CONFIG.format.weekDisplay(currentWeek);
```

Add a line after it:

```javascript
                document.getElementById('grid-kicker').textContent = `Week ${currentWeek}`;
```

- [ ] **Step 6: Verify**

1. `npx jest` → expect 273 passing, 15 suites.
2. Extract the `<script type="module">` body and `node --check` it.
3. Extract the `<style>` block and confirm braces balance (delta 0).
4. Confirm the HTML tag nesting is valid: `<main>` opens once, closes once, and `#user-modal` sits outside it. Report the line numbers of `<main>`, `</main>`, and `<div id="user-modal">`.

- [ ] **Step 7: Commit**

```bash
git add public/nerd-universe-grid.html
git commit -m "NERD-42: shared header, theme stylesheets and hero on the Grid"
```

---

## Task 2: Controls card, and delete the terminal header

**Files:** `public/nerd-universe-grid.html` — markup and `<style>`

- [ ] **Step 1: Replace the terminal header with a controls card**

Delete the entire `<div class="terminal-header"> ... </div>` block. In its place — inside `<main>`, after the `lb-hero` section — put:

```html
        <div class="card">
            <div class="controls">
                <div class="week-nav">
                    <button id="week-prev" class="btn btn-prev" type="button" aria-label="Previous week"><span class="material-symbols-outlined" aria-hidden="true">chevron_left</span><span class="btn-label">Prev</span></button>
                    <span class="week-display" id="week-display">Week -</span>
                    <button id="week-next" class="btn btn-next" type="button" aria-label="Next week"><span class="btn-label">Next</span><span class="material-symbols-outlined" aria-hidden="true">chevron_right</span></button>
                </div>
                <div class="toolbar-actions">
                    <button id="sort-toggle" class="btn" type="button" aria-pressed="true"><span class="material-symbols-outlined" aria-hidden="true">swap_vert</span><span class="btn-label">Sorted by score</span></button>
                    <button id="refresh-grid" class="btn" type="button" aria-label="Refresh"><span class="material-symbols-outlined" aria-hidden="true">refresh</span><span class="btn-label">Refresh</span></button>
                </div>
            </div>
        </div>
```

Three things changed deliberately: the inline `style=` attributes are gone, the `onclick=` handlers are gone (Step 3 wires them), and the Cache Status and Clear Cache buttons are gone entirely.

- [ ] **Step 2: Add the toolbar-actions rule**

`.controls`, `.week-nav`, `.week-display` and `.btn` come from `nerd-leaderboard.css`, but `.toolbar-actions` is defined per-page. Add to the `<style>` block next to the `.bento` rules:

```css
        .toolbar-actions { display: flex; align-items: center; gap: 0.5rem; }
```

- [ ] **Step 3: Wire the buttons with listeners instead of inline handlers**

The old buttons used `onclick="toggleSort()"` and `onclick="location.reload()"`. Find `setupWeekNavigation()` and add the two other listeners at its end:

```javascript
            document.getElementById('sort-toggle').addEventListener('click', () => window.toggleSort());
            document.getElementById('refresh-grid').addEventListener('click', () => location.reload());
```

- [ ] **Step 4: Update toggleSort to drive the new button**

`window.toggleSort` currently flips `.active` / `.inactive` classes and rewrites the button's whole text. Replace its body with:

```javascript
        window.toggleSort = function() {
            sortByScore = !sortByScore;
            const button = document.getElementById('sort-toggle');
            button.setAttribute('aria-pressed', String(sortByScore));
            button.querySelector('.btn-label').textContent = sortByScore ? 'Sorted by score' : 'Sorted by name';
            renderTableBody();
        };
```

Read the existing `window.toggleSort` before replacing it and confirm `renderTableBody()` is what it called to re-render. If it called something else, keep that call — do not change the render path.

- [ ] **Step 5: Delete the cache button handlers**

Delete the `showCacheStatus` and `clearGridCache` functions entirely — their only callers were the two buttons just removed. Grep to confirm nothing else calls them before deleting, and report what you find.

- [ ] **Step 6: Delete the terminal header CSS**

Remove these rules from the `<style>` block completely. Do not re-point them at theme tokens — they are being deleted:

`.terminal-header` · `.grid-title` · `.back-link` · `.back-link:hover` ·
`.nav-button` · `.nav-button:hover` · `.nav-button:disabled` · `#week-display` ·
`.info-pill` · `.toggle-button` · `.toggle-button:hover` · `.toggle-button.active`

Note `#week-display` is an ID rule for the old pill; the new markup uses
`class="week-display"` from `nerd-leaderboard.css`, so the ID rule must go or it
will override the themed one.

- [ ] **Step 7: Verify**

1. `npx jest` → 273 passing.
2. `node --check` the extracted module body.
3. Style-block braces balance (delta 0).
4. Grep for each deleted class name (`terminal-header`, `grid-title`, `back-link`, `nav-button`, `info-pill`, `toggle-button`) and confirm zero remaining references in markup and CSS. Paste the output.
5. Grep for `showCacheStatus` and `clearGridCache` — expect zero.
6. Confirm `countdown-timer` and `user-info` — both were inside the deleted terminal header — are handled: `user-info` is now the shared header's job, and `countdown-timer` moves to a fact card in Task 5. Until Task 5 lands, the countdown's `document.getElementById('countdown-timer')` will return null. **Guard it now** so the page does not throw: find the countdown update and make it bail when the element is missing.

```javascript
            const timerElement = document.getElementById('countdown-timer');
            if (!timerElement) return;
```

Also remove the two `document.getElementById('user-info').textContent = ...` writes in `waitForFirebaseAuth` — that element no longer exists.

- [ ] **Step 8: Commit**

```bash
git add public/nerd-universe-grid.html
git commit -m "NERD-42: controls card replaces the terminal header"
```

---

## Task 3: The sign-in gate

The page has never had one. `initialize()` runs regardless of auth: `waitForFirebaseAuth()` resolves whether or not a user exists, then everything loads and renders. A signed-out visitor sees the whole Grid — current-week picks for unstarted games are still hidden by `shouldHidePick`, but every past week and every started game is fully readable by anyone with the URL.

**Files:** `public/nerd-universe-grid.html` — markup and the script's init path

- [ ] **Step 1: Add the auth card markup**

Inside `<main>`, immediately after the `lb-hero` section and BEFORE the controls card, add:

```html
        <div id="auth-section" class="card message-card hidden">
            <span class="material-symbols-outlined" aria-hidden="true">lock</span>
            <div class="message-title">Sign in required</div>
            <p>Sign in to NerdUniverse to see The Grid. <a href="./index.html">Go to sign in</a></p>
        </div>
```

- [ ] **Step 2: Wrap the controls card and bento so they can be hidden together**

The controls card, the loading section and the bento all need to disappear when signed out. The page already has a `#main-content` wrapper — confirm by reading the markup that the controls card from Task 2 and the grid container are both inside `<div id="main-content" class="hidden">`. If the controls card ended up outside it, move it inside. Report which you found.

- [ ] **Step 3: Replace waitForFirebaseAuth with a real gate**

Delete `waitForFirebaseAuth()` and the `await waitForFirebaseAuth();` line at the top of `initialize()`. Replace the bottom-of-script `initialize();` call with an auth-driven entry point:

```javascript
        // The page renders nothing until Firebase has told us who is signed in.
        // Signed out gets the auth card, not an indefinite loader.
        onAuthStateChanged(auth, (user) => {
            logger.grid(`🎲 MATRIX auth: ${user ? user.uid : 'signed out'}`);

            const header = window.NerdHeader && window.NerdHeader.current;
            if (header) {
                header.setUser(user);
                header.setLogoutHandler(user ? async () => {
                    await signOut(auth);
                    window.location.href = './index.html';
                } : null);
            }

            document.getElementById('auth-section').classList.toggle('hidden', !!user);
            document.getElementById('main-content').classList.toggle('hidden', !user);

            if (user) {
                initialize();
            } else {
                hideLoading();
            }
        });
```

`onAuthStateChanged` and `signOut` are already imported at the top of this module — confirm that and report. `GoogleAuthProvider` and `signInWithPopup` are imported but now unused (the auth card links to `index.html` to sign in); remove them from the import list and say so.

- [ ] **Step 4: Make hideLoading safe when signed out**

`hideLoading()` currently unhides `#main-content`, which would defeat the gate. Read it and change it so it only hides the loader, leaving `#main-content` visibility to the auth handler:

```javascript
        function hideLoading() {
            const loader = document.getElementById('grid-loading');
            if (loader) loader.hidden = true;
        }
```

Task 4 creates `#grid-loading`. Until then the old `#loading-screen` still exists — keep hiding that too in this step, and Task 4 removes the old one:

```javascript
        function hideLoading() {
            const old = document.getElementById('loading-screen');
            if (old) old.classList.add('hidden');
            const loader = document.getElementById('grid-loading');
            if (loader) loader.hidden = true;
        }
```

- [ ] **Step 5: Verify**

1. `npx jest` → 273 passing.
2. `node --check` the extracted module body.
3. Confirm `initialize()` is no longer called at module top level — grep for `initialize();` and confirm the only call is inside the `onAuthStateChanged` callback.
4. Confirm `waitForFirebaseAuth` is gone — grep for it, expect zero.
5. Confirm the unused imports were removed — grep the import line for `GoogleAuthProvider` and `signInWithPopup`, expect zero.
6. Reason about and report: with `#main-content` hidden when signed out, does any render function still run and throw on a missing element? Trace what happens on the signed-out path.

- [ ] **Step 6: Commit**

```bash
git add public/nerd-universe-grid.html
git commit -m "NERD-42: add the sign-in gate the Grid never had

initialize() previously ran regardless of auth, so a signed-out visitor
got the whole board — current-week picks stayed hidden by shouldHidePick,
but every past week and every started game was readable by anyone with
the URL. Now Firebase decides first: signed out gets the auth card."
```

---

## Task 4: Loading skeleton and load steps

**Files:** `public/nerd-universe-grid.html` — markup, head scripts, script body

- [ ] **Step 1: Add the load-steps component script**

In the head, next to the other component scripts, add:

```html
    <script src="./js/components/load-steps.js"></script>
```

Read `public/js/components/load-steps.js` and `public/tricked-out-ricky.html` around its `NerdLoadSteps.mount(...)` call to see the API before using it.

- [ ] **Step 2: Replace the old loading screen markup**

Delete the `<div id="loading-screen" class="flex items-center justify-center min-h-screen"> ... </div>` block entirely. Inside `<main>`, after the controls card and before the bento, add:

```html
        <section id="grid-loading" class="lb-loading" data-loader hidden>
            <div class="card" aria-hidden="true">
                <div class="sk sk-lg sk-w-40"></div>
                <div class="lb-sk-row"><div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>
                <div class="lb-sk-row"><div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>
                <div class="lb-sk-row"><div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>
            </div>
            <div id="grid-load-steps" class="lb-load-steps"></div>
        </section>
```

- [ ] **Step 3: Simplify hideLoading now the old element is gone**

```javascript
        function hideLoading() {
            const loader = document.getElementById('grid-loading');
            if (loader) loader.hidden = true;
        }
```

- [ ] **Step 4: Show the loader and mount the steps**

The real API, confirmed by reading `js/components/load-steps.js` and its use in `tricked-out-ricky.html`:

- `NerdLoadSteps.mount(container, steps, options)` where each step is `{ key, label }` — **`key`, not `id`**
- `options` takes `{ root, onRetry }`; `root` is the section that carries `data-state` for the failure styling, `onRetry` wires the Retry button
- The returned object exposes `start(key)`, `done(key)`, `skip(key)`, `fail(key, message)`, `state(key)` and `finish()`

In `initialize()`, before the first `await`, add:

```javascript
                const loaderEl = document.getElementById('grid-loading');
                if (loaderEl) {
                    loaderEl.hidden = false;
                    loaderEl.removeAttribute('data-state');
                }
                const loader = window.NerdLoadSteps
                    ? window.NerdLoadSteps.mount(document.getElementById('grid-load-steps'), [
                        { key: 'members', label: 'Pool members' },
                        { key: 'games', label: `Week ${currentWeek} games` },
                        { key: 'picks', label: `Week ${currentWeek} picks` },
                        { key: 'render', label: 'Building the matrix' }
                      ], { root: loaderEl, onRetry: () => location.reload() })
                    : null;
```

Then bracket each phase. Before `await loadPoolMembers();` add `if (loader) loader.start('members');` and after it `if (loader) loader.done('members');`. Same pairing around `loadBibleData()` with `'games'`, `loadAllPicks()` with `'picks'`, and `renderGrid()` with `'render'`.

In the `catch` block of `initialize()`, report the failure through the loader so the Retry button appears instead of a dead skeleton:

```javascript
            } catch (error) {
                logger.error('GRID', '❌ Error initializing grid:', error);
                if (loader) loader.fail(error.step || 'members', 'Grid failed to load');
                showError('Grid load failed. Refresh the page.');
            }
```

`loader` must be declared with `let` outside the `try` for the `catch` to see it — check the existing brace structure of `initialize()` and hoist the declaration if needed. Report what you did.

- [ ] **Step 5: Replace showError with a themed card**

`showError` currently writes Tailwind-classed markup into `#loading-screen`, which no longer exists. Replace it:

```javascript
        function showError(message) {
            const loader = document.getElementById('grid-loading');
            if (loader) loader.hidden = true;
            const board = document.getElementById('board');
            if (!board) return;
            board.innerHTML = `
                <div class="card message-card span-12">
                    <span class="material-symbols-outlined" aria-hidden="true">error</span>
                    <div class="message-title">Grid failed to load</div>
                    <p>${message}</p>
                </div>`;
        }
```

`#board` is created in Task 5. Until then this is a no-op guarded by the null check — that is intentional, not a bug.

- [ ] **Step 6: Verify**

1. `npx jest` → 273 passing.
2. `node --check` the extracted module body.
3. Grep for `loading-screen` — expect zero references in markup and script.
4. Report the real `NerdLoadSteps` method names you used and where you found them.

- [ ] **Step 7: Commit**

```bash
git add public/nerd-universe-grid.html
git commit -m "NERD-42: skeleton loader and load steps on the Grid"
```

---

## Task 5: The bento — four fact cards and the matrix card

**Files:** `public/nerd-universe-grid.html` — markup and script

- [ ] **Step 1: Wrap the table in a bento**

Find the `<div class="grid-container">` that holds `<table id="picks-table">`, and the instructions div after it:

```html
        <div class="mt-2 text-left text-xs text-nerd-grey">
            CLICK USER NAME FOR DETAILS • SCROLL TO VIEW ALL GAMES
        </div>
```

Replace the whole region — from the opening of `grid-container` through that instructions div — with:

```html
            <div id="board" class="bento">
                <section class="card span-3">
                    <div class="fact-label"><span class="material-symbols-outlined" aria-hidden="true">timer</span>Next kickoff</div>
                    <div class="fact-value highlight" id="fact-kickoff">—</div>
                    <div class="fact-sub" id="fact-kickoff-sub">Checking the schedule</div>
                </section>
                <section class="card span-3">
                    <div class="fact-label"><span class="material-symbols-outlined" aria-hidden="true">groups</span>Players</div>
                    <div class="fact-value" id="fact-players">—</div>
                    <div class="fact-sub" id="fact-players-sub"></div>
                </section>
                <section class="card span-3">
                    <div class="fact-label"><span class="material-symbols-outlined" aria-hidden="true">sports_football</span>Games final</div>
                    <div class="fact-value" id="fact-final">—</div>
                    <div class="fact-sub" id="fact-final-sub"></div>
                </section>
                <section class="card span-3">
                    <div class="fact-label"><span class="material-symbols-outlined" aria-hidden="true">trophy</span>Leader</div>
                    <div class="fact-value" id="fact-leader">—</div>
                    <div class="fact-sub" id="fact-leader-sub"></div>
                </section>

                <section class="card span-12">
                    <div class="section-header">
                        <h2 class="section-title"><span class="material-symbols-outlined" aria-hidden="true">apps</span>Pick Matrix</h2>
                        <span class="section-note">Click a player for detail · scroll for all games</span>
                    </div>
                    <div class="grid-container">
                        <table id="picks-table" class="picks-table">
                            <thead id="table-header"></thead>
                            <tbody id="table-body"></tbody>
                        </table>
                    </div>
                </section>
            </div>
```

- [ ] **Step 2: Add the fact-card and section-note CSS**

`.card`, `.section-header` and `.section-title` come from `nerd-leaderboard.css`. The fact classes are per-page — add to the `<style>` block by the `.bento` rules:

```css
        .fact-label {
            display: flex;
            align-items: center;
            gap: 0.375rem;
            font-family: var(--md-font-mono);
            font-size: 0.6875rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--md-on-surface-muted);
            margin-bottom: 0.5rem;
        }
        .fact-label .material-symbols-outlined { font-size: 15px; }
        .fact-value { font-size: 1.5rem; font-weight: 700; line-height: 1.1; color: var(--md-on-surface); }
        .fact-value.highlight { color: var(--md-primary); }
        .fact-sub { margin-top: 0.25rem; font-size: 0.75rem; color: var(--md-on-surface-disabled); }
        .section-note { font-family: var(--md-font-mono); font-size: 0.6875rem; color: var(--md-on-surface-disabled); }
```

- [ ] **Step 3: Retheme the grid container**

Replace the existing `.grid-container` rule with one on tokens — it currently hardcodes a blue-tinted glass look:

```css
        .grid-container {
            max-height: 80vh;
            overflow: auto;
            position: relative;
            background: var(--md-surface-container-low);
            border: 1px solid var(--md-outline-variant);
            border-radius: var(--md-shape-md);
            scrollbar-width: thin;
            scrollbar-color: var(--md-outline) transparent;
        }
        .grid-container::-webkit-scrollbar { width: 6px; height: 6px; }
        .grid-container::-webkit-scrollbar-track { background: transparent; }
        .grid-container::-webkit-scrollbar-thumb { background: var(--md-outline); border-radius: 3px; }
```

Delete the old `.grid-container::after` rule if one exists — read it first and report what it did.

- [ ] **Step 4: Point the countdown at its new card**

The countdown wrote to `#countdown-timer`, guarded to a no-op in Task 2. Find the countdown update and change its target to the fact card. It currently formats something like `⏱️ 4:12:09`; the card has a label already, so write the bare value:

```javascript
            const timerElement = document.getElementById('fact-kickoff');
            if (!timerElement) return;
```

Then replace the text assignments in that function so they write the plain time to `fact-kickoff` and the matchup to `fact-kickoff-sub`. **Read the existing function first** — it has several branches (no games left, all final, counting down). Preserve every branch's meaning; only change where the text lands and drop the emoji prefix. Report each branch and what you mapped it to.

Do not change how game times are read. The `game.gameTime` / `game.date` / `game.time` fallback chain stays exactly as it is.

- [ ] **Step 5: Populate the other three fact cards**

`updateStats()` currently computes four values and has every write commented out. Replace the whole function with one that fills the three remaining cards:

```javascript
        // Note: this function previously computed userRankings, leaderInfo,
        // consensus, upsetAlerts and contrarianPicks and then discarded all of
        // it — every write was commented out under "Stats grid removed".
        // The helpers still exist (calculateUserRankings, calculateConsensus,
        // getUpsetAlerts, getContrarianPicks) if more cards are wanted later.
        function updateStats() {
            const memberIds = Object.keys(poolMembers).filter(memberId => {
                const member = poolMembers[memberId];
                return member.participation?.confidence?.enabled !== false;
            });

            const withPicks = memberIds.filter(id => {
                const picks = allPicks[id];
                return picks && Object.keys(picks).some(k => k.match(/^\d+$/));
            }).length;

            document.getElementById('fact-players').textContent = String(memberIds.length);
            document.getElementById('fact-players-sub').textContent =
                withPicks === memberIds.length ? 'all picks in' : `${memberIds.length - withPicks} without picks`;

            const finalCount = gameIds.filter(id => isGameCompleted(bibleData[id])).length;
            document.getElementById('fact-final').textContent = `${finalCount} / ${gameIds.length}`;
            document.getElementById('fact-final-sub').textContent =
                finalCount === gameIds.length ? 'week complete' : `${gameIds.length - finalCount} still to play`;

            const ranked = memberIds
                .map(id => ({
                    name: poolMembers[id].name || poolMembers[id].email || 'Unknown',
                    score: calculateUserTotal(allPicks[id]),
                    mnf: allPicks[id] ? allPicks[id].mnfTotalPoints : null
                }))
                .sort((a, b) => b.score - a.score || a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

            const leader = ranked[0];
            document.getElementById('fact-leader').textContent = leader ? leader.name : '—';
            document.getElementById('fact-leader-sub').textContent = leader
                ? `${leader.score} pts · MNF ${formatMnfGuess(leader.mnf)}`
                : '';

            logger.grid(`🎲 MATRIX stats: ${memberIds.length} players, ${finalCount}/${gameIds.length} final`);
        }
```

The member filter duplicates the one in `renderTableBody()`. That is deliberate for now — do not refactor it into a shared helper in this task; note it as a concern instead.

- [ ] **Step 6: Verify**

1. `npx jest` → 273 passing.
2. `node --check` the extracted module body.
3. Style-block braces balance (delta 0).
4. Confirm `#picks-table`, `#table-header` and `#table-body` still exist with those exact ids — every render function targets them.
5. Grep for `countdown-timer` — expect zero.
6. Report your Step 4 branch mapping and your Step 3 finding about `.grid-container::after`.

- [ ] **Step 7: Commit**

```bash
git add public/nerd-universe-grid.html
git commit -m "NERD-42: bento with four fact cards over the matrix

updateStats computed rankings, leader, upsets and contrarian picks and
threw all of it away — every write was commented out. Three of the four
cards now use that machinery."
```

---

## Task 6: Retheme the rail columns

The four frozen columns keep their structure, widths and sticky offsets — only their colours move to tokens. **Do not change any `left`, `right`, `min-width`, `max-width` or `position` value**; those were computed for the matrix's mobile budget and are load-bearing.

**Files:** `public/nerd-universe-grid.html` — `<style>` block

- [ ] **Step 1: Retheme the four rail rules**

Replace the colour-bearing declarations in `.place-column`, `.picks-table th.user-name`, `.user-name`, `.mnf-column` and `.total-column`. Keep every geometry declaration exactly as found. The colours become:

```css
        /* Rails: geometry unchanged, colours on tokens. */
        .place-column {
            background: var(--md-surface-container-high) !important;
            color: var(--md-on-surface) !important;
            border-right: 2px solid var(--md-outline) !important;
            text-shadow: none;
        }

        .picks-table th.user-name,
        .user-name {
            background: var(--md-surface-container) !important;
            color: var(--md-on-surface) !important;
            border-right: 2px solid var(--md-outline) !important;
            text-shadow: none;
        }

        .user-name:hover {
            background: var(--md-surface-container-high) !important;
            color: var(--md-primary) !important;
        }

        .mnf-column {
            background: var(--md-surface-container-high) !important;
            color: var(--md-on-surface-muted) !important;
            border-left: 1px solid var(--md-outline-variant);
        }

        .total-column {
            background: var(--md-surface-container-high) !important;
            color: var(--md-primary) !important;
            border-left: 1px solid var(--md-outline) !important;
            text-shadow: none;
        }
```

These are additions layered after the existing rules OR edits in place — your choice, but the result must be that no hardcoded hex or rgba colour remains on any of the five selectors, and every geometry value is unchanged. State which approach you took.

- [ ] **Step 2: Retheme the table chrome**

`.picks-table` and `.picks-table th` / `td` carry hardcoded blue-glass colours. Retheme only the colour declarations:

- `.picks-table` — `background: var(--md-surface-container-low)`, `border: 1px solid var(--md-outline-variant)`, drop the `box-shadow` and both `backdrop-filter` lines
- `.picks-table th` — `background: var(--md-surface-container-high)`, `color: var(--md-on-surface)`, `border-bottom: 1px solid var(--md-outline-variant)`, drop `backdrop-filter` and `text-shadow`
- `.picks-table td` — `background: transparent`, drop the `border` (the matrix tiles set their own `border: none !important`), keep `text-align`, `vertical-align` and `padding`

**Careful:** `.picks-table td` currently sets `height: 28px` and `font-size: 11px`, which the `.pick-cell` rule beats with `!important`. Leave those two declarations alone or remove them — either is fine — but do not add `!important` to them, which would break the tier sizing.

- [ ] **Step 3: Retheme the remaining odds and ends**

- `.current-user-row .user-name` — use `var(--md-primary-container)` background and `var(--md-primary)` colour
- `.no-picks-pill` — `background: var(--md-error-container)`, `color: var(--md-on-surface)`
- `.user-name.has-picks` / `.user-name.no-picks` — read them first; if they only tint, move to tokens; if they are unused, report and delete
- `.gold-text` / `.red-text` — these mark the viewer's own pick in the helmet header. Move to `var(--md-primary)` and `var(--md-error)` so they track the theme.

- [ ] **Step 4: Verify**

1. `npx jest` → 273 passing.
2. Style-block braces balance (delta 0).
3. **The important check:** grep the `<style>` block for hardcoded colours outside the `.team-*` block and report every remaining one with its line and selector. The only hex that should survive outside `.team-*` is inside `.pick-live` / `.big-bet` rims (deliberate: gold and orange are signals, not theme) and the `.pick-incorrect` grey. Everything else should be a token.
4. Confirm no `left`, `right`, `min-width`, `max-width` or `position` value changed on any rail selector — diff those specifically and report.

- [ ] **Step 5: Commit**

```bash
git add public/nerd-universe-grid.html
git commit -m "NERD-42: rail and table chrome on theme tokens, geometry untouched"
```

---

## Task 7: Retheme the user-detail modal

This is the risky one. `showUserDetails` and its helpers generate roughly 57 class attributes from JS template strings using Tailwind utilities — `bg-gray-100`, `text-nerd-grey`, `border-red-600`, `bg-opacity-20`, `text-gray-900` and friends. There is no test coverage and you only see it by clicking a player name.

**Files:** `public/nerd-universe-grid.html` — `<style>` and the modal-generating functions

- [ ] **Step 1: Inventory what you have to replace**

Before editing, list every distinct class attribute inside the modal-generating code. Run:

```bash
cd /Users/tonyweeg/nerdfootball-project && python3 - <<'PY'
import re
src = open('public/nerd-universe-grid.html').read()
js = re.search(r'<script type="module">(.*?)</script>', src, re.S).group(1)
for m in sorted(set(re.findall(r'class="([^"$]*)"', js))):
    print(repr(m))
PY
```

Paste the output in your report. It is your work list. Note that attributes containing `${...}` are excluded by that regex — grep separately for `class="` followed by a template expression and list those too.

- [ ] **Step 2: Retheme the modal shell**

Replace the `.user-expanded` and `.overlay` rules with token-based ones, keeping their positioning:

```css
        .overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 40;
        }

        .user-expanded {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 50;
            width: min(92vw, 720px);
            max-height: 85vh;
            overflow-y: auto;
            background: var(--md-surface);
            border: 1px solid var(--md-outline-variant);
            border-radius: var(--md-shape-lg);
            box-shadow: var(--md-elev-3);
            font-family: var(--md-font);
            color: var(--md-on-surface);
        }
```

Read the existing rules first and preserve any positioning they relied on that differs from the above. If `--md-elev-3` does not exist in `nerd-theme.css`, use whichever elevation token does — check and report.

- [ ] **Step 3: Add scoped modal classes**

Rather than inlining tokens into 57 template strings, define a small set of classes the JS can use. Add to the `<style>` block:

```css
        .md-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1.25rem 1.25rem 0; }
        .md-title { margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--md-on-surface); }
        .md-close { background: none; border: none; color: var(--md-on-surface-muted); font-size: 1.5rem; line-height: 1; cursor: pointer; padding: 0 0.25rem; }
        .md-close:hover { color: var(--md-primary); }
        .md-body { padding: 1rem 1.25rem 1.25rem; }
        .md-section { margin-bottom: 1rem; }
        .md-section-title { font-family: var(--md-font-mono); font-size: 0.6875rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--md-on-surface-muted); margin-bottom: 0.5rem; }
        .md-note { background: var(--md-surface-container); border: 1px solid var(--md-outline-variant); border-radius: var(--md-shape-md); padding: 0.75rem; font-size: 0.8125rem; color: var(--md-on-surface-variant); }
        .md-note.warn { background: var(--md-error-container); border-color: var(--md-error); }
        .md-note.ok { background: var(--md-primary-container); border-color: var(--md-primary); }
        .md-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        .md-table th { text-align: left; font-family: var(--md-font-mono); font-size: 0.6875rem; text-transform: uppercase; color: var(--md-on-surface-muted); padding: 0.375rem 0.5rem; border-bottom: 1px solid var(--md-outline-variant); }
        .md-table td { padding: 0.375rem 0.5rem; border-bottom: 1px solid var(--md-outline-variant); color: var(--md-on-surface-variant); }
        .md-pick { display: flex; flex-direction: column; align-items: center; gap: 0.125rem; border-radius: var(--md-shape-xs); padding: 0.25rem; min-width: 44px; }
        .md-pick.hit { background: var(--md-primary-container); color: var(--md-on-surface); }
        .md-pick.miss { background: var(--md-surface-container-high); color: var(--md-on-surface-disabled); }
        .md-pick.pending { background: var(--md-surface-container); color: var(--md-on-surface-muted); }
        .md-muted { color: var(--md-on-surface-muted); }
        .md-value { font-weight: 700; color: var(--md-on-surface); }
        .md-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); gap: 0.375rem; }
```

- [ ] **Step 4: Rewrite the generated markup**

Work through your Step 1 inventory and replace every Tailwind class attribute in the modal-generating code with the scoped classes above. The static modal markup also needs converting:

```html
    <div id="user-modal" class="hidden">
        <div class="overlay" id="modal-overlay"></div>
        <div class="user-expanded">
            <div class="md-head">
                <h2 class="md-title" id="modal-user-name">User details</h2>
                <button class="md-close" id="modal-close" type="button" aria-label="Close">&times;</button>
            </div>
            <div class="md-body" id="modal-user-content"></div>
        </div>
    </div>
```

The old markup used `onclick="closeUserModal()"` on both the overlay and the button. Wire them with listeners instead — add near the other listeners:

```javascript
        document.getElementById('modal-overlay').addEventListener('click', () => window.closeUserModal());
        document.getElementById('modal-close').addEventListener('click', () => window.closeUserModal());
```

Map the old looks onto the new classes as follows, and report any case that does not fit:
- a correct/won pick cell (`bg-gray-100` / `text-gray-900`) → `md-pick hit`
- a wrong pick cell (`bg-gray-800` / `text-gray-300`) → `md-pick miss`
- an unplayed pick cell (`bg-nerd-darker` / `text-nerd-grey`) → `md-pick pending`
- a red warning panel (`border-red-600 bg-red-900 bg-opacity-20`) → `md-note warn`
- a yellow caution panel (`border-yellow-600 bg-yellow-900`) → `md-note warn`
- a blue info panel (`border-blue-600 bg-blue-900`) → `md-note`
- a green success panel (`border-nerd-green`) → `md-note ok`
- `text-nerd-grey` on its own → `md-muted`
- `font-bold` / `text-nerd-gold` on a number → `md-value`

- [ ] **Step 5: Verify**

1. `npx jest` → 273 passing.
2. `node --check` the extracted module body.
3. Style-block braces balance (delta 0).
4. Re-run the Step 1 inventory script. **Every remaining class attribute in the module script must be one of: the `md-*` classes, the matrix classes (`pick-cell`, `pick-correct`, `pick-incorrect`, `pick-live`, `pick-pending`, `big-bet`, `team-*`, `team-short`, `confidence-num`, `helmet`, `matchup-abbr`, `place-column`, `user-name`, `mnf-column`, `total-column`, `gold-text`, `red-text`, `no-picks-pill`, `current-user-row`), `hidden`, `card`, `message-card`, `message-title`, `span-12`, or `material-symbols-outlined`.** Paste the output and confirm. Any Tailwind utility still present is an unfinished step.
5. Grep for `onclick=` across the whole file — expect zero.

- [ ] **Step 6: Commit**

```bash
git add public/nerd-universe-grid.html
git commit -m "NERD-42: user-detail modal on theme tokens, no Tailwind utilities"
```

---

## Task 8: Drop Tailwind

Nothing should depend on it by now. This task removes it and fixes whatever falls over.

**Files:** `public/nerd-universe-grid.html` — head and remaining markup

- [ ] **Step 1: Remove the Tailwind script, the warning suppressor and the config**

Delete these three from the head:

```html
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="./js/utils/suppress-tailwind-warning.js"></script>
```

and the entire `<script> tailwind.config = { ... } </script>` block.

- [ ] **Step 2: Find and fix every remaining utility class**

Run this to list what is left in the static markup:

```bash
cd /Users/tonyweeg/nerdfootball-project && python3 - <<'PY'
import re
src = open('public/nerd-universe-grid.html').read()
body = src.split('<body', 1)[1].split('<script type="module">', 1)[0]
for m in sorted(set(re.findall(r'class="([^"$]*)"', body))):
    print(repr(m))
PY
```

Every result must be a class this page or the theme stylesheets define. Replace anything else. The known offenders and their replacements:
- `class="min-h-screen"` on `<body>` → remove the attribute entirely; `nerd-theme.css` handles body layout
- `class="hidden"` → keep, `nerd-leaderboard.css` defines it
- `flex`, `items-center`, `justify-center`, `justify-between`, `gap-*`, `p-*`, `px-*`, `py-*`, `mt-*`, `mb-*`, `text-*`, `w-*`, `h-*` → these should already be gone after Tasks 1-7; if any remain, replace with a scoped class or an inline style on that one element, and report each

Paste the final output showing only allowed classes.

- [ ] **Step 3: Confirm nothing in the script emits a Tailwind class**

```bash
cd /Users/tonyweeg/nerdfootball-project && grep -nE "class=\"[^\"]*(text-nerd|bg-nerd|text-gray|bg-gray|bg-red|bg-yellow|bg-blue|border-red|border-yellow|border-blue|bg-opacity|min-h-screen)" public/nerd-universe-grid.html || echo "clean"
```

Expected: `clean`.

- [ ] **Step 4: Verify**

1. `npx jest` → 273 passing.
2. `node --check` the extracted module body.
3. Grep for `tailwind` in the file — expect zero.
4. Grep for `nerd-green|nerd-gold|nerd-grey|nerd-cyan|nerd-darker|nerd-dark|nerd-bg` — expect zero.
5. Confirm `js/utils/suppress-tailwind-warning.js` is still referenced by other pages before assuming it is now dead — grep `public/*.html` for it and report. Do not delete the file.

- [ ] **Step 5: Commit**

```bash
git add public/nerd-universe-grid.html
git commit -m "NERD-42: drop Tailwind from the Grid

The eight already-converted pages load none, and its CDN preflight
competes with nerd-theme's own reset."
```

---

## Task 9: Delete what the conversion made dead

**Files:** `public/nerd-universe-grid.html` — `<style>` and script

- [ ] **Step 1: Sweep the stylesheet for orphans**

For each rule remaining in the `<style>` block, grep the file for its selector in markup and in script template strings. Any rule with zero users gets deleted. Known candidates from the conversion:

- `.loading` (the old animated bar in the deleted loading screen)
- `@keyframes` that nothing references any more — check each by name
- `.stats-grid`, `.stat-card` or similar left from the commented-out stats grid
- `.user-name.has-picks` / `.no-picks` if Task 6 found them unused

**Report every rule you deleted and the grep that proved it orphaned.** If a selector is only used from a JS template string, it is NOT orphaned — search the script body too.

- [ ] **Step 2: Sweep the script for orphans**

Same treatment for functions. Known candidates:
- `calculateConsensus`, `getUpsetAlerts`, `getContrarianPicks`, `calculateUserRankings`, `getLeaderInfo` — `updateStats` stopped calling some of these in Task 5. **Check each.** The spec deliberately keeps them available for future cards, so **do not delete these** — report which are now uncalled and leave them, with a one-line comment above each noting it is retained for future fact cards.
- Anything else with zero callers — delete and report.

- [ ] **Step 3: Verify**

1. `npx jest` → 273 passing.
2. `node --check` the extracted module body.
3. Style-block braces balance (delta 0).
4. Report the net line count change and the final file length.

- [ ] **Step 4: Commit**

```bash
git add public/nerd-universe-grid.html
git commit -m "NERD-42: remove CSS and helpers the conversion orphaned"
```

---

## Task 10: Regression

**Files:** none — verification only

- [ ] **Step 1: Unit suite**

Run: `npx jest`
Expected: 15 suites, 273 tests, all green.

- [ ] **Step 2: Static sweep**

```bash
cd /Users/tonyweeg/nerdfootball-project
grep -c "tailwind" public/nerd-universe-grid.html          # expect 0
grep -c "onclick=" public/nerd-universe-grid.html          # expect 0
grep -c "terminal-header\|nav-button\|info-pill" public/nerd-universe-grid.html  # expect 0
python3 -c "
import re
src=open('public/nerd-universe-grid.html').read()
css=re.sub(r'/\*.*?\*/','',re.search(r'<style>(.*?)</style>',src,re.S).group(1),flags=re.S)
print('css brace delta:', css.count('{')-css.count('}'))
"
```

- [ ] **Step 3: Serve locally and hand off**

```bash
cd /Users/tonyweeg/nerdfootball-project && npx http-server public -p 8080 -c-1
```

- [ ] **Step 4: Browser checklist — needs an authenticated session**

Console filtered to `MATRIX`. At 390px, 800px and 1400px:

- [ ] Shared header renders; its hamburger opens the site nav; "Picks Grid" is the highlighted item
- [ ] Theme toggle flips light and dark, and the whole page follows — including the rails, the modal and the fact cards
- [ ] Hero shows the right week in the kicker
- [ ] All four fact cards populate; countdown ticks; leader matches the top of the table
- [ ] The matrix is visually unchanged from the previous branch: tiers at each width, team ombre on correct picks, greyed ombre on wrong, orange rim live, gold rim on top three, helmets with loser dimmed, MNF column
- [ ] Week prev/next load; sort toggle flips label and reorders; refresh reloads
- [ ] Clicking a player name opens the modal, themed, for a player **with** picks and a player **without**
- [ ] Signed out (use a private window): the auth card shows, `#main-content` is hidden, no indefinite loader, no console errors
- [ ] Skeleton loader appears on first load and the load steps tick through
- [ ] Nothing shifted oddly from Tailwind preflight removal — check spacing across the whole page, not only the changed parts
- [ ] Ghost user `okl4sw2aDhW3yKpOfOwe5lH7OQj1` absent

- [ ] **Step 5: Hand back, do not deploy**

Deployment is Tony's keystroke. Report what passed, what did not, and anything needing his eye.

---

## Already done before this plan starts

Two of the spec's decisions landed on this branch before the plan was written, so they have no task here:

- **The never-wired column-status filter is gone** (`56a3660`, `85cf47c`). `columnGroups`, `toggleColumnGroup`, `toggleAllColumns`, `categorizeGamesByStatus`, `updateColumnVisibility`, `updateDynamicScaling`, `getGameStatus` and the `--matrix-scale` variable are all removed — 198 lines. Do not go looking for them.
- **`.toggle-button.inactive`** went with it. `.toggle-button`, `:hover` and `.active` survived only because the sort and cache buttons used them; Task 2 removes all three.

## Notes carried forward

1. **`updateStats`'s discarded machinery.** `calculateUserRankings`, `getLeaderInfo`, `calculateConsensus`, `getUpsetAlerts` and `getContrarianPicks` all still exist and are retained deliberately. Upset alerts and contrarian picks would make good fifth and sixth fact cards with no new data reads.
2. **Duplicated member filter.** The confidence-participation filter now appears in both `renderTableBody()` and `updateStats()`. Worth one shared helper, deliberately not done here to keep Task 5 reviewable.
3. **`suppress-tailwind-warning.js`** stays in the repo — other pages still load it.
