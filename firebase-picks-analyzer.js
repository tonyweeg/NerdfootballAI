#!/usr/bin/env node

/**
 * Firebase Picks Analyzer - Real-time Picks Data Corruption Detection
 *
 * Connects to Firebase and analyzes actual picks data for weeks 1-3
 * Identifies specific corruption patterns and generates cleanup plan
 */

const admin = require('firebase-admin');
const fs = require('fs');

class PicksDataAnalyzer {
    constructor() {
        this.poolMembers = null;
        this.corruptionReport = {
            week1: { users: {}, issues: [], summary: {} },
            week2: { users: {}, issues: [], summary: {} },
            week3: { users: {}, issues: [], summary: {} }
        };

        this.expectedGameIds = {
            1: Array.from({length: 16}, (_, i) => (100 + i + 1).toString()),
            2: Array.from({length: 16}, (_, i) => (200 + i + 1).toString()),
            3: Array.from({length: 16}, (_, i) => (300 + i + 1).toString())
        };

        this.validTeams = new Set([
            'Arizona Cardinals', 'Atlanta Falcons', 'Baltimore Ravens', 'Buffalo Bills',
            'Carolina Panthers', 'Chicago Bears', 'Cincinnati Bengals', 'Cleveland Browns',
            'Dallas Cowboys', 'Denver Broncos', 'Detroit Lions', 'Green Bay Packers',
            'Houston Texans', 'Indianapolis Colts', 'Jacksonville Jaguars', 'Kansas City Chiefs',
            'Las Vegas Raiders', 'Los Angeles Chargers', 'Los Angeles Rams', 'Miami Dolphins',
            'Minnesota Vikings', 'New England Patriots', 'New Orleans Saints', 'New York Giants',
            'New York Jets', 'Philadelphia Eagles', 'Pittsburgh Steelers', 'San Francisco 49ers',
            'Seattle Seahawks', 'Tampa Bay Buccaneers', 'Tennessee Titans', 'Washington Commanders'
        ]);
    }

    async initialize() {
        try {
            // Initialize Firebase Admin (assuming credentials are set up)
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.applicationDefault(),
                    databaseURL: 'https://nerdfootball-default-rtdb.firebaseio.com'
                });
            }

            this.db = admin.firestore();
            console.log('🔥 Firebase connection established');

            // Load pool members for validation
            await this.loadPoolMembers();

            return true;
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error.message);
            return false;
        }
    }

    async loadPoolMembers() {
        try {
            const membersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
            const membersSnap = await this.db.doc(membersPath).get();

            if (membersSnap.exists()) {
                this.poolMembers = membersSnap.data();
                console.log(`✅ Loaded ${Object.keys(this.poolMembers).length} pool members`);
            } else {
                console.warn('⚠️  Pool members not found');
            }
        } catch (error) {
            console.error('❌ Failed to load pool members:', error.message);
        }
    }

    async analyzeWeekPicks(weekNumber) {
        console.log(`\n🔍 Analyzing Week ${weekNumber} picks...`);

        const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions`;

        try {
            const picksCollection = await this.db.collection(picksPath).get();
            console.log(`📊 Found ${picksCollection.size} users with picks for Week ${weekNumber}`);

            const weekReport = this.corruptionReport[`week${weekNumber}`];
            const expectedGames = this.expectedGameIds[weekNumber];

            picksCollection.forEach(userDoc => {
                const userId = userDoc.id;
                const picks = userDoc.data();

                console.log(`   👤 Analyzing ${userId}...`);

                const userIssues = this.analyzeUserPicks(userId, picks, expectedGames, weekNumber);
                weekReport.users[userId] = {
                    picks: picks,
                    issues: userIssues,
                    isPoolMember: this.poolMembers ? !!this.poolMembers[userId] : 'unknown'
                };

                weekReport.issues = weekReport.issues.concat(userIssues);
            });

            // Generate summary
            weekReport.summary = this.generateWeekSummary(weekReport);
            console.log(`📋 Week ${weekNumber} analysis complete: ${weekReport.issues.length} issues found`);

        } catch (error) {
            console.error(`❌ Failed to analyze Week ${weekNumber}:`, error.message);
        }
    }

    analyzeUserPicks(userId, picks, expectedGames, weekNumber) {
        const issues = [];

        // Check for basic structure
        if (!picks || typeof picks !== 'object') {
            issues.push({
                type: 'malformed_structure',
                severity: 'critical',
                message: 'Picks data is not a valid object'
            });
            return issues;
        }

        // Check for expected game IDs
        const userGameIds = Object.keys(picks).filter(key => !['userName', 'submittedAt', 'weekNumber', 'timestamp'].includes(key));
        const missingGames = expectedGames.filter(gameId => !userGameIds.includes(gameId));
        const extraGames = userGameIds.filter(gameId => !expectedGames.includes(gameId));

        if (missingGames.length > 0) {
            issues.push({
                type: 'missing_games',
                severity: 'high',
                message: `Missing picks for games: ${missingGames.join(', ')}`,
                data: missingGames
            });
        }

        if (extraGames.length > 0) {
            issues.push({
                type: 'extra_games',
                severity: 'medium',
                message: `Unexpected game IDs: ${extraGames.join(', ')}`,
                data: extraGames
            });
        }

        // Check confidence values
        const confidenceValues = [];
        const gameResults = [];

        userGameIds.forEach(gameId => {
            const pick = picks[gameId];

            if (!pick || typeof pick !== 'object') {
                issues.push({
                    type: 'malformed_pick',
                    severity: 'high',
                    message: `Game ${gameId}: Pick is not a valid object`,
                    gameId: gameId
                });
                return;
            }

            // Check for "[object Object]" corruption
            if (pick.winner === '[object Object]' || typeof pick.winner === 'object') {
                issues.push({
                    type: 'object_corruption',
                    severity: 'critical',
                    message: `Game ${gameId}: Winner corrupted with [object Object]`,
                    gameId: gameId
                });
            }

            // Check confidence values
            const confidence = pick.confidence;
            if (confidence === undefined || confidence === null) {
                issues.push({
                    type: 'missing_confidence',
                    severity: 'high',
                    message: `Game ${gameId}: Missing confidence value`,
                    gameId: gameId
                });
            } else if (typeof confidence !== 'number' || confidence < 1 || confidence > 16 || confidence % 1 !== 0) {
                issues.push({
                    type: 'invalid_confidence',
                    severity: 'high',
                    message: `Game ${gameId}: Invalid confidence value: ${confidence}`,
                    gameId: gameId,
                    data: confidence
                });
            } else {
                confidenceValues.push(confidence);
            }

            // Check team names
            if (pick.winner && typeof pick.winner === 'string' && pick.winner !== '[object Object]') {
                if (!this.validTeams.has(pick.winner)) {
                    issues.push({
                        type: 'invalid_team',
                        severity: 'medium',
                        message: `Game ${gameId}: Invalid team name: ${pick.winner}`,
                        gameId: gameId,
                        data: pick.winner
                    });
                }
            }
        });

        // Check for duplicate confidence values
        const uniqueConfidence = [...new Set(confidenceValues)];
        if (confidenceValues.length !== uniqueConfidence.length) {
            const duplicates = confidenceValues.filter((value, index) => confidenceValues.indexOf(value) !== index);
            issues.push({
                type: 'duplicate_confidence',
                severity: 'high',
                message: `Duplicate confidence values: ${[...new Set(duplicates)].join(', ')}`,
                data: duplicates
            });
        }

        // Check if confidence values form valid 1-16 set
        const expectedConfidenceCount = Math.min(16, expectedGames.length);
        if (uniqueConfidence.length === expectedConfidenceCount) {
            const sortedConfidence = uniqueConfidence.sort((a, b) => a - b);
            const expectedSequence = Array.from({length: expectedConfidenceCount}, (_, i) => i + 1);
            if (JSON.stringify(sortedConfidence) !== JSON.stringify(expectedSequence)) {
                issues.push({
                    type: 'invalid_confidence_set',
                    severity: 'high',
                    message: `Confidence values don't form valid 1-${expectedConfidenceCount} sequence`,
                    data: { actual: sortedConfidence, expected: expectedSequence }
                });
            }
        }

        return issues;
    }

    generateWeekSummary(weekReport) {
        const summary = {
            totalUsers: Object.keys(weekReport.users).length,
            totalIssues: weekReport.issues.length,
            issuesByType: {},
            issuesBySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
            corruptedUsers: 0,
            cleanUsers: 0
        };

        // Count issues by type and severity
        weekReport.issues.forEach(issue => {
            summary.issuesByType[issue.type] = (summary.issuesByType[issue.type] || 0) + 1;
            summary.issuesBySeverity[issue.severity] = (summary.issuesBySeverity[issue.severity] || 0) + 1;
        });

        // Count corrupted vs clean users
        Object.values(weekReport.users).forEach(user => {
            if (user.issues.length > 0) {
                summary.corruptedUsers++;
            } else {
                summary.cleanUsers++;
            }
        });

        return summary;
    }

    async generateReport() {
        console.log('\n📊 GENERATING COMPREHENSIVE CORRUPTION REPORT');
        console.log('===============================================');

        for (let week = 1; week <= 3; week++) {
            await this.analyzeWeekPicks(week);
        }

        // Save detailed report
        const reportPath = '/Users/tonyweeg/nerdfootball-project/picks-corruption-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(this.corruptionReport, null, 2));
        console.log(`\n📄 Detailed report saved: ${reportPath}`);

        // Generate summary
        this.printSummaryReport();

        return this.corruptionReport;
    }

    printSummaryReport() {
        console.log('\n🎯 CORRUPTION SUMMARY REPORT');
        console.log('============================');

        for (let week = 1; week <= 3; week++) {
            const weekReport = this.corruptionReport[`week${week}`];
            const summary = weekReport.summary;

            console.log(`\n📅 WEEK ${week}:`);
            console.log(`   Users: ${summary.totalUsers} (${summary.cleanUsers} clean, ${summary.corruptedUsers} corrupted)`);
            console.log(`   Issues: ${summary.totalIssues} total`);
            console.log(`   Critical: ${summary.issuesBySeverity.critical}, High: ${summary.issuesBySeverity.high}, Medium: ${summary.issuesBySeverity.medium}`);

            if (Object.keys(summary.issuesByType).length > 0) {
                console.log('   Issue Types:');
                Object.entries(summary.issuesByType).forEach(([type, count]) => {
                    console.log(`     ${type}: ${count}`);
                });
            }
        }

        console.log('\n🛠️  RECOMMENDED ACTIONS:');
        console.log('1. Review detailed report for specific corruption patterns');
        console.log('2. Create targeted data cleaning scripts for each issue type');
        console.log('3. Backup current data before implementing fixes');
        console.log('4. Validate cleaned data against bible games and pool members');
        console.log('5. Deploy corrected picks data to production');
    }
}

// Main execution
async function main() {
    const analyzer = new PicksDataAnalyzer();

    const initialized = await analyzer.initialize();
    if (!initialized) {
        console.error('❌ Failed to initialize analyzer');
        process.exit(1);
    }

    await analyzer.generateReport();

    console.log('\n✅ Picks data analysis complete!');
    process.exit(0);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = PicksDataAnalyzer;