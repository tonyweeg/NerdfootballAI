
// Firebase deployment for Week 1 results
// Path: /artifacts/nerdfootball/public/data/nerdfootball_results/1

const admin = require('firebase-admin');
const weekData = {
  "101": {
    "a": "Green Bay Packers",
    "h": "Philadelphia Eagles",
    "dt": "2025-09-06T00:15:00Z",
    "stadium": "Arena Corinthians",
    "awayScore": null,
    "homeScore": null,
    "status": "scheduled",
    "winner": null
  },
  "102": {
    "a": "Buffalo Bills",
    "h": "Arizona Cardinals",
    "dt": "2025-09-07T17:00:00Z",
    "stadium": "State Farm Stadium",
    "awayScore": null,
    "homeScore": null,
    "status": "scheduled",
    "winner": null
  },
  "103": {
    "a": "Pittsburgh Steelers",
    "h": "Atlanta Falcons",
    "dt": "2025-09-07T17:00:00Z",
    "stadium": "Mercedes-Benz Stadium",
    "awayScore": null,
    "homeScore": null,
    "status": "scheduled",
    "winner": null
  },
  "104": {
    "a": "Miami Dolphins",
    "h": "Jacksonville Jaguars",
    "dt": "2025-09-07T17:00:00Z",
    "stadium": "EverBank Stadium",
    "awayScore": null,
    "homeScore": null,
    "status": "scheduled",
    "winner": null
  },
  "105": {
    "a": "Cleveland Browns",
    "h": "Dallas Cowboys",
    "dt": "2025-09-07T17:00:00Z",
    "stadium": "AT&T Stadium",
    "awayScore": null,
    "homeScore": null,
    "status": "scheduled",
    "winner": null
  },
  "106": {
    "a": "New England Patriots",
    "h": "Cincinnati Bengals",
    "dt": "2025-09-07T17:00:00Z",
    "stadium": "Paycor Stadium",
    "awayScore": null,
    "homeScore": null,
    "status": "scheduled",
    "winner": null
  },
  "107": {
    "a": "Indianapolis Colts",
    "h": "Houston Texans",
    "dt": "2025-09-07T17:00:00Z",
    "stadium": "NRG Stadium",
    "awayScore": null,
    "homeScore": null,
    "status": "scheduled",
    "winner": null
  },
  "108": {
    "a": "Minnesota Vikings",
    "h": "New York Giants",
    "dt": "2025-09-07T17:00:00Z",
    "stadium": "MetLife Stadium",
    "awayScore": null,
    "homeScore": null,
    "status": "scheduled",
    "winner": null
  },
  "109": {
    "a": "Tennessee Titans",
    "h": "Chicago Bears",
    "dt": "2025-09-07T17:00:00Z",
    "stadium": "Soldier Field",
    "awayScore": null,
    "homeScore": null,
    "status": "scheduled",
    "winner": null
  },
  "110": {
    "a": "Carolina Panthers",
    "h": "New Orleans Saints",
    "dt": "2025-09-07T20:05:00Z",
    "stadium": "Caesars Superdome",
    "awayScore": null,
    "homeScore": null,
    "status": "scheduled",
    "winner": null
  },
  "111": {
    "a": "Las Vegas Raiders",
    "h": "Los Angeles Chargers",
    "dt": "2025-09-07T20:05:00Z",
    "stadium": "SoFi Stadium",
    "awayScore": null,
    "homeScore": null,
    "status": "scheduled",
    "winner": null
  },
  "112": {
    "a": "Denver Broncos",
    "h": "Seattle Seahawks",
    "dt": "2025-09-07T20:25:00Z",
    "stadium": "Lumen Field",
    "awayScore": null,
    "homeScore": null,
    "status": "scheduled",
    "winner": null
  },
  "113": {
    "a": "Washington Commanders",
    "h": "Tampa Bay Buccaneers",
    "dt": "2025-09-08T00:20:00Z",
    "stadium": "Raymond James Stadium",
    "awayScore": null,
    "homeScore": null,
    "status": "scheduled",
    "winner": null
  },
  "114": {
    "a": "Los Angeles Rams",
    "h": "Detroit Lions",
    "dt": "2025-09-09T00:15:00Z",
    "stadium": "Ford Field",
    "awayScore": null,
    "homeScore": null,
    "status": "scheduled",
    "winner": null
  },
  "115": {
    "a": "New York Jets",
    "h": "San Francisco 49ers",
    "dt": "2025-09-09T00:15:00Z",
    "stadium": "Levi's Stadium",
    "awayScore": null,
    "homeScore": null,
    "status": "scheduled",
    "winner": null
  },
  "116": {
    "a": "Kansas City Chiefs",
    "h": "Baltimore Ravens",
    "dt": "2025-09-09T00:15:00Z",
    "stadium": "M&T Bank Stadium",
    "awayScore": null,
    "homeScore": null,
    "status": "scheduled",
    "winner": null
  },
  "_metadata": {
    "generatedAt": "2025-09-23T15:32:56.383Z",
    "source": "manual_verified",
    "verified": true,
    "totalGames": 16,
    "week": 1,
    "correctedBy": "Claude-Bible-Generator",
    "lastUpdated": "2025-09-23T15:47:27.198Z",
    "resultsUpdated": true,
    "completedGames": 0
  }
};

async function deployWeek1Results() {
    try {
        await admin.firestore()
            .doc('artifacts/nerdfootball/public/data/nerdfootball_results/1')
            .set(weekData);
        console.log('✅ Week 1 results deployed successfully');
    } catch (error) {
        console.error('❌ Deployment failed:', error);
    }
}

deployWeek1Results();
