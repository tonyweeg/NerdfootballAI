/**
 * 🏆 SURVIVOR PARTICIPATION ANALYSIS & INACTIVE USER IDENTIFICATION
 *
 * Identify inactive survivor participants and recommend cleanup actions
 * CRITICAL: Maintain survivor pool integrity and fairness
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

class SurvivorParticipationAnalyzer {
    constructor() {
        this.poolId = 'nerduniverse-2025';
        this.season = '2025';
        this.currentWeek = 2; // We're in Week 2 for analysis
    }

    async analyzeSurvivorParticipation() {
        console.log('🏆 SURVIVOR PARTICIPATION ANALYSIS');
        console.log('==================================');
        console.log('🎯 MISSION: Identify inactive users and recommend cleanup');

        try {
            // Get all necessary data
            const allPicks = await this.getAllSurvivorPicks();
            const userNames = await this.getUserNames();
            const poolMembers = await this.getPoolMembers();
            const survivorStatus = await this.getSurvivorStatus();

            // Analyze participation patterns
            await this.analyzeParticipationPatterns(allPicks, userNames, poolMembers, survivorStatus);

        } catch (error) {
            console.error('💥 Participation analysis failed:', error);
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

    async analyzeParticipationPatterns(allPicks, userNames, poolMembers, survivorStatus) {
        console.log('\n📊 PARTICIPATION PATTERN ANALYSIS');
        console.log('==================================');

        const participationCategories = {
            fullyActive: [], // Made picks in both Week 1 and Week 2
            partiallyActive: [], // Made Week 1 pick but not Week 2
            neverActive: [], // Never made any picks
            irregularPattern: [] // Unusual patterns (like Week 2 but no Week 1)
        };

        const removalCandidates = [];
        const warningCandidates = [];

        // Analyze each pool member
        Object.keys(poolMembers).forEach(userId => {
            const userName = userNames[userId] || `User-${userId}`;
            const userPicks = allPicks.byUser[userId] || {};
            const userStatus = survivorStatus[userId] || {};

            const hasWeek1Pick = !!userPicks['1'];
            const hasWeek2Pick = !!userPicks['2'];
            const totalWeeksPicked = Object.keys(userPicks).length;
            const isEliminated = userStatus.eliminated === true;

            // Categorize participation
            if (hasWeek1Pick && hasWeek2Pick) {
                participationCategories.fullyActive.push({
                    userId,
                    userName,
                    totalWeeks: totalWeeksPicked,
                    status: 'Fully Active'
                });
            } else if (hasWeek1Pick && !hasWeek2Pick) {
                participationCategories.partiallyActive.push({
                    userId,
                    userName,
                    totalWeeks: totalWeeksPicked,
                    status: 'Dropped After Week 1'
                });
                // These are warning candidates - may have given up
                warningCandidates.push({
                    userId,
                    userName,
                    reason: 'Made Week 1 pick but stopped participating in Week 2',
                    recommendation: 'Contact to confirm continued participation'
                });
            } else if (!hasWeek1Pick && !hasWeek2Pick) {
                participationCategories.neverActive.push({
                    userId,
                    userName,
                    totalWeeks: totalWeeksPicked,
                    status: 'Never Participated'
                });
                // These are removal candidates - never participated
                removalCandidates.push({
                    userId,
                    userName,
                    reason: 'Never made any survivor picks',
                    recommendation: 'Remove from survivor pool'
                });
            } else if (!hasWeek1Pick && hasWeek2Pick) {
                participationCategories.irregularPattern.push({
                    userId,
                    userName,
                    totalWeeks: totalWeeksPicked,
                    status: 'Irregular (Week 2 but no Week 1)'
                });
            }
        });

        // Display categorized results
        console.log('\n📊 PARTICIPATION CATEGORIES:');
        console.log('=============================');

        console.log(`\n✅ FULLY ACTIVE (${participationCategories.fullyActive.length} users):`);
        participationCategories.fullyActive.forEach(user => {
            console.log(`   • ${user.userName} (${user.totalWeeks} weeks)`);
        });

        console.log(`\n⚠️ PARTIALLY ACTIVE (${participationCategories.partiallyActive.length} users):`);
        participationCategories.partiallyActive.forEach(user => {
            console.log(`   • ${user.userName} (${user.totalWeeks} weeks) - DROPPED AFTER WEEK 1`);
        });

        console.log(`\n❌ NEVER ACTIVE (${participationCategories.neverActive.length} users):`);
        participationCategories.neverActive.forEach(user => {
            console.log(`   • ${user.userName} (${user.totalWeeks} weeks) - ZERO PARTICIPATION`);
        });

        if (participationCategories.irregularPattern.length > 0) {
            console.log(`\n🔍 IRREGULAR PATTERNS (${participationCategories.irregularPattern.length} users):`);
            participationCategories.irregularPattern.forEach(user => {
                console.log(`   • ${user.userName} (${user.totalWeeks} weeks) - ${user.status}`);
            });
        }

        // Detailed recommendations
        console.log('\n🎯 DETAILED RECOMMENDATIONS:');
        console.log('=============================');

        if (removalCandidates.length > 0) {
            console.log(`\n🗑️ IMMEDIATE REMOVAL CANDIDATES (${removalCandidates.length} users):`);
            console.log('These users never participated and should be removed:');
            removalCandidates.forEach((candidate, index) => {
                console.log(`   ${index + 1}. ${candidate.userName}`);
                console.log(`      Reason: ${candidate.reason}`);
                console.log(`      Action: ${candidate.recommendation}`);
                console.log('');
            });
        }

        if (warningCandidates.length > 0) {
            console.log(`\n⚠️ WARNING/CONTACT CANDIDATES (${warningCandidates.length} users):`);
            console.log('These users started but stopped participating:');
            warningCandidates.forEach((candidate, index) => {
                console.log(`   ${index + 1}. ${candidate.userName}`);
                console.log(`      Reason: ${candidate.reason}`);
                console.log(`      Action: ${candidate.recommendation}`);
                console.log('');
            });
        }

        // Pool health metrics
        console.log('\n📈 POOL HEALTH METRICS:');
        console.log('========================');

        const totalMembers = Object.keys(poolMembers).length;
        const activeRate = (participationCategories.fullyActive.length / totalMembers * 100).toFixed(1);
        const dropoutRate = (participationCategories.partiallyActive.length / totalMembers * 100).toFixed(1);
        const neverActiveRate = (participationCategories.neverActive.length / totalMembers * 100).toFixed(1);

        console.log(`Total pool members: ${totalMembers}`);
        console.log(`Fully active: ${participationCategories.fullyActive.length} (${activeRate}%)`);
        console.log(`Partially active: ${participationCategories.partiallyActive.length} (${dropoutRate}%)`);
        console.log(`Never active: ${participationCategories.neverActive.length} (${neverActiveRate}%)`);
        console.log('');

        // Pool integrity assessment
        if (parseFloat(neverActiveRate) > 10) {
            console.log('🚨 HIGH CONCERN: >10% of pool never participated');
        } else if (parseFloat(neverActiveRate) > 5) {
            console.log('⚠️ MODERATE CONCERN: >5% of pool never participated');
        } else {
            console.log('✅ GOOD: Low non-participation rate');
        }

        if (parseFloat(dropoutRate) > 15) {
            console.log('🚨 HIGH CONCERN: >15% dropout rate after Week 1');
        } else if (parseFloat(dropoutRate) > 10) {
            console.log('⚠️ MODERATE CONCERN: >10% dropout rate after Week 1');
        } else {
            console.log('✅ GOOD: Low dropout rate');
        }

        // Email collection for removal candidates
        if (removalCandidates.length > 0) {
            console.log('\n📧 EMAIL VERIFICATION FOR REMOVAL:');
            console.log('==================================');
            console.log('Before removing users, verify their email addresses:');

            for (const candidate of removalCandidates) {
                try {
                    const userProfileDoc = await db.doc(`artifacts/nerdfootball/public/data/nerdfootball_users/${candidate.userId}`).get();
                    if (userProfileDoc.exists) {
                        const userData = userProfileDoc.data();
                        console.log(`   • ${candidate.userName}: ${userData.email || 'No email found'}`);
                    } else {
                        console.log(`   • ${candidate.userName}: No profile found`);
                    }
                } catch (error) {
                    console.log(`   • ${candidate.userName}: Error retrieving email`);
                }
            }
        }

        return {
            participationCategories,
            removalCandidates,
            warningCandidates,
            metrics: {
                totalMembers,
                activeRate: parseFloat(activeRate),
                dropoutRate: parseFloat(dropoutRate),
                neverActiveRate: parseFloat(neverActiveRate)
            }
        };
    }
}

async function runSurvivorParticipationAnalysis() {
    const analyzer = new SurvivorParticipationAnalyzer();
    await analyzer.analyzeSurvivorParticipation();
}

runSurvivorParticipationAnalysis().catch(console.error);