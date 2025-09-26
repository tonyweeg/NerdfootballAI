/**
 * Simple RTDB Test Function with manual CORS
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const rtdb = admin.database();

exports.testRTDB = functions.https.onRequest(async (req, res) => {
    // Manual CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    
    try {
        console.log('🧪 Testing RTDB write...');
        
        // Write test data to RTDB
        const testData = {
            timestamp: admin.database.ServerValue.TIMESTAMP,
            message: 'Hello from Cloud Function!',
            week: 1,
            testGame: {
                gameId: 'test-game-001',
                homeTeam: 'Kansas City Chiefs',
                awayTeam: 'Buffalo Bills',
                homeScore: 21,
                awayScore: 17,
                status: 'live',
                quarter: 'Q3',
                timeRemaining: '8:45'
            }
        };
        
        const testPath = 'nerdfootball/live/2025/week_1/test';
        await rtdb.ref(testPath).set(testData);
        
        console.log('✅ RTDB test data written successfully');
        
        res.json({
            success: true,
            message: 'RTDB test completed',
            dataPath: testPath,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ RTDB test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});