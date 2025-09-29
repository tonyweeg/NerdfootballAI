const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');

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

async function fixWeek4Games() {
    try {
        console.log('Getting Week 4 games data from Firestore...');
        const week4DocRef = doc(db, 'artifacts/nerdfootball/public/data/nerdfootball_games', '4');
        const week4Snap = await getDoc(week4DocRef);

        if (!week4Snap.exists()) {
            console.log('Week 4 document does not exist in Firestore');
            return;
        }

        const currentData = week4Snap.data();
        console.log('Current Week 4 games:');
        console.log('Game IDs found:', Object.keys(currentData).filter(key => key !== '_metadata'));

        // Filter to only include game IDs 401-416
        const cleanedData = {};
        const validGameIds = [];
        const invalidGameIds = [];

        for (const [gameId, gameData] of Object.entries(currentData)) {
            if (gameId === '_metadata') {
                cleanedData[gameId] = gameData;
            } else {
                const numericId = parseInt(gameId);
                if (numericId >= 401 && numericId <= 416) {
                    cleanedData[gameId] = gameData;
                    validGameIds.push(gameId);
                } else {
                    invalidGameIds.push(gameId);
                }
            }
        }

        console.log(`Valid game IDs (401-416): ${validGameIds.length}`);
        console.log('Valid IDs:', validGameIds.sort());
        console.log(`Invalid game IDs to remove: ${invalidGameIds.length}`);
        console.log('Invalid IDs:', invalidGameIds.sort());

        if (invalidGameIds.length > 0) {
            console.log('Updating Firestore with cleaned data...');
            await setDoc(week4DocRef, cleanedData);
            console.log('Week 4 games cleaned successfully!');
            console.log(`Removed ${invalidGameIds.length} invalid games`);
            console.log(`Kept ${validGameIds.length} valid games (401-416)`);
        } else {
            console.log('No cleanup needed - Week 4 data already contains only games 401-416');
        }

    } catch (error) {
        console.error('Error fixing Week 4 games:', error);
    }
}

fixWeek4Games();