/**
 * NERDAI ANALYTICS ENGINE
 * Comprehensive NFL statistical analysis and data processing for AI predictions
 */

class NerdAIAnalyticsEngine {
    constructor() {
        this.currentSeason = 2025;
        this.currentWeek = 4;
        this.teamStats = new Map();
        this.gameHistory = new Map();
        this.injuryReports = new Map();
        this.weatherData = new Map();
    }

    /**
     * Initialize the analytics engine with current season data
     */
    async initialize() {
        console.log('🧠 Initializing NERDAI Analytics Engine...');

        try {
            await this.loadTeamStats();
            await this.loadGameHistory();
            await this.loadInjuryReports();
            console.log('✅ NERDAI Analytics Engine initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize NERDAI Analytics Engine:', error);
            throw error;
        }
    }

    /**
     * Load current season team statistics
     */
    async loadTeamStats() {
        console.log('📊 Loading team statistics...');

        // Sample team stats structure - will be populated from real data
        const teams = [
            'Arizona Cardinals', 'Atlanta Falcons', 'Baltimore Ravens', 'Buffalo Bills',
            'Carolina Panthers', 'Chicago Bears', 'Cincinnati Bengals', 'Cleveland Browns',
            'Dallas Cowboys', 'Denver Broncos', 'Detroit Lions', 'Green Bay Packers',
            'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars', 'Kansas City Chiefs',
            'Las Vegas Raiders', 'Los Angeles Chargers', 'Los Angeles Rams', 'Miami Dolphins',
            'Minnesota Vikings', 'New England Patriots', 'New Orleans Saints', 'New York Giants',
            'New York Jets', 'Philadelphia Eagles', 'Pittsburgh Steelers', 'San Francisco 49ers',
            'Seattle Seahawks', 'Tampa Bay Buccaneers', 'Tennessee Titans', 'Washington Commanders'
        ];

        for (const team of teams) {
            this.teamStats.set(team, this.generateSampleTeamStats(team));
        }

        console.log(`✅ Loaded stats for ${teams.length} teams`);
    }

    /**
     * Generate sample team statistics (will be replaced with real data)
     */
    generateSampleTeamStats(teamName) {
        return {
            teamName: teamName,
            record: { wins: Math.floor(Math.random() * 4), losses: Math.floor(Math.random() * 4) },

            // Offensive stats
            offense: {
                pointsPerGame: 20 + Math.random() * 15,
                yardsPerGame: 300 + Math.random() * 150,
                passingYardsPerGame: 200 + Math.random() * 100,
                rushingYardsPerGame: 100 + Math.random() * 50,
                turnoversPerGame: Math.random() * 2,
                redZoneEfficiency: 0.4 + Math.random() * 0.4,
                thirdDownConversion: 0.3 + Math.random() * 0.3
            },

            // Defensive stats
            defense: {
                pointsAllowedPerGame: 15 + Math.random() * 15,
                yardsAllowedPerGame: 300 + Math.random() * 150,
                passingYardsAllowed: 200 + Math.random() * 100,
                rushingYardsAllowed: 100 + Math.random() * 50,
                takeawaysPerGame: Math.random() * 2,
                redZoneDefense: 0.4 + Math.random() * 0.4,
                thirdDownDefense: 0.3 + Math.random() * 0.3
            },

            // Special teams
            specialTeams: {
                kickReturnAvg: 20 + Math.random() * 10,
                puntReturnAvg: 8 + Math.random() * 5,
                fieldGoalPercentage: 0.7 + Math.random() * 0.25
            },

            // Situational stats
            situational: {
                homeRecord: { wins: Math.floor(Math.random() * 3), losses: Math.floor(Math.random() * 3) },
                awayRecord: { wins: Math.floor(Math.random() * 3), losses: Math.floor(Math.random() * 3) },
                divisionRecord: { wins: Math.floor(Math.random() * 2), losses: Math.floor(Math.random() * 2) },
                lastFiveGames: Math.floor(Math.random() * 6), // wins out of last 5
                averageMarginOfVictory: -10 + Math.random() * 20,
                strengthOfSchedule: 0.4 + Math.random() * 0.2
            }
        };
    }

    /**
     * Load historical game data for head-to-head analysis
     */
    async loadGameHistory() {
        console.log('📈 Loading historical game data...');

        // Sample historical data structure
        // In real implementation, this would come from database
        this.gameHistory.set('KC_vs_LAC', {
            allTimeRecord: { team1Wins: 65, team2Wins: 58, ties: 1 },
            recentGames: [
                { date: '2024-12-29', team1Score: 27, team2Score: 17, location: 'KC' },
                { date: '2024-10-27', team1Score: 31, team2Score: 17, location: 'LAC' },
                { date: '2024-01-07', team1Score: 13, team2Score: 12, location: 'KC' }
            ],
            averagePointDifferential: 8.2,
            homeFieldAdvantage: 3.1
        });

        console.log('✅ Historical game data loaded');
    }

    /**
     * Load current injury reports
     */
    async loadInjuryReports() {
        console.log('🏥 Loading injury reports...');

        // Sample injury data - would be updated from real injury reports
        this.injuryReports.set('Kansas City Chiefs', [
            { player: 'Patrick Mahomes', position: 'QB', status: 'Questionable', injury: 'Ankle' },
            { player: 'Travis Kelce', position: 'TE', status: 'Probable', injury: 'Knee' }
        ]);

        console.log('✅ Injury reports loaded');
    }

    /**
     * Analyze matchup between two teams
     */
    async analyzeMatchup(homeTeam, awayTeam) {
        console.log(`🔍 Analyzing matchup: ${awayTeam} @ ${homeTeam}`);

        const homeStats = this.teamStats.get(homeTeam);
        const awayStats = this.teamStats.get(awayTeam);

        if (!homeStats || !awayStats) {
            throw new Error(`Team stats not found for ${homeTeam} or ${awayTeam}`);
        }

        const analysis = {
            matchupKey: `${this.getTeamAbbreviation(awayTeam)}_vs_${this.getTeamAbbreviation(homeTeam)}`,
            homeTeam: homeTeam,
            awayTeam: awayTeam,

            // Offensive vs Defensive matchups
            offenseVsDefense: {
                homeOffenseVsAwayDefense: this.calculateMatchupAdvantage(homeStats.offense, awayStats.defense),
                awayOffenseVsHomeDefense: this.calculateMatchupAdvantage(awayStats.offense, homeStats.defense)
            },

            // Special situations
            situationalFactors: {
                homeFieldAdvantage: this.calculateHomeFieldAdvantage(homeStats),
                recentForm: this.compareRecentForm(homeStats, awayStats),
                headToHead: this.analyzeHeadToHead(homeTeam, awayTeam)
            },

            // Injury impact
            injuryImpact: {
                homeTeamImpact: this.assessInjuryImpact(homeTeam),
                awayTeamImpact: this.assessInjuryImpact(awayTeam)
            },

            // Overall prediction metrics
            prediction: {
                homeWinProbability: 0.5, // Will be calculated by ML models
                predictedSpread: 0,      // Will be calculated by ML models
                confidence: 0.5,         // How confident we are in this prediction
                keyFactors: []           // Main factors influencing prediction
            }
        };

        // Calculate basic win probability based on stats
        analysis.prediction.homeWinProbability = this.calculateBasicWinProbability(homeStats, awayStats);
        analysis.prediction.predictedSpread = this.calculatePredictedSpread(homeStats, awayStats);
        analysis.prediction.keyFactors = this.identifyKeyFactors(analysis);

        console.log(`✅ Matchup analysis complete: ${homeTeam} vs ${awayTeam}`);
        return analysis;
    }

    /**
     * Calculate matchup advantage between offense and defense
     */
    calculateMatchupAdvantage(offense, defense) {
        const offenseScore = (
            offense.pointsPerGame * 0.3 +
            offense.yardsPerGame * 0.001 +
            offense.redZoneEfficiency * 50 +
            offense.thirdDownConversion * 50 +
            (2 - offense.turnoversPerGame) * 10
        );

        const defenseScore = (
            (35 - defense.pointsAllowedPerGame) * 0.3 +
            (450 - defense.yardsAllowedPerGame) * 0.001 +
            defense.redZoneDefense * 50 +
            defense.thirdDownDefense * 50 +
            defense.takeawaysPerGame * 10
        );

        return {
            offenseRating: offenseScore,
            defenseRating: defenseScore,
            advantage: offenseScore - defenseScore,
            category: this.categorizeAdvantage(offenseScore - defenseScore)
        };
    }

    /**
     * Calculate home field advantage
     */
    calculateHomeFieldAdvantage(homeStats) {
        const homeWinPct = homeStats.situational.homeRecord.wins /
                          (homeStats.situational.homeRecord.wins + homeStats.situational.homeRecord.losses);
        const awayWinPct = homeStats.situational.awayRecord.wins /
                          (homeStats.situational.awayRecord.wins + homeStats.situational.awayRecord.losses);

        return {
            homeWinPercentage: homeWinPct,
            awayWinPercentage: awayWinPct,
            homeFieldBonus: (homeWinPct - awayWinPct) * 100,
            description: homeWinPct > awayWinPct + 0.2 ? 'Strong' :
                        homeWinPct > awayWinPct ? 'Moderate' : 'Weak'
        };
    }

    /**
     * Compare recent form between teams
     */
    compareRecentForm(homeStats, awayStats) {
        return {
            homeTeamForm: homeStats.situational.lastFiveGames,
            awayTeamForm: awayStats.situational.lastFiveGames,
            advantage: homeStats.situational.lastFiveGames - awayStats.situational.lastFiveGames,
            description: this.describeFormAdvantage(
                homeStats.situational.lastFiveGames - awayStats.situational.lastFiveGames
            )
        };
    }

    /**
     * Analyze head-to-head history
     */
    analyzeHeadToHead(homeTeam, awayTeam) {
        const matchupKey = `${this.getTeamAbbreviation(awayTeam)}_vs_${this.getTeamAbbreviation(homeTeam)}`;
        const history = this.gameHistory.get(matchupKey);

        if (!history) {
            return {
                available: false,
                note: 'No recent head-to-head data available'
            };
        }

        return {
            available: true,
            allTimeRecord: history.allTimeRecord,
            recentTrend: this.analyzeRecentTrend(history.recentGames),
            averageMargin: history.averagePointDifferential,
            homeAdvantage: history.homeFieldAdvantage
        };
    }

    /**
     * Assess injury impact on team performance
     */
    assessInjuryImpact(teamName) {
        const injuries = this.injuryReports.get(teamName) || [];

        let impactScore = 0;
        const keyInjuries = [];

        injuries.forEach(injury => {
            let playerImpact = 0;

            // Position importance weights
            const positionWeights = {
                'QB': 10, 'RB': 5, 'WR': 4, 'TE': 3,
                'OL': 4, 'DL': 3, 'LB': 3, 'CB': 4, 'S': 3, 'K': 1
            };

            playerImpact = positionWeights[injury.position] || 2;

            // Status multipliers
            if (injury.status === 'Out') playerImpact *= 1.0;
            else if (injury.status === 'Doubtful') playerImpact *= 0.7;
            else if (injury.status === 'Questionable') playerImpact *= 0.4;
            else if (injury.status === 'Probable') playerImpact *= 0.1;

            impactScore += playerImpact;

            if (playerImpact > 2) {
                keyInjuries.push(injury);
            }
        });

        return {
            totalImpact: impactScore,
            keyInjuries: keyInjuries,
            severity: impactScore > 8 ? 'High' : impactScore > 4 ? 'Moderate' : 'Low'
        };
    }

    /**
     * Calculate basic win probability based on team stats
     */
    calculateBasicWinProbability(homeStats, awayStats) {
        // Simple rating system based on multiple factors
        let homeRating = 0;
        let awayRating = 0;

        // Offensive ratings
        homeRating += homeStats.offense.pointsPerGame * 2;
        awayRating += awayStats.offense.pointsPerGame * 2;

        // Defensive ratings (lower points allowed = better)
        homeRating += (35 - homeStats.defense.pointsAllowedPerGame) * 2;
        awayRating += (35 - awayStats.defense.pointsAllowedPerGame) * 2;

        // Recent form
        homeRating += homeStats.situational.lastFiveGames * 5;
        awayRating += awayStats.situational.lastFiveGames * 5;

        // Home field advantage
        homeRating += 3; // Standard 3-point home field advantage

        // Convert to probability
        const totalRating = homeRating + awayRating;
        return homeRating / totalRating;
    }

    /**
     * Calculate predicted point spread
     */
    calculatePredictedSpread(homeStats, awayStats) {
        const homePointDiff = homeStats.offense.pointsPerGame - homeStats.defense.pointsAllowedPerGame;
        const awayPointDiff = awayStats.offense.pointsPerGame - awayStats.defense.pointsAllowedPerGame;

        // Add home field advantage
        const rawSpread = homePointDiff - awayPointDiff + 3;

        // Round to nearest 0.5
        return Math.round(rawSpread * 2) / 2;
    }

    /**
     * Identify key factors influencing the prediction
     */
    identifyKeyFactors(analysis) {
        const factors = [];

        // Check for significant matchup advantages
        if (Math.abs(analysis.offenseVsDefense.homeOffenseVsAwayDefense.advantage) > 10) {
            factors.push(`${analysis.homeTeam} ${analysis.offenseVsDefense.homeOffenseVsAwayDefense.advantage > 0 ? 'offense' : 'defense'} advantage`);
        }

        if (Math.abs(analysis.offenseVsDefense.awayOffenseVsHomeDefense.advantage) > 10) {
            factors.push(`${analysis.awayTeam} ${analysis.offenseVsDefense.awayOffenseVsHomeDefense.advantage > 0 ? 'offense' : 'defense'} advantage`);
        }

        // Check recent form
        if (Math.abs(analysis.situationalFactors.recentForm.advantage) > 2) {
            const team = analysis.situationalFactors.recentForm.advantage > 0 ? analysis.homeTeam : analysis.awayTeam;
            factors.push(`${team} superior recent form`);
        }

        // Check injury impact
        if (analysis.injuryImpact.homeTeamImpact.severity === 'High') {
            factors.push(`${analysis.homeTeam} significant injuries`);
        }
        if (analysis.injuryImpact.awayTeamImpact.severity === 'High') {
            factors.push(`${analysis.awayTeam} significant injuries`);
        }

        return factors;
    }

    /**
     * Helper methods
     */
    getTeamAbbreviation(teamName) {
        const abbreviations = {
            'Kansas City Chiefs': 'KC',
            'Los Angeles Chargers': 'LAC',
            'Buffalo Bills': 'BUF',
            'Baltimore Ravens': 'BAL',
            // Add more as needed
        };
        return abbreviations[teamName] || teamName.substring(0, 3).toUpperCase();
    }

    categorizeAdvantage(advantage) {
        if (advantage > 15) return 'Major Advantage';
        if (advantage > 8) return 'Moderate Advantage';
        if (advantage > 3) return 'Slight Advantage';
        if (advantage > -3) return 'Even Matchup';
        if (advantage > -8) return 'Slight Disadvantage';
        if (advantage > -15) return 'Moderate Disadvantage';
        return 'Major Disadvantage';
    }

    describeFormAdvantage(advantage) {
        if (advantage >= 3) return 'Much better recent form';
        if (advantage >= 1) return 'Better recent form';
        if (advantage > -1) return 'Similar recent form';
        if (advantage > -3) return 'Worse recent form';
        return 'Much worse recent form';
    }

    analyzeRecentTrend(recentGames) {
        if (!recentGames || recentGames.length === 0) return 'No recent games';

        // Simple trend analysis
        const margins = recentGames.map(game => game.team1Score - game.team2Score);
        const avgMargin = margins.reduce((sum, margin) => sum + margin, 0) / margins.length;

        return {
            averageMargin: avgMargin,
            trend: avgMargin > 5 ? 'Dominant' : avgMargin > 0 ? 'Competitive' : 'Struggling'
        };
    }

    /**
     * Get comprehensive team analysis
     */
    async getTeamAnalysis(teamName) {
        const stats = this.teamStats.get(teamName);
        if (!stats) {
            throw new Error(`No stats found for team: ${teamName}`);
        }

        const injuries = this.injuryReports.get(teamName) || [];

        return {
            teamName: teamName,
            record: stats.record,
            ratings: {
                offense: this.calculateOffensiveRating(stats.offense),
                defense: this.calculateDefensiveRating(stats.defense),
                overall: this.calculateOverallRating(stats)
            },
            strengths: this.identifyStrengths(stats),
            weaknesses: this.identifyWeaknesses(stats),
            injuries: this.assessInjuryImpact(teamName),
            form: {
                recent: stats.situational.lastFiveGames,
                home: stats.situational.homeRecord,
                away: stats.situational.awayRecord
            }
        };
    }

    calculateOffensiveRating(offense) {
        return (
            offense.pointsPerGame * 2 +
            offense.yardsPerGame * 0.05 +
            offense.redZoneEfficiency * 50 +
            offense.thirdDownConversion * 30 +
            (2 - offense.turnoversPerGame) * 10
        );
    }

    calculateDefensiveRating(defense) {
        return (
            (35 - defense.pointsAllowedPerGame) * 2 +
            (450 - defense.yardsAllowedPerGame) * 0.05 +
            defense.redZoneDefense * 50 +
            defense.thirdDownDefense * 30 +
            defense.takeawaysPerGame * 10
        );
    }

    calculateOverallRating(stats) {
        const offense = this.calculateOffensiveRating(stats.offense);
        const defense = this.calculateDefensiveRating(stats.defense);
        const situational = stats.situational.lastFiveGames * 10;

        return (offense + defense + situational) / 3;
    }

    identifyStrengths(stats) {
        const strengths = [];

        if (stats.offense.pointsPerGame > 28) strengths.push('High-powered offense');
        if (stats.defense.pointsAllowedPerGame < 18) strengths.push('Strong defense');
        if (stats.offense.redZoneEfficiency > 0.65) strengths.push('Red zone efficiency');
        if (stats.situational.lastFiveGames >= 4) strengths.push('Hot streak');

        return strengths;
    }

    identifyWeaknesses(stats) {
        const weaknesses = [];

        if (stats.offense.pointsPerGame < 20) weaknesses.push('Struggling offense');
        if (stats.defense.pointsAllowedPerGame > 25) weaknesses.push('Porous defense');
        if (stats.offense.turnoversPerGame > 1.5) weaknesses.push('Turnover prone');
        if (stats.situational.lastFiveGames <= 1) weaknesses.push('Poor recent form');

        return weaknesses;
    }

    /**
     * Generate weekly game analysis for all games
     */
    async generateWeeklyAnalysis(weekNumber = null) {
        const week = weekNumber || this.currentWeek;
        console.log(`🗓️ Generating weekly analysis for Week ${week}...`);

        // This would typically fetch the week's schedule from your existing data
        // For now, using sample games
        const weeklyGames = [
            { homeTeam: 'Kansas City Chiefs', awayTeam: 'Los Angeles Chargers' },
            { homeTeam: 'Buffalo Bills', awayTeam: 'Baltimore Ravens' },
            { homeTeam: 'Philadelphia Eagles', awayTeam: 'Tampa Bay Buccaneers' }
            // Add more games...
        ];

        const weeklyAnalysis = {
            week: week,
            season: this.currentSeason,
            totalGames: weeklyGames.length,
            gameAnalyses: [],
            weeklyInsights: {
                bestBets: [],
                upsetAlerts: [],
                confidenceGames: []
            }
        };

        for (const game of weeklyGames) {
            const analysis = await this.analyzeMatchup(game.homeTeam, game.awayTeam);
            weeklyAnalysis.gameAnalyses.push(analysis);

            // Categorize games for insights
            if (analysis.prediction.confidence > 0.75) {
                weeklyAnalysis.weeklyInsights.confidenceGames.push(analysis);
            }
            if (analysis.prediction.homeWinProbability > 0.7 || analysis.prediction.homeWinProbability < 0.3) {
                weeklyAnalysis.weeklyInsights.bestBets.push(analysis);
            }
            if (analysis.prediction.homeWinProbability > 0.4 && analysis.prediction.homeWinProbability < 0.6) {
                weeklyAnalysis.weeklyInsights.upsetAlerts.push(analysis);
            }
        }

        console.log(`✅ Weekly analysis complete: ${weeklyGames.length} games analyzed`);
        return weeklyAnalysis;
    }
}

// Global instance
window.NerdAIAnalyticsEngine = new NerdAIAnalyticsEngine();

// Auto-initialize when loaded
document.addEventListener('DOMContentLoaded', () => {
    window.NerdAIAnalyticsEngine.initialize().catch(console.error);
});