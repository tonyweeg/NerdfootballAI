const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://nerdfootball.firebaseio.com"
});

const db = admin.firestore();

const AFFECTED_USER_ID = 'w9a0168NrKRH3sgB4BoFYCt7miV2';

async function checkCurrentWeekData() {
    console.log('💎 CHECKING CURRENT WEEK DATA FOR USER 💎\n');
    
    try {
        // Check what weeks exist
        const publicPicksPath = 'artifacts/nerdfootball/public/data/nerdfootball_picks';
        const weeks = await db.collection(publicPicksPath).get();
        
        console.log(`📅 Available weeks: ${weeks.docs.map(doc => doc.id).join(', ')}\n`);
        
        if (weeks.empty) {
            console.log('❌ No weeks found in picks collection');
            return;
        }
        
        // Check the most recent weeks
        const weekIds = weeks.docs.map(doc => parseInt(doc.id)).filter(id => !isNaN(id)).sort((a, b) => b - a);
        console.log(`🔢 Numeric weeks (newest first): ${weekIds.slice(0, 5).join(', ')}\n`);
        
        // Check the most recent week
        const currentWeek = weekIds[0];
        console.log(`🏈 Checking Week ${currentWeek} submissions:\n`);
        
        const submissionsRef = db.collection(`${publicPicksPath}/${currentWeek}/submissions`);
        const allSubmissions = await submissionsRef.get();
        
        console.log(`👥 Total submissions in Week ${currentWeek}: ${allSubmissions.size}\n`);
        
        // List all users who have submissions
        const usersWithPicks = [];
        allSubmissions.docs.forEach(doc => {
            usersWithPicks.push(doc.id);
        });
        
        console.log(`📝 Users with picks in Week ${currentWeek}:`);
        usersWithPicks.forEach((uid, index) => {
            console.log(`  ${index + 1}. ${uid}${uid === AFFECTED_USER_ID ? ' ← TARGET USER' : ''}`);
        });
        
        // Check if our target user is in this week
        if (usersWithPicks.includes(AFFECTED_USER_ID)) {
            console.log(`\n✅ Found ${AFFECTED_USER_ID} in Week ${currentWeek}!`);
            
            const userDoc = await submissionsRef.doc(AFFECTED_USER_ID).get();
            const data = userDoc.data();
            
            console.log('\n📋 User pick data:');
            console.log(JSON.stringify(data, null, 2));
            
            // Test each pick
            Object.keys(data || {}).forEach(gameId => {
                const pick = data[gameId];
                if (pick) {
                    console.log(`\n🏈 Game ${gameId}:`);
                    console.log(`  Winner: ${pick.winner}`);
                    console.log(`  Confidence: ${pick.confidence} (type: ${typeof pick.confidence})`);
                    
                    // Test the problematic logic
                    const currentLogic = pick.confidence || '?';
                    const fixedLogic = pick.confidence != null ? pick.confidence : '?';
                    
                    console.log(`  Current display: "${currentLogic}"`);
                    console.log(`  Fixed display: "${fixedLogic}"`);
                    
                    if (pick.confidence === 0) {
                        console.log('  🚨 CONFIDENCE IS 0 - THIS IS THE BUG!');
                    }
                }
            });
            
        } else {
            console.log(`\n❌ ${AFFECTED_USER_ID} NOT found in Week ${currentWeek}`);
            
            // Check if they exist in any week
            let foundInWeek = null;
            for (const weekId of weekIds.slice(0, 5)) {
                const weekSubmissions = await db.collection(`${publicPicksPath}/${weekId}/submissions`).get();
                const hasUserInWeek = weekSubmissions.docs.some(doc => doc.id === AFFECTED_USER_ID);
                if (hasUserInWeek) {
                    foundInWeek = weekId;
                    break;
                }
            }
            
            if (foundInWeek) {
                console.log(`\n🔍 Found user in Week ${foundInWeek} instead`);
                const userDoc = await db.doc(`${publicPicksPath}/${foundInWeek}/submissions/${AFFECTED_USER_ID}`).get();
                console.log('📋 Data:', JSON.stringify(userDoc.data(), null, 2));
            } else {
                console.log('\n❌ User not found in any recent weeks');
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function main() {
    await checkCurrentWeekData();
    process.exit(0);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});