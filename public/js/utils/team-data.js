/**
 * NerdFootball Centralized Team Data
 * Provides team name normalization and analytics database
 */

// NFL Team Name Mappings (32 teams)
const TEAM_MAPPINGS = {
    // Standard ESPN abbreviations to full names
    'ARI': 'Arizona Cardinals',
    'ATL': 'Atlanta Falcons',
    'BAL': 'Baltimore Ravens',
    'BUF': 'Buffalo Bills',
    'CAR': 'Carolina Panthers',
    'CHI': 'Chicago Bears',
    'CIN': 'Cincinnati Bengals',
    'CLE': 'Cleveland Browns',
    'DAL': 'Dallas Cowboys',
    'DEN': 'Denver Broncos',
    'DET': 'Detroit Lions',
    'GB': 'Green Bay Packers',
    'HOU': 'Houston Texans',
    'IND': 'Indianapolis Colts',
    'JAX': 'Jacksonville Jaguars',
    'KC': 'Kansas City Chiefs',
    'LV': 'Las Vegas Raiders',
    'LAC': 'Los Angeles Chargers',
    'LAR': 'Los Angeles Rams',
    'MIA': 'Miami Dolphins',
    'MIN': 'Minnesota Vikings',
    'NE': 'New England Patriots',
    'NO': 'New Orleans Saints',
    'NYG': 'New York Giants',
    'NYJ': 'New York Jets',
    'PHI': 'Philadelphia Eagles',
    'PIT': 'Pittsburgh Steelers',
    'SEA': 'Seattle Seahawks',
    'SF': 'San Francisco 49ers',
    'TB': 'Tampa Bay Buccaneers',
    'TEN': 'Tennessee Titans',
    'WSH': 'Washington Commanders',
    'WAS': 'Washington Commanders', // Alternate abbreviation

    // Common ESPN display variations
    'NO Saints': 'New Orleans Saints',
    'KC Chiefs': 'Kansas City Chiefs',
    'SF 49ers': 'San Francisco 49ers',
    'TB Buccaneers': 'Tampa Bay Buccaneers',
    'GB Packers': 'Green Bay Packers',

    // City-only mappings (for some ESPN formats)
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
    'Los Angeles Chargers': 'Los Angeles Chargers',
    'Los Angeles Rams': 'Los Angeles Rams',
    'Miami': 'Miami Dolphins',
    'Minnesota': 'Minnesota Vikings',
    'New England': 'New England Patriots',
    'New Orleans': 'New Orleans Saints',
    'New York Giants': 'New York Giants',
    'New York Jets': 'New York Jets',
    'Philadelphia': 'Philadelphia Eagles',
    'Pittsburgh': 'Pittsburgh Steelers',
    'Seattle': 'Seattle Seahawks',
    'San Francisco': 'San Francisco 49ers',
    'Tampa Bay': 'Tampa Bay Buccaneers',
    'Tennessee': 'Tennessee Titans',
    'Washington': 'Washington Commanders',

    // Team name only (for some formats)
    'Cardinals': 'Arizona Cardinals',
    'Falcons': 'Atlanta Falcons',
    'Ravens': 'Baltimore Ravens',
    'Bills': 'Buffalo Bills',
    'Panthers': 'Carolina Panthers',
    'Bears': 'Chicago Bears',
    'Bengals': 'Cincinnati Bengals',
    'Browns': 'Cleveland Browns',
    'Cowboys': 'Dallas Cowboys',
    'Broncos': 'Denver Broncos',
    'Lions': 'Detroit Lions',
    'Packers': 'Green Bay Packers',
    'Texans': 'Houston Texans',
    'Colts': 'Indianapolis Colts',
    'Jaguars': 'Jacksonville Jaguars',
    'Chiefs': 'Kansas City Chiefs',
    'Raiders': 'Las Vegas Raiders',
    'Chargers': 'Los Angeles Chargers',
    'Rams': 'Los Angeles Rams',
    'Dolphins': 'Miami Dolphins',
    'Vikings': 'Minnesota Vikings',
    'Patriots': 'New England Patriots',
    'Saints': 'New Orleans Saints',
    'Giants': 'New York Giants',
    'Jets': 'New York Jets',
    'Eagles': 'Philadelphia Eagles',
    'Steelers': 'Pittsburgh Steelers',
    'Seahawks': 'Seattle Seahawks',
    '49ers': 'San Francisco 49ers',
    'Buccaneers': 'Tampa Bay Buccaneers',
    'Titans': 'Tennessee Titans',
    'Commanders': 'Washington Commanders'
};

// Team Analytics Database for AI Predictions
const TEAM_ANALYTICS = {
    'Buffalo Bills': {
        offense: 92, defense: 88, recentForm: 85, homeAdvantage: 3.2,
        passingOffense: 91, rushingOffense: 78, passingDefense: 85, rushingDefense: 90,
        turnoverDiff: 8, injuryImpact: 2, coachingRating: 88, clutchFactor: 92
    },
    'Kansas City Chiefs': {
        offense: 95, defense: 82, recentForm: 95, homeAdvantage: 4.1,
        passingOffense: 98, rushingOffense: 76, passingDefense: 80, rushingDefense: 84,
        turnoverDiff: 12, injuryImpact: 1, coachingRating: 98, clutchFactor: 99
    },
    'San Francisco 49ers': {
        offense: 88, defense: 92, recentForm: 88, homeAdvantage: 3.8,
        passingOffense: 86, rushingOffense: 91, passingDefense: 93, rushingDefense: 90,
        turnoverDiff: 6, injuryImpact: 4, coachingRating: 94, clutchFactor: 87
    },
    'Philadelphia Eagles': {
        offense: 90, defense: 85, recentForm: 82, homeAdvantage: 3.5,
        passingOffense: 89, rushingOffense: 92, passingDefense: 83, rushingDefense: 87,
        turnoverDiff: 4, injuryImpact: 3, coachingRating: 86, clutchFactor: 84
    },
    'Dallas Cowboys': {
        offense: 82, defense: 78, recentForm: 85, homeAdvantage: 3.0,
        passingOffense: 84, rushingOffense: 79, passingDefense: 76, rushingDefense: 80,
        turnoverDiff: -2, injuryImpact: 3, coachingRating: 75, clutchFactor: 78
    },
    'Miami Dolphins': {
        offense: 85, defense: 75, recentForm: 70, homeAdvantage: 2.8,
        passingOffense: 88, rushingOffense: 65, passingDefense: 72, rushingDefense: 78,
        turnoverDiff: -1, injuryImpact: 6, coachingRating: 72, clutchFactor: 68
    },
    'Green Bay Packers': {
        offense: 88, defense: 85, recentForm: 80, homeAdvantage: 3.4,
        passingOffense: 92, rushingOffense: 72, passingDefense: 82, rushingDefense: 88,
        turnoverDiff: 3, injuryImpact: 2, coachingRating: 85, clutchFactor: 86
    },
    'Baltimore Ravens': {
        offense: 86, defense: 90, recentForm: 80, homeAdvantage: 3.1,
        passingOffense: 82, rushingOffense: 95, passingDefense: 88, rushingDefense: 92,
        turnoverDiff: 5, injuryImpact: 3, coachingRating: 82, clutchFactor: 85
    },
    'Seattle Seahawks': {
        offense: 82, defense: 80, recentForm: 78, homeAdvantage: 3.6,
        passingOffense: 85, rushingOffense: 75, passingDefense: 78, rushingDefense: 82,
        turnoverDiff: 2, injuryImpact: 4, coachingRating: 78, clutchFactor: 80
    },
    'Arizona Cardinals': {
        offense: 78, defense: 76, recentForm: 74, homeAdvantage: 2.9,
        passingOffense: 80, rushingOffense: 72, passingDefense: 74, rushingDefense: 78,
        turnoverDiff: -3, injuryImpact: 5, coachingRating: 72, clutchFactor: 75
    },
    'Minnesota Vikings': {
        offense: 84, defense: 82, recentForm: 85, homeAdvantage: 3.2,
        passingOffense: 87, rushingOffense: 78, passingDefense: 80, rushingDefense: 84,
        turnoverDiff: 4, injuryImpact: 3, coachingRating: 81, clutchFactor: 83
    },
    'Pittsburgh Steelers': {
        offense: 81, defense: 88, recentForm: 82, homeAdvantage: 3.8,
        passingOffense: 79, rushingOffense: 85, passingDefense: 86, rushingDefense: 90,
        turnoverDiff: 6, injuryImpact: 2, coachingRating: 85, clutchFactor: 87
    },
    'Washington Commanders': {
        offense: 79, defense: 77, recentForm: 76, homeAdvantage: 2.7,
        passingOffense: 81, rushingOffense: 74, passingDefense: 75, rushingDefense: 79,
        turnoverDiff: -1, injuryImpact: 4, coachingRating: 74, clutchFactor: 77
    },
    'Atlanta Falcons': {
        offense: 83, defense: 79, recentForm: 81, homeAdvantage: 3.1,
        passingOffense: 86, rushingOffense: 77, passingDefense: 77, rushingDefense: 81,
        turnoverDiff: 1, injuryImpact: 3, coachingRating: 76, clutchFactor: 79
    },
    'New Orleans Saints': {
        offense: 80, defense: 84, recentForm: 75, homeAdvantage: 3.5,
        passingOffense: 83, rushingOffense: 73, passingDefense: 82, rushingDefense: 86,
        turnoverDiff: 2, injuryImpact: 5, coachingRating: 77, clutchFactor: 78
    },
    'Cleveland Browns': {
        offense: 76, defense: 85, recentForm: 72, homeAdvantage: 3.0,
        passingOffense: 74, rushingOffense: 82, passingDefense: 83, rushingDefense: 87,
        turnoverDiff: -2, injuryImpact: 6, coachingRating: 73, clutchFactor: 74
    },
    'Detroit Lions': {
        offense: 89, defense: 78, recentForm: 88, homeAdvantage: 3.4,
        passingOffense: 91, rushingOffense: 84, passingDefense: 76, rushingDefense: 80,
        turnoverDiff: 7, injuryImpact: 2, coachingRating: 84, clutchFactor: 89
    },
    'Carolina Panthers': {
        offense: 73, defense: 79, recentForm: 70, homeAdvantage: 2.8,
        passingOffense: 75, rushingOffense: 68, passingDefense: 77, rushingDefense: 81,
        turnoverDiff: -5, injuryImpact: 7, coachingRating: 69, clutchFactor: 71
    },
    'New England Patriots': {
        offense: 77, defense: 81, recentForm: 74, homeAdvantage: 3.3,
        passingOffense: 76, rushingOffense: 79, passingDefense: 79, rushingDefense: 83,
        turnoverDiff: 1, injuryImpact: 4, coachingRating: 79, clutchFactor: 76
    },
    'Los Angeles Chargers': {
        offense: 85, defense: 83, recentForm: 82, homeAdvantage: 2.9,
        passingOffense: 88, rushingOffense: 78, passingDefense: 81, rushingDefense: 85,
        turnoverDiff: 3, injuryImpact: 3, coachingRating: 80, clutchFactor: 84
    },
    'New York Giants': {
        offense: 74, defense: 77, recentForm: 71, homeAdvantage: 3.1,
        passingOffense: 76, rushingOffense: 70, passingDefense: 75, rushingDefense: 79,
        turnoverDiff: -4, injuryImpact: 6, coachingRating: 71, clutchFactor: 73
    },
    'Tampa Bay Buccaneers': {
        offense: 87, defense: 80, recentForm: 84, homeAdvantage: 3.2,
        passingOffense: 92, rushingOffense: 75, passingDefense: 78, rushingDefense: 82,
        turnoverDiff: 4, injuryImpact: 3, coachingRating: 82, clutchFactor: 86
    },
    'Tennessee Titans': {
        offense: 75, defense: 78, recentForm: 73, homeAdvantage: 2.9,
        passingOffense: 77, rushingOffense: 71, passingDefense: 76, rushingDefense: 80,
        turnoverDiff: -3, injuryImpact: 5, coachingRating: 72, clutchFactor: 74
    },
    'Houston Texans': {
        offense: 86, defense: 82, recentForm: 87, homeAdvantage: 3.1,
        passingOffense: 89, rushingOffense: 79, passingDefense: 80, rushingDefense: 84,
        turnoverDiff: 5, injuryImpact: 2, coachingRating: 83, clutchFactor: 88
    },
    'Indianapolis Colts': {
        offense: 81, defense: 79, recentForm: 78, homeAdvantage: 3.0,
        passingOffense: 83, rushingOffense: 76, passingDefense: 77, rushingDefense: 81,
        turnoverDiff: 0, injuryImpact: 4, coachingRating: 76, clutchFactor: 79
    },
    'Los Angeles Rams': {
        offense: 84, defense: 81, recentForm: 79, homeAdvantage: 3.3,
        passingOffense: 87, rushingOffense: 77, passingDefense: 79, rushingDefense: 83,
        turnoverDiff: 2, injuryImpact: 4, coachingRating: 81, clutchFactor: 82
    },
    'Jacksonville Jaguars': {
        offense: 78, defense: 76, recentForm: 72, homeAdvantage: 2.8,
        passingOffense: 80, rushingOffense: 73, passingDefense: 74, rushingDefense: 78,
        turnoverDiff: -4, injuryImpact: 6, coachingRating: 70, clutchFactor: 75
    },
    'Chicago Bears': {
        offense: 79, defense: 83, recentForm: 77, homeAdvantage: 3.2,
        passingOffense: 78, rushingOffense: 82, passingDefense: 81, rushingDefense: 85,
        turnoverDiff: 1, injuryImpact: 4, coachingRating: 75, clutchFactor: 78
    },
    'Las Vegas Raiders': {
        offense: 76, defense: 80, recentForm: 73, homeAdvantage: 2.7,
        passingOffense: 78, rushingOffense: 72, passingDefense: 78, rushingDefense: 82,
        turnoverDiff: -2, injuryImpact: 5, coachingRating: 73, clutchFactor: 75
    },
    'New York Jets': {
        offense: 81, defense: 86, recentForm: 75, homeAdvantage: 3.1,
        passingOffense: 79, rushingOffense: 85, passingDefense: 84, rushingDefense: 88,
        turnoverDiff: 3, injuryImpact: 4, coachingRating: 76, clutchFactor: 79
    },
    'Cincinnati Bengals': {
        offense: 88, defense: 79, recentForm: 85, homeAdvantage: 3.0,
        passingOffense: 93, rushingOffense: 76, passingDefense: 77, rushingDefense: 81,
        turnoverDiff: 6, injuryImpact: 2, coachingRating: 82, clutchFactor: 87
    },
    'Denver Broncos': {
        offense: 83, defense: 84, recentForm: 80, homeAdvantage: 4.2,
        passingOffense: 82, rushingOffense: 85, passingDefense: 82, rushingDefense: 86,
        turnoverDiff: 4, injuryImpact: 3, coachingRating: 78, clutchFactor: 81
    }
};

// Default team analytics for teams not in database
const DEFAULT_TEAM_ANALYTICS = {
    offense: 75, defense: 75, recentForm: 75, homeAdvantage: 3.0,
    passingOffense: 75, rushingOffense: 75, passingDefense: 75, rushingDefense: 75,
    turnoverDiff: 0, injuryImpact: 5, coachingRating: 75, clutchFactor: 75
};

/**
 * Team Data Utility Class
 */
class TeamDataUtil {
    /**
     * Normalize team name to standard full name
     * @param {string} teamName - Any team name variant
     * @returns {string|null} Standardized full team name or null if not found
     */
    normalizeTeamName(teamName) {
        if (!teamName) return null;

        // Direct lookup
        if (TEAM_MAPPINGS[teamName]) {
            return TEAM_MAPPINGS[teamName];
        }

        // Case-insensitive lookup
        const lowerTeamName = teamName.toLowerCase();
        for (const [key, value] of Object.entries(TEAM_MAPPINGS)) {
            if (key.toLowerCase() === lowerTeamName) {
                return value;
            }
        }

        // Return original if no mapping found
        console.warn(`⚠️ TEAM_DATA: No mapping found for team "${teamName}"`);
        return teamName;
    }

    /**
     * Get team analytics data
     * @param {string} teamName - Team name (will be normalized)
     * @returns {Object} Team analytics object
     */
    getTeamAnalytics(teamName) {
        const normalizedName = this.normalizeTeamName(teamName);

        if (!normalizedName) {
            console.warn(`⚠️ TEAM_DATA: Cannot get analytics for null team name`);
            return DEFAULT_TEAM_ANALYTICS;
        }

        const analytics = TEAM_ANALYTICS[normalizedName];

        if (!analytics) {
            console.warn(`⚠️ TEAM_DATA: No analytics found for "${normalizedName}", using defaults`);
            return DEFAULT_TEAM_ANALYTICS;
        }

        return analytics;
    }

    /**
     * Get all team mappings
     * @returns {Object} Team mappings object
     */
    getTeamMappings() {
        return { ...TEAM_MAPPINGS };
    }

    /**
     * Get all team analytics
     * @returns {Object} Team analytics object
     */
    getAllTeamAnalytics() {
        return { ...TEAM_ANALYTICS };
    }

    /**
     * Get list of all standardized team names (32 teams)
     * @returns {Array<string>} Array of full team names
     */
    getAllTeamNames() {
        return Object.values(TEAM_MAPPINGS)
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort();
    }
}

// Create and export singleton instance
const teamData = new TeamDataUtil();

// Export for ES6 modules
export { TeamDataUtil, teamData, TEAM_MAPPINGS, TEAM_ANALYTICS, DEFAULT_TEAM_ANALYTICS };

// Also make available globally for non-module scripts
if (typeof window !== 'undefined') {
    window.TeamDataUtil = TeamDataUtil;
    window.teamData = teamData;
    window.TEAM_MAPPINGS = TEAM_MAPPINGS;
    window.TEAM_ANALYTICS = TEAM_ANALYTICS;
}
