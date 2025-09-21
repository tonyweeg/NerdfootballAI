// 🔧 FIX TEENA'S CONFIDENCE DISTRIBUTION ISSUE
// Investigate and fix her invalid confidence values

async function fixTeenaConfidence() {
    console.log('🔍 INVESTIGATING TEENA\'S CONFIDENCE ISSUE...');

    const TEENA_UID = "THoYhTIT46RdGeNuL9CyfPCJtZ73";

    try {
        // Check her picks for both weeks
        for (const week of [1, 2]) {
            console.log(`\n📋 Checking Teena's Week ${week} picks...`);

            const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;
            const picksDocRef = window.doc(window.db, picksPath, TEENA_UID);
            const picksSnap = await window.getDoc(picksDocRef);

            if (!picksSnap.exists()) {
                console.log(`❌ Week ${week}: No picks found!`);
                continue;
            }

            const picksData = picksSnap.data();
            const games = Object.keys(picksData).filter(k => k !== 'mnfTotalPoints');

            console.log(`📊 Week ${week}: ${games.length} games found`);
            console.log(`📊 Sample games:`, games.slice(0, 5));

            // Check confidence values
            const confidenceValues = [];
            const gameDetails = [];

            games.forEach(gameId => {
                const pick = picksData[gameId];
                if (typeof pick === 'object' && pick.confidence !== undefined) {
                    confidenceValues.push(pick.confidence);
                    gameDetails.push({
                        game: gameId,
                        team: pick.team,
                        confidence: pick.confidence
                    });
                }
            });

            console.log(`📊 Week ${week}: Confidence values:`, confidenceValues.sort((a,b) => a-b));
            console.log(`📊 Week ${week}: Expected values for ${games.length} games:`,
                Array.from({length: games.length}, (_, i) => i + 1));

            // Check for duplicates or missing values
            const expectedValues = Array.from({length: games.length}, (_, i) => i + 1);
            const missingValues = expectedValues.filter(v => !confidenceValues.includes(v));
            const duplicateValues = confidenceValues.filter((v, i) => confidenceValues.indexOf(v) !== i);

            if (missingValues.length > 0) {
                console.log(`❌ Week ${week}: Missing confidence values:`, missingValues);
            }
            if (duplicateValues.length > 0) {
                console.log(`❌ Week ${week}: Duplicate confidence values:`, duplicateValues);
            }

            if (missingValues.length === 0 && duplicateValues.length === 0) {
                console.log(`✅ Week ${week}: Confidence values look correct!`);
            } else {
                console.log(`🔧 Week ${week}: FIXING confidence distribution...`);

                // Fix the confidence values
                const fixedPicks = { ...picksData };
                let nextConfidence = 1;

                games.forEach(gameId => {
                    if (fixedPicks[gameId] && typeof fixedPicks[gameId] === 'object') {
                        fixedPicks[gameId].confidence = nextConfidence;
                        nextConfidence++;
                    }
                });

                // Update the document
                await window.setDoc(picksDocRef, fixedPicks);
                console.log(`✅ Week ${week}: Fixed confidence values (1-${games.length})`);
            }
        }

        console.log('\n🎯 TEENA\'S CONFIDENCE INVESTIGATION COMPLETE');
        return true;

    } catch (error) {
        console.error('💥 INVESTIGATION FAILED:', error);
        return false;
    }
}

// Auto-setup
if (typeof window !== 'undefined') {
    window.fixTeenaConfidence = fixTeenaConfidence;
    console.log('🔍 Fix Teena Confidence loaded. Run: fixTeenaConfidence()');
}