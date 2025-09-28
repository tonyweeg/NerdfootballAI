// 🔍 Comprehensive search for picks data in Firestore
// This script searches all possible locations for picks data

const admin = require('firebase-admin');

async function findAllPicksData() {
    console.log('🔍 COMPREHENSIVE PICKS DATA SEARCH');
    console.log('Searching all possible Firestore locations...\n');
    
    // Initialize Firebase Admin
    if (!admin.apps.length) {
        const serviceAccount = require('./serviceAccountKey.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: 'nerdfootball'
        });
    }
    const db = admin.firestore();
    
    const poolId = 'nerduniverse-2025';
    let totalPicksFound = 0;
    let allPicksUsers = new Set();
    
    try {
        // 1. List all root collections to understand the structure
        console.log('📍 1. LISTING ALL ROOT COLLECTIONS...');
        const collections = await db.listCollections();
        console.log('Root collections found:');
        collections.forEach((collection, index) => {
            console.log(`  ${index + 1}. ${collection.id}`);
        });
        
        // 2. Search specific picks-related paths
        console.log('\n📍 2. SEARCHING SPECIFIC PICKS PATHS...');
        const picksPaths = [
            // Pool-specific paths
            `artifacts/nerdfootball/pools/${poolId}/data/nerdfootball_picks`,
            `artifacts/nerdfootball/pools/${poolId}/data/picks`,
            `artifacts/nerdfootball/pools/${poolId}/picks`,
            `artifacts/nerdfootball/pools/${poolId}/users`,
            
            // Public data paths
            `artifacts/nerdfootball/public/data/nerdfootball_picks`,
            `artifacts/nerdfootball/public/data/picks`,
            `artifacts/nerdfootball/public/picks`,
            
            // General paths
            `artifacts/nerdfootball/picks`,
            `artifacts/nerdfootball/data/picks`,
            `picks`,
            `nerdfootball_picks`,
            
            // Week-specific paths (try current week)
            `artifacts/nerdfootball/pools/${poolId}/data/week1`,
            `artifacts/nerdfootball/pools/${poolId}/data/week2`,
            `artifacts/nerdfootball/pools/${poolId}/data/week3`,
            `artifacts/nerdfootball/pools/${poolId}/data/week4`,
            `artifacts/nerdfootball/pools/${poolId}/data/week5`,
            
            // Alternative structures
            `pools/${poolId}/picks`,
            `pools/picks`,
            `data/picks`
        ];
        
        for (const path of picksPaths) {
            console.log(`\n   🔍 Checking: ${path}`);
            
            try {
                // Try as collection first
                const collection = db.collection(path);
                const snapshot = await collection.get();
                
                if (!snapshot.empty) {
                    console.log(`   ✅ COLLECTION FOUND: ${snapshot.size} documents`);
                    
                    snapshot.docs.forEach(doc => {
                        console.log(`     📄 Doc ID: ${doc.id}`);
                        allPicksUsers.add(doc.id);
                        
                        // Check document content
                        const data = doc.data();
                        if (data && typeof data === 'object') {
                            const keys = Object.keys(data);
                            console.log(`     🔑 ${keys.length} keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
                            
                            // Look for UID patterns in keys
                            keys.forEach(key => {
                                if (key.length > 15 && /^[a-zA-Z0-9]+$/.test(key)) {
                                    allPicksUsers.add(key);
                                }
                            });
                        }
                    });
                    
                    totalPicksFound += snapshot.size;
                }
                
            } catch (collectionError) {
                // Try as document
                try {
                    const doc = db.doc(path);
                    const docSnapshot = await doc.get();
                    
                    if (docSnapshot.exists) {
                        const data = docSnapshot.data();
                        console.log(`   ✅ DOCUMENT FOUND`);
                        
                        if (data && typeof data === 'object') {
                            const keys = Object.keys(data);
                            console.log(`     🔑 ${keys.length} keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
                            
                            // Look for picks data
                            keys.forEach(key => {
                                if (key.length > 15 && /^[a-zA-Z0-9]+$/.test(key)) {
                                    allPicksUsers.add(key);
                                    console.log(`     👤 Found user: ${key}`);
                                }
                            });
                            
                            totalPicksFound += keys.length;
                        }
                    }
                    
                } catch (docError) {
                    // Silent fail - path doesn't exist
                }
            }
        }
        
        // 3. Search all collections recursively for picks-related data
        console.log('\n📍 3. RECURSIVE SEARCH IN ALL COLLECTIONS...');
        
        async function searchCollection(collectionRef, path = '') {
            try {
                const snapshot = await collectionRef.get();
                
                for (const doc of snapshot.docs) {
                    const fullPath = path ? `${path}/${doc.id}` : doc.id;
                    const data = doc.data();
                    
                    // Check if this document contains picks data
                    if (data && typeof data === 'object') {
                        const dataString = JSON.stringify(data).toLowerCase();
                        
                        if (dataString.includes('pick') || 
                            dataString.includes('week') || 
                            dataString.includes('team') ||
                            dataString.includes('confidence')) {
                            
                            console.log(`   🎯 POTENTIAL PICKS DATA: ${fullPath}`);
                            console.log(`     📊 Document size: ${Object.keys(data).length} keys`);
                            
                            // Look for user IDs
                            Object.keys(data).forEach(key => {
                                if (key.length > 15 && /^[a-zA-Z0-9]+$/.test(key)) {
                                    allPicksUsers.add(key);
                                    console.log(`     👤 User found: ${key}`);
                                }
                            });
                        }
                    }
                    
                    // Recursively search subcollections
                    const subcollections = await doc.ref.listCollections();
                    for (const subcollection of subcollections) {
                        await searchCollection(subcollection, `${fullPath}/${subcollection.id}`);
                    }
                }
            } catch (error) {
                console.log(`   ⚠️ Error searching ${path}: ${error.message}`);
            }
        }
        
        // Search in main collections that might contain picks
        const mainCollections = ['artifacts', 'pools', 'data', 'picks'];
        
        for (const collectionName of mainCollections) {
            try {
                console.log(`\n   🔍 Recursively searching: ${collectionName}`);
                const collection = db.collection(collectionName);
                await searchCollection(collection, collectionName);
            } catch (error) {
                console.log(`   ❌ Could not search ${collectionName}: ${error.message}`);
            }
        }
        
        // 4. Search for specific week data
        console.log('\n📍 4. SEARCHING FOR CURRENT WEEK DATA...');
        
        const currentDate = new Date();
        const currentWeek = Math.ceil((currentDate - new Date('2024-09-01')) / (7 * 24 * 60 * 60 * 1000));
        console.log(`Estimated current week: ${currentWeek}`);
        
        const weekPaths = [
            `artifacts/nerdfootball/pools/${poolId}/data/week${currentWeek}`,
            `artifacts/nerdfootball/public/data/week${currentWeek}`,
            `week${currentWeek}`,
            `data/week${currentWeek}`
        ];
        
        for (const weekPath of weekPaths) {
            try {
                console.log(`   🔍 Checking week path: ${weekPath}`);
                const weekDoc = await db.doc(weekPath).get();
                if (weekDoc.exists) {
                    const weekData = weekDoc.data();
                    console.log(`   ✅ Found week data: ${Object.keys(weekData).length} entries`);
                    
                    Object.keys(weekData).forEach(key => {
                        if (key.length > 15) {
                            allPicksUsers.add(key);
                            console.log(`     👤 Week user: ${key}`);
                        }
                    });
                }
            } catch (error) {
                // Silent fail
            }
        }
        
        // 5. Final results
        console.log('\n' + '='.repeat(60));
        console.log('🎯 COMPREHENSIVE SEARCH RESULTS');
        console.log('='.repeat(60));
        
        console.log(`📊 Total potential picks documents/entries found: ${totalPicksFound}`);
        console.log(`👥 Unique users with picks data: ${allPicksUsers.size}`);
        
        if (allPicksUsers.size > 0) {
            console.log('\n👤 Users with picks:');
            Array.from(allPicksUsers).forEach((uid, index) => {
                console.log(`  ${index + 1}. ${uid}`);
            });
        }
        
        console.log('\n🔍 Search complete!');
        
        return {
            totalDocuments: totalPicksFound,
            uniqueUsers: allPicksUsers.size,
            userList: Array.from(allPicksUsers)
        };
        
    } catch (error) {
        console.error('💥 SEARCH ERROR:', error);
        throw error;
    }
}

// Run the comprehensive search
findAllPicksData()
    .then(results => {
        console.log('\n🏁 Comprehensive search completed');
        console.log(`📊 Summary: ${results.totalDocuments} documents, ${results.uniqueUsers} unique users`);
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });