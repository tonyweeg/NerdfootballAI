// NFL team logos (NERD-31): full team name → ESPN code → 500px logo URL.
// One map for every page that shows helmets. Unknown names return null so a
// page can skip the image instead of rendering a broken one.
(function () {
    'use strict';

    const CODES = Object.freeze({
        'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL', 'Baltimore Ravens': 'BAL', 'Buffalo Bills': 'BUF',
        'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI', 'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE',
        'Dallas Cowboys': 'DAL', 'Denver Broncos': 'DEN', 'Detroit Lions': 'DET', 'Green Bay Packers': 'GB',
        'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX', 'Kansas City Chiefs': 'KC',
        'Las Vegas Raiders': 'LV', 'Los Angeles Chargers': 'LAC', 'Los Angeles Rams': 'LAR', 'Miami Dolphins': 'MIA',
        'Minnesota Vikings': 'MIN', 'New England Patriots': 'NE', 'New Orleans Saints': 'NO', 'New York Giants': 'NYG',
        'New York Jets': 'NYJ', 'Philadelphia Eagles': 'PHI', 'Pittsburgh Steelers': 'PIT', 'San Francisco 49ers': 'SF',
        'Seattle Seahawks': 'SEA', 'Tampa Bay Buccaneers': 'TB', 'Tennessee Titans': 'TEN', 'Washington Commanders': 'WSH'
    });

    function abbreviation(teamName) {
        if (typeof teamName !== 'string') return null;
        return CODES[teamName.trim()] || null;
    }

    function logoUrl(teamName) {
        const code = abbreviation(teamName);
        return code ? `https://a.espncdn.com/i/teamlogos/nfl/500/${code}.png` : null;
    }

    const TeamLogos = Object.freeze({ abbreviation, logoUrl });

    if (typeof window !== 'undefined') window.TeamLogos = TeamLogos;
    if (typeof module !== 'undefined' && module.exports) module.exports = TeamLogos;
})();
