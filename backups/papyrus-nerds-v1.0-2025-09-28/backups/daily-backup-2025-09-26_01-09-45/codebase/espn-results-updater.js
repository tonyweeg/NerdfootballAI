#!/usr/bin/env node

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class ESPNResultsUpdater {
    constructor() {
        this.teamNameMapping = {
            'Arizona': 'Arizona Cardinals',
            'Atlanta': 'Atlanta Falcons',
            'Baltimore': 'Baltimore Ravens',
            'Buffalo': 'Buffalo Bills',
            'Carolina': 'Carolina Panthers',
            'Chicago': 'Chicago Bears',
            'Cincinnati': 'Cincinnati Bengals',
            'Cleveland': 'Cleveland Browns',
            'Dallas': 'Dallas Cowboys',
            'Denver': 'Denver Broncos',
            'Detroit': 'Detroit Lions',
            'Green Bay': 'Green Bay Packers',
            'Houston': 'Houston Texans',
            'Indianapolis': 'Indianapolis Colts',
            'Jacksonville': 'Jacksonville Jaguars',
            'Kansas City': 'Kansas City Chiefs',
            'Las Vegas': 'Las Vegas Raiders',
            'LA Chargers': 'Los Angeles Chargers',
            'LA Rams': 'Los Angeles Rams',
            'Miami': 'Miami Dolphins',
            'Minnesota': 'Minnesota Vikings',
            'New England': 'New England Patriots',
            'New Orleans': 'New Orleans Saints',
            'NY Giants': 'New York Giants',
            'NY Jets': 'New York Jets',
            'Philadelphia': 'Philadelphia Eagles',
            'Pittsburgh': 'Pittsburgh Steelers',
            'San Francisco': 'San Francisco 49ers',
            'Seattle': 'Seattle Seahawks',
            'Tampa Bay': 'Tampa Bay Buccaneers',
            'Tennessee': 'Tennessee Titans',
            'Washington': 'Washington Commanders'
        };
    }

    normalizeTeamName(espnName) {
        // Handle exact matches first
        if (this.teamNameMapping[espnName]) {
            return this.teamNameMapping[espnName];
        }

        // Handle partial matches
        for (const [key, value] of Object.entries(this.teamNameMapping)) {
            if (espnName.includes(key) || key.includes(espnName)) {
                return value;
            }
        }

        return espnName; // fallback to original name
    }

    async fetchESPNResults(week) {
        const url = `https://www.espn.com/nfl/schedule/_/week/${week}/year/2025/seasontype/2`;
        console.log(`🏈 Fetching ESPN results for Week ${week}...`);

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            const games = [];

            // Look for completed games with final scores
            $('section').each((index, section) => {
                const $section = $(section);
                const gameText = $section.text();

                // Look for pattern: "Team @ Team" followed by score like "PHI 24, DAL 20"
                if (gameText.includes('@') && gameText.includes(',')) {
                    // Extract team names
                    const teamMatch = gameText.match(/([A-Za-z\s]+)\s*@\s*([A-Za-z\s]+)/);

                    // Extract scores in format "TEAM1 XX, TEAM2 YY"
                    const scoreMatch = gameText.match(/([A-Z]{2,4})\s+(\d+),\s*([A-Z]{2,4})\s+(\d+)/);

                    if (teamMatch && scoreMatch) {
                        const [, awayTeam, homeTeam] = teamMatch;
                        const [, team1Abbr, team1Score, team2Abbr, team2Score] = scoreMatch;

                        const awayTeamNorm = this.normalizeTeamName(awayTeam.trim());
                        const homeTeamNorm = this.normalizeTeamName(homeTeam.trim());

                        // Determine which score belongs to which team
                        let awayScore, homeScore;
                        if (this.getTeamAbbr(awayTeamNorm) === team1Abbr) {
                            awayScore = parseInt(team1Score);
                            homeScore = parseInt(team2Score);
                        } else {
                            awayScore = parseInt(team2Score);
                            homeScore = parseInt(team1Score);
                        }

                        let winner = null;
                        if (awayScore > homeScore) {
                            winner = awayTeamNorm;
                        } else if (homeScore > awayScore) {
                            winner = homeTeamNorm;
                        } else {
                            winner = 'tie';
                        }

                        games.push({
                            away: awayTeamNorm,
                            home: homeTeamNorm,
                            awayScore: awayScore,
                            homeScore: homeScore,
                            status: 'final',
                            winner: winner
                        });

                        console.log(`📊 Found: ${awayTeamNorm} ${awayScore} @ ${homeTeamNorm} ${homeScore} (Winner: ${winner})`);
                    }
                }
            });

            console.log(`✅ Found ${games.length} completed games for Week ${week}`);
            return games;

        } catch (error) {
            console.error(`❌ ESPN fetch failed for Week ${week}:`, error.message);
            return [];
        }
    }

    getTeamAbbr(fullName) {
        const abbrMap = {
            'Arizona Cardinals': 'ARI',
            'Atlanta Falcons': 'ATL',
            'Baltimore Ravens': 'BAL',
            'Buffalo Bills': 'BUF',
            'Carolina Panthers': 'CAR',
            'Chicago Bears': 'CHI',
            'Cincinnati Bengals': 'CIN',
            'Cleveland Browns': 'CLE',
            'Dallas Cowboys': 'DAL',
            'Denver Broncos': 'DEN',
            'Detroit Lions': 'DET',
            'Green Bay Packers': 'GB',
            'Houston Texans': 'HOU',
            'Indianapolis Colts': 'IND',
            'Jacksonville Jaguars': 'JAX',
            'Kansas City Chiefs': 'KC',
            'Las Vegas Raiders': 'LV',
            'Los Angeles Chargers': 'LAC',
            'Los Angeles Rams': 'LAR',
            'Miami Dolphins': 'MIA',
            'Minnesota Vikings': 'MIN',
            'New England Patriots': 'NE',
            'New Orleans Saints': 'NO',
            'New York Giants': 'NYG',
            'New York Jets': 'NYJ',
            'Philadelphia Eagles': 'PHI',
            'Pittsburgh Steelers': 'PIT',
            'San Francisco 49ers': 'SF',
            'Seattle Seahawks': 'SEA',
            'Tampa Bay Buccaneers': 'TB',
            'Tennessee Titans': 'TEN',
            'Washington Commanders': 'WAS'
        };
        return abbrMap[fullName] || fullName.substring(0, 3).toUpperCase();
    }

    async updateBibleWithResults(week) {
        const biblePath = `/Users/tonyweeg/nerdfootball-project/game-data/nfl_2025_week_${week}.json`;

        if (!fs.existsSync(biblePath)) {
            console.error(`❌ Bible file not found: ${biblePath}`);
            return false;
        }

        console.log(`📖 Reading bible file for Week ${week}...`);
        const bibleData = JSON.parse(fs.readFileSync(biblePath, 'utf8'));
        const espnResults = await this.fetchESPNResults(week);

        if (espnResults.length === 0) {
            console.log(`⚠️  No ESPN results found for Week ${week}`);
            return false;
        }

        let updatedCount = 0;

        // Match ESPN results to bible games
        for (const gameId in bibleData) {
            if (gameId === '_metadata') continue;

            const bibleGame = bibleData[gameId];
            const espnGame = espnResults.find(game =>
                game.away === bibleGame.a && game.home === bibleGame.h
            );

            if (espnGame) {
                bibleData[gameId].awayScore = espnGame.awayScore;
                bibleData[gameId].homeScore = espnGame.homeScore;
                bibleData[gameId].status = espnGame.status;
                bibleData[gameId].winner = espnGame.winner;
                updatedCount++;
                console.log(`✅ Updated Game ${gameId}: ${espnGame.away} ${espnGame.awayScore} - ${espnGame.homeScore} ${espnGame.home} (Winner: ${espnGame.winner})`);
            } else {
                console.log(`⚠️  No ESPN match for Game ${gameId}: ${bibleGame.a} @ ${bibleGame.h}`);
            }
        }

        // Update metadata
        bibleData._metadata.lastUpdated = new Date().toISOString();
        bibleData._metadata.resultsUpdated = true;
        bibleData._metadata.completedGames = updatedCount;

        // Save updated bible
        fs.writeFileSync(biblePath, JSON.stringify(bibleData, null, 2));
        console.log(`💾 Saved updated bible for Week ${week} (${updatedCount}/${Object.keys(bibleData).length - 1} games updated)`);

        return true;
    }

    async deployToFirebase(week) {
        console.log(`🚀 Deploying Week ${week} results to Firebase...`);

        const biblePath = `/Users/tonyweeg/nerdfootball-project/game-data/nfl_2025_week_${week}.json`;
        const bibleData = JSON.parse(fs.readFileSync(biblePath, 'utf8'));

        // Firebase Admin SDK would be used here for production deployment
        // For now, we'll create the deployment script
        const deploymentScript = `
// Firebase deployment for Week ${week} results
// Path: /artifacts/nerdfootball/public/data/nerdfootball_results/${week}

const admin = require('firebase-admin');
const weekData = ${JSON.stringify(bibleData, null, 2)};

async function deployWeek${week}Results() {
    try {
        await admin.firestore()
            .doc('artifacts/nerdfootball/public/data/nerdfootball_results/${week}')
            .set(weekData);
        console.log('✅ Week ${week} results deployed successfully');
    } catch (error) {
        console.error('❌ Deployment failed:', error);
    }
}

deployWeek${week}Results();
`;

        const deployPath = `/Users/tonyweeg/nerdfootball-project/deploy-week-${week}-results.js`;
        fs.writeFileSync(deployPath, deploymentScript);
        console.log(`📜 Created deployment script: ${deployPath}`);

        return true;
    }
}

// Main execution
async function main() {
    const week = process.argv[2];

    if (!week) {
        console.log('Usage: node espn-results-updater.js <week_number>');
        console.log('Example: node espn-results-updater.js 1');
        process.exit(1);
    }

    const updater = new ESPNResultsUpdater();

    console.log(`🎯 Starting results update for Week ${week}...`);

    const success = await updater.updateBibleWithResults(parseInt(week));
    if (success) {
        await updater.deployToFirebase(parseInt(week));
        console.log(`🏆 Week ${week} results update completed successfully!`);
    } else {
        console.log(`❌ Week ${week} results update failed`);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ESPNResultsUpdater;