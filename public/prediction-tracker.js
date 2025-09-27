/**
 * PREDICTION TRACKER
 * Records AI predictions and tracks accuracy vs actual results
 */

class PredictionTracker {
    constructor() {
        this.debugMode = true;
    }

    async recordPredictions(weeklyAnalysis) {
        if (this.debugMode) {
            console.log(`🎯 PREDICTION_TRACKER: Recording ${weeklyAnalysis.analyses.length} predictions for Week ${weeklyAnalysis.week}`);
        }

        const predictions = {
            week: weeklyAnalysis.week,
            season: new Date().getFullYear(),
            timestamp: new Date().toISOString(),
            dataSource: 'ESPN_LIVE',
            totalGames: weeklyAnalysis.analyses.length,
            predictions: []
        };

        // Record each game prediction
        weeklyAnalysis.analyses.forEach(analysis => {
            const prediction = {
                gameId: analysis.gameId,
                matchup: analysis.matchup,
                homeTeam: analysis.homeTeam,
                awayTeam: analysis.awayTeam,
                gameTime: analysis.gameTime,
                gameStatus: analysis.gameStatus,

                // AI Prediction
                aiPick: analysis.aiPick,
                confidence: analysis.confidence,
                difficulty: analysis.difficulty,
                reasoning: analysis.reasoning,

                // Data used for prediction
                teamStrengths: {
                    home: analysis.analysis.teamStrength.home,
                    away: analysis.analysis.teamStrength.away
                },
                records: {
                    home: analysis.analysis.records.home,
                    away: analysis.analysis.records.away
                },
                bettingLines: analysis.analysis.bettingLines,
                injuries: analysis.analysis.injuries,

                // Results (to be filled later)
                actualWinner: null,
                actualScore: null,
                predictionCorrect: null,
                actualMargin: null,
                confidenceAccuracy: null
            };

            predictions.predictions.push(prediction);
        });

        // Save to Firebase
        try {
            const docPath = `artifacts/nerdfootball/ai-predictions/week-${weeklyAnalysis.week}-${new Date().getFullYear()}`;
            await window.db.doc(docPath).set(predictions);

            if (this.debugMode) {
                console.log(`🎯 PREDICTION_TRACKER: ✅ Predictions saved to Firebase: ${docPath}`);
            }

            return { success: true, path: docPath, predictions };

        } catch (error) {
            console.error(`🎯 PREDICTION_TRACKER: ❌ Failed to save predictions:`, error);
            return { success: false, error: error.message };
        }
    }

    async updateResults(week, gameId, actualWinner, actualScore) {
        if (this.debugMode) {
            console.log(`🎯 PREDICTION_TRACKER: Updating results for Week ${week}, Game ${gameId}`);
        }

        try {
            const docPath = `artifacts/nerdfootball/ai-predictions/week-${week}-${new Date().getFullYear()}`;
            const doc = await window.db.doc(docPath).get();

            if (!doc.exists) {
                console.error(`🎯 PREDICTION_TRACKER: No predictions found for Week ${week}`);
                return { success: false, error: 'No predictions found' };
            }

            const data = doc.data();
            const prediction = data.predictions.find(p => p.gameId === gameId);

            if (!prediction) {
                console.error(`🎯 PREDICTION_TRACKER: No prediction found for game ${gameId}`);
                return { success: false, error: 'Game not found' };
            }

            // Update with actual results
            prediction.actualWinner = actualWinner;
            prediction.actualScore = actualScore;
            prediction.predictionCorrect = prediction.aiPick === actualWinner;

            // Calculate margin if score provided
            if (actualScore && actualScore.includes('-')) {
                const [homeScore, awayScore] = actualScore.split('-').map(Number);
                prediction.actualMargin = Math.abs(homeScore - awayScore);
            }

            // Save updated data
            await window.db.doc(docPath).set(data);

            if (this.debugMode) {
                console.log(`🎯 PREDICTION_TRACKER: ✅ Results updated - ${prediction.aiPick} vs ${actualWinner} = ${prediction.predictionCorrect ? 'CORRECT' : 'WRONG'}`);
            }

            return { success: true, prediction };

        } catch (error) {
            console.error(`🎯 PREDICTION_TRACKER: ❌ Failed to update results:`, error);
            return { success: false, error: error.message };
        }
    }

    async getAccuracyReport(week = null) {
        if (this.debugMode) {
            console.log(`🎯 PREDICTION_TRACKER: Generating accuracy report${week ? ` for Week ${week}` : ' for all weeks'}`);
        }

        try {
            let predictions = [];

            if (week) {
                // Get specific week
                const docPath = `artifacts/nerdfootball/ai-predictions/week-${week}-${new Date().getFullYear()}`;
                const doc = await window.db.doc(docPath).get();
                if (doc.exists) {
                    predictions = doc.data().predictions;
                }
            } else {
                // Get all weeks
                const collection = await window.db.collection('artifacts/nerdfootball/ai-predictions').get();
                collection.forEach(doc => {
                    // Only include documents from current season (doc ID format: week-X-YYYY)
                    if (doc.id.includes(`-${new Date().getFullYear()}`) && doc.data().predictions) {
                        predictions = predictions.concat(doc.data().predictions);
                    }
                });
            }

            // Calculate accuracy metrics
            const completedGames = predictions.filter(p => p.actualWinner !== null);
            const correctPredictions = completedGames.filter(p => p.predictionCorrect === true);

            const report = {
                totalPredictions: predictions.length,
                completedGames: completedGames.length,
                correctPredictions: correctPredictions.length,
                accuracy: completedGames.length > 0 ? (correctPredictions.length / completedGames.length * 100).toFixed(1) : 0,

                // Confidence analysis
                highConfidenceGames: completedGames.filter(p => p.confidence >= 70),
                lowConfidenceGames: completedGames.filter(p => p.confidence <= 40),

                // By difficulty
                easyPicks: completedGames.filter(p => p.difficulty === 'easy'),
                hardPicks: completedGames.filter(p => p.difficulty === 'very hard'),

                predictions: completedGames
            };

            // Calculate confidence accuracy
            if (report.highConfidenceGames.length > 0) {
                report.highConfidenceAccuracy = (report.highConfidenceGames.filter(p => p.predictionCorrect).length / report.highConfidenceGames.length * 100).toFixed(1);
            }

            if (this.debugMode) {
                console.log(`🎯 PREDICTION_TRACKER: Accuracy Report Generated:`);
                console.log(`📊 Overall: ${report.accuracy}% (${report.correctPredictions}/${report.completedGames})`);
                console.log(`🎯 High Confidence: ${report.highConfidenceAccuracy || 'N/A'}% (${report.highConfidenceGames.length} games)`);
            }

            return { success: true, report };

        } catch (error) {
            console.error(`🎯 PREDICTION_TRACKER: ❌ Failed to generate report:`, error);
            return { success: false, error: error.message };
        }
    }

    async displayAccuracyDashboard() {
        const report = await this.getAccuracyReport();

        if (!report.success) {
            return `<div class="text-red-600">Error loading accuracy report: ${report.error}</div>`;
        }

        const data = report.report;

        return `
            <div class="bg-blue-50 p-4 rounded-lg mb-4">
                <h3 class="font-semibold text-blue-800 mb-3">🎯 AI Prediction Accuracy Report</h3>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div class="bg-white p-3 rounded text-center">
                        <div class="text-2xl font-bold text-green-600">${data.accuracy}%</div>
                        <div class="text-sm text-gray-600">Overall Accuracy</div>
                    </div>
                    <div class="bg-white p-3 rounded text-center">
                        <div class="text-2xl font-bold text-blue-600">${data.correctPredictions}</div>
                        <div class="text-sm text-gray-600">Correct Picks</div>
                    </div>
                    <div class="bg-white p-3 rounded text-center">
                        <div class="text-2xl font-bold text-gray-600">${data.completedGames}</div>
                        <div class="text-sm text-gray-600">Games Tracked</div>
                    </div>
                    <div class="bg-white p-3 rounded text-center">
                        <div class="text-2xl font-bold text-purple-600">${data.highConfidenceAccuracy || 'N/A'}%</div>
                        <div class="text-sm text-gray-600">High Confidence</div>
                    </div>
                </div>

                <div class="text-sm text-gray-700">
                    <div>High Confidence Games (≥70%): ${data.highConfidenceGames.length}</div>
                    <div>Low Confidence Games (≤40%): ${data.lowConfidenceGames.length}</div>
                    <div>Easy Picks: ${data.easyPicks.length} | Hard Picks: ${data.hardPicks.length}</div>
                </div>
            </div>
        `;
    }
}

// Make available globally
window.PredictionTracker = new PredictionTracker();

// Test functions
window.testPredictionTracking = async function() {
    console.log('🎯 PREDICTION_TRACKER: Testing prediction tracking...');

    // Mock weekly analysis for testing
    const mockAnalysis = {
        week: 4,
        analyses: [
            {
                gameId: 'test-401772938',
                matchup: 'SEA @ ARI',
                homeTeam: 'ARI',
                awayTeam: 'SEA',
                aiPick: 'ARI',
                confidence: 65,
                difficulty: 'medium',
                reasoning: ['Home field advantage', 'Better record'],
                analysis: {
                    teamStrength: { home: 70, away: 60 },
                    records: { home: '2-1', away: '1-2' },
                    bettingLines: { spread: 'ARI -3' },
                    injuries: { home: [], away: [] }
                }
            }
        ]
    };

    const result = await window.PredictionTracker.recordPredictions(mockAnalysis);
    console.log('Test result:', result);
    return result;
};