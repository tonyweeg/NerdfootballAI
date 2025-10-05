const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function clearSurvivorCache() {
    console.log('🗑️  CLEARING SURVIVOR CACHE TO FORCE REFRESH\n');

    const cacheRef = db.doc('cache/survivor_pool_2025');

    console.log('Deleting survivor cache document...');
    await cacheRef.delete();

    console.log('✅ Survivor cache cleared!');
    console.log('📊 Next call to getSurvivorPoolData will regenerate with Week 5 results');

    process.exit(0);
}

clearSurvivorCache().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
