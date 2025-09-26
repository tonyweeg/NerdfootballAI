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
        
        // Check user's picks across all weeks using collectionGroup
        const allSubmissions = await db.collectionGroup('submissions').where(admin.firestore.FieldPath.documentId(), '==', AFFECTED_USER_ID).get();
        
        console.log(`📊 Found ${allSubmissions.size} pick submissions for this user\n`);
        
        // Examine each submission
        allSubmissions.docs.forEach((doc, index) => {
            console.log(`📝 Submission ${index + 1}: ${doc.ref.path}`);
            const data = doc.data();
            
            // Log the structure of the picks data
            console.log('📋 Data structure:', JSON.stringify(data, null, 2));
            
            // Check if this has the confidence structure we expect
            if (data && typeof data === 'object') {
                Object.keys(data).forEach(gameId => {
                    const pick = data[gameId];
                    if (pick && typeof pick === 'object') {
                        console.log(`  🏈 Game ${gameId}:`, {
                            winner: pick.winner,
                            confidence: pick.confidence,
                            confidenceType: typeof pick.confidence,
                            confidenceValue: pick.confidence
                        });
                        
                        // Test our current logic
                        const displayValue = pick.confidence || '?';
                        const parsedValue = parseInt(pick.confidence) || 0;
                        
                        console.log(`    📱 Current display logic: "${displayValue}"`);
                        console.log(`    🔢 Parsed integer: ${parsedValue}`);
                        
                        if (pick.confidence === 0) {
                            console.log('    ⚠️ WARNING: Confidence is 0 - this would show as "?" with current logic!');
                        }
                        if (pick.confidence === '0') {
                            console.log('    ⚠️ WARNING: Confidence is string "0" - this would show as "0" but parse correctly');
                        }
                    }
                });
            }
            console.log('');
        });
        
        // Also check if user exists in pool membership
        const poolMembersRef = db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        const poolDoc = await poolMembersRef.get();
        
        if (poolDoc.exists) {
            const members = poolDoc.data();
            if (members[AFFECTED_USER_ID]) {
                console.log('✅ User exists in pool membership');
                console.log('👤 User info:', members[AFFECTED_USER_ID]);
            } else {
                console.log('❌ User NOT found in pool membership - this could be an issue!');
            }
        }
        
        // Check user profile
        const userProfileRef = db.doc(`artifacts/nerdfootball/public/data/nerdfootball_users/${AFFECTED_USER_ID}`);
        const userDoc = await userProfileRef.get();
        
        if (userDoc.exists) {
            console.log('✅ User profile exists');
            console.log('👤 Profile info:', userDoc.data());
        } else {
            console.log('❌ User profile NOT found');
        }
        
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