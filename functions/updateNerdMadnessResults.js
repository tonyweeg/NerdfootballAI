const functions = require('firebase-functions');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const db = admin.firestore();
const BASE = 'artifacts/nerdbasketball/pools/nerdmadness_2026';
const ESPN_API = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100';

/**
 * Fetches NCAA Tournament results from ESPN and updates Firestore matchups
 * Scheduled to run every 15 minutes during tournament
 */
async function fetchAndUpdateResults() {
    console.log('🏀 NerdMadness: Fetching ESPN tournament results...');

    try {
        // Fetch ESPN scoreboard
        const response = await fetch(ESPN_API);
        if (!response.ok) {
            throw new Error(`ESPN API returned ${response.status}`);
        }

        const data = await response.json();
        const events = data.events || [];

        console.log(`🏀 ESPN returned ${events.length} games`);

        // Filter for games that are FINAL (groups=100 already filters for NCAA tournament)
        const tournamentGames = events.filter(event => {
            const isFinal = event.status?.type?.name === 'STATUS_FINAL';
            return isFinal;
        });

        console.log(`🏀 Found ${tournamentGames.length} completed tournament games`);

        if (tournamentGames.length === 0) {
            console.log('🏀 No completed tournament games to process');
            return { updated: 0, games: [] };
        }

        // Load our teams and matchups from Firestore
        const [teamsSnap, matchupsSnap] = await Promise.all([
            db.collection(`${BASE}/teams`).get(),
            db.collection(`${BASE}/matchups`).get()
        ]);

        const teams = {};
        teamsSnap.forEach(doc => { teams[doc.id] = doc.data(); });

        const matchups = {};
        matchupsSnap.forEach(doc => { matchups[doc.id] = doc.data(); });

        // Build team name lookup (ESPN name -> our team ID)
        const teamNameMap = buildTeamNameMap(teams);

        const updates = [];
        const batch = db.batch();

        for (const game of tournamentGames) {
            const result = processGame(game, matchups, teamNameMap, teams);
            if (result) {
                const matchupRef = db.doc(`${BASE}/matchups/${result.matchupId}`);
                batch.update(matchupRef, {
                    winner_team_id: result.winnerTeamId,
                    top_team_score: result.topScore,
                    bottom_team_score: result.bottomScore,
                    status: 'FINAL',
                    espn_game_id: game.id,
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                });
                updates.push(result);
                console.log(`🏀 Updating ${result.matchupId}: Winner = ${result.winnerName}`);
            }
        }

        if (updates.length > 0) {
            await batch.commit();
            console.log(`🏀 Successfully updated ${updates.length} matchups`);
        }

        return { updated: updates.length, games: updates };

    } catch (error) {
        console.error('🏀 Error updating NerdMadness results:', error);
        throw error;
    }
}

/**
 * Build a map from various team name formats to our team IDs
 */
function buildTeamNameMap(teams) {
    const map = {};

    for (const [teamId, team] of Object.entries(teams)) {
        const name = team.team_name || '';
        const normalizedName = normalizeName(name);

        // Map full name
        map[normalizedName] = teamId;

        // Map common variations
        // "Duke Blue Devils" -> "duke"
        const firstName = name.split(' ')[0].toLowerCase();
        if (!map[firstName]) map[firstName] = teamId;

        // Handle special cases
        const specialMappings = {
            'uconn': 'connecticut',
            'uconn huskies': 'connecticut',
            'connecticut huskies': 'connecticut',
            'miami (fl)': 'miami',
            'miami hurricanes': 'miami',
            'st. john\'s': 'st johns',
            'saint john\'s': 'st johns',
            'vcu': 'virginia commonwealth',
            'vcu rams': 'virginia commonwealth',
            'ucf': 'central florida',
            'ucf knights': 'central florida',
            'byu': 'brigham young',
            'byu cougars': 'brigham young'
        };

        for (const [variant, canonical] of Object.entries(specialMappings)) {
            if (normalizedName.includes(canonical) || normalizedName.includes(variant)) {
                map[variant] = teamId;
            }
        }
    }

    return map;
}

function normalizeName(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Find team ID from ESPN team name
 */
function findTeamId(espnTeamName, teamNameMap, teams) {
    const normalized = normalizeName(espnTeamName);

    // Direct match
    if (teamNameMap[normalized]) return teamNameMap[normalized];

    // Try first word match
    const firstName = normalized.split(' ')[0];
    if (teamNameMap[firstName]) return teamNameMap[firstName];

    // Fuzzy match - find team whose name contains the ESPN name or vice versa
    for (const [teamId, team] of Object.entries(teams)) {
        const ourName = normalizeName(team.team_name || '');
        if (ourName.includes(firstName) || firstName.includes(ourName.split(' ')[0])) {
            return teamId;
        }
    }

    console.warn(`🏀 Could not find team ID for: ${espnTeamName}`);
    return null;
}

/**
 * Process a single ESPN game and find the matching Firestore matchup
 */
function processGame(game, matchups, teamNameMap, teams) {
    const competitors = game.competitions?.[0]?.competitors || [];
    if (competitors.length !== 2) return null;

    // Get team info from ESPN
    const team1 = competitors[0];
    const team2 = competitors[1];

    const team1Name = team1.team?.displayName || team1.team?.name || '';
    const team2Name = team2.team?.displayName || team2.team?.name || '';
    const team1Score = parseInt(team1.score) || 0;
    const team2Score = parseInt(team2.score) || 0;
    const team1Winner = team1.winner === true;
    const team2Winner = team2.winner === true;

    // Find our team IDs
    const team1Id = findTeamId(team1Name, teamNameMap, teams);
    const team2Id = findTeamId(team2Name, teamNameMap, teams);

    if (!team1Id || !team2Id) {
        console.warn(`🏀 Could not map teams: ${team1Name} vs ${team2Name}`);
        return null;
    }

    // Find the matchup that has these two teams
    const matchup = findMatchup(matchups, team1Id, team2Id, teams);
    if (!matchup) {
        console.warn(`🏀 Could not find matchup for: ${team1Name} vs ${team2Name}`);
        return null;
    }

    // Determine winner
    const winnerTeamId = team1Winner ? team1Id : (team2Winner ? team2Id : null);
    const winnerName = team1Winner ? team1Name : (team2Winner ? team2Name : 'Unknown');

    if (!winnerTeamId) {
        console.warn(`🏀 No winner determined for game ${game.id}`);
        return null;
    }

    // Determine which score is top vs bottom based on matchup structure
    let topScore, bottomScore;
    if (matchup.data.top_team_id === team1Id) {
        topScore = team1Score;
        bottomScore = team2Score;
    } else if (matchup.data.top_team_id === team2Id) {
        topScore = team2Score;
        bottomScore = team1Score;
    } else {
        // For later rounds, teams are determined by picks, just store scores
        topScore = Math.max(team1Score, team2Score);
        bottomScore = Math.min(team1Score, team2Score);
    }

    return {
        matchupId: matchup.id,
        winnerTeamId,
        winnerName,
        topScore,
        bottomScore,
        espnGameId: game.id
    };
}

/**
 * Find matchup by team IDs
 */
function findMatchup(matchups, team1Id, team2Id, teams) {
    // For Round of 64, teams are in the matchup directly
    for (const [matchupId, matchup] of Object.entries(matchups)) {
        if (matchup.round_id === 'round_of_64') {
            if ((matchup.top_team_id === team1Id && matchup.bottom_team_id === team2Id) ||
                (matchup.top_team_id === team2Id && matchup.bottom_team_id === team1Id)) {
                return { id: matchupId, data: matchup };
            }
        }
    }

    // For later rounds, we need to check if winner_team_id hasn't been set yet
    // and the teams are feeding into this matchup
    // This is more complex - for now, return null for non-R64 games
    // TODO: Implement feeder matching for later rounds

    return null;
}

// HTTP callable function for manual trigger
exports.updateNerdMadnessResults = functions.https.onCall(async (data, context) => {
    // Optional: Check admin auth
    // if (!context.auth || !isAdmin(context.auth.uid)) {
    //     throw new functions.https.HttpsError('permission-denied', 'Admin only');
    // }

    return await fetchAndUpdateResults();
});

// Scheduled function - runs every 15 minutes during tournament
exports.scheduledNerdMadnessUpdate = onSchedule('every 15 minutes', async (event) => {
    // Only run during tournament dates (March 18 - April 7, 2026)
    const now = new Date();
    const tournamentStart = new Date('2026-03-18');
    const tournamentEnd = new Date('2026-04-08');

    if (now < tournamentStart || now > tournamentEnd) {
        console.log('🏀 Outside tournament dates, skipping update');
        return null;
    }

    return await fetchAndUpdateResults();
});

// HTTP endpoint for testing
exports.testNerdMadnessUpdate = functions.https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const result = await fetchAndUpdateResults();
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = {
    updateNerdMadnessResults: exports.updateNerdMadnessResults,
    scheduledNerdMadnessUpdate: exports.scheduledNerdMadnessUpdate,
    testNerdMadnessUpdate: exports.testNerdMadnessUpdate
};
