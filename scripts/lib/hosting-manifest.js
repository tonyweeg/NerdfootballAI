'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const SITE = 'nerdfootball';
const API_BASE = `https://firebasehosting.googleapis.com/v1beta1/sites/${SITE}`;

const LIVE_ORIGIN = `https://${SITE}.web.app`;

/**
 * Raw sha256 of the bytes. Identical on every platform and Node version.
 *
 * NOT Firebase's manifest hash. Firebase stores sha256(gzip level 9), which is
 * reproducible only on a machine whose zlib matches the one that ran the deploy —
 * node 24 (zlib 1.2.12) and node 20 disagree on the same input (NERD-11). Comparing
 * manifest hashes across machines reports every file as drifted, so we compare the
 * actual bytes instead.
 */
function hashBuffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Fetches every live path and hashes its raw bytes.
 *
 * fetch() transparently decodes Content-Encoding, so this yields the original file
 * bytes regardless of how Firebase stored or served them.
 */
async function fetchLiveContentHashes(paths, { origin = LIVE_ORIGIN, concurrency = 24 } = {}) {
  const out = {};
  const queue = [...paths];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const p = queue.pop();
      const res = await fetch(`${origin}${p}`, { redirect: 'follow' });
      if (!res.ok) throw new Error(`${res.status} fetching ${p}`);
      out[p] = hashBuffer(Buffer.from(await res.arrayBuffer()));
    }
  });
  await Promise.all(workers);
  return out;
}

/**
 * Tony's shell exports another project's GOOGLE_APPLICATION_CREDENTIALS, which makes
 * the Hosting API reject the token. Strip it for this call only.
 */
function accessToken() {
  const env = { ...process.env };
  delete env.GOOGLE_APPLICATION_CREDENTIALS;
  return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8', env }).trim();
}

async function apiGet(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'x-goog-user-project': SITE },
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${url}\n${await res.text()}`);
  }
  return res.json();
}

/**
 * The version currently RELEASED to the live channel.
 *
 * Deliberately /releases, not /versions: preview-channel deploys create versions in the
 * same collection, and an aborted deploy leaves a CREATED version behind. Either would
 * make /versions?pageSize=1 return something that was never served, and the check would
 * report the whole tree as drifted. /releases is by definition what is live.
 */
async function liveVersionId(token = accessToken()) {
  const data = await apiGet(`${API_BASE}/releases?pageSize=1`, token);
  if (!data.releases || !data.releases.length) throw new Error('no hosting releases returned');
  return data.releases[0].version.name.split('/').pop();
}

async function fetchLiveManifest(versionId, token = accessToken()) {
  const out = {};
  let pageToken = '';
  do {
    const url = `${API_BASE}/versions/${versionId}/files?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const data = await apiGet(url, token);
    for (const file of data.files || []) out[file.path] = file.hash;
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return out;
}

/**
 * Approximates firebase.json hosting.ignore: dotfiles and node_modules.
 *
 * KNOWN DIVERGENCE (NERD-9): this prunes whole dot-DIRECTORIES, while firebase.json's
 * `**\/.*` matches only basenames. If a dot-directory such as public/.well-known is ever
 * added and Firebase uploads its contents, those paths would be reported as permanent
 * false LIVE ONLY drift. No such directory exists in public/ today, so this is latent.
 */
function buildLocalManifest(publicDir) {
  const out = {};
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const rel = `/${path.relative(publicDir, full).split(path.sep).join('/')}`;
        out[rel] = hashBuffer(fs.readFileSync(full));
      }
    }
  })(publicDir);
  return out;
}

/**
 * Firebase reserves /__/ and injects init.js / init.json into every release.
 * They never exist locally, so they are not drift.
 */
function isReserved(p) {
  return p.startsWith('/__/');
}

function diffManifests(live, local) {
  const changed = [];
  const onlyLive = [];
  const onlyLocal = [];
  for (const p of Object.keys(live)) {
    if (isReserved(p)) continue;
    if (!(p in local)) onlyLive.push(p);
    else if (live[p] !== local[p]) changed.push(p);
  }
  for (const p of Object.keys(local)) {
    if (!(p in live)) onlyLocal.push(p);
  }
  return { changed: changed.sort(), onlyLive: onlyLive.sort(), onlyLocal: onlyLocal.sort() };
}

module.exports = {
  hashBuffer,
  isReserved,
  fetchLiveContentHashes,
  LIVE_ORIGIN,
  accessToken,
  liveVersionId,
  fetchLiveManifest,
  buildLocalManifest,
  diffManifests,
};
