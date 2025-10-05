const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixWeek5BibleData() {
    console.log('🔧 FIXING WEEK 5 BIBLE DATA FROM ESPN\n');

    // Fetch ESPN data for Week 5 (2025 season)
    const espnUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2025&seasontype=2&week=5';

    console.log('📡 Fetching ESPN data for Week 5...');
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(espnUrl);
    const espnData = await response.json();

    if (!espnData.events || espnData.events.length === 0) {
        console.error('❌ No ESPN events found for Week 5');
        process.exit(1);
    }

    console.log(`✅ Found ${espnData.events.length} games from ESPN\n`);

    const bibleData = {};
    let gameCounter = 501;

    espnData.events.forEach(event => {
        const competition = event.competitions[0];
        const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
        const awayTeam = competition.competitors.find(c => c.homeAway === 'away');

        const gameId = gameCounter.toString();
        const status = competition.status.type.name;

        let winner = null;
        if (status === 'STATUS_FINAL') {
            winner = homeTeam.winner ? homeTeam.team.abbreviation : awayTeam.team.abbreviation;
        }

        bibleData[gameId] = {
            gameId: gameId,
            homeTeam: homeTeam.team.abbreviation,
            awayTeam: awayTeam.team.abbreviation,
            homeScore: parseInt(homeTeam.score) || 0,
            awayScore: parseInt(awayTeam.score) || 0,
            winner: winner,
            status: status,
            gameTime: event.date,
            espnId: event.id
        };

        const winnerDisplay = winner || 'TBD';
        console.log(`${gameId}: ${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation} - Winner: ${winnerDisplay} (${status})`);

        gameCounter++;
    });

    bibleData._metadata = {
        weekNumber: 5,
        totalGames: espnData.events.length,
        lastUpdated: new Date().toISOString(),
        source: 'ESPN API'
    };

    // Write to Firestore
    const week5Ref = db.collection('artifacts').doc('nerdfootball')
        .collection('public').doc('data')
        .collection('nerdfootball_games').doc('5');

    console.log('\n💾 Writing Week 5 bible data to Firestore...');
    await week5Ref.set(bibleData);

    console.log('✅ Week 5 bible data updated successfully!');
    console.log(`📊 Stored ${Object.keys(bibleData).filter(k => k !== '_metadata').length} games`);

    process.exit(0);
}

fixWeek5BibleData().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
