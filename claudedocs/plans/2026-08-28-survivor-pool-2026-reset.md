# Survivor Pool 2026 Season Reset Plan

**Date:** 2026-08-28
**Goal:** Clear 2025 survivor data and prepare 2026 pool for Week 1 picks
**Status:** PENDING APPROVAL

## Executive Summary

The 54 pool members were already copied from 2025 to 2026 via `provision-season-pool.js`. However, no survivor-specific reset was performed. We need to:

1. Clear any existing survivor picks data in the 2026 pool paths
2. Reset survivor status document
3. Ensure all 54 members start fresh with `alive: 18` status

## Current State Analysis

### What Already Exists (From Provision Script)
- ✅ 54 members at `artifacts/nerdfootball/pools/nerduniverse-2026/metadata/members`
- ✅ 272 games across 18 weeks loaded
- ✅ Season config pointing to 2026

### Firestore Paths That Need Clearing/Reset

#### Path 1: Individual Survivor Picks (CLEAR)
```
artifacts/nerdfootball/pools/nerduniverse-2026/nerdSurvivor_picks/{userId}
```
- Contains: `picks` object with week numbers as keys
- Action: DELETE all documents in this collection

#### Path 2: Survivor Status (RESET)
```
artifacts/nerdfootball/pools/nerduniverse-2026/nerdSurvivor_status/status
```
- Contains: `alive`, `eliminated`, `notParticipating` arrays
- Action: RESET to empty arrays with all 54 members in `notParticipating` initially

#### Path 3: Survivor Week Data (CLEAR if exists)
```
artifacts/nerdfootball/pools/nerduniverse-2026/survivor/2026/weeks/{1-18}
```
- Contains: Per-week survivor selections
- Action: DELETE if any documents exist

#### Path 4: Survivor Eliminations (CLEAR if exists)
```
artifacts/nerdfootball/pools/nerduniverse-2026/survivor/2026/eliminations/{userId}
```
- Action: DELETE all documents in this collection

#### Path 5: Survivor Display Cache (CLEAR)
```
artifacts/nerdfootball/pools/nerduniverse-2026/cache/latest-survivor-display
```
- Action: DELETE to force fresh cache generation

#### Path 6: Member Survivor Fields (RESET)
Each member in `metadata/members` needs their `survivor` field reset:
```javascript
survivor: {
    alive: 18,           // Not eliminated
    pickHistory: "",     // No picks yet
    eliminatedBy: null,  // Not eliminated
    allWinningPicks: []  // No wins yet
}
```

## Implementation Options

### Option A: Admin Script (Recommended)
Create a one-time reset script that runs against Firestore directly.

**Pros:**
- Safe, auditable, reversible
- Can be run with `--dry-run` first
- Follows existing `provision-season-pool.js` pattern

**Cons:**
- Requires Firebase admin SDK execution

### Option B: Firebase Console Manual Delete
Delete collections manually via Firebase Console.

**Pros:**
- No code needed
- Visual verification

**Cons:**
- Time-consuming for 54 users
- Error-prone
- No audit trail

### Option C: Cloud Function Endpoint
Create an admin-only HTTP endpoint for the reset.

**Pros:**
- Reusable for future seasons
- Can be triggered from admin dashboard

**Cons:**
- More complex than needed for one-time operation

## Recommended Implementation (Option A)

### Script: `reset-survivor-pool.js`

```javascript
#!/usr/bin/env node
// Survivor pool reset — clears all survivor data for a season to prepare for Week 1.
// Usage: cd functions && GOOGLE_CLOUD_PROJECT=nerdfootball \
//   node ../scripts/reset-survivor-pool.js --year=2026 [--dry-run]

const admin = require('firebase-admin');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));

const year = parseInt(args.year, 10);
if (!Number.isInteger(year) || year < 2026 || year > 2100) {
    console.error('Usage: node reset-survivor-pool.js --year=YYYY [--dry-run]');
    process.exit(1);
}
const dryRun = !!args['dry-run'];

const POOL_ROOT = `artifacts/nerdfootball/pools/nerduniverse-${year}`;
const PATHS = {
    survivorPicks: `${POOL_ROOT}/nerdSurvivor_picks`,
    survivorStatus: `${POOL_ROOT}/nerdSurvivor_status/status`,
    survivorWeeks: `${POOL_ROOT}/survivor/${year}/weeks`,
    survivorEliminations: `${POOL_ROOT}/survivor/${year}/eliminations`,
    survivorCache: `${POOL_ROOT}/cache/latest-survivor-display`,
    members: `${POOL_ROOT}/metadata/members`
};

admin.initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT || 'nerdfootball' });
const db = admin.firestore();

async function deleteCollection(path) {
    const snapshot = await db.collection(path).get();
    if (snapshot.empty) {
        console.log(`  ${path}: 0 documents (already empty)`);
        return 0;
    }
    console.log(`  ${path}: ${snapshot.size} documents to delete`);
    if (!dryRun) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
    return snapshot.size;
}

async function deleteDocument(path) {
    const doc = await db.doc(path).get();
    if (!doc.exists) {
        console.log(`  ${path}: does not exist (already clean)`);
        return false;
    }
    console.log(`  ${path}: exists, will delete`);
    if (!dryRun) {
        await db.doc(path).delete();
    }
    return true;
}

async function resetMemberSurvivorFields() {
    const membersSnap = await db.doc(PATHS.members).get();
    if (!membersSnap.exists) {
        console.error('FAIL: members doc not found');
        process.exit(1);
    }

    const members = membersSnap.data();
    const memberCount = Object.keys(members).length;
    console.log(`  ${PATHS.members}: ${memberCount} members to reset`);

    if (!dryRun) {
        const updates = {};
        for (const uid of Object.keys(members)) {
            updates[`${uid}.survivor`] = {
                alive: 18,
                pickHistory: "",
                eliminatedBy: null,
                allWinningPicks: []
            };
        }
        await db.doc(PATHS.members).update(updates);
    }
    return memberCount;
}

(async () => {
    console.log(`\nNERDCHECK Survivor Pool Reset for ${year}${dryRun ? ' (DRY RUN)' : ''}\n`);
    console.log('='.repeat(60));

    // Step 1: Clear survivor picks collection
    console.log('\n[1/5] Clearing survivor picks...');
    const picksDeleted = await deleteCollection(PATHS.survivorPicks);

    // Step 2: Delete survivor status document
    console.log('\n[2/5] Clearing survivor status...');
    await deleteDocument(PATHS.survivorStatus);

    // Step 3: Clear survivor week data (all 18 weeks)
    console.log('\n[3/5] Clearing survivor week data...');
    let weeksDeleted = 0;
    for (let w = 1; w <= 18; w++) {
        const weekPath = `${PATHS.survivorWeeks}/${w}`;
        const subDeleted = await deleteCollection(`${weekPath}/users`);
        weeksDeleted += subDeleted;
        await deleteDocument(weekPath);
    }

    // Step 4: Clear eliminations
    console.log('\n[4/5] Clearing eliminations...');
    const elimsDeleted = await deleteCollection(PATHS.survivorEliminations);

    // Step 5: Clear cache
    console.log('\n[5/5] Clearing survivor cache...');
    await deleteDocument(PATHS.survivorCache);

    // Step 6: Reset member survivor fields
    console.log('\n[6/6] Resetting member survivor fields...');
    const membersReset = await resetMemberSurvivorFields();

    console.log('\n' + '='.repeat(60));
    console.log(`\nNERDCHECK Summary${dryRun ? ' (DRY RUN - nothing written)' : ''}:`);
    console.log(`  - Survivor picks deleted: ${picksDeleted}`);
    console.log(`  - Week documents cleared: ${weeksDeleted}`);
    console.log(`  - Eliminations cleared: ${elimsDeleted}`);
    console.log(`  - Members reset: ${membersReset}`);
    console.log(`\nSurvivor pool nerduniverse-${year} is ready for Week 1!\n`);

    process.exit(0);
})().catch(e => {
    console.error('FAIL:', e.message);
    process.exit(1);
});
```

## Execution Steps

### Step 1: Create the Script
Save `reset-survivor-pool.js` to `/scripts/`

### Step 2: Dry Run (Verify)
```bash
cd functions && GOOGLE_CLOUD_PROJECT=nerdfootball \
  node ../scripts/reset-survivor-pool.js --year=2026 --dry-run
```

### Step 3: Execute Reset
```bash
cd functions && GOOGLE_CLOUD_PROJECT=nerdfootball \
  node ../scripts/reset-survivor-pool.js --year=2026
```

### Step 4: Verify in UI
1. Navigate to https://nerdfootball.web.app/NerdSurvivorPicks.html
2. Log in as a pool member
3. Confirm:
   - Status shows "Blood Still Flows" (alive)
   - No previous picks displayed
   - Week 1 pick interface is available (on/after Tuesday)
   - "0 Death Weeks Chosen" displayed

### Step 5: Commit
```bash
git add scripts/reset-survivor-pool.js
git commit -m "Add: reset-survivor-pool.js runbook for seasonal survivor reset"
```

## Verification Checklist

After running the script, verify:

- [ ] `nerdSurvivor_picks` collection is empty
- [ ] `nerdSurvivor_status/status` document does not exist or is reset
- [ ] All 54 members have `survivor.alive: 18`
- [ ] All 54 members have `survivor.allWinningPicks: []`
- [ ] `cache/latest-survivor-display` does not exist
- [ ] NerdSurvivorPicks.html loads correctly for authenticated user
- [ ] Week 1 pick interface shows "Open" status (Tuesday+)

## Rollback Plan

If issues occur, the script is additive-delete only. No user identity data is touched. To restore:

1. Re-run `provision-season-pool.js` to restore members
2. 2025 data remains untouched at `/pools/nerduniverse-2025/`

## Questions for Approval

1. **Confirm execution:** Ready to create and run this script?
2. **Timing:** Should we run immediately or wait until closer to Week 1 (Sept 9)?
3. **Testing:** Should we test with a single user first before batch reset?
