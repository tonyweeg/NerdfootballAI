const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

admin.initializeApp({
    projectId: 'nerdfootball'
});

const db = admin.firestore();

async function backupFirestore() {
    console.log('🔄 Starting Firestore backup...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `./backups/firestore-${timestamp}`;
    
    // Create backup directory
    if (!fs.existsSync('./backups')) {
        fs.mkdirSync('./backups');
    }
    fs.mkdirSync(backupDir);
    
    // Critical collections to backup
    const collections = [
        'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members',
        'artifacts/nerdfootball/public/data/nerdfootball_games',
        'artifacts/nerdfootball/public/data/nerdfootball_picks', 
        'artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users',
        'cache'
    ];
    
    for (const collectionPath of collections) {
        try {
            console.log(`📋 Backing up: ${collectionPath}`);
            
            if (collectionPath.includes('/members')) {
                // Single document backup (pool members)
                const doc = await db.doc(collectionPath).get();
                if (doc.exists) {
                    const data = { id: doc.id, data: doc.data() };
                    fs.writeFileSync(
                        path.join(backupDir, 'pool-members.json'),
                        JSON.stringify(data, null, 2)
                    );
                    console.log(`✅ Backed up pool members`);
                }
            } else {
                // Collection backup
                await backupCollection(collectionPath, backupDir);
            }
        } catch (error) {
            console.error(`❌ Error backing up ${collectionPath}:`, error.message);
        }
    }
    
    console.log(`🎉 Firestore backup completed: ${backupDir}`);
    return backupDir;
}

async function backupCollection(collectionPath, backupDir) {
    const collectionRef = db.collection(collectionPath);
    const snapshot = await collectionRef.get();
    
    const data = [];
    snapshot.forEach(doc => {
        data.push({
            id: doc.id,
            data: doc.data()
        });
    });
    
    const fileName = collectionPath.replace(/\//g, '_') + '.json';
    fs.writeFileSync(
        path.join(backupDir, fileName),
        JSON.stringify(data, null, 2)
    );
    
    console.log(`✅ Backed up ${data.length} documents from ${collectionPath}`);
}

// Run backup if called directly
if (require.main === module) {
    backupFirestore().catch(console.error);
}

module.exports = { backupFirestore };