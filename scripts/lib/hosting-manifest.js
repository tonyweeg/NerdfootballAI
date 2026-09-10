'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const SITE = 'nerdfootball';
const API_BASE = `https://firebasehosting.googleapis.com/v1beta1/sites/${SITE}`;

/**
 * Firebase Hosting content hash: sha256 of the gzip level-9 encoding.
 * Verified 2026-09-10 against release a9a8567313832060 (/NerdSurvivorAdmin.html).
 * Levels 1 and 6 do not match, nor does the gzip CLI at -9 -n. Do not change the level.
 */
function hashBuffer(buf) {
  return crypto.createHash('sha256').update(zlib.gzipSync(buf, { level: 9 })).digest('hex');
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

async function latestVersionId(token = accessToken()) {
  const data = await apiGet(`${API_BASE}/versions?pageSize=1`, token);
  if (!data.versions || !data.versions.length) throw new Error('no hosting versions returned');
  return data.versions[0].name.split('/').pop();
}

async function fetchLiveManifest(versionId, token = accessToken()) {
  const out = {};
  let pageToken = '';
  do {
    const url = `${API_BASE}/versions/${versionId}/files?pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const data = await apiGet(url, token);
    for (const file of data.files || []) out[file.path] = file.hash;
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return out;
}

/** Mirrors firebase.json hosting.ignore: firebase.json, dotfiles, node_modules. */
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
  accessToken,
  latestVersionId,
  fetchLiveManifest,
  buildLocalManifest,
  diffManifests,
};
