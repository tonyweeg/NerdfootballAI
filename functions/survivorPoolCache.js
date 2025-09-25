// 🏈 FIREBASE FUNCTION: Survivor Pool Data Cache System
// Provides blazing fast survivor pool data with real-time elimination tracking

const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!initializeApp.apps || initializeApp.apps.length === 0) {
    initializeApp();
}
const db = getFirestore();

// Cache configuration (matching ESPN cache pattern)
const CACHE_DURATION_MS = 10 * 1000; // 10 seconds for DEBUG - will change back
const SURVIVOR_CACHE_PATH = 'cache/survivor_pool_2025';

/**
 * Get survivor pool data with blazing fast caching
 * Returns all pool members with their survivor status, picks, and elimination details
 */
exports.getSurvivorPoolData = onRequest(
    {
        cors: true,
        timeoutSeconds: 60,
        memory: '512MiB',
        invoker: 'public'
    },
    async (req, res) => {
        console.log('🏈 Survivor Pool Data Request Started');
        const startTime = Date.now();
        const poolId = req.query.poolId || 'nerduniverse-2025';

        try {
            // Check if we have recent cached data
            const cacheRef = db.doc(SURVIVOR_CACHE_PATH);
            const cacheSnap = await cacheRef.get();

            if (cacheSnap.exists) {
                const cacheData = cacheSnap.data();
                const cacheAge = Date.now() - cacheData.generatedAt;

                if (cacheAge < CACHE_DURATION_MS) {
                    console.log(`✅ Cache hit - returning survivor data (age: ${Math.round(cacheAge/1000)}s)`);
                    return res.status(200).json({
                        success: true,
                        data: cacheData.survivorData,
                        cached: true,
                        cacheAge: Math.round(cacheAge/1000),
                        responseTime: Date.now() - startTime,
                        poolId: poolId
                    });
                }
            }

            // Generate fresh survivor pool data
            console.log('🔄 Generating fresh survivor pool data...');
            const survivorData = await generateSurvivorPoolData(poolId);

            // Cache the results
            const cacheDocument = {
                survivorData: survivorData,
                generatedAt: Date.now(),
                generatedAtTimestamp: Timestamp.now(),
                poolId: poolId,
                version: '2025-survivor-v1'
            };

            await cacheRef.set(cacheDocument);

            const totalTime = Date.now() - startTime;
            console.log(`✅ Survivor pool data cached successfully in ${totalTime}ms`);

            res.status(200).json({
                success: true,
                data: survivorData,
                cached: false,
                responseTime: totalTime,
                poolId: poolId,
                nextRefresh: new Date(Date.now() + CACHE_DURATION_MS).toISOString()
            });

        } catch (error) {
            console.error('❌ Error getting survivor pool data:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                responseTime: Date.now() - startTime,
                poolId: poolId
            });
        }
    }
);

/**
 * Generate complete survivor pool data with elimination analysis
 */
async function generateSurvivorPoolData(poolId) {
    console.log(`🏈 Starting survivor pool data generation for ${poolId}...`);

    // Get pool members - CORRECT PATH FROM USER
    const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
    const membersDoc = await db.doc(poolMembersPath).get();

    if (!membersDoc.exists) {
        throw new Error(`Pool ${poolId} not found`);
    }

    const poolMembers = membersDoc.data();

    // Filter for SURVIVOR PARTICIPANTS ONLY - participation.survivor.enabled=true and status=active
    const memberIds = Object.keys(poolMembers).filter(id => {
        if (id === 'okl4sw2aDhW3yKpOfOwe5lH7OQj1') return false; // Filter ghost user

        const member = poolMembers[id];
        const participation = member.participation;

        // Check if they are in survivor pool
        return participation &&
               participation.survivor &&
               participation.survivor.enabled === true;
    });

    console.log(`🏈 Found ${memberIds.length} survivor pool participants (enabled=true)`);

    // Also track who should be marked inactive due to eliminations
    const survivorParticipants = {};
    memberIds.forEach(id => {
        const member = poolMembers[id];
        survivorParticipants[id] = {
            ...member,
            currentSurvivorStatus: member.participation.survivor.status || 'unknown'
        };
    });

    // Load NFL results for all available weeks
    console.log('🚨 ABOUT TO LOAD NFL RESULTS - CRITICAL DEBUG');
    const nflResults = await loadNFLResultsForAllWeeks();
    console.log('🚨 NFL RESULTS LOADED:', JSON.stringify(nflResults, null, 2));
    const currentWeek = getCurrentWeekNumber();

    const survivorData = {
        survivors: [],
        summary: {
            alive: 0,
            eliminated: 0,
            notParticipating: 0,
            total: memberIds.length
        },
        generatedAt: new Date().toISOString(),
        poolId: poolId,
        currentWeek: currentWeek,
        availableWeeks: Object.keys(nflResults).map(w => parseInt(w)).sort((a, b) => a - b)
    };

    // Initialize arrays for different survivor categories
    const alive = [];
    const eliminated = [];
    const nonParticipating = [];

    console.log(`🔍 Processing ${memberIds.length} pool members for survivor picks...`);

    // Process each pool member - SIMPLE LOGIC
    for (const memberId of memberIds) {
        try {
            const memberInfo = poolMembers[memberId];
            const memberName = memberInfo.displayName || memberInfo.name || memberInfo.email || 'Unknown';

            console.log(`👤 Checking survivor picks for: ${memberName} (${memberId})`);

            // Get survivor picks for this member - CORRECT PATH FROM USER
            const survivorPicksPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${memberId}`;
            const picksDoc = await db.doc(survivorPicksPath).get();

            // Check current participation status
            const currentStatus = survivorParticipants[memberId].currentSurvivorStatus;
            console.log(`🔍 ${memberName} current participation status: ${currentStatus}`);

            let survivorRecord = {
                userId: memberId,
                name: memberName,
                displayName: memberName,
                email: memberInfo.email || '',
                week1Pick: 'NO_PICKS_FOUND',
                status: 'NO_PICKS_FOUND',
                eliminatedWeek: 0,
                eliminatedBy: 'N/A'
            };

            if (!picksDoc.exists) {
                console.log(`❌ NO PICKS DOCUMENT found for ${memberName} at: ${survivorPicksPath}`);
                survivorRecord.status = 'NO_PICKS_FOUND';
                nonParticipating.push(survivorRecord);
                survivorData.summary.notParticipating++;
                continue;
            }

            const picksData = picksDoc.data();
            console.log(`📋 Found picks document for ${memberName}:`, Object.keys(picksData || {}));

            // Handle the ACTUAL data structure - picks stored as week objects
            const picks = picksData.picks || picksData;
            console.log(`📋 Raw picks data structure for ${memberName}:`, JSON.stringify(picks, null, 2));

            // Data is already organized by week: {1: {gameId: "111", team: "Denver Broncos"}, 2: {...}}
            const week1Team = picks['1']?.team || null;
            const week2Team = picks['2']?.team || null;
            const week3Team = picks['3']?.team || null;

            console.log(`🏈 ${memberName} picks - Week 1: ${JSON.stringify(week1Team)}, Week 2: ${JSON.stringify(week2Team)}, Week 3: ${JSON.stringify(week3Team)}`);

            if (!week1Team) {
                console.log(`⚠️ ${memberName} has NO Week 1 pick`);
                survivorRecord.week1Pick = 'NO_WEEK1_PICK';
                survivorRecord.status = 'NO_WEEK1_PICK';
                nonParticipating.push(survivorRecord);
                survivorData.summary.notParticipating++;
                continue;
            }

            // Extract team name from Week 1
            const week1TeamName = typeof week1Team === 'string' ? week1Team : (week1Team.teamPicked || week1Team.team || 'UNKNOWN_FORMAT');
            survivorRecord.week1Pick = week1TeamName;

            console.log(`✅ ${memberName} Week 1 pick: ${week1TeamName}`);

            // SIMPLE ELIMINATION LOGIC - check each completed week
            let isEliminated = false;
            let eliminatedWeek = 0;
            let eliminatedBy = 'N/A';

            // Week 1 check - BULLETPROOF ELIMINATION LOGIC
            if (nflResults[1] && week1TeamName) {
                if (nflResults[1].losingTeams.includes(week1TeamName)) {
                    // PICKED A LOSER = DEAD IMMEDIATELY
                    isEliminated = true;
                    eliminatedWeek = 1;
                    eliminatedBy = week1TeamName;
                    console.log(`💀 ${memberName} ELIMINATED Week 1 - picked LOSER ${week1TeamName}`);
                } else if (nflResults[1].winningTeams.includes(week1TeamName)) {
                    // PICKED A WINNER = SURVIVE
                    console.log(`✅ ${memberName} SURVIVED Week 1 - picked WINNER ${week1TeamName}`);
                } else {
                    // PICKED A TEAM WITH NO RESULT = DEAD (safety elimination)
                    isEliminated = true;
                    eliminatedWeek = 1;
                    eliminatedBy = `${week1TeamName} (NO_RESULT)`;
                    console.log(`💀 ${memberName} ELIMINATED Week 1 - picked ${week1TeamName} (NO GAME RESULT)`);
                }
            } else if (week1TeamName) {
                // HAS PICK BUT NO NFL RESULTS = DEAD (safety elimination)
                isEliminated = true;
                eliminatedWeek = 1;
                eliminatedBy = `${week1TeamName} (NO_NFL_DATA)`;
                console.log(`💀 ${memberName} ELIMINATED Week 1 - no NFL data for ${week1TeamName}`);
            }

            // Week 2 check - ONLY if SURVIVED Week 1 (BULLETPROOF)
            if (!isEliminated && week2Team && nflResults[2]) {
                const week2TeamName = typeof week2Team === 'string' ? week2Team : (week2Team.teamPicked || week2Team.team);
                if (week2TeamName) {
                    if (nflResults[2].losingTeams.includes(week2TeamName)) {
                        // PICKED A LOSER = DEAD IMMEDIATELY
                        isEliminated = true;
                        eliminatedWeek = 2;
                        eliminatedBy = week2TeamName;
                        console.log(`💀 ${memberName} ELIMINATED Week 2 - picked LOSER ${week2TeamName}`);
                    } else if (nflResults[2].winningTeams.includes(week2TeamName)) {
                        // PICKED A WINNER = SURVIVE TO WEEK 3
                        console.log(`✅ ${memberName} SURVIVED Week 2 - picked WINNER ${week2TeamName}`);
                    } else {
                        // PICKED TEAM WITH NO RESULT = DEAD (safety elimination)
                        isEliminated = true;
                        eliminatedWeek = 2;
                        eliminatedBy = `${week2TeamName} (NO_RESULT)`;
                        console.log(`💀 ${memberName} ELIMINATED Week 2 - picked ${week2TeamName} (NO GAME RESULT)`);
                    }
                }
            }

            // Week 3 check - ONLY if SURVIVED Week 1 & 2 (BULLETPROOF)
            if (!isEliminated && week3Team && nflResults[3]) {
                const week3TeamName = typeof week3Team === 'string' ? week3Team : (week3Team.teamPicked || week3Team.team);
                if (week3TeamName) {
                    if (nflResults[3].losingTeams.includes(week3TeamName)) {
                        // PICKED A LOSER = DEAD IMMEDIATELY
                        isEliminated = true;
                        eliminatedWeek = 3;
                        eliminatedBy = week3TeamName;
                        console.log(`💀 ${memberName} ELIMINATED Week 3 - picked LOSER ${week3TeamName}`);
                    } else if (nflResults[3].winningTeams.includes(week3TeamName)) {
                        // PICKED A WINNER = SURVIVE TO WEEK 4
                        console.log(`✅ ${memberName} SURVIVED Week 3 - picked WINNER ${week3TeamName}`);
                    } else {
                        // PICKED TEAM WITH NO RESULT = DEAD (safety elimination)
                        isEliminated = true;
                        eliminatedWeek = 3;
                        eliminatedBy = `${week3TeamName} (NO_RESULT)`;
                        console.log(`💀 ${memberName} ELIMINATED Week 3 - picked ${week3TeamName} (NO GAME RESULT)`);
                    }
                }
            }

            // Final status with participation status update logic
            if (isEliminated) {
                survivorRecord.status = 'ELIMINATED';
                survivorRecord.eliminatedWeek = eliminatedWeek;
                survivorRecord.eliminatedBy = eliminatedBy;
                eliminated.push(survivorRecord);
                survivorData.summary.eliminated++;

                // CRITICAL: If they're eliminated but still marked as "active", they should be "inactive"
                if (currentStatus === 'active') {
                    console.log(`🚨 ${memberName} should be marked INACTIVE - eliminated in Week ${eliminatedWeek}`);
                    survivorRecord.shouldUpdateStatus = 'inactive';
                    survivorRecord.updateReason = `eliminated_week_${eliminatedWeek}`;
                }
            } else {
                survivorRecord.status = 'ALIVE';
                alive.push(survivorRecord);
                survivorData.summary.alive++;
                console.log(`🔥 ${memberName} is ALIVE - survived through available weeks`);

                // If they're alive but marked as "inactive", they should be "active"
                if (currentStatus === 'inactive') {
                    console.log(`✅ ${memberName} should be marked ACTIVE - still alive`);
                    survivorRecord.shouldUpdateStatus = 'active';
                    survivorRecord.updateReason = 'still_alive';
                }
            }

        } catch (memberError) {
            console.error(`❌ Error processing ${memberId}:`, memberError);
            // Add error record
            nonParticipating.push({
                userId: memberId,
                name: 'ERROR_PROCESSING',
                displayName: 'ERROR_PROCESSING',
                email: '',
                week1Pick: 'ERROR',
                status: 'ERROR',
                eliminatedWeek: 0,
                eliminatedBy: memberError.message
            });
            survivorData.summary.notParticipating++;
        }
    }

    // Add categorized arrays to survivorData
    survivorData.alive = alive;
    survivorData.eliminated = eliminated;
    survivorData.nonParticipating = nonParticipating;

    // Sort each category alphabetically
    alive.sort((a, b) => a.name.localeCompare(b.name));
    eliminated.sort((a, b) => {
        // Sort eliminated by week first, then name
        if (a.eliminatedWeek !== b.eliminatedWeek) {
            return (a.eliminatedWeek || 999) - (b.eliminatedWeek || 999);
        }
        return a.name.localeCompare(b.name);
    });
    nonParticipating.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`✅ Generated survivor data: ${survivorData.summary.alive} alive, ${survivorData.summary.eliminated} eliminated, ${survivorData.summary.notParticipating} not participating`);

    return survivorData;
}

/**
 * Load NFL results for all available weeks
 */
async function loadNFLResultsForAllWeeks() {
    const nflResults = {};

    // Check weeks 1-18 for available NFL results
    for (let week = 1; week <= 18; week++) {
        try {
            const weekPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;
            console.log(`🔍 Checking NFL results for Week ${week} at path: ${weekPath}`);
            const weekDoc = await db.doc(weekPath).get();

            console.log(`📋 Week ${week} document exists: ${weekDoc.exists}`);

            if (weekDoc.exists) {
                const weekData = weekDoc.data();
                const gameCount = Object.keys(weekData).length;
                console.log(`🎯 Week ${week} has ${gameCount} games in database`);

                if (gameCount > 0) {
                    // Extract winning AND losing teams for this week
                    const winningTeams = [];
                    const losingTeams = [];

                    Object.entries(weekData).forEach(([gameId, game]) => {
                        // Skip metadata objects - only process actual games
                        if (gameId.startsWith('_') || !game.a || !game.h || !game.hasOwnProperty('status')) {
                            console.log(`⏭️  Skipping non-game object: ${gameId}`);
                            return;
                        }

                        console.log(`🎯 Processing game ${gameId}:`, JSON.stringify(game, null, 2));
                        if (game.status === 'final' && game.winner) {
                            // Collect winners and losers using correct field names
                            winningTeams.push(game.winner);
                            const loser = game.winner === game.h ? game.a : game.h;
                            losingTeams.push(loser);
                            console.log(`✅ Winner: ${game.winner}, Loser: ${loser}`);
                        }
                    });

                    console.log(`🏆 Week ${week} WINNERS: [${winningTeams.join(', ')}]`);
                    console.log(`💀 Week ${week} LOSERS: [${losingTeams.join(', ')}]`);

                    nflResults[week] = {
                        winningTeams,
                        losingTeams,
                        gameCount
                    };
                }
            }
        } catch (error) {
            // Week doesn't exist yet - continue
        }
    }

    console.log(`📊 Loaded NFL results for weeks: ${Object.keys(nflResults).join(', ')}`);
    return nflResults;
}


/**
 * Get current NFL week number based on date
 */
function getCurrentWeekNumber() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // NFL 2025 Season Week Calendar
    const NFL_2025_WEEKS = {
        1: { start: '2025-09-04' }, 2: { start: '2025-09-08' }, 3: { start: '2025-09-15' },
        4: { start: '2025-09-22' }, 5: { start: '2025-09-29' }, 6: { start: '2025-10-06' },
        7: { start: '2025-10-13' }, 8: { start: '2025-10-20' }, 9: { start: '2025-10-27' },
        10: { start: '2025-11-03' }, 11: { start: '2025-11-10' }, 12: { start: '2025-11-17' },
        13: { start: '2025-11-24' }, 14: { start: '2025-12-01' }, 15: { start: '2025-12-08' },
        16: { start: '2025-12-15' }, 17: { start: '2025-12-22' }, 18: { start: '2025-12-29' }
    };

    // Find current week based on today's date
    for (let week = 1; week <= 18; week++) {
        const weekData = NFL_2025_WEEKS[week];
        const weekStart = new Date(weekData.start);
        const nextWeek = NFL_2025_WEEKS[week + 1];
        const weekEnd = nextWeek ? new Date(nextWeek.start) : new Date('2026-01-10');

        if (today >= weekStart && today < weekEnd) {
            return week;
        }
    }

    // Fallback - if we're before week 1, return 1; if after week 18, return 18
    return todayStr < '2025-09-04' ? 1 : 18;
}