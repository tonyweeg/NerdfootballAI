const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });

/**
 * Update Week 3 Firestore data with real game results from ESPN
 * Based on the scoreboard data provided
 */

async function updateWeek3WithRealResults() {
    console.log('🏈 UPDATING WEEK 3 WITH REAL ESPN RESULTS...');

    const week3Games = {
        "301": {
            id: "301",
            a: "Miami Dolphins",
            h: "Buffalo Bills",
            dt: "2025-09-18T20:15:00Z", // Thursday night
            stadium: "Highmark Stadium",
            awayScore: 21,
            homeScore: 31,
            status: "final",
            winner: "Buffalo Bills"
        },
        "302": {
            id: "302",
            a: "Green Bay Packers",
            h: "Cleveland Browns",
            dt: "2025-09-21T17:00:00Z",
            stadium: "Cleveland Browns Stadium",
            awayScore: 10,
            homeScore: 13,
            status: "final",
            winner: "Cleveland Browns"
        },
        "303": {
            id: "303",
            a: "Indianapolis Colts",
            h: "Tennessee Titans",
            dt: "2025-09-21T17:00:00Z",
            stadium: "Nissan Stadium",
            awayScore: 41,
            homeScore: 20,
            status: "final",
            winner: "Indianapolis Colts"
        },
        "304": {
            id: "304",
            a: "Cincinnati Bengals",
            h: "Minnesota Vikings",
            dt: "2025-09-21T17:00:00Z",
            stadium: "U.S. Bank Stadium",
            awayScore: 10,
            homeScore: 48,
            status: "final",
            winner: "Minnesota Vikings"
        },
        "305": {
            id: "305",
            a: "Pittsburgh Steelers",
            h: "New England Patriots",
            dt: "2025-09-21T17:00:00Z",
            stadium: "Gillette Stadium",
            awayScore: 21,
            homeScore: 14,
            status: "final",
            winner: "Pittsburgh Steelers"
        },
        "306": {
            id: "306",
            a: "Los Angeles Rams",
            h: "Philadelphia Eagles",
            dt: "2025-09-21T17:00:00Z",
            stadium: "Lincoln Financial Field",
            awayScore: 26,
            homeScore: 33,
            status: "final",
            winner: "Philadelphia Eagles"
        },
        "307": {
            id: "307",
            a: "New York Jets",
            h: "Tampa Bay Buccaneers",
            dt: "2025-09-21T17:00:00Z",
            stadium: "Raymond James Stadium",
            awayScore: 27,
            homeScore: 29,
            status: "final",
            winner: "Tampa Bay Buccaneers"
        },
        "308": {
            id: "308",
            a: "Las Vegas Raiders",
            h: "Washington Commanders",
            dt: "2025-09-21T17:00:00Z",
            stadium: "FedExField",
            awayScore: 24,
            homeScore: 41,
            status: "final",
            winner: "Washington Commanders"
        },
        "309": {
            id: "309",
            a: "Atlanta Falcons",
            h: "Carolina Panthers",
            dt: "2025-09-21T17:00:00Z",
            stadium: "Bank of America Stadium",
            awayScore: 0,
            homeScore: 30,
            status: "final",
            winner: "Carolina Panthers"
        },
        "310": {
            id: "310",
            a: "Houston Texans",
            h: "Jacksonville Jaguars",
            dt: "2025-09-21T17:00:00Z",
            stadium: "EverBank Stadium",
            awayScore: 10,
            homeScore: 17,
            status: "final",
            winner: "Jacksonville Jaguars"
        },
        "311": {
            id: "311",
            a: "Denver Broncos",
            h: "Los Angeles Chargers",
            dt: "2025-09-21T20:05:00Z",
            stadium: "SoFi Stadium",
            awayScore: 20,
            homeScore: 23,
            status: "final",
            winner: "Los Angeles Chargers"
        },
        "312": {
            id: "312",
            a: "New Orleans Saints",
            h: "Seattle Seahawks",
            dt: "2025-09-21T20:05:00Z",
            stadium: "Lumen Field",
            awayScore: 13,
            homeScore: 44,
            status: "final",
            winner: "Seattle Seahawks"
        },
        "313": {
            id: "313",
            a: "Dallas Cowboys",
            h: "Chicago Bears",
            dt: "2025-09-21T20:25:00Z",
            stadium: "Soldier Field",
            awayScore: 14,
            homeScore: 31,
            status: "final",
            winner: "Chicago Bears"
        },
        "314": {
            id: "314",
            a: "Arizona Cardinals",
            h: "San Francisco 49ers",
            dt: "2025-09-21T20:25:00Z",
            stadium: "Levi's Stadium",
            awayScore: 15,
            homeScore: 16,
            status: "final",
            winner: "San Francisco 49ers"
        },
        "315": {
            id: "315",
            a: "Kansas City Chiefs",
            h: "New York Giants",
            dt: "2025-09-21T20:20:00Z",
            stadium: "MetLife Stadium",
            awayScore: 22,
            homeScore: 9,
            status: "final",
            winner: "Kansas City Chiefs"
        },
        "316": {
            id: "316",
            a: "Detroit Lions",
            h: "Baltimore Ravens",
            dt: "2025-09-22T20:15:00Z", // Monday night
            stadium: "M&T Bank Stadium",
            awayScore: 38,
            homeScore: 30,
            status: "final",
            winner: "Detroit Lions"
        }
    };

    try {
        // Update Week 3 Firestore document
        const docPath = 'artifacts/nerdfootball/public/data/nerdfootball_games/3';
        const docRef = admin.firestore().doc(docPath);

        // Create complete Week 3 data with metadata
        const completeWeek3Data = {
            ...week3Games,
            _metadata: {
                week: 3,
                totalGames: 16,
                lastUpdated: new Date().toISOString(),
                dataSource: 'espn-scoreboard-real-results',
                updateDate: '2025-09-26',
                allGamesComplete: true
            }
        };

        await docRef.set(completeWeek3Data);

        console.log('✅ Week 3 updated with all 16 real game results!');
        console.log(`📊 Games with winners: ${Object.keys(week3Games).length}/16`);

        // Verify update
        const verifySnap = await docRef.get();
        if (verifySnap.exists) {
            const data = verifySnap.data();
            const gamesWithWinners = Object.keys(data).filter(k => !k.startsWith('_') && data[k].winner).length;
            console.log(`✅ Verification: ${gamesWithWinners} games have winners`);
        }

    } catch (error) {
        console.error('❌ Error updating Week 3:', error.message);
    }

    process.exit(0);
}

updateWeek3WithRealResults().catch(console.error);