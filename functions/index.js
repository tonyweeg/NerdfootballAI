const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

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
        // Check for Gmail configuration in environment variables (Functions v2)
        const gmailEmail = process.env.GMAIL_EMAIL;
        const gmailPassword = process.env.GMAIL_PASSWORD;
        
        if (gmailEmail && gmailPassword) {
            transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: gmailEmail,
                    pass: gmailPassword
                }
            });
            console.log('Email transport configured successfully');
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
                const gmailEmail = process.env.GMAIL_EMAIL;
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
            const gmailEmail = process.env.GMAIL_EMAIL;
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
    espnApiStatus,
    fetchLiveGameDetails,
    testLiveGameDetails
} = require('./espnNerdApi');

exports.fetchCurrentWeekGames = fetchCurrentWeekGames;
exports.fetchGamesByDate = fetchGamesByDate;
exports.fetchNflTeams = fetchNflTeams;
exports.fetchSeasonSchedule = fetchSeasonSchedule;
exports.espnApiStatus = espnApiStatus;
exports.fetchLiveGameDetails = fetchLiveGameDetails;
exports.testLiveGameDetails = testLiveGameDetails;

// Import and export contact form functions
const {
    submitContactForm,
    getContactSubmissions
} = require('./contactHandler');

exports.submitContactForm = submitContactForm;
exports.getContactSubmissions = getContactSubmissions;

// Emergency cache clear functions for live games
const {
    clearESPNCache,
    forceFreshESPNData
} = require('./emergencyCacheClear');

exports.clearESPNCache = clearESPNCache;
exports.forceFreshESPNData = forceFreshESPNData;

// === SURVIVOR ELIMINATION BUG FIX FUNCTIONS ===

// Analyze and fix survivor elimination status issues
exports.analyzeSurvivorEliminations = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check if user is admin
    const ADMIN_UIDS = ['WxSPmEildJdqs6T5hIpBUZrscwt2', 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2'];
    const userUid = context.auth.uid;

    if (!ADMIN_UIDS.includes(userUid)) {
        throw new functions.https.HttpsError('permission-denied', 'User must be an admin');
    }

    try {
        const db = admin.firestore();
        const results = {
            poolMembers: [],
            issues: [],
            validUsers: [],
            analysis: {}
        };

        console.log('🔍 Starting survivor elimination analysis...');

        // Step 1: Get pool members
        const poolMembersRef = db.doc('artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members');
        const poolDoc = await poolMembersRef.get();

        if (!poolDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Pool members document not found');
        }

        const poolData = poolDoc.data();
        let userIds = [];

        if (poolData.users) {
            userIds = Object.keys(poolData.users);
            results.poolMembers = userIds;
        } else {
            throw new functions.https.HttpsError('internal', 'Could not find users in pool data');
        }

        console.log(`✅ Found ${userIds.length} pool members`);

        // Step 2: Analyze each user's survivor status
        for (const userId of userIds) {
            try {
                const userRef = db.doc(`artifacts/nerdfootball/public/data/nerd_survivor/${userId}`);
                const userDoc = await userRef.get();

                if (!userDoc.exists) {
                    console.log(`⚠️ No survivor data for user: ${userId}`);
                    continue;
                }

                const userData = userDoc.data();
                const eliminated = userData.eliminated || false;
                const eliminatedWeek = userData.eliminatedWeek || null;
                const hasValidPicks = userData.picks && Object.keys(userData.picks).length > 0;

                const userStatus = {
                    userId,
                    eliminated,
                    eliminatedWeek,
                    hasValidPicks
                };

                // Identify issues
                if (eliminated && !eliminatedWeek) {
                    results.issues.push({
                        ...userStatus,
                        issue: 'ELIMINATED_WITHOUT_WEEK',
                        severity: 'HIGH',
                        description: 'User marked as eliminated but no elimination week specified'
                    });
                    console.log(`🚨 ISSUE: ${userId} - Eliminated without week`);
                } else if (eliminated && eliminatedWeek) {
                    console.log(`✅ ${userId} - Eliminated in week ${eliminatedWeek} (may be correct)`);
                    results.validUsers.push(userStatus);
                } else {
                    console.log(`✅ ${userId} - Status appears correct`);
                    results.validUsers.push(userStatus);
                }

            } catch (error) {
                console.error(`❌ Error processing user ${userId}:`, error.message);
                results.issues.push({
                    userId,
                    issue: 'PROCESSING_ERROR',
                    severity: 'MEDIUM',
                    description: `Error processing user data: ${error.message}`
                });
            }
        }

        // Step 3: Generate analysis summary
        results.analysis = {
            totalUsers: userIds.length,
            usersWithIssues: results.issues.length,
            validUsers: results.validUsers.length,
            issueBreakdown: {
                eliminatedWithoutWeek: results.issues.filter(i => i.issue === 'ELIMINATED_WITHOUT_WEEK').length,
                processingErrors: results.issues.filter(i => i.issue === 'PROCESSING_ERROR').length
            }
        };

        console.log('📊 Analysis complete:', results.analysis);

        return {
            success: true,
            ...results,
            timestamp: new Date().toISOString(),
            analyzedBy: userUid
        };

    } catch (error) {
        console.error('❌ Survivor elimination analysis failed:', error);
        throw new functions.https.HttpsError('internal', `Analysis failed: ${error.message}`);
    }
});

// Fix survivor elimination status issues
exports.fixSurvivorEliminations = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check if user is admin
    const ADMIN_UIDS = ['WxSPmEildJdqs6T5hIpBUZrscwt2', 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2'];
    const userUid = context.auth.uid;

    if (!ADMIN_UIDS.includes(userUid)) {
        throw new functions.https.HttpsError('permission-denied', 'User must be an admin');
    }

    const { userIds, fixType = 'auto' } = data;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Must provide array of user IDs to fix');
    }

    try {
        const db = admin.firestore();
        const results = {
            successful: [],
            failed: [],
            operations: []
        };

        console.log(`🔧 Starting survivor elimination fixes for ${userIds.length} users...`);

        // Process each user
        for (const userId of userIds) {
            try {
                const userRef = db.doc(`artifacts/nerdfootball/public/data/nerd_survivor/${userId}`);
                const userDoc = await userRef.get();

                if (!userDoc.exists) {
                    results.failed.push({
                        userId,
                        error: 'User document not found'
                    });
                    continue;
                }

                const userData = userDoc.data();
                const eliminated = userData.eliminated || false;
                const eliminatedWeek = userData.eliminatedWeek || null;

                // Determine fix action
                let fixAction = null;
                let updateData = {};

                if (eliminated && !eliminatedWeek) {
                    if (fixType === 'auto' || fixType === 'clear_elimination') {
                        // Fix: Set eliminated to false since no elimination week
                        fixAction = 'CLEAR_ELIMINATION';
                        updateData = { eliminated: false };
                    }
                }

                if (fixAction) {
                    // Apply the fix
                    await userRef.update(updateData);

                    results.successful.push({
                        userId,
                        action: fixAction,
                        updateData,
                        previousState: {
                            eliminated: userData.eliminated,
                            eliminatedWeek: userData.eliminatedWeek
                        }
                    });

                    results.operations.push({
                        userId,
                        operation: 'UPDATE',
                        path: `artifacts/nerdfootball/public/data/nerd_survivor/${userId}`,
                        data: updateData,
                        timestamp: new Date().toISOString()
                    });

                    console.log(`✅ Fixed ${userId}: ${fixAction}`);
                } else {
                    results.failed.push({
                        userId,
                        error: 'No fix action determined for this user'
                    });
                }

            } catch (error) {
                console.error(`❌ Failed to fix user ${userId}:`, error.message);
                results.failed.push({
                    userId,
                    error: error.message
                });
            }
        }

        console.log(`🎉 Fix operation complete: ${results.successful.length} successful, ${results.failed.length} failed`);

        return {
            success: true,
            successCount: results.successful.length,
            failureCount: results.failed.length,
            successful: results.successful,
            failed: results.failed,
            operations: results.operations,
            timestamp: new Date().toISOString(),
            fixedBy: userUid
        };

    } catch (error) {
        console.error('❌ Survivor elimination fix failed:', error);
        throw new functions.https.HttpsError('internal', `Fix operation failed: ${error.message}`);
    }
});

// TODO: PHAROAH'S REAL-TIME SYNC functions - temporarily disabled for testing
// Will be enabled once client-side integration is verified
// const {
//     syncGameScores,
//     syncLeaderboard,
//     testRealTimeSync
// } = require('./realtimeGameSync');
// exports.syncGameScores = syncGameScores;
// exports.syncLeaderboard = syncLeaderboard;
// exports.testRealTimeSync = testRealTimeSync;