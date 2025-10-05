const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!initializeApp.apps || initializeApp.apps.length === 0) {
    initializeApp();
}
const db = getFirestore();

/**
 * Firebase Function to fix Week 3 NFL game data with official results
 * Week 3: Sep 17-23, 2025
 */
exports.fixWeek3Data = onRequest(
    {
        cors: true,
        timeoutSeconds: 60,
        memory: '512MiB',
        invoker: 'public'
    },
    async (req, res) => {
        console.log('🏈 Fixing Week 3 NFL game data with official results...');

        const week3Data = {
            // Thursday, September 18, 2025
            "301": {
                "a": "Miami Dolphins",
                "h": "Buffalo Bills",
                "awayScore": 21,
                "homeScore": 31,
                "status": "final",
                "winner": "Buffalo Bills"
            },

            // Sunday, September 21, 2025
            "302": {
                "a": "Green Bay Packers",
                "h": "Cleveland Browns",
                "awayScore": 10,
                "homeScore": 13,
                "status": "final",
                "winner": "Cleveland Browns"
            },
            "303": {
                "a": "Indianapolis Colts",
                "h": "Tennessee Titans",
                "awayScore": 41,
                "homeScore": 20,
                "status": "final",
                "winner": "Indianapolis Colts"
            },
            "304": {
                "a": "Cincinnati Bengals",
                "h": "Minnesota Vikings",
                "awayScore": 10,
                "homeScore": 48,
                "status": "final",
                "winner": "Minnesota Vikings"
            },
            "305": {
                "a": "Pittsburgh Steelers",
                "h": "New England Patriots",
                "awayScore": 21,
                "homeScore": 14,
                "status": "final",
                "winner": "Pittsburgh Steelers"
            },
            "306": {
                "a": "Los Angeles Rams",
                "h": "Philadelphia Eagles",
                "awayScore": 26,
                "homeScore": 33,
                "status": "final",
                "winner": "Philadelphia Eagles"
            },
            "307": {
                "a": "New York Jets",
                "h": "Tampa Bay Buccaneers",
                "awayScore": 27,
                "homeScore": 29,
                "status": "final",
                "winner": "Tampa Bay Buccaneers"
            },
            "308": {
                "a": "Las Vegas Raiders",
                "h": "Washington Commanders",
                "awayScore": 24,
                "homeScore": 41,
                "status": "final",
                "winner": "Washington Commanders"
            },
            "309": {
                "a": "Atlanta Falcons",
                "h": "Carolina Panthers",
                "awayScore": 0,
                "homeScore": 30,
                "status": "final",
                "winner": "Carolina Panthers"
            },
            "310": {
                "a": "Houston Texans",
                "h": "Jacksonville Jaguars",
                "awayScore": 10,
                "homeScore": 17,
                "status": "final",
                "winner": "Jacksonville Jaguars"
            },
            "311": {
                "a": "Denver Broncos",
                "h": "Los Angeles Chargers",
                "awayScore": 20,
                "homeScore": 23,
                "status": "final",
                "winner": "Los Angeles Chargers"
            },
            "312": {
                "a": "New Orleans Saints",
                "h": "Seattle Seahawks",
                "awayScore": 13,
                "homeScore": 44,
                "status": "final",
                "winner": "Seattle Seahawks"
            },
            "313": {
                "a": "Dallas Cowboys",
                "h": "Chicago Bears",
                "awayScore": 14,
                "homeScore": 31,
                "status": "final",
                "winner": "Chicago Bears"
            },
            "314": {
                "a": "Arizona Cardinals",
                "h": "San Francisco 49ers",
                "awayScore": 15,
                "homeScore": 16,
                "status": "final",
                "winner": "San Francisco 49ers"
            },
            "315": {
                "a": "Kansas City Chiefs",
                "h": "New York Giants",
                "awayScore": 22,
                "homeScore": 9,
                "status": "final",
                "winner": "Kansas City Chiefs"
            },

            // Monday, September 22, 2025
            "316": {
                "a": "Detroit Lions",
                "h": "Baltimore Ravens",
                "awayScore": 38,
                "homeScore": 30,
                "status": "final",
                "winner": "Detroit Lions"
            }
        };

        try {
            const docRef = db.doc('artifacts/nerdfootball/public/data/nerdfootball_games/3');
            await docRef.set(week3Data);

            const winners = [
                'Buffalo Bills', 'Cleveland Browns', 'Indianapolis Colts', 'Minnesota Vikings',
                'Pittsburgh Steelers', 'Philadelphia Eagles', 'Tampa Bay Buccaneers',
                'Washington Commanders', 'Carolina Panthers', 'Jacksonville Jaguars',
                'Los Angeles Chargers', 'Seattle Seahawks', 'Chicago Bears',
                'San Francisco 49ers', 'Kansas City Chiefs', 'Detroit Lions'
            ];

            console.log('✅ Week 3 NFL data fixed with official results!');
            console.log('🏆 Week 3 Winners:', winners.join(', '));

            res.status(200).json({
                success: true,
                message: 'Week 3 NFL data fixed successfully',
                week: 3,
                gamesCount: Object.keys(week3Data).length,
                winners: winners,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Error fixing Week 3 data:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
);