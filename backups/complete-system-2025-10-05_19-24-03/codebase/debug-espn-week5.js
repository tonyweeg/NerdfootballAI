const https = require('https');

async function checkESPN() {
    const week = 5;
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2025&seasontype=2&week=${week}`;

    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const json = JSON.parse(data);
                console.log('\n🏈 ESPN API WEEK 5 GAMES:\n');
                console.log('='.repeat(80));

                json.events.forEach((event, i) => {
                    const comp = event.competitions[0];
                    const home = comp.competitors.find(t => t.homeAway === 'home');
                    const away = comp.competitors.find(t => t.homeAway === 'away');

                    console.log(`\n${i + 1}. ${away.team.displayName} @ ${home.team.displayName}`);
                    console.log(`   ESPN ID: ${event.id}`);
                    console.log(`   Status: ${comp.status.type.name}`);
                    console.log(`   Score: ${away.score} - ${home.score}`);
                    console.log(`   Away Team Names:`);
                    console.log(`     - displayName: "${away.team.displayName}"`);
                    console.log(`     - name: "${away.team.name}"`);
                    console.log(`     - shortDisplayName: "${away.team.shortDisplayName}"`);
                    console.log(`   Home Team Names:`);
                    console.log(`     - displayName: "${home.team.displayName}"`);
                    console.log(`     - name: "${home.team.name}"`);
                    console.log(`     - shortDisplayName: "${home.team.shortDisplayName}"`);
                });

                console.log('\n' + '='.repeat(80));
                resolve();
            });
        }).on('error', reject);
    });
}

checkESPN().then(() => process.exit(0));
