/**
 * SIMPLE NERDAI HELPER
 * Basic AI assistance for weekly confidence picks - keeping it simple!
 */

class SimpleNerdAI {
    constructor() {
        this.currentWeek = 4;
        this.debugMode = false;
    }

    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`Simple NerdAI: ${enabled ? 'ON' : 'OFF'}`);
    }

    async getBasicGameAnalysis(homeTeam, awayTeam) {
        if (this.debugMode) {
            console.log(`🏈 Simple analysis: ${awayTeam} @ ${homeTeam}`);
        }

        const analysis = {
            matchup: `${awayTeam} @ ${homeTeam}`,
            homeTeam,
            awayTeam,
            confidence: 50,
            suggestion: homeTeam,
            reasoning: `Home field advantage for ${homeTeam}`,
            difficulty: 'medium'
        };

        analysis.confidence = this.calculateBasicConfidence(homeTeam, awayTeam);
        analysis.suggestion = this.makeBasicPick(homeTeam, awayTeam, analysis.confidence);
        analysis.reasoning = this.getSimpleReasoning(homeTeam, awayTeam, analysis);
        analysis.difficulty = this.getDifficulty(analysis.confidence);

        return analysis;
    }

    calculateBasicConfidence(homeTeam, awayTeam) {
        let confidence = 55; // Home field advantage starts us at 55%

        // Simple team strength assessment based on common knowledge
        const strongTeams = ['KC', 'BUF', 'SF', 'PHI', 'BAL', 'DAL', 'MIA'];
        const weakTeams = ['CAR', 'ARI', 'NYG', 'CHI', 'WAS'];

        if (strongTeams.includes(homeTeam) && weakTeams.includes(awayTeam)) {
            confidence = 75;
        } else if (weakTeams.includes(homeTeam) && strongTeams.includes(awayTeam)) {
            confidence = 35;
        } else if (strongTeams.includes(homeTeam) || strongTeams.includes(awayTeam)) {
            confidence = 65;
        }

        // Add some randomness to avoid being too predictable
        const randomFactor = Math.random() * 10 - 5;
        confidence = Math.max(30, Math.min(80, confidence + randomFactor));

        return Math.round(confidence);
    }

    makeBasicPick(homeTeam, awayTeam, confidence) {
        return confidence >= 50 ? homeTeam : awayTeam;
    }

    getSimpleReasoning(homeTeam, awayTeam, analysis) {
        if (analysis.confidence >= 70) {
            return `Strong pick: ${analysis.suggestion} should win this game`;
        } else if (analysis.confidence <= 40) {
            return `Tough game: ${analysis.suggestion} slight edge but very close`;
        } else {
            return `Close game: ${analysis.suggestion} with home field advantage`;
        }
    }

    getDifficulty(confidence) {
        if (confidence >= 70) return 'easy';
        if (confidence <= 45) return 'very hard';
        return 'medium';
    }

    async analyzeWeekGames(weekNumber = null) {
        const week = weekNumber || this.currentWeek;

        if (this.debugMode) {
            console.log(`📊 Getting simple picks for Week ${week}...`);
        }

        try {
            // Try Firebase first, fall back to sample data
            let gamesData = null;

            try {
                const gamesPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;
                const gamesDoc = await window.db.doc(gamesPath).get();

                if (gamesDoc.exists) {
                    gamesData = gamesDoc.data();
                    if (this.debugMode) console.log('✅ Using real Firebase data');
                }
            } catch (fbError) {
                if (this.debugMode) console.log('⚠️ Firebase access failed, using sample data');
            }

            // Use sample data if Firebase failed
            if (!gamesData) {
                gamesData = this.getSampleWeekGames();
                if (this.debugMode) console.log('✅ Using sample game data');
            }

            const gameAnalyses = [];

            for (const [gameId, gameInfo] of Object.entries(gamesData)) {
                if (gameInfo.homeTeam && gameInfo.awayTeam) {
                    const analysis = await this.getBasicGameAnalysis(gameInfo.homeTeam, gameInfo.awayTeam);
                    analysis.gameId = gameId;
                    gameAnalyses.push(analysis);
                }
            }

            // Sort by confidence - highest first
            gameAnalyses.sort((a, b) => b.confidence - a.confidence);

            if (this.debugMode) {
                console.log(`✅ Simple analysis for ${gameAnalyses.length} games`);
            }

            return {
                week,
                games: gameAnalyses,
                suggestions: this.generateSimpleSuggestions(gameAnalyses)
            };

        } catch (error) {
            console.error('❌ Simple analysis failed:', error);
            return { error: error.message, games: [] };
        }
    }

    getSampleWeekGames() {
        return {
            'game1': { homeTeam: 'KC', awayTeam: 'LAC' },
            'game2': { homeTeam: 'BUF', awayTeam: 'BAL' },
            'game3': { homeTeam: 'SF', awayTeam: 'ARI' },
            'game4': { homeTeam: 'PHI', awayTeam: 'WAS' },
            'game5': { homeTeam: 'DAL', awayTeam: 'NYG' },
            'game6': { homeTeam: 'MIA', awayTeam: 'TEN' },
            'game7': { homeTeam: 'GB', awayTeam: 'MIN' },
            'game8': { homeTeam: 'DEN', awayTeam: 'LV' }
        };
    }

    generateSimpleSuggestions(games) {
        return {
            easyPicks: games.filter(g => g.difficulty === 'easy'),
            hardPicks: games.filter(g => g.difficulty === 'very hard'),
            mediumPicks: games.filter(g => g.difficulty === 'medium'),
            mostConfident: games[0] || null,
            leastConfident: games[games.length - 1] || null
        };
    }

    // Simple confidence ranking helper for picks
    generateConfidenceOrder(gameAnalyses) {
        return gameAnalyses.map((game, index) => ({
            rank: index + 1,
            gameId: game.gameId,
            pick: game.suggestion,
            confidence: game.confidence,
            reasoning: game.reasoning,
            difficulty: game.difficulty
        }));
    }
}

// Make it available globally
window.SimpleNerdAI = new SimpleNerdAI();

// Simple test function
window.testSimpleAI = async function() {
    console.log('🧪 Testing Simple NerdAI...');

    const ai = window.SimpleNerdAI;
    ai.setDebugMode(true);

    // Test a simple matchup
    const result = await ai.getBasicGameAnalysis('KC', 'LAC');
    console.log('Test result:', result);

    return result;
};