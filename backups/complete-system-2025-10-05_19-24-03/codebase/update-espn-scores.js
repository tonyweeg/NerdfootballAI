const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin
admin.initializeApp({
    projectId: 'nerdfootball'
});

const db = admin.firestore();

// ESPN API endpoint
const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

// Get current NFL week number
function getCurrentWeek() {
    const seasonStart = new Date('2025-09-04'); // Week 1 starts Sept 4, 2025
    const now = new Date();
    const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
    const weeksSinceStart = Math.floor(daysSinceStart / 7);
    return Math.max(1, Math.min(18, weeksSinceStart + 1));
}

// Map ESPN game ID to our game ID (first 3 digits)
function mapESPNIdToOurId(espnId) {
    const idStr = espnId.toString();
    if (idStr.length >= 3) {
        return idStr.slice(0, 3); // 401772938 -> 401
    }
    return idStr;
}

async function updateESPNScores() {
    try {
        const currentWeek = getCurrentWeek();
        console.log(`🏈 Updating ESPN Scores - Week ${currentWeek}`);

        // Fetch ESPN data
        const url = `${ESPN_API_BASE}?week=${currentWeek}&year=2025&seasontype=2`;
        console.log(`Fetching: ${url}`);

        const response = await axios.get(url, { timeout: 10000 });
        const espnData = response.data;

        if (!espnData.events || !espnData.events.length) {
            console.log('No games found in ESPN data');
            return;
        }

        console.log(`Found ${espnData.events.length} games`);

        for (const espnGame of espnData.events) {
            const competition = espnGame.competitions[0];
            const competitors = competition.competitors;

            const awayTeam = competitors.find(c => c.homeAway === 'away');
            const homeTeam = competitors.find(c => c.homeAway === 'home');

            // Map ESPN ID to our ID
            const ourGameId = mapESPNIdToOurId(espnGame.id);

            // Get status
            let status = 'scheduled';
            const espnStatus = competition.status.type.name.toLowerCase();
            if (espnStatus.includes('progress') || espnStatus.includes('halftime')) {
                status = 'IN_PROGRESS';
            } else if (espnStatus.includes('final')) {
                status = competition.status.type.name;
            }

            // Get scores
            const awayScore = awayTeam.score ? parseInt(awayTeam.score) : null;
            const homeScore = homeTeam.score ? parseInt(homeTeam.score) : null;

            // Determine winner
            let winner = null;
            if (status.includes('FINAL') && awayScore !== null && homeScore !== null) {
                if (awayScore > homeScore) {
                    winner = awayTeam.team.displayName;
                } else if (homeScore > awayScore) {
                    winner = homeTeam.team.displayName;
                }
            }

            // Update Firestore
            const updates = {
                status,
                awayScore,
                homeScore,
                winner,
                lastUpdated: new Date().toISOString()
            };

            const week4DocRef = db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/4');
            const updateData = {};
            for (const [key, value] of Object.entries(updates)) {
                updateData[`${ourGameId}.${key}`] = value;
            }

            await week4DocRef.update(updateData);

            console.log(`✅ Updated Game ${ourGameId}: ${awayTeam.team.displayName} ${awayScore || 0} - ${homeScore || 0} ${homeTeam.team.displayName} (${status})`);
        }

        console.log('🏈 ESPN scores updated successfully!');

    } catch (error) {
        console.error('❌ Error updating ESPN scores:', error);
    }
}

updateESPNScores();