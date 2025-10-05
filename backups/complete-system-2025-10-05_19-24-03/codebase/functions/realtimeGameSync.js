/**
 * PHAROAH'S REALTIME GAME SYNC FUNCTION
 * Firebase Function for syncing game scores and leaderboard updates to RTDB
 * Diamond-level real-time architecture for NerdFootball
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const rtdb = admin.database();

// Email transporter setup
let transporter = null;
const setupEmailTransport = () => {
    try {
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
            console.log('Email transport configured for ESPN updates');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Email transport setup failed:', error);
        return false;
    }
};

// Send ESPN update notification email
async function sendESPNUpdateEmail(gameUpdates, week) {
    if (!transporter) {
        setupEmailTransport();
    }

    const updateCount = Object.keys(gameUpdates).length;
    if (updateCount === 0) return;

    // Build email content
    let emailBody = `ESPN Game Updates - Week ${week}\n`;
    emailBody += `=`.repeat(50) + '\n\n';
    emailBody += `${updateCount} game(s) updated:\n\n`;

    Object.values(gameUpdates).forEach((game, index) => {
        emailBody += `${index + 1}. ${game.awayTeam} @ ${game.homeTeam}\n`;
        emailBody += `   Score: ${game.awayTeam} ${game.awayScore} - ${game.homeScore} ${game.homeTeam}\n`;
        emailBody += `   Status: ${game.status}\n`;
        emailBody += `   Game ID: ${game.gameId}\n\n`;
    });

    emailBody += `Timestamp: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET\n`;

    const mailOptions = {
        from: `NerdFootball ESPN Monitor <${process.env.GMAIL_EMAIL}>`,
        to: 'tonyweeg@gmail.com',
        subject: `🏈 ESPN Update: ${updateCount} Game${updateCount > 1 ? 's' : ''} Updated - Week ${week}`,
        text: emailBody,
        replyTo: 'tonyweeg@gmail.com'
    };

    try {
        if (transporter) {
            await transporter.sendMail(mailOptions);
            console.log(`✅ ESPN update email sent to tonyweeg@gmail.com (${updateCount} updates)`);
        } else {
            console.log('=== ESPN UPDATE EMAIL LOG ===');
            console.log(emailBody);
            console.log('==============================');
        }
    } catch (error) {
        console.error('❌ Failed to send ESPN update email:', error);
    }
}

/**
 * Sync game scores from ESPN to Realtime Database
 * Triggered by HTTP request or scheduled function
 */
exports.syncGameScores = functions.https.onRequest(async (req, res) => {
        // 🚨 CORS FIX: Add CORS headers for web app access
        res.set('Access-Control-Allow-Origin', 'https://nerdfootball.web.app');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // Handle preflight OPTIONS request
        if (req.method === 'OPTIONS') {
            res.status(200).send();
            return;
        }

        console.log('🏈 Starting real-time game scores sync...');

        try {
            // Get current NFL week
            const currentWeek = getCurrentNflWeek();
            const year = 2025;
            
            // Fetch game scores from ESPN API
            const espnUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${year}&seasontype=2&week=${currentWeek}`;
            
            const espnResponse = await fetch(espnUrl);
            const espnData = await espnResponse.json();
            
            if (!espnData.events || espnData.events.length === 0) {
                console.log('No games found for current week');
                res.status(200).json({ success: true, message: 'No games to sync' });
                return;
            }
            
            const liveScores = {};
            const gameUpdates = {};
            
            // Process each game
            for (const event of espnData.events) {
                const gameId = event.id;
                const competition = event.competitions[0];
                
                if (!competition) continue;
                
                const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
                const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
                
                if (!homeTeam || !awayTeam) continue;
                
                const gameData = {
                    gameId: gameId,
                    homeTeam: homeTeam.team.displayName,  // Use raw ESPN name for Firestore matching
                    awayTeam: awayTeam.team.displayName,  // Use raw ESPN name for Firestore matching
                    homeScore: parseInt(homeTeam.score) || 0,
                    awayScore: parseInt(awayTeam.score) || 0,
                    status: getGameStatus(competition.status),
                    lastUpdated: admin.database.ServerValue.TIMESTAMP,
                    week: currentWeek,
                    year: year
                };
                
                liveScores[gameId] = gameData;
                
                // Check if this is a significant update (score change or status change)
                const existingGame = await rtdb.ref(`nfl/games/${year}/week-${currentWeek}/live/${gameId}`).once('value');
                const existing = existingGame.val();
                
                if (!existing || 
                    existing.homeScore !== gameData.homeScore ||
                    existing.awayScore !== gameData.awayScore ||
                    existing.status !== gameData.status) {
                    
                    gameUpdates[gameId] = gameData;
                    console.log(`📊 Game update: ${gameData.awayTeam} @ ${gameData.homeTeam} - ${gameData.awayScore}-${gameData.homeScore} (${gameData.status})`);
                }
            }
            
            // Batch update to RTDB
            const updates = {};
            updates[`nfl/games/${year}/week-${currentWeek}/live`] = liveScores;
            updates[`nfl/games/${year}/week-${currentWeek}/lastSync`] = admin.database.ServerValue.TIMESTAMP;

            await rtdb.ref().update(updates);

            // 🔥 CRITICAL FIX: Also update Firestore bible data (Grid reads from here!)
            // Update ALL live scores in Firestore, not just "significant updates"
            if (Object.keys(liveScores).length > 0) {
                console.log(`📝 Updating Firestore bible data for ${Object.keys(liveScores).length} games`);

                const biblePath = `artifacts/nerdfootball/public/data/nerdfootball_games/${currentWeek}`;
                const bibleRef = db.doc(biblePath);
                const bibleSnap = await bibleRef.get();

                if (bibleSnap.exists) {
                    const bibleData = bibleSnap.data();
                    const bibleUpdates = {};

                    // Map ESPN game IDs to bible game IDs and update status/scores
                    Object.entries(liveScores).forEach(([espnId, gameData]) => {
                        // Find matching game in bible by team names
                        const matchingGameId = Object.keys(bibleData).find(id => {
                            const game = bibleData[id];
                            return game.h === gameData.homeTeam && game.a === gameData.awayTeam;
                        });

                        if (matchingGameId) {
                            bibleUpdates[`${matchingGameId}.status`] = gameData.status;
                            bibleUpdates[`${matchingGameId}.homeScore`] = gameData.homeScore;
                            bibleUpdates[`${matchingGameId}.awayScore`] = gameData.awayScore;
                            bibleUpdates[`${matchingGameId}.lastUpdated`] = new Date().toISOString();

                            // Set winner if game is final
                            if (gameData.status === 'final') {
                                const winner = gameData.homeScore > gameData.awayScore ?
                                    gameData.homeTeam : gameData.awayTeam;
                                bibleUpdates[`${matchingGameId}.winner`] = winner;
                            }

                            console.log(`✅ Updating bible game ${matchingGameId}: ${gameData.status}`);
                        } else {
                            console.log(`❌ No matching bible game found for ${gameData.awayTeam} @ ${gameData.homeTeam}`);
                        }
                    });

                    if (Object.keys(bibleUpdates).length > 0) {
                        await bibleRef.update(bibleUpdates);
                        console.log(`✅ Updated ${Object.keys(bibleUpdates).length} fields in Firestore bible data`);
                    }
                }
            }

            // If there are significant updates, trigger leaderboard recalculation
            if (Object.keys(gameUpdates).length > 0) {
                console.log(`🚀 Triggering leaderboard update for ${Object.keys(gameUpdates).length} game changes`);
                await syncLeaderboardToRTDB(currentWeek);

                // Send email notification for ESPN updates
                await sendESPNUpdateEmail(gameUpdates, currentWeek);
            }

            console.log(`✅ Synced ${Object.keys(liveScores).length} games to RTDB`);
            res.status(200).json({
                success: true,
                gamesSync: Object.keys(liveScores).length,
                significantUpdates: Object.keys(gameUpdates).length,
                week: currentWeek
            });
            
        } catch (error) {
            console.error('❌ Game scores sync failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

/**
 * Sync leaderboard data to Realtime Database
 * Called internally or via HTTP trigger
 */
exports.syncLeaderboard = functions.https.onRequest(async (req, res) => {
        console.log('🏆 Starting leaderboard sync to RTDB...');
        
        try {
            const week = req.query.week ? parseInt(req.query.week) : null;
            const poolId = req.query.poolId || 'nerduniverse-2025';
            
            const result = await syncLeaderboardToRTDB(week, poolId);
            
            res.status(200).json(result);
            
        } catch (error) {
            console.error('❌ Leaderboard sync failed:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

/**
 * Real-time leaderboard sync function (internal)
 */
async function syncLeaderboardToRTDB(weekNumber = null, poolId = 'nerduniverse-2025') {
    console.log(`📊 Syncing leaderboard to RTDB for ${weekNumber ? `week ${weekNumber}` : 'season'}`);
    
    try {
        // Get leaderboard data from Firestore
        const leaderboardData = await calculateLeaderboardFromFirestore(weekNumber, poolId);
        
        if (!leaderboardData || leaderboardData.length === 0) {
            console.log('No leaderboard data to sync');
            return { success: true, message: 'No data to sync', userCount: 0 };
        }
        
        // Transform for RTDB format
        const rtdbLeaderboard = {};
        leaderboardData.forEach((user, index) => {
            rtdbLeaderboard[user.userId] = {
                displayName: user.displayName,
                totalScore: user.totalScore || user.score || 0,
                position: index + 1,
                weeklyScores: user.weeklyScores || {},
                mnfPoints: user.mnfPoints || 0,
                lastUpdated: admin.database.ServerValue.TIMESTAMP
            };
        });
        
        // Update RTDB
        const updatePath = weekNumber 
            ? `pools/${poolId}/leaderboard/week-${weekNumber}/live`
            : `pools/${poolId}/leaderboard/season/live`;
            
        await rtdb.ref(updatePath).set(rtdbLeaderboard);
        
        // Also update the general live leaderboard path
        await rtdb.ref(`pools/${poolId}/leaderboard/live`).set(rtdbLeaderboard);
        
        console.log(`✅ Leaderboard synced to RTDB: ${leaderboardData.length} users`);
        
        return {
            success: true,
            userCount: leaderboardData.length,
            week: weekNumber,
            poolId: poolId
        };
        
    } catch (error) {
        console.error('❌ Leaderboard RTDB sync failed:', error);
        throw error;
    }
}

/**
 * Calculate leaderboard from Firestore data
 */
async function calculateLeaderboardFromFirestore(weekNumber = null, poolId = 'nerduniverse-2025') {
    try {
        // Get pool members
        const poolMembersRef = db.doc(`artifacts/nerdfootball/pools/${poolId}/metadata/members`);
        const poolMembersSnap = await poolMembersRef.get();
        
        if (!poolMembersSnap.exists) {
            throw new Error(`Pool ${poolId} not found`);
        }
        
        const poolMembers = poolMembersSnap.data();
        const memberUserIds = Object.keys(poolMembers);
        
        console.log(`📊 Calculating leaderboard for ${memberUserIds.length} pool members`);
        
        const userScores = [];
        
        for (const userId of memberUserIds) {
            const userData = poolMembers[userId];
            
            if (weekNumber) {
                // Calculate weekly score
                const weeklyScore = await calculateWeeklyScoreForUser(userId, weekNumber);
                userScores.push({
                    userId: userId,
                    displayName: userData.displayName || userData.name || `User ${userId.substring(0, 8)}`,
                    score: weeklyScore.totalScore || 0,
                    totalScore: weeklyScore.totalScore || 0,
                    mnfPoints: weeklyScore.mnfPoints || 0
                });
            } else {
                // Calculate season score
                const seasonScore = await calculateSeasonScoreForUser(userId);
                userScores.push({
                    userId: userId,
                    displayName: userData.displayName || userData.name || `User ${userId.substring(0, 8)}`,
                    score: seasonScore.totalScore || 0,
                    totalScore: seasonScore.totalScore || 0,
                    weeklyScores: seasonScore.weeklyScores || {}
                });
            }
        }
        
        // Sort by total score (descending)
        userScores.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
        
        return userScores;
        
    } catch (error) {
        console.error('❌ Error calculating leaderboard from Firestore:', error);
        throw error;
    }
}

/**
 * Calculate weekly score for a specific user
 */
async function calculateWeeklyScoreForUser(userId, weekNumber) {
    try {
        // Get user's picks for the week
        const picksRef = db.doc(`artifacts/nerdfootball/users/${userId}/picks/2025/weeks/week-${weekNumber}/picks`);
        const picksSnap = await picksRef.get();
        
        if (!picksSnap.exists) {
            return { totalScore: 0, mnfPoints: 0 };
        }
        
        const picks = picksSnap.data();
        
        // Get game results for the week
        const resultsRef = db.doc(`artifacts/nerdfootball/weeks/week-${weekNumber}/results`);
        const resultsSnap = await resultsRef.get();
        
        if (!resultsSnap.exists) {
            return { totalScore: 0, mnfPoints: 0 };
        }
        
        const results = resultsSnap.data();
        let totalScore = 0;
        let mnfPoints = 0;
        
        // Calculate score for each pick
        Object.keys(picks).forEach(gameId => {
            const pick = picks[gameId];
            const result = results[gameId];
            
            if (result && result.winner && pick.team === result.winner) {
                const confidence = parseInt(pick.confidence) || 1;
                totalScore += confidence;
                
                // Check if this is Monday Night Football
                if (result.isMondayNight) {
                    mnfPoints += confidence;
                }
            }
        });
        
        return { totalScore, mnfPoints };
        
    } catch (error) {
        console.error(`❌ Error calculating weekly score for user ${userId}:`, error);
        return { totalScore: 0, mnfPoints: 0 };
    }
}

/**
 * Calculate season score for a specific user
 */
async function calculateSeasonScoreForUser(userId) {
    try {
        const currentWeek = getCurrentNflWeek();
        let totalScore = 0;
        const weeklyScores = {};
        
        // Calculate score for each completed week
        for (let week = 1; week <= currentWeek; week++) {
            const weekScore = await calculateWeeklyScoreForUser(userId, week);
            weeklyScores[week] = weekScore.totalScore;
            totalScore += weekScore.totalScore;
        }
        
        return { totalScore, weeklyScores };
        
    } catch (error) {
        console.error(`❌ Error calculating season score for user ${userId}:`, error);
        return { totalScore: 0, weeklyScores: {} };
    }
}

/**
 * Helper functions
 */
function getCurrentNflWeek() {
    // NFL 2025 season starts September 4, 2025
    const seasonStart = new Date('2025-09-04T00:00:00Z');
    const now = new Date();
    const diffTime = now.getTime() - seasonStart.getTime();
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    // Clamp to valid range (1-18)
    return Math.max(1, Math.min(18, diffWeeks));
}

function normalizeTeamName(teamName) {
    // Normalize team names for consistency
    const nameMap = {
        'New England Patriots': 'NE Patriots',
        'New York Giants': 'NY Giants',
        'New York Jets': 'NY Jets',
        'Tampa Bay Buccaneers': 'TB Buccaneers',
        'Green Bay Packers': 'GB Packers',
        'Kansas City Chiefs': 'KC Chiefs',
        'Los Angeles Rams': 'LA Rams',
        'Los Angeles Chargers': 'LA Chargers',
        'Las Vegas Raiders': 'LV Raiders',
        'San Francisco 49ers': 'SF 49ers'
    };
    
    return nameMap[teamName] || teamName;
}

function getGameStatus(espnStatus) {
    if (!espnStatus) return 'scheduled';

    const statusType = espnStatus.type;

    if (statusType.name === 'STATUS_FINAL') {
        return 'final';
    } else if (statusType.name === 'STATUS_IN_PROGRESS') {
        return 'in_progress';
    } else if (statusType.name === 'STATUS_HALFTIME') {
        return 'in_progress';
    } else if (statusType.name === 'STATUS_END_OF_PERIOD') {
        return 'in_progress';
    } else {
        return espnStatus.type.description || 'Not Started';
    }
}

/**
 * Scheduled function to sync game scores every 2 minutes during game days
 * TODO: Enable when scheduler is supported
 */
/*
exports.scheduledGameSync = functions.pubsub
    .schedule('every 2 minutes')
    .timeZone('America/New_York')
    .onRun(async (context) => {
        console.log('⏰ Scheduled game sync triggered');
        
        try {
            // Only run during NFL game days (Thursday, Sunday, Monday)
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0 = Sunday, 4 = Thursday, 1 = Monday
            
            if (![0, 1, 4].includes(dayOfWeek)) {
                console.log('⏭️  Not a game day, skipping scheduled sync');
                return;
            }
            
            // Only run during game hours (12 PM - 12 AM ET)
            const etHour = now.getUTCHours() - 5; // Approximate ET conversion
            if (etHour < 12 || etHour > 24) {
                console.log('⏭️  Outside game hours, skipping scheduled sync');
                return;
            }
            
            // Trigger the sync
            const currentWeek = getCurrentNflWeek();
            await syncLeaderboardToRTDB(currentWeek);
            
            console.log('✅ Scheduled sync completed');
            
        } catch (error) {
            console.error('❌ Scheduled sync failed:', error);
        }
    });
*/

/**
 * Firestore trigger - sync leaderboard when results are updated
 * TODO: Enable when Firestore triggers are supported
 */
/*
exports.onResultsUpdate = functions.firestore
    .document('artifacts/nerdfootball/weeks/{weekId}/results')
    .onWrite(async (change, context) => {
        const weekId = context.params.weekId;
        const weekNumber = parseInt(weekId.replace('week-', ''));
        
        console.log(`🔄 Results updated for ${weekId}, syncing leaderboard...`);
        
        try {
            await syncLeaderboardToRTDB(weekNumber);
            console.log(`✅ Leaderboard synced after results update for ${weekId}`);
        } catch (error) {
            console.error(`❌ Failed to sync leaderboard after results update:`, error);
        }
    });
*/

/**
 * Test endpoint for manual triggering
 */
exports.testRealTimeSync = functions.https.onRequest(async (req, res) => {
    console.log('🧪 Test real-time sync triggered');
    
    try {
        // Test RTDB connection
        await rtdb.ref('test/connection').set({
            timestamp: admin.database.ServerValue.TIMESTAMP,
            message: 'Test connection successful'
        });
        
        // Test leaderboard sync
        await syncLeaderboardToRTDB();
        
        res.status(200).json({
            success: true,
            message: 'Real-time sync test completed successfully',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Test sync failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});