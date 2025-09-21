// 🚀 TEST PRODUCTION PRECOMPUTED SYSTEM
// Verify the precomputed data system is working in production

console.log('🔍 TESTING PRODUCTION PRECOMPUTED SYSTEM...');

async function testProductionPrecomputed() {
    try {
        console.log('📋 Starting production test...');

        // Test if all systems are available
        if (!window.precomputedReader) {
            console.log('❌ Precomputed reader not available');
            return { error: 'Precomputed reader not found' };
        }

        if (!window.db) {
            console.log('❌ Firebase not available');
            return { error: 'Firebase not connected' };
        }

        console.log('✅ Core systems available');

        // Test precomputed status
        const status = window.precomputedReader.getStatus();
        console.log('📊 Precomputed reader status:', status);

        // Test Week 1 precomputed data
        console.log('🔍 Testing Week 1 precomputed performance...');
        const week1StartTime = performance.now();
        const week1Data = await window.precomputedReader.getWeekLeaderboard(1);
        const week1EndTime = performance.now();
        const week1Duration = week1EndTime - week1StartTime;

        console.log(`⏱️ Week 1 response time: ${week1Duration.toFixed(2)}ms`);

        if (week1Data && week1Data.length > 0) {
            console.log(`✅ Week 1 PRECOMPUTED SUCCESS: ${week1Data.length} users in ${week1Duration.toFixed(2)}ms`);
            console.log(`📈 Performance category: ${week1Duration < 50 ? 'LIGHTNING FAST ⚡' : week1Duration < 500 ? 'FAST 🚀' : 'SLOW 🐌'}`);

            // Show top 3 users
            console.log('🏆 Top 3 Week 1 Leaders:');
            week1Data.slice(0, 3).forEach((user, index) => {
                console.log(`  ${index + 1}. ${user.displayName}: ${user.totalPoints} points`);
            });
        } else {
            console.log('⚠️ Week 1 returned null - falling back to live calculation');
        }

        // Test Week 2 precomputed data
        console.log('🔍 Testing Week 2 precomputed performance...');
        const week2StartTime = performance.now();
        const week2Data = await window.precomputedReader.getWeekLeaderboard(2);
        const week2EndTime = performance.now();
        const week2Duration = week2EndTime - week2StartTime;

        console.log(`⏱️ Week 2 response time: ${week2Duration.toFixed(2)}ms`);

        if (week2Data && week2Data.length > 0) {
            console.log(`✅ Week 2 PRECOMPUTED SUCCESS: ${week2Data.length} users in ${week2Duration.toFixed(2)}ms`);

            // Show top 3 users
            console.log('🏆 Top 3 Week 2 Leaders:');
            week2Data.slice(0, 3).forEach((user, index) => {
                console.log(`  ${index + 1}. ${user.displayName}: ${user.totalPoints} points`);
            });
        } else {
            console.log('⚠️ Week 2 returned null - falling back to live calculation');
        }

        // Test season leaderboard
        console.log('🔍 Testing Season leaderboard...');
        const seasonStartTime = performance.now();
        const seasonData = await window.precomputedReader.getSeasonLeaderboard();
        const seasonEndTime = performance.now();
        const seasonDuration = seasonEndTime - seasonStartTime;

        console.log(`⏱️ Season response time: ${seasonDuration.toFixed(2)}ms`);

        if (seasonData && seasonData.length > 0) {
            console.log(`✅ SEASON PRECOMPUTED SUCCESS: ${seasonData.length} users in ${seasonDuration.toFixed(2)}ms`);
        } else {
            console.log('⚠️ Season data returned null');
        }

        // Calculate overall performance
        const avgPrecomputedTime = (week1Duration + week2Duration + seasonDuration) / 3;
        const isPrecomputedWorking = (week1Data && week1Data.length > 0) || (week2Data && week2Data.length > 0);

        console.log('📊 PRODUCTION TEST RESULTS:');
        console.log(`  Average precomputed response: ${avgPrecomputedTime.toFixed(2)}ms`);
        console.log(`  Week 1 working: ${week1Data ? '✅' : '❌'}`);
        console.log(`  Week 2 working: ${week2Data ? '✅' : '❌'}`);
        console.log(`  Season working: ${seasonData ? '✅' : '❌'}`);
        console.log(`  Overall status: ${isPrecomputedWorking ? '🚀 PRECOMPUTED ACTIVE' : '⚠️ FALLBACK TO LIVE'}`);

        return {
            success: true,
            week1Working: !!week1Data,
            week2Working: !!week2Data,
            seasonWorking: !!seasonData,
            avgResponseTime: avgPrecomputedTime,
            isPrecomputedActive: isPrecomputedWorking
        };

    } catch (error) {
        console.error('❌ PRODUCTION TEST FAILED:', error.message);
        console.error('🔍 Full error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Execute test when page loads
setTimeout(testProductionPrecomputed, 2000);

console.log('🎯 Production test script loaded - executing in 2 seconds...');