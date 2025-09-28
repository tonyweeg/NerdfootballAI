// PHAROAH'S ESPN-SURVIVOR INTEGRATION ENGINE
// Diamond-level architecture for real-time elimination processing

class ESPNSurvivorIntegration {
    constructor() {
        this.db = null;
        this.espnApi = null;
        this.currentWeek = 1;
        this.poolId = 'nerduniverse-2025';
        this.initPromise = null;
        
        // Cache for performance
        this.gameResultsCache = new Map();
        this.eliminationCache = new Map();
        
        // Initialize
        this.initialize();
    }
    
    async initialize() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = new Promise(async (resolve) => {
            const maxRetries = 20;
            let attempt = 0;
            
            const tryInit = async () => {
                if (typeof window.db !== 'undefined' && typeof window.espnNerdApi !== 'undefined') {
                    this.db = window.db;
                    this.espnApi = window.espnNerdApi;
                    this.currentWeek = window.currentWeek || 1;
                    
                    // Ensure ESPN API is ready
                    await this.espnApi.ensureReady();
                    
                    console.log('✅ ESPN-Survivor Integration initialized');
                    resolve(true);
                } else if (attempt < maxRetries) {
                    attempt++;
                    setTimeout(tryInit, 250);
                } else {
                    console.error('❌ Failed to initialize ESPN-Survivor Integration');
                    resolve(false);
                }
            };
            
            tryInit();
        });
        
        return this.initPromise;
    }
    
    // Get unified survivor document with ESPN-validated eliminations
    async getEnhancedSurvivorData(weekNumber = null) {
        await this.initialize();
        
        const week = weekNumber || this.currentWeek;
        const startTime = performance.now();
        
        try {
            // Step 1: Get the unified document
            const docPath = `artifacts/nerdfootball/pools/${this.poolId}/survivor/${new Date().getFullYear()}/weeks/${week}`;
            const docRef = doc(this.db, docPath);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                console.log('No unified survivor document found for week', week);
                return { users: {}, stats: {}, gameResults: {} };
            }
            
            const survivorData = docSnap.data();
            
            // Step 2: Get ESPN game results
            const espnResults = await this.getESPNResultsForWeek(week);
            
            // Step 3: Process eliminations based on ESPN results
            const processedData = await this.processEliminations(survivorData, espnResults, week);
            
            // Step 4: Calculate accurate stats
            const stats = this.calculateStats(processedData.users);
            
            console.log(`✅ Enhanced survivor data loaded in ${(performance.now() - startTime).toFixed(0)}ms`);
            
            return {
                ...processedData,
                stats,
                loadTimeMs: performance.now() - startTime
            };
            
        } catch (error) {
            console.error('Error getting enhanced survivor data:', error);
            throw error;
        }
    }
    
    // Get ESPN results with intelligent caching
    async getESPNResultsForWeek(week) {
        const cacheKey = `espn_week_${week}`;
        
        // Check cache first
        if (this.gameResultsCache.has(cacheKey)) {
            const cached = this.gameResultsCache.get(cacheKey);
            const cacheAge = Date.now() - cached.timestamp;
            
            // Use cache if less than 30 seconds old for live games, or permanent for completed weeks
            if (cached.allComplete || cacheAge < 30000) {
                console.log('⚡ Using cached ESPN results');
                return cached.results;
            }
        }
        
        try {
            // Get fresh ESPN data
            const espnGames = await this.espnApi.getCurrentWeekScores();
            
            if (!espnGames || !espnGames.games) {
                console.warn('No ESPN games data available');
                return {};
            }
            
            // Process games into results format
            const results = {};
            let allComplete = true;
            
            for (const game of espnGames.games) {
                const gameResult = {
                    id: game.id,
                    homeTeam: game.home_team,
                    awayTeam: game.away_team,
                    homeScore: parseInt(game.home_score) || 0,
                    awayScore: parseInt(game.away_score) || 0,
                    status: game.status,
                    winner: null,
                    completed: false
                };
                
                // Determine winner if game is final
                if (game.status === 'Final' || game.status === 'FINAL' || game.status === 'F' || game.status === 'STATUS_FINAL') {
                    gameResult.completed = true;
                    if (gameResult.homeScore > gameResult.awayScore) {
                        gameResult.winner = game.home_team;
                    } else if (gameResult.awayScore > gameResult.homeScore) {
                        gameResult.winner = game.away_team;
                    } else {
                        gameResult.winner = 'TIE';
                    }
                } else {
                    allComplete = false;
                }
                
                // Store by multiple keys for flexible lookup
                results[game.id] = gameResult;
                
                // Also store by team matchup for easier lookup
                const matchupKey = `${game.away_team}@${game.home_team}`;
                results[matchupKey] = gameResult;
            }
            
            // Cache the results
            this.gameResultsCache.set(cacheKey, {
                results,
                timestamp: Date.now(),
                allComplete
            });
            
            console.log(`📊 ESPN: Processed ${Object.keys(results).length} games, ${allComplete ? 'all complete' : 'some in progress'}`);
            
            return results;
            
        } catch (error) {
            console.error('Error fetching ESPN results:', error);
            return {};
        }
    }
    
    // Process eliminations based on ESPN results
    async processEliminations(survivorData, espnResults, week) {
        const processedUsers = {};
        
        // Get all users from the unified document (check both users and picks fields)
        const users = survivorData.users || survivorData.picks || {};
        
        console.log(`🔍 ESPN PROCESSING: Week ${week}, ${Object.keys(users).length} users, ${Object.keys(espnResults).length} ESPN games`);
        
        for (const [userId, userData] of Object.entries(users)) {
            const processedUser = { ...userData };
            
            // Skip if already eliminated in a previous week
            if (userData.eliminated && userData.eliminatedWeek < week) {
                processedUsers[userId] = processedUser;
                continue;
            }
            
            // Check if user has a pick for this week (handle both team and teamPicked fields)
            const userTeam = userData.team || userData.teamPicked;
            if (!userTeam) {
                // No pick = elimination
                processedUser.eliminated = true;
                processedUser.eliminatedWeek = week;
                processedUser.eliminationReason = 'No pick made';
                processedUser.status = 'eliminated';
            } else {
                // Find the game result for the user's picked team
                const gameResult = this.findGameResultForTeam(userTeam, espnResults);
                
                if (!gameResult) {
                    // Game not found or not started
                    processedUser.status = 'pending';
                    processedUser.gameStatus = 'Not started';
                } else if (!gameResult.completed) {
                    // Game in progress
                    processedUser.status = 'pending';
                    processedUser.gameStatus = 'In progress';
                } else {
                    // Game completed - check if team won
                    const normalizedUserTeam = this.normalizeTeamName(userTeam);
                    const normalizedWinner = this.normalizeTeamName(gameResult.winner);
                    
                    
                    if (normalizedWinner === normalizedUserTeam) {
                        processedUser.status = 'survived';
                        processedUser.eliminated = false;
                        processedUser.gameStatus = 'Won';
                    } else {
                        processedUser.status = 'eliminated';
                        processedUser.eliminated = true;
                        processedUser.eliminatedWeek = week;
                        processedUser.eliminationReason = `Lost to ${gameResult.winner}`;
                        processedUser.gameStatus = 'Lost';
                    }
                }
            }
            
            processedUsers[userId] = processedUser;
        }
        
        return {
            ...survivorData,
            users: processedUsers,
            gameResults: espnResults,
            lastProcessed: new Date().toISOString()
        };
    }
    
    // Find game result for a specific team
    findGameResultForTeam(teamName, espnResults) {
        // Normalize team name for matching
        const normalizedTeam = this.normalizeTeamName(teamName);
        
        for (const result of Object.values(espnResults)) {
            if (!result.homeTeam || !result.awayTeam) continue;
            
            const normalizedHome = this.normalizeTeamName(result.homeTeam);
            const normalizedAway = this.normalizeTeamName(result.awayTeam);
            
            if (normalizedHome === normalizedTeam || normalizedAway === normalizedTeam) {
                return result;
            }
        }
        
        return null;
    }
    
    // Normalize team names for consistent matching
    normalizeTeamName(teamName) {
        if (!teamName) return '';
        
        // Handle common variations
        const mappings = {
            'LA Rams': 'Los Angeles Rams',
            'LA Chargers': 'Los Angeles Chargers',
            'LV Raiders': 'Las Vegas Raiders',
            'Vegas Raiders': 'Las Vegas Raiders',
            'NY Giants': 'New York Giants',
            'NY Jets': 'New York Jets',
            'TB Buccaneers': 'Tampa Bay Buccaneers',
            'NE Patriots': 'New England Patriots',
            'GB Packers': 'Green Bay Packers',
            'NO Saints': 'New Orleans Saints',
            'KC Chiefs': 'Kansas City Chiefs',
            'SF 49ers': 'San Francisco 49ers'
        };
        
        return mappings[teamName] || teamName;
    }
    
    // Calculate accurate statistics
    calculateStats(users) {
        let total = 0;
        let active = 0;
        let eliminated = 0;
        let pending = 0;
        let noPick = 0;
        
        for (const user of Object.values(users)) {
            total++;
            
            if (user.eliminated) {
                eliminated++;
                if (user.eliminationReason === 'No pick made') {
                    noPick++;
                }
            } else if (user.status === 'pending') {
                pending++;
            } else {
                active++;
            }
        }
        
        return {
            totalPlayers: total,
            activePlayers: active,
            eliminatedPlayers: eliminated,
            pendingPlayers: pending,
            noPickPlayers: noPick
        };
    }
    
    // Get display-ready data for the UI
    async getDisplayData(weekNumber = null) {
        const enhancedData = await this.getEnhancedSurvivorData(weekNumber);
        
        // Get pool members for display names
        const membersPath = `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`;
        const membersDoc = await getDoc(doc(this.db, membersPath));
        const poolMembers = membersDoc.exists() ? membersDoc.data() : {};
        
        // Transform to display format
        const displayData = [];
        
        for (const [userId, userData] of Object.entries(enhancedData.users)) {
            const member = poolMembers[userId] || {};
            
            displayData.push({
                userId,
                displayName: member.displayName || member.email || userId,
                teamPicked: userData.team || userData.teamPicked || 'No pick',
                status: userData.status || 'pending',
                eliminated: userData.eliminated || false,
                eliminatedWeek: userData.eliminatedWeek || null,
                eliminationReason: userData.eliminationReason || null,
                gameStatus: userData.gameStatus || 'Unknown',
                isEliminated: userData.eliminated || false
            });
        }
        
        // Sort: active first, then by name
        displayData.sort((a, b) => {
            if (a.eliminated !== b.eliminated) {
                return a.eliminated ? 1 : -1;
            }
            return a.displayName.localeCompare(b.displayName);
        });
        
        return {
            data: displayData,
            stats: enhancedData.stats,
            gameResults: enhancedData.gameResults,
            loadTimeMs: enhancedData.loadTimeMs
        };
    }
    
    // Update elimination status in Firestore (admin function)
    async persistEliminations(weekNumber = null) {
        await this.initialize();
        
        const week = weekNumber || this.currentWeek;
        const enhancedData = await this.getEnhancedSurvivorData(week);
        
        // Update the unified document with processed eliminations
        const docPath = `artifacts/nerdfootball/pools/${this.poolId}/survivor/${new Date().getFullYear()}/weeks/${week}`;
        const docRef = doc(this.db, docPath);
        
        try {
            await updateDoc(docRef, {
                users: enhancedData.users,
                gameResults: enhancedData.gameResults,
                stats: enhancedData.stats,
                lastProcessed: new Date().toISOString(),
                processedByESPN: true
            });
            
            console.log('✅ Eliminations persisted to Firestore');
            return { success: true, stats: enhancedData.stats };
            
        } catch (error) {
            console.error('Error persisting eliminations:', error);
            throw error;
        }
    }
}

// Initialize globally
window.espnSurvivorIntegration = new ESPNSurvivorIntegration();

// Auto-initialize when dependencies are ready
async function autoInitESPNSurvivor() {
    if (typeof window.db !== 'undefined' && typeof window.espnNerdApi !== 'undefined') {
        await window.espnSurvivorIntegration.initialize();
        console.log('⚡ ESPN-Survivor Integration ready');
    } else {
        setTimeout(autoInitESPNSurvivor, 500);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitESPNSurvivor);
} else {
    autoInitESPNSurvivor();
}