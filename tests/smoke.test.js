/**
 * Core-features smoke suite.
 *
 * Encodes the "Core Features That Must Work" list from CLAUDE.md as fast HTTP + content
 * assertions. Parameterized by BASE_URL so the identical suite covers a PR preview
 * channel and production:
 *
 *   npx jest tests/smoke.test.js
 *   BASE_URL=https://nerdfootball--pr-12-abc.web.app npx jest tests/smoke.test.js
 *
 * Markers are taken from the real pages, not invented. If one fails, fix the marker to
 * match the page — never weaken an assertion to something trivially true to get green.
 */

const BASE = (process.env.BASE_URL || 'https://nerdfootball.web.app').replace(/\/$/, '');
const GHOST_UID = 'okl4sw2aDhW3yKpOfOwe5lH7OQj1';

const PAGES = [
  { path: '/nerd-universe.html', marker: 'Nerd Universe' },
  { path: '/nerdfootballConfidencePicks.html', marker: 'Killer Bees' },
  { path: '/NerdSurvivorPicks.html', marker: 'Survival Chamber' },
  { path: '/nerdfootballTheGrid.html', marker: 'The Grid' },
  // Deliberately year-less: the heading currently hardcodes 2025 (NERD-10).
  { path: '/leaderboard.html', marker: 'Season Leaderboard' },
  { path: '/NerdSurvivorAdmin.html', marker: 'Survivor Pool Admin' },
];

jest.setTimeout(30000);

const cache = new Map();

async function get(path) {
  if (!cache.has(path)) {
    const res = await fetch(`${BASE}${path}?smoke=${Date.now()}`);
    cache.set(path, { status: res.status, body: await res.text() });
  }
  return cache.get(path);
}

describe(`smoke: ${BASE}`, () => {
  test.each(PAGES)('$path returns 200 and contains "$marker"', async ({ path, marker }) => {
    const { status, body } = await get(path);
    expect(status).toBe(200);
    expect(body).toContain(marker);
  });

  /**
   * The ghost user must never be DISPLAYED, but pages are allowed — required, even — to
   * reference the id in order to block it. The Grid hardcodes it in filter conditions
   * exactly as CLAUDE.md prescribes. So: pages that block it must keep their blocking
   * code, and every other page must not mention it at all.
   *
   * LIMITATION: a static fetch cannot prove the ghost is absent from rendered output,
   * because user lists are populated client-side from Firestore. That needs a browser
   * check, which this suite deliberately does not attempt.
   */
  const GHOST_BLOCKERS = new Set(['/nerdfootballTheGrid.html']);

  test.each(PAGES.filter((p) => !GHOST_BLOCKERS.has(p.path)))(
    '$path never mentions the ghost user',
    async ({ path }) => {
      const { body } = await get(path);
      expect(body).not.toContain(GHOST_UID);
    },
  );

  test.each(PAGES.filter((p) => GHOST_BLOCKERS.has(p.path)))(
    '$path still blocks the ghost user',
    async ({ path }) => {
      const { body } = await get(path);
      expect(body).toContain(GHOST_UID);
      expect(body).toMatch(/GHOST USER BLOCKED|BLOCKING KNOWN GHOST/);
    },
  );

  test('every core page loads the centralized Firebase config', async () => {
    // Guards the config disaster documented in CLAUDE.md: a wrong messagingSenderId
    // silently breaks authentication.
    for (const { path } of PAGES) {
      const { body } = await get(path);
      expect(body).not.toContain('631080493141');
    }
  });

  test('survivor admin ships its URL-state helpers', async () => {
    // NERD-2's sibling fix: a refresh must restore the selected user and week.
    const { body } = await get('/NerdSurvivorAdmin.html');
    expect(body).toContain('restoreStateFromUrl');
    expect(body).toContain('updateUrlParams');
  });

  test('the grid does not ship picks in the initial HTML', async () => {
    // Pre-game security: picks are fetched client-side after games start, never inlined.
    const { status, body } = await get('/nerdfootballTheGrid.html');
    expect(status).toBe(200);
    expect(body).not.toMatch(/nerdfootball_picks\/\d+\/submissions\/[A-Za-z0-9]{20,}/);
  });
});

/**
 * Regression guard for a bug shipped in NERD-16: the emoji-to-Material-Symbols
 * replacement matched "<span>📊</span> Picks Grid" and replaced the whole
 * string, deleting five navigation labels. Every check at the time passed —
 * icon names were valid and the href count was unchanged — because none of them
 * looked at link text. This one does.
 */
describe(`navigation labels: ${BASE}`, () => {
  test('every hamburger menu item has visible text, not just an icon', async () => {
    const { body } = await get('/nerd-universe.html');
    const panel = body.slice(body.indexOf('id="menu-panel"'));
    const items = [...panel.matchAll(/href="([^"]+)"[^>]*class="menu-item[^"]*">([\s\S]*?)<\/a>/g)];

    expect(items.length).toBeGreaterThanOrEqual(8);

    const unlabelled = items
      .map(([, href, inner]) => {
        // The icon ligature is itself text, so drop the first token.
        const words = inner.replace(/<[^>]+>/g, ' ').trim().split(/\s+/);
        return { href, label: words.slice(1).join(' ') };
      })
      .filter((item) => !item.label);

    expect(unlabelled).toEqual([]);
  });
});
