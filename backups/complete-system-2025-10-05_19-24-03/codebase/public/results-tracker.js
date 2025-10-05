/**
 * RESULTS TRACKER
 * Fetches actual game results from ESPN and compares to AI predictions
 */

class ResultsTracker {
    constructor() {
        this.debugMode = true;
        this.currentSeason = new Date().getFullYear();
    }

    async getESPNResults(week) {
        const url = `https://www.espn.com/nfl/scoreboard/_/week/${week}/year/${this.currentSeason}/seasontype/2`;

        if (this.debugMode) {
            console.log(`🎯 RESULTS_TRACKER: Fetching results from ESPN for Week ${week}...`);
            console.log(`🎯 RESULTS_TRACKER: URL: ${url}`);
        }

        try {
            // We'll use the ESPN API instead of scraping the webpage
            const apiUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&season=${this.currentSeason}&seasontype=2`;
            const response = await fetch(apiUrl, {
                mode: 'cors',
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                const results = this.parseESPNResults(data.events || []);

                if (this.debugMode) {
                    console.log(`🎯 RESULTS_TRACKER: ✅ Fetched ${results.length} game results for Week ${week}`);
                }

                return { success: true, results, source: 'espn_api' };
            }
        } catch (error) {
            if (this.debugMode) {
                console.log(`🎯 RESULTS_TRACKER: ❌ ESPN API failed: ${error.message}`);
            }
        }

        return { success: false, results: [], error: 'Failed to fetch results' };
    }

    parseESPNResults(events) {
        const results = [];

        events.forEach(event => {
            if (event.competitions && event.competitions[0] && event.competitions[0].competitors) {
                const competition = event.competitions[0];
                const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
                const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
                const status = event.status.type.name;

                if (homeTeam && awayTeam && status === 'STATUS_FINAL') {
                    const homeScore = parseInt(homeTeam.score || 0);
                    const awayScore = parseInt(awayTeam.score || 0);
                    const winner = homeScore > awayScore ? homeTeam.team.abbreviation : awayTeam.team.abbreviation;

                    results.push({
                        gameId: event.id,
                        matchup: `${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation}`,
                        homeTeam: homeTeam.team.abbreviation,
                        awayTeam: awayTeam.team.abbreviation,
                        homeScore,
                        awayScore,
                        winner,
                        margin: Math.abs(homeScore - awayScore),
                        status: 'FINAL',
                        shortName: event.shortName
                    });

                    if (this.debugMode) {
                        console.log(`🎯 RESULTS_TRACKER: ${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation} → ${winner} wins ${homeScore}-${awayScore}`);
                    }
                }
            }
        });

        return results;
    }

    async updatePredictionsWithResults(week) {
        if (this.debugMode) {
            console.log(`🎯 RESULTS_TRACKER: Updating Week ${week} predictions with actual results...`);
        }

        try {
            // Get actual results from ESPN
            const resultsData = await this.getESPNResults(week);
            if (!resultsData.success) {
                return { success: false, error: 'Failed to fetch results from ESPN' };
            }

            // Get our predictions
            const docPath = `artifacts/nerdfootball/ai-predictions/week-${week}-${this.currentSeason}`;
            const doc = await window.db.doc(docPath).get();

            if (!doc.exists()) {
                return { success: false, error: `No predictions found for Week ${week}` };
            }

            const predictionsData = doc.data();
            let updatedCount = 0;
            let correctPredictions = 0;

            // Update each prediction with actual results
            predictionsData.predictions.forEach(prediction => {
                const actualResult = resultsData.results.find(r =>
                    r.homeTeam === prediction.homeTeam && r.awayTeam === prediction.awayTeam
                );

                if (actualResult) {
                    prediction.actualWinner = actualResult.winner;
                    prediction.actualScore = `${actualResult.homeScore}-${actualResult.awayScore}`;
                    prediction.actualMargin = actualResult.margin;
                    prediction.predictionCorrect = prediction.aiPick === actualResult.winner;
                    prediction.resultUpdated = new Date().toISOString();

                    if (prediction.predictionCorrect) {
                        correctPredictions++;
                    }

                    updatedCount++;

                    if (this.debugMode) {
                        const status = prediction.predictionCorrect ? '✅ CORRECT' : '❌ WRONG';
                        console.log(`🎯 RESULTS_TRACKER: ${prediction.matchup} → AI: ${prediction.aiPick} (${prediction.confidence}%) vs Reality: ${actualResult.winner} → ${status}`);
                    }
                }
            });

            // Save updated predictions
            await window.db.doc(docPath).set(predictionsData);

            const accuracy = updatedCount > 0 ? (correctPredictions / updatedCount * 100).toFixed(1) : 0;

            if (this.debugMode) {
                console.log(`🎯 RESULTS_TRACKER: ✅ Updated ${updatedCount} predictions`);
                console.log(`🎯 RESULTS_TRACKER: 📊 Week ${week} Accuracy: ${accuracy}% (${correctPredictions}/${updatedCount})`);
            }

            return {
                success: true,
                week,
                updatedCount,
                correctPredictions,
                accuracy: parseFloat(accuracy),
                results: resultsData.results
            };

        } catch (error) {
            console.error(`🎯 RESULTS_TRACKER: ❌ Failed to update predictions:`, error);
            return { success: false, error: error.message };
        }
    }

    async analyzeAccuracyTrends() {
        if (this.debugMode) {
            console.log(`🎯 RESULTS_TRACKER: Analyzing accuracy trends across all weeks...`);
        }

        try {
            const collection = await window.db.collection('artifacts/nerdfootball/ai-predictions').get();
            const weeklyAccuracy = [];
            const confidenceAnalysis = { high: [], medium: [], low: [] };
            const surprises = [];

            collection.forEach(doc => {
                const data = doc.data();
                // Only analyze documents from current season (doc ID format: week-X-YYYY)
                if (doc.id.includes(`-${this.currentSeason}`) && data.predictions) {
                    const completedPredictions = data.predictions.filter(p => p.actualWinner !== null && p.actualWinner !== undefined);

                    if (completedPredictions.length > 0) {
                    const correct = completedPredictions.filter(p => p.predictionCorrect === true).length;
                    const accuracy = (correct / completedPredictions.length * 100);

                    weeklyAccuracy.push({
                        week: data.week,
                        accuracy,
                        correct,
                        total: completedPredictions.length
                    });

                    // Analyze by confidence level
                    completedPredictions.forEach(p => {
                        if (p.confidence >= 70) {
                            confidenceAnalysis.high.push(p);
                        } else if (p.confidence >= 50) {
                            confidenceAnalysis.medium.push(p);
                        } else {
                            confidenceAnalysis.low.push(p);
                        }

                        // Find surprising results (high confidence wrong picks)
                        if (p.confidence >= 75 && !p.predictionCorrect) {
                            surprises.push({
                                week: data.week,
                                matchup: p.matchup,
                                aiPick: p.aiPick,
                                actualWinner: p.actualWinner,
                                confidence: p.confidence,
                                reasoning: p.reasoning
                            });
                        }
                    });
                    }
                }
            });

            const analysis = {
                weeklyAccuracy,
                overallAccuracy: weeklyAccuracy.length > 0 ?
                    (weeklyAccuracy.reduce((sum, w) => sum + w.correct, 0) / weeklyAccuracy.reduce((sum, w) => sum + w.total, 0) * 100).toFixed(1) : 0,
                confidenceBreakdown: {
                    high: this.calculateAccuracyForGroup(confidenceAnalysis.high),
                    medium: this.calculateAccuracyForGroup(confidenceAnalysis.medium),
                    low: this.calculateAccuracyForGroup(confidenceAnalysis.low)
                },
                surprises,
                totalGames: weeklyAccuracy.reduce((sum, w) => sum + w.total, 0)
            };

            if (this.debugMode) {
                console.log(`🎯 RESULTS_TRACKER: Analysis complete - ${analysis.totalGames} games, ${analysis.overallAccuracy}% accuracy`);
                console.log(`🎯 RESULTS_TRACKER: High confidence accuracy: ${analysis.confidenceBreakdown.high.accuracy}%`);
                console.log(`🎯 RESULTS_TRACKER: ${analysis.surprises.length} surprising wrong picks found`);
            }

            return { success: true, analysis };

        } catch (error) {
            console.error(`🎯 RESULTS_TRACKER: ❌ Failed to analyze trends:`, error);
            return { success: false, error: error.message };
        }
    }

    calculateAccuracyForGroup(predictions) {
        if (predictions.length === 0) return { accuracy: 0, total: 0, correct: 0 };

        const correct = predictions.filter(p => p.predictionCorrect === true).length;
        return {
            accuracy: (correct / predictions.length * 100).toFixed(1),
            total: predictions.length,
            correct
        };
    }

    generateLearningInsights(analysis) {
        const insights = [];

        // Confidence calibration insights
        if (parseFloat(analysis.confidenceBreakdown.high.accuracy) < 70) {
            insights.push({
                type: 'overconfidence',
                message: `High confidence picks (≥70%) only hit ${analysis.confidenceBreakdown.high.accuracy}% - need better confidence calibration`,
                action: 'Lower confidence thresholds or improve team strength calculations'
            });
        }

        // Surprise analysis
        if (analysis.surprises.length > 0) {
            const commonFactors = this.findCommonFactors(analysis.surprises);
            insights.push({
                type: 'surprises',
                message: `${analysis.surprises.length} high-confidence wrong picks - common factors: ${commonFactors.join(', ')}`,
                action: 'Investigate these factors for future predictions'
            });
        }

        // Accuracy trends
        if (analysis.weeklyAccuracy.length >= 2) {
            const recent = analysis.weeklyAccuracy.slice(-2);
            const trend = recent[1].accuracy - recent[0].accuracy;

            if (trend > 5) {
                insights.push({
                    type: 'improvement',
                    message: `Accuracy improving: +${trend.toFixed(1)}% from last week`,
                    action: 'Continue current approach'
                });
            } else if (trend < -5) {
                insights.push({
                    type: 'decline',
                    message: `Accuracy declining: ${trend.toFixed(1)}% from last week`,
                    action: 'Review recent prediction factors'
                });
            }
        }

        return insights;
    }

    findCommonFactors(surprises) {
        // Simple analysis of common themes in wrong predictions
        const factors = [];

        const homeUnderdogs = surprises.filter(s => s.confidence >= 70 && s.aiPick !== s.matchup.split(' @ ')[1]);
        if (homeUnderdogs.length > 1) {
            factors.push('road favorites struggling');
        }

        return factors.length > 0 ? factors : ['various factors'];
    }
}

// Make available globally
window.ResultsTracker = new ResultsTracker();

// Test function
window.testResultsTracking = async function(week = 4) {
    console.log(`🎯 RESULTS_TRACKER: Testing results tracking for Week ${week}...`);
    const result = await window.ResultsTracker.updatePredictionsWithResults(week);
    console.log('Test result:', result);
    return result;
};