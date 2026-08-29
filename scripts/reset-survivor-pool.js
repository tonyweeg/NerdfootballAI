#!/usr/bin/env node
// Survivor pool reset — clears all survivor data for a season to prepare for Week 1.
// Safe to re-run (idempotent deletes). Does NOT touch member identity data.
//
// Usage (run from functions/ so firebase-admin resolves):
//   cd functions && GOOGLE_CLOUD_PROJECT=nerdfootball \
//     node ../scripts/reset-survivor-pool.js --year=2026
//
// Options:
//   --year=YYYY   REQUIRED. The season being reset.
//   --dry-run     Show what would be deleted without making changes.

const admin = require('firebase-admin');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));

const year = parseInt(args.year, 10);
if (!Number.isInteger(year) || year < 2026 || year > 2100) {
    console.error('Usage: node reset-survivor-pool.js --year=YYYY [--dry-run]');
    console.error('       --year is required and must be 2026+');
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

// Use Application Default Credentials (gcloud auth application-default login)
admin.initializeApp({
    projectId: 'nerdfootball',
    credential: admin.credential.applicationDefault()
});
const db = admin.firestore();

async function deleteCollection(path) {
    try {
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
    } catch (error) {
        if (error.code === 5 || error.message.includes('NOT_FOUND')) {
            console.log(`  ${path}: collection does not exist (clean)`);
            return 0;
        }
        throw error;
    }
}

async function deleteDocument(path) {
    try {
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
    } catch (error) {
        if (error.code === 5 || error.message.includes('NOT_FOUND')) {
            console.log(`  ${path}: does not exist (clean)`);
            return false;
        }
        throw error;
    }
}

async function resetMemberSurvivorFields() {
    const membersSnap = await db.doc(PATHS.members).get();
    if (!membersSnap.exists) {
        console.error('FAIL: members doc not found at ' + PATHS.members);
        console.error('      Run provision-season-pool.js first to copy members.');
        process.exit(1);
    }

    const members = membersSnap.data();
    const memberCount = Object.keys(members).length;
    console.log(`  ${PATHS.members}: ${memberCount} members to reset survivor fields`);

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
    console.log(`\n${'='.repeat(60)}`);
    console.log(`NERDCHECK Survivor Pool Reset for nerduniverse-${year}`);
    console.log(`${dryRun ? '>>> DRY RUN - No changes will be made <<<' : ''}`);
    console.log(`${'='.repeat(60)}\n`);

    let totalDeleted = 0;

    // Step 1: Clear survivor picks collection
    console.log('[1/6] Clearing survivor picks collection...');
    const picksDeleted = await deleteCollection(PATHS.survivorPicks);
    totalDeleted += picksDeleted;

    // Step 2: Delete survivor status document
    console.log('\n[2/6] Clearing survivor status document...');
    const statusDeleted = await deleteDocument(PATHS.survivorStatus);

    // Step 3: Clear survivor week data (all 18 weeks)
    console.log('\n[3/6] Clearing survivor week data (weeks 1-18)...');
    let weeksDeleted = 0;
    for (let w = 1; w <= 18; w++) {
        const weekUsersPath = `${PATHS.survivorWeeks}/${w}/users`;
        const subDeleted = await deleteCollection(weekUsersPath);
        weeksDeleted += subDeleted;
        await deleteDocument(`${PATHS.survivorWeeks}/${w}`);
    }
    totalDeleted += weeksDeleted;

    // Step 4: Clear eliminations
    console.log('\n[4/6] Clearing eliminations collection...');
    const elimsDeleted = await deleteCollection(PATHS.survivorEliminations);
    totalDeleted += elimsDeleted;

    // Step 5: Clear cache
    console.log('\n[5/6] Clearing survivor display cache...');
    await deleteDocument(PATHS.survivorCache);

    // Step 6: Reset member survivor fields
    console.log('\n[6/6] Resetting member survivor fields...');
    const membersReset = await resetMemberSurvivorFields();

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('NERDCHECK Summary:');
    console.log(`${'='.repeat(60)}`);
    console.log(`  Survivor picks deleted:    ${picksDeleted}`);
    console.log(`  Status document deleted:   ${statusDeleted ? 'Yes' : 'No (already clean)'}`);
    console.log(`  Week documents cleared:    ${weeksDeleted}`);
    console.log(`  Eliminations cleared:      ${elimsDeleted}`);
    console.log(`  Members reset:             ${membersReset}`);
    console.log(`${'='.repeat(60)}`);

    if (dryRun) {
        console.log('\n>>> DRY RUN COMPLETE - No changes were made <<<');
        console.log('>>> Run without --dry-run to execute the reset <<<\n');
    } else {
        console.log(`\n✅ Survivor pool nerduniverse-${year} is ready for Week 1!`);
        console.log(`   All ${membersReset} members can now make fresh picks.\n`);
    }

    process.exit(0);
})().catch(e => {
    console.error('\nFAIL:', e.message);
    console.error(e.stack);
    process.exit(1);
});
