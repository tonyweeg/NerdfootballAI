const fs = require('fs');
const path = require('path');
const { hashBuffer, diffManifests, buildLocalManifest } = require('../scripts/lib/hosting-manifest');

// Firebase Hosting content hash = sha256(gzip level 9). Established empirically on
// 2026-09-10 against release a9a8567313832060: /NerdSurvivorAdmin.html hashed to
// 74b03104f65263ae49cfed7db94e4371143155fce4cde725c1674474bec71090, which gzip
// levels 1 and 6 did NOT reproduce. This literal locks the algorithm in place.
const FIXTURE = path.join(__dirname, 'fixtures', 'hash-sample.txt');
const FIXTURE_HASH = 'd1406b8f82375e0aa289d4d242c6c656062f911285ec298dd96262fab98913d3';

describe('hashBuffer', () => {
  test('reproduces the Firebase Hosting content hash for a known fixture', () => {
    expect(hashBuffer(fs.readFileSync(FIXTURE))).toBe(FIXTURE_HASH);
  });

  test('is sensitive to content', () => {
    expect(hashBuffer(Buffer.from('a'))).not.toBe(hashBuffer(Buffer.from('b')));
  });

  test('is deterministic across calls (no embedded mtime)', () => {
    const buf = fs.readFileSync(FIXTURE);
    expect(hashBuffer(buf)).toBe(hashBuffer(buf));
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

  test('ignores the Firebase reserved /__/ namespace', () => {
    // Firebase injects these into every release; they never exist locally.
    const live = { '/a.html': 'aaa', '/__/firebase/init.js': 'x', '/__/firebase/init.json': 'y' };
    const local = { '/a.html': 'aaa' };
    expect(diffManifests(live, local)).toEqual({ changed: [], onlyLive: [], onlyLocal: [] });
  });

  test('detects the exact shape of the 2026-09-10 incident', () => {
    // Prod held redesigned files plus a page absent from the checkout.
    const live = { '/nerd-universe.html': 'redesign', '/wu-tang-pick-tracker.html': 'newpage' };
    const local = { '/nerd-universe.html': 'oldterminal' };
    const result = diffManifests(live, local);
    expect(result.changed).toEqual(['/nerd-universe.html']);
    expect(result.onlyLive).toEqual(['/wu-tang-pick-tracker.html']);
  });
});

describe('buildLocalManifest', () => {
  const tmp = path.join(__dirname, 'fixtures', 'tmp-manifest');

  beforeAll(() => {
    fs.mkdirSync(path.join(tmp, 'sub'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'index.html'), 'index');
    fs.writeFileSync(path.join(tmp, 'sub', 'page.html'), 'page');
    fs.writeFileSync(path.join(tmp, '.hidden'), 'hidden');
    fs.writeFileSync(path.join(tmp, 'node_modules', 'dep.js'), 'dep');
  });

  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

  test('maps files to leading-slash paths and honours firebase.json ignores', () => {
    const manifest = buildLocalManifest(tmp);
    expect(Object.keys(manifest).sort()).toEqual(['/index.html', '/sub/page.html']);
    expect(manifest['/index.html']).toBe(hashBuffer(Buffer.from('index')));
  });
});
