const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function simulateGridLoad() {
    const week = 5;
    const andreaId = 'bEVzcZtSExT8cIjamWnGbWZ3J5s1';
    
    console.log('\n=== SIMULATING GRID LOAD FOR ANDREA ===\n');

    // Step 1: Load pool members (like Grid does)
    const poolPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
    const poolDoc = await db.doc(poolPath).get();
    const poolMembers = poolDoc.data();
    
    const memberIds = Object.keys(poolMembers);
    console.log('Step 1: Loaded', memberIds.length, 'pool members');
    console.log('  Andrea in members?', memberIds.includes(andreaId) ? 'YES' : 'NO');

    // Step 2: Load ALL picks (like Grid does)
    const allPicks = {};
    
    for (const memberId of memberIds) {
        const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions/${memberId}`;
        const picksDoc = await db.doc(picksPath).get();
        
        if (picksDoc.exists) {
            allPicks[memberId] = picksDoc.data();
            
            if (memberId === andreaId) {
                console.log('\n✅ ANDREA PICKS LOADED:');
                console.log('  Path:', picksPath);
                const gamePicks = Object.keys(allPicks[memberId]).filter(k => k.match(/^\d+$/));
                console.log('  Game picks:', gamePicks.length);
                console.log('  Game 501:', allPicks[memberId]['501']);
            }
        } else {
            allPicks[memberId] = null;
            
            if (memberId === andreaId) {
                console.log('\n❌ ANDREA PICKS NOT FOUND at:', picksPath);
            }
        }
    }

    console.log('\nStep 2: Loaded picks for', Object.keys(allPicks).filter(id => allPicks[id] !== null).length, 'users');
    
    // Step 3: Check if Andrea is in allPicks
    if (allPicks[andreaId]) {
        console.log('\n✅ FINAL CHECK: Andrea IS in allPicks object');
        console.log('  Game 501 pick:', allPicks[andreaId]['501']);
    } else {
        console.log('\n❌ FINAL CHECK: Andrea NOT in allPicks object');
    }

    process.exit(0);
}

simulateGridLoad();
