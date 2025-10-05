/**
 * 🔍 COMPREHENSIVE SURVIVOR ALIVE VS ELIMINATED STATUS VERIFICATION
 *
 * Deep dive into elimination accuracy and identify missing picks
 * CRITICAL: Verify every elimination reason and missing pick status
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'nerdfootball'
    });
}

const db = admin.firestore();

class SurvivorStatusVerifier {
    constructor() {
        this.poolId = 'nerduniverse-2025';
        this.season = '2025';
    }

    async verifySurvivorStatus() {
        console.log('🔍 COMPREHENSIVE SURVIVOR STATUS VERIFICATION');
        console.log('=============================================');
        console.log('🎯 MISSION: Verify every elimination and missing pick');

        try {
            // Get all data sources
            const allPicks = await this.getAllSurvivorPicks();
            const userNames = await this.getUserNames();
            const survivorStatus = await this.getSurvivorStatus();
            const poolMembers = await this.getPoolMembers();
            const espnData = await this.getESPNData();

            // Comprehensive analysis
            await this.analyzeStatusAccuracy(allPicks, userNames, survivorStatus, poolMembers, espnData);

        } catch (error) {
            console.error('💥 Status verification failed:', error);
        }
    }

    async getAllSurvivorPicks() {
        const picksByUser = {};
        const picksByWeek = {};

        try {
            const survivorPicksCollection = await db.collection('artifacts/nerdfootball/public/data/nerdSurvivor_picks').get();

            survivorPicksCollection.forEach(userDoc => {
                const userData = userDoc.data();
                const userId = userDoc.id;

                if (userData.picks) {
                    picksByUser[userId] = userData.picks;

                    Object.entries(userData.picks).forEach(([week, pick]) => {
                        if (!picksByWeek[week]) {
                            picksByWeek[week] = {};
                        }
                        picksByWeek[week][userId] = pick;
                    });
                }
            });

            console.log(`✅ Found picks for ${Object.keys(picksByUser).length} users across ${Object.keys(picksByWeek).length} weeks`);
        } catch (error) {
            console.log(`❌ Picks retrieval failed: ${error.message}`);
        }

        return { byUser: picksByUser, byWeek: picksByWeek };
    }

    async getUserNames() {
        const userNames = {};
        try {
            const usersCollection = await db.collection('artifacts/nerdfootball/public/data/nerdfootball_users').get();
            usersCollection.forEach(userDoc => {
                const userData = userDoc.data();
                userNames[userDoc.id] = userData.displayName || userData.name || `User-${userDoc.id}`;
            });
        } catch (error) {
            console.log(`❌ User names failed: ${error.message}`);
        }
        return userNames;
    }

    async getSurvivorStatus() {
        try {
            const statusDoc = await db.doc('artifacts/nerdfootball/public/data/nerdSurvivor_status/status').get();
            if (statusDoc.exists) {
                return statusDoc.data();
            }
        } catch (error) {
            console.log(`❌ Survivor status failed: ${error.message}`);
        }
        return {};
    }

    async getPoolMembers() {
        try {
            const poolMembersPath = `artifacts/nerdfootball/pools/${this.poolId}/metadata/members`;
            const poolDoc = await db.doc(poolMembersPath).get();
            if (poolDoc.exists) {
                return poolDoc.data();
            }
        } catch (error) {
            console.log(`❌ Pool members failed: ${error.message}`);
        }
        return {};
    }

    async getESPNData() {
        try {
            const cacheDoc = await db.doc('cache/espn_current_data').get();
            if (cacheDoc.exists) {
                return cacheDoc.data();
            }
        } catch (error) {
            console.log(`❌ ESPN data failed: ${error.message}`);
        }
        return {};
    }

    async analyzeStatusAccuracy(allPicks, userNames, survivorStatus, poolMembers, espnData) {
        console.log('\n📊 COMPREHENSIVE STATUS ANALYSIS');
        console.log('=================================');

        const analysis = {
            totalPoolMembers: Object.keys(poolMembers).length,
            usersWithSurvivorPicks: Object.keys(allPicks.byUser).length,
            currentlyEliminated: 0,
            currentlyAlive: 0,
            noPicksEver: [],
            week1PicksOnly: [],
            week2PicksOnly: [],
            activeThroughWeek2: [],
            eliminationReasons: {},
            statusIssues: []
        };

        console.log(`Pool members: ${analysis.totalPoolMembers}`);
        console.log(`Users with survivor picks: ${analysis.usersWithSurvivorPicks}`);

        // Analyze each pool member
        console.log('\n🔍 INDIVIDUAL STATUS ANALYSIS:');
        console.log('==============================');

        Object.keys(poolMembers).forEach(userId => {
            const userName = userNames[userId] || `User-${userId}`;
            const userPicks = allPicks.byUser[userId] || {};
            const userStatus = survivorStatus[userId] || {};

            const hasWeek1Pick = !!userPicks['1'];
            const hasWeek2Pick = !!userPicks['2'];
            const isEliminated = userStatus.eliminated === true;
            const eliminatedWeek = userStatus.eliminatedWeek;
            const eliminationReason = userStatus.eliminationReason;

            // Categorize user
            let category = 'UNKNOWN';
            if (!hasWeek1Pick && !hasWeek2Pick) {
                category = 'NO_PICKS_EVER';
                analysis.noPicksEver.push(userId);
            } else if (hasWeek1Pick && !hasWeek2Pick) {
                category = 'WEEK1_ONLY';
                analysis.week1PicksOnly.push(userId);
            } else if (!hasWeek1Pick && hasWeek2Pick) {
                category = 'WEEK2_ONLY';
                analysis.week2PicksOnly.push(userId);
            } else if (hasWeek1Pick && hasWeek2Pick) {
                category = 'ACTIVE_THROUGH_WEEK2';
                analysis.activeThroughWeek2.push(userId);
            }

            // Track elimination status
            if (isEliminated) {
                analysis.currentlyEliminated++;
                const reason = eliminationReason || 'Unknown reason';
                if (!analysis.eliminationReasons[reason]) {
                    analysis.eliminationReasons[reason] = 0;
                }
                analysis.eliminationReasons[reason]++;
            } else {
                analysis.currentlyAlive++;
            }

            // Identify potential status issues
            let statusIssue = null;

            if (!hasWeek1Pick && !isEliminated) {
                statusIssue = 'No Week 1 pick but not eliminated';
            } else if (hasWeek1Pick && !hasWeek2Pick && !isEliminated) {
                statusIssue = 'Has Week 1 pick, no Week 2 pick, but not eliminated';
            } else if (isEliminated && hasWeek2Pick && eliminatedWeek === 1) {
                statusIssue = 'Eliminated in Week 1 but made Week 2 pick';
            }

            if (statusIssue) {
                analysis.statusIssues.push({
                    userId,
                    userName,
                    issue: statusIssue,
                    hasWeek1Pick,
                    hasWeek2Pick,
                    isEliminated,
                    eliminatedWeek,
                    eliminationReason
                });
            }

            console.log(`${userName}: ${category}`);
            console.log(`   Picks: Week1=${hasWeek1Pick ? '✅' : '❌'}, Week2=${hasWeek2Pick ? '✅' : '❌'}`);
            console.log(`   Status: ${isEliminated ? `ELIMINATED (Week ${eliminatedWeek}, ${eliminationReason})` : 'ALIVE'}`);
            if (statusIssue) {
                console.log(`   ⚠️ ISSUE: ${statusIssue}`);
            }
            console.log('');
        });

        // Summary analysis
        console.log('\n📋 COMPREHENSIVE SUMMARY:');
        console.log('==========================');
        console.log(`Total pool members: ${analysis.totalPoolMembers}`);
        console.log(`Currently eliminated: ${analysis.currentlyEliminated}`);
        console.log(`Currently alive: ${analysis.currentlyAlive}`);
        console.log('');
        console.log('Pick patterns:');
        console.log(`   No picks ever: ${analysis.noPicksEver.length}`);
        console.log(`   Week 1 picks only: ${analysis.week1PicksOnly.length}`);
        console.log(`   Week 2 picks only: ${analysis.week2PicksOnly.length}`);
        console.log(`   Active through Week 2: ${analysis.activeThroughWeek2.length}`);

        console.log('\nElimination reasons:');
        Object.entries(analysis.eliminationReasons).forEach(([reason, count]) => {
            console.log(`   "${reason}": ${count} users`);
        });

        if (analysis.statusIssues.length > 0) {
            console.log('\n❌ STATUS ISSUES DETECTED:');
            console.log('===========================');
            analysis.statusIssues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue.userName}`);
                console.log(`   Issue: ${issue.issue}`);
                console.log(`   Details: W1=${issue.hasWeek1Pick ? 'YES' : 'NO'}, W2=${issue.hasWeek2Pick ? 'YES' : 'NO'}, Eliminated=${issue.isEliminated ? `YES (Week ${issue.eliminatedWeek})` : 'NO'}`);
                if (issue.eliminationReason) {
                    console.log(`   Reason: ${issue.eliminationReason}`);
                }
                console.log('');
            });
        } else {
            console.log('\n✅ NO STATUS ISSUES DETECTED!');
        }

        // Week-by-week pick analysis
        console.log('\n📊 WEEK-BY-WEEK PICK ANALYSIS:');
        console.log('===============================');

        const week1Count = Object.keys(allPicks.byWeek['1'] || {}).length;
        const week2Count = Object.keys(allPicks.byWeek['2'] || {}).length;
        const dropoffCount = week1Count - week2Count;
        const dropoffPercent = week1Count > 0 ? ((dropoffCount / week1Count) * 100).toFixed(1) : 0;

        console.log(`Week 1 picks: ${week1Count}`);
        console.log(`Week 2 picks: ${week2Count}`);
        console.log(`Pick dropoff: ${dropoffCount} users (${dropoffPercent}%)`);

        if (dropoffCount > 0) {
            console.log('\n🔍 USERS WHO STOPPED PICKING AFTER WEEK 1:');
            analysis.week1PicksOnly.forEach(userId => {
                const userName = userNames[userId] || `User-${userId}`;
                const userStatus = survivorStatus[userId] || {};
                const isEliminated = userStatus.eliminated === true;
                const eliminationReason = userStatus.eliminationReason;

                console.log(`   • ${userName}: ${isEliminated ? `ELIMINATED (${eliminationReason})` : 'NOT ELIMINATED - SHOULD BE CHECKED'}`);
            });
        }

        return analysis;
    }
}

async function runSurvivorStatusVerification() {
    const verifier = new SurvivorStatusVerifier();
    await verifier.verifySurvivorStatus();
}

runSurvivorStatusVerification().catch(console.error);