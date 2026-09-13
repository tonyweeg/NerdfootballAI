const fs = require('fs');
const path = require('path');
const TeamLogos = require('../public/js/utils/team-logos.js');

const EXPECTED = {
    'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL', 'Baltimore Ravens': 'BAL', 'Buffalo Bills': 'BUF',
    'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI', 'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE',
    'Dallas Cowboys': 'DAL', 'Denver Broncos': 'DEN', 'Detroit Lions': 'DET', 'Green Bay Packers': 'GB',
    'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX', 'Kansas City Chiefs': 'KC',
    'Las Vegas Raiders': 'LV', 'Los Angeles Chargers': 'LAC', 'Los Angeles Rams': 'LAR', 'Miami Dolphins': 'MIA',
    'Minnesota Vikings': 'MIN', 'New England Patriots': 'NE', 'New Orleans Saints': 'NO', 'New York Giants': 'NYG',
    'New York Jets': 'NYJ', 'Philadelphia Eagles': 'PHI', 'Pittsburgh Steelers': 'PIT', 'San Francisco 49ers': 'SF',
    'Seattle Seahawks': 'SEA', 'Tampa Bay Buccaneers': 'TB', 'Tennessee Titans': 'TEN', 'Washington Commanders': 'WSH'
};

describe('team-logos', () => {
    test('all 32 teams map to their ESPN code', () => {
        expect(Object.keys(EXPECTED)).toHaveLength(32);
        for (const [team, code] of Object.entries(EXPECTED)) {
            expect(TeamLogos.abbreviation(team)).toBe(code);
        }
    });

    test('logo URLs are the ESPN 500px team logos', () => {
        expect(TeamLogos.logoUrl('Buffalo Bills')).toBe('https://a.espncdn.com/i/teamlogos/nfl/500/BUF.png');
        for (const team of Object.keys(EXPECTED)) {
            expect(TeamLogos.logoUrl(team)).toMatch(/^https:\/\/a\.espncdn\.com\/i\/teamlogos\/nfl\/500\/[A-Z]{2,3}\.png$/);
        }
    });

    test('surrounding whitespace is ignored', () => {
        expect(TeamLogos.abbreviation('  Detroit Lions ')).toBe('DET');
    });

    test('unknown or missing names give null, never a broken image URL', () => {
        for (const bad of ['TBD', '', 'Detroit', null, undefined, 42, { team: 'Detroit Lions' }]) {
            expect(TeamLogos.abbreviation(bad)).toBeNull();
            expect(TeamLogos.logoUrl(bad)).toBeNull();
        }
    });

    test('every team the survivor picker offers has a logo', () => {
        const html = fs.readFileSync(path.join(__dirname, '../public/NerdSurvivorPicks.html'), 'utf8');
        const block = html.match(/const NFL_TEAMS = \[([\s\S]*?)\];/);
        expect(block).not.toBeNull();
        const teams = [...block[1].matchAll(/'([^']+)'/g)].map(([, t]) => t);
        expect(teams).toHaveLength(32);
        expect(teams.filter((t) => !TeamLogos.logoUrl(t))).toEqual([]);
    });
});
