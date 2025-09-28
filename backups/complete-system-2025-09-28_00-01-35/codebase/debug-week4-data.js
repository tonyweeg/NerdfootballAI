#!/usr/bin/env node

// Quick diagnostic script to examine Week 4 data corruption
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDAF1MbAhL2uPIVUGMDlXvCqtknUUCX5Gw",
    authDomain: "nerdfootball.firebaseapp.com",
    databaseURL: "https://nerdfootball-default-rtdb.firebaseio.com",
    projectId: "nerdfootball",
    storageBucket: "nerdfootball.appspot.com",
    messagingSenderId: "969304790725",
    appId: "1:969304790725:web:892df38db0b0e62bde02ac"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkWeek4Data() {
    try {
        console.log('🔍 Checking Week 4 game data corruption...');

        const docRef = doc(db, 'artifacts/nerdfootball/public/data/nerdfootball_games/4');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('📊 Week 4 data structure:', Object.keys(data));

            // Check first few games for corruption
            const gameIds = ['401', '402', '403'];

            gameIds.forEach(gameId => {
                if (data[gameId]) {
                    console.log(`\n🏈 Game ${gameId}:`);
                    console.log('  Full data:', JSON.stringify(data[gameId], null, 2));
                    console.log('  winner type:', typeof data[gameId].winner);
                    console.log('  winner value:', data[gameId].winner);

                    if (typeof data[gameId].winner === 'object') {
                        console.log('  🚨 CORRUPTION: Winner is object:', data[gameId].winner);
                    }
                }
            });
        } else {
            console.log('❌ Week 4 document does not exist');
        }
    } catch (error) {
        console.error('❌ Error checking data:', error);
    }
}

checkWeek4Data();