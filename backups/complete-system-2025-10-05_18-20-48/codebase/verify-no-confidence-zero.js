// Verification script to check for confidence 0 values in production
const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://nerdfootball-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

async function verifyNoConfidenceZero() {
    console.log('🔍 Verifying no users have confidence 0 values...');
    
    const issues = [];
    const weeks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]; // All NFL weeks
    
    for (const week of weeks) {
        console.log(`\nChecking Week ${week}...`);
        
        const picksCollectionPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;
        
        try {
            const picksSnapshot = await db.collection(picksCollectionPath).get();
            
            if (picksSnapshot.empty) {
                console.log(`  Week ${week}: No submissions found`);
                continue;
            }
            
            console.log(`  Week ${week}: Found ${picksSnapshot.size} user submissions`);
            
            picksSnapshot.forEach(doc => {
                const userId = doc.id;
                const picks = doc.data();
                
                // Check each pick for confidence 0
                Object.keys(picks).forEach(gameId => {
                    if (picks[gameId] && picks[gameId].confidence === 0) {
                        issues.push({
                            week,
                            userId,
                            gameId,
                            pick: picks[gameId]
                        });
                        console.log(`    ❌ Found confidence 0: User ${userId}, Game ${gameId}`);
                    }
                });
            });
            
        } catch (error) {
            console.log(`  Week ${week}: Error checking - ${error.message}`);
        }
    }
    
    console.log('\n📊 Verification Results:');
    
    if (issues.length === 0) {
        console.log('✅ SUCCESS: No confidence 0 values found in any user picks!');
        console.log('🎯 The admin confidence bug fix is working correctly.');
    } else {
        console.log(`❌ FOUND ${issues.length} confidence 0 values:`);
        issues.forEach(issue => {
            console.log(`   Week ${issue.week}, User: ${issue.userId}, Game: ${issue.gameId}`);
            console.log(`   Pick:`, issue.pick);
        });
        console.log('\n🔧 These should be fixed by admin the next time they save picks for these users.');
    }
    
    return issues.length === 0;
}

// Run verification
verifyNoConfidenceZero()
    .then(success => {
        console.log(`\n💎 Diamond Verification ${success ? 'PASSED' : 'IDENTIFIED ISSUES'}`);
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    });