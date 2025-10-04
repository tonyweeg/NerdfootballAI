const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function clearAllWeek4Caches() {
    console.log('🧹 CLEARING ALL WEEK 4 CACHES');
    console.log('============================');

    const results = {
        cleared: [],
        errors: []
    };

    try {
        // 1. Clear Weekly Leaderboard Cache
        console.log('📈 Clearing weekly leaderboard cache...');
        try {
            const weeklyLeaderboardCachePath = 'cache/weekly_leaderboard_2025_week_4';
            const weeklyRef = db.doc(weeklyLeaderboardCachePath);
            await weeklyRef.delete();
            console.log('✅ Weekly leaderboard cache cleared');
            results.cleared.push('Weekly Leaderboard Cache');
        } catch (error) {
            console.log('⚠️ Weekly leaderboard cache not found or already cleared');
            results.cleared.push('Weekly Leaderboard Cache (was empty)');
        }

        // 2. Clear ESPN Cache for Week 4
        console.log('🏈 Clearing ESPN cache...');
        try {
            const espnCachePath = 'cache/espn_current_data';
            const espnRef = db.doc(espnCachePath);
            const espnDoc = await espnRef.get();

            if (espnDoc.exists) {
                const data = espnDoc.data();
                // Clear any Week 4 specific cache entries
                const updateData = {};
                let clearedKeys = 0;

                Object.keys(data).forEach(key => {
                    if (key.includes('week_4') || key.includes('week4') || key.includes('_4_')) {
                        updateData[key] = admin.firestore.FieldValue.delete();
                        clearedKeys++;
                    }
                });

                if (clearedKeys > 0) {
                    await espnRef.update(updateData);
                    console.log(`✅ ESPN cache cleared (${clearedKeys} Week 4 entries)`);
                    results.cleared.push(`ESPN Cache (${clearedKeys} entries)`);
                } else {
                    console.log('ℹ️ No Week 4 specific ESPN cache entries found');
                    results.cleared.push('ESPN Cache (no Week 4 entries)');
                }
            } else {
                console.log('ℹ️ ESPN cache document not found');
                results.cleared.push('ESPN Cache (was empty)');
            }
        } catch (error) {
            console.error('❌ Error clearing ESPN cache:', error.message);
            results.errors.push(`ESPN Cache: ${error.message}`);
        }

        // 3. Clear AI Cache (if exists)
        console.log('🤖 Checking AI prediction cache...');
        try {
            const aiCachePath = 'artifacts/nerdfootball/pools/nerduniverse-2025/cache/latest-ai-intel-sheet';
            const aiRef = db.doc(aiCachePath);
            const aiDoc = await aiRef.get();

            if (aiDoc.exists) {
                const aiData = aiDoc.data();
                if (aiData.week === 4) {
                    await aiRef.delete();
                    console.log('✅ AI cache cleared (was for Week 4)');
                    results.cleared.push('AI Predictions Cache');
                } else {
                    console.log(`ℹ️ AI cache is for Week ${aiData.week}, not Week 4`);
                    results.cleared.push('AI Cache (different week)');
                }
            } else {
                console.log('ℹ️ AI cache not found');
                results.cleared.push('AI Cache (was empty)');
            }
        } catch (error) {
            console.error('❌ Error checking AI cache:', error.message);
            results.errors.push(`AI Cache: ${error.message}`);
        }

        // 4. Check for any other Week 4 specific caches
        console.log('🔍 Scanning for other Week 4 caches...');
        try {
            // Check cache collection for any Week 4 specific documents
            const cacheCollection = db.collection('cache');
            const cacheSnapshot = await cacheCollection.get();

            let week4Caches = 0;
            for (const doc of cacheSnapshot.docs) {
                const docId = doc.id;
                if (docId.includes('week_4') || docId.includes('week4') || docId.includes('_4_')) {
                    await doc.ref.delete();
                    console.log(`🗑️ Deleted cache document: ${docId}`);
                    week4Caches++;
                }
            }

            if (week4Caches > 0) {
                console.log(`✅ Cleared ${week4Caches} additional Week 4 cache documents`);
                results.cleared.push(`Additional Week 4 Caches (${week4Caches})`);
            } else {
                console.log('ℹ️ No additional Week 4 cache documents found');
                results.cleared.push('Additional Caches (none found)');
            }
        } catch (error) {
            console.error('❌ Error scanning cache collection:', error.message);
            results.errors.push(`Cache Scan: ${error.message}`);
        }

        // 5. Force regenerate fresh cache
        console.log('🔄 Force regenerating fresh Week 4 leaderboard cache...');
        try {
            const response = await fetch('https://generateweeklyleaderboardcache-np7uealtnq-uc.a.run.app?week=4&force=true', {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('✅ Fresh Week 4 leaderboard cache generated');
                    results.cleared.push('Fresh Cache Generated');
                } else {
                    console.log('⚠️ Cache generation had issues:', result.error);
                    results.errors.push(`Cache Generation: ${result.error}`);
                }
            } else {
                console.log('⚠️ Cache generation request failed:', response.status);
                results.errors.push(`Cache Generation: HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Error regenerating cache:', error.message);
            results.errors.push(`Cache Generation: ${error.message}`);
        }

        // Summary
        console.log('\n🎯 CACHE CLEARING SUMMARY:');
        console.log('=========================');

        console.log(`✅ Items Cleared: ${results.cleared.length}`);
        results.cleared.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item}`);
        });

        if (results.errors.length > 0) {
            console.log(`❌ Errors: ${results.errors.length}`);
            results.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }

        console.log('\n🎉 CACHE CLEARING COMPLETE!');
        console.log('📱 Next user will see fresh Week 4 data with correct scores');
        console.log('🏆 Week 4 leaderboard: Fresh cache with proper scores (100 max, not 172)');

        return results;

    } catch (error) {
        console.error('❌ Cache clearing failed:', error);
        results.errors.push(`System Error: ${error.message}`);
        return results;
    }
}

clearAllWeek4Caches().then((results) => {
    console.log('\n🧹 Cache clearing operation complete');
    process.exit(results.errors.length === 0 ? 0 : 1);
}).catch(error => {
    console.error('❌ Cache clearing error:', error);
    process.exit(1);
});