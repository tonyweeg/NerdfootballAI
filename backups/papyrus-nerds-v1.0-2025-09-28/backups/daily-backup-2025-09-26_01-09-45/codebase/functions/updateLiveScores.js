const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

// Update live scores manually
exports.updateLiveScores = functions.https.onCall(async (data, context) => {
    try {
        console.log('🏈 MANUAL ESPN SCORE UPDATE STARTED');

        const db = admin.firestore();
        const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

        // Get current week
        const seasonStart = new Date('2025-09-04');
        const now = new Date();
        const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
        const weeksSinceStart = Math.floor(daysSinceStart / 7);
        const currentWeek = Math.max(1, Math.min(18, weeksSinceStart + 1));

        console.log(`Updating Week ${currentWeek} scores`);

        // Fetch ESPN data
        const url = `${ESPN_API_BASE}?week=${currentWeek}&year=2025&seasontype=2`;
        const response = await axios.get(url, { timeout: 10000 });
        const espnData = response.data;

        if (!espnData.events || !espnData.events.length) {
            return { success: false, message: 'No games found in ESPN data' };
        }

        const updates = [];

        for (const espnGame of espnData.events) {
            const competition = espnGame.competitions[0];
            const competitors = competition.competitors;

            const awayTeam = competitors.find(c => c.homeAway === 'away');
            const homeTeam = competitors.find(c => c.homeAway === 'home');

            // Map ESPN ID to our ID (first 3 digits)
            const ourGameId = espnGame.id.toString().slice(0, 3);

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

            // Prepare update
            const gameUpdate = {
                gameId: ourGameId,
                status,
                awayScore,
                homeScore,
                winner,
                awayTeam: awayTeam.team.displayName,
                homeTeam: homeTeam.team.displayName,
                lastUpdated: new Date().toISOString()
            };

            // Update Firestore
            const week4DocRef = db.doc(`artifacts/nerdfootball/public/data/nerdfootball_games/${currentWeek}`);
            const updateData = {};
            updateData[`${ourGameId}.status`] = status;
            updateData[`${ourGameId}.awayScore`] = awayScore;
            updateData[`${ourGameId}.homeScore`] = homeScore;
            updateData[`${ourGameId}.winner`] = winner;
            updateData[`${ourGameId}.lastUpdated`] = new Date().toISOString();

            await week4DocRef.update(updateData);

            updates.push(gameUpdate);
            console.log(`✅ Updated Game ${ourGameId}: ${awayTeam.team.displayName} ${awayScore || 0} - ${homeScore || 0} ${homeTeam.team.displayName} (${status})`);
        }

        return {
            success: true,
            message: `Updated ${updates.length} games for Week ${currentWeek}`,
            week: currentWeek,
            updates
        };

    } catch (error) {
        console.error('❌ Error updating live scores:', error);
        return { success: false, message: error.message };
    }
});