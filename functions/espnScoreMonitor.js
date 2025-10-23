const functions = require('firebase-functions');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * ESPN Score Monitor - Real-time game status and score updates
 *
 * This function:
 * 1. Polls ESPN scoreboard API every 30 seconds during game days
 * 2. Updates game status: scheduled → IN_PROGRESS → FINAL
 * 3. Updates scores in real-time
 * 4. Triggers survivor elimination and user scoring when games are FINAL
 */

// ESPN API endpoint for NFL scoreboard
const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

/**
 * Get current NFL week number
 */
function getCurrentWeek() {
    const seasonStart = new Date('2025-09-04'); // Week 1 starts Sept 4, 2025
    const now = new Date();
    const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
    const weeksSinceStart = Math.floor(daysSinceStart / 7);
    return Math.max(1, Math.min(18, weeksSinceStart + 1));
}

/**
 * Fetch ESPN scoreboard data for specific week
 */
async function fetchESPNScoreboard(week, year = 2025) {
    try {
        const url = `${ESPN_API_BASE}?week=${week}&year=${year}&seasontype=2`;
        console.log(`🏈 Fetching ESPN data: ${url}`);

        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'NerdFootball/1.0'
            }
        });

        return response.data;
    } catch (error) {
        console.error(`❌ ESPN API Error: ${error.message}`);
        throw error;
    }
}

/**
 * Parse ESPN game data into our format
 */
function parseESPNGame(espnGame) {
    try {
        const competition = espnGame.competitions[0];
        const competitors = competition.competitors;

        // Find away and home teams
        const awayTeam = competitors.find(c => c.homeAway === 'away');
        const homeTeam = competitors.find(c => c.homeAway === 'home');

        // Map ESPN status to our status
        let status = 'scheduled';
        const espnStatus = competition.status.type.name.toLowerCase();

        if (espnStatus.includes('in_progress') || espnStatus.includes('progress') || espnStatus.includes('halftime')) {
            status = 'IN_PROGRESS';
        } else if (espnStatus.includes('final')) {
            status = competition.status.type.name; // FINAL, FINAL/OT, etc.
        }

        // Get scores (null if not started)
        const awayScore = awayTeam.score ? parseInt(awayTeam.score) : null;
        const homeScore = homeTeam.score ? parseInt(homeTeam.score) : null;

        // Debug logging for Game 401
        if (espnGame.id.toString().slice(0, 3) === '401') {
            console.log(`🎯 GAME 401 DEBUG:`);
            console.log(`  ESPN ID: ${espnGame.id}`);
            console.log(`  Our ID: ${espnGame.id.toString().slice(0, 3)}`);
            console.log(`  Away Team: ${awayTeam.team.displayName} Score: ${awayTeam.score}`);
            console.log(`  Home Team: ${homeTeam.team.displayName} Score: ${homeTeam.score}`);
            console.log(`  ESPN Status: ${competition.status.type.name}`);
            console.log(`  Our Status: ${status}`);
            console.log(`  Parsed Scores: away=${awayScore}, home=${homeScore}`);
        }

        // Determine winner (only if game is final)
        let winner = null;
        if (status.includes('FINAL') && awayScore !== null && homeScore !== null) {
            if (awayScore > homeScore) {
                winner = awayTeam.team.displayName;
            } else if (homeScore > awayScore) {
                winner = homeTeam.team.displayName;
            }
            // Tie stays null
        }

        // Enhanced game details for in-progress games
        let gameDetail = '';
        let period = competition.status.period || '';
        let clock = competition.status.displayClock || '';
        let lastPlay = competition.situation?.lastPlay?.text || '';

        // Always capture game details (not just for IN_PROGRESS)
        if (status === 'IN_PROGRESS') {
            gameDetail = competition.status.type.detail || '';
        }

        // Additional debug for Game 401
        if (espnGame.id.toString().slice(0, 3) === '401') {
            console.log(`  Game Details: period=${period}, clock=${clock}`);
            console.log(`  Game Detail: ${gameDetail}`);
            console.log(`  Last Play: ${lastPlay ? lastPlay.substring(0, 100) + '...' : 'None'}`);
        }

        return {
            id: espnGame.id,
            awayTeam: awayTeam.team.displayName,
            homeTeam: homeTeam.team.displayName,
            awayScore,
            homeScore,
            status,
            winner,
            venue: competition.venue?.fullName || '',
            startTime: espnGame.date,
            lastUpdated: new Date().toISOString(),
            // Enhanced in-progress details
            gameDetail,
            period,
            clock,
            lastPlay
        };

    } catch (error) {
        console.error(`❌ Error parsing ESPN game:`, error);
        return null;
    }
}

/**
 * Update game data in Firestore
 */
async function updateGameInFirestore(week, gameId, updates) {
    try {
        console.log(`🔄 Updating Game ${gameId} with:`, updates);

        // Use the EXACT same approach as the working force update
        const gamesPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;
        const gamesRef = db.doc(gamesPath);

        // Build update data with dot notation (same as force update)
        const updateData = {};
        Object.keys(updates).forEach(key => {
            updateData[`${gameId}.${key}`] = updates[key];
        });

        console.log(`📡 Updating ${gamesPath} with:`, updateData);

        // Simple update (exactly like force update)
        await gamesRef.update(updateData);

        console.log(`✅ Game ${gameId} updated successfully!`);
        return true;

    } catch (error) {
        console.error(`❌ Firestore update error for Game ${gameId}:`, error);
        return false;
    }
}

/**
 * Check if survivor elimination is needed
 */
async function checkSurvivorElimination(week, gameId, winner) {
    try {
        console.log(`💀 Checking survivor elimination for Game ${gameId}, Winner: ${winner}`);

        // Get all survivor picks for this week
        const survivorPicksPath = 'artifacts/nerdfootball/public/data/nerdSurvivor_picks';
        const survivorRef = db.collection(survivorPicksPath);

        // Get all documents (users)
        const snapshot = await survivorRef.get();
        const eliminatedUsers = [];

        for (const doc of snapshot.docs) {
            const userData = doc.data();
            const weekPick = userData[week];

            if (weekPick && weekPick.team) {
                // Check if user picked the losing team
                if (weekPick.team !== winner) {
                    // User is eliminated!
                    await survivorRef.doc(doc.id).update({
                        [`${week}.alive`]: false,
                        [`${week}.eliminated`]: true,
                        [`${week}.eliminatedBy`]: gameId
                    });

                    eliminatedUsers.push({
                        userId: doc.id,
                        team: weekPick.team,
                        eliminatedBy: gameId
                    });
                }
            }
        }

        if (eliminatedUsers.length > 0) {
            console.log(`💀 Eliminated ${eliminatedUsers.length} survivors:`, eliminatedUsers);
        }

        return eliminatedUsers;

    } catch (error) {
        console.error(`❌ Survivor elimination error:`, error);
        return [];
    }
}

/**
 * Trigger user scoring update
 */
async function triggerUserScoring(week) {
    try {
        console.log(`📊 Triggering user scoring for Week ${week}`);

        // Call the scoring system (you may have an existing function)
        // This is a placeholder - adapt to your existing scoring system

        // Example: Update user scores based on completed games
        const scoringRef = db.doc(`artifacts/nerdfootball/pools/nerduniverse-2025/scoring/week${week}`);

        await scoringRef.set({
            lastUpdated: new Date().toISOString(),
            status: 'processing',
            week: week
        }, { merge: true });

        console.log(`✅ User scoring triggered for Week ${week}`);

    } catch (error) {
        console.error(`❌ User scoring trigger error:`, error);
    }
}

/**
 * Map ESPN game to our game ID by matching team names against existing games
 * This ensures backwards compatibility - we never create new games or change IDs
 */
async function mapESPNGameToOurGame(week, awayTeam, homeTeam, existingGames) {
    // Normalize team names for comparison (handle variations)
    const normalizeTeam = (team) => {
        return team
            .replace(/^(New York|Los Angeles|LA)\s+/i, '') // Remove city prefix for NY/LA teams
            .toLowerCase()
            .trim();
    };

    const espnAway = normalizeTeam(awayTeam);
    const espnHome = normalizeTeam(homeTeam);

    // Search through existing games to find match
    for (const [gameId, game] of Object.entries(existingGames)) {
        // Skip metadata fields
        if (gameId.startsWith('_')) continue;

        // Skip non-game fields
        if (!/^\d{3,4}$/.test(gameId)) continue;

        const ourAway = normalizeTeam(game.a || game.awayTeam || '');
        const ourHome = normalizeTeam(game.h || game.homeTeam || '');

        // Check if team names match (contains, not exact match)
        const awayMatch = ourAway.includes(espnAway) || espnAway.includes(ourAway);
        const homeMatch = ourHome.includes(espnHome) || espnHome.includes(ourHome);

        if (awayMatch && homeMatch) {
            console.log(`✅ Matched: ${awayTeam} @ ${homeTeam} → Game ${gameId}`);
            return gameId;
        }
    }

    // If no match found, log warning but don't create game 000
    console.log(`⚠️  No match found for: ${awayTeam} @ ${homeTeam}`);
    return null;
}

/**
 * Main monitoring function
 */
async function monitorESPNScores() {
    const currentWeek = getCurrentWeek();
    console.log(`🏈 ESPN Score Monitor - Week ${currentWeek} - ${new Date().toISOString()}`);

    try {
        // STEP 1: Load existing games from Firestore first (backwards compatibility)
        console.log(`📥 Loading existing Week ${currentWeek} games from Firestore...`);
        const gamesPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${currentWeek}`;
        const gamesRef = db.doc(gamesPath);
        const gamesSnap = await gamesRef.get();

        if (!gamesSnap.exists) {
            console.log(`⚠️  No existing games found for Week ${currentWeek} - skipping ESPN sync`);
            return {
                week: currentWeek,
                gamesUpdated: 0,
                gamesCompleted: 0,
                completedGameIds: [],
                error: 'No existing games to update',
                timestamp: new Date().toISOString()
            };
        }

        const existingGames = gamesSnap.data();
        console.log(`✅ Loaded ${Object.keys(existingGames).filter(k => !k.startsWith('_')).length} existing games`);

        // STEP 2: Fetch ESPN data
        const espnData = await fetchESPNScoreboard(currentWeek);

        if (!espnData.events || espnData.events.length === 0) {
            console.log(`⚠️ No ESPN games found for Week ${currentWeek}`);
            return {
                week: currentWeek,
                gamesUpdated: 0,
                gamesCompleted: 0,
                completedGameIds: [],
                error: 'No ESPN data available',
                timestamp: new Date().toISOString()
            };
        }

        let gamesUpdated = 0;
        let gamesCompleted = 0;
        let gamesSkipped = 0;
        const completedGameIds = [];

        // STEP 3: Process each ESPN game
        for (const espnGame of espnData.events) {
            const gameData = parseESPNGame(espnGame);

            if (!gameData) {
                gamesSkipped++;
                continue;
            }

            // STEP 4: Match ESPN game to our existing game (backwards compatible)
            const ourGameId = await mapESPNGameToOurGame(
                currentWeek,
                gameData.awayTeam,
                gameData.homeTeam,
                existingGames
            );

            if (!ourGameId) {
                console.log(`⏭️  Skipping unmapped game: ${gameData.awayTeam} @ ${gameData.homeTeam}`);
                gamesSkipped++;
                continue;
            }

            console.log(`🎯 Processing Game ${ourGameId}: ${gameData.awayTeam} @ ${gameData.homeTeam} - ${gameData.status}`);

            // STEP 5: Prepare update data
            const updates = {
                status: gameData.status,
                awayScore: gameData.awayScore,
                homeScore: gameData.homeScore,
                winner: gameData.winner,
                gameTime: gameData.startTime, // Store as gameTime for consistency
                lastUpdated: gameData.lastUpdated,
                // Enhanced in-progress details
                gameDetail: gameData.gameDetail,
                period: gameData.period,
                clock: gameData.clock,
                lastPlay: gameData.lastPlay
            };

            // STEP 6: Update in Firestore
            const success = await updateGameInFirestore(currentWeek, ourGameId, updates);

            if (success) {
                gamesUpdated++;

                // If game just finished, trigger post-game actions
                if (gameData.status.includes('FINAL')) {
                    completedGameIds.push(ourGameId);
                    gamesCompleted++;

                    // Check survivor eliminations
                    if (gameData.winner) {
                        await checkSurvivorElimination(currentWeek, ourGameId, gameData.winner);
                    }
                }
            }
        }

        console.log(`✅ Monitor complete: ${gamesUpdated} games updated, ${gamesSkipped} games skipped, ${gamesCompleted} games completed`);

        // If any games completed, trigger user scoring
        if (gamesCompleted > 0) {
            await triggerUserScoring(currentWeek);
        }

        return {
            week: currentWeek,
            gamesUpdated,
            gamesSkipped,
            gamesCompleted,
            completedGameIds,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error(`❌ ESPN Monitor Error:`, error);
        throw error;
    }
}

/**
 * Cloud Function: Manual trigger for ESPN score monitoring
 */
exports.updateScores = functions.https.onRequest(async (req, res) => {
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const result = await monitorESPNScores();

        res.status(200).json({
            success: true,
            result,
            message: 'ESPN scores updated successfully'
        });

    } catch (error) {
        console.error('ESPN Score Update Error:', error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Cloud Function: Scheduled ESPN monitoring (every 2 minutes during game days)
 */
exports.scheduledScoreUpdate = onSchedule('every 2 minutes', async (event) => {
    try {
        // Only run during NFL season (September - January)
        const now = new Date();
        const month = now.getMonth() + 1; // 1-12

        // NFL season: September (9) through January (1)
        // Skip only if clearly off-season (February through August)
        if (month >= 2 && month <= 8) {
            console.log('🏈 Off-season - skipping score update');
            return;
        }

        // Run on ALL days during season - games can finish after midnight
        console.log(`🏈 Running scheduled ESPN score update - ${now.toISOString()}`);
        await monitorESPNScores();

    } catch (error) {
        console.error('Scheduled Score Update Error:', error);
    }
});

/**
 * Callable version for frontend (bypasses CORS issues)
 */
exports.updateScoresCallable = functions.https.onCall(async (data, context) => {
    try {
        console.log('🔥 ESPN Score Update (Callable) triggered by:', context.auth?.token?.email || 'unknown');
        const result = await monitorESPNScores();

        return {
            success: true,
            result,
            message: 'ESPN scores updated successfully'
        };

    } catch (error) {
        console.error('ESPN Score Update (Callable) Error:', error);

        return {
            success: false,
            error: error.message
        };
    }
});

/**
 * Export the main function for testing
 */
exports.monitorESPNScores = monitorESPNScores;

console.log('🏈 ESPN Score Monitor loaded - Ready for real-time updates');