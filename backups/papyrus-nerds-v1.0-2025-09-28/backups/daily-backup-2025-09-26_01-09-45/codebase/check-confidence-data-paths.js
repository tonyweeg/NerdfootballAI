/**
 * Check what confidence data paths actually exist
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'nerdfootball'
    });
}

const db = admin.firestore();

async function checkDataPaths() {
    console.log('🔍 CHECKING CONFIDENCE DATA PATHS');
    console.log('=================================');

    const poolId = 'nerduniverse-2025';
    const season = '2025';

    // Check unified confidence structure
    console.log('\n📊 Checking unified confidence structure...');
    const unifiedPath = `artifacts/nerdfootball/pools/${poolId}/confidence/${season}/weeks`;

    try {
        const weekCollection = await db.collection(unifiedPath).listDocuments();
        console.log(`✅ Found ${weekCollection.length} weeks in unified structure:`);
        for (const weekDoc of weekCollection) {
            console.log(`   - Week ${weekDoc.id}`);
        }
    } catch (error) {
        console.log(`❌ No unified structure found: ${error.message}`);
    }

    // Check legacy picks structure
    console.log('\n📊 Checking legacy picks structure...');
    const legacyPath = 'artifacts/nerdfootball/public/data/nerdfootball_picks';

    try {
        const weekCollection = await db.collection(legacyPath).listDocuments();
        console.log(`✅ Found ${weekCollection.length} weeks in legacy structure:`);
        for (const weekDoc of weekCollection) {
            console.log(`   - Week ${weekDoc.id}`);

            // Check submissions for this week
            try {
                const submissionsCollection = await db.collection(`${legacyPath}/${weekDoc.id}/submissions`).listDocuments();
                console.log(`     └─ ${submissionsCollection.length} user submissions`);
            } catch (subError) {
                console.log(`     └─ No submissions found`);
            }
        }
    } catch (error) {
        console.log(`❌ No legacy structure found: ${error.message}`);
    }

    // Check summary data
    console.log('\n📊 Checking summary data...');
    const summaryPath = `artifacts/nerdfootball/pools/${poolId}/confidence/${season}/summary`;

    try {
        const summaryDoc = await db.doc(summaryPath).get();
        if (summaryDoc.exists) {
            const summaryData = summaryDoc.data();
            console.log(`✅ Found summary data:`);
            console.log(`   - Weekly totals: ${Object.keys(summaryData.weeklyTotals || {}).join(', ')}`);
            console.log(`   - User totals: ${Object.keys(summaryData.userTotals || {}).length} users`);
        } else {
            console.log(`❌ No summary data found`);
        }
    } catch (error) {
        console.log(`❌ Summary check failed: ${error.message}`);
    }

    // Check ESPN cache
    console.log('\n📊 Checking ESPN cache...');
    try {
        const cacheDoc = await db.doc('cache/espn_current_data').get();
        if (cacheDoc.exists) {
            const cacheData = cacheDoc.data();
            console.log(`✅ Found ESPN cache data:`);
            console.log(`   - Last updated: ${new Date(cacheData.lastUpdated)}`);
            console.log(`   - Team results: ${Object.keys(cacheData.teamResults || {}).length} entries`);

            // Show some sample team results
            const teamResultKeys = Object.keys(cacheData.teamResults || {});
            if (teamResultKeys.length > 0) {
                console.log(`   - Sample keys: ${teamResultKeys.slice(0, 3).join(', ')}`);
            }
        } else {
            console.log(`❌ No ESPN cache found`);
        }
    } catch (error) {
        console.log(`❌ ESPN cache check failed: ${error.message}`);
    }
}

checkDataPaths().catch(console.error);