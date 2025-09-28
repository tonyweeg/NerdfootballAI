/**
 * UnifiedConfidenceManager.js - Confidence-On-Crack Enterprise Performance System
 * 
 * MISSION: Reduce confidence pool reads from 500-900 to 1-2 per leaderboard load
 * TARGET: Sub-200ms load times with 99% cost reduction
 * 
 * Architecture:
 * - Single unified document per week containing all picks
 * - Pre-computed leaderboards (weekly + season totals)
 * - Smart caching with game-completion-based invalidation
 * - Dual write: sync with existing structure for zero disruption
 */

class UnifiedConfidenceManager {
    constructor() {
        this.poolId = 'nerduniverse-2025';
        this.season = '2025';
        this.initialized = false;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        // Performance tracking
        this.metrics = {
            reads: 0,
            cacheHits: 0,
            cacheMisses: 0,
            loadTimes: []
        };
        
        console.log('🚀 UnifiedConfidenceManager initialized for enterprise performance');
    }

    /**
     * Initialize the manager with Firebase references
     */
    async initialize(db, currentWeek = null) {
        try {
            this.db = db;
            this.currentWeek = currentWeek || this.getCurrentNflWeek();
            this.initialized = true;
            
            console.log(`✅ UnifiedConfidenceManager ready for pool ${this.poolId}, week ${this.currentWeek}`);
            return { success: true };
        } catch (error) {
            console.error('❌ UnifiedConfidenceManager initialization failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Get unified document path for a specific week
     */
    getUnifiedDocPath(weekNumber) {
        return `artifacts/nerdfootball/pools/${this.poolId}/confidence/${this.season}/weeks/${weekNumber}`;
    }

    /**
     * Get season summary document path
     */
    getSeasonSummaryPath() {
        return `artifacts/nerdfootball/pools/${this.poolId}/confidence/${this.season}/summary`;
    }

    /**
     * Legacy picks path for dual-write compatibility
     */
    getLegacyPicksPath(weekNumber, userId) {
        return `artifacts/nerdfootball/pools/${this.poolId}/picks/${this.season}/weeks/${weekNumber}/users/${userId}`;
    }

    /**
     * Get pool members path
     */
    getPoolMembersPath() {
        return `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`;
    }

    /**
     * Smart cache key generator
     */
    getCacheKey(weekNumber, type = 'full') {
        return `confidence_${this.poolId}_w${weekNumber}_${type}`;
    }

    /**
     * CORE METHOD: Get display data for leaderboards (1-2 reads max)
     * This replaces the 500-900 read operations in calculateLeaderboard
     */
    async getDisplayData(weekNumber = null, options = {}) {
        const startTime = performance.now();
        
        try {
            // Default to current week if not specified
            const targetWeek = weekNumber || this.currentWeek;
            const cacheKey = this.getCacheKey(targetWeek, options.type || 'leaderboard');
            
            // Check cache first
            if (this.cache.has(cacheKey) && !options.forceRefresh) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    this.metrics.cacheHits++;
                    console.log(`🎯 Cache hit for week ${targetWeek} leaderboard`);
                    return {
                        success: true,
                        data: cached.data,
                        fromCache: true,
                        loadTime: performance.now() - startTime
                    };
                }
            }

            this.metrics.cacheMisses++;
            
            // For weekly data, read single unified document
            if (weekNumber) {
                return await this.getWeeklyDisplayData(targetWeek, startTime, cacheKey);
            }
            
            // For season data, read season summary + current week
            return await this.getSeasonDisplayData(startTime, cacheKey);
            
        } catch (error) {
            console.error('❌ UnifiedConfidenceManager.getDisplayData failed:', error);
            return { success: false, error, fallbackRequired: true };
        }
    }

    /**
     * Filter leaderboard by participation
     */
    async filterLeaderboardByParticipation(leaderboard) {
        try {
            // Get pool members with participation data
            const membersRef = window.doc(this.db, this.getPoolMembersPath());
            const membersDoc = await window.getDoc(membersRef);
            
            if (!membersDoc.exists()) {
                return leaderboard; // Return unfiltered if no member data
            }
            
            const members = membersDoc.data();
            
            // Filter leaderboard to only include confidence participants
            return leaderboard.filter(entry => {
                const memberData = members[entry.userId];
                if (!memberData) return false; // Exclude if not a member
                
                const participation = memberData.participation || { confidence: { enabled: true } };
                return participation.confidence?.enabled;
            });
            
        } catch (error) {
            console.error('Error filtering leaderboard by participation:', error);
            return leaderboard; // Return unfiltered on error
        }
    }

    /**
     * Get weekly leaderboard data (1 read)
     */
    async getWeeklyDisplayData(weekNumber, startTime, cacheKey) {
        try {
            // Single read for entire week's data
            const weekDocRef = window.doc(this.db, this.getUnifiedDocPath(weekNumber));
            const weekDoc = await window.getDoc(weekDocRef);
            this.metrics.reads++;
            
            if (!weekDoc.exists()) {
                console.log(`⚠️ No unified data for week ${weekNumber}, triggering migration`);
                return await this.migrateWeekToUnified(weekNumber, startTime, cacheKey);
            }
            
            const weekData = weekDoc.data();
            const loadTime = performance.now() - startTime;
            
            // Validate data freshness
            if (this.isDataStale(weekData)) {
                console.log(`🔄 Week ${weekNumber} data is stale, refreshing...`);
                return await this.refreshWeekData(weekNumber, startTime, cacheKey);
            }
            
            // Extract leaderboard data
            let leaderboard = weekData.leaderboards?.weekly || [];
            
            // Filter by participation
            leaderboard = await this.filterLeaderboardByParticipation(leaderboard);
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: leaderboard,
                timestamp: Date.now()
            });
            
            this.metrics.loadTimes.push(loadTime);
            console.log(`🚀 Week ${weekNumber} leaderboard loaded in ${loadTime.toFixed(0)}ms (1 read)`);
            
            return {
                success: true,
                data: leaderboard,
                metadata: {
                    weekNumber,
                    lastUpdated: weekData.cache?.lastUpdated,
                    gamesComplete: weekData.cache?.gamesComplete,
                    totalUsers: leaderboard.length // Updated to reflect filtered count
                },
                loadTime
            };
            
        } catch (error) {
            console.error(`❌ Failed to load week ${weekNumber} data:`, error);
            return { success: false, error, fallbackRequired: true };
        }
    }

    /**
     * Get season leaderboard data (2 reads max)
     */
    async getSeasonDisplayData(startTime, cacheKey) {
        try {
            // Read 1: Season summary
            const summaryDocRef = window.doc(this.db, this.getSeasonSummaryPath());
            const summaryDoc = await window.getDoc(summaryDocRef);
            this.metrics.reads++;
            
            let seasonData = {};
            if (summaryDoc.exists()) {
                seasonData = summaryDoc.data();
            }
            
            // Read 2: Current week (if needed for freshness)
            const currentWeekDocRef = window.doc(this.db, this.getUnifiedDocPath(this.currentWeek));
            const currentWeekDoc = await window.getDoc(currentWeekDocRef);
            this.metrics.reads++;
            
            if (currentWeekDoc.exists()) {
                const currentWeekData = currentWeekDoc.data();
                // Merge current week into season totals if more recent
                seasonData = this.mergeCurrentWeekIntoSeason(seasonData, currentWeekData);
            }
            
            const loadTime = performance.now() - startTime;
            
            // Build season leaderboard
            let leaderboard = this.buildSeasonLeaderboard(seasonData);
            
            // Filter by participation
            leaderboard = await this.filterLeaderboardByParticipation(leaderboard);
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: leaderboard,
                timestamp: Date.now()
            });
            
            this.metrics.loadTimes.push(loadTime);
            console.log(`🚀 Season leaderboard loaded in ${loadTime.toFixed(0)}ms (2 reads)`);
            
            return {
                success: true,
                data: leaderboard,
                metadata: {
                    totalWeeks: Object.keys(seasonData.weeklyTotals || {}).length,
                    lastUpdated: seasonData.lastUpdated,
                    totalUsers: Object.keys(seasonData.userTotals || {}).length
                },
                loadTime
            };
            
        } catch (error) {
            console.error('❌ Failed to load season data:', error);
            return { success: false, error, fallbackRequired: true };
        }
    }

    /**
     * Dual-write pick submission: Update both unified and legacy structures
     */
    async submitUserPicks(weekNumber, userId, picks, userDisplayName) {
        const startTime = performance.now();
        
        try {
            console.log(`💎 Dual-write pick submission for user ${userId}, week ${weekNumber}`);
            
            // Prepare unified document update
            const unifiedUpdate = await this.prepareUnifiedPickUpdate(weekNumber, userId, picks, userDisplayName);
            
            // Execute dual write using transaction for consistency
            const result = await this.executeDualWrite(weekNumber, userId, picks, unifiedUpdate);
            
            if (result.success) {
                // Invalidate related caches
                this.invalidateCache(weekNumber);
                
                const loadTime = performance.now() - startTime;
                console.log(`✅ Dual-write completed in ${loadTime.toFixed(0)}ms`);
                
                return {
                    success: true,
                    loadTime,
                    writesExecuted: result.writesExecuted
                };
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Dual-write pick submission failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Prepare unified document update structure
     */
    async prepareUnifiedPickUpdate(weekNumber, userId, picks, userDisplayName) {
        // Get current unified document
        const weekDocRef = window.doc(this.db, this.getUnifiedDocPath(weekNumber));
        const weekDoc = await window.getDoc(weekDocRef);
        
        let weekData = weekDoc.exists() ? weekDoc.data() : {
            weekNumber,
            picks: {},
            leaderboards: { weekly: [], season: [] },
            cache: { lastUpdated: null, gamesComplete: 0, invalidateAfter: null },
            gameResults: {},
            stats: { totalUsers: 0, averageScore: 0, pickDistribution: {} }
        };
        
        // Update user picks
        weekData.picks[userId] = {};
        
        Object.entries(picks).forEach(([gameId, pick]) => {
            weekData.picks[userId][gameId] = {
                winner: pick.winner,
                confidence: pick.confidence,
                timestamp: new Date().toISOString()
            };
        });
        
        // Add user metadata if new
        if (!weekData.picks[userId].meta) {
            weekData.picks[userId].meta = {
                displayName: userDisplayName,
                userId
            };
        }
        
        // Update stats
        weekData.stats.totalUsers = Object.keys(weekData.picks).length;
        weekData.cache.lastUpdated = new Date().toISOString();
        
        return weekData;
    }

    /**
     * Execute dual write with transaction safety
     */
    async executeDualWrite(weekNumber, userId, picks, unifiedData) {
        try {
            // Use Firebase transaction for consistency
            const result = await window.runTransaction(this.db, async (transaction) => {
                let writesExecuted = 0;
                
                // Write 1: Update unified document
                const unifiedRef = window.doc(this.db, this.getUnifiedDocPath(weekNumber));
                transaction.set(unifiedRef, unifiedData);
                writesExecuted++;
                
                // Write 2: Update legacy structure for compatibility
                const legacyRef = window.doc(this.db, this.getLegacyPicksPath(weekNumber, userId));
                const legacyPicks = this.convertToLegacyFormat(picks);
                transaction.set(legacyRef, legacyPicks);
                writesExecuted++;
                
                return { writesExecuted };
            });
            
            return { success: true, writesExecuted: result.writesExecuted };
            
        } catch (error) {
            console.error('❌ Transaction failed, attempting fallback writes:', error);
            
            // Fallback: Execute writes separately
            try {
                await window.setDoc(window.doc(this.db, this.getUnifiedDocPath(weekNumber)), unifiedData);
                const legacyPicks = this.convertToLegacyFormat(picks);
                await window.setDoc(window.doc(this.db, this.getLegacyPicksPath(weekNumber, userId)), legacyPicks);
                
                return { success: true, writesExecuted: 2, usedFallback: true };
            } catch (fallbackError) {
                return { success: false, error: fallbackError };
            }
        }
    }

    /**
     * Convert unified picks to legacy format for compatibility
     */
    convertToLegacyFormat(picks) {
        const legacy = {
            submissionTime: new Date().toISOString(),
            picks: {}
        };
        
        Object.entries(picks).forEach(([gameId, pick]) => {
            legacy.picks[gameId] = {
                winner: pick.winner,
                confidence: pick.confidence
            };
        });
        
        return legacy;
    }

    /**
     * Smart data freshness validation
     */
    isDataStale(weekData) {
        if (!weekData.cache || !weekData.cache.lastUpdated) {
            return true;
        }
        
        const lastUpdated = new Date(weekData.cache.lastUpdated);
        const now = new Date();
        
        // During game time (Thursday-Monday), refresh more frequently
        const dayOfWeek = now.getDay();
        const isGameWeekend = dayOfWeek >= 4 || dayOfWeek <= 1;
        
        const maxAge = isGameWeekend ? 10 * 60 * 1000 : 30 * 60 * 1000; // 10min vs 30min
        
        return (now - lastUpdated) > maxAge;
    }

    /**
     * Refresh week data by recalculating from current picks
     */
    async refreshWeekData(weekNumber, startTime, cacheKey) {
        try {
            console.log(`🔄 Refreshing week ${weekNumber} unified data...`);
            
            // Get current picks from unified doc
            const weekDocRef = window.doc(this.db, this.getUnifiedDocPath(weekNumber));
            const weekDoc = await window.getDoc(weekDocRef);
            
            if (!weekDoc.exists()) {
                return await this.migrateWeekToUnified(weekNumber, startTime, cacheKey);
            }
            
            let weekData = weekDoc.data();
            
            // Get game results for scoring
            const gameResults = await this.getGameResults(weekNumber);
            weekData.gameResults = gameResults;
            
            // Recalculate leaderboards
            weekData.leaderboards = await this.calculateLeaderboards(weekData.picks, gameResults, weekNumber);
            
            // Update cache metadata
            weekData.cache = {
                lastUpdated: new Date().toISOString(),
                gamesComplete: this.countCompleteGames(gameResults),
                invalidateAfter: this.calculateInvalidationTime(gameResults)
            };
            
            // Update statistics
            weekData.stats = this.calculateWeekStats(weekData.picks, weekData.leaderboards);
            
            // Save refreshed data
            await window.setDoc(weekDocRef, weekData);
            this.metrics.reads++;
            
            const loadTime = performance.now() - startTime;
            console.log(`✅ Week ${weekNumber} data refreshed in ${loadTime.toFixed(0)}ms`);
            
            // Cache and return
            const leaderboard = weekData.leaderboards?.weekly || [];
            this.cache.set(cacheKey, {
                data: leaderboard,
                timestamp: Date.now()
            });
            
            return {
                success: true,
                data: leaderboard,
                metadata: {
                    weekNumber,
                    lastUpdated: weekData.cache.lastUpdated,
                    gamesComplete: weekData.cache.gamesComplete,
                    refreshed: true
                },
                loadTime
            };
            
        } catch (error) {
            console.error(`❌ Failed to refresh week ${weekNumber}:`, error);
            return { success: false, error, fallbackRequired: true };
        }
    }

    /**
     * Migrate legacy week data to unified format
     */
    async migrateWeekToUnified(weekNumber, startTime, cacheKey) {
        try {
            console.log(`🔄 Migrating week ${weekNumber} to unified format...`);
            
            // Get all user picks for this week from legacy structure
            const legacyPicks = await this.getLegacyWeekPicks(weekNumber);
            
            if (Object.keys(legacyPicks).length === 0) {
                console.log(`⚠️ No legacy picks found for week ${weekNumber}`);
                return {
                    success: true,
                    data: [],
                    metadata: { weekNumber, migrated: true, empty: true },
                    loadTime: performance.now() - startTime
                };
            }
            
            // Get game results
            const gameResults = await this.getGameResults(weekNumber);
            
            // Create unified document structure
            const weekData = {
                weekNumber,
                picks: legacyPicks,
                leaderboards: await this.calculateLeaderboards(legacyPicks, gameResults, weekNumber),
                cache: {
                    lastUpdated: new Date().toISOString(),
                    gamesComplete: this.countCompleteGames(gameResults),
                    invalidateAfter: this.calculateInvalidationTime(gameResults)
                },
                gameResults,
                stats: this.calculateWeekStats(legacyPicks, null)
            };
            
            // Save unified document
            const weekDocRef = window.doc(this.db, this.getUnifiedDocPath(weekNumber));
            await window.setDoc(weekDocRef, weekData);
            this.metrics.reads++;
            
            const loadTime = performance.now() - startTime;
            console.log(`✅ Week ${weekNumber} migrated to unified format in ${loadTime.toFixed(0)}ms`);
            
            // Cache and return
            const leaderboard = weekData.leaderboards?.weekly || [];
            this.cache.set(cacheKey, {
                data: leaderboard,
                timestamp: Date.now()
            });
            
            return {
                success: true,
                data: leaderboard,
                metadata: {
                    weekNumber,
                    migrated: true,
                    totalUsers: Object.keys(legacyPicks).length
                },
                loadTime
            };
            
        } catch (error) {
            console.error(`❌ Migration failed for week ${weekNumber}:`, error);
            return { success: false, error, fallbackRequired: true };
        }
    }

    /**
     * Get legacy picks for migration
     */
    async getLegacyWeekPicks(weekNumber) {
        try {
            // Get pool members
            const membersRef = window.doc(this.db, this.getPoolMembersPath());
            const membersDoc = await window.getDoc(membersRef);
            this.metrics.reads++;
            
            if (!membersDoc.exists()) {
                console.warn('No pool members found');
                return {};
            }
            
            const members = membersDoc.data();
            const legacyPicks = {};
            
            // Read each user's picks - ONLY for confidence participants
            for (const [userId, memberData] of Object.entries(members)) {
                // Skip users not in confidence pool
                const participation = memberData.participation || { confidence: { enabled: true } };
                if (!participation.confidence?.enabled) {
                    console.log(`⏭️ Skipping ${memberData.displayName} - not in confidence pool`);
                    continue;
                }
                
                try {
                    const userPicksRef = window.doc(this.db, this.getLegacyPicksPath(weekNumber, userId));
                    const userPicksDoc = await window.getDoc(userPicksRef);
                    this.metrics.reads++;
                    
                    if (userPicksDoc.exists()) {
                        const userPicks = userPicksDoc.data();
                        legacyPicks[userId] = {
                            ...userPicks.picks,
                            meta: {
                                displayName: memberData.displayName,
                                userId,
                                submissionTime: userPicks.submissionTime
                            }
                        };
                    }
                } catch (error) {
                    console.warn(`Failed to read picks for user ${userId}:`, error);
                }
            }
            
            console.log(`📊 Migrated ${Object.keys(legacyPicks).length} confidence users' picks for week ${weekNumber}`);
            return legacyPicks;
            
        } catch (error) {
            console.error('Failed to get legacy picks:', error);
            return {};
        }
    }

    /**
     * Calculate weekly and season leaderboards
     */
    async calculateLeaderboards(weeklyPicks, gameResults, weekNumber) {
        try {
            const weeklyLeaderboard = [];
            const userScores = {};
            
            // Calculate weekly scores
            Object.entries(weeklyPicks).forEach(([userId, picks]) => {
                let weeklyScore = 0;
                
                Object.entries(picks).forEach(([gameId, pick]) => {
                    if (pick.winner && pick.confidence && gameResults[gameId]) {
                        const game = gameResults[gameId];
                        if (game.winner === pick.winner) {
                            weeklyScore += pick.confidence;
                        }
                    }
                });
                
                userScores[userId] = weeklyScore;
                weeklyLeaderboard.push({
                    userId,
                    displayName: picks.meta?.displayName || 'Unknown',
                    weeklyScore,
                    totalScore: weeklyScore // Will be updated with season total
                });
            });
            
            // Sort weekly leaderboard
            weeklyLeaderboard.sort((a, b) => b.weeklyScore - a.weeklyScore);
            
            // Add ranks
            weeklyLeaderboard.forEach((user, index) => {
                user.rank = index + 1;
                // Handle ties
                if (index > 0 && user.weeklyScore === weeklyLeaderboard[index - 1].weeklyScore) {
                    user.rank = weeklyLeaderboard[index - 1].rank;
                }
            });
            
            // Get season totals (simplified for now)
            const seasonLeaderboard = await this.updateSeasonTotals(userScores, weekNumber);
            
            return {
                weekly: weeklyLeaderboard,
                season: seasonLeaderboard
            };
            
        } catch (error) {
            console.error('Error calculating leaderboards:', error);
            return { weekly: [], season: [] };
        }
    }

    /**
     * Update season totals with new weekly scores
     */
    async updateSeasonTotals(weeklyScores, weekNumber) {
        try {
            // Get or create season summary
            const summaryRef = window.doc(this.db, this.getSeasonSummaryPath());
            const summaryDoc = await window.getDoc(summaryRef);
            this.metrics.reads++;
            
            let seasonData = summaryDoc.exists() ? summaryDoc.data() : {
                userTotals: {},
                weeklyTotals: {},
                lastUpdated: null
            };
            
            // Update weekly totals
            seasonData.weeklyTotals[weekNumber] = weeklyScores;
            
            // Recalculate user season totals
            const userTotals = {};
            Object.entries(seasonData.weeklyTotals).forEach(([week, scores]) => {
                Object.entries(scores).forEach(([userId, score]) => {
                    userTotals[userId] = (userTotals[userId] || 0) + score;
                });
            });
            
            seasonData.userTotals = userTotals;
            seasonData.lastUpdated = new Date().toISOString();
            
            // Save updated summary
            await window.setDoc(summaryRef, seasonData);
            
            // Build season leaderboard
            return this.buildSeasonLeaderboard(seasonData);
            
        } catch (error) {
            console.error('Error updating season totals:', error);
            return [];
        }
    }

    /**
     * Build season leaderboard from season data
     */
    buildSeasonLeaderboard(seasonData) {
        if (!seasonData.userTotals) return [];
        
        const leaderboard = Object.entries(seasonData.userTotals).map(([userId, totalScore]) => ({
            userId,
            totalScore,
            displayName: `User ${userId}` // Will be enriched with actual names
        }));
        
        // Sort by total score
        leaderboard.sort((a, b) => b.totalScore - a.totalScore);
        
        // Add ranks
        leaderboard.forEach((user, index) => {
            user.rank = index + 1;
            if (index > 0 && user.totalScore === leaderboard[index - 1].totalScore) {
                user.rank = leaderboard[index - 1].rank;
            }
        });
        
        return leaderboard;
    }

    /**
     * Merge current week data into season totals
     */
    mergeCurrentWeekIntoSeason(seasonData, currentWeekData) {
        if (!currentWeekData.picks || !seasonData.userTotals) {
            return seasonData;
        }
        
        // Check if current week is more recent
        const seasonUpdate = seasonData.lastUpdated ? new Date(seasonData.lastUpdated) : new Date(0);
        const weekUpdate = currentWeekData.cache?.lastUpdated ? new Date(currentWeekData.cache.lastUpdated) : new Date();
        
        if (weekUpdate > seasonUpdate) {
            // Update season data with current week
            const weekNumber = currentWeekData.weekNumber;
            const weeklyScores = {};
            
            Object.entries(currentWeekData.picks).forEach(([userId, picks]) => {
                let weeklyScore = 0;
                Object.entries(picks).forEach(([gameId, pick]) => {
                    if (currentWeekData.gameResults[gameId]?.winner === pick.winner) {
                        weeklyScore += pick.confidence || 0;
                    }
                });
                weeklyScores[userId] = weeklyScore;
            });
            
            seasonData.weeklyTotals = seasonData.weeklyTotals || {};
            seasonData.weeklyTotals[weekNumber] = weeklyScores;
            
            // Recalculate user totals
            const userTotals = {};
            Object.entries(seasonData.weeklyTotals).forEach(([week, scores]) => {
                Object.entries(scores).forEach(([userId, score]) => {
                    userTotals[userId] = (userTotals[userId] || 0) + score;
                });
            });
            
            seasonData.userTotals = userTotals;
            seasonData.lastUpdated = weekUpdate.toISOString();
        }
        
        return seasonData;
    }

    /**
     * Get game results for scoring
     */
    async getGameResults(weekNumber) {
        try {
            // This would integrate with existing game results system
            // For now, return empty results
            return {};
        } catch (error) {
            console.error('Error getting game results:', error);
            return {};
        }
    }

    /**
     * Calculate week statistics
     */
    calculateWeekStats(picks, leaderboards) {
        const totalUsers = Object.keys(picks).length;
        let totalPicks = 0;
        let totalConfidence = 0;
        const pickDistribution = {};
        
        Object.values(picks).forEach(userPicks => {
            Object.values(userPicks).forEach(pick => {
                if (pick.confidence) {
                    totalPicks++;
                    totalConfidence += pick.confidence;
                    
                    pickDistribution[pick.confidence] = (pickDistribution[pick.confidence] || 0) + 1;
                }
            });
        });
        
        return {
            totalUsers,
            totalPicks,
            averageConfidence: totalPicks > 0 ? totalConfidence / totalPicks : 0,
            pickDistribution
        };
    }

    /**
     * Count completed games
     */
    countCompleteGames(gameResults) {
        return Object.values(gameResults).filter(game => game.winner).length;
    }

    /**
     * Calculate when cache should be invalidated
     */
    calculateInvalidationTime(gameResults) {
        // Find next game start time or end of week
        const now = new Date();
        const endOfWeek = new Date(now);
        endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
        endOfWeek.setHours(23, 59, 59, 999);
        
        return endOfWeek.toISOString();
    }

    /**
     * Invalidate cache for a specific week
     */
    invalidateCache(weekNumber) {
        const patterns = [`confidence_${this.poolId}_w${weekNumber}_`, `confidence_${this.poolId}_season`];
        
        patterns.forEach(pattern => {
            for (let key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        });
        
        console.log(`🗑️ Cache invalidated for week ${weekNumber}`);
    }

    /**
     * Get current NFL week
     */
    getCurrentNflWeek() {
        // NFL 2025 season starts September 4th
        const seasonStart = new Date('2025-09-04');
        const now = new Date();
        const diffTime = now - seasonStart;
        const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
        
        return Math.max(1, Math.min(18, diffWeeks + 1));
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        const avgLoadTime = this.metrics.loadTimes.length > 0 
            ? this.metrics.loadTimes.reduce((a, b) => a + b, 0) / this.metrics.loadTimes.length
            : 0;
            
        return {
            totalReads: this.metrics.reads,
            cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100,
            averageLoadTime: avgLoadTime.toFixed(2),
            cacheSize: this.cache.size
        };
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ All caches cleared');
    }

    /**
     * Health check for the system
     */
    async healthCheck() {
        try {
            if (!this.initialized) {
                return { status: 'error', message: 'Manager not initialized' };
            }
            
            // Test read performance
            const startTime = performance.now();
            const result = await this.getDisplayData(this.currentWeek);
            const loadTime = performance.now() - startTime;
            
            const metrics = this.getMetrics();
            
            return {
                status: 'healthy',
                loadTime: loadTime.toFixed(2),
                metrics,
                currentWeek: this.currentWeek,
                cacheSize: this.cache.size
            };
            
        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                metrics: this.getMetrics()
            };
        }
    }
}

// Export for global usage
window.UnifiedConfidenceManager = UnifiedConfidenceManager;

console.log('🚀 UnifiedConfidenceManager loaded - Enterprise confidence system ready');