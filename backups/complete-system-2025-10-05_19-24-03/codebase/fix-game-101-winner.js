// Fix Game 101 Winner - Correct Eagles vs Cowboys result
// The winner is incorrectly set to "Buffalo Bills" but should be "Philadelphia Eagles"

async function fixGame101Winner() {
    try {
        console.log('🔧 FIXING Game 101 Winner...');
        console.log('   Game: Dallas Cowboys @ Philadelphia Eagles');
        console.log('   Current Winner: Buffalo Bills (WRONG!)');
        console.log('   Correct Winner: Philadelphia Eagles');

        // Update the Firebase game result
        const gameResultPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/1';
        const docRef = window.doc(window.db, gameResultPath);

        // Get current data
        const docSnap = await window.getDoc(docRef);
        if (!docSnap.exists()) {
            console.log('❌ Game results document not found');
            return;
        }

        const gameResults = docSnap.data();
        console.log('📊 Current Game 101 data:', gameResults['101']);

        // Fix Game 101 winner
        if (gameResults['101']) {
            gameResults['101'].winner = 'Philadelphia Eagles';
            gameResults['101'].lastUpdated = new Date().toISOString();

            // Update Firestore
            await window.setDoc(docRef, gameResults);

            console.log('✅ Game 101 winner corrected to Philadelphia Eagles');
            console.log('📊 Updated Game 101 data:', gameResults['101']);

            return gameResults['101'];
        } else {
            console.log('❌ Game 101 not found in results');
            return null;
        }

    } catch (error) {
        console.error('❌ Error fixing Game 101 winner:', error);
        throw error;
    }
}

// Make function available globally
window.fixGame101Winner = fixGame101Winner;

console.log('🔧 Game 101 fix script loaded. Run: window.fixGame101Winner()');