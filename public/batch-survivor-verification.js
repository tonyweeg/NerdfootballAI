// DIAMOND LEVEL: Batch Survivor Verification & Fix System
// Comprehensive tool to find and fix ALL incorrectly eliminated users

class BatchSurvivorVerification {
    constructor() {
        this.poolId = 'nerduniverse-2025';
        this.targetUserId = 'aaG5Wc2JZkZJD1r7ozfJG04QRrf1';
        this.bugPatterns = [];
        this.affectedUsers = [];
        this.verificationResults = {};
    }

    // Main entry point - run complete analysis
    async runCompleteAnalysis() {
        console.log('🚨 STARTING COMPREHENSIVE SURVIVOR VERIFICATION');
        console.log('='.repeat(80));

        try {
            // Step 1: Analyze target user to identify bug pattern
            console.log('🎯 STEP 1: Analyzing target user for bug patterns...');
            const targetAnalysis = await this.analyzeTargetUser();

            // Step 2: Identify specific bug patterns
            console.log('\n🔍 STEP 2: Identifying bug patterns...');
            this.bugPatterns = await this.identifyBugPatterns(targetAnalysis);

            // Step 3: Find all users with the same patterns
            console.log('\n🔍 STEP 3: Finding all affected users...');
            this.affectedUsers = await this.findAllAffectedUsers();

            // Step 4: Verify patterns are consistent
            console.log('\n🧪 STEP 4: Verifying patterns...');
            this.verificationResults = await this.verifyPatterns();

            // Step 5: Generate comprehensive report
            console.log('\n📊 STEP 5: Generating report...');
            const report = this.generateReport();

            console.log('\n✅ COMPREHENSIVE ANALYSIS COMPLETE');
            return {
                success: true,
                targetAnalysis,
                bugPatterns: this.bugPatterns,
                affectedUsers: this.affectedUsers,
                verificationResults: this.verificationResults,
                report
            };

        } catch (error) {
            console.error('❌ Comprehensive analysis failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Analyze the target user to understand the bug
    async analyzeTargetUser() {
        try {
            // Get user info
            const poolDoc = await getDoc(doc(window.db, `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`));
            const poolMembers = poolDoc.exists() ? poolDoc.data() : {};
            const userInfo = poolMembers[this.targetUserId];

            if (!userInfo) {
                throw new Error('Target user not found in pool members');
            }

            // Get elimination status
            const statusDoc = await getDoc(doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status'));
            const allStatuses = statusDoc.exists() ? statusDoc.data() : {};
            const userStatus = allStatuses[this.targetUserId];

            // Get user picks
            const picksDoc = await getDoc(doc(window.db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${this.targetUserId}`));
            const userPicksData = picksDoc.exists() ? picksDoc.data() : {};
            const userPicks = userPicksData.picks || {};

            console.log(`✅ Target user: ${userInfo.displayName || userInfo.email}`);
            console.log(`📊 Eliminated: ${userStatus?.eliminated || false}`);
            console.log(`📊 Week: ${userStatus?.eliminatedWeek || 'N/A'}`);
            console.log(`📊 Picks: ${Object.keys(userPicks).length} weeks`);

            // Analyze each pick vs actual results
            const pickAnalysis = {};
            for (const [week, pick] of Object.entries(userPicks)) {
                const weekNum = parseInt(week);
                const gameResult = await this.getActualGameResult(weekNum, pick.gameId, pick.team);

                pickAnalysis[weekNum] = {
                    pick: pick,
                    result: gameResult,
                    shouldWin: gameResult ? gameResult.userWon : null,
                    shouldEliminate: gameResult ? (!gameResult.userWon && gameResult.status === 'Final') : null
                };

                console.log(`📅 Week ${weekNum}: ${pick.team} -> ${gameResult ? (gameResult.userWon ? 'WIN' : 'LOSS') : 'UNKNOWN'}`);
            }

            return {
                userInfo,
                userStatus,
                userPicks,
                pickAnalysis,
                uid: this.targetUserId
            };

        } catch (error) {
            console.error('❌ Target user analysis failed:', error);
            throw error;
        }
    }

    // Identify specific bug patterns from target user analysis
    async identifyBugPatterns(targetAnalysis) {
        const patterns = [];
        const { userStatus, pickAnalysis } = targetAnalysis;

        console.log('🧠 Analyzing bug patterns...');

        // Pattern 1: User eliminated but won their elimination week
        if (userStatus?.eliminated) {
            const eliminationWeek = userStatus.eliminatedWeek;
            const eliminationWeekAnalysis = pickAnalysis[eliminationWeek];

            if (eliminationWeekAnalysis && eliminationWeekAnalysis.shouldWin) {
                patterns.push({
                    type: 'incorrect_elimination_week',
                    description: 'User eliminated in week they actually won',
                    eliminationWeek: eliminationWeek,
                    actualResult: 'WIN',
                    shouldBeAlive: true
                });
                console.log('🚨 Pattern: User eliminated in week they WON');
            }

            // Pattern 2: User eliminated in wrong week (should have been eliminated earlier)
            for (const [week, analysis] of Object.entries(pickAnalysis)) {
                const weekNum = parseInt(week);
                if (weekNum < eliminationWeek && analysis.shouldEliminate) {
                    patterns.push({
                        type: 'delayed_elimination',
                        description: 'User eliminated in wrong week, should have been eliminated earlier',
                        actualLossWeek: weekNum,
                        recordedEliminationWeek: eliminationWeek
                    });
                    console.log(`🚨 Pattern: User should have been eliminated in Week ${weekNum}, not Week ${eliminationWeek}`);
                    break;
                }
            }
        } else {
            // Pattern 3: User alive but should be eliminated
            for (const [week, analysis] of Object.entries(pickAnalysis)) {
                if (analysis.shouldEliminate) {
                    patterns.push({
                        type: 'missing_elimination',
                        description: 'User should be eliminated but marked as alive',
                        actualLossWeek: parseInt(week),
                        lossDetails: analysis.result
                    });
                    console.log(`🚨 Pattern: User should be eliminated in Week ${week} but marked as ALIVE`);
                    break;
                }
            }
        }

        if (patterns.length === 0) {
            console.log('✅ No bug patterns identified in target user');
        }

        return patterns;
    }

    // Find all users affected by the same bug patterns
    async findAllAffectedUsers() {
        if (this.bugPatterns.length === 0) {
            console.log('❌ No bug patterns to search for');
            return [];
        }

        try {
            // Get all pool members
            const poolDoc = await getDoc(doc(window.db, `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`));
            const poolMembers = poolDoc.exists() ? poolDoc.data() : {};

            // Get all elimination statuses
            const statusDoc = await getDoc(doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status'));
            const allStatuses = statusDoc.exists() ? statusDoc.data() : {};

            console.log(`📊 Scanning ${Object.keys(poolMembers).length} pool members...`);

            const affected = [];

            for (const [uid, member] of Object.entries(poolMembers)) {
                if (uid === this.targetUserId) continue; // Skip target user

                try {
                    // Get user picks
                    const picksDoc = await getDoc(doc(window.db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`));
                    const userPicksData = picksDoc.exists() ? picksDoc.data() : {};
                    const userPicks = userPicksData.picks || {};
                    const userStatus = allStatuses[uid];

                    // Check each bug pattern
                    for (const pattern of this.bugPatterns) {
                        const matchResult = await this.checkUserForPattern(uid, member, userPicks, userStatus, pattern);

                        if (matchResult.isAffected) {
                            affected.push({
                                uid,
                                displayName: member.displayName || member.email,
                                currentStatus: userStatus,
                                picks: userPicks,
                                bugPattern: pattern,
                                bugDetails: matchResult.details
                            });

                            console.log(`🚨 AFFECTED: ${member.displayName || member.email} - ${pattern.type}`);
                            break; // Don't check other patterns for this user
                        }
                    }

                } catch (error) {
                    console.warn(`⚠️ Error checking user ${uid}: ${error.message}`);
                }

                // Small delay to avoid overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            console.log(`📊 Found ${affected.length} affected users`);
            return affected;

        } catch (error) {
            console.error('❌ Finding affected users failed:', error);
            throw error;
        }
    }

    // Check if a specific user matches a bug pattern
    async checkUserForPattern(uid, member, userPicks, userStatus, pattern) {
        try {
            if (pattern.type === 'incorrect_elimination_week') {
                // Look for users eliminated in weeks they actually won
                if (userStatus?.eliminated) {
                    const eliminationWeekPick = userPicks[userStatus.eliminatedWeek];
                    if (eliminationWeekPick) {
                        const gameResult = await this.getActualGameResult(userStatus.eliminatedWeek, eliminationWeekPick.gameId, eliminationWeekPick.team);
                        if (gameResult && gameResult.userWon) {
                            return {
                                isAffected: true,
                                details: {
                                    eliminatedWeek: userStatus.eliminatedWeek,
                                    actualResult: 'WIN',
                                    shouldBeAlive: true,
                                    gameResult: gameResult
                                }
                            };
                        }
                    }
                }
            }

            if (pattern.type === 'missing_elimination') {
                // Look for users who should be eliminated but are alive
                if (!userStatus?.eliminated) {
                    for (const [week, pick] of Object.entries(userPicks)) {
                        const weekNum = parseInt(week);
                        const gameResult = await this.getActualGameResult(weekNum, pick.gameId, pick.team);

                        if (gameResult && !gameResult.userWon && gameResult.status === 'Final') {
                            return {
                                isAffected: true,
                                details: {
                                    shouldBeEliminatedWeek: weekNum,
                                    lossReason: `${pick.team} lost to ${gameResult.winner}`,
                                    gameResult: gameResult
                                }
                            };
                        }
                    }
                }
            }

            if (pattern.type === 'delayed_elimination') {
                // Look for users eliminated in wrong week
                if (userStatus?.eliminated) {
                    for (const [week, pick] of Object.entries(userPicks)) {
                        const weekNum = parseInt(week);
                        if (weekNum < userStatus.eliminatedWeek) {
                            const gameResult = await this.getActualGameResult(weekNum, pick.gameId, pick.team);

                            if (gameResult && !gameResult.userWon && gameResult.status === 'Final') {
                                return {
                                    isAffected: true,
                                    details: {
                                        actualLossWeek: weekNum,
                                        recordedEliminationWeek: userStatus.eliminatedWeek,
                                        earlyLossReason: `${pick.team} lost to ${gameResult.winner}`,
                                        gameResult: gameResult
                                    }
                                };
                            }
                        }
                    }
                }
            }

            return { isAffected: false };

        } catch (error) {
            console.warn(`Error checking pattern ${pattern.type} for user ${uid}:`, error);
            return { isAffected: false };
        }
    }

    // Verify patterns are consistent and accurate
    async verifyPatterns() {
        console.log(`🧪 Verifying patterns for ${this.affectedUsers.length} users...`);

        const results = {
            verified: [],
            failed: [],
            summary: {}
        };

        for (const user of this.affectedUsers) {
            try {
                console.log(`🔍 Verifying: ${user.displayName}`);

                const verification = await this.checkUserForPattern(
                    user.uid,
                    { displayName: user.displayName },
                    user.picks,
                    user.currentStatus,
                    user.bugPattern
                );

                if (verification.isAffected) {
                    results.verified.push({
                        uid: user.uid,
                        displayName: user.displayName,
                        pattern: user.bugPattern.type,
                        details: verification.details
                    });
                    console.log(`   ✅ Verified: ${user.bugPattern.type}`);
                } else {
                    results.failed.push({
                        uid: user.uid,
                        displayName: user.displayName,
                        pattern: user.bugPattern.type,
                        reason: 'Pattern no longer matches'
                    });
                    console.log(`   ❌ Verification failed`);
                }

            } catch (error) {
                results.failed.push({
                    uid: user.uid,
                    displayName: user.displayName,
                    pattern: user.bugPattern.type,
                    reason: error.message
                });
                console.log(`   ❌ Verification error: ${error.message}`);
            }
        }

        results.summary = {
            total: this.affectedUsers.length,
            verified: results.verified.length,
            failed: results.failed.length
        };

        console.log(`📊 Verification: ${results.verified.length}/${this.affectedUsers.length} confirmed`);
        return results;
    }

    // Generate comprehensive report
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                targetUser: this.targetUserId,
                bugPatternsFound: this.bugPatterns.length,
                affectedUsersFound: this.affectedUsers.length,
                verifiedUsers: this.verificationResults.verified?.length || 0
            },
            bugPatterns: this.bugPatterns,
            affectedUsers: this.affectedUsers.map(user => ({
                uid: user.uid,
                displayName: user.displayName,
                patternType: user.bugPattern.type,
                details: user.bugDetails
            })),
            verificationResults: this.verificationResults,
            recommendations: this.generateRecommendations()
        };

        // Log the report
        console.log('\n📋 COMPREHENSIVE REPORT');
        console.log('='.repeat(80));
        console.log(`🎯 Target User: ${this.targetUserId}`);
        console.log(`🔍 Bug Patterns Found: ${this.bugPatterns.length}`);
        console.log(`🚨 Affected Users: ${this.affectedUsers.length}`);
        console.log(`✅ Verified: ${this.verificationResults.verified?.length || 0}`);

        if (this.bugPatterns.length > 0) {
            console.log('\n🧠 BUG PATTERNS:');
            this.bugPatterns.forEach((pattern, index) => {
                console.log(`${index + 1}. ${pattern.type}: ${pattern.description}`);
            });
        }

        if (this.affectedUsers.length > 0) {
            console.log('\n🚨 AFFECTED USERS:');
            this.affectedUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.displayName} (${user.uid}) - ${user.bugPattern.type}`);
            });
        }

        return report;
    }

    // Generate recommendations based on findings
    generateRecommendations() {
        const recommendations = [];

        if (this.bugPatterns.some(p => p.type === 'incorrect_elimination_week')) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Bug Fix',
                action: 'Restore incorrectly eliminated users to ALIVE status',
                details: 'Users eliminated in weeks they actually won should be restored'
            });
        }

        if (this.bugPatterns.some(p => p.type === 'missing_elimination')) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Bug Fix',
                action: 'Eliminate users who should have been eliminated',
                details: 'Users who lost but are marked as alive should be eliminated'
            });
        }

        if (this.bugPatterns.some(p => p.type === 'delayed_elimination')) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Bug Fix',
                action: 'Correct elimination weeks',
                details: 'Update elimination weeks to match actual loss weeks'
            });
        }

        recommendations.push({
            priority: 'HIGH',
            category: 'Prevention',
            action: 'Implement automated verification system',
            details: 'Daily checks to ensure elimination statuses match game results'
        });

        recommendations.push({
            priority: 'MEDIUM',
            category: 'Prevention',
            action: 'Add audit trail for eliminations',
            details: 'Track all elimination decisions with detailed reasoning'
        });

        return recommendations;
    }

    // Batch fix all verified users
    async batchFixAllUsers() {
        if (this.verificationResults.verified.length === 0) {
            console.log('❌ No verified users to fix');
            return { success: false, message: 'No users to fix' };
        }

        console.log(`🔧 STARTING BATCH FIX FOR ${this.verificationResults.verified.length} USERS`);

        const statusRef = doc(window.db, 'artifacts/nerdfootball/public/data/nerdSurvivor_status/status');
        let fixedCount = 0;
        let failedCount = 0;
        const fixResults = [];

        for (const user of this.verificationResults.verified) {
            try {
                console.log(`🔧 Fixing: ${user.displayName}`);

                const fixData = {};
                const timestamp = new Date().toISOString();

                if (user.pattern === 'incorrect_elimination_week') {
                    // Restore to alive
                    fixData[`${user.uid}.eliminated`] = false;
                    fixData[`${user.uid}.eliminatedWeek`] = null;
                    fixData[`${user.uid}.eliminationReason`] = null;
                    fixData[`${user.uid}.eliminatedDate`] = null;
                    fixData[`${user.uid}.fixedDate`] = timestamp;
                    fixData[`${user.uid}.fixedBy`] = 'batch-survivor-verification';
                    fixData[`${user.uid}.fixReason`] = 'Incorrectly eliminated in week they won';

                    console.log(`   ✅ Restored to ALIVE`);
                }

                if (user.pattern === 'missing_elimination') {
                    // Eliminate the user
                    fixData[`${user.uid}.eliminated`] = true;
                    fixData[`${user.uid}.eliminatedWeek`] = user.details.shouldBeEliminatedWeek;
                    fixData[`${user.uid}.eliminationReason`] = user.details.lossReason;
                    fixData[`${user.uid}.eliminatedDate`] = timestamp;
                    fixData[`${user.uid}.fixedDate`] = timestamp;
                    fixData[`${user.uid}.fixedBy`] = 'batch-survivor-verification';
                    fixData[`${user.uid}.fixReason`] = 'Should have been eliminated but was marked as alive';

                    console.log(`   ✅ Eliminated in Week ${user.details.shouldBeEliminatedWeek}`);
                }

                // Apply the fix
                await setDoc(statusRef, fixData, { merge: true });
                fixedCount++;

                fixResults.push({
                    uid: user.uid,
                    displayName: user.displayName,
                    action: user.pattern,
                    success: true
                });

            } catch (error) {
                console.log(`   ❌ Failed: ${error.message}`);
                failedCount++;

                fixResults.push({
                    uid: user.uid,
                    displayName: user.displayName,
                    action: user.pattern,
                    success: false,
                    error: error.message
                });
            }

            // Delay to avoid overwhelming Firebase
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        const result = {
            success: true,
            summary: {
                total: this.verificationResults.verified.length,
                fixed: fixedCount,
                failed: failedCount
            },
            results: fixResults
        };

        console.log(`📊 BATCH FIX COMPLETE:`);
        console.log(`✅ Successfully fixed: ${fixedCount}`);
        console.log(`❌ Failed to fix: ${failedCount}`);

        return result;
    }

    // Helper: Get actual game result for verification
    async getActualGameResult(week, gameId, userTeam) {
        try {
            // Get schedule data
            const scheduleResponse = await fetch('/nfl_2025_schedule_raw.json');
            const scheduleData = await scheduleResponse.json();
            const weekGames = scheduleData.weeks.find(w => w.week === week)?.games || [];
            const internalGame = weekGames.find(g => g.id == gameId);

            if (!internalGame) {
                return null;
            }

            // Get ESPN data
            if (window.espnNerdApi) {
                await window.espnNerdApi.ensureReady();
                const espnData = await window.espnNerdApi.getWeekGames(week);

                if (espnData && espnData.games) {
                    const espnGame = espnData.games.find(game => {
                        if (!game.home_team || !game.away_team) return false;

                        const homeMatch = this.normalizeTeam(game.home_team) === this.normalizeTeam(internalGame.h);
                        const awayMatch = this.normalizeTeam(game.away_team) === this.normalizeTeam(internalGame.a);

                        return homeMatch && awayMatch;
                    });

                    if (espnGame) {
                        const winner = this.determineWinner(espnGame);
                        const normalizedUserTeam = this.normalizeTeam(userTeam);
                        const normalizedWinner = this.normalizeTeam(winner);
                        const userWon = winner !== 'TBD' && normalizedUserTeam === normalizedWinner;

                        return {
                            homeTeam: espnGame.home_team,
                            awayTeam: espnGame.away_team,
                            homeScore: espnGame.home_score || 0,
                            awayScore: espnGame.away_score || 0,
                            status: espnGame.status,
                            winner: winner,
                            userWon: userWon,
                            userTeam: userTeam
                        };
                    }
                }
            }

            return null;
        } catch (error) {
            console.error(`Error getting game result:`, error);
            return null;
        }
    }

    determineWinner(game) {
        if (!game.status || game.status === 'Not Started' || game.status.includes('Q') || game.status.includes('Half') || game.status.includes('Scheduled')) {
            return 'TBD';
        }

        if (game.status === 'Final' || game.status === 'FINAL' || game.status === 'F') {
            const homeScore = parseInt(game.home_score) || 0;
            const awayScore = parseInt(game.away_score) || 0;

            if (homeScore > awayScore) {
                return game.home_team;
            } else if (awayScore > homeScore) {
                return game.away_team;
            } else {
                return 'TIE';
            }
        }

        return 'TBD';
    }

    normalizeTeam(teamName) {
        if (!teamName) return null;

        const teamMappings = {
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

        return teamMappings[teamName] || teamName;
    }
}

// Global instance
window.batchSurvivorVerification = new BatchSurvivorVerification();

// Auto-initialization
console.log('✅ Batch Survivor Verification System loaded');
console.log('📋 Available commands:');
console.log('  batchSurvivorVerification.runCompleteAnalysis() - Run full analysis');
console.log('  batchSurvivorVerification.batchFixAllUsers() - Fix all verified users');
console.log('  batchSurvivorVerification.generateReport() - Generate detailed report');