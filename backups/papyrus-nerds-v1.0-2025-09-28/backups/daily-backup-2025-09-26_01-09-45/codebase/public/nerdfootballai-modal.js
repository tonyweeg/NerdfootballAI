/**
 * NerdFootballAI Modal System
 * Provides AI-powered game predictions with modal interface
 */

class NerdFootballAIModal {
    constructor() {
        this.modalId = 'nerdfootball-ai-modal';
        this.isVisible = false;
        this.currentPrediction = null;
        this.loadingState = false;

        this.createModalHTML();
        this.bindEvents();
    }

    createModalHTML() {
        // Remove existing modal if it exists
        const existingModal = document.getElementById(this.modalId);
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.id = this.modalId;
        modalContainer.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4';

        modalContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-90vh overflow-hidden">
                <!-- Modal Header -->
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🧠</span>
                            <div>
                                <h2 class="text-xl font-bold">NerdFootball AI Prediction</h2>
                                <p class="text-blue-100 text-sm">Powered by Diamond-Level Analytics</p>
                            </div>
                        </div>
                        <button id="ai-modal-close" class="text-white hover:text-gray-200 transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Modal Body -->
                <div class="p-6 max-h-96 overflow-y-auto">
                    <!-- Game Info -->
                    <div id="ai-game-info" class="bg-gray-50 rounded-lg p-4 mb-6">
                        <!-- Populated dynamically -->
                    </div>

                    <!-- Loading State -->
                    <div id="ai-loading" class="text-center py-8 hidden">
                        <div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                        <p class="text-gray-600">🧠 AI analyzing game data...</p>
                        <p class="text-sm text-gray-500 mt-2">Processing matchup, trends, and predictions</p>
                    </div>

                    <!-- Prediction Results -->
                    <div id="ai-results" class="hidden">
                        <!-- Prediction Summary -->
                        <div id="ai-prediction-summary" class="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-4">
                            <!-- Populated dynamically -->
                        </div>

                        <!-- Detailed Analysis -->
                        <div id="ai-detailed-analysis" class="space-y-4">
                            <!-- Populated dynamically -->
                        </div>

                        <!-- Confidence Factors -->
                        <div class="mt-6">
                            <h4 class="font-semibold text-gray-800 mb-3">🎯 Key Factors</h4>
                            <div id="ai-confidence-factors" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <!-- Populated dynamically -->
                            </div>
                        </div>
                    </div>

                    <!-- Error State -->
                    <div id="ai-error" class="text-center py-8 hidden">
                        <div class="text-red-500 text-4xl mb-4">⚠️</div>
                        <p class="text-red-600 font-medium">AI Prediction Error</p>
                        <p id="ai-error-message" class="text-gray-600 mt-2">Unable to generate prediction at this time.</p>
                        <button id="ai-retry" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            🔄 Retry Prediction
                        </button>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="bg-gray-50 px-6 py-4 flex justify-between items-center">
                    <div class="text-sm text-gray-500">
                        <span class="inline-flex items-center">
                            <span class="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            AI powered by DIAMOND analytics
                        </span>
                    </div>
                    <div class="flex gap-3">
                        <button id="ai-modal-cancel" class="px-4 py-2 text-gray-600 hover:text-gray-800">
                            Cancel
                        </button>
                        <button id="ai-apply-prediction" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 hidden">
                            ⚡ Apply Prediction
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalContainer);
    }

    bindEvents() {
        const modal = document.getElementById(this.modalId);

        // Close modal events
        document.getElementById('ai-modal-close')?.addEventListener('click', () => this.hide());
        document.getElementById('ai-modal-cancel')?.addEventListener('click', () => this.hide());

        // Click outside to close
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hide();
            }
        });

        // Retry button
        document.getElementById('ai-retry')?.addEventListener('click', () => {
            if (this.currentGameData) {
                this.generatePrediction(this.currentGameData.gameId, this.currentGameData.awayTeam, this.currentGameData.homeTeam);
            }
        });

        // Apply prediction button
        document.getElementById('ai-apply-prediction')?.addEventListener('click', () => {
            this.applyPredictionToPick();
        });

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    show(gameId, awayTeam, homeTeam) {
        console.log(`🧠 AI_MODAL_DEBUG: Opening AI modal for ${awayTeam} @ ${homeTeam} (Game ${gameId})`);

        this.currentGameData = { gameId, awayTeam, homeTeam };

        // Update game info
        this.updateGameInfo(gameId, awayTeam, homeTeam);

        // Show modal
        const modal = document.getElementById(this.modalId);
        modal.classList.remove('hidden');
        this.isVisible = true;

        // Start prediction generation
        this.generatePrediction(gameId, awayTeam, homeTeam);
    }

    hide() {
        console.log('🧠 AI_MODAL_DEBUG: Closing AI modal');
        const modal = document.getElementById(this.modalId);
        modal.classList.add('hidden');
        this.isVisible = false;
        this.currentGameData = null;
        this.currentPrediction = null;

        // Reset states
        this.showLoading(false);
        this.showResults(false);
        this.showError(false);
    }

    updateGameInfo(gameId, awayTeam, homeTeam) {
        const gameInfoEl = document.getElementById('ai-game-info');
        gameInfoEl.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800">Game ${gameId}</h3>
                    <p class="text-gray-600">
                        <span class="font-medium text-blue-600">${awayTeam}</span> @ <span class="font-medium text-green-600">${homeTeam}</span>
                    </p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-gray-500">AI Analysis Request</p>
                    <p class="text-xs text-gray-400">${new Date().toLocaleTimeString()}</p>
                </div>
            </div>
        `;
    }

    async generatePrediction(gameId, awayTeam, homeTeam) {
        console.log(`🧠 AI_MODAL_DEBUG: Generating prediction for ${awayTeam} @ ${homeTeam}`);

        this.loadingState = true;
        this.showLoading(true);
        this.showResults(false);
        this.showError(false);

        try {
            // Simulate AI prediction generation with realistic data
            const prediction = await this.callAIPredictionAPI(gameId, awayTeam, homeTeam);

            this.currentPrediction = prediction;
            this.displayPrediction(prediction);

            this.showLoading(false);
            this.showResults(true);

        } catch (error) {
            console.error('🧠 AI_MODAL_DEBUG: Prediction generation failed:', error);
            this.showLoading(false);
            this.showError(true, error.message);
        }

        this.loadingState = false;
    }

    getRealTeamDatabase() {
        // Your real team insights database
        return {
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
            // Week 4 Teams - 2025 Season
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
    }

    async callAIPredictionAPI(gameId, awayTeam, homeTeam) {
        // Consistent processing delay (no random timing)
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Generate deterministic prediction based on your team insights
        const prediction = this.generateMockPrediction(gameId, awayTeam, homeTeam);

        return prediction;
    }

    generateMockPrediction(gameId, awayTeam, homeTeam) {
        // Use REAL team insights instead of mock data
        const teamDatabase = this.getRealTeamDatabase();

        const awayData = teamDatabase[awayTeam] || {
            offense: 75, defense: 75, recentForm: 75, homeAdvantage: 3.0,
            passingOffense: 75, rushingOffense: 75, passingDefense: 75, rushingDefense: 75,
            turnoverDiff: 0, injuryImpact: 5, coachingRating: 75, clutchFactor: 75
        };

        const homeData = teamDatabase[homeTeam] || {
            offense: 75, defense: 75, recentForm: 75, homeAdvantage: 3.0,
            passingOffense: 75, rushingOffense: 75, passingDefense: 75, rushingDefense: 75,
            turnoverDiff: 0, injuryImpact: 5, coachingRating: 75, clutchFactor: 75
        };

        // Calculate win probabilities using real team data
        let homeWinProb = 50;
        homeWinProb += ((homeData.offense - awayData.defense) * 0.25);
        homeWinProb += ((homeData.defense - awayData.offense) * 0.25);
        homeWinProb += ((homeData.recentForm - awayData.recentForm) * 0.15);
        homeWinProb += (homeData.homeAdvantage * 3);

        homeWinProb = Math.max(15, Math.min(95, homeWinProb));
        const awayWinProb = 100 - homeWinProb;

        const predictedWinner = homeWinProb > 50 ? homeTeam : awayTeam;
        const confidence = Math.max(awayWinProb, homeWinProb);

        // Generate DETERMINISTIC projected score based on team offensive ratings
        const baseScore = 21; // NFL average
        const awayScore = Math.round(baseScore + (awayData.offense - 75) * 0.15); // Scale offense rating to points
        const homeScore = Math.round(baseScore + (homeData.offense - 75) * 0.15 + homeData.homeAdvantage); // Add home advantage

        return {
            gameId,
            awayTeam,
            homeTeam,
            predictedWinner,
            confidence: Math.round(confidence),
            awayWinProbability: Math.round(awayWinProb),
            homeWinProbability: Math.round(homeWinProb),
            projectedScore: {
                away: awayScore,
                home: homeScore
            },
            keyFactors: [
                `⚡ Offensive Power: ${homeTeam} ${homeData.offense} vs ${awayTeam} ${awayData.offense} (${homeData.offense > awayData.offense ? homeTeam : awayTeam} +${Math.abs(homeData.offense - awayData.offense)})`,
                `🛡️ Defensive Strength: ${homeTeam} ${homeData.defense} vs ${awayTeam} ${awayData.defense} (${homeData.defense > awayData.defense ? homeTeam : awayTeam} +${Math.abs(homeData.defense - awayData.defense)})`,
                `📈 Recent Form: ${homeTeam} ${homeData.recentForm}% vs ${awayTeam} ${awayData.recentForm}% (${homeData.recentForm > awayData.recentForm ? homeTeam : awayTeam} advantage)`,
                `🏠 Home Field Advantage: +${homeData.homeAdvantage} points for ${homeTeam}`,
                `🧠 Coaching Rating: ${homeTeam} ${homeData.coachingRating} vs ${awayTeam} ${awayData.coachingRating} (${homeData.coachingRating > awayData.coachingRating ? homeTeam : awayTeam} +${Math.abs(homeData.coachingRating - awayData.coachingRating)})`,
                `💪 Clutch Factor: ${homeTeam} ${homeData.clutchFactor} vs ${awayTeam} ${awayData.clutchFactor} (${homeData.clutchFactor > awayData.clutchFactor ? homeTeam : awayTeam} +${Math.abs(homeData.clutchFactor - awayData.clutchFactor)})`
            ],
            detailedStats: {
                away: awayData,
                home: homeData
            },
            analysisTimestamp: new Date().toISOString(),
            modelVersion: 'DIAMOND-v3.0-Deterministic',
            reasoning: `${predictedWinner} predicted based on: Offense differential (${homeData.offense > awayData.offense ? '+' + (homeData.offense - awayData.offense) : (homeData.offense - awayData.offense)}), Defense differential (${homeData.defense > awayData.defense ? '+' + (homeData.defense - awayData.defense) : (homeData.defense - awayData.defense)}), Home advantage (+${homeData.homeAdvantage}), Form differential (${homeData.recentForm > awayData.recentForm ? '+' + (homeData.recentForm - awayData.recentForm) : (homeData.recentForm - awayData.recentForm)})`
        };
    }

    displayPrediction(prediction) {
        // Update prediction summary
        const summaryEl = document.getElementById('ai-prediction-summary');
        const winnerIcon = prediction.predictedWinner === prediction.homeTeam ? '🏠' : '✈️';

        summaryEl.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">
                        ${winnerIcon} ${prediction.predictedWinner}
                    </h3>
                    <p class="text-gray-600">Predicted Winner</p>
                </div>
                <div class="text-right">
                    <div class="text-2xl font-bold text-blue-600">${prediction.confidence}%</div>
                    <p class="text-sm text-gray-600">Confidence</p>
                </div>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-4 text-center">
                <div class="bg-white rounded p-3">
                    <div class="text-lg font-semibold">${prediction.awayWinProbability}%</div>
                    <div class="text-sm text-gray-600">${prediction.awayTeam}</div>
                </div>
                <div class="bg-white rounded p-3">
                    <div class="text-lg font-semibold">${prediction.homeWinProbability}%</div>
                    <div class="text-sm text-gray-600">${prediction.homeTeam}</div>
                </div>
            </div>
        `;

        // Update detailed analysis
        const analysisEl = document.getElementById('ai-detailed-analysis');
        analysisEl.innerHTML = `
            <div class="bg-white rounded-lg p-4 border">
                <h4 class="font-semibold text-gray-800 mb-2">📊 Projected Score</h4>
                <div class="text-center">
                    <span class="text-2xl font-bold text-blue-600">${prediction.awayTeam} ${prediction.projectedScore.away}</span>
                    <span class="text-gray-500 mx-3">-</span>
                    <span class="text-2xl font-bold text-green-600">${prediction.homeTeam} ${prediction.projectedScore.home}</span>
                </div>
            </div>
            <div class="bg-white rounded-lg p-4 border">
                <h4 class="font-semibold text-gray-800 mb-2">🤖 Model Info</h4>
                <p class="text-sm text-gray-600">Version: ${prediction.modelVersion}</p>
                <p class="text-sm text-gray-600">Generated: ${new Date(prediction.analysisTimestamp).toLocaleString()}</p>
                <div class="mt-2 p-2 bg-blue-50 rounded">
                    <p class="text-xs text-blue-700"><strong>Analysis:</strong> ${prediction.reasoning}</p>
                </div>
            </div>
        `;

        // Update confidence factors
        const factorsEl = document.getElementById('ai-confidence-factors');
        factorsEl.innerHTML = prediction.keyFactors.map((factor, index) => `
            <div class="bg-white rounded p-3 border text-sm">
                <span class="text-blue-600 font-medium">${index + 1}.</span>
                <span class="text-gray-700 ml-1">${factor}</span>
            </div>
        `).join('');

        // Show apply button if prediction is confident enough
        const applyBtn = document.getElementById('ai-apply-prediction');
        if (prediction.confidence >= 55) {
            applyBtn.classList.remove('hidden');
            applyBtn.innerHTML = `⚡ Apply ${prediction.predictedWinner} (${prediction.confidence}%)`;
        } else {
            applyBtn.classList.add('hidden');
        }
    }

    applyPredictionToPick() {
        if (!this.currentPrediction || !this.currentGameData) return;

        console.log(`🧠 AI_MODAL_DEBUG: Applying prediction ${this.currentPrediction.predictedWinner} for game ${this.currentGameData.gameId}`);

        // Find the game's select element and update it
        const teamSelect = document.querySelector(`select[data-game-id="${this.currentGameData.gameId}"][data-field="winner"]`);
        if (teamSelect) {
            teamSelect.value = this.currentPrediction.predictedWinner;

            // Trigger change event for auto-save
            teamSelect.dispatchEvent(new Event('blur'));

            // Visual feedback
            teamSelect.style.backgroundColor = '#dcfce7';
            setTimeout(() => {
                teamSelect.style.backgroundColor = '';
            }, 2000);
        }

        // Close modal
        this.hide();

        // Show success toast
        this.showSuccessToast(`Applied AI prediction: ${this.currentPrediction.predictedWinner} (${this.currentPrediction.confidence}% confidence)`);
    }

    showSuccessToast(message) {
        // Create and show a temporary success toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-60 transform translate-x-full transition-transform duration-300';
        toast.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-lg">✅</span>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(toast);

        // Slide in
        setTimeout(() => {
            toast.style.transform = 'translate-x-0';
        }, 100);

        // Slide out and remove
        setTimeout(() => {
            toast.style.transform = 'translate-x-full';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 4000);
    }

    showLoading(show) {
        const loadingEl = document.getElementById('ai-loading');
        if (show) {
            loadingEl.classList.remove('hidden');
        } else {
            loadingEl.classList.add('hidden');
        }
    }

    showResults(show) {
        const resultsEl = document.getElementById('ai-results');
        if (show) {
            resultsEl.classList.remove('hidden');
        } else {
            resultsEl.classList.add('hidden');
        }
    }

    showError(show, errorMessage = '') {
        const errorEl = document.getElementById('ai-error');
        if (show) {
            errorEl.classList.remove('hidden');
            const errorMessageEl = document.getElementById('ai-error-message');
            if (errorMessage && errorMessageEl) {
                errorMessageEl.textContent = errorMessage;
            }
        } else {
            errorEl.classList.add('hidden');
        }
    }
}

// Global AI Modal instance
window.nerdFootballAI = new NerdFootballAIModal();

// Global function for brain icon clicks
window.showAIPrediction = function(gameId, awayTeam, homeTeam, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    console.log(`🧠 BRAIN_ICON_DEBUG: Brain icon clicked for Game ${gameId}: ${awayTeam} @ ${homeTeam}`);
    window.nerdFootballAI.show(gameId, awayTeam, homeTeam);
};

console.log('🧠 NerdFootball AI Modal System loaded successfully');