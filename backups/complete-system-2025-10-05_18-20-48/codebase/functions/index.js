// Load environment variables from .env file
require('dotenv').config();

const functions = require('firebase-functions');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Set global options for v2 functions
setGlobalOptions({ region: 'us-central1' });

// Initialize Firebase Admin
admin.initializeApp();

// Configure VAPID key for web push notifications
const VAPID_KEY = 'BDZpKfQuommUrNF2w2pt_0TwpmUJU_J6ynLEOa10r_pqzcioqxKjOduP-UFxxtBh4OHzf11poHZOuyqJyHKozuY';

// Diamond Level: Auto-cleanup expired FCM tokens
async function cleanupExpiredToken(expiredToken) {
    try {
        // Query all users to find and remove this expired token
        const usersQuery = admin.firestore().collectionGroup('fcm_tokens')
            .where('token', '==', expiredToken);
            
        const snapshot = await usersQuery.get();
        const deletePromises = [];
        
        snapshot.forEach(doc => {
            console.log(`Removing expired token from user: ${doc.ref.path}`);
            deletePromises.push(doc.ref.delete());
        });
        
        await Promise.all(deletePromises);
        return { success: true, deletedCount: deletePromises.length };
    } catch (error) {
        console.error('Error cleaning up expired token:', expiredToken, error);
        return { success: false, error: error.message };
    }
}

// Configure nodemailer transporter (will be null if not configured)
let transporter = null;

// Try to set up email transport if credentials are available
const setupEmailTransport = () => {
    try {
        // Use environment variables for email credentials (Firebase Functions v2)
        const gmailEmail = process.env.GMAIL_EMAIL;
        const gmailPassword = process.env.GMAIL_PASSWORD;

        console.log('=== EMAIL TRANSPORT DEBUG ===');
        console.log('Environment GMAIL_EMAIL:', process.env.GMAIL_EMAIL ? 'SET' : 'NOT SET');
        console.log('Environment GMAIL_PASSWORD:', process.env.GMAIL_PASSWORD ? 'SET' : 'NOT SET');
        console.log('Using email:', gmailEmail ? gmailEmail : 'NOT SET');

        if (gmailEmail && gmailPassword) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: gmailEmail,
                    pass: gmailPassword
                }
            });
            console.log('Email transport configured successfully with Gmail:', gmailEmail);
            return true;
        }
        console.log('Email credentials not found, emails will be logged only');
        return false;
    } catch (error) {
        console.error('Error setting up email transport:', error);
        return false;
    }
};

// Initialize email transport
setupEmailTransport();

// Helper function to get Gmail email consistently
const getGmailEmail = () => {
    return process.env.GMAIL_EMAIL || 'tonyweeg@gmail.com';
};

// Cloud Function to send system messages
exports.sendSystemMessage = functions.https.onCall(async (data, context) => {
    // For Firebase Functions v2, auth context is in data.auth instead of context.auth
    const authContext = context.auth || data.auth;
    
    // Check if user is authenticated
    if (!authContext) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    // Check if user is admin
    const ADMIN_UIDS = ['WxSPmEildJdqs6T5hIpBUZrscwt2', 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2'];
    const userUid = authContext.uid || authContext.token?.uid;
    
    if (!ADMIN_UIDS.includes(userUid)) {
        throw new functions.https.HttpsError('permission-denied', 'User must be an admin');
    }
    
    // Extract data from the correct location (data.data for Firebase Functions v2)
    const actualData = data.data || data;
    const { recipients, subject, body } = actualData;
    
    if (!recipients || !subject || !body) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }
    
    const results = {
        successful: [],
        failed: []
    };
    
    // Setup transport if not already done
    if (!transporter) {
        setupEmailTransport();
    }
    
    // Send emails to each recipient
    for (const recipient of recipients) {
        const displayName = recipient.displayName || 'Nerd';
        
        const emailContent = `Dear Nerd ${displayName},

${body}

Ållfåther Nerd

---
This message was sent from NerdFootball AI System
Reply to: tonyweeg@gmail.com`;
        
        try {
            if (transporter) {
                // Actually send the email
                const gmailEmail = getGmailEmail();
                const mailOptions = {
                    from: `NerdFootball AI <${gmailEmail}>`,
                    to: recipient.email,
                    subject: subject,
                    text: emailContent,
                    replyTo: 'tonyweeg@gmail.com'
                };
                
                await transporter.sendMail(mailOptions);
                results.successful.push(recipient.email);
                console.log(`Email sent successfully to ${recipient.email}`);
            } else {
                // Log email content when transporter is not available
                console.log('=== EMAIL LOG (No transport configured) ===');
                console.log(`To: ${recipient.email}`);
                console.log(`Subject: ${subject}`);
                console.log(`Body:\n${emailContent}`);
                console.log('==========================================');
                results.successful.push(recipient.email);
            }
        } catch (error) {
            console.error(`Failed to send email to ${recipient.email}:`, error);
            results.failed.push({
                email: recipient.email,
                error: error.message
            });
        }
    }
    
    return {
        success: results.successful.length > 0,
        successCount: results.successful.length,
        failCount: results.failed.length,
        successful: results.successful,
        failed: results.failed,
        emailServiceConfigured: !!transporter
    };
});

// === NEW FCM CLOUD FUNCTIONS ===

// Cloud Function to send FCM system messages (replaces sendSystemMessage)
exports.sendFCMSystemMessage = functions.https.onCall(async (data, context) => {
    // For Firebase Functions v2, auth context is in data.auth instead of context.auth
    const authContext = context.auth || data.auth;
    
    // Check if user is authenticated
    if (!authContext) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    // Check if user is admin
    const ADMIN_UIDS = ['WxSPmEildJdqs6T5hIpBUZrscwt2', 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2'];
    const userUid = authContext.uid || authContext.token?.uid;
    
    if (!ADMIN_UIDS.includes(userUid)) {
        throw new functions.https.HttpsError('permission-denied', 'User must be an admin');
    }
    
    // Extract data
    const actualData = data.data || data;
    const { title, body, topic = 'all-users', targetTokens, priority = 'normal', clickAction = '/' } = actualData;
    
    if (!title || !body) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: title and body');
    }
    
    try {
        let response;
        
        if (targetTokens && targetTokens.length > 0) {
            // Send to specific tokens
            const message = {
                notification: {
                    title: title,
                    body: body
                },
                data: {
                    click_action: clickAction,
                    type: 'system_message',
                    priority: priority,
                    timestamp: Date.now().toString()
                },
                webpush: {
                    notification: {
                        icon: '/favicon.ico',
                        badge: '/favicon.ico',
                        requireInteraction: priority === 'high',
                        actions: [
                            {
                                action: 'open',
                                title: 'Open App'
                            }
                        ]
                    },
                    fcmOptions: {
                        link: clickAction
                    },
                    headers: {
                        TTL: '86400'
                    }
                },
                tokens: targetTokens
            };
            
            console.log('FCM Message being sent:', JSON.stringify(message, null, 2));
            console.log('Target tokens:', targetTokens);
            
            response = await admin.messaging().sendEachForMulticast(message);
            
            // Log detailed response
            console.log('FCM Response:', JSON.stringify(response, null, 2));
            
            // Handle failed tokens - Diamond Level cleanup
            if (response.failureCount > 0) {
                console.log('FCM Failures detected - cleaning up invalid tokens:');
                const cleanupPromises = [];
                
                response.responses.forEach((resp, index) => {
                    if (!resp.success) {
                        const failedToken = targetTokens[index];
                        console.log(`Token ${failedToken} failed:`, resp.error);
                        
                        // If token is expired/invalid, remove it from all users
                        if (resp.error.code === 'messaging/registration-token-not-registered') {
                            console.log(`Removing expired token: ${failedToken}`);
                            cleanupPromises.push(cleanupExpiredToken(failedToken));
                        }
                    }
                });
                
                // Clean up expired tokens in parallel
                if (cleanupPromises.length > 0) {
                    await Promise.allSettled(cleanupPromises);
                    console.log(`Cleaned up ${cleanupPromises.length} expired tokens`);
                }
            }
        } else {
            // Send to topic
            const message = {
                notification: {
                    title: title,
                    body: body
                },
                data: {
                    click_action: clickAction,
                    type: 'system_message',
                    priority: priority,
                    timestamp: Date.now().toString()
                },
                webpush: {
                    notification: {
                        icon: '/favicon.ico',
                        badge: '/favicon.ico',
                        requireInteraction: priority === 'high',
                        actions: [
                            {
                                action: 'open',
                                title: 'Open App'
                            }
                        ]
                    },
                    fcmOptions: {
                        link: clickAction
                    },
                    headers: {
                        TTL: '86400'
                    }
                },
                topic: topic
            };
            
            response = await admin.messaging().send(message);
        }
        
        console.log('FCM message sent successfully:', response);
        
        return {
            success: true,
            messageId: response.messageId || response.responses?.map(r => r.messageId),
            successCount: response.successCount || 1,
            failureCount: response.failureCount || 0,
            results: response.responses || [response]
        };
        
    } catch (error) {
        console.error('Error sending FCM message:', error);
        throw new functions.https.HttpsError('internal', `Failed to send FCM message: ${error.message}`);
    }
});

// Cloud Function to send FCM pick confirmation (replaces sendPickConfirmation)
exports.sendFCMPickConfirmation = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { userToken, userName, picks, weekNumber, gameType = 'regular' } = data;
    
    if (!userToken || !picks || !weekNumber) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }
    
    // Format picks for notification
    let picksSummary = '';
    let pickCount = 0;
    
    if (gameType === 'survivor') {
        // Survivor pick format
        const pick = picks.team || picks;
        picksSummary = `Survivor Pick: ${pick}`;
        pickCount = 1;
    } else {
        // Regular picks format
        Object.entries(picks).forEach(([gameId, pick]) => {
            if (pick && pick.team) {
                pickCount++;
            }
        });
        picksSummary = `${pickCount} picks submitted for Week ${weekNumber}`;
    }
    
    const title = gameType === 'survivor' 
        ? `✅ Survivor Pick Confirmed - Week ${weekNumber}`
        : `✅ Picks Confirmed - Week ${weekNumber}`;
        
    const body = gameType === 'survivor'
        ? `${picksSummary}. Good luck this week!`
        : `${picksSummary}. Good luck this week!`;
    
    const message = {
        notification: {
            title: title,
            body: body
        },
        data: {
            click_action: gameType === 'survivor' ? '/nerdSurvivor.html' : '/',
            type: 'pick_confirmation',
            priority: 'normal',
            week_number: weekNumber.toString(),
            game_type: gameType,
            timestamp: Date.now().toString()
        },
        webpush: {
            notification: {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                requireInteraction: false,
                actions: [
                    {
                        action: 'view',
                        title: 'View Picks'
                    }
                ]
            },
            fcmOptions: {
                link: gameType === 'survivor' ? '/nerdSurvivor.html' : '/'
            }
        },
        token: userToken
    };
    
    try {
        const response = await admin.messaging().send(message);
        console.log(`Pick confirmation FCM sent to user: ${response}`);
        
        return {
            success: true,
            messageId: response,
            pickCount: pickCount,
            gameType: gameType
        };
        
    } catch (error) {
        console.error(`Failed to send pick confirmation FCM:`, error);
        return {
            success: false,
            error: error.message,
            pickCount: pickCount,
            gameType: gameType
        };
    }
});

// Cloud Function to subscribe user to FCM topics
exports.subscribeToFCMTopic = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { tokens, topic } = data;
    
    if (!tokens || !topic) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: tokens and topic');
    }
    
    try {
        const response = await admin.messaging().subscribeToTopic(tokens, topic);
        console.log('Successfully subscribed to topic:', topic, response);
        
        return {
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
            errors: response.errors
        };
        
    } catch (error) {
        console.error('Error subscribing to topic:', error);
        throw new functions.https.HttpsError('internal', `Failed to subscribe to topic: ${error.message}`);
    }
});

// === LEGACY EMAIL FUNCTIONS (DEPRECATED) ===

// Cloud Function to send pick confirmation emails
exports.sendPickConfirmation = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { userEmail, userName, picks, weekNumber } = data;
    
    if (!userEmail || !picks || !weekNumber) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }
    
    // Setup transport if not already done
    if (!transporter) {
        setupEmailTransport();
    }
    
    // Format picks for email
    let picksList = 'Your picks for Week ' + weekNumber + ':\n\n';
    
    Object.entries(picks).forEach(([gameId, pick]) => {
        if (pick && pick.team) {
            picksList += `• ${pick.team} (Confidence: ${pick.confidence || 'N/A'})\n`;
        }
    });
    
    picksList += `\nSubmission time: ${new Date().toLocaleString()}`;
    
    const emailContent = `Dear ${userName || 'Nerd'},

Your picks have been successfully saved!

${picksList}

Good luck this week!

Ållfåther Nerd

---
This message was sent from NerdFootball AI System
Reply to: tonyweeg@gmail.com`;
    
    try {
        if (transporter) {
            // Actually send the email
            const gmailEmail = getGmailEmail();
            const mailOptions = {
                from: `NerdFootball AI <${gmailEmail}>`,
                to: userEmail,
                subject: `Week ${weekNumber} Picks Confirmed - NerdFootball AI`,
                text: emailContent,
                replyTo: 'tonyweeg@gmail.com'
            };
            
            await transporter.sendMail(mailOptions);
            console.log(`Pick confirmation email sent to ${userEmail}`);
            return { success: true, message: 'Confirmation email sent', emailServiceConfigured: true };
        } else {
            // Log email when transporter is not available
            console.log('=== PICK CONFIRMATION EMAIL LOG ===');
            console.log(`To: ${userEmail}`);
            console.log(`Subject: Week ${weekNumber} Picks Confirmed`);
            console.log(`Body:\n${emailContent}`);
            console.log('===================================');
            return { success: true, message: 'Email logged (service not configured)', emailServiceConfigured: false };
        }
    } catch (error) {
        console.error(`Failed to send pick confirmation to ${userEmail}:`, error);
        return { success: false, error: error.message, emailServiceConfigured: !!transporter };
    }
});

// Import and export pick analytics functions - DIAMOND LEVEL ANALYTICS
const {
    onPicksUpdate,
    onLegacyPicksUpdate,
    calculateAnalytics,
    getAnalytics,
    onGameResultUpdate,
    onIndividualGameUpdate
} = require('./pickAnalytics');

exports.onPicksUpdate = onPicksUpdate;
exports.onLegacyPicksUpdate = onLegacyPicksUpdate;
exports.calculateAnalytics = calculateAnalytics;
exports.getAnalytics = getAnalytics;
exports.onGameResultUpdate = onGameResultUpdate;
exports.onIndividualGameUpdate = onIndividualGameUpdate;

// Import and export ESPN API functions
const {
    fetchCurrentWeekGames,
    fetchGamesByDate,
    fetchNflTeams,
    fetchSeasonSchedule,
    espnApiStatus
} = require('./espnNerdApi');

exports.fetchCurrentWeekGames = fetchCurrentWeekGames;
exports.fetchGamesByDate = fetchGamesByDate;
exports.fetchNflTeams = fetchNflTeams;
exports.fetchSeasonSchedule = fetchSeasonSchedule;
exports.espnApiStatus = espnApiStatus;

// Import and export contact form functions
const {
    submitContactForm,
    getContactSubmissions
} = require('./contactHandler');

exports.submitContactForm = submitContactForm;
exports.getContactSubmissions = getContactSubmissions;

// Emergency cache clear functions (temporary stub until implemented)
function clearESPNCache() {
    return { success: true, message: 'Cache clearing not implemented yet' };
}

function forceFreshESPNData() {
    return { success: true, message: 'Fresh data forcing not implemented yet' };
}

exports.clearESPNCache = clearESPNCache;
exports.forceFreshESPNData = forceFreshESPNData;

// ☠️ DEEP STAR 6 - Complete user deletion with backup
exports.deepStar6User = onCall(async (request) => {
    const { userId, userName } = request.data;

    console.log('💥 DEEP_STAR_6: Function invoked', { uid: userId });

    // Verify authentication
    if (!request.auth) {
        console.error('💥 DEEP_STAR_6: No authentication');
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Verify admin access
    const ADMIN_UIDS = [
        'WxSPmEildJdqs6T5hIpBUZrscwt2', // tonyweeg@gmail.com
        'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2'  // Additional admin
    ];

    if (!ADMIN_UIDS.includes(request.auth.uid)) {
        console.error('💥 DEEP_STAR_6: Access denied for', request.auth.uid);
        throw new HttpsError('permission-denied', 'Admin access required');
    }

    if (!userId) {
        throw new HttpsError('invalid-argument', 'userId is required');
    }

    const db = admin.firestore();
    const POOL_ID = 'nerduniverse-2025';
    let deletionCount = 0;

    try {
        // STEP 1: Archive complete user data
        console.log('💥 DEEP_STAR_6: Archiving user data', userId);
        const timestamp = new Date().toISOString();

        const membersRef = db.doc(`artifacts/nerdfootball/pools/${POOL_ID}/metadata/members`);
        const membersSnap = await membersRef.get();

        if (!membersSnap.exists) {
            throw new HttpsError('not-found', 'Pool members not found');
        }

        const members = membersSnap.data();
        const userData = members[userId];

        if (!userData) {
            throw new HttpsError('not-found', `User ${userId} not found in pool`);
        }

        // Archive user data
        const archiveRef = db.collection(
            `artifacts/nerdfootball/pools/${POOL_ID}/deep_star_6_archive`
        ).doc(`${userId}_${timestamp.replace(/[:.]/g, '-')}`);

        await archiveRef.set({
            userData: userData,
            uid: userId,
            archivedAt: timestamp,
            archivedBy: request.auth.uid,
            reason: 'DEEP_STAR_6_deletion'
        });

        console.log('💥 DEEP_STAR_6: User archived', { userId, timestamp });

        // STEP 2: Delete all user data (18 weeks) - individually with error handling
        let deletionCount = 0;

        for (let week = 1; week <= 18; week++) {
            try {
                // Confidence picks - path 1
                await db.doc(`artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions/${userId}`).delete();
                deletionCount++;
            } catch (e) { /* ignore missing docs */ }

            try {
                // Confidence picks - path 2
                await db.doc(`artifacts/nerdfootball/pools/${POOL_ID}/confidence/2025/weeks/${week}/users/${userId}`).delete();
                deletionCount++;
            } catch (e) { /* ignore missing docs */ }

            try {
                // Survivor picks - path 2
                await db.doc(`artifacts/nerdfootball/pools/${POOL_ID}/survivor/2025/weeks/${week}/users/${userId}`).delete();
                deletionCount++;
            } catch (e) { /* ignore missing docs */ }

            try {
                // Scoring data
                await db.doc(`artifacts/nerdfootball/pools/${POOL_ID}/scores/2025/weeks/${week}/users/${userId}`).delete();
                deletionCount++;
            } catch (e) { /* ignore missing docs */ }

            try {
                // Weekly rollups
                await db.doc(`artifacts/nerdfootball/pools/${POOL_ID}/rollups/weekly/2025/week_${week}/users/${userId}`).delete();
                deletionCount++;
            } catch (e) { /* ignore missing docs */ }
        }

        try {
            // Season rollup - skip if bad path
            // await db.doc(`artifacts/nerdfootball/pools/${POOL_ID}/rollups/season/2025/users/${userId}`).delete();
            // deletionCount++;
        } catch (e) { /* ignore */ }

        try {
            // Eliminations
            await db.doc(`artifacts/nerdfootball/pools/${POOL_ID}/survivor/2025/eliminations/${userId}`).delete();
            deletionCount++;
        } catch (e) { /* ignore missing docs */ }

        console.log('💥 DEEP_STAR_6: Deletions complete', { userId, deletionCount });

        // STEP 3: Remove from pool members (separate transaction)
        delete members[userId];
        await membersRef.set(members);
        deletionCount++;

        console.log('💥 DEEP_STAR_6: Pool membership deleted', userId);

        console.log('💥 DEEP_STAR_6: Execution complete', {
            userId,
            userName,
            deletionCount,
            archiveId: archiveRef.id,
            executedBy: request.auth.uid,
            timestamp
        });

        return {
            success: true,
            userId,
            userName,
            deletionCount,
            archiveId: archiveRef.id,
            timestamp,
            message: `DEEP STAR 6 complete - ${deletionCount} documents deleted`
        };

    } catch (error) {
        console.error('💥 DEEP_STAR_6: Execution error', { userId, error: error.message });
        throw new HttpsError('internal', `DEEP STAR 6 failed: ${error.message}`);
    }
});

// Get Firebase Auth users NOT in pool (for easy adding)
exports.getAuthUsersNotInPool = onCall(async (request) => {
    console.log('🔍 GET_AUTH_USERS_NOT_IN_POOL: Function invoked');

    // Check authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check admin access
    const ADMIN_UIDS = ['WxSPmEildJdqs6T5hIpBUZrscwt2', 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2'];
    if (!ADMIN_UIDS.includes(request.auth.uid)) {
        throw new HttpsError('permission-denied', 'Admin access required');
    }

    try {
        const poolId = request.data.poolId || 'nerduniverse-2025';

        // Get all pool members
        const poolMembersRef = admin.firestore().doc(`artifacts/nerdfootball/pools/${poolId}/metadata/members`);
        const poolMembersSnap = await poolMembersRef.get();
        const poolMembers = poolMembersSnap.exists ? poolMembersSnap.data() : {};

        console.log('🔍 GET_AUTH_USERS_NOT_IN_POOL: Pool has', Object.keys(poolMembers).length, 'members');

        // Get all Firebase Auth users
        const listUsersResult = await admin.auth().listUsers(1000); // Max 1000 users
        const allAuthUsers = listUsersResult.users;

        console.log('🔍 GET_AUTH_USERS_NOT_IN_POOL: Firebase Auth has', allAuthUsers.length, 'users');

        // Map users with pool membership status
        const usersWithStatus = allAuthUsers
            .map(user => {
                const memberData = poolMembers[user.uid];
                let poolStatus = 'N'; // Neither

                if (memberData) {
                    const hasConfidence = memberData.participation?.confidence?.enabled || false;
                    const hasSurvivor = memberData.participation?.survivor?.enabled || false;

                    if (hasConfidence && hasSurvivor) {
                        poolStatus = 'C+S';
                    } else if (hasConfidence) {
                        poolStatus = 'C';
                    } else if (hasSurvivor) {
                        poolStatus = 'S';
                    }
                }

                return {
                    uid: user.uid,
                    email: user.email || 'No email',
                    displayName: user.displayName || user.email || 'No name',
                    disabled: user.disabled || false,
                    poolStatus: poolStatus,
                    inPool: !!memberData
                };
            })
            .filter(user => !user.inPool) // Only users NOT in pool
            .sort((a, b) => a.displayName.localeCompare(b.displayName));

        console.log('🔍 GET_AUTH_USERS_NOT_IN_POOL: Found', usersWithStatus.length, 'users not in pool');

        return {
            success: true,
            users: usersWithStatus,
            totalAuthUsers: allAuthUsers.length,
            totalPoolMembers: Object.keys(poolMembers).length
        };

    } catch (error) {
        console.error('🔍 GET_AUTH_USERS_NOT_IN_POOL: Error', error);
        throw new HttpsError('internal', `Failed to get auth users: ${error.message}`);
    }
});

// Pool Email System - Get all pool members with emails
exports.getPoolMembersEmails = functions.https.onCall(async (data, context) => {
    // For Firebase Functions v2, auth context is in data.auth instead of context.auth
    const authContext = context.auth || data.auth;

    // Check if user is authenticated
    if (!authContext) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check if user is admin
    const ADMIN_UIDS = ['WxSPmEildJdqs6T5hIpBUZrscwt2', 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2'];
    const userUid = authContext.uid || authContext.token?.uid;

    if (!ADMIN_UIDS.includes(userUid)) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    try {
        const actualData = data.data || data;
        const { poolId = 'nerduniverse-2025' } = actualData;

        const poolMembersRef = admin.firestore().doc(`artifacts/nerdfootball/pools/${poolId}/metadata/members`);
        const poolMembersSnap = await poolMembersRef.get();

        if (!poolMembersSnap.exists) {
            throw new functions.https.HttpsError('not-found', `Pool ${poolId} not found`);
        }

        const poolMembers = poolMembersSnap.data();
        const members = [];
        const adminMembers = [];

        // Process pool members and extract email data
        for (const [uid, userData] of Object.entries(poolMembers)) {
            // Skip ghost user
            if (uid === 'okl4sw2aDhW3yKpOfOwe5lH7OQj1' || !userData || !userData.email) {
                continue;
            }

            const member = {
                uid: uid,
                email: userData.email,
                displayName: userData.displayName || 'Unknown',
                role: userData.role || 'member'
            };

            members.push(member);

            if (userData.role === 'admin') {
                adminMembers.push(member);
            }
        }

        return {
            success: true,
            poolId: poolId,
            totalMembers: members.length,
            adminCount: adminMembers.length,
            members: members,
            adminMembers: adminMembers
        };

    } catch (error) {
        console.error('Error getting pool members emails:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get pool members');
    }
});

// Pool Email System - Send emails to pool members
exports.sendPoolEmail = functions.https.onCall(async (data, context) => {
    // For Firebase Functions v2, auth context is in data.auth instead of context.auth
    const authContext = context.auth || data.auth;

    // Check if user is authenticated
    if (!authContext) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check if user is admin
    const ADMIN_UIDS = ['WxSPmEildJdqs6T5hIpBUZrscwt2', 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2'];
    const userUid = authContext.uid || authContext.token?.uid;

    if (!ADMIN_UIDS.includes(userUid)) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    try {
        const actualData = data.data || data;
        const {
            subject,
            body,
            recipients = 'all',
            poolId = 'nerduniverse-2025',
            specificUserIds = []
        } = actualData;

        if (!subject || !body) {
            throw new functions.https.HttpsError('invalid-argument', 'Subject and body are required');
        }

        if (subject.length > 200 || body.length > 5000) {
            throw new functions.https.HttpsError('invalid-argument', 'Subject or body too long');
        }

        // Setup email transport if not already done
        if (!transporter) {
            setupEmailTransport();
        }

        // Get pool members
        const poolMembersRef = admin.firestore().doc(`artifacts/nerdfootball/pools/${poolId}/metadata/members`);
        const poolMembersSnap = await poolMembersRef.get();

        if (!poolMembersSnap.exists) {
            throw new functions.https.HttpsError('not-found', `Pool ${poolId} not found`);
        }

        const poolMembers = poolMembersSnap.data();
        let targetRecipients = [];

        // Determine recipients based on selection
        for (const [uid, userData] of Object.entries(poolMembers)) {
            // Skip ghost user and invalid entries
            if (uid === 'okl4sw2aDhW3yKpOfOwe5lH7OQj1' || !userData || !userData.email) {
                continue;
            }

            let shouldInclude = false;

            if (recipients === 'all') {
                shouldInclude = true;
            } else if (recipients === 'admins' && userData.role === 'admin') {
                shouldInclude = true;
            } else if (recipients === 'specific' && specificUserIds.includes(uid)) {
                shouldInclude = true;
            }

            if (shouldInclude) {
                targetRecipients.push({
                    uid: uid,
                    email: userData.email,
                    displayName: userData.displayName || 'Nerd'
                });
            }
        }

        if (targetRecipients.length === 0) {
            throw new functions.https.HttpsError('invalid-argument', 'No valid recipients found');
        }

        const results = {
            successful: [],
            failed: []
        };

        // Send emails to each recipient
        for (const recipient of targetRecipients) {
            // Personalize email content
            const personalizedBody = body.replace(/{displayName}/g, recipient.displayName);

            const emailContent = `Dear ${recipient.displayName},

${personalizedBody}

Best regards,
Ållfåther Nerd

---
This message was sent from NerdFootball ${poolId} Pool
To manage your pool settings or contact an admin, visit: https://nerdfootball.web.app
Reply to: tonyweeg@gmail.com`;

            try {
                if (transporter) {
                    const gmailEmail = getGmailEmail();
                    const mailOptions = {
                        from: `NerdFootball Pool <${gmailEmail}>`,
                        to: recipient.email,
                        subject: subject,
                        text: emailContent,
                        replyTo: 'tonyweeg@gmail.com'
                    };

                    await transporter.sendMail(mailOptions);
                    results.successful.push({
                        email: recipient.email,
                        displayName: recipient.displayName
                    });
                    console.log(`Pool email sent successfully to ${recipient.email}`);
                } else {
                    // Log email when transport not available
                    console.log('=== POOL EMAIL LOG (No transport configured) ===');
                    console.log(`To: ${recipient.email} (${recipient.displayName})`);
                    console.log(`Subject: ${subject}`);
                    console.log(`Body:\n${emailContent}`);
                    console.log('==============================================');
                    results.successful.push({
                        email: recipient.email,
                        displayName: recipient.displayName
                    });
                }
            } catch (error) {
                console.error(`Failed to send pool email to ${recipient.email}:`, error);
                results.failed.push({
                    email: recipient.email,
                    displayName: recipient.displayName,
                    error: error.message
                });
            }
        }

        // Log email activity to Firestore
        const emailLogRef = admin.firestore().collection('pool_email_logs').doc();
        await emailLogRef.set({
            adminUid: userUid,
            poolId: poolId,
            subject: subject,
            body: body,
            recipientType: recipients,
            targetedRecipients: targetRecipients.length,
            successfulDeliveries: results.successful.length,
            failedDeliveries: results.failed.length,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: new Date().toISOString()
        });

        return {
            success: results.successful.length > 0,
            poolId: poolId,
            totalRecipients: targetRecipients.length,
            successfulDeliveries: results.successful.length,
            failedDeliveries: results.failed.length,
            successful: results.successful,
            failed: results.failed,
            emailServiceConfigured: !!transporter
        };

    } catch (error) {
        console.error('Error sending pool email:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to send pool email');
    }
});

// Import and export ML Prediction Manager functions
const {
    processGameOutcomes,
    recordPredictionOutcome,
    getMLPerformanceStats
} = require('./mlPredictionManager');

exports.processGameOutcomes = processGameOutcomes;
exports.recordPredictionOutcome = recordPredictionOutcome;
exports.getMLPerformanceStats = getMLPerformanceStats;

// SURVIVOR AUTO-UPDATE SYSTEM
const { processSurvivorUpdatesForCompletedGames } = require('./survivorAutoUpdate');
exports.processSurvivorUpdatesForCompletedGames = processSurvivorUpdatesForCompletedGames;

// DYNAMIC SURVIVOR CALCULATION LOGIC - Works for all weeks
async function calculateSurvivorEliminationsCore(poolId = 'nerduniverse-2025', isScheduled = false) {
    console.log('🏈 Starting survivor elimination calculation...');
    console.log(`📅 Pool: ${poolId}, Scheduled: ${isScheduled}`);

    // Dynamically load NFL results from Firebase for all available weeks
    const nflResults = {};
    const availableWeeks = [];

    // Check weeks 1-18 for available NFL results
    for (let week = 1; week <= 18; week++) {
        try {
            const weekDoc = await admin.firestore()
                .doc(`artifacts/nerdfootball/public/data/nerdfootball_results/${week}`)
                .get();

            if (weekDoc.exists()) {
                const weekData = weekDoc.data();
                const gameCount = Object.keys(weekData).length;

                if (gameCount > 0) {
                    availableWeeks.push(week);

                    // Extract winners and losers from Firebase data
                    const winners = [];
                    const losers = [];

                    Object.values(weekData).forEach(game => {
                        if (game.status === 'FINAL' && game.winner) {
                            winners.push(game.winner);

                            // Determine loser
                            const loser = game.winner === game.homeTeam ? game.awayTeam : game.homeTeam;
                            losers.push(loser);
                        }
                    });

                    nflResults[week] = { winners, losers };
                    console.log(`📊 Week ${week}: ${winners.length} games, ${winners.length} winners, ${losers.length} losers`);
                }
            }
        } catch (error) {
            console.log(`⚠️ Week ${week}: No NFL data available`);
        }
    }

    console.log(`🏈 Processing ${availableWeeks.length} weeks: ${availableWeeks.join(', ')}`);

    if (availableWeeks.length === 0) {
        throw new Error('No NFL results available for any week');
    }

    // Get pool members
    const poolMembersDoc = await admin.firestore()
        .doc(`artifacts/nerdfootball/pools/${poolId}/metadata/members`)
            .get();

    if (!poolMembersDoc.exists()) {
        throw new Error('Pool members not found');
    }

    const poolMembers = poolMembersDoc.data();
    console.log(`👥 Processing ${Object.keys(poolMembers).length} pool members`);

    // Dynamic eliminations structure for all weeks
    const eliminations = {
        byWeek: {}, // Will contain week1: [], week2: [], etc.
        alive: [],
        summary: {
            totalMembers: Object.keys(poolMembers).length,
            eliminationsByWeek: {},
            stillAlive: 0,
            lastUpdated: new Date().toISOString(),
            currentWeek: Math.max(...availableWeeks),
            availableWeeks: availableWeeks
        }
    };

    // Initialize elimination arrays for each available week
    availableWeeks.forEach(week => {
        eliminations.byWeek[`week${week}`] = [];
        eliminations.summary.eliminationsByWeek[week] = 0;
    });

    // Process each member
    for (const [userId, member] of Object.entries(poolMembers)) {
        try {
            console.log(`🔍 Processing ${member.displayName} (${userId})`);

            // Get member's survivor picks
            const picksDoc = await admin.firestore()
                .doc(`artifacts/nerdfootball/users/${userId}/survivor_picks/${poolId}`)
                .get();

            if (!picksDoc.exists()) {
                console.log(`  ⚠️ No survivor picks found for ${member.displayName}`);
                continue;
            }

            const picks = picksDoc.data();
            let isEliminated = false;
            let eliminatedWeek = null;
            let eliminatedBy = null;
            const memberPicks = {};

            // Check elimination for each available week in order
            for (const week of availableWeeks.sort((a, b) => a - b)) {
                const weekPick = picks[week.toString()]?.teamPicked || picks[week.toString()]?.team;
                memberPicks[`week${week}`] = weekPick;

                console.log(`  Week ${week} pick: ${weekPick || 'None'}`);

                if (weekPick && nflResults[week]?.losers.includes(weekPick)) {
                    // This member is eliminated
                    const eliminationData = {
                        userId: userId,
                        displayName: member.displayName,
                        eliminatedBy: weekPick,
                        week: week,
                        reason: `Picked ${weekPick} who lost in Week ${week}`,
                        eliminatedAt: new Date().toISOString(),
                        picks: memberPicks
                    };

                    eliminations.byWeek[`week${week}`].push(eliminationData);
                    eliminations.summary.eliminationsByWeek[week]++;

                    console.log(`  💀 ELIMINATED Week ${week} (picked ${weekPick})`);

                    isEliminated = true;
                    eliminatedWeek = week;
                    eliminatedBy = weekPick;
                    break; // Stop checking further weeks
                }
            }

            if (!isEliminated) {
                // Still alive
                const survivorData = {
                    userId: userId,
                    displayName: member.displayName,
                    picks: memberPicks,
                    weeksAlive: availableWeeks.length,
                    status: 'ALIVE',
                    lastPickWeek: Math.max(...availableWeeks.filter(week => memberPicks[`week${week}`]))
                };

                eliminations.alive.push(survivorData);
                eliminations.summary.stillAlive++;

                const picksList = availableWeeks.map(week => `W${week}: ${memberPicks[`week${week}`] || 'None'}`).join(', ');
                console.log(`  ✅ ALIVE (${picksList})`);
            }

        } catch (error) {
            console.error(`❌ Error processing ${member.displayName}:`, error);
        }
    }

    // Add NFL results for reference
    eliminations.nflResults = nflResults;

    // Store results in Firebase
    const resultsPath = `artifacts/nerdfootball/pools/${poolId}/survivor_results`;
    await admin.firestore().doc(resultsPath).set(eliminations);

    console.log('📊 SURVIVOR ELIMINATION SUMMARY:');
    availableWeeks.forEach(week => {
        const count = eliminations.summary.eliminationsByWeek[week];
        console.log(`  💀 Week ${week} Eliminations: ${count}`);
    });
    console.log(`  ✅ Still Alive: ${eliminations.summary.stillAlive}`);
    console.log(`  📄 Results stored at: ${resultsPath}`);

    return {
        success: true,
        poolId: poolId,
        summary: eliminations.summary,
        resultsPath: resultsPath,
        availableWeeks: availableWeeks,
        eliminations: eliminations
    };
}

// Manual callable function for admin use
exports.calculateSurvivorEliminations = functions.https.onCall(async (data, context) => {
    try {
        // For Firebase Functions v2, auth context is in data.auth instead of context.auth
        const authContext = context.auth || data.auth;

        // Check if user is authenticated
        if (!authContext) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        // Check if user is admin
        const ADMIN_UIDS = ['WxSPmEildJdqs6T5hIpBUZrscwt2', 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2'];
        const userUid = authContext.uid || authContext.token?.uid;

        if (!ADMIN_UIDS.includes(userUid)) {
            throw new functions.https.HttpsError('permission-denied', 'Admin access required');
        }

        const poolId = data.poolId || 'nerduniverse-2025';
        return await calculateSurvivorEliminationsCore(poolId, false);

    } catch (error) {
        console.error('❌ Manual survivor elimination calculation failed:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to calculate survivor eliminations');
    }
});

// Scheduled function - runs every Tuesday at midnight
exports.scheduledSurvivorCalculation = onSchedule('0 0 * * 2', async (event) => {
    try {
        console.log('🕛 SCHEDULED: Tuesday midnight survivor calculation starting...');

        const poolId = 'nerduniverse-2025';
        const result = await calculateSurvivorEliminationsCore(poolId, true);

        console.log('✅ SCHEDULED: Survivor calculation completed successfully');
        console.log(`📊 Results: ${result.summary.stillAlive} alive, ${Object.values(result.summary.eliminationsByWeek).reduce((a, b) => a + b, 0)} total eliminations`);

        return null;

    } catch (error) {
        console.error('❌ SCHEDULED: Survivor calculation failed:', error);

        // Could send notification to admins here
        const ADMIN_UIDS = ['WxSPmEildJdqs6T5hIpBUZrscwt2', 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2'];
        // TODO: Add admin notification on failure

        return null;
    }
});

// TODO: PHAROAH'S REAL-TIME SYNC functions - temporarily disabled for testing
// TESTING: Temporarily enabled for real-time sync testing
const {
    syncGameScores,
    syncLeaderboard,
    testRealTimeSync
} = require('./realtimeGameSync');
exports.syncGameScores = syncGameScores;
exports.syncLeaderboard = syncLeaderboard;
exports.testRealTimeSync = testRealTimeSync;

// ============================================
// 🤖 AUTOMATED GAME COMPLETION SYSTEM
// Runs every 5 minutes during NFL game days
// ============================================

/**
 * 🚀 AUTOMATED GAME COMPLETION ORCHESTRATOR
 * Scheduled function that automatically:
 * 1. Syncs scores from ESPN (detects FINAL games)
 * 2. Eliminates survivor pool users
 * 3. Updates leaderboards
 * 4. Only runs during NFL game days (Thu-Mon, Sept-Feb)
 */
exports.autoGameCompletion = onSchedule('every 5 minutes', async (event) => {
    console.log('🤖 AUTO GAME COMPLETION: Starting automated check...');

    try {
        // Check if we should run (NFL season and game day)
        if (!isNFLGameDay()) {
            console.log('📅 Not an NFL game day - skipping automation');
            return null;
        }

        console.log('🏈 NFL game day detected - running automation...');

        const results = {
            timestamp: new Date().toISOString(),
            syncResults: null,
            survivorResults: null,
            leaderboardResults: null,
            errors: []
        };

        // Step 1: Sync game scores from ESPN (this detects FINAL games)
        try {
            console.log('⚡ Step 1: Syncing game scores from ESPN...');
            const syncResponse = await fetch(`https://us-central1-nerdfootball.cloudfunctions.net/syncGameScores`);
            const syncData = await syncResponse.json();
            results.syncResults = syncData;

            if (syncData.success && syncData.significantUpdates > 0) {
                console.log(`✅ Found ${syncData.significantUpdates} game updates - proceeding with survivor/leaderboard updates`);

                // Step 2: Process survivor eliminations for completed games
                try {
                    console.log('💀 Step 2: Processing survivor eliminations...');
                    const survivorResponse = await fetch(`https://us-central1-nerdfootball.cloudfunctions.net/processSurvivorUpdatesForCompletedGames`);
                    const survivorData = await survivorResponse.json();
                    results.survivorResults = survivorData;
                    console.log(`✅ Survivor processing: ${survivorData.usersEliminated || 0} eliminated, ${survivorData.usersAdvanced || 0} advanced`);
                } catch (survivorError) {
                    console.error('❌ Survivor processing failed:', survivorError);
                    results.errors.push(`Survivor: ${survivorError.message}`);
                }

                // Step 3: Process weekly scoring for completed games
                try {
                    console.log('🏆 Step 3: Processing weekly scoring...');
                    const scoringResponse = await fetch(`https://us-central1-nerdfootball.cloudfunctions.net/processWeeklyScoring`);
                    const scoringData = await scoringResponse.json();
                    results.scoringResults = scoringData;
                    console.log(`✅ Weekly scoring: ${scoringData.usersProcessed || 0} users processed, ${scoringData.completedGames || 0} completed games`);
                } catch (scoringError) {
                    console.error('❌ Weekly scoring failed:', scoringError);
                    results.errors.push(`Weekly Scoring: ${scoringError.message}`);
                }

                // Step 4: Update leaderboards
                try {
                    console.log('🏆 Step 4: Updating leaderboards...');
                    const leaderboardResponse = await fetch(`https://us-central1-nerdfootball.cloudfunctions.net/syncLeaderboard`);
                    const leaderboardData = await leaderboardResponse.json();
                    results.leaderboardResults = leaderboardData;
                    console.log('✅ Leaderboard sync completed');
                } catch (leaderboardError) {
                    console.error('❌ Leaderboard sync failed:', leaderboardError);
                    results.errors.push(`Leaderboard: ${leaderboardError.message}`);
                }

            } else {
                console.log('📊 No significant game updates - skipping survivor/leaderboard/scoring updates');
            }

        } catch (syncError) {
            console.error('❌ ESPN sync failed:', syncError);
            results.errors.push(`ESPN Sync: ${syncError.message}`);
        }

        // Log final results
        console.log('🤖 AUTO GAME COMPLETION: Results summary:');
        console.log(`   📊 Games synced: ${results.syncResults?.gamesSync || 0}`);
        console.log(`   🔄 Significant updates: ${results.syncResults?.significantUpdates || 0}`);
        console.log(`   💀 Users eliminated: ${results.survivorResults?.usersEliminated || 0}`);
        console.log(`   ✅ Users advanced: ${results.survivorResults?.usersAdvanced || 0}`);
        console.log(`   🏆 Users scored: ${results.scoringResults?.usersProcessed || 0}`);
        console.log(`   🎯 Completed games: ${results.scoringResults?.completedGames || 0}`);
        console.log(`   ❌ Errors: ${results.errors.length}`);

        if (results.errors.length > 0) {
            console.error('⚠️  Automation completed with errors:', results.errors);
        } else {
            console.log('✅ Automation completed successfully');
        }

        return results;

    } catch (error) {
        console.error('💥 CRITICAL: Auto game completion failed:', error);
        return { error: error.message, timestamp: new Date().toISOString() };
    }
});

/**
 * Helper function to determine if today is an NFL game day
 * Games typically run Thu-Mon during NFL season (Sept-Feb)
 */
function isNFLGameDay() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

    // NFL season months: September (9) through February (2)
    const isNFLSeason = month >= 9 || month <= 2;

    // NFL game days: Thursday (4) through Monday (1)
    // Sunday (0), Monday (1), Thursday (4), Friday (5), Saturday (6)
    const isGameDay = dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek >= 4;

    const result = isNFLSeason && isGameDay;

    console.log(`📅 NFL Game Day Check: Month=${month}, Day=${dayOfWeek}, Season=${isNFLSeason}, GameDay=${isGameDay}, Result=${result}`);

    return result;
}

// Export helper for testing
exports.isNFLGameDay = isNFLGameDay;

// Import and export weekly leaderboard cache functions
const {
    generateWeeklyLeaderboardCache,
    getWeeklyLeaderboard
} = require('./weeklyLeaderboardCache');

exports.generateWeeklyLeaderboardCache = generateWeeklyLeaderboardCache;
exports.getWeeklyLeaderboard = getWeeklyLeaderboard;

// Import and export season leaderboard cache functions
const {
    generateSeasonLeaderboardCache,
    getSeasonLeaderboard
} = require('./seasonLeaderboardCache');

exports.generateSeasonLeaderboardCache = generateSeasonLeaderboardCache;
exports.getSeasonLeaderboard = getSeasonLeaderboard;

// Import and export survivor pool cache functions
const {
    getSurvivorPoolData
} = require('./survivorPoolCache');

exports.getSurvivorPoolData = getSurvivorPoolData;

// Import and export Week 3 data fix function
const {
    fixWeek3Data
} = require('./fixWeek3Data');

exports.fixWeek3Data = fixWeek3Data;

// Import and export weeks data verification function
const {
    verifyWeeksData
} = require('./verifyWeeksData');

exports.verifyWeeksData = verifyWeeksData;

// Import and export weeks data diagnostic function
const {
    diagnosticWeeksData
} = require('./diagnosticWeeksData');

exports.diagnosticWeeksData = diagnosticWeeksData;

// Import and export ESPN score monitor functions
const {
    updateScores,
    updateScoresCallable,
    scheduledScoreUpdate,
    monitorESPNScores
} = require('./espnScoreMonitor');

exports.updateScores = updateScores;
exports.updateScoresCallable = updateScoresCallable;
exports.scheduledScoreUpdate = scheduledScoreUpdate;
exports.monitorESPNScores = monitorESPNScores;

// Import and export Week 4 games cleanup function
const {
    cleanWeek4Games
} = require('./cleanWeek4Games');

exports.cleanWeek4Games = cleanWeek4Games;

// Import and export live scores update function
const {
    updateLiveScores
} = require('./updateLiveScores');

exports.updateLiveScores = updateLiveScores;

// Import and export force update function
const {
    forceUpdateGame401
} = require('./forceUpdateGame401');

exports.forceUpdateGame401 = forceUpdateGame401;

// Import and export weekly scoring function (JUST RUN WEEK 4)
const {
    processWeeklyScoring
} = require('./justRunWeek4');

exports.processWeeklyScoring = processWeeklyScoring;

// ============================================
// ADMIN AUTHENTICATION SYSTEM
// ============================================

// Import admin auth functions
const { generateAdminToken, generateAdminTokenHTTP } = require('./adminAuth');

// Export admin authentication functions
exports.generateAdminToken = generateAdminToken;
exports.generateAdminTokenHTTP = generateAdminTokenHTTP;