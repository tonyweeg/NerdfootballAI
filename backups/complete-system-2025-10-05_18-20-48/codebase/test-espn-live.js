const axios = require('axios');

async function testESPNLive() {
    try {
        // Current week calculation
        const seasonStart = new Date('2025-09-04');
        const now = new Date();
        const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
        const weeksSinceStart = Math.floor(daysSinceStart / 7);
        const currentWeek = Math.max(1, Math.min(18, weeksSinceStart + 1));

        console.log(`🏈 Testing ESPN Live Data - Week ${currentWeek}`);

        // Fetch ESPN data
        const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${currentWeek}&year=2025&seasontype=2`;
        console.log(`📡 Fetching: ${url}`);

        const response = await axios.get(url, { timeout: 10000 });
        const espnData = response.data;

        if (!espnData.events || !espnData.events.length) {
            console.log('❌ No games found in ESPN data');
            return;
        }

        console.log(`✅ Found ${espnData.events.length} games`);

        // Look specifically for Game 401
        for (const espnGame of espnData.events) {
            const gameId = espnGame.id.toString().slice(0, 3);

            if (gameId === '401') {
                console.log('\n🎯 FOUND GAME 401:');
                console.log('ESPN Game ID:', espnGame.id);
                console.log('Our Game ID:', gameId);

                const competition = espnGame.competitions[0];
                const competitors = competition.competitors;
                const awayTeam = competitors.find(c => c.homeAway === 'away');
                const homeTeam = competitors.find(c => c.homeAway === 'home');

                console.log('Away Team:', awayTeam.team.displayName, 'Score:', awayTeam.score);
                console.log('Home Team:', homeTeam.team.displayName, 'Score:', homeTeam.score);
                console.log('ESPN Status:', competition.status.type.name);
                console.log('ESPN Status Detail:', competition.status.type.shortDetail);

                // What would our status be?
                let ourStatus = 'scheduled';
                const espnStatusName = competition.status.type.name.toLowerCase();
                if (espnStatusName.includes('progress') || espnStatusName.includes('halftime')) {
                    ourStatus = 'IN_PROGRESS';
                } else if (espnStatusName.includes('final')) {
                    ourStatus = competition.status.type.name;
                }

                console.log('Our Status Would Be:', ourStatus);
                console.log('Raw Competition Object:');
                console.log(JSON.stringify(competition, null, 2));
                break;
            }
        }

    } catch (error) {
        console.error('❌ Error testing ESPN live data:', error.message);
    }
}

testESPNLive();