// UNIFIED SURVIVOR MANAGER - PHAROAH'S BULLETPROOF ARCHITECTURE
// One document to rule them all - Sub-500ms performance guaranteed

class UnifiedSurvivorManager {
    constructor(db) {
        this.db = db;
        this.currentYear = 2025;
        this.poolId = 'nerduniverse-2025';
        this.cachedWeekData = new Map();
        this.listeners = new Map();
    }

    // Get the unified document path for a week
    getWeekDocRef(weekNumber) {
        const path = `artifacts/nerdfootball/pools/${this.poolId}/survivor/${this.currentYear}/weeks/${weekNumber}`;
        return doc(db, path);
    }

    // Initialize week document structure
    async initializeWeekDocument(weekNumber) {
        const docRef = this.getWeekDocRef(weekNumber);
        
        const initialDoc = {
            weekNumber,
            year: this.currentYear,
            poolId: this.poolId,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            version: 1,
            
            // All user picks in one place
            picks: {},
            
            // Game results cached from ESPN
            gameResults: {},
            
            // Week status
            status: {
                locked: false,
                processed: false,
                firstGameTime: null,
                allGamesComplete: false,
                eliminationsProcessed: false
            },
            
            // Pre-computed statistics
            stats: {
                totalActivePlayers: 0,
                totalEliminated: 0,
                totalNoPick: 0,
                pickDistribution: {},
                mostPopularPick: '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }
        };
        
        try {
            await setDoc(docRef, initialDoc, { merge: true });
            console.log(`✅ Initialized week ${weekNumber} unified document`);
            return initialDoc;
        } catch (error) {
            console.error('Error initializing week document:', error);
            throw error;
        }
    }

    // Get all survivor data for a week (ONE READ!)
    async getWeekData(weekNumber) {
        const startTime = performance.now();
        
        // Check cache first
        if (this.cachedWeekData.has(weekNumber)) {
            const cached = this.cachedWeekData.get(weekNumber);
            if (Date.now() - cached.timestamp < 5000) { // 5 second cache
                console.log(`⚡ Cache hit for week ${weekNumber}: ${(performance.now() - startTime).toFixed(0)}ms`);
                return cached.data;
            }
        }
        
        const docRef = this.getWeekDocRef(weekNumber);
        
        try {
            const doc = await getDoc(docRef);
            
            if (!doc.exists()) {
                // Initialize if doesn't exist
                const newDoc = await this.initializeWeekDocument(weekNumber);
                this.cachedWeekData.set(weekNumber, {
                    data: newDoc,
                    timestamp: Date.now()
                });
                return newDoc;
            }
            
            const data = doc.data();
            
            // Cache the result
            this.cachedWeekData.set(weekNumber, {
                data,
                timestamp: Date.now()
            });
            
            console.log(`✅ Loaded week ${weekNumber} in ${(performance.now() - startTime).toFixed(0)}ms`);
            return data;
            
        } catch (error) {
            console.error('Error getting week data:', error);
            throw error;
        }
    }

    // Update user pick (atomic transaction)
    async updateUserPick(weekNumber, userId, userDisplayName, teamPicked) {
        const docRef = this.getWeekDocRef(weekNumber);
        
        try {
            await runTransaction(this.db, async (transaction) => {
                const doc = await transaction.get(docRef);
                
                if (!doc.exists()) {
                    throw new Error('Week document not found');
                }
                
                const weekData = doc.data();
                
                // Check if week is locked
                if (weekData.status.locked) {
                    throw new Error('Week is locked - games have started');
                }
                
                // Check if user was eliminated in previous weeks
                if (weekData.picks[userId]?.eliminated) {
                    throw new Error('User is already eliminated');
                }
                
                // Check for duplicate team usage (if we have previous picks)
                const previousPicks = weekData.picks[userId]?.previousPicks || [];
                if (previousPicks.includes(teamPicked)) {
                    throw new Error(`Already used ${teamPicked} in a previous week`);
                }
                
                // Update the pick
                const updatedPick = {
                    teamPicked,
                    displayName: userDisplayName,
                    pickTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    eliminated: false,
                    eliminationWeek: null,
                    eliminationReason: null,
                    previousPicks: previousPicks
                };
                
                // Update pick distribution stats
                const pickDistribution = { ...weekData.stats.pickDistribution };
                
                // Remove old pick from distribution if exists
                const oldPick = weekData.picks[userId]?.teamPicked;
                if (oldPick && pickDistribution[oldPick]) {
                    pickDistribution[oldPick]--;
                    if (pickDistribution[oldPick] === 0) {
                        delete pickDistribution[oldPick];
                    }
                }
                
                // Add new pick to distribution
                pickDistribution[teamPicked] = (pickDistribution[teamPicked] || 0) + 1;
                
                // Find most popular pick
                const mostPopularPick = Object.entries(pickDistribution)
                    .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
                
                // Count active players (those who made picks and aren't eliminated)
                const activePlayers = Object.values({
                    ...weekData.picks,
                    [userId]: updatedPick
                }).filter(p => p.teamPicked && !p.eliminated).length;
                
                // Perform atomic update
                transaction.update(docRef, {
                    [`picks.${userId}`]: updatedPick,
                    'stats.pickDistribution': pickDistribution,
                    'stats.mostPopularPick': mostPopularPick,
                    'stats.totalActivePlayers': activePlayers,
                    'stats.updatedAt': firebase.firestore.FieldValue.serverTimestamp(),
                    'lastUpdated': firebase.firestore.FieldValue.serverTimestamp(),
                    'version': firebase.firestore.FieldValue.increment(1)
                });
            });
            
            // Clear cache for this week
            this.cachedWeekData.delete(weekNumber);
            
            console.log(`✅ Updated pick for ${userDisplayName}: ${teamPicked}`);
            
        } catch (error) {
            console.error('Error updating pick:', error);
            throw error;
        }
    }

    // Process eliminations after games complete
    async processEliminations(weekNumber, gameResults) {
        const docRef = this.getWeekDocRef(weekNumber);
        
        try {
            await runTransaction(this.db, async (transaction) => {
                const doc = await transaction.get(docRef);
                
                if (!doc.exists()) {
                    throw new Error('Week document not found');
                }
                
                const weekData = doc.data();
                
                if (weekData.status.eliminationsProcessed) {
                    console.log('Eliminations already processed');
                    return;
                }
                
                const updatedPicks = { ...weekData.picks };
                let eliminatedCount = 0;
                let noPickCount = 0;
                
                // Process each user's pick
                for (const [userId, userPick] of Object.entries(weekData.picks)) {
                    if (userPick.eliminated) continue; // Already eliminated
                    
                    if (!userPick.teamPicked) {
                        // No pick = elimination (but don't show these users)
                        updatedPicks[userId] = {
                            ...userPick,
                            eliminated: true,
                            eliminationWeek: weekNumber,
                            eliminationReason: 'no-pick'
                        };
                        noPickCount++;
                        eliminatedCount++;
                        continue;
                    }
                    
                    // Check if team lost
                    const teamResult = gameResults[userPick.teamPicked];
                    if (teamResult && teamResult.completed) {
                        if (teamResult.winner !== userPick.teamPicked) {
                            updatedPicks[userId] = {
                                ...userPick,
                                eliminated: true,
                                eliminationWeek: weekNumber,
                                eliminationReason: 'loss'
                            };
                            eliminatedCount++;
                        }
                    }
                }
                
                // Update document with eliminations
                transaction.update(docRef, {
                    'picks': updatedPicks,
                    'gameResults': gameResults,
                    'status.eliminationsProcessed': true,
                    'status.allGamesComplete': true,
                    'stats.totalEliminated': weekData.stats.totalEliminated + eliminatedCount,
                    'stats.totalNoPick': noPickCount,
                    'stats.totalActivePlayers': weekData.stats.totalActivePlayers - eliminatedCount,
                    'stats.updatedAt': firebase.firestore.FieldValue.serverTimestamp(),
                    'lastUpdated': firebase.firestore.FieldValue.serverTimestamp(),
                    'version': firebase.firestore.FieldValue.increment(1)
                });
            });
            
            // Clear cache
            this.cachedWeekData.delete(weekNumber);
            
            console.log(`✅ Processed eliminations for week ${weekNumber}`);
            
            // Trigger week progression
            await this.progressToNextWeek(weekNumber, weekNumber + 1);
            
        } catch (error) {
            console.error('Error processing eliminations:', error);
            throw error;
        }
    }

    // Progress surviving players to next week
    async progressToNextWeek(currentWeek, nextWeek) {
        const currentDocRef = this.getWeekDocRef(currentWeek);
        
        const nextDocRef = this.getWeekDocRef(nextWeek);
        
        try {
            const currentDoc = await getDoc(currentDocRef);
            if (!currentDoc.exists()) {
                throw new Error('Current week document not found');
            }
            
            const currentData = currentDoc.data();
            const nextWeekPicks = {};
            let survivorCount = 0;
            
            // Carry forward only survivors who made picks
            for (const [userId, userPick] of Object.entries(currentData.picks)) {
                // Skip eliminated users and no-picks
                if (!userPick.eliminated && userPick.teamPicked) {
                    nextWeekPicks[userId] = {
                        teamPicked: null, // Reset for new week
                        displayName: userPick.displayName,
                        pickTimestamp: null,
                        eliminated: false,
                        eliminationWeek: null,
                        eliminationReason: null,
                        previousPicks: [
                            ...(userPick.previousPicks || []),
                            userPick.teamPicked
                        ]
                    };
                    survivorCount++;
                }
            }
            
            // Create or update next week document
            await setDoc(nextDocRef, {
                weekNumber: nextWeek,
                year: this.currentYear,
                poolId: this.poolId,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                version: 1,
                picks: nextWeekPicks,
                gameResults: {},
                status: {
                    locked: false,
                    processed: false,
                    firstGameTime: null,
                    allGamesComplete: false,
                    eliminationsProcessed: false
                },
                stats: {
                    totalActivePlayers: survivorCount,
                    totalEliminated: 0,
                    totalNoPick: 0,
                    pickDistribution: {},
                    mostPopularPick: '',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            }, { merge: true });
            
            console.log(`✅ Progressed ${survivorCount} survivors to week ${nextWeek}`);
            
        } catch (error) {
            console.error('Error progressing to next week:', error);
            throw error;
        }
    }

    // Subscribe to real-time updates for a week
    subscribeToWeek(weekNumber, callback) {
        const docRef = this.getWeekDocRef(weekNumber);
        
        // Unsubscribe from previous listener if exists
        if (this.listeners.has(weekNumber)) {
            this.listeners.get(weekNumber)();
        }
        
        const unsubscribe = docRef.onSnapshot(
            { includeMetadataChanges: false },
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    
                    // Update cache
                    this.cachedWeekData.set(weekNumber, {
                        data,
                        timestamp: Date.now()
                    });
                    
                    callback(data);
                }
            },
            (error) => {
                console.error('Real-time sync error:', error);
            }
        );
        
        this.listeners.set(weekNumber, unsubscribe);
        
        return unsubscribe;
    }

    // Get formatted display data (filters out no-picks)
    getDisplayData(weekData) {
        if (!weekData || !weekData.picks) return [];
        
        // Filter out users who never made a pick
        const displayPicks = Object.entries(weekData.picks)
            .filter(([userId, pick]) => {
                // Only show users who made a pick at some point
                return pick.teamPicked || pick.previousPicks?.length > 0;
            })
            .map(([userId, pick]) => ({
                userId,
                displayName: pick.displayName,
                teamPicked: pick.teamPicked || 'No pick',
                status: this.getPickStatus(pick),
                eliminated: pick.eliminated,
                eliminationWeek: pick.eliminationWeek,
                eliminationReason: pick.eliminationReason
            }));
        
        // Sort: active first, then eliminated
        displayPicks.sort((a, b) => {
            if (a.eliminated !== b.eliminated) {
                return a.eliminated ? 1 : -1;
            }
            return a.displayName.localeCompare(b.displayName);
        });
        
        return displayPicks;
    }

    // Get status for display
    getPickStatus(pick) {
        if (pick.eliminated) {
            if (pick.eliminationReason === 'no-pick') {
                return 'no_pick';
            }
            return 'eliminated';
        }
        
        if (!pick.teamPicked) {
            return 'pending';
        }
        
        return 'active';
    }

    // Migrate existing individual picks to unified structure
    async migrateToUnifiedStructure(weekNumber) {
        console.log(`🔄 Starting migration to unified structure for week ${weekNumber}...`);
        
        const docRef = this.getWeekDocRef(weekNumber);
        
        try {
            // Get pool members
            const poolMembersPath = `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`;
            const poolMembersRef = doc(db, poolMembersPath);
            const poolMembersDoc = await getDoc(poolMembersRef);
            
            if (!poolMembersDoc.exists()) {
                throw new Error('Pool members not found');
            }
            
            const poolMembers = poolMembersDoc.data();
            const unifiedPicks = {};
            
            // Read all individual picks in parallel
            const pickPromises = Object.keys(poolMembers).map(async (userId) => {
                const pickPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;
                const pickRef = doc(db, pickPath);
                const pickDoc = await getDoc(pickRef);
                
                if (pickDoc.exists()) {
                    const userData = pickDoc.data();
                    const weekPick = userData.picks?.[weekNumber];
                    
                    if (weekPick) {
                        return {
                            userId,
                            displayName: poolMembers[userId].displayName || poolMembers[userId].email,
                            teamPicked: weekPick.team,
                            pickTimestamp: weekPick.timestamp || null,
                            eliminated: false,
                            eliminationWeek: null,
                            eliminationReason: null,
                            previousPicks: []
                        };
                    }
                }
                
                return null;
            });
            
            const picks = await Promise.all(pickPromises);
            
            // Build unified picks object
            picks.forEach(pick => {
                if (pick) {
                    unifiedPicks[pick.userId] = pick;
                }
            });
            
            // Calculate statistics
            const pickDistribution = {};
            Object.values(unifiedPicks).forEach(pick => {
                if (pick.teamPicked) {
                    pickDistribution[pick.teamPicked] = (pickDistribution[pick.teamPicked] || 0) + 1;
                }
            });
            
            const mostPopularPick = Object.entries(pickDistribution)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
            
            // Create unified document
            await setDoc(docRef, {
                weekNumber,
                year: this.currentYear,
                poolId: this.poolId,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                version: 1,
                picks: unifiedPicks,
                gameResults: {},
                status: {
                    locked: false,
                    processed: false,
                    firstGameTime: null,
                    allGamesComplete: false,
                    eliminationsProcessed: false
                },
                stats: {
                    totalActivePlayers: Object.keys(unifiedPicks).length,
                    totalEliminated: 0,
                    totalNoPick: 0,
                    pickDistribution,
                    mostPopularPick,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }
            });
            
            console.log(`✅ Migration complete! Migrated ${Object.keys(unifiedPicks).length} picks to unified structure`);
            
        } catch (error) {
            console.error('Migration error:', error);
            throw error;
        }
    }
}

// Initialize globally
window.unifiedSurvivorManager = null;

async function initializeUnifiedSurvivor() {
    if (typeof window.db === 'undefined') {
        setTimeout(initializeUnifiedSurvivor, 500);
        return;
    }
    
    window.unifiedSurvivorManager = new UnifiedSurvivorManager(db);
    console.log('⚡ Unified Survivor Manager initialized');
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUnifiedSurvivor);
} else {
    initializeUnifiedSurvivor();
}