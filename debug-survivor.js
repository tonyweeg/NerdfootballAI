// Debug script to test survivor system step by step
// Run this in browser console after loading https://nerdfootball.web.app/survivor-test.html

async function debugSurvivorStep() {
    console.log('🔍 STEP 1: Check if systems are loaded');
    console.log('db available:', typeof window.db);
    console.log('getDoc available:', typeof window.getDoc);
    console.log('doc available:', typeof window.doc);
    console.log('simpleSurvivorSystem available:', typeof window.simpleSurvivorSystem);

    if (!window.simpleSurvivorSystem) {
        console.error('❌ SimpleSurvivorSystem not available!');
        return;
    }

    console.log('🔍 STEP 2: Test pool document access');
    const poolId = 'nerduniverse-2025';
    const poolDoc = await window.getDoc(window.doc(window.db, `artifacts/nerdfootball/pools/${poolId}/metadata/members`));
    console.log('Pool exists:', poolDoc.exists());

    if (poolDoc.exists()) {
        const poolData = poolDoc.data();
        console.log('Pool member count:', Object.keys(poolData).length);
        const firstMember = Object.entries(poolData)[0];
        console.log('First member:', firstMember);
    }

    console.log('🔍 STEP 3: Test game data access');
    const week1Doc = await window.getDoc(window.doc(window.db, 'artifacts/nerdfootball/public/data/nerdfootball_games/1'));
    console.log('Week 1 games exist:', week1Doc.exists());
    if (week1Doc.exists()) {
        const week1Data = week1Doc.data();
        console.log('Week 1 game count:', Object.keys(week1Data).length);
        const firstGame = Object.entries(week1Data)[0];
        console.log('First Week 1 game:', firstGame);
    }

    console.log('🔍 STEP 4: Test survivor table call');
    try {
        const results = await window.simpleSurvivorSystem.getSurvivorTable(poolId);
        console.log('✅ Survivor table results:', results.length);
        if (results.length > 0) {
            console.log('First result:', results[0]);
        }
    } catch (error) {
        console.error('❌ Survivor table error:', error);
    }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    setTimeout(debugSurvivorStep, 2000);
}