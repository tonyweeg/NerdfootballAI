#!/usr/bin/env node
'use strict';

/**
 * Compares the live Firebase Hosting release against the local public/ tree.
 * Exit 0 = no drift, 1 = drift found, 2 = check itself failed.
 *
 * Born from the 2026-09-10 incident: production ran ~2,100 lines ahead of main
 * for hours because nothing compared the two.
 */

const path = require('path');
const { execFileSync } = require('child_process');
const {
  accessToken,
  liveVersionId,
  fetchLiveManifest,
  buildLocalManifest,
  diffManifests,
} = require('./lib/hosting-manifest');

const REPO_ROOT = path.join(__dirname, '..');

/** Anchored to REPO_ROOT so running this script from any cwd reports this repo's state. */
function gitState() {
  const opts = { cwd: REPO_ROOT, encoding: 'utf8' };
  const dirty = execFileSync('git', ['status', '--porcelain'], opts).trim() !== '';
  const head = execFileSync('git', ['rev-parse', '--short', 'HEAD'], opts).trim();
  return { dirty, head };
}

function list(label, paths) {
  console.log(`\n${label} (${paths.length}):`);
  for (const p of paths) console.log(`  ${p}`);
}

(async () => {
  const publicDir = path.join(REPO_ROOT, 'public');
  const token = accessToken();
  const versionId = await liveVersionId(token);
  const live = await fetchLiveManifest(versionId, token);
  const local = buildLocalManifest(publicDir);
  const { dirty, head } = gitState();

  console.log(`live release : ${versionId} (${Object.keys(live).length} files)`);
  console.log(`local tree   : ${head} (${Object.keys(local).length} files)`);
  if (dirty) {
    console.log('WARNING: working tree is dirty — comparing production against uncommitted files');
  }

  const { changed, onlyLive, onlyLocal } = diffManifests(live, local);
  if (!changed.length && !onlyLive.length && !onlyLocal.length) {
    console.log('\nNO DRIFT: production matches the local tree');
    process.exit(0);
  }

  console.log('\nDRIFT DETECTED');
  if (changed.length) list('CONTENT DIFFERS', changed);
  if (onlyLive.length) list('LIVE ONLY — in production, missing locally', onlyLive);
  if (onlyLocal.length) list('LOCAL ONLY — never deployed', onlyLocal);
  process.exit(1);
})().catch((err) => {
  console.error(`drift check failed: ${err.message}`);
  process.exit(2);
});
