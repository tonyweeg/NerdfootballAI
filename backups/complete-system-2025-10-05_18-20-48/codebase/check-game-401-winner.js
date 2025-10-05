const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'nerdfootball'
});

const db = admin.firestore();

async function checkGame401Winner() {
    try {
        console.log('🔍 Checking Game 401 winner status...');

        const gamesPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/4';
        const gamesRef = db.doc(gamesPath);

        const snapshot = await gamesRef.get();
        if (!snapshot.exists) {
            console.log('❌ No Week 4 games found');
            return;
        }

        const data = snapshot.data();
        const game401 = data['401'];

        if (!game401) {
            console.log('❌ Game 401 not found');
            return;
        }

        console.log('🏈 Game 401 Details:');
        console.log('   Teams:', game401.a, '@', game401.h);
        console.log('   Status:', game401.status || 'No status');
        console.log('   Winner:', game401.winner || 'No winner set');
        console.log('   Away Score:', game401.awayScore || 0);
        console.log('   Home Score:', game401.homeScore || 0);

        // Check if this game can be scored
        const canBeScored = game401.status &&
                           game401.status.includes('FINAL') &&
                           game401.winner;

        console.log('\n🎯 Scoring Status:');
        console.log('   Can be scored:', canBeScored ? '✅ YES' : '❌ NO');

        if (!canBeScored) {
            console.log('   Reason: Game is', game401.status || 'scheduled',
                       'and winner is', game401.winner || 'not set');
        }

        // Check Tony's pick for this game
        const userId = 'WxSPmEildJdqs6T5hIpBUZrscwt2';
        const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/4/submissions/${userId}`;
        const picksRef = db.doc(picksPath);
        const picksSnap = await picksRef.get();

        if (picksSnap.exists) {
            const picks = picksSnap.data();
            const pick401 = picks['401'];

            if (pick401) {
                console.log('\n👤 Tony\'s Pick for Game 401:');
                console.log('   Team:', pick401.team || 'No team');
                console.log('   Confidence:', pick401.confidence || 'No confidence');

                if (canBeScored) {
                    const isCorrect = pick401.team === game401.winner;
                    const points = isCorrect ? (pick401.confidence || 0) : 0;
                    console.log('   Result:', isCorrect ? '✅ CORRECT' : '❌ WRONG');
                    console.log('   Points:', points);
                }
            } else {
                console.log('\n❌ Tony has no pick for Game 401');
            }
        } else {
            console.log('\n❌ Tony has no Week 4 picks');
        }

    } catch (error) {
        console.error('❌ Error checking Game 401:', error);
    }
}

checkGame401Winner();