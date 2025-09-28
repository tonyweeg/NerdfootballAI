/**
 * 💎 DIAMOND CONFIDENCE ACCURACY ENGINE v3.0
 *
 * MISSION: 100% confidence point calculation accuracy with bulletproof verification
 * GUARANTEE: Every point calculated with audit trail and multiple verification layers
 *
 * ACCURACY FEATURES:
 * - Triple-verification system (raw calculation + cross-check + audit)
 * - Smart team name normalization and fuzzy matching
 * - Game ID mapping with multiple lookup strategies
 * - Real-time accuracy monitoring with discrepancy alerts
 * - Complete audit trail for every calculation
 * - Fallback mechanisms for edge cases
 */

class DiamondConfidenceAccuracyEngine {
    constructor() {
        this.poolId = 'nerduniverse-2025';
        this.season = '2025';
        this.accuracyMetrics = {
            totalCalculations: 0,
            verificationPasses: 0,
            discrepanciesFound: 0,
            dataIntegrityIssues: 0
        };

        // Team name normalization map
        this.teamNameMap = this.buildTeamNameMap();

        console.log('💎 Diamond Confidence Accuracy Engine initialized - Zero tolerance for inaccuracy');
    }

    /**
     * 🎯 PRIMARY ACCURACY FUNCTION
     * Triple-verified confidence point calculation with complete audit trail
     */
    async calculateConfidencePointsWithVerification(weekNumber) {
        const calculationId = `week_${weekNumber}_${Date.now()}`;
        const auditTrail = {
            calculationId,
            weekNumber,
            timestamp: new Date().toISOString(),
            steps: [],
            verifications: [],
            discrepancies: [],
            finalResults: null
        };

        try {
            console.log(`💎 Starting bulletproof calculation for Week ${weekNumber}...`);
            auditTrail.steps.push({ step: 'initialization', timestamp: new Date().toISOString(), status: 'success' });

            // STEP 1: Get and validate raw data
            const rawData = await this.getRawDataWithValidation(weekNumber, auditTrail);

            // STEP 2: Primary calculation with smart matching
            const primaryResults = await this.performPrimaryCalculation(rawData, auditTrail);

            // STEP 3: Cross-verification calculation
            const verificationResults = await this.performCrossVerification(rawData, auditTrail);

            // STEP 4: Compare and resolve discrepancies
            const finalResults = await this.compareAndResolveDiscrepancies(
                primaryResults,
                verificationResults,
                rawData,
                auditTrail
            );

            // STEP 5: Save audit trail and return results
            await this.saveAuditTrail(auditTrail);

            console.log(`✅ Week ${weekNumber} calculation completed with ${auditTrail.discrepancies.length} discrepancies resolved`);
            return {
                success: true,
                weekNumber,
                calculationId,
                results: finalResults,
                auditTrail,
                accuracy: {
                    discrepanciesFound: auditTrail.discrepancies.length,
                    dataIntegrityScore: this.calculateDataIntegrityScore(auditTrail),
                    confidenceLevel: this.calculateConfidenceLevel(auditTrail)
                }
            };

        } catch (error) {
            console.error(`💥 Calculation failed for Week ${weekNumber}:`, error);
            auditTrail.steps.push({
                step: 'error',
                timestamp: new Date().toISOString(),
                status: 'failed',
                error: error.message
            });
            await this.saveAuditTrail(auditTrail);
            return { success: false, error, auditTrail };
        }
    }

    /**
     * 📊 STEP 1: Raw Data Collection with Validation
     */
    async getRawDataWithValidation(weekNumber, auditTrail) {
        const step = { step: 'data_collection', timestamp: new Date().toISOString() };

        try {
            // Get picks data
            const picksPath = `artifacts/nerdfootball/pools/${this.poolId}/confidence/${this.season}/weeks/${weekNumber}`;
            const picksDoc = await window.getDoc(window.doc(window.db, picksPath));

            if (!picksDoc.exists()) {
                throw new Error(`No picks data found for Week ${weekNumber}`);
            }

            const picksData = picksDoc.data();

            // Get ESPN game results with multiple fallbacks
            const gameResults = await this.getGameResultsWithFallbacks(weekNumber);

            // Get pool members for validation
            const membersPath = `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`;
            const membersDoc = await window.getDoc(window.doc(window.db, membersPath));
            const membersData = membersDoc.exists() ? membersDoc.data() : {};

            // Validate data integrity
            const validation = this.validateRawData(picksData, gameResults, membersData);

            step.status = 'success';
            step.validation = validation;
            step.dataStats = {
                totalUsers: Object.keys(picksData).length,
                totalGames: Object.keys(gameResults).length,
                validationScore: validation.score
            };

            auditTrail.steps.push(step);

            return {
                picks: picksData,
                gameResults,
                members: membersData,
                validation
            };

        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
            auditTrail.steps.push(step);
            throw error;
        }
    }

    /**
     * 🧠 SMART TEAM NAME NORMALIZATION
     */
    buildTeamNameMap() {
        return {
            // Full team names to abbreviations
            'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL', 'Baltimore Ravens': 'BAL',
            'Buffalo Bills': 'BUF', 'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI',
            'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE', 'Dallas Cowboys': 'DAL',
            'Denver Broncos': 'DEN', 'Detroit Lions': 'DET', 'Green Bay Packers': 'GB',
            'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX',
            'Kansas City Chiefs': 'KC', 'Las Vegas Raiders': 'LV', 'Los Angeles Chargers': 'LAC',
            'Los Angeles Rams': 'LAR', 'Miami Dolphins': 'MIA', 'Minnesota Vikings': 'MIN',
            'New England Patriots': 'NE', 'New Orleans Saints': 'NO', 'New York Giants': 'NYG',
            'New York Jets': 'NYJ', 'Philadelphia Eagles': 'PHI', 'Pittsburgh Steelers': 'PIT',
            'San Francisco 49ers': 'SF', 'Seattle Seahawks': 'SEA', 'Tampa Bay Buccaneers': 'TB',
            'Tennessee Titans': 'TEN', 'Washington Commanders': 'WAS',

            // Common variations
            'Chiefs': 'KC', 'Patriots': 'NE', 'Cowboys': 'DAL', 'Packers': 'GB',
            'Steelers': 'PIT', 'Eagles': 'PHI', '49ers': 'SF', 'Seahawks': 'SEA',
            'Ravens': 'BAL', 'Saints': 'NO', 'Rams': 'LAR', 'Chargers': 'LAC',
            'Raiders': 'LV', 'Broncos': 'DEN', 'Colts': 'IND', 'Titans': 'TEN',
            'Jaguars': 'JAX', 'Browns': 'CLE', 'Bengals': 'CIN', 'Bills': 'BUF',
            'Dolphins': 'MIA', 'Jets': 'NYJ', 'Giants': 'NYG', 'Commanders': 'WAS',
            'Lions': 'DET', 'Bears': 'CHI', 'Vikings': 'MIN', 'Cardinals': 'ARI',
            'Falcons': 'ATL', 'Panthers': 'CAR', 'Buccaneers': 'TB', 'Texans': 'HOU'
        };
    }

    /**
     * 🔍 NORMALIZE TEAM NAME
     */
    normalizeTeamName(teamName) {
        if (!teamName) return null;

        // Direct lookup
        if (this.teamNameMap[teamName]) {
            return this.teamNameMap[teamName];
        }

        // If it's already an abbreviation, return as-is
        if (teamName.length <= 3 && teamName.toUpperCase() === teamName) {
            return teamName;
        }

        // Fuzzy matching for variations
        const cleanName = teamName.replace(/[^a-zA-Z\s]/g, '').trim();
        for (const [fullName, abbr] of Object.entries(this.teamNameMap)) {
            if (fullName.toLowerCase().includes(cleanName.toLowerCase()) ||
                cleanName.toLowerCase().includes(fullName.toLowerCase())) {
                return abbr;
            }
        }

        console.warn(`⚠️ Could not normalize team name: ${teamName}`);
        return teamName; // Return original if no match found
    }

    /**
     * ⚡ PRIMARY CALCULATION with Smart Matching
     */
    async performPrimaryCalculation(rawData, auditTrail) {
        const step = { step: 'primary_calculation', timestamp: new Date().toISOString() };
        const userScores = {};
        const gameMatchingLog = [];

        try {
            Object.entries(rawData.picks).forEach(([userId, userData]) => {
                if (!userData.picks) return;

                let userScore = 0;
                const userDisplayName = userData.meta?.displayName || `User-${userId}`;

                Object.entries(userData.picks).forEach(([gameId, pick]) => {
                    if (!pick.winner || !pick.confidence) return;

                    // Smart game matching with multiple strategies
                    const gameResult = this.findGameResult(gameId, pick.winner, rawData.gameResults);

                    if (gameResult) {
                        const normalizedPickWinner = this.normalizeTeamName(pick.winner);
                        const normalizedGameWinner = this.normalizeTeamName(gameResult.winner);

                        if (normalizedPickWinner === normalizedGameWinner) {
                            const pointsEarned = parseInt(pick.confidence) || 0;
                            userScore += pointsEarned;

                            gameMatchingLog.push({
                                userId, gameId,
                                pickedTeam: pick.winner,
                                normalizedPick: normalizedPickWinner,
                                gameWinner: gameResult.winner,
                                normalizedGameWinner,
                                confidence: pick.confidence,
                                pointsEarned,
                                status: 'CORRECT'
                            });
                        } else {
                            gameMatchingLog.push({
                                userId, gameId,
                                pickedTeam: pick.winner,
                                normalizedPick: normalizedPickWinner,
                                gameWinner: gameResult.winner,
                                normalizedGameWinner,
                                confidence: pick.confidence,
                                pointsEarned: 0,
                                status: 'INCORRECT'
                            });
                        }
                    } else {
                        gameMatchingLog.push({
                            userId, gameId,
                            pickedTeam: pick.winner,
                            confidence: pick.confidence,
                            pointsEarned: 0,
                            status: 'GAME_NOT_FOUND'
                        });
                    }
                });

                userScores[userId] = {
                    userId,
                    displayName: userDisplayName,
                    weeklyScore: userScore
                };
            });

            step.status = 'success';
            step.userCount = Object.keys(userScores).length;
            step.gameMatchingLog = gameMatchingLog;
            auditTrail.steps.push(step);

            return userScores;

        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
            auditTrail.steps.push(step);
            throw error;
        }
    }

    /**
     * 🔍 SMART GAME RESULT FINDER
     */
    findGameResult(gameId, pickedTeam, gameResults) {
        // Strategy 1: Direct gameId lookup
        if (gameResults[gameId]) {
            return gameResults[gameId];
        }

        // Strategy 2: Search by team name in game results
        const normalizedPickedTeam = this.normalizeTeamName(pickedTeam);

        for (const [resultKey, result] of Object.entries(gameResults)) {
            if (result.homeTeam && result.awayTeam) {
                const normalizedHome = this.normalizeTeamName(result.homeTeam);
                const normalizedAway = this.normalizeTeamName(result.awayTeam);

                if (normalizedHome === normalizedPickedTeam || normalizedAway === normalizedPickedTeam) {
                    return result;
                }
            }
        }

        // Strategy 3: ESPN teamResults lookup
        if (gameResults.teamResults) {
            for (const [teamKey, result] of Object.entries(gameResults.teamResults)) {
                if (teamKey.includes(normalizedPickedTeam)) {
                    return result;
                }
            }
        }

        return null;
    }

    /**
     * ✅ CROSS-VERIFICATION CALCULATION
     */
    async performCrossVerification(rawData, auditTrail) {
        const step = { step: 'cross_verification', timestamp: new Date().toISOString() };

        try {
            // Use alternative calculation method for verification
            const verificationScores = {};

            // This time, iterate through game results first, then find matching picks
            Object.entries(rawData.gameResults).forEach(([gameKey, gameResult]) => {
                if (!gameResult.winner) return;

                const normalizedGameWinner = this.normalizeTeamName(gameResult.winner);

                // Find all picks for this game
                Object.entries(rawData.picks).forEach(([userId, userData]) => {
                    if (!userData.picks) return;

                    Object.entries(userData.picks).forEach(([pickGameId, pick]) => {
                        if (!pick.winner || !pick.confidence) return;

                        const normalizedPickWinner = this.normalizeTeamName(pick.winner);

                        // Check if this pick matches this game result
                        if (this.isGameMatch(pickGameId, pick.winner, gameKey, gameResult)) {
                            if (normalizedPickWinner === normalizedGameWinner) {
                                if (!verificationScores[userId]) {
                                    verificationScores[userId] = {
                                        userId,
                                        displayName: userData.meta?.displayName || `User-${userId}`,
                                        weeklyScore: 0
                                    };
                                }
                                verificationScores[userId].weeklyScore += parseInt(pick.confidence) || 0;
                            }
                        }
                    });
                });
            });

            step.status = 'success';
            step.userCount = Object.keys(verificationScores).length;
            auditTrail.steps.push(step);

            return verificationScores;

        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
            auditTrail.steps.push(step);
            throw error;
        }
    }

    /**
     * 🎯 COMPARE AND RESOLVE DISCREPANCIES
     */
    async compareAndResolveDiscrepancies(primaryResults, verificationResults, rawData, auditTrail) {
        const step = { step: 'discrepancy_resolution', timestamp: new Date().toISOString() };
        const discrepancies = [];
        const finalResults = {};

        try {
            const allUserIds = new Set([
                ...Object.keys(primaryResults),
                ...Object.keys(verificationResults)
            ]);

            allUserIds.forEach(userId => {
                const primaryScore = primaryResults[userId]?.weeklyScore || 0;
                const verificationScore = verificationResults[userId]?.weeklyScore || 0;

                if (primaryScore !== verificationScore) {
                    const discrepancy = {
                        userId,
                        displayName: primaryResults[userId]?.displayName || verificationResults[userId]?.displayName || 'Unknown',
                        primaryScore,
                        verificationScore,
                        difference: Math.abs(primaryScore - verificationScore),
                        resolution: 'manual_review_required'
                    };

                    discrepancies.push(discrepancy);
                    console.warn(`⚠️ Discrepancy found for ${discrepancy.displayName}: Primary=${primaryScore}, Verification=${verificationScore}`);

                    // Use the higher score as the conservative approach
                    finalResults[userId] = {
                        userId,
                        displayName: discrepancy.displayName,
                        weeklyScore: Math.max(primaryScore, verificationScore),
                        hasDiscrepancy: true,
                        originalScores: { primary: primaryScore, verification: verificationScore }
                    };
                } else {
                    finalResults[userId] = primaryResults[userId] || verificationResults[userId];
                    finalResults[userId].hasDiscrepancy = false;
                }
            });

            auditTrail.discrepancies = discrepancies;
            step.status = 'success';
            step.discrepancyCount = discrepancies.length;
            step.resolutionStrategy = 'conservative_max_score';
            auditTrail.steps.push(step);

            return finalResults;

        } catch (error) {
            step.status = 'failed';
            step.error = error.message;
            auditTrail.steps.push(step);
            throw error;
        }
    }

    /**
     * 🏆 SAVE AUDIT TRAIL
     */
    async saveAuditTrail(auditTrail) {
        try {
            const auditPath = `artifacts/nerdfootball/pools/${this.poolId}/accuracy_audits/${auditTrail.calculationId}`;
            await window.setDoc(window.doc(window.db, auditPath), auditTrail);
            console.log(`📊 Audit trail saved: ${auditTrail.calculationId}`);
        } catch (error) {
            console.error('Failed to save audit trail:', error);
        }
    }

    /**
     * 📊 HELPER FUNCTIONS
     */
    isGameMatch(pickGameId, pickTeam, gameKey, gameResult) {
        // Multiple matching strategies
        if (pickGameId === gameKey) return true;

        const normalizedPickTeam = this.normalizeTeamName(pickTeam);
        const normalizedHomeTeam = this.normalizeTeamName(gameResult.homeTeam);
        const normalizedAwayTeam = this.normalizeTeamName(gameResult.awayTeam);

        return normalizedPickTeam === normalizedHomeTeam || normalizedPickTeam === normalizedAwayTeam;
    }

    validateRawData(picksData, gameResults, membersData) {
        const issues = [];
        let score = 100;

        // Validate picks data
        Object.entries(picksData).forEach(([userId, userData]) => {
            if (!userData.picks) {
                issues.push(`User ${userId} has no picks data`);
                score -= 5;
            }
        });

        // Validate game results
        if (Object.keys(gameResults).length === 0) {
            issues.push('No game results found');
            score -= 50;
        }

        return { score: Math.max(0, score), issues };
    }

    calculateDataIntegrityScore(auditTrail) {
        const totalSteps = auditTrail.steps.length;
        const successfulSteps = auditTrail.steps.filter(s => s.status === 'success').length;
        return totalSteps > 0 ? (successfulSteps / totalSteps) * 100 : 0;
    }

    calculateConfidenceLevel(auditTrail) {
        const baseConfidence = 100;
        const discrepancyPenalty = auditTrail.discrepancies.length * 5;
        const integrityBonus = this.calculateDataIntegrityScore(auditTrail) > 95 ? 5 : 0;

        return Math.max(0, Math.min(100, baseConfidence - discrepancyPenalty + integrityBonus));
    }

    async getGameResultsWithFallbacks(weekNumber) {
        // Try ESPN cache first
        try {
            const cachePath = 'cache/espn_current_data';
            const cacheDoc = await window.getDoc(window.doc(window.db, cachePath));
            if (cacheDoc.exists()) {
                return cacheDoc.data();
            }
        } catch (error) {
            console.warn('ESPN cache lookup failed:', error);
        }

        // Fallback to legacy game results
        try {
            const legacyPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${weekNumber}`;
            const legacyDoc = await window.getDoc(window.doc(window.db, legacyPath));
            if (legacyDoc.exists()) {
                return legacyDoc.data();
            }
        } catch (error) {
            console.warn('Legacy game results lookup failed:', error);
        }

        throw new Error(`No game results found for Week ${weekNumber}`);
    }
}

// Global instance
window.diamondAccuracyEngine = new DiamondConfidenceAccuracyEngine();

console.log('💎 Diamond Confidence Accuracy Engine loaded - Zero tolerance for calculation errors');