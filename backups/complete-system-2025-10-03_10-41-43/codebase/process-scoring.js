// 🚀 Process Scoring for Weeks 1-2 - Fix Season Leaderboard 0's
// Run this script to process user picks into scoring data

async function processWeekScoring() {
    console.log('🚀 Starting scoring process for Weeks 1-2...');

    // Check if ScoringSystemManager is available
    if (!window.ScoringSystemManager) {
        console.error('❌ ScoringSystemManager not available');
        return;
    }

    try {
        // Process Week 1
        console.log('📊 Processing Week 1 scoring...');
        const week1Result = await window.ScoringSystemManager.processWeekScoring(1, true);
        console.log('✅ Week 1 complete:', week1Result);

        // Brief delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Process Week 2
        console.log('📊 Processing Week 2 scoring...');
        const week2Result = await window.ScoringSystemManager.processWeekScoring(2, true);
        console.log('✅ Week 2 complete:', week2Result);

        // Generate season leaderboard
        console.log('🏆 Generating season leaderboard...');
        const seasonResult = await window.ScoringSystemManager.generateSeasonLeaderboard([1, 2]);
        console.log('🎉 SEASON LEADERBOARD COMPLETE!');
        console.log(`Top 3 users:`, seasonResult.standings.slice(0, 3).map(u => ({
            name: u.displayName,
            points: u.totalPoints
        })));

    } catch (error) {
        console.error('❌ Error processing scoring:', error);
    }
}

// Auto-run when loaded
if (typeof window !== 'undefined') {
    console.log('🎯 Scoring processor loaded - run processWeekScoring() to start');
    window.processWeekScoring = processWeekScoring;
} else {
    processWeekScoring();
}