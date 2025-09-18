#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function findActualGameData() {
  console.log('🔍 FINDING WHERE GAME SCHEDULE DATA IS ACTUALLY STORED...\n');

  try {
    // Get ALL collections
    const collections = await db.listCollections();
    console.log('📁 ALL COLLECTIONS IN DATABASE:');
    console.log('===============================');

    for (const collection of collections) {
      console.log(`📁 Collection: ${collection.id}`);

      try {
        const snapshot = await collection.limit(10).get();
        console.log(`   Documents: ${snapshot.size}`);

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`   - ${doc.id}: ${typeof data}`);

          // Check if it looks like game data
          if (data && typeof data === 'object') {
            if (data.games && Array.isArray(data.games)) {
              console.log(`     ✅ HAS GAMES ARRAY: ${data.games.length} games`);
              if (data.games[0]) {
                const game = data.games[0];
                console.log(`     Sample: ${game.awayTeam || 'Unknown'} @ ${game.homeTeam || 'Unknown'}`);
              }
            } else if (Object.keys(data).some(key => data[key] && data[key].awayTeam)) {
              console.log(`     ✅ HAS GAME OBJECTS: ${Object.keys(data).length} games`);
            } else if (doc.id.includes('week') || doc.id.includes('3')) {
              console.log(`     Keys: ${Object.keys(data).slice(0, 5).join(', ')}`);
            }
          }
        });
      } catch (error) {
        console.log(`   Error reading: ${error.message}`);
      }
      console.log('');
    }

    // Specifically search for Week 3 or "3" in all documents
    console.log('🎯 SEARCHING ALL DOCUMENTS FOR WEEK 3 REFERENCES:');
    console.log('================================================');

    for (const collection of collections) {
      try {
        const snapshot = await collection.get();

        for (const doc of snapshot.docs) {
          const data = doc.data();
          const docString = JSON.stringify(data).toLowerCase();

          if (docString.includes('week') && docString.includes('3') && docString.includes('game')) {
            console.log(`🎯 FOUND Week 3 reference in: ${collection.id}/${doc.id}`);
            console.log(`   Sample content: ${JSON.stringify(data).substring(0, 200)}...`);
          }
        }
      } catch (error) {
        console.log(`Error searching ${collection.id}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findActualGameData().then(() => {
  process.exit(0);
});