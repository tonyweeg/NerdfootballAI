const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize admin SDK if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * Firebase Function to generate custom tokens for admin users
 * This allows proper Firestore authentication with specific admin UIDs
 */
exports.generateAdminToken = functions.https.onCall(async (data, context) => {
    const { requestedUID } = data;

    // Valid admin UIDs (must match Firestore rules)
    const VALID_ADMIN_UIDS = [
        'WxSPmEildJdqs6T5hIpBUZrscwt2',
        'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2'
    ];

    // Validate the requested UID
    if (!requestedUID || !VALID_ADMIN_UIDS.includes(requestedUID)) {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Invalid admin UID requested'
        );
    }

    try {
        // Generate custom token for the admin UID
        const customToken = await admin.auth().createCustomToken(requestedUID, {
            admin: true,
            role: 'admin',
            source: 'ai-picks-helper'
        });

        console.log(`Admin token generated for UID: ${requestedUID}`);

        return {
            customToken,
            uid: requestedUID,
            message: 'Admin token generated successfully'
        };
    } catch (error) {
        console.error('Error generating admin token:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to generate admin token'
        );
    }
});

/**
 * HTTP endpoint version for direct calls
 */
exports.generateAdminTokenHTTP = functions.https.onRequest(async (req, res) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', 'https://nerdfootball.web.app');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const { requestedUID } = req.body;

    // Valid admin UIDs
    const VALID_ADMIN_UIDS = [
        'WxSPmEildJdqs6T5hIpBUZrscwt2',
        'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2'
    ];

    if (!requestedUID || !VALID_ADMIN_UIDS.includes(requestedUID)) {
        res.status(403).json({ error: 'Invalid admin UID requested' });
        return;
    }

    try {
        const customToken = await admin.auth().createCustomToken(requestedUID, {
            admin: true,
            role: 'admin',
            source: 'ai-picks-helper'
        });

        console.log(`Admin token generated for UID: ${requestedUID}`);

        res.json({
            customToken,
            uid: requestedUID,
            message: 'Admin token generated successfully'
        });
    } catch (error) {
        console.error('Error generating admin token:', error);
        res.status(500).json({ error: 'Failed to generate admin token' });
    }
});