/**
 * Migration Script: Move all existing users to NerdUniverse 2025 pool
 * This script:
 * 1. Creates the NerdUniverse 2025 pool
 * 2. Migrates all existing users with their roles
 * 3. Preserves all confidence and survivor picks
 * 4. Updates pool references
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  collection,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBaS6oKjy7rrMY7RtfLjNP8rC8mUTzEhik",
  authDomain: "nerdfootball.firebaseapp.com",
  databaseURL: "https://nerdfootball.firebaseio.com",
  projectId: "nerdfootball",
  storageBucket: "nerdfootball.appspot.com",
  messagingSenderId: "55015484896",
  appId: "1:55015484896:web:2bbabdefaa63f19f51035f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const ADMIN_UIDS = ["WxSPmEildJdqs6T5hIpBUZrscwt2", "BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2"];
const OLD_POOL_ID = 'nerdfootball-2025';
const NEW_POOL_ID = 'nerduniverse-2025';
const NEW_POOL_NAME = 'NerdUniverse 2025';

async function runMigration() {
  console.log('🚀 Starting migration to NerdUniverse 2025...\n');
  
  try {
    // Step 1: Create NerdUniverse 2025 pool
    console.log('📝 Step 1: Creating NerdUniverse 2025 pool...');
    const poolConfig = {
      poolId: NEW_POOL_ID,
      name: NEW_POOL_NAME,
      description: 'The original NerdFootball community - established 2025',
      type: 'both',
      creator: ADMIN_UIDS[0], // Tony as creator
      created: new Date().toISOString(),
      settings: {
        maxMembers: 100,
        joinType: 'invite', // Invite only for the main pool
        confidenceEnabled: true,
        survivorEnabled: true,
        weeklyReminders: true
      },
      status: 'active',
      season: '2025',
      memberCount: 0 // Will be updated as we add members
    };
    
    // Create pool metadata
    const poolMetadataRef = doc(db, `artifacts/nerdfootball/pools/${NEW_POOL_ID}/metadata/config`);
    await setDoc(poolMetadataRef, poolConfig);
    console.log('✅ Pool metadata created');
    
    // Step 2: Get all existing users
    console.log('\n📝 Step 2: Fetching existing users...');
    const usersPath = 'artifacts/nerdfootball/public/data/nerdfootball_users';
    const usersSnapshot = await getDocs(collection(db, usersPath));
    
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({
        uid: doc.id,
        ...doc.data()
      });
    });
    console.log(`✅ Found ${users.length} users to migrate`);
    
    // Step 3: Create pool members document
    console.log('\n📝 Step 3: Creating pool membership records...');
    const poolMembers = {};
    let adminCount = 0;
    let memberCount = 0;
    
    for (const user of users) {
      const isAdmin = ADMIN_UIDS.includes(user.uid);
      const role = isAdmin ? 'admin' : 'member';
      
      poolMembers[user.uid] = {
        uid: user.uid,
        displayName: user.displayName || user.email || 'Unknown User',
        email: user.email || '',
        role: role,
        joinedAt: new Date().toISOString(),
        status: 'active'
      };
      
      if (isAdmin) {
        adminCount++;
        console.log(`  👑 Admin: ${user.displayName || user.email}`);
      } else {
        memberCount++;
      }
    }
    
    // Save pool members
    const poolMembersRef = doc(db, `artifacts/nerdfootball/pools/${NEW_POOL_ID}/metadata/members`);
    await setDoc(poolMembersRef, poolMembers);
    console.log(`✅ Created membership records: ${adminCount} admins, ${memberCount} members`);
    
    // Step 4: Update each user's pool membership
    console.log('\n📝 Step 4: Updating user pool memberships...');
    for (const user of users) {
      const userPoolsRef = doc(db, `artifacts/nerdfootball/users/${user.uid}/pools`);
      const userPoolsDoc = await getDoc(userPoolsRef);
      
      const existingPools = userPoolsDoc.exists() ? userPoolsDoc.data() : {};
      
      // Add NerdUniverse 2025 to their pools
      existingPools[NEW_POOL_ID] = {
        poolId: NEW_POOL_ID,
        poolName: NEW_POOL_NAME,
        role: ADMIN_UIDS.includes(user.uid) ? 'admin' : 'member',
        joinedAt: new Date().toISOString(),
        status: 'active'
      };
      
      // Keep the legacy pool reference for backward compatibility
      if (!existingPools[OLD_POOL_ID]) {
        existingPools[OLD_POOL_ID] = {
          poolId: OLD_POOL_ID,
          poolName: 'Legacy Pool',
          role: ADMIN_UIDS.includes(user.uid) ? 'admin' : 'member',
          joinedAt: new Date().toISOString(),
          status: 'active'
        };
      }
      
      await setDoc(userPoolsRef, existingPools);
    }
    console.log('✅ Updated all user pool memberships');
    
    // Step 5: Update pool member count
    console.log('\n📝 Step 5: Updating pool member count...');
    await updateDoc(poolMetadataRef, {
      memberCount: users.length
    });
    console.log(`✅ Pool member count set to ${users.length}`);
    
    // Step 6: Verify picks integrity
    console.log('\n📝 Step 6: Verifying picks integrity...');
    
    // Check confidence picks
    let totalConfidencePicks = 0;
    for (let week = 1; week <= 18; week++) {
      const picksPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${week}/submissions`;
      const picksSnapshot = await getDocs(collection(db, picksPath));
      totalConfidencePicks += picksSnapshot.size;
    }
    console.log(`✅ Confidence picks verified: ${totalConfidencePicks} total picks across all weeks`);
    
    // Check survivor picks
    const survivorPath = 'artifacts/nerdfootball/public/data/nerdSurvivor_picks';
    const survivorSnapshot = await getDocs(collection(db, survivorPath));
    console.log(`✅ Survivor picks verified: ${survivorSnapshot.size} users with survivor picks`);
    
    // Step 7: Create migration log
    console.log('\n📝 Step 7: Creating migration log...');
    const migrationLogRef = doc(db, `artifacts/nerdfootball/migrations/${Date.now()}`);
    await setDoc(migrationLogRef, {
      type: 'pool_migration',
      fromPool: OLD_POOL_ID,
      toPool: NEW_POOL_ID,
      timestamp: serverTimestamp(),
      usersCount: users.length,
      adminsCount: adminCount,
      membersCount: memberCount,
      confidencePicksCount: totalConfidencePicks,
      survivorPicksCount: survivorSnapshot.size,
      status: 'completed'
    });
    console.log('✅ Migration log created');
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`
📊 Migration Summary:
  • Pool Name: ${NEW_POOL_NAME}
  • Pool ID: ${NEW_POOL_ID}
  • Total Users: ${users.length}
  • Admins: ${adminCount}
  • Members: ${memberCount}
  • Confidence Picks Preserved: ${totalConfidencePicks}
  • Survivor Picks Preserved: ${survivorSnapshot.size}
  
✨ Next Steps:
  1. Update the default pool in index.html from '${OLD_POOL_ID}' to '${NEW_POOL_ID}'
  2. Test the application to ensure all users can access their data
  3. Verify admins have their admin privileges
  4. Announce the migration to users
`);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('Please check the error and try again.');
    process.exit(1);
  }
}

// Run the migration
console.log('='.repeat(60));
console.log('NERDUNIVERSE 2025 MIGRATION SCRIPT');
console.log('='.repeat(60));
console.log(`
⚠️  This script will:
  • Create the NerdUniverse 2025 pool
  • Migrate all existing users
  • Preserve all admin roles
  • Keep all confidence and survivor picks intact
  • Maintain backward compatibility

Press Ctrl+C to cancel, or wait 5 seconds to continue...
`);

setTimeout(() => {
  runMigration().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}, 5000);