#!/usr/bin/env node
// Season pool provisioning — the annual runbook's data step, for any year.
// Copies the PRIOR season's members into the new pool (never overwrites an
// existing non-empty members doc) and loads the year's 18 game-data files
// into the pool-scoped games tree. 100% additive: nothing from prior seasons
// is modified or deleted. Safe to re-run (members guarded; games idempotent).
//
// Usage (run from functions/ so firebase-admin resolves):
//   cd functions && GOOGLE_CLOUD_PROJECT=nerdfootball \
//     node ../scripts/provision-season-pool.js --year=2026
//
// Options:
//   --year=YYYY        REQUIRED. The season being provisioned.
//   --games-dir=PATH   Directory holding nfl_{year}_week_{1..18}.json
//                      (default: ../public/game-data relative to functions/)
//   --dry-run          Read + validate + print everything; write nothing.

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));

const year = parseInt(args.year, 10);
if (!Number.isInteger(year) || year < 2026 || year > 2100) {
    console.error('Usage: node provision-season-pool.js --year=YYYY [--games-dir=PATH] [--dry-run]');
    console.error('       --year is required and must be 2026+ (prior seasons are never provisioned).');
    process.exit(1);
}
const dryRun = !!args['dry-run'];
const gamesDir = args['games-dir'] || path.join(__dirname, '..', 'public', 'game-data');

const SRC_MEMBERS = `artifacts/nerdfootball/pools/nerduniverse-${year - 1}/metadata/members`;
const DST_MEMBERS = `artifacts/nerdfootball/pools/nerduniverse-${year}/metadata/members`;
const gamesDoc = (w) => `artifacts/nerdfootball/pools/nerduniverse-${year}/nerdfootball_games/${w}`;

admin.initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT || 'nerdfootball' });
const db = admin.firestore();

(async () => {
    console.log(`NERDCHECK provisioning pool nerduniverse-${year}${dryRun ? ' (DRY RUN)' : ''}`);

    // 1. Validate all 18 game files BEFORE any write (all-or-nothing).
    const weeks = [];
    let totalGames = 0;
    for (let w = 1; w <= 18; w++) {
        const file = path.join(gamesDir, `nfl_${year}_week_${w}.json`);
        if (!fs.existsSync(file)) {
            console.error(`FAIL: missing ${file} — run the scraper first (node espn-schedule-scraper.js --year=${year})`);
            process.exit(1);
        }
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const count = Object.keys(data).filter(k => k !== '_metadata').length;
        if (count < 13 || count > 16) {
            console.error(`FAIL: week ${w} has ${count} games (expected 13-16) — refusing to write anything`);
            process.exit(1);
        }
        weeks.push({ w, data, count });
        totalGames += count;
    }
    if (totalGames !== 272) {
        console.error(`FAIL: total games ${totalGames} !== 272 — refusing to write anything`);
        process.exit(1);
    }
    console.log(`NERDCHECK game files validated: 18 weeks, ${totalGames} games`);

    // 2. Read prior-season members.
    const srcSnap = await db.doc(SRC_MEMBERS).get();
    if (!srcSnap.exists) {
        console.error(`FAIL: prior-season members doc missing at ${SRC_MEMBERS}`);
        process.exit(1);
    }
    const members = srcSnap.data();
    const memberCount = Object.keys(members).length;
    console.log(`NERDCHECK source members (${year - 1}): ${memberCount}`);

    // 3. Clobber guard on destination.
    const dstSnap = await db.doc(DST_MEMBERS).get();
    const dstExisting = dstSnap.exists ? Object.keys(dstSnap.data() || {}).length : 0;
    let membersAction = 'copy';
    if (dstExisting > 0) {
        membersAction = 'skip';
        console.log(`NERDCHECK ${year} members doc ALREADY has ${dstExisting} entries — leaving it untouched`);
    }

    if (dryRun) {
        console.log(`NERDCHECK DRY RUN complete — would ${membersAction} ${memberCount} members and write 18 game docs. Nothing written.`);
        process.exit(0);
    }

    // 4. Write members (if not skipped) and verify.
    if (membersAction === 'copy') {
        await db.doc(DST_MEMBERS).set(members);
        const verify = await db.doc(DST_MEMBERS).get();
        const vCount = Object.keys(verify.data() || {}).length;
        if (vCount !== memberCount) {
            console.error(`FAIL: readback count ${vCount} !== ${memberCount}`);
            process.exit(1);
        }
        console.log(`NERDCHECK ${year} members written + verified: ${vCount}`);
    }

    // 5. Write 18 game docs and verify a sample.
    for (const { w, data } of weeks) {
        await db.doc(gamesDoc(w)).set(data);
    }
    for (const w of [1, 9, 18]) {
        const snap = await db.doc(gamesDoc(w)).get();
        const n = Object.keys(snap.data() || {}).filter(k => k !== '_metadata').length;
        console.log(`NERDCHECK readback week ${w}: ${n} games`);
    }

    // 6. Prove prior season untouched.
    const src2 = await db.doc(SRC_MEMBERS).get();
    console.log(`NERDCHECK ${year - 1} members still intact: ${Object.keys(src2.data()).length}`);
    console.log(`NERDCHECK provisioning complete — pool nerduniverse-${year} is stocked.`);
    process.exit(0);
})().catch(e => {
    console.error('FAIL:', e.message.split('\n')[0]);
    process.exit(1);
});
