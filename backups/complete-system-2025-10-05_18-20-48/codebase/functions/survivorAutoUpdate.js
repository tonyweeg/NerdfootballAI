/**
 * SURVIVOR AUTO-UPDATE LOGIC - Phase 2 Implementation
 * Automatically updates survivor status when ESPN games are marked as FINAL
 * Diamond-level precision for NerdFootball survivor pool
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

// Use the already initialized Firestore instance if available
const db = admin.apps.length > 0 ? admin.app().firestore() : admin.firestore();

/**
 * Process completed games and update survivor status
 * Called when ESPN game status changes to FINAL
 */
async function processSurvivorUpdatesForCompletedGames(completedGames, weekNumber) {
    console.log(`🎯 Processing survivor updates for ${completedGames.length} completed games in Week ${weekNumber}`);

    const poolId = 'nerduniverse-2025';
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const results = {
        gamesProcessed: 0,
        usersEliminated: 0,
        usersAdvanced: 0,
        errors: []
    };

    try {
        // Get all pool members
        const poolDoc = await db.doc(poolMembersPath).get();
        if (!poolDoc.exists) {
            throw new Error('Pool members document not found');
        }

        const poolMembers = poolDoc.data();
        const memberUserIds = Object.keys(poolMembers);

        console.log(`📊 Found ${memberUserIds.length} pool members to check`);

        // Process each completed game
        for (const game of completedGames) {
            console.log(`🏈 Processing game: ${game.awayTeam} @ ${game.homeTeam} - Winner: ${game.winner}`);

            try {
                // Find all users who picked teams in this game
                const usersWithPicks = await findUsersWithPicksForGame(memberUserIds, game, weekNumber);

                console.log(`   📊 Found ${usersWithPicks.length} users with picks for this game`);

                // Process each user's pick
                for (const userPick of usersWithPicks) {
                    try {
                        await processSurvivorPickResult(poolMembersPath, userPick, game, weekNumber);

                        if (userPick.teamPicked === game.winner) {
                            results.usersAdvanced++;
                        } else {
                            results.usersEliminated++;
                        }

                    } catch (error) {
                        console.error(`❌ Error processing pick for user ${userPick.userId}:`, error);
                        results.errors.push({
                            userId: userPick.userId,
                            game: `${game.awayTeam} @ ${game.homeTeam}`,
                            error: error.message
                        });
                    }
                }

                results.gamesProcessed++;

            } catch (error) {
                console.error(`❌ Error processing game ${game.awayTeam} @ ${game.homeTeam}:`, error);
                results.errors.push({
                    game: `${game.awayTeam} @ ${game.homeTeam}`,
                    error: error.message
                });
            }
        }

        console.log(`✅ Survivor updates completed:`);
        console.log(`   📊 Games processed: ${results.gamesProcessed}`);
        console.log(`   ✅ Users advanced: ${results.usersAdvanced}`);
        console.log(`   💀 Users eliminated: ${results.usersEliminated}`);
        console.log(`   ❌ Errors: ${results.errors.length}`);

        return results;

    } catch (error) {
        console.error('❌ Error in processSurvivorUpdatesForCompletedGames:', error);
        throw error;
    }
}

/**
 * Find users who made picks for a specific game
 */
async function findUsersWithPicksForGame(memberUserIds, game, weekNumber) {
    const usersWithPicks = [];

    // Check both individual survivor picks and unified documents
    for (const userId of memberUserIds) {
        try {
            // Method 1: Check individual survivor picks document
            const individualPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;
            const individualDoc = await db.doc(individualPicksPath).get();

            if (individualDoc.exists) {
                const picks = individualDoc.data().picks || {};
                const weekPick = picks[weekNumber];

                if (weekPick && weekPick.team) {
                    const pickedTeam = normalizeTeamName(weekPick.team);

                    // Check if this user picked either team in this game
                    if (pickedTeam === game.homeTeam || pickedTeam === game.awayTeam) {
                        usersWithPicks.push({
                            userId: userId,
                            teamPicked: pickedTeam,
                            source: 'individual'
                        });
                        continue; // Found pick, move to next user
                    }
                }
            }

            // Method 2: Check unified survivor documents (if available)
            const unifiedPath = `artifacts/nerdfootball/pools/nerduniverse-2025/survivor/2025/weeks/${weekNumber}`;
            const unifiedDoc = await db.doc(unifiedPath).get();

            if (unifiedDoc.exists) {
                const unifiedData = unifiedDoc.data();
                const userPick = unifiedData[userId];

                if (userPick && userPick.team) {
                    const pickedTeam = normalizeTeamName(userPick.team);

                    // Check if this user picked either team in this game
                    if (pickedTeam === game.homeTeam || pickedTeam === game.awayTeam) {
                        usersWithPicks.push({
                            userId: userId,
                            teamPicked: pickedTeam,
                            source: 'unified'
                        });
                    }
                }
            }

        } catch (error) {
            console.warn(`⚠️ Error checking picks for user ${userId}:`, error.message);
        }
    }

    return usersWithPicks;
}

/**
 * Process survivor pick result for a specific user
 */
async function processSurvivorPickResult(poolMembersPath, userPick, game, weekNumber) {
    const { userId, teamPicked } = userPick;
    const isWinner = teamPicked === game.winner;

    console.log(`   🎯 Processing ${userId}: ${teamPicked} → ${isWinner ? 'SURVIVED' : 'ELIMINATED'}`);

    try {
        // Get current pool member data
        const poolDoc = await db.doc(poolMembersPath).get();
        const poolData = poolDoc.data();
        const userData = poolData[userId];

        if (!userData) {
            throw new Error(`User ${userId} not found in pool members`);
        }

        // Get current survivor field or create default
        let survivorField = userData.survivor || createDefaultSurvivorField();

        // 🚨 CRITICAL: Don't update users who are already eliminated
        if (survivorField.alive < 18) {
            console.log(`   ⏭️  Skipping ${userData.displayName || userId}: already eliminated in week ${survivorField.alive}`);
            return;
        }

        // Validate current field structure
        const validationErrors = validateSurvivorField(survivorField);
        if (validationErrors.length > 0) {
            console.warn(`⚠️ Survivor field validation errors for ${userId}, recreating:`, validationErrors);
            survivorField = createDefaultSurvivorField();
        }

        // Update pick history (add this week's pick)
        const updatedHistory = appendToPickHistory(survivorField.pickHistory, teamPicked);

        // Update survivor field based on result
        const updatedSurvivorField = {
            ...survivorField,
            alive: isWinner ? survivorField.alive : weekNumber, // Eliminate if lost
            pickHistory: updatedHistory,
            totalPicks: survivorField.totalPicks + 1,
            lastUpdated: new Date().toISOString(),
            manualOverride: false // Mark as auto-updated
        };

        // Validate updated field
        const updatedValidationErrors = validateSurvivorField(updatedSurvivorField);
        if (updatedValidationErrors.length > 0) {
            throw new Error(`Updated survivor field validation failed: ${updatedValidationErrors.join(', ')}`);
        }

        // Update the document
        await db.doc(poolMembersPath).update({
            [`${userId}.survivor`]: updatedSurvivorField
        });

        console.log(`   ✅ Updated ${userData.displayName || userId}: alive=${updatedSurvivorField.alive}, picks=${updatedSurvivorField.totalPicks}`);

    } catch (error) {
        console.error(`❌ Error processing survivor result for ${userId}:`, error);
        throw error;
    }
}

/**
 * Helper functions - copied from Phase 1 for consistency
 */
function createDefaultSurvivorField() {
    return {
        alive: 18,
        pickHistory: "",
        lastUpdated: new Date().toISOString(),
        totalPicks: 0,
        manualOverride: false
    };
}

function validateSurvivorField(survivorData) {
    const errors = [];

    if (!survivorData.hasOwnProperty('alive')) {
        errors.push('Missing required field: alive');
    } else if (!Number.isInteger(survivorData.alive) || survivorData.alive < 1 || survivorData.alive > 18) {
        errors.push('Field "alive" must be an integer between 1-18');
    }

    if (!survivorData.hasOwnProperty('pickHistory')) {
        errors.push('Missing required field: pickHistory');
    } else if (typeof survivorData.pickHistory !== 'string') {
        errors.push('Field "pickHistory" must be a string');
    }

    if (!survivorData.hasOwnProperty('lastUpdated')) {
        errors.push('Missing required field: lastUpdated');
    } else if (typeof survivorData.lastUpdated !== 'string') {
        errors.push('Field "lastUpdated" must be an ISO date string');
    }

    if (!survivorData.hasOwnProperty('totalPicks')) {
        errors.push('Missing required field: totalPicks');
    } else if (!Number.isInteger(survivorData.totalPicks) || survivorData.totalPicks < 0) {
        errors.push('Field "totalPicks" must be a non-negative integer');
    }

    if (!survivorData.hasOwnProperty('manualOverride')) {
        errors.push('Missing required field: manualOverride');
    } else if (typeof survivorData.manualOverride !== 'boolean') {
        errors.push('Field "manualOverride" must be a boolean');
    }

    return errors;
}

function parsePickHistory(pickString) {
    if (!pickString || pickString.trim() === '') {
        return [];
    }
    return pickString.split(',').map(pick => pick.trim()).filter(pick => pick.length > 0);
}

function formatPickHistory(pickArray) {
    return pickArray.join(', ');
}

function appendToPickHistory(currentHistory, newTeam) {
    const picks = parsePickHistory(currentHistory);
    picks.push(newTeam);
    return formatPickHistory(picks);
}

function normalizeTeamName(teamName) {
    // Normalize team names to match ESPN format
    const nameMap = {
        'New England Patriots': 'New England Patriots',
        'NE Patriots': 'New England Patriots',
        'New York Giants': 'New York Giants',
        'NY Giants': 'New York Giants',
        'New York Jets': 'New York Jets',
        'NY Jets': 'New York Jets',
        'Tampa Bay Buccaneers': 'Tampa Bay Buccaneers',
        'TB Buccaneers': 'Tampa Bay Buccaneers',
        'Green Bay Packers': 'Green Bay Packers',
        'GB Packers': 'Green Bay Packers',
        'Kansas City Chiefs': 'Kansas City Chiefs',
        'KC Chiefs': 'Kansas City Chiefs',
        'Los Angeles Rams': 'Los Angeles Rams',
        'LA Rams': 'Los Angeles Rams',
        'Los Angeles Chargers': 'Los Angeles Chargers',
        'LA Chargers': 'Los Angeles Chargers',
        'Las Vegas Raiders': 'Las Vegas Raiders',
        'LV Raiders': 'Las Vegas Raiders',
        'San Francisco 49ers': 'San Francisco 49ers',
        'SF 49ers': 'San Francisco 49ers'
    };

    return nameMap[teamName] || teamName;
}

/**
 * Firebase Cloud Function - HTTP trigger for manual survivor updates
 */
exports.updateSurvivorStatus = functions.https.onRequest(async (req, res) => {
    console.log('🎯 Manual survivor status update triggered');

    try {
        const weekNumber = req.query.week ? parseInt(req.query.week) : getCurrentNflWeek();

        // Mock completed games for testing (replace with real ESPN data integration)
        const completedGames = req.body.games || [];

        if (completedGames.length === 0) {
            res.status(400).json({
                success: false,
                error: 'No completed games provided. Send games in request body.'
            });
            return;
        }

        const results = await processSurvivorUpdatesForCompletedGames(completedGames, weekNumber);

        res.status(200).json({
            success: true,
            message: 'Survivor updates completed',
            week: weekNumber,
            results: results
        });

    } catch (error) {
        console.error('❌ Manual survivor update failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Integration with real-time game sync
 * This function should be called from realtimeGameSync.js when games complete
 */
async function processCompletedGamesForSurvivor(gameUpdates, weekNumber) {
    console.log('🎯 Processing completed games for survivor updates');

    try {
        // Filter for games that just became FINAL
        const newlyCompletedGames = Object.values(gameUpdates).filter(game => {
            return game.status === 'Final' && game.winner && game.winner !== 'TIE';
        });

        if (newlyCompletedGames.length === 0) {
            console.log('ℹ️ No newly completed games for survivor processing');
            return { success: true, message: 'No newly completed games' };
        }

        console.log(`🏈 Found ${newlyCompletedGames.length} newly completed games`);

        const results = await processSurvivorUpdatesForCompletedGames(newlyCompletedGames, weekNumber);

        return {
            success: true,
            message: 'Survivor updates completed',
            results: results
        };

    } catch (error) {
        console.error('❌ Error processing completed games for survivor:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Helper function to get current NFL week
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

// Export functions for integration
module.exports = {
    processSurvivorUpdatesForCompletedGames,
    processCompletedGamesForSurvivor,
    findUsersWithPicksForGame,
    processSurvivorPickResult
};