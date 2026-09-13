# Shared Header (NERD-20) + Masters Audit Theme Plan

**Goal:** One client-rendered header (brand, page title, theme toggle, hamburger with the full nav, logout) defined once, first adopted on `masters-of-the-nerdUniverse-audit.html`, which also moves to the theme standard.

**Decisions (Tony, 2026-09-13):** build NERD-20 now; audit page is the first adopter. Confidence page and nerd-universe adopt in later PRs.

## Constraints

- Firebase Hosting is static: shared markup must be rendered client-side.
- Pages use different Firebase SDKs (audit: compat v9; nerd-universe: modular v10). The component knows nothing about Firebase; the page passes the user and a logout handler.
- `theme-toggle.js` wires `.theme-toggle` buttons on DOMContentLoaded. A button rendered by the component must be wired exactly once (a double bind flips twice = no-op).
- No aliasing old styling: the audit page's `--nerd-*` palette, gradients, spinner, fibonacci ornament and JetBrains Mono are deleted, not remapped.
- Emoji → Material Symbols; every visible label stays (NERD-23 lesson).
- Page JS ids stay unchanged: `totalUsers`, `completedWeeks`, `survivalRate`, `highScore`, `averageScore`, `week-down`, `week-up`, `current-week-display`, `weeklyGrid`, `seasonLeaderboard`, `seasonMeta`, `survivorStatus`, `survivorMeta`, `authSection`, `mainContent`.

## Component contract

```html
<link rel="stylesheet" href="./css/nerd-header.css">
<div class="nerd-header-slot" data-nerd-header data-title="Masters Audit" data-back="true"></div>
<script src="./js/components/nerd-header.js"></script>
```

```js
const header = window.NerdHeader.current;
header.setUser(user);              // { email } | null
header.setLogoutHandler(async () => { ... });
```

- `NAV_ITEMS`: the 8 nerd-universe menu links, in the same order and with the same icons and labels
- Menu: toggle on button, close on outside click, close on Escape (focus returns to button), `aria-expanded`
- Current page link gets `aria-current="page"`
- `data-back` renders a Nerd Universe back link
- Logout: `confirm()` then handler; hidden when no handler is set
- Mount is idempotent; the slot reserves header height (no layout jump)
- CSS classes namespaced `nh-*`

## Tasks

- [ ] 1. JIRA NERD-20 → In Progress, scope updated; branch `NERD-20-shared-header`
- [ ] 2. `theme-toggle.js`: idempotent wiring + `NerdTheme.wire(root)`; test that one click flips once
- [ ] 3. `tests/nerd-header.test.js` (jsdom), failing first
- [ ] 4. `public/js/components/nerd-header.js` + `public/css/nerd-header.css`
- [ ] 5. Audit page: delete old CSS, rewrite on tokens, mount header, symbols for emoji, escape survivor names
- [ ] 6. Smoke: audit page mounts the header; component ships ≥ 8 labelled nav items
- [ ] 7. Local check: tests green, CSS brace balance, scripts parse, preview renders in both themes
- [ ] 8. PR → CI → merge → deploy hosting → smoke + drift → Tony signed-in check → Done
