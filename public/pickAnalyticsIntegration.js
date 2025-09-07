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

            // Call Firebase function
            const getAnalyticsFunction = this.functions.httpsCallable('getAnalytics');
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
            const calculateFunction = this.functions.httpsCallable('calculateAnalytics');
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
}