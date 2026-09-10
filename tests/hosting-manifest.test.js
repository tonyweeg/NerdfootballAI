const fs = require('fs');
const path = require('path');
const { hashBuffer, diffManifests, buildLocalManifest } = require('../scripts/lib/hosting-manifest');

// hashBuffer is a RAW sha256, deliberately not Firebase's manifest hash.
// Firebase stores sha256(gzip level 9), which differs by zlib version: node 24
// (zlib 1.2.12) and node 20 produce different digests for identical bytes, so
// comparing manifest hashes across machines reports total false drift (NERD-11).
// This literal is therefore stable on every platform and Node version — that is
// the property under test.
const FIXTURE = path.join(__dirname, 'fixtures', 'hash-sample.txt');
const FIXTURE_HASH = '634d9dac701f6f129bf1babb7ef9cb12faf9b9c80f95ee98624d750e0867822f';

describe('hashBuffer', () => {
  test('is a raw sha256, identical on every platform', () => {
    expect(hashBuffer(fs.readFileSync(FIXTURE))).toBe(FIXTURE_HASH);
  });

  test('matches what a plain sha256 of the same bytes produces', () => {
    const buf = fs.readFileSync(FIXTURE);
    const expected = require('crypto').createHash('sha256').update(buf).digest('hex');
    expect(hashBuffer(buf)).toBe(expected);
  });

  test('is sensitive to content', () => {
    expect(hashBuffer(Buffer.from('a'))).not.toBe(hashBuffer(Buffer.from('b')));
  });

  test('is deterministic across calls', () => {
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
