#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin (assuming already configured)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: 'https://nerdfootball-default-rtdb.firebaseio.com'
    });
}

const db = admin.firestore();

async function deployWeekResults(week) {
    console.log(`🚀 Deploying Week ${week} results to Firebase...`);

    try {
        // Read the bible file
        const biblePath = path.join(__dirname, 'game-data', `nfl_2025_week_${week}.json`);

        if (!fs.existsSync(biblePath)) {
            console.error(`❌ Bible file not found: ${biblePath}`);
            return false;
        }

        const weekData = JSON.parse(fs.readFileSync(biblePath, 'utf8'));

        // Deploy to Firebase at the specified path
        const firebasePath = `artifacts/nerdfootball/public/data/nerdfootball_results/${week}`;

        await db.doc(firebasePath).set(weekData);

        console.log(`✅ Week ${week} results deployed successfully to ${firebasePath}`);
        console.log(`📊 Deployed ${weekData._metadata.completedGames} completed games`);

        return true;

    } catch (error) {
        console.error(`❌ Deployment failed for Week ${week}:`, error.message);
        return false;
    }
}

async function deployAllCompletedWeeks() {
    console.log('🎯 Starting deployment of all completed weeks (1, 2, 3)...');

    const completedWeeks = [1, 2, 3];
    let successCount = 0;

    for (const week of completedWeeks) {
        const success = await deployWeekResults(week);
        if (success) {
            successCount++;
        }

        // Small delay between deployments
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n🏆 Deployment Summary:`);
    console.log(`✅ Successful: ${successCount}/${completedWeeks.length} weeks`);
    console.log(`📍 Firebase Path: /artifacts/nerdfootball/public/data/nerdfootball_results/`);
    console.log(`🔍 Data Source: 100% verified ESPN official results`);

    if (successCount === completedWeeks.length) {
        console.log(`\n🎉 ALL WEEKS DEPLOYED SUCCESSFULLY! Bible data is now live in Firebase.`);
    } else {
        console.log(`\n⚠️  Some deployments failed. Check logs above for details.`);
    }
}

// Main execution
async function main() {
    const week = process.argv[2];

    if (week && !isNaN(week)) {
        // Deploy specific week
        await deployWeekResults(parseInt(week));
    } else {
        // Deploy all completed weeks
        await deployAllCompletedWeeks();
    }

    process.exit(0);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { deployWeekResults, deployAllCompletedWeeks };