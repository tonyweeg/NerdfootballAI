const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://nerdfootball-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function clearSurvivorCache() {
    try {
        console.log('🗑️ Clearing survivor cache...');

        const cachePath = 'artifacts/nerdfootball/pools/nerduniverse-2025/cache/latest-survivor-display';
        const cacheRef = db.doc(cachePath);

        await cacheRef.delete();
        console.log('✅ Survivor cache cleared successfully!');
        console.log('🔄 Next visitor will generate fresh cache without user auth info');

    } catch (error) {
        console.error('❌ Error clearing cache:', error);
    } finally {
        process.exit(0);
    }
}

clearSurvivorCache();