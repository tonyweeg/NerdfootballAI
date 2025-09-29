const axios = require('axios');

async function debugESPNMapping() {
    try {
        const url = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=4&year=2025&seasontype=2';
        const response = await axios.get(url, { timeout: 10000 });
        const espnData = response.data;

        console.log('🏈 All Week 4 ESPN Games:');

        for (const espnGame of espnData.events) {
            const competition = espnGame.competitions[0];
            const competitors = competition.competitors;
            const awayTeam = competitors.find(c => c.homeAway === 'away');
            const homeTeam = competitors.find(c => c.homeAway === 'home');

            const ourGameId = espnGame.id.toString().slice(0, 3);

            console.log(`ESPN ID: ${espnGame.id} → Our ID: ${ourGameId}`);
            console.log(`  ${awayTeam.team.displayName} @ ${homeTeam.team.displayName}`);
            console.log(`  Away Score: ${awayTeam.score}, Home Score: ${homeTeam.score}`);
            console.log(`  Status: ${competition.status.type.name}`);
            console.log('');

            // Check if this is the Seahawks vs Cardinals game
            if (awayTeam.team.displayName === 'Seattle Seahawks' && homeTeam.team.displayName === 'Arizona Cardinals') {
                console.log('🎯 FOUND SEAHAWKS @ CARDINALS GAME!');
                console.log(`  This should map to Game 401 in our system`);
                console.log(`  ESPN ID: ${espnGame.id}`);
                console.log(`  Current mapping: ${ourGameId}`);
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugESPNMapping();