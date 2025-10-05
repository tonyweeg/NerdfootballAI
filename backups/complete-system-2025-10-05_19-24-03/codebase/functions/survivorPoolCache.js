// 🏈 FIREBASE FUNCTION: Survivor Pool Data Cache System
// Provides blazing fast survivor pool data with real-time elimination tracking

const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// NFL Team Helmet URLs
function getHelmetUrl(teamName) {
    const teamMap = {
        "Arizona Cardinals": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fari_Arizona_Cardinals.png?alt=media&token=38143dcd-6075-4fa3-9f3c-98518a6ec3f3",
        "Atlanta Falcons": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fatl_Atlanta_Falcons.png?alt=media",
        "Baltimore Ravens": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fbal_Baltimore_Ravens.png?alt=media",
        "Buffalo Bills": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fbuf_Buffalo_Bills.png?alt=media",
        "Carolina Panthers": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fcar_Carolina_Panthers.png?alt=media",
        "Chicago Bears": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fchi_Chicago_Bears.png?alt=media",
        "Cincinnati Bengals": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fcin_Cincinnati_Bengals.png?alt=media",
        "Cleveland Browns": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fcle_Cleveland_Browns.png?alt=media",
        "Dallas Cowboys": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fdal_Dallas_Cowboys.png?alt=media",
        "Denver Broncos": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fden_Denver_Broncos.png?alt=media",
        "Detroit Lions": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fdet_Detroit_Lions.png?alt=media",
        "Green Bay Packers": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fgb_Green_Bay_Packers.png?alt=media",
        "Houston Texans": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fhou_Houston_Texans.png?alt=media",
        "Indianapolis Colts": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Find_Indianapolis_Colts.png?alt=media",
        "Jacksonville Jaguars": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fjax_Jacksonville_Jaguars.png?alt=media",
        "Kansas City Chiefs": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fkc_Kansas_City_Chiefs.png?alt=media",
        "Las Vegas Raiders": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Flv_Las_Vegas_Raiders.png?alt=media",
        "Los Angeles Chargers": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Flac_Los_Angeles_Chargers.png?alt=media",
        "Los Angeles Rams": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Flar_Los_Angeles_Rams.png?alt=media",
        "Miami Dolphins": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fmia_Miami_Dolphins.png?alt=media",
        "Minnesota Vikings": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fmin_Minnesota_Vikings.png?alt=media",
        "New England Patriots": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fne_New_England_Patriots.png?alt=media",
        "New Orleans Saints": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fno_New_Orleans_Saints.png?alt=media",
        "New York Giants": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fnyg_New_York_Giants.png?alt=media",
        "New York Jets": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fnyj_New_York_Jets.png?alt=media",
        "Philadelphia Eagles": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fphi_Philadelphia_Eagles.png?alt=media",
        "Pittsburgh Steelers": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fpit_Pittsburgh_Steelers.png?alt=media",
        "San Francisco 49ers": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fsf_San_Francisco_49ers.png?alt=media",
        "Seattle Seahawks": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fsea_Seattle_Seahawks.png?alt=media",
        "Tampa Bay Buccaneers": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Ftb_Tampa_Bay_Buccaneers.png?alt=media",
        "Tennessee Titans": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Ften_Tennessee_Titans.png?alt=media",
        "Washington Commanders": "https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2Fwas_Washington_Commanders.png?alt=media"
    };
    return teamMap[teamName] || null;
}

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
                allWinningPicks: [],
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

            // Get all available weeks from NFL results and sort them
            const completedWeeks = Object.keys(nflResults).map(w => parseInt(w)).sort((a, b) => a - b);
            console.log(`🗓️ Available weeks with NFL results: ${completedWeeks.join(', ')}`);

            // Check if user has week 1 pick (required to participate)
            const week1Pick = picks['1'];
            if (!week1Pick || !week1Pick.team) {
                console.log(`⚠️ ${memberName} has NO Week 1 pick`);
                survivorRecord.week1Pick = 'NO_WEEK1_PICK';
                survivorRecord.status = 'NO_WEEK1_PICK';
                nonParticipating.push(survivorRecord);
                survivorData.summary.notParticipating++;
                continue;
            }

            const week1TeamName = typeof week1Pick.team === 'string' ? week1Pick.team : (week1Pick.team.teamPicked || week1Pick.team.team || 'UNKNOWN_FORMAT');
            survivorRecord.week1Pick = week1TeamName;
            console.log(`✅ ${memberName} Week 1 pick: ${week1TeamName}`);

            // DYNAMIC ELIMINATION LOGIC - check each completed week in order
            let isEliminated = false;
            let eliminatedWeek = 0;
            let eliminatedBy = 'N/A';
            let allWinningPicks = [];

            for (const weekNumber of completedWeeks) {
                if (isEliminated) break; // Stop checking if already eliminated

                const weekPick = picks[weekNumber.toString()];
                if (!weekPick || !weekPick.team) {
                    console.log(`⚠️ ${memberName} has NO pick for Week ${weekNumber}`);
                    continue; // Skip weeks with no picks (might eliminate them later for missing picks)
                }

                const teamName = typeof weekPick.team === 'string' ? weekPick.team : (weekPick.team.teamPicked || weekPick.team.team || 'UNKNOWN');
                const weekResults = nflResults[weekNumber];

                console.log(`🏈 ${memberName} Week ${weekNumber} pick: ${teamName}`);

                if (weekResults.losingTeams.includes(teamName)) {
                    // PICKED A LOSER = DEAD IMMEDIATELY
                    isEliminated = true;
                    eliminatedWeek = weekNumber;
                    eliminatedBy = teamName;
                    console.log(`💀 ${memberName} ELIMINATED Week ${weekNumber} - picked LOSER ${teamName}`);
                    break;
                } else if (weekResults.winningTeams.includes(teamName)) {
                    // PICKED A WINNER = SURVIVE THIS WEEK
                    const helmetUrl = getHelmetUrl(teamName);
                    allWinningPicks.push({
                        week: weekNumber,
                        team: teamName,
                        helmetUrl: helmetUrl
                    });
                    console.log(`✅ ${memberName} SURVIVED Week ${weekNumber} - picked WINNER ${teamName}`);
                } else {
                    // TEAM NOT IN RESULTS = GAME NOT FINAL YET, STILL ALIVE
                    console.log(`⏳ ${memberName} Week ${weekNumber} pick ${teamName} - game not final yet, still alive`);
                    // DO NOT ELIMINATE - continue to check remaining weeks
                }
            }

            // Store all winning picks in the record
            survivorRecord.allWinningPicks = allWinningPicks;

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
    const currentWeek = getCurrentWeekNumber();

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

                // ENHANCED DEBUG: Show actual Week 4 data structure
                if (week === 4) {
                    console.log(`🔥 WEEK 4 RAW DATA:`, JSON.stringify(weekData, null, 2));
                    console.log(`🔥 WEEK 4 GAME KEYS:`, Object.keys(weekData));
                }

                if (gameCount > 0) {
                    // Extract winning AND losing teams for this week
                    const winningTeams = [];
                    const losingTeams = [];

                    Object.entries(weekData).forEach(([gameId, game]) => {
                        // ENHANCED DEBUG: Show each Week 4 game processing
                        if (week === 4) {
                            console.log(`🔥 WEEK 4 PROCESSING GAME ${gameId}:`, JSON.stringify(game, null, 2));
                        }

                        // Skip metadata objects - only process actual games
                        // FIXED: Handle both ESPN format (awayTeam/homeTeam) and legacy format (a/h)
                        const hasTeams = (game.a && game.h) || (game.awayTeam && game.homeTeam);
                        if (gameId.startsWith('_') || !hasTeams || !game.hasOwnProperty('status')) {
                            console.log(`⏭️  Skipping non-game object: ${gameId} (hasTeams: ${hasTeams}, hasStatus: ${game.hasOwnProperty('status')})`);
                            if (week === 4) {
                                console.log(`🔥 WEEK 4 SKIPPED GAME ${gameId} - hasTeams: ${hasTeams}, hasStatus: ${game.hasOwnProperty('status')}`);
                            }
                            return;
                        }

                        console.log(`🎯 Processing game ${gameId}:`, JSON.stringify(game, null, 2));
                        // CRITICAL: ESPN writes STATUS_FINAL, not FINAL - fix status detection
                        const isFinalGame = game.status === 'STATUS_FINAL' || game.status === 'FINAL' || game.status === 'FINAL/OT' || game.status === 'final' || game.status === 'final/ot';
                        if (isFinalGame && game.winner) {
                            // Collect winners and losers using correct field names
                            winningTeams.push(game.winner);
                            // FIXED: Handle both ESPN format (awayTeam/homeTeam) and legacy format (a/h)
                            const homeTeam = game.h || game.homeTeam;
                            const awayTeam = game.a || game.awayTeam;
                            const loser = game.winner === homeTeam ? awayTeam : homeTeam;
                            losingTeams.push(loser);
                            console.log(`✅ FINAL Game - Winner: ${game.winner}, Loser: ${loser}, Status: ${game.status}`);
                        } else {
                            console.log(`⏳ Game ${gameId} not final - Status: ${game.status}, Winner: ${game.winner || 'TBD'}`);
                        }
                    });

                    console.log(`🏆 Week ${week} WINNERS: [${winningTeams.join(', ')}]`);
                    console.log(`💀 Week ${week} LOSERS: [${losingTeams.join(', ')}]`);
                    if (week === 4) console.log(`🔥 WEEK 4 DEBUG: ${winningTeams.length} winners, ${losingTeams.length} losers from ${gameCount} total games`);

                    // ENHANCED LOGIC: Include week if ANY FINAL games exist (not just if all complete)
                    // This is crucial for current week processing during Sunday games
                    // EMERGENCY FIX: Force include Week 4 for elimination processing
                    if (winningTeams.length > 0 || week === currentWeek || week === 4) {
                        nflResults[week] = {
                            winningTeams,
                            losingTeams,
                            gameCount,
                            isCurrentWeek: week === currentWeek,
                            finalGamesCount: winningTeams.length
                        };
                        console.log(`✅ Added Week ${week} to processing (${winningTeams.length} final games, currentWeek: ${week === currentWeek})`);
                    } else {
                        console.log(`⏭️ Skipping Week ${week} - no final games and not current week`);
                    }
                }
            }
        } catch (error) {
            // Week doesn't exist yet - continue
        }
    }

    console.log(`📊 Loaded NFL results for weeks: ${Object.keys(nflResults).join(', ')}`);
    console.log(`🚀 ENHANCED LOGIC ACTIVE - Current week ${currentWeek} will be processed even with partial games`);

    // Log current week status for debugging
    if (nflResults[currentWeek]) {
        const currentWeekData = nflResults[currentWeek];
        console.log(`⚡ Week ${currentWeek} STATUS: ${currentWeekData.finalGamesCount}/${currentWeekData.gameCount} games final`);
        console.log(`🏆 Week ${currentWeek} WINNERS: [${currentWeekData.winningTeams.join(', ')}]`);
        console.log(`💀 Week ${currentWeek} LOSERS: [${currentWeekData.losingTeams.join(', ')}]`);
    }

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
}// Force deployment Sun Sep 28 20:09:50 EDT 2025
