const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'nerdfootball'
});

async function triggerWeek4Scoring() {
    try {
        console.log('🚀 Triggering Week 4 scoring function...');

        // Import and run the scoring function directly
        const { processWeeklyScoring } = require('./functions/justRunWeek4.js');

        // Call the function with empty data and mock context
        const result = await processWeeklyScoring({}, {});

        console.log('📊 Scoring Results:', JSON.stringify(result, null, 2));

        if (result.success) {
            console.log(`✅ Success! Processed ${result.usersProcessed} users for Week ${result.weekNumber}`);
        } else {
            console.log(`❌ Error: ${result.error}`);
        }

    } catch (error) {
        console.error('❌ Error triggering scoring:', error);
    }
}

triggerWeek4Scoring();