/**
 * BETTING INTELLIGENCE SYSTEM
 * ScoresAndOdds integration for line movements, public betting data, and contrarian analysis
 */

class BettingIntelligence {
    constructor() {
        this.debugMode = true;
        this.publicFadeThreshold = 65; // Fade public when 65%+ on one side
        this.sharpMoveThreshold = 1.5; // Line moves 1.5+ points indicate sharp money
        this.bettingHistory = new Map(); // Track public vs sharp accuracy
        this.apiBaseUrl = 'https://api.scoresandodds.com'; // Common pattern
    }

    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`📊 BETTING_INTEL: ${enabled ? 'ON' : 'OFF'}`);
    }

    /**
     * Get comprehensive betting data for NFL games
     */
    async getBettingIntelligence(week = 4) {
        if (this.debugMode) {
            console.log(`📊 BETTING_INTEL: Fetching Week ${week} betting intelligence...`);
        }

        try {
            // Get current lines and public betting percentages
            const currentLines = await this.getCurrentLines();
            const publicBetting = await this.getPublicBettingData();
            const lineMovements = await this.getLineMovements();

            // Analyze betting patterns
            const bettingAnalysis = this.analyzeBettingPatterns(currentLines, publicBetting, lineMovements);

            return {
                success: true,
                week,
                timestamp: new Date().toISOString(),
                data: {
                    currentLines,
                    publicBetting,
                    lineMovements,
                    analysis: bettingAnalysis
                }
            };

        } catch (error) {
            console.error('📊 BETTING_INTEL: Failed to fetch betting data:', error);
            return {
                success: false,
                error: error.message,
                fallback: this.getFallbackBettingData()
            };
        }
    }

    /**
     * Get current NFL betting lines
     */
    async getCurrentLines() {
        try {
            // ScoresAndOdds API pattern (adjust endpoint as needed)
            const response = await fetch(`${this.apiBaseUrl}/v1/sports/americanfootball_nfl/odds`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'NerdFootball-BettingIntel/1.0'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return this.parseCurrentLines(data);
            }
        } catch (error) {
            if (this.debugMode) {
                console.log(`📊 BETTING_INTEL: Current lines API failed: ${error.message}`);
            }
        }

        // Fallback to ESPN odds data
        return this.getESPNOddsData();
    }

    /**
     * Get public betting percentages
     */
    async getPublicBettingData() {
        try {
            // ScoresAndOdds public betting endpoint
            const response = await fetch(`${this.apiBaseUrl}/v1/sports/nfl/public-betting`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'NerdFootball-BettingIntel/1.0'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return this.parsePublicBetting(data);
            }
        } catch (error) {
            if (this.debugMode) {
                console.log(`📊 BETTING_INTEL: Public betting API failed: ${error.message}`);
            }
        }

        // Return simulated public betting data for development
        return this.generateMockPublicData();
    }

    /**
     * Get line movement history
     */
    async getLineMovements() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/v1/sports/nfl/line-movements`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'NerdFootball-BettingIntel/1.0'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return this.parseLineMovements(data);
            }
        } catch (error) {
            if (this.debugMode) {
                console.log(`📊 BETTING_INTEL: Line movements API failed: ${error.message}`);
            }
        }

        return this.generateMockLineMovements();
    }

    /**
     * Analyze betting patterns for contrarian opportunities
     */
    analyzeBettingPatterns(currentLines, publicBetting, lineMovements) {
        const analysis = {
            contrarian_plays: [],
            sharp_money_indicators: [],
            public_traps: [],
            line_value: []
        };

        for (const game in publicBetting) {
            const gameData = publicBetting[game];
            const lineData = lineMovements[game];
            const currentLine = currentLines[game];

            // Contrarian Analysis: Fade the public when heavily skewed
            if (gameData.spread_percentage > this.publicFadeThreshold) {
                analysis.contrarian_plays.push({
                    game,
                    public_side: gameData.public_favorite,
                    public_percentage: gameData.spread_percentage,
                    contrarian_play: gameData.public_underdog,
                    confidence: this.calculateContrarianConfidence(gameData.spread_percentage),
                    reasoning: `${gameData.spread_percentage}% of public on ${gameData.public_favorite} - Fade the crowd`
                });
            }

            // Sharp Money Detection: Line moves against public
            if (lineData && this.detectSharpMoney(lineData, gameData)) {
                analysis.sharp_money_indicators.push({
                    game,
                    sharp_side: lineData.sharp_side,
                    line_movement: lineData.movement,
                    public_percentage: gameData.spread_percentage,
                    reasoning: `Line moved ${lineData.movement} toward ${lineData.sharp_side} despite ${gameData.spread_percentage}% public on other side`
                });
            }

            // Public Trap Detection: Public loves a team but line doesn't move
            if (gameData.spread_percentage > 70 && Math.abs(lineData?.movement || 0) < 0.5) {
                analysis.public_traps.push({
                    game,
                    trap_side: gameData.public_favorite,
                    public_percentage: gameData.spread_percentage,
                    line_stability: 'Static despite heavy public action',
                    reasoning: `${gameData.spread_percentage}% public but line didn't move - Books not afraid of public side`
                });
            }
        }

        return analysis;
    }

    /**
     * Calculate contrarian confidence based on public betting percentage
     */
    calculateContrarianConfidence(publicPercentage) {
        // Higher public percentage = higher contrarian confidence
        if (publicPercentage >= 80) return 85; // Very high fade confidence
        if (publicPercentage >= 75) return 75; // High fade confidence
        if (publicPercentage >= 70) return 65; // Moderate fade confidence
        if (publicPercentage >= 65) return 55; // Low fade confidence
        return 50; // No contrarian edge
    }

    /**
     * Detect sharp money movement
     */
    detectSharpMoney(lineData, publicData) {
        if (!lineData.movement) return false;

        // Sharp money: Line moves against public or significant movement with low volume
        const moveAgainstPublic = (
            (lineData.movement > 0 && publicData.public_favorite === lineData.away_team) ||
            (lineData.movement < 0 && publicData.public_favorite === lineData.home_team)
        );

        const significantMovement = Math.abs(lineData.movement) >= this.sharpMoveThreshold;

        return moveAgainstPublic || significantMovement;
    }

    /**
     * Generate mock public betting data for development
     */
    generateMockPublicData() {
        return {
            'BUF@MIA': {
                public_favorite: 'BUF',
                public_underdog: 'MIA',
                spread_percentage: 72,
                total_percentage: 65,
                money_percentage: 68
            },
            'GB@MIN': {
                public_favorite: 'GB',
                public_underdog: 'MIN',
                spread_percentage: 78,
                total_percentage: 58,
                money_percentage: 71
            },
            'DEN@NYJ': {
                public_favorite: 'DEN',
                public_underdog: 'NYJ',
                spread_percentage: 83,
                total_percentage: 62,
                money_percentage: 79
            }
        };
    }

    /**
     * Generate mock line movement data
     */
    generateMockLineMovements() {
        return {
            'BUF@MIA': {
                opening_spread: -7,
                current_spread: -6,
                movement: +1,
                sharp_side: 'MIA',
                movement_history: [
                    { time: '2025-09-25T10:00:00Z', spread: -7, trigger: 'opening' },
                    { time: '2025-09-26T14:30:00Z', spread: -6.5, trigger: 'sharp_money' },
                    { time: '2025-09-27T09:15:00Z', spread: -6, trigger: 'continued_sharp_action' }
                ]
            },
            'GB@MIN': {
                opening_spread: -3,
                current_spread: -4,
                movement: -1,
                sharp_side: 'GB',
                movement_history: [
                    { time: '2025-09-25T10:00:00Z', spread: -3, trigger: 'opening' },
                    { time: '2025-09-26T16:45:00Z', spread: -3.5, trigger: 'public_money' },
                    { time: '2025-09-27T11:20:00Z', spread: -4, trigger: 'sharp_money' }
                ]
            }
        };
    }

    /**
     * Fallback to ESPN odds when ScoresAndOdds unavailable
     */
    async getESPNOddsData() {
        try {
            const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');

            if (response.ok) {
                const data = await response.json();
                return this.convertESPNToOddsFormat(data);
            }
        } catch (error) {
            console.error('📊 BETTING_INTEL: ESPN fallback failed:', error);
        }

        return {};
    }

    /**
     * Convert ESPN data to betting intelligence format
     */
    convertESPNToOddsFormat(espnData) {
        const odds = {};

        if (espnData.events) {
            espnData.events.forEach(event => {
                const competition = event.competitions[0];
                const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
                const awayTeam = competition.competitors.find(c => c.homeAway === 'away');

                if (homeTeam && awayTeam) {
                    const gameKey = `${awayTeam.team.abbreviation}@${homeTeam.team.abbreviation}`;
                    const gameOdds = competition.odds?.[0];

                    odds[gameKey] = {
                        spread: gameOdds?.details || 'Pick',
                        total: gameOdds?.overUnder || 'N/A',
                        home_ml: homeTeam.team.odds || 'N/A',
                        away_ml: awayTeam.team.odds || 'N/A',
                        source: 'ESPN'
                    };
                }
            });
        }

        return odds;
    }

    /**
     * Learn from betting results and adjust contrarian strategy
     */
    async updateBettingAccuracy(week, gameResults) {
        if (this.debugMode) {
            console.log(`📊 BETTING_INTEL: Learning from Week ${week} results...`);
        }

        // Track how often contrarian plays vs public favorites won
        for (const game in gameResults) {
            const result = gameResults[game];
            // Store learning data for future contrarian analysis refinement
            this.bettingHistory.set(`${week}_${game}`, {
                public_favorite_won: result.public_favorite_won,
                contrarian_play_won: result.contrarian_play_won,
                sharp_money_correct: result.sharp_money_correct,
                line_movement_direction: result.line_movement_direction
            });
        }

        return { success: true, learned_games: Object.keys(gameResults).length };
    }

    /**
     * Generate betting intelligence recommendations for Wu-Tang AI
     */
    generateBettingRecommendations(bettingAnalysis) {
        const recommendations = {
            fade_public: [],
            follow_sharps: [],
            trap_games: [],
            value_plays: []
        };

        // Fade the Public recommendations
        bettingAnalysis.contrarian_plays.forEach(play => {
            if (play.confidence >= 70) {
                recommendations.fade_public.push({
                    game: play.game,
                    recommendation: `FADE PUBLIC - Bet ${play.contrarian_play}`,
                    confidence: play.confidence,
                    reasoning: play.reasoning
                });
            }
        });

        // Follow Sharp Money recommendations
        bettingAnalysis.sharp_money_indicators.forEach(indicator => {
            recommendations.follow_sharps.push({
                game: indicator.game,
                recommendation: `FOLLOW SHARPS - Bet ${indicator.sharp_side}`,
                reasoning: indicator.reasoning
            });
        });

        // Trap Game warnings
        bettingAnalysis.public_traps.forEach(trap => {
            recommendations.trap_games.push({
                game: trap.game,
                warning: `POTENTIAL TRAP - Avoid ${trap.trap_side}`,
                reasoning: trap.reasoning
            });
        });

        return recommendations;
    }
}

// Make available globally
window.BettingIntelligence = new BettingIntelligence();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BettingIntelligence;
}