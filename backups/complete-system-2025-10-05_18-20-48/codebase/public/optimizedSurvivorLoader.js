// OPTIMIZED SURVIVOR LOADER
// Sub-500ms performance through intelligent caching and batch operations

class OptimizedSurvivorLoader {
    constructor() {
        this.performanceTarget = 500; // milliseconds
        this.metrics = {
            loads: 0,
            cacheHits: 0,
            cacheMisses: 0,
            totalLoadTime: 0,
            targetMet: 0
        };
    }

    // Main loading function - replaces simpleSurvivorSystem.getSurvivorTable
    async loadSurvivorData(poolId) {
        const startTime = performance.now();
        this.metrics.loads++;
        
        try {
            // Get current week
            const currentWeek = this.getCurrentWeek();
            
            // Use cache manager if available
            if (window.survivorCacheManager) {
                const cached = await window.survivorCacheManager.getCachedOrCompute(poolId, currentWeek);
                
                // Track metrics
                const loadTime = performance.now() - startTime;
                this.updateMetrics(loadTime, cached.fromCache);
                
                // Transform to table format
                const tableData = this.transformToTableFormat(cached.results, cached.stats);
                
                // Log performance
                this.logPerformance(loadTime, cached.fromCache);
                
                return {
                    data: tableData,
                    stats: cached.stats,
                    loadTimeMs: loadTime,
                    fromCache: cached.fromCache
                };
            }
            
            // Fallback to simple system
            console.log('⚠️ Cache manager not available, using simple system');
            return this.fallbackToSimpleSystem(poolId);
            
        } catch (error) {
            console.error('Optimized loader error:', error);
            return this.fallbackToSimpleSystem(poolId);
        }
    }

    // Transform cached results to table format
    transformToTableFormat(results, stats) {
        if (!results) return [];
        
        // Convert object to array and sort
        const tableData = Object.values(results).map(user => ({
            uid: user.uid,
            displayName: user.displayName,
            teamPicked: user.currentPick,
            status: this.mapStatus(user.status),
            reason: user.eliminationReason || '',
            week: user.eliminatedWeek || null,
            cached: true
        }));
        
        // Sort: active users first, then eliminated
        tableData.sort((a, b) => {
            if (a.status !== b.status) {
                const statusOrder = { 'won': 0, 'pending': 1, 'not_started': 2, 'lost': 3, 'eliminated': 4 };
                return (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
            }
            return a.displayName.localeCompare(b.displayName);
        });
        
        return tableData;
    }

    // Map internal status to display status
    mapStatus(status) {
        const statusMap = {
            'survived': 'won',
            'eliminated': 'lost',
            'pending': 'not_started',
            'no_pick': 'eliminated'
        };
        return statusMap[status] || status;
    }

    // Fallback to simple survivor system
    async fallbackToSimpleSystem(poolId) {
        const startTime = performance.now();
        
        if (window.simpleSurvivorSystem) {
            const results = await window.simpleSurvivorSystem.getSurvivorTable(poolId);
            const loadTime = performance.now() - startTime;
            
            this.updateMetrics(loadTime, false);
            this.logPerformance(loadTime, false);
            
            return {
                data: results,
                stats: this.calculateStats(results),
                loadTimeMs: loadTime,
                fromCache: false
            };
        }
        
        throw new Error('No survivor loading system available');
    }

    // Calculate stats from results
    calculateStats(results) {
        const total = results.length;
        const eliminated = results.filter(r => 
            r.status === 'lost' || r.status === 'eliminated'
        ).length;
        const active = total - eliminated;
        
        return {
            totalPlayers: total,
            activePlayers: active,
            eliminatedPlayers: eliminated
        };
    }

    // Get current week (simplified)
    getCurrentWeek() {
        // Use global currentWeek variable if available
        if (typeof window.currentWeek !== 'undefined') {
            return window.currentWeek;
        }
        return 1; // Default to week 1
    }

    // Update performance metrics
    updateMetrics(loadTime, fromCache) {
        if (fromCache) {
            this.metrics.cacheHits++;
        } else {
            this.metrics.cacheMisses++;
        }
        
        this.metrics.totalLoadTime += loadTime;
        
        if (loadTime <= this.performanceTarget) {
            this.metrics.targetMet++;
        }
    }

    // Log performance information
    logPerformance(loadTime, fromCache) {
        const targetMet = loadTime <= this.performanceTarget;
        const icon = targetMet ? '✅' : '⚠️';
        const source = fromCache ? 'CACHE' : 'FRESH';
        
        console.log(
            `${icon} Survivor Load: ${loadTime.toFixed(0)}ms (${source}) - Target: ${this.performanceTarget}ms`
        );
    }

    // Get performance report
    getPerformanceReport() {
        const hitRate = this.metrics.loads > 0 
            ? (this.metrics.cacheHits / this.metrics.loads * 100).toFixed(1)
            : 0;
        
        const avgLoadTime = this.metrics.loads > 0
            ? (this.metrics.totalLoadTime / this.metrics.loads).toFixed(0)
            : 0;
        
        const targetMetRate = this.metrics.loads > 0
            ? (this.metrics.targetMet / this.metrics.loads * 100).toFixed(1)
            : 0;
        
        return {
            totalLoads: this.metrics.loads,
            cacheHitRate: `${hitRate}%`,
            averageLoadTime: `${avgLoadTime}ms`,
            targetMetRate: `${targetMetRate}%`,
            performanceTarget: `${this.performanceTarget}ms`
        };
    }

    // Generate optimized HTML table
    generateOptimizedTable(results) {
        if (!results || results.length === 0) {
            return '<p class="text-gray-500 text-center py-8">No users found.</p>';
        }

        const rows = results.map(user => {
            const statusClass = {
                'won': 'text-green-700 bg-green-100',
                'lost': 'text-red-700 bg-red-100',
                'not_started': 'text-gray-700 bg-gray-100',
                'eliminated': 'text-red-700 bg-red-100',
                'error': 'text-orange-700 bg-orange-100'
            };

            const statusText = {
                'won': 'Won',
                'lost': 'Lost',
                'not_started': 'Not Started',
                'eliminated': 'Eliminated',
                'error': 'Error'
            };

            return `
                <tr class="border-b border-gray-200">
                    <td class="px-4 py-3 font-medium">${user.displayName}</td>
                    <td class="px-4 py-3">${user.teamPicked}</td>
                    <td class="px-4 py-3">
                        <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusClass[user.status] || 'text-gray-700 bg-gray-100'}">
                            ${statusText[user.status] || user.status}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Picked</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Performance testing functions
    async testColdLoad(poolId) {
        console.log('🧪 Testing cold load (no cache)...');
        
        // Invalidate cache first
        if (window.survivorCacheManager) {
            await window.survivorCacheManager.invalidateCache(poolId, this.getCurrentWeek());
        }
        
        // Load without cache
        const result = await this.loadSurvivorData(poolId);
        
        console.log(`Cold load time: ${result.loadTimeMs.toFixed(0)}ms`);
        return result.loadTimeMs;
    }

    async testWarmLoad(poolId) {
        console.log('🧪 Testing warm load (with cache)...');
        
        // Warm cache first
        if (window.survivorCacheManager) {
            await window.survivorCacheManager.warmCache(poolId, this.getCurrentWeek());
        }
        
        // Load with cache
        const result = await this.loadSurvivorData(poolId);
        
        console.log(`Warm load time: ${result.loadTimeMs.toFixed(0)}ms`);
        return result.loadTimeMs;
    }
}

// Initialize globally
window.optimizedSurvivorLoader = new OptimizedSurvivorLoader();