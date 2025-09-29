const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://nerdfootball.firebaseio.com"
});

const db = admin.firestore();

const AFFECTED_USER_ID = 'w9a0168NrKRH3sgB4BoFYCt7miV2';

async function debugConfidenceIssue() {
    console.log('💎 DEBUGGING CONFIDENCE DISPLAY BUG - DIAMONDS ARE FOREVER 💎');
    console.log('========================================================\n');
    
    try {
        console.log(`🔍 Investigating user: ${AFFECTED_USER_ID}\n`);
        
        // Check user's picks - let's look in the known path
        const publicPicksPath = 'artifacts/nerdfootball/public/data/nerdfootball_picks';
        const publicWeeks = await db.collection(publicPicksPath).get();
        
        let foundPicks = false;
        console.log(`📊 Checking ${publicWeeks.size} weeks for user picks\n`);
        
        // Check each week for this user's submissions
        for (const weekDoc of publicWeeks.docs) {
            const weekId = weekDoc.id;
            const userSubmissionRef = db.doc(`${publicPicksPath}/${weekId}/submissions/${AFFECTED_USER_ID}`);
            const userSubmission = await userSubmissionRef.get();
            
            if (userSubmission.exists) {
                foundPicks = true;
                console.log(`📝 Found picks in Week ${weekId}:`);
                const data = userSubmission.data();
                
                console.log('📋 Full data structure:', JSON.stringify(data, null, 2));
                
                // Analyze each pick
                Object.keys(data).forEach(gameId => {
                    const pick = data[gameId];
                    if (pick && typeof pick === 'object') {
                        console.log(`\n  🏈 Game ${gameId}:`);
                        console.log(`    Winner: ${pick.winner}`);
                        console.log(`    Confidence: ${pick.confidence} (type: ${typeof pick.confidence})`);
                        
                        // Test our current logic
                        const displayValue = pick.confidence || '?';
                        const parsedValue = parseInt(pick.confidence) || 0;
                        
                        console.log(`    📱 Current display: "${displayValue}"`);
                        console.log(`    🔢 Parsed integer: ${parsedValue}`);
                        
                        // Identify the problem
                        if (pick.confidence === 0) {
                            console.log('    🚨 BUG FOUND: Confidence is 0 - shows as "?" due to falsy check!');
                        } else if (pick.confidence === '0') {
                            console.log('    ✅ Confidence is string "0" - would display correctly');
                        } else if (pick.confidence === null || pick.confidence === undefined) {
                            console.log('    ⚠️ Confidence is null/undefined - correctly shows "?"');
                        }
                    }
                });
                console.log('\n' + '='.repeat(50));
            }
        }
        
        if (!foundPicks) {
            console.log('❌ No picks found for this user in the database');
            
            // Check if user exists in pool membership
            const poolMembersRef = db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
            const poolDoc = await poolMembersRef.get();
            
            if (poolDoc.exists) {
                const members = poolDoc.data();
                if (members[AFFECTED_USER_ID]) {
                    console.log('✅ User exists in pool membership');
                    console.log('👤 User info:', members[AFFECTED_USER_ID]);
                } else {
                    console.log('❌ User NOT found in pool membership');
                }
            }
        }
        
        // Recommend fix
        console.log('\n💡 RECOMMENDED FIX:');
        console.log('The issue is likely that confidence values of 0 are being treated as falsy.');
        console.log('Current code: ${pick.confidence || "?"}');
        console.log('Fixed code should be: ${pick.confidence != null ? pick.confidence : "?"}');
        console.log('Or: ${pick.confidence !== undefined && pick.confidence !== null ? pick.confidence : "?"}');
        
    } catch (error) {
        console.error('❌ Error debugging confidence issue:', error);
    }
}

async function main() {
    await debugConfidenceIssue();
    process.exit(0);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});