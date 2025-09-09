// DIAMOND-LEVEL PICK ANALYTICS FRONTEND INTEGRATION
// Frontend JavaScript library for consuming pick analytics data

class PickAnalyticsClient {
    constructor(functionsInstance, poolId = null) {
        this.functions = functionsInstance;
        this.poolId = poolId || this.getCurrentPool();
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    }

    getCurrentPool() {
        // Use existing pool detection logic from the main app
        if (typeof getCurrentPool === 'function') {
            return getCurrentPool();
        }
        return 'nerduniverse-2025'; // Default fallback
    }

    // Cache management
    getCacheKey(week, type = 'analytics') {
        return `${this.poolId}_${week}_${type}`;
    }

    setCacheData(week, data, type = 'analytics') {
        const cacheKey = this.getCacheKey(week, type);
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });
    }

    getCacheData(week, type = 'analytics') {
        const cacheKey = this.getCacheKey(week, type);
        const cached = this.cache.get(cacheKey);
        
        if (!cached) return null;
        
        // Check if cache is expired
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(cacheKey);
            return null;
        }
        
        return cached.data;
    }

    // Fetch analytics data for a specific week
    async getWeeklyAnalytics(week, useCache = true) {
        try {
            // Check cache first
            if (useCache) {
                const cachedData = this.getCacheData(week);
                if (cachedData) {
                    return { success: true, data: cachedData, fromCache: true };
                }
            }

            // Use the global httpsCallable from the main app (same pattern as other functions)
            const getAnalyticsFunction = window.httpsCallable(this.functions, 'getAnalytics');
            const result = await getAnalyticsFunction({
                poolId: this.poolId,
                week: week.toString()
            });

            if (result.data && result.data.success) {
                const analyticsData = result.data.analytics;
                
                // Cache the result
                if (useCache) {
                    this.setCacheData(week, analyticsData);
                }

                return {
                    success: true,
                    data: analyticsData,
                    fromCache: false,
                    generated: result.data.generated || false
                };
            } else {
                throw new Error('Failed to fetch analytics data');
            }
        } catch (error) {
            console.error('Error fetching weekly analytics:', error);
            return {
                success: false,
                error: error.message,
                fromCache: false
            };
        }
    }

    // Force recalculation of analytics
    async recalculateAnalytics(week) {
        try {
            const calculateFunction = window.httpsCallable(this.functions, 'calculateAnalytics');
            const result = await calculateFunction({
                poolId: this.poolId,
                week: week.toString(),
                force: true
            });

            if (result.data && result.data.success) {
                // Clear cache for this week
                const cacheKey = this.getCacheKey(week);
                this.cache.delete(cacheKey);

                return {
                    success: true,
                    data: result.data.analytics,
                    message: result.data.message
                };
            } else {
                throw new Error('Failed to recalculate analytics');
            }
        } catch (error) {
            console.error('Error recalculating analytics:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get pick percentages for a specific game
    async getGamePickPercentages(week, gameId) {
        const analyticsResult = await this.getWeeklyAnalytics(week);
        
        if (!analyticsResult.success) {
            return { success: false, error: analyticsResult.error };
        }

        const gameAnalytics = analyticsResult.data.gameAnalytics[gameId];
        
        if (!gameAnalytics) {
            return {
                success: false,
                error: 'Game not found in analytics data'
            };
        }

        return {
            success: true,
            data: {
                gameId,
                teamPercentages: gameAnalytics.teamPercentages,
                totalPicks: gameAnalytics.totalPicks,
                popularityScore: gameAnalytics.popularityScore,
                averageConfidence: gameAnalytics.confidenceStats.average
            }
        };
    }

    // Get user similarity data
    async getUserSimilarities(week) {
        const analyticsResult = await this.getWeeklyAnalytics(week);
        
        if (!analyticsResult.success) {
            return { success: false, error: analyticsResult.error };
        }

        return {
            success: true,
            data: analyticsResult.data.userSimilarity
        };
    }

    // Get pick clusters
    async getPickClusters(week) {
        const analyticsResult = await this.getWeeklyAnalytics(week);
        
        if (!analyticsResult.success) {
            return { success: false, error: analyticsResult.error };
        }

        return {
            success: true,
            data: analyticsResult.data.pickClusters
        };
    }

    // Get confidence analytics
    async getConfidenceAnalytics(week) {
        const analyticsResult = await this.getWeeklyAnalytics(week);
        
        if (!analyticsResult.success) {
            return { success: false, error: analyticsResult.error };
        }

        return {
            success: true,
            data: analyticsResult.data.confidenceAnalytics
        };
    }

    // Get contrarian picks (picks against popular opinion)
    async getContrarianPicks(week, threshold = 30) {
        const analyticsResult = await this.getWeeklyAnalytics(week);
        
        if (!analyticsResult.success) {
            return { success: false, error: analyticsResult.error };
        }

        const contrarianGames = [];
        
        Object.entries(analyticsResult.data.gameAnalytics).forEach(([gameId, gameData]) => {
            if (gameData.contrarian && gameData.contrarian.picks.length > 0) {
                contrarianGames.push({
                    gameId,
                    contrarianPicks: gameData.contrarian.picks,
                    contrarianScore: gameData.contrarian.score,
                    popularityScore: gameData.popularityScore
                });
            }
        });

        // Sort by contrarian score (highest first)
        contrarianGames.sort((a, b) => b.contrarianScore - a.contrarianScore);

        return {
            success: true,
            data: contrarianGames
        };
    }

    // Get most/least confident games
    async getConfidenceExtremes(week) {
        const analyticsResult = await this.getWeeklyAnalytics(week);
        
        if (!analyticsResult.success) {
            return { success: false, error: analyticsResult.error };
        }

        return {
            success: true,
            data: {
                highestConfidence: analyticsResult.data.confidenceAnalytics.extremes.highestConfidence,
                lowestConfidence: analyticsResult.data.confidenceAnalytics.extremes.lowestConfidence
            }
        };
    }

    // Get analytics summary for dashboard
    async getAnalyticsSummary(week) {
        const analyticsResult = await this.getWeeklyAnalytics(week);
        
        if (!analyticsResult.success) {
            return { success: false, error: analyticsResult.error };
        }

        const data = analyticsResult.data;
        
        // Calculate summary statistics
        const gameCount = Object.keys(data.gameAnalytics).length;
        const totalPicks = data.totalPicksets;
        
        let consensusGames = 0;
        let contrarianGames = 0;
        let highConfidenceGames = 0;
        let lowConfidenceGames = 0;

        Object.values(data.gameAnalytics).forEach(gameData => {
            if (gameData.popularityScore >= 70) consensusGames++;
            if (gameData.contrarian.score >= 30) contrarianGames++;
            if (gameData.confidenceStats.average >= 12) highConfidenceGames++;
            if (gameData.confidenceStats.average <= 6) lowConfidenceGames++;
        });

        const clusterSizes = {
            highAgreement: data.pickClusters.highAgreement?.length || 0,
            moderateAgreement: data.pickClusters.moderateAgreement?.length || 0,
            lowAgreement: data.pickClusters.lowAgreement?.length || 0,
            contrarians: data.pickClusters.contrarians?.length || 0
        };

        return {
            success: true,
            data: {
                week,
                totalGames: gameCount,
                totalPicksets: totalPicks,
                lastUpdated: data.metadata?.lastUpdated,
                summary: {
                    consensusGames,
                    contrarianGames,
                    highConfidenceGames,
                    lowConfidenceGames
                },
                clusters: clusterSizes,
                dataQuality: data.metadata?.dataQuality || 'unknown'
            }
        };
    }

    // Clear all cached data
    clearCache() {
        this.cache.clear();
    }

    // Get cache statistics
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Utility functions for UI integration
class PickAnalyticsUI {
    constructor(analyticsClient) {
        this.analytics = analyticsClient;
    }

    // Generate HTML for team pick percentages
    formatTeamPercentages(gameId, teamPercentages, totalPicks) {
        if (!teamPercentages || Object.keys(teamPercentages).length === 0) {
            return '<span class="text-slate-500">No picks yet</span>';
        }

        const teams = Object.entries(teamPercentages)
            .sort((a, b) => b[1].percentage - a[1].percentage);

        let html = '<div class="space-y-1">';
        
        teams.forEach(([team, data]) => {
            const barWidth = data.percentage;
            const opacity = data.percentage >= 50 ? 'opacity-100' : 'opacity-75';
            
            html += `
                <div class="flex items-center justify-between text-sm">
                    <span class="font-medium">${team}</span>
                    <div class="flex items-center space-x-2">
                        <div class="w-16 h-2 bg-slate-200 rounded overflow-hidden">
                            <div class="h-full bg-blue-500 ${opacity}" style="width: ${barWidth}%"></div>
                        </div>
                        <span class="text-xs text-slate-600 w-8">${data.percentage}%</span>
                        <span class="text-xs text-slate-500">(${data.count})</span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    // Format confidence statistics
    formatConfidenceStats(confidenceStats) {
        if (!confidenceStats) {
            return '<span class="text-slate-500">No data</span>';
        }

        const avg = confidenceStats.average;
        const confidenceClass = avg >= 12 ? 'text-green-600' : avg <= 6 ? 'text-red-600' : 'text-yellow-600';
        const confidenceLabel = avg >= 12 ? 'High' : avg <= 6 ? 'Low' : 'Medium';

        return `
            <div class="text-sm">
                <div class="flex items-center space-x-2">
                    <span class="text-slate-600">Average:</span>
                    <span class="font-semibold ${confidenceClass}">${avg}</span>
                    <span class="text-xs px-2 py-1 rounded ${confidenceClass} bg-opacity-10">${confidenceLabel}</span>
                </div>
            </div>
        `;
    }

    // Generate pick cluster display
    formatPickClusters(clusters) {
        if (!clusters || Object.keys(clusters).length === 0) {
            return '<span class="text-slate-500">No cluster data available</span>';
        }

        let html = '<div class="space-y-3">';

        const clusterTypes = [
            { key: 'highAgreement', label: 'High Agreement (80%+)', color: 'green' },
            { key: 'moderateAgreement', label: 'Moderate Agreement (60-80%)', color: 'blue' },
            { key: 'lowAgreement', label: 'Low Agreement (40-60%)', color: 'yellow' },
            { key: 'contrarians', label: 'Contrarians (<40%)', color: 'red' }
        ];

        clusterTypes.forEach(({ key, label, color }) => {
            const cluster = clusters[key] || [];
            if (cluster.length > 0) {
                html += `
                    <div class="border border-${color}-200 rounded-lg p-3">
                        <h4 class="font-semibold text-${color}-700 mb-2">${label}</h4>
                        <div class="space-y-1">
                `;
                
                cluster.forEach(user => {
                    html += `
                        <div class="flex justify-between text-sm">
                            <span>${user.user.displayName}</span>
                            <span class="text-${color}-600">${user.averageAgreement}%</span>
                        </div>
                    `;
                });
                
                html += '</div></div>';
            }
        });

        html += '</div>';
        return html;
    }

    // Display analytics summary
    async displaySummary(containerId, week) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container ${containerId} not found`);
            return;
        }

        container.innerHTML = '<div class="loader">Loading analytics...</div>';

        try {
            const result = await this.analytics.getAnalyticsSummary(week);
            
            if (!result.success) {
                container.innerHTML = `<div class="text-red-600">Error: ${result.error}</div>`;
                return;
            }

            const data = result.data;
            
            container.innerHTML = `
                <div class="bg-white rounded-lg border border-slate-200 p-4">
                    <h3 class="text-lg font-semibold text-slate-800 mb-4">Week ${week} Pick Analytics</h3>
                    
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600">${data.totalGames}</div>
                            <div class="text-sm text-slate-600">Games</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">${data.totalPicksets}</div>
                            <div class="text-sm text-slate-600">Picksets</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-purple-600">${data.summary.consensusGames}</div>
                            <div class="text-sm text-slate-600">Consensus</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-orange-600">${data.summary.contrarianGames}</div>
                            <div class="text-sm text-slate-600">Contrarian</div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 class="font-semibold text-slate-700 mb-2">Confidence Distribution</h4>
                            <div class="space-y-1">
                                <div class="flex justify-between text-sm">
                                    <span>High Confidence Games:</span>
                                    <span class="text-green-600">${data.summary.highConfidenceGames}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span>Low Confidence Games:</span>
                                    <span class="text-red-600">${data.summary.lowConfidenceGames}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 class="font-semibold text-slate-700 mb-2">User Clusters</h4>
                            <div class="space-y-1">
                                <div class="flex justify-between text-sm">
                                    <span>High Agreement:</span>
                                    <span class="text-green-600">${data.clusters.highAgreement}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span>Moderate Agreement:</span>
                                    <span class="text-blue-600">${data.clusters.moderateAgreement}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span>Contrarians:</span>
                                    <span class="text-red-600">${data.clusters.contrarians}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${data.lastUpdated ? `
                        <div class="mt-4 pt-4 border-t border-slate-200">
                            <div class="text-xs text-slate-500">
                                Last updated: ${new Date(data.lastUpdated.seconds * 1000).toLocaleString()}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        } catch (error) {
            container.innerHTML = `<div class="text-red-600">Error loading analytics: ${error.message}</div>`;
            console.error('Error displaying analytics summary:', error);
        }
    }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.PickAnalyticsClient = PickAnalyticsClient;
    window.PickAnalyticsUI = PickAnalyticsUI;
}// Enhanced Game Data Display Functions
// Displays comprehensive ESPN data points in the game UI

// Add enhanced ESPN data function for game cards
async function addEnhancedGameData(gameId, game, gameState) {
    try {
        // Guard against undefined game object
        if (!game || !game.away || !game.home) {
            return; // Silently exit if game data is invalid
        }
        
        const espnGames = await window.espnApi.getWeekGames(currentWeek);
        const espnGame = espnGames.find(eg => 
            (eg.a === game.away || eg.awayTeam === game.away) && 
            (eg.h === game.home || eg.homeTeam === game.home)
        );
        
        if (espnGame) {
            const containerId = gameState === 'IN_PROGRESS' ? `live-data-${gameId}` : `game-data-${gameId}`;
            const container = document.getElementById(containerId);
            
            if (container) {
                let enhancedData = [];
                
                // Weather information
                if (espnGame.weather) {
                    enhancedData.push(`<div class="flex items-center gap-1">
                        <span>🌡️</span>
                        <span>${espnGame.weather.temperature}°F ${espnGame.weather.condition || espnGame.weather.description || ''}</span>
                    </div>`);
                }
                
                // Venue information
                if (espnGame.venue) {
                    enhancedData.push(`<div class="flex items-center gap-1">
                        <span>${espnGame.venue.indoor ? '🏟️' : '🌤️'}</span>
                        <span>${espnGame.venue.name}</span>
                    </div>`);
                }
                
                // Win probability for live games
                if (gameState === 'IN_PROGRESS' && espnGame.probability) {
                    const homeProb = espnGame.probability.homeWinPercentage || espnGame.probability.homeWin;
                    const awayProb = espnGame.probability.awayWinPercentage || espnGame.probability.awayWin;
                    
                    if (homeProb || awayProb) {
                        enhancedData.push(`<div class="flex items-center gap-1 text-emerald-600 font-medium">
                            <span>📊</span>
                            <span>Win Prob: ${game.home} ${homeProb}% | ${game.away} ${awayProb}%</span>
                        </div>`);
                    }
                }
                
                // Broadcast information
                if (espnGame.broadcasts && espnGame.broadcasts.length > 0) {
                    const network = espnGame.broadcasts[0].network || espnGame.broadcasts[0].names?.[0];
                    if (network) {
                        enhancedData.push(`<div class="flex items-center gap-1">
                            <span>📺</span>
                            <span>${network}</span>
                        </div>`);
                    }
                }
                
                // Team records
                if (espnGame.teamRecords) {
                    const homeRecord = espnGame.teamRecords.home;
                    const awayRecord = espnGame.teamRecords.away;
                    if (homeRecord || awayRecord) {
                        enhancedData.push(`<div class="flex items-center gap-1 text-slate-500">
                            <span>📋</span>
                            <span>${homeRecord ? `${game.home} (${homeRecord})` : ''} ${awayRecord ? `${game.away} (${awayRecord})` : ''}</span>
                        </div>`);
                    }
                }
                
                // Quarter scores for completed games
                if (gameState === 'COMPLETED' && espnGame.quarterScores) {
                    const homeQuarters = espnGame.quarterScores.home || [];
                    const awayQuarters = espnGame.quarterScores.away || [];
                    
                    if (homeQuarters.length > 0 && awayQuarters.length > 0) {
                        const quarterDisplay = homeQuarters.map((hq, i) => {
                            const aq = awayQuarters[i] || { score: 0 };
                            return `Q${i + 1}: ${aq.score}-${hq.score}`;
                        }).join(' | ');
                        
                        enhancedData.push(`<div class="flex items-center gap-1 text-slate-600 text-xs">
                            <span>🏈</span>
                            <span>${quarterDisplay}</span>
                        </div>`);
                    }
                }
                
                if (enhancedData.length > 0) {
                    container.innerHTML = enhancedData.join('');
                }
            }
        }
    } catch (error) {
        console.warn('Could not load enhanced game data:', error);
    }
}

// Function to add enhanced data containers to game cards
function addEnhancedDataContainers() {
    // Find all game cards that need enhanced data containers
    const gameCards = document.querySelectorAll('[id^="game-"], [id^="live-data-"]').forEach(container => {
        if (!container.querySelector('.live-game-data')) {
            const enhancedContainer = document.createElement('div');
            enhancedContainer.className = 'live-game-data mt-1 space-y-0.5 text-xs text-slate-600';
            container.appendChild(enhancedContainer);
        }
    });
}

// Initialize enhanced data display when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add containers for enhanced data
    addEnhancedDataContainers();
    
    // Listen for ESPN data updates
    window.addEventListener('espnScoresUpdated', (event) => {
        console.log('ESPN scores updated, refreshing enhanced data displays');
        // Refresh enhanced data for all visible games
        if (typeof renderActivePicksSummary === 'function') {
            renderActivePicksSummary();
        }
    });
});

// Enhanced Game Data for Picks Area - Shows ESPN data while users make selections
async function addEnhancedGameDataToPicks(gameId, game, gameState) {
    try {
        // Guard against undefined game object
        if (!game || !game.away || !game.home) {
            return; // Silently exit if game data is invalid
        }
        
        // Get current week from global variable or default to 1
        const weekNumber = (typeof currentWeek !== 'undefined') ? currentWeek : 
                          (typeof window.currentWeek !== 'undefined') ? window.currentWeek : 1;
        
        console.log('🔍 Loading ESPN data for picks - Week:', weekNumber, 'Game:', game.away, '@', game.home);
        
        const espnGames = await window.espnApi.getWeekGames(weekNumber);
        const espnGame = espnGames.find(eg => 
            (eg.a === game.away || eg.awayTeam === game.away) && 
            (eg.h === game.home || eg.homeTeam === game.home)
        );
        
        if (espnGame) {
            const containerId = `picks-espn-data-${gameId}`;
            const container = document.getElementById(containerId);
            
            console.log('📍 Found ESPN game data, looking for container:', containerId);
            
            if (container) {
                console.log('✅ Found container, populating with ESPN data');
                let enhancedData = [];
                
                // Weather information - crucial for picks
                if (espnGame.weather && espnGame.weather.temperature) {
                    const tempIcon = espnGame.weather.temperature > 70 ? '☀️' : 
                                   espnGame.weather.temperature > 50 ? '🌤️' : 
                                   espnGame.weather.temperature > 32 ? '☁️' : '❄️';
                    enhancedData.push(`<div class="flex items-center gap-1 text-xs text-slate-600">
                        <span class="text-sm">${tempIcon}</span>
                        <span><strong>${espnGame.weather.temperature}°F</strong> ${espnGame.weather.condition || espnGame.weather.description || ''}</span>
                    </div>`);
                }
                
                // Venue information - indoor/outdoor affects weather impact
                if (espnGame.venue && espnGame.venue.name) {
                    const venueIcon = espnGame.venue.indoor ? '🏟️' : '🌤️';
                    const location = espnGame.venue.city && espnGame.venue.state ? 
                                   ` • ${espnGame.venue.city}, ${espnGame.venue.state}` : '';
                    enhancedData.push(`<div class="flex items-center gap-1 text-xs text-slate-600">
                        <span class="text-sm">${venueIcon}</span>
                        <span><strong>${espnGame.venue.name}</strong>${location}</span>
                    </div>`);
                }
                
                // Team records - helpful for picks
                if (espnGame.teamRecords && (espnGame.teamRecords.home.length > 0 || espnGame.teamRecords.away.length > 0)) {
                    const homeRecord = espnGame.teamRecords.home.find(r => r.type === 'total' || r.type === 'overall')?.record;
                    const awayRecord = espnGame.teamRecords.away.find(r => r.type === 'total' || r.type === 'overall')?.record;
                    
                    if (homeRecord || awayRecord) {
                        enhancedData.push(`<div class="flex items-center gap-1 text-xs text-slate-600">
                            <span class="text-sm">📋</span>
                            <span>Records: ${awayRecord ? `${game.away} (${awayRecord})` : game.away} @ ${homeRecord ? `${game.home} (${homeRecord})` : game.home}</span>
                        </div>`);
                    }
                }
                
                // Broadcast information - shows importance/primetime
                if (espnGame.broadcasts && espnGame.broadcasts.length > 0) {
                    const networks = espnGame.broadcasts.map(b => b.network).filter(Boolean).join(', ');
                    if (networks) {
                        const isPrimetime = networks.includes('NBC') || networks.includes('ESPN') || 
                                          networks.includes('FOX') || networks.includes('CBS');
                        const tvIcon = isPrimetime ? '📺⭐' : '📺';
                        enhancedData.push(`<div class="flex items-center gap-1 text-xs text-slate-600">
                            <span class="text-sm">${tvIcon}</span>
                            <span><strong>${networks}</strong>${isPrimetime ? ' (Primetime)' : ''}</span>
                        </div>`);
                    }
                }
                
                // Live win probability (for in-progress games)
                if (gameState === 'IN_PROGRESS' && espnGame.situation && espnGame.situation.probability) {
                    const homeProb = espnGame.situation.probability.homeWinPercentage || espnGame.situation.probability.homeWin;
                    const awayProb = espnGame.situation.probability.awayWinPercentage || espnGame.situation.probability.awayWin;
                    
                    if (homeProb && awayProb) {
                        enhancedData.push(`<div class="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <span class="text-sm">📊</span>
                            <span>Live Win Prob: ${game.away} ${awayProb}% • ${game.home} ${homeProb}%</span>
                        </div>`);
                    }
                }
                
                // Game situation (for in-progress games)
                if (gameState === 'IN_PROGRESS' && espnGame.situation) {
                    let situationText = [];
                    if (espnGame.situation.down && espnGame.situation.distance) {
                        situationText.push(`${espnGame.situation.down} & ${espnGame.situation.distance}`);
                    }
                    if (espnGame.situation.possession) {
                        situationText.push(`${espnGame.situation.possession} has ball`);
                    }
                    if (espnGame.situation.timeRemaining) {
                        situationText.push(espnGame.situation.timeRemaining);
                    }
                    
                    if (situationText.length > 0) {
                        enhancedData.push(`<div class="flex items-center gap-1 text-xs text-blue-600 font-medium">
                            <span class="text-sm">⚡</span>
                            <span>${situationText.join(' • ')}</span>
                        </div>`);
                    }
                }
                
                // Add helpful picking context based on data
                if (enhancedData.length > 0) {
                    // Show the data in a compact, picks-friendly format
                    container.innerHTML = `
                        <div class="space-y-1">
                            ${enhancedData.join('')}
                        </div>
                    `;
                    container.classList.remove('hidden');
                } else {
                    container.classList.add('hidden');
                }
            } else {
                console.warn('❌ Container not found:', containerId);
            }
        } else {
            console.log('❌ No ESPN game found for:', game.away, '@', game.home);
        }
    } catch (error) {
        console.error('🚫 Error loading enhanced game data for picks:', error);
    }
}

// Export function for use in main app
if (typeof window !== 'undefined') {
    window.addEnhancedGameData = addEnhancedGameData;
    window.addEnhancedGameDataToPicks = addEnhancedGameDataToPicks;
    window.addEnhancedDataContainers = addEnhancedDataContainers;
}// Live Game Auto-Refresh System
// Automatically refreshes game data during live games and updates UI

class LiveGameRefresh {
    constructor() {
        this.refreshInterval = null;
        this.isRefreshing = false;
        this.refreshIntervalMs = 30 * 1000; // 30 seconds during live games
        this.lastRefreshTime = null;
        this.activeListeners = new Set();
    }

    // Check if there are any live games currently in progress
    async hasLiveGames(weekNumber = null) {
        try {
            const currentWeek = weekNumber || window.currentWeek || this.getCurrentWeek();
            
            // Get games from cache or fetch fresh
            let games = [];
            if (window.gameStateCache) {
                const fetchFunction = async () => {
                    const response = await fetch(`nfl_2025_week_${currentWeek}.json`);
                    if (response.ok) {
                        const weekData = await response.json();
                        return weekData.games || [];
                    }
                    return [];
                };
                games = await window.gameStateCache.cacheSchedule(currentWeek, fetchFunction);
            } else {
                // Fallback to direct fetch
                const response = await fetch(`nfl_2025_week_${currentWeek}.json`);
                if (response.ok) {
                    const weekData = await response.json();
                    games = weekData.games || [];
                }
            }

            const now = new Date();
            const liveGames = games.filter(game => {
                const gameTime = new Date(game.dt || game.kickoff);
                const gameEndApprox = new Date(gameTime.getTime() + (4 * 60 * 60 * 1000)); // ~4 hours later
                
                // Game is live if it has started but not completed and doesn't have a winner yet
                return now >= gameTime && 
                       now <= gameEndApprox && 
                       (!game.winner || game.winner === 'TBD');
            });

            console.log(`🔍 Live games check for Week ${currentWeek}: ${liveGames.length} live games found`);
            return liveGames.length > 0;
        } catch (error) {
            console.warn('Error checking for live games:', error);
            return false;
        }
    }

    // Get current NFL week (fallback only)
    getCurrentWeek() {
        // Use global week management system
        if (typeof window !== 'undefined' && window.currentWeek) {
            return window.currentWeek;
        }
        
        // Fallback calculation for 2025 season
        const now = new Date();
        const seasonStart = new Date('2025-09-04');
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        const weeksDiff = Math.floor((now - seasonStart) / weekMs) + 1;
        return Math.min(Math.max(weeksDiff, 1), 18);
    }

    // Start auto-refresh for live games
    async startLiveRefresh(weekNumber = null) {
        if (this.refreshInterval) {
            console.log('🔄 Live refresh already running');
            return;
        }

        const currentWeek = weekNumber || window.currentWeek || this.getCurrentWeek();
        const hasLive = await this.hasLiveGames(currentWeek);

        if (!hasLive) {
            console.log(`⏸️ No live games found for Week ${currentWeek} - skipping auto-refresh`);
            return;
        }

        console.log(`🚀 Starting live game refresh for Week ${currentWeek} every ${this.refreshIntervalMs/1000}s`);

        this.refreshInterval = setInterval(async () => {
            await this.performLiveRefresh(currentWeek);
        }, this.refreshIntervalMs);

        // Do initial refresh
        await this.performLiveRefresh(currentWeek);
    }

    // Stop auto-refresh
    stopLiveRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('🛑 Live game refresh stopped');
        }
    }

    // Perform the actual live refresh
    async performLiveRefresh(weekNumber) {
        if (this.isRefreshing) {
            console.log('⏭️ Refresh already in progress, skipping');
            return;
        }

        this.isRefreshing = true;
        this.lastRefreshTime = new Date();

        try {
            console.log(`🔄 Live refresh for Week ${weekNumber}...`);

            // 1. Check if ESPN Score Sync is available and use it
            if (window.espnScoreSync) {
                const syncResult = await window.espnScoreSync.syncWeekScores(weekNumber);
                if (syncResult.success && syncResult.updatedCount > 0) {
                    console.log(`✅ ESPN sync updated ${syncResult.updatedCount} games`);
                    this.notifyUIRefresh(weekNumber, syncResult.updatedCount);
                    return;
                }
            }

            // 2. Fallback: Invalidate cache and trigger UI refresh
            if (window.gameStateCache) {
                const clearedEntries = window.gameStateCache.invalidateAfterDataUpdate('live_game_refresh', weekNumber);
                console.log(`💎 Cache cleared: ${clearedEntries} entries`);
            }

            // 3. Notify UI components to refresh
            this.notifyUIRefresh(weekNumber, 0);

            // 4. Check if we should continue refreshing
            const stillHasLive = await this.hasLiveGames(weekNumber);
            if (!stillHasLive) {
                console.log('🏁 No more live games detected, stopping auto-refresh');
                this.stopLiveRefresh();
            }

        } catch (error) {
            console.error('❌ Live refresh error:', error);
        } finally {
            this.isRefreshing = false;
        }
    }

    // Notify UI components that data has been refreshed
    notifyUIRefresh(weekNumber, updatedCount = 0) {
        // Dispatch custom event
        const event = new CustomEvent('liveGameRefresh', {
            detail: {
                weekNumber,
                updatedCount,
                timestamp: new Date().toISOString()
            }
        });
        window.dispatchEvent(event);

        // Show visual notification if on the right page
        this.showRefreshNotification(weekNumber, updatedCount);

        // Trigger specific UI updates
        this.triggerUIUpdates(weekNumber);
    }

    // Show refresh notification to user
    showRefreshNotification(weekNumber, updatedCount) {
        // Only show if we're on a relevant page
        const currentView = this.getCurrentView();
        if (!['picks', 'leaderboard', 'grid'].includes(currentView)) {
            return;
        }

        // Instead of toast, make updated games glow
        if (updatedCount > 0) {
            this.glowUpdatedGames();
        }
    }

    // Get current view/page the user is on
    getCurrentView() {
        // Check which container is visible
        if (document.getElementById('picks-container') && !document.getElementById('picks-container').classList.contains('hidden')) {
            return 'picks';
        }
        if (document.getElementById('leaderboard-container') && !document.getElementById('leaderboard-container').classList.contains('hidden')) {
            return 'leaderboard';
        }
        if (document.getElementById('grid-container') && !document.getElementById('grid-container').classList.contains('hidden')) {
            return 'grid';
        }
        return 'unknown';
    }

    // Make updated games glow
    glowUpdatedGames() {
        console.log('🌟 DEBUG: glowUpdatedGames called (v2 - targeted)');
        
        // Track unique game containers to avoid duplicates
        const glowedElements = new Set();
        
        // Strategy 1: Find game row containers (most reliable)
        const gameContainers = document.querySelectorAll('.pick-game-row, .game-row, div[id^="game-row-"]');
        console.log(`🌟 DEBUG: Found ${gameContainers.length} game containers`);
        
        gameContainers.forEach(container => {
            if (!glowedElements.has(container)) {
                container.classList.add('game-updated-glow');
                glowedElements.add(container);
                
                setTimeout(() => {
                    container.classList.remove('game-updated-glow');
                }, 3000);
            }
        });
        
        // Strategy 2: Find parent containers of game buttons (fallback)
        if (glowedElements.size === 0) {
            console.log('🌟 DEBUG: No game containers found, trying button parents');
            
            const gameButtons = document.querySelectorAll('.winner-btn[data-game-id]');
            const uniqueParents = new Map();
            
            gameButtons.forEach(button => {
                const gameId = button.dataset.gameId;
                if (!uniqueParents.has(gameId)) {
                    // Find the container that holds both team buttons
                    const parent = button.closest('div[class*="border"], .pick-game-row, .game-container');
                    if (parent) {
                        uniqueParents.set(gameId, parent);
                    }
                }
            });
            
            console.log(`🌟 DEBUG: Found ${uniqueParents.size} unique game containers from buttons`);
            
            uniqueParents.forEach(parent => {
                parent.classList.add('game-updated-glow');
                glowedElements.add(parent);
                
                setTimeout(() => {
                    parent.classList.remove('game-updated-glow');
                }, 3000);
            });
        }
        
        console.log(`🌟 DEBUG: Applied glow to ${glowedElements.size} unique game containers`);

        // Also use the football indicator for consistency
        if (typeof window.showGameUpdateIndicator === 'function') {
            window.showGameUpdateIndicator();
            console.log('🌟 DEBUG: Football indicator shown');
        }
    }

    // Create toast notification (keeping for other uses if needed)
    createToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            'bg-blue-500'
        }`;
        toast.textContent = message;

        document.body.appendChild(toast);

        // Fade in
        setTimeout(() => toast.style.opacity = '1', 100);

        // Auto remove
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, duration);
    }

    // Trigger specific UI updates
    triggerUIUpdates(weekNumber) {
        // Reload current week if it matches
        if (typeof currentWeek !== 'undefined' && currentWeek == weekNumber) {
            // Trigger leaderboard refresh if visible
            const leaderboardBody = document.getElementById('leaderboard-body');
            if (leaderboardBody && leaderboardBody.closest('.hidden') === null) {
                if (typeof calculateLeaderboardOptimized === 'function') {
                    console.log('🔄 Refreshing leaderboard after live update');
                    calculateLeaderboardOptimized();
                }
            }

            // Trigger picks summary refresh if visible
            const picksSummary = document.getElementById('picks-summary-container');
            if (picksSummary && picksSummary.closest('.hidden') === null) {
                if (typeof loadPicksSummary === 'function') {
                    console.log('🔄 Refreshing picks summary after live update');
                    loadPicksSummary();
                }
            }

            // Trigger grid refresh if visible
            const gridContainer = document.getElementById('grid-container');
            if (gridContainer && gridContainer.closest('.hidden') === null) {
                if (typeof loadGridData === 'function') {
                    console.log('🔄 Refreshing grid after live update');
                    loadGridData();
                }
            }
        }
    }

    // Add event listener for live game refresh
    addEventListener(callback) {
        const listener = (event) => callback(event.detail);
        this.activeListeners.add(listener);
        window.addEventListener('liveGameRefresh', listener);
        return listener;
    }

    // Remove event listener
    removeEventListener(listener) {
        if (this.activeListeners.has(listener)) {
            window.removeEventListener('liveGameRefresh', listener);
            this.activeListeners.delete(listener);
        }
    }

    // Initialize the live refresh system
    initialize() {
        console.log('💎 Live Game Refresh System Initialized');

        // Start live refresh if there are live games
        this.startLiveRefresh();

        // Set up automatic restart when navigating to different weeks
        if (typeof allUI !== 'undefined' && allUI.weekSelector) {
            allUI.weekSelector.addEventListener('change', () => {
                this.stopLiveRefresh();
                setTimeout(() => this.startLiveRefresh(), 1000);
            });
        }

        // Set up page visibility handling (pause when tab is not active)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('📴 Tab hidden - pausing live refresh');
                this.stopLiveRefresh();
            } else {
                console.log('📱 Tab visible - resuming live refresh');
                this.startLiveRefresh();
            }
        });
    }

    // Get status info
    getStatus() {
        return {
            isActive: !!this.refreshInterval,
            isRefreshing: this.isRefreshing,
            lastRefresh: this.lastRefreshTime,
            intervalMs: this.refreshIntervalMs,
            currentWeek: window.currentWeek || this.getCurrentWeek()
        };
    }
}

// Export for use in main app
if (typeof window !== 'undefined') {
    window.LiveGameRefresh = LiveGameRefresh;
}

// Add test function for debugging
if (typeof window !== 'undefined') {
    window.testGameGlow = function() {
        console.log('🧪 TEST: Triggering game glow effect manually');
        if (window.liveGameRefresh) {
            window.liveGameRefresh.glowUpdatedGames();
        } else {
            console.error('🧪 TEST: liveGameRefresh not initialized yet, creating instance');
            window.liveGameRefresh = new LiveGameRefresh();
            window.liveGameRefresh.glowUpdatedGames();
        }
        return 'Test triggered - check console for debug output';
    };
}

// Auto-initialize if in browser
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.liveGameRefresh = new LiveGameRefresh();
        // Initialize after a short delay to ensure other systems are ready
        setTimeout(() => {
            if (window.liveGameRefresh) {
                window.liveGameRefresh.initialize();
            }
        }, 2000);
        console.log('🧪 TEST: You can now run testGameGlow() in console to test the glow effect');
    });
} else if (typeof window !== 'undefined') {
    // DOM already loaded
    window.liveGameRefresh = new LiveGameRefresh();
    setTimeout(() => {
        if (window.liveGameRefresh) {
            window.liveGameRefresh.initialize();
        }
    }, 1000);
    console.log('🧪 TEST: You can now run testGameGlow() in console to test the glow effect');
}