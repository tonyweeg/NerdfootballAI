# JIRA → PR → Deploy Process Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make it structurally impossible for NerdFootball production to diverge from `origin/main`, with every change flowing through a NERD ticket, a PR with a preview URL, a gated merge, and an automated deploy plus smoke test.

**Architecture:** Four additive phases bolted onto a live system. Phase 0 makes drift *detectable* (a script that reproduces Firebase's own content hashes and diffs the live release against HEAD). Phase 1 makes work *traceable* (ticket → branch → PR → preview channel). Phase 2 makes bad merges *impossible* (green suite as a required check + branch protection). Phase 3 makes deploys *automatic* (CI is the only path to prod). Any phase can stop and still leave the system better than it started.

**Tech Stack:** Node 20+, Jest, `gh` CLI 2.98, Firebase Hosting + Functions, GitHub Actions, Jira Cloud REST v3 / ROVO MCP.

**Spec:** `docs/superpowers/specs/2026-09-10-jira-pr-deploy-process-design.md`

---

## Verified facts this plan depends on

Established empirically on 2026-09-10 — do not re-derive, do not assume alternatives:

1. **Firebase Hosting manifest hash** = `sha256( zlib.gzipSync(fileBuffer, {level: 9}) )`, hex.
   Confirmed against `/NerdSurvivorAdmin.html` → `74b03104f65263ae49cfed7db94e4371143155fce4cde725c1674474bec71090`.
   Levels 1 and 6 do NOT match. The `gzip` CLI at `-9 -n` does NOT match.
2. The same value is served as the CDN `etag` header for that path.
3. Hosting versions API requires a quota-project header:
   `curl -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "x-goog-user-project: nerdfootball" ...`
4. Tony's shell exports another project's `GOOGLE_APPLICATION_CREDENTIALS`. Every `gcloud`/`firebase`
   invocation must be prefixed `env -u GOOGLE_APPLICATION_CREDENTIALS`.
5. `npx jest` runs 56/56 green in ~1.5s after the `modulePathIgnorePatterns` fix in `package.json`.
6. NERD project: cloudId `567d1e15-78f8-4b43-8824-f4e91ee455c9`, project id `10067`,
   issue types Epic `10105`, Story `10106`, Bug `10107`, Task `10108`.

## File structure

| File | Responsibility |
|---|---|
| `scripts/lib/hosting-manifest.js` | Fetch a Hosting release manifest; hash local files the way Firebase does. Pure functions, no CLI output. |
| `scripts/prod-drift-check.js` | CLI wrapper: compare live release to HEAD, print drift, exit 1 on mismatch. |
| `tests/hosting-manifest.test.js` | Unit tests for the hashing + diff logic. No network. |
| `tests/smoke.test.js` | Core-features smoke suite, parameterized by `BASE_URL`. |
| `scripts/jira.js` | Jira REST client for CI: create / transition / comment. Token from env. |
| `.github/pull_request_template.md` | Acceptance criteria + test plan + smoke checklist. |
| `.github/workflows/pr-checks.yml` | On PR: install, jest, preview channel deploy, comment URL. |
| `.github/workflows/deploy.yml` | On push to main: deploy hosting, smoke prod, transition ticket. |
| `.github/workflows/drift-nightly.yml` | Nightly `prod-drift-check.js`; opens an issue on drift. |

---

## Task 1: Hosting manifest library (Phase 0)

**Files:**
- Create: `scripts/lib/hosting-manifest.js`
- Test: `tests/hosting-manifest.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
const { hashBuffer, diffManifests } = require('../scripts/lib/hosting-manifest');

describe('hashBuffer', () => {
  test('reproduces the Firebase Hosting content hash', () => {
    // Known-good pair captured from release a9a8567313832060 on 2026-09-10.
    const buf = require('fs').readFileSync(__dirname + '/fixtures/hash-sample.txt');
    expect(hashBuffer(buf)).toBe(require('./fixtures/hash-sample.expected.json').hash);
  });
});

describe('diffManifests', () => {
  test('reports nothing when live matches local', () => {
    const live = { '/a.html': 'aaa', '/b.html': 'bbb' };
    const local = { '/a.html': 'aaa', '/b.html': 'bbb' };
    expect(diffManifests(live, local)).toEqual({ changed: [], onlyLive: [], onlyLocal: [] });
  });

  test('classifies changed, live-only and local-only paths', () => {
    const live = { '/a.html': 'aaa', '/gone.html': 'ggg' };
    const local = { '/a.html': 'ZZZ', '/new.html': 'nnn' };
    expect(diffManifests(live, local)).toEqual({
      changed: ['/a.html'],
      onlyLive: ['/gone.html'],
      onlyLocal: ['/new.html'],
    });
  });
});
```

- [ ] **Step 2: Create the fixture from real data**

```bash
mkdir -p tests/fixtures
printf 'nerdfootball drift fixture\n' > tests/fixtures/hash-sample.txt
node -e "
const z=require('zlib'),fs=require('fs'),c=require('crypto');
const b=fs.readFileSync('tests/fixtures/hash-sample.txt');
const hash=c.createHash('sha256').update(z.gzipSync(b,{level:9})).digest('hex');
fs.writeFileSync('tests/fixtures/hash-sample.expected.json', JSON.stringify({hash},null,2)+'\n');
console.log(hash);
"
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest tests/hosting-manifest.test.js`
Expected: FAIL — `Cannot find module '../scripts/lib/hosting-manifest'`

- [ ] **Step 4: Write the implementation**

```javascript
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const SITE = 'nerdfootball';

// Firebase Hosting content hash: sha256 of the gzip level-9 encoding.
// Verified 2026-09-10 against release a9a8567313832060. Levels 1/6 do not match.
function hashBuffer(buf) {
  return crypto.createHash('sha256').update(zlib.gzipSync(buf, { level: 9 })).digest('hex');
}

function accessToken() {
  return execFileSync('gcloud', ['auth', 'print-access-token'], {
    encoding: 'utf8',
    env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: undefined },
  }).trim();
}

async function apiGet(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'x-goog-user-project': SITE,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function latestVersionId() {
  const base = `https://firebasehosting.googleapis.com/v1beta1/sites/${SITE}/versions`;
  const data = await apiGet(`${base}?pageSize=1`);
  if (!data.versions || !data.versions.length) throw new Error('no hosting versions returned');
  return data.versions[0].name.split('/').pop();
}

async function fetchLiveManifest(versionId) {
  const base = `https://firebasehosting.googleapis.com/v1beta1/sites/${SITE}/versions/${versionId}/files`;
  const out = {};
  let pageToken = '';
  do {
    const url = `${base}?pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const data = await apiGet(url);
    for (const f of data.files || []) out[f.path] = f.hash;
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return out;
}

// Mirrors firebase.json hosting.ignore: firebase.json, **/.*, **/node_modules/**
function buildLocalManifest(publicDir) {
  const out = {};
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const rel = '/' + path.relative(publicDir, full).split(path.sep).join('/');
        out[rel] = hashBuffer(fs.readFileSync(full));
      }
    }
  })(publicDir);
  return out;
}

function diffManifests(live, local) {
  const changed = [];
  const onlyLive = [];
  const onlyLocal = [];
  for (const p of Object.keys(live)) {
    if (!(p in local)) onlyLive.push(p);
    else if (live[p] !== local[p]) changed.push(p);
  }
  for (const p of Object.keys(local)) if (!(p in live)) onlyLocal.push(p);
  return { changed: changed.sort(), onlyLive: onlyLive.sort(), onlyLocal: onlyLocal.sort() };
}

module.exports = { hashBuffer, latestVersionId, fetchLiveManifest, buildLocalManifest, diffManifests };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest tests/hosting-manifest.test.js`
Expected: PASS, 3 tests

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/hosting-manifest.js tests/hosting-manifest.test.js tests/fixtures/
git commit -m "NERD-2: hosting manifest hashing + diff library"
```

---

## Task 2: Drift check CLI (Phase 0)

**Files:**
- Create: `scripts/prod-drift-check.js`
- Modify: `package.json` (add `drift:check` script)

- [ ] **Step 1: Write the CLI**

```javascript
#!/usr/bin/env node
'use strict';
const path = require('path');
const { execFileSync } = require('child_process');
const {
  latestVersionId, fetchLiveManifest, buildLocalManifest, diffManifests,
} = require('./lib/hosting-manifest');

function gitClean() {
  return execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim() === '';
}

(async () => {
  const publicDir = path.join(__dirname, '..', 'public');
  const versionId = await latestVersionId();
  const live = await fetchLiveManifest(versionId);
  const local = buildLocalManifest(publicDir);
  const { changed, onlyLive, onlyLocal } = diffManifests(live, local);

  console.log(`live release: ${versionId}  (${Object.keys(live).length} files)`);
  console.log(`local tree:   ${Object.keys(local).length} files`);
  if (!gitClean()) console.log('WARNING: working tree is dirty — comparing prod against uncommitted files');

  if (!changed.length && !onlyLive.length && !onlyLocal.length) {
    console.log('NO DRIFT: production matches the local tree');
    process.exit(0);
  }
  if (changed.length) console.log(`\nCONTENT DIFFERS (${changed.length}):\n  ` + changed.join('\n  '));
  if (onlyLive.length) console.log(`\nLIVE ONLY — missing locally (${onlyLive.length}):\n  ` + onlyLive.join('\n  '));
  if (onlyLocal.length) console.log(`\nLOCAL ONLY — never deployed (${onlyLocal.length}):\n  ` + onlyLocal.join('\n  '));
  process.exit(1);
})().catch((err) => { console.error('drift check failed:', err.message); process.exit(2); });
```

- [ ] **Step 2: Add the npm script**

In `package.json` `scripts`, add: `"drift:check": "node scripts/prod-drift-check.js"`

- [ ] **Step 3: Verify against clean production**

Run: `env -u GOOGLE_APPLICATION_CREDENTIALS npm run drift:check`
Expected: `NO DRIFT: production matches the local tree`, exit 0

- [ ] **Step 4: Verify it detects real drift**

```bash
echo "<!-- drift probe -->" >> public/picks-landing.html
env -u GOOGLE_APPLICATION_CREDENTIALS npm run drift:check; echo "exit=$?"
git checkout -- public/picks-landing.html
```
Expected: lists `/picks-landing.html` under CONTENT DIFFERS, `exit=1`

- [ ] **Step 5: Commit**

```bash
git add scripts/prod-drift-check.js package.json
git commit -m "NERD-2: prod drift check CLI"
```

---

## Task 3: Delete the legacy test suite (Phase 2a)

**Files:**
- Delete: `tests/accessibility.test.js`, `tests/grid.test.js`, `tests/homepage.test.js`,
  `tests/oauth-basic.test.js`, `tests/performance.test.js`, `tests/survivor.test.js`,
  `tests/setup.js`, `tests/temp-disabled/` (6 files)
- Modify: `package.json` (drop the 9 `test:oauth*` / browser scripts that reference them)

- [ ] **Step 1: Confirm nothing else references them**

Run: `grep -rn "temp-disabled\|oauth-basic\|tests/setup" --include=*.js --include=*.json --include=*.yml . | grep -v node_modules`
Expected: hits only in `package.json`, `jest.puppeteer.config.js`, and the files being deleted

- [ ] **Step 2: Delete**

```bash
git rm -r tests/temp-disabled
git rm tests/accessibility.test.js tests/grid.test.js tests/homepage.test.js \
       tests/oauth-basic.test.js tests/performance.test.js tests/survivor.test.js tests/setup.js
```

- [ ] **Step 3: Remove the dead npm scripts**

Delete these keys from `package.json` `scripts`: `test:browser`, `test:core`, `test:headful`,
`test:debug`, `test:oauth`, `test:oauth:headful`, `test:oauth:debug`, `test:oauth:new-user`,
`test:oauth:linking`, `test:oauth:login-behavior`, `test:oauth:errors`, `test:oauth:security`,
`test:oauth:data-integrity`. Keep `test`.

- [ ] **Step 4: Verify the kept suite still passes**

Run: `npx jest`
Expected: 56 passed (3 suites: season-config-drift, season-config-parity, scraper-units) + the
new hosting-manifest tests from Task 1

- [ ] **Step 5: Commit**

```bash
git add -A tests package.json
git commit -m "NERD-3: remove 2025 legacy test suite"
```

---

## Task 4: Smoke suite (Phase 2b)

**Files:**
- Create: `tests/smoke.test.js`

Encodes the "Core Features That Must Work" list from `CLAUDE.md`. Runs against any origin so the
same file covers a preview channel and production.

- [ ] **Step 1: Write the test**

```javascript
const BASE = process.env.BASE_URL || 'https://nerdfootball.web.app';
const GHOST_UID = 'okl4sw2aDhW3yKpOfOwe5lH7OQj1';

const PAGES = [
  { path: '/nerd-universe.html', marker: 'Admin Tools' },
  { path: '/nerdfootballConfidencePicks.html', marker: 'confidence' },
  { path: '/NerdSurvivorPicks.html', marker: 'survivor' },
  { path: '/nerdfootballTheGrid.html', marker: 'grid' },
  { path: '/leaderboard.html', marker: 'leaderboard' },
  { path: '/NerdSurvivorAdmin.html', marker: 'Survivor Pool Admin' },
];

jest.setTimeout(30000);

async function get(path) {
  const res = await fetch(`${BASE}${path}?smoke=${Date.now()}`);
  return { status: res.status, body: await res.text() };
}

describe(`smoke: ${BASE}`, () => {
  test.each(PAGES)('$path returns 200 and contains its marker', async ({ path, marker }) => {
    const { status, body } = await get(path);
    expect(status).toBe(200);
    expect(body.toLowerCase()).toContain(marker.toLowerCase());
  });

  test('no page leaks the ghost user id', async () => {
    for (const { path } of PAGES) {
      const { body } = await get(path);
      expect(body).not.toContain(GHOST_UID);
    }
  });

  test('survivor admin ships the URL-state helpers', async () => {
    const { body } = await get('/NerdSurvivorAdmin.html');
    expect(body).toContain('restoreStateFromUrl');
    expect(body).toContain('updateUrlParams');
  });
});
```

- [ ] **Step 2: Run against production**

Run: `npx jest tests/smoke.test.js`
Expected: PASS. If a marker assertion fails, fix the marker to match real page text — do not
weaken the assertion to `expect(body).toBeTruthy()`.

- [ ] **Step 3: Confirm it is parameterized**

Run: `BASE_URL=https://nerdfootball.web.app npx jest tests/smoke.test.js`
Expected: PASS, header line shows the base URL

- [ ] **Step 4: Commit**

```bash
git add tests/smoke.test.js
git commit -m "NERD-4: core-features smoke suite, parameterized by BASE_URL"
```

---

## Task 5: PR template + PR checks workflow (Phase 1b)

**Files:**
- Create: `.github/pull_request_template.md`
- Create: `.github/workflows/pr-checks.yml`
- Delete: `.github/workflows/browser-tests.yml`

- [ ] **Step 1: Write the PR template**

```markdown
## NERD-___

### What changed

### Acceptance criteria
- [ ]

### Test plan
- [ ] `npx jest` green locally
- [ ] Verified on the preview URL (commented below by CI)

### Smoke checklist
- [ ] Hamburger nav works
- [ ] Confidence picks load, locked games protected
- [ ] Grid hides picks pre-game
- [ ] Survivor picks load
- [ ] No ghost user visible
```

- [ ] **Step 2: Write the workflow**

```yaml
name: PR Checks

on:
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx jest --testPathIgnorePatterns='smoke'

  preview:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: FirebaseExtended/action-hosting-deploy@v0
        id: deploy
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: nerdfootball
          channelId: pr-${{ github.event.pull_request.number }}
          expires: 7d
      - name: Smoke the preview
        run: BASE_URL=${{ steps.deploy.outputs.details_url }} npx jest tests/smoke.test.js
```

- [ ] **Step 3: Delete the disabled legacy workflow**

```bash
git rm .github/workflows/browser-tests.yml
```

- [ ] **Step 4: Validate the YAML parses**

Run: `npx js-yaml .github/workflows/pr-checks.yml > /dev/null && echo OK`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add .github/
git commit -m "NERD-5: PR template + PR checks workflow with preview channel"
```

---

## Task 6: Branch protection (Phase 2c)

**Files:** none — GitHub API configuration.

- [ ] **Step 1: Confirm the check name from a real PR run**

Run: `gh pr checks <PR#>`
Expected: a check literally named `test` (the job id from `pr-checks.yml`)

- [ ] **Step 2: Apply protection**

```bash
gh api -X PUT repos/tonyweeg/NerdfootballAI/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -f 'required_status_checks[strict]=true' \
  -f 'required_status_checks[contexts][]=test' \
  -f 'enforce_admins=false' \
  -f 'required_pull_request_reviews[required_approving_review_count]=0' \
  -f 'restrictions=null'
```

Note `enforce_admins=false` deliberately: Tony keeps an emergency path to push directly.

- [ ] **Step 3: Verify**

Run: `gh api repos/tonyweeg/NerdfootballAI/branches/main/protection --jq '.required_status_checks.contexts'`
Expected: `["test"]`

- [ ] **Step 4: Verify a direct push is now refused**

```bash
git commit --allow-empty -m "protection probe" && git push origin main
```
Expected: rejected by GitHub. Then `git reset --hard origin/main`.

---

## Task 7: Deploy workflow (Phase 3)

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `scripts/jira.js`

- [ ] **Step 1: Tony creates the service account secret**

In the Firebase console → Project settings → Service accounts → Generate new private key.
Then: `gh secret set FIREBASE_SERVICE_ACCOUNT < ~/Downloads/nerdfootball-*.json`
Also: `gh secret set JIRA_API_TOKEN` and `gh secret set JIRA_EMAIL` for the ticket transition step.

- [ ] **Step 2: Write `scripts/jira.js`**

```javascript
#!/usr/bin/env node
'use strict';
const SITE = 'https://tonyweeg.atlassian.net';
const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');

async function api(method, path, body) {
  const res = await fetch(`${SITE}/rest/api/3${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

// Transition ids are workflow-specific: always look them up, never hardcode.
async function transition(key, targetName) {
  const { transitions } = await api('GET', `/issue/${key}/transitions`);
  const match = transitions.find((t) => t.name.toLowerCase() === targetName.toLowerCase());
  if (!match) throw new Error(`no transition "${targetName}" on ${key}; have: ${transitions.map((t) => t.name).join(', ')}`);
  await api('POST', `/issue/${key}/transitions`, { transition: { id: match.id } });
  return match.id;
}

async function comment(key, text) {
  return api('POST', `/issue/${key}/comment`, {
    body: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] },
  });
}

if (require.main === module) {
  const [cmd, key, arg] = process.argv.slice(2);
  const run = { transition: () => transition(key, arg), comment: () => comment(key, arg) }[cmd];
  if (!run) { console.error('usage: jira.js <transition|comment> <KEY> <arg>'); process.exit(1); }
  run().then(() => console.log(`${cmd} ok: ${key}`)).catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { transition, comment };
```

- [ ] **Step 3: Write the deploy workflow**

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

concurrency:
  group: production-deploy
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx jest --testPathIgnorePatterns='smoke'
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          projectId: nerdfootball
          channelId: live
      - name: Smoke production
        run: BASE_URL=https://nerdfootball.web.app npx jest tests/smoke.test.js
      - name: Transition the ticket
        if: success()
        env:
          JIRA_EMAIL: ${{ secrets.JIRA_EMAIL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
        run: |
          KEY=$(git log -1 --pretty=%s | grep -oE 'NERD-[0-9]+' || true)
          if [ -n "$KEY" ]; then node scripts/jira.js transition "$KEY" "Done"; else echo "no NERD key in subject"; fi
```

- [ ] **Step 4: Validate YAML**

Run: `npx js-yaml .github/workflows/deploy.yml > /dev/null && echo OK`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy.yml scripts/jira.js
git commit -m "NERD-6: CI deploy on merge with prod smoke + ticket transition"
```

---

## Task 8: Nightly drift watch

**Files:**
- Create: `.github/workflows/drift-nightly.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: Nightly Drift Check

on:
  schedule:
    - cron: '0 11 * * *'
  workflow_dispatch:

jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
      - uses: google-github-actions/setup-gcloud@v2
      - run: node scripts/prod-drift-check.js
```

- [ ] **Step 2: Trigger it manually to confirm it runs green**

Run: `gh workflow run drift-nightly.yml && sleep 45 && gh run list --workflow=drift-nightly.yml --limit 1`
Expected: latest run `completed  success`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/drift-nightly.yml
git commit -m "NERD-7: nightly production drift check"
```

---

## Open item carried from the spec

**Preview URLs and Firebase Auth.** Channel URLs (`nerdfootball--pr-12-abc.web.app`) are not in the
Auth authorized-domains list, so sign-in fails there. Task 5's preview job therefore smoke-tests only
unauthenticated surfaces. Before any authenticated preview testing, add the channel domain under
Firebase console → Authentication → Settings → Authorized domains, or switch to one standing
`staging` channel with a stable authorized URL. Decision pending with Tony.
