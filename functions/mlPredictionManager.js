// 🤖 ML PREDICTION MANAGER - Firebase Cloud Function
// Integrates with ESPN cache system for automated learning

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize admin if not already done
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();

/**
 * 🔥 AUTOMATED ML OUTCOME RECORDING
 * Triggered when ESPN cache updates with final game results
 * Automatically records outcomes for ML learning
 */
exports.processGameOutcomes = functions.firestore
    .document('cache/espn_current_data')
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const oldData = change.before.data();

        console.log('🏈 ESPN cache updated, checking for final games...');

        try {
            // Find games that just finished (status changed to FINAL)
            const finalizedGames = [];

            if (newData.games && oldData.games) {
                newData.games.forEach((newGame, index) => {
                    const oldGame = oldData.games[index];

                    if (newGame.status === 'STATUS_FINAL' &&
                        oldGame && oldGame.status !== 'STATUS_FINAL') {
                        finalizedGames.push(newGame);
                    }
                });
            }

            console.log(`🎯 Found ${finalizedGames.length} newly finalized games`);

            // Process each finalized game
            for (const game of finalizedGames) {
                await recordMLPredictionOutcome(game);
            }

            return { processed: finalizedGames.length };

        } catch (error) {
            console.error('❌ Failed to process game outcomes:', error);
            throw error;
        }
    });

/**
 * 📊 RECORD ML PREDICTION OUTCOME
 * Updates prediction records with actual outcomes for learning
 */
async function recordMLPredictionOutcome(game) {
    const gameId = game.id;
    const year = 2025;
    const week = 3; // Will be dynamic in production

    try {
        // Determine actual winner
        const homeScore = parseInt(game.homeScore) || 0;
        const awayScore = parseInt(game.awayScore) || 0;
        const actualWinner = homeScore > awayScore ? game.h : game.a;

        console.log(`🏆 Recording outcome for Game ${gameId}: ${actualWinner} wins ${homeScore}-${awayScore}`);

        // Find ML prediction for this game
        const predictionPath = `artifacts/nerdfootball/predictions/${year}/weeks/${week}/games/${gameId}`;
        const predictionDoc = await db.doc(predictionPath).get();

        if (!predictionDoc.exists) {
            console.log(`⚠️ No ML prediction found for game ${gameId}`);
            return;
        }

        const predictionData = predictionDoc.data();
        const predictedWinner = predictionData.prediction.winner;
        const confidence = predictionData.prediction.confidence;

        // Calculate accuracy metrics
        const wasCorrect = predictedWinner === actualWinner;
        const margin = Math.abs(homeScore - awayScore);

        // ML Accuracy Score with confidence calibration
        let accuracyScore = 0;
        if (wasCorrect) {
            // Reward correct predictions more for higher confidence
            accuracyScore = 50 + (confidence / 2); // 50-97.5 range

            // Bonus for correctly predicting blowouts vs close games
            if (confidence > 80 && margin > 14) {
                accuracyScore += 5; // Bonus for predicting blowouts correctly
            } else if (confidence < 60 && margin <= 7) {
                accuracyScore += 3; // Bonus for predicting close games correctly
            }
        } else {
            // Penalize incorrect predictions more for higher confidence
            accuracyScore = 50 - (confidence / 2); // 2.5-50 range

            // Extra penalty for high-confidence wrong predictions
            if (confidence > 80) {
                accuracyScore -= 10;
            }
        }

        // Clamp accuracy score
        accuracyScore = Math.max(0, Math.min(100, accuracyScore));

        const actualOutcome = {
            winner: actualWinner,
            homeScore,
            awayScore,
            margin,
            upset: confidence < 50 && wasCorrect, // Correctly predicted underdog
            blowout: margin > 21,
            overtime: false, // Would need to detect from ESPN data
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            source: 'espn_cache_auto'
        };

        // Update prediction with outcome
        await db.doc(predictionPath).update({
            gameOutcome: actualOutcome,
            accuracyScore: Math.round(accuracyScore * 10) / 10,
            predictionCorrect: wasCorrect,
            confidenceCalibration: {
                predicted: confidence,
                actual: wasCorrect ? 100 : 0,
                calibrationError: Math.abs(confidence - (wasCorrect ? 100 : 0))
            },
            processedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update ML learning metrics
        await updateMLLearningMetrics(year, week, gameId, accuracyScore, wasCorrect, confidence);

        console.log(`✅ ML outcome recorded for game ${gameId}:`, {
            predicted: predictedWinner,
            actual: actualWinner,
            correct: wasCorrect,
            accuracyScore: Math.round(accuracyScore * 10) / 10
        });

    } catch (error) {
        console.error(`❌ Failed to record outcome for game ${gameId}:`, error);
        throw error;
    }
}

/**
 * 📈 UPDATE ML LEARNING METRICS
 * Aggregates performance data for algorithm evolution
 */
async function updateMLLearningMetrics(year, week, gameId, accuracyScore, wasCorrect, confidence) {
    const learningPath = `artifacts/nerdfootball/ml_learning/${year}`;

    try {
        // Update weekly performance
        const weeklyPath = `${learningPath}/weekly_performance/week_${week}`;
        await db.doc(weeklyPath).set({
            [`game_${gameId}`]: {
                accuracyScore,
                correct: wasCorrect,
                confidence,
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            },
            weekSummary: {
                totalGames: admin.firestore.FieldValue.increment(1),
                correctPredictions: admin.firestore.FieldValue.increment(wasCorrect ? 1 : 0),
                averageAccuracy: admin.firestore.FieldValue.increment(accuracyScore),
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            }
        }, { merge: true });

        // Update algorithm performance
        const algorithmVersion = 'v1.0'; // Will be dynamic in production
        const algorithmPath = `${learningPath}/algorithm_performance/${algorithmVersion}`;

        await db.doc(algorithmPath).set({
            totalPredictions: admin.firestore.FieldValue.increment(1),
            correctPredictions: admin.firestore.FieldValue.increment(wasCorrect ? 1 : 0),
            totalAccuracyScore: admin.firestore.FieldValue.increment(accuracyScore),
            confidenceCalibration: {
                [`confidence_${Math.floor(confidence / 10) * 10}`]: {
                    total: admin.firestore.FieldValue.increment(1),
                    correct: admin.firestore.FieldValue.increment(wasCorrect ? 1 : 0)
                }
            },
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Check if algorithm evolution is needed
        await evaluateAlgorithmEvolution(year, algorithmVersion);

        console.log(`📊 ML learning metrics updated for game ${gameId}`);

    } catch (error) {
        console.error('❌ Failed to update ML learning metrics:', error);
        throw error;
    }
}

/**
 * 🧬 EVALUATE ALGORITHM EVOLUTION
 * Determines if algorithm needs to evolve based on performance
 */
async function evaluateAlgorithmEvolution(year, algorithmVersion) {
    const learningPath = `artifacts/nerdfootball/ml_learning/${year}`;

    try {
        const algorithmDoc = await db.doc(`${learningPath}/algorithm_performance/${algorithmVersion}`).get();

        if (!algorithmDoc.exists) {
            return;
        }

        const performance = algorithmDoc.data();
        const totalPredictions = performance.totalPredictions || 0;
        const correctPredictions = performance.correctPredictions || 0;
        const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;

        // Evolution triggers
        const shouldEvolve = (
            totalPredictions >= 10 && // Minimum sample size
            (accuracy < 0.60 || // Low accuracy threshold
             totalPredictions % 25 === 0) // Periodic review every 25 predictions
        );

        if (shouldEvolve) {
            await proposeAlgorithmEvolution(year, algorithmVersion, accuracy, performance);
        }

    } catch (error) {
        console.error('❌ Algorithm evolution evaluation failed:', error);
    }
}

/**
 * 🔬 PROPOSE ALGORITHM EVOLUTION
 * Creates evolution proposals based on performance analysis
 */
async function proposeAlgorithmEvolution(year, currentVersion, accuracy, performance) {
    const evolutionPath = `artifacts/nerdfootball/ml_learning/${year}/algorithm_evolution`;

    try {
        // Analyze factor effectiveness (simplified for v1.0)
        const factorAnalysis = analyzeFactorEffectiveness(performance);

        // Generate new algorithm version
        const currentVersionNum = parseFloat(currentVersion.replace('v', ''));
        const newVersion = `v${(currentVersionNum + 0.1).toFixed(1)}`;

        const evolutionProposal = {
            currentVersion,
            proposedVersion: newVersion,
            currentAccuracy: Math.round(accuracy * 1000) / 10, // Percentage with 1 decimal
            performanceData: {
                totalPredictions: performance.totalPredictions,
                correctPredictions: performance.correctPredictions,
                accuracy: accuracy
            },
            factorAnalysis,
            proposedChanges: generateProposedChanges(factorAnalysis),
            rationale: generateEvolutionRationale(accuracy, performance),
            proposedAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending_review',
            autoApprove: accuracy < 0.50 // Auto-approve if performance is very poor
        };

        // Save evolution proposal
        const proposalRef = await db.collection(evolutionPath).add(evolutionProposal);

        console.log('🧬 Algorithm evolution proposed:', {
            proposalId: proposalRef.id,
            version: newVersion,
            accuracy: Math.round(accuracy * 100) + '%',
            autoApprove: evolutionProposal.autoApprove
        });

        // Auto-approve critical improvements
        if (evolutionProposal.autoApprove) {
            await autoApproveEvolution(proposalRef.id, evolutionProposal);
        }

    } catch (error) {
        console.error('❌ Failed to propose algorithm evolution:', error);
    }
}

/**
 * 📊 ANALYZE FACTOR EFFECTIVENESS
 * Simplified analysis for v1.0 - would be more sophisticated in production
 */
function analyzeFactorEffectiveness(performance) {
    const accuracy = performance.correctPredictions / performance.totalPredictions;

    // Adaptive factor multipliers based on overall performance
    if (accuracy > 0.70) {
        // Good performance - minor adjustments
        return {
            offensiveRating: 1.02,
            defensiveRating: 1.01,
            recentForm: 0.98,
            homeFieldAdvantage: 1.05,
            turnoverDifferential: 1.03,
            injuryImpact: 0.95,
            coachingClutch: 1.01
        };
    } else if (accuracy < 0.50) {
        // Poor performance - major adjustments
        return {
            offensiveRating: 0.8,
            defensiveRating: 1.3,
            recentForm: 0.7,
            homeFieldAdvantage: 1.4,
            turnoverDifferential: 1.5,
            injuryImpact: 0.6,
            coachingClutch: 0.8
        };
    } else {
        // Moderate performance - balanced adjustments
        return {
            offensiveRating: 1.1,
            defensiveRating: 1.05,
            recentForm: 0.9,
            homeFieldAdvantage: 1.15,
            turnoverDifferential: 1.2,
            injuryImpact: 0.8,
            coachingClutch: 0.95
        };
    }
}

/**
 * 🎯 GENERATE PROPOSED CHANGES
 */
function generateProposedChanges(factorAnalysis) {
    return Object.keys(factorAnalysis).map(factor => ({
        factor,
        currentWeight: 'baseline',
        proposedMultiplier: factorAnalysis[factor],
        impact: factorAnalysis[factor] > 1.1 ? 'increase' :
                factorAnalysis[factor] < 0.9 ? 'decrease' : 'maintain'
    }));
}

/**
 * 📝 GENERATE EVOLUTION RATIONALE
 */
function generateEvolutionRationale(accuracy, performance) {
    const accuracyPercent = Math.round(accuracy * 100);
    const total = performance.totalPredictions;

    if (accuracy < 0.50) {
        return `Critical performance issue: ${accuracyPercent}% accuracy over ${total} predictions requires immediate algorithm adjustment.`;
    } else if (accuracy < 0.60) {
        return `Below-target performance: ${accuracyPercent}% accuracy suggests factor weight rebalancing needed.`;
    } else if (total % 25 === 0) {
        return `Periodic review: After ${total} predictions at ${accuracyPercent}% accuracy, evaluating optimization opportunities.`;
    } else {
        return `Performance monitoring: Continuous improvement evaluation at ${accuracyPercent}% accuracy.`;
    }
}

/**
 * ⚡ AUTO-APPROVE CRITICAL EVOLUTIONS
 */
async function autoApproveEvolution(proposalId, proposal) {
    try {
        // In production, this would update the live algorithm weights
        console.log('🔄 Auto-approving critical algorithm evolution:', proposal.proposedVersion);

        // Update proposal status
        const evolutionPath = `artifacts/nerdfootball/ml_learning/2025/algorithm_evolution`;
        await db.collection(evolutionPath).doc(proposalId).update({
            status: 'auto_approved',
            approvedAt: admin.firestore.FieldValue.serverTimestamp(),
            approvalReason: 'Critical performance threshold triggered auto-approval'
        });

    } catch (error) {
        console.error('❌ Failed to auto-approve evolution:', error);
    }
}

/**
 * 🎯 MANUAL PREDICTION RECORDING API
 * For testing and manual outcome entry
 */
exports.recordPredictionOutcome = functions.https.onCall(async (data, context) => {
    // Verify user authentication for security
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { gameId, winner, homeScore, awayScore, homeTeam, awayTeam } = data;

    try {
        const game = {
            id: gameId,
            h: homeTeam,
            a: awayTeam,
            homeScore: homeScore.toString(),
            awayScore: awayScore.toString()
        };

        await recordMLPredictionOutcome(game);

        return {
            success: true,
            message: `Outcome recorded for game ${gameId}`,
            gameId,
            winner
        };

    } catch (error) {
        console.error('❌ Manual outcome recording failed:', error);
        throw new functions.https.HttpsError('internal', 'Failed to record outcome');
    }
});

/**
 * 📊 GET ML PERFORMANCE STATS
 * API endpoint for retrieving ML learning metrics
 */
exports.getMLPerformanceStats = functions.https.onCall(async (data, context) => {
    try {
        const { year = 2025, week } = data;
        const learningPath = `artifacts/nerdfootball/ml_learning/${year}`;

        // Get algorithm performance
        const algorithmDoc = await db.doc(`${learningPath}/algorithm_performance/v1.0`).get();
        const algorithmStats = algorithmDoc.exists ? algorithmDoc.data() : null;

        // Get weekly performance if specified
        let weeklyStats = null;
        if (week) {
            const weeklyDoc = await db.doc(`${learningPath}/weekly_performance/week_${week}`).get();
            weeklyStats = weeklyDoc.exists ? weeklyDoc.data() : null;
        }

        // Calculate derived metrics
        const accuracy = algorithmStats ?
            (algorithmStats.correctPredictions / algorithmStats.totalPredictions) : 0;

        return {
            success: true,
            stats: {
                algorithm: {
                    version: 'v1.0',
                    accuracy: Math.round(accuracy * 1000) / 10,
                    totalPredictions: algorithmStats?.totalPredictions || 0,
                    correctPredictions: algorithmStats?.correctPredictions || 0,
                    lastUpdated: algorithmStats?.lastUpdated
                },
                weekly: weeklyStats,
                year
            }
        };

    } catch (error) {
        console.error('❌ Failed to get ML performance stats:', error);
        throw new functions.https.HttpsError('internal', 'Failed to retrieve stats');
    }
});

module.exports = {
    processGameOutcomes: exports.processGameOutcomes,
    recordPredictionOutcome: exports.recordPredictionOutcome,
    getMLPerformanceStats: exports.getMLPerformanceStats
};