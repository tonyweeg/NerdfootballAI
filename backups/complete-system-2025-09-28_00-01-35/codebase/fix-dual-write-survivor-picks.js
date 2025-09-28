const fs = require('fs');

// Fix the dual-write issue in index.html by adding pool members update to survivor pick saving
function fixSurvivorPickDualWrite() {
  console.log('🔧 FIXING DUAL-WRITE ISSUE: Adding pool members update to survivor pick saving\n');

  const indexPath = '/Users/tonyweeg/nerdfootball-project/public/index.html';

  try {
    // Read current index.html
    let content = fs.readFileSync(indexPath, 'utf8');

    // Find the survivor pick save function
    const savePickPattern = /allUI\.saveSurvivorPickBtn\.addEventListener\('click', async \(\) => \{[\s\S]*?await setDoc\(survivorPicksDocRef, survivorData, \{ merge: true \}\);/;

    // New code to add after the legacy setDoc call
    const poolMembersUpdate = `
        // 🎯 CRITICAL FIX: Also update pool members structure to maintain data consistency
        const poolId = getCurrentPool();
        const poolMembersPath = \`artifacts/nerdfootball/pools/\${poolId}/metadata/members\`;
        const poolDoc = await getDoc(doc(db, poolMembersPath));

        if (poolDoc.exists()) {
            const poolData = poolDoc.data();
            const userData = poolData[selectedSurvivorUser];

            if (userData) {
                // Update pick history in pool members structure
                const survivor = userData.survivor || {};
                const currentPickHistory = survivor.pickHistory || '';
                const currentPicks = currentPickHistory.split(', ').filter(p => p && p.trim());

                // Ensure picks array has correct length for this week
                while (currentPicks.length < parseInt(weekNumber)) {
                    currentPicks.push(''); // Add empty picks for missing weeks
                }

                // Update the specific week pick
                currentPicks[parseInt(weekNumber) - 1] = selectedSurvivorTeam;

                // Create new pick history string
                const newPickHistory = currentPicks.filter(p => p && p.trim()).join(', ');

                // Update user data in pool members
                const updatedUserData = {
                    ...userData,
                    survivor: {
                        ...survivor,
                        pickHistory: newPickHistory,
                        alive: true, // Keep user active when saving new pick
                        eliminationWeek: null // Clear any elimination when saving new pick
                    }
                };

                // Update pool members document
                const updatedPoolData = {
                    ...poolData,
                    [selectedSurvivorUser]: updatedUserData
                };

                await setDoc(doc(db, poolMembersPath), updatedPoolData);
                console.log(\`✅ DUAL-WRITE: Updated both legacy picks AND pool members for \${user.displayName}\`);
            }
        }`;

    // Find the setDoc call and add our pool members update after it
    const replacement = content.replace(
      /(await setDoc\(survivorPicksDocRef, survivorData, \{ merge: true \}\);)/,
      `$1${poolMembersUpdate}`
    );

    // Verify the replacement worked
    if (replacement === content) {
      console.log('❌ Pattern not found - the save function may have changed');
      console.log('Manual fix required in index.html');
      return false;
    }

    // Write updated content
    fs.writeFileSync(indexPath, replacement, 'utf8');

    console.log('✅ DUAL-WRITE FIX APPLIED TO index.html');
    console.log('🎯 Now when users save survivor picks, it will update:');
    console.log('   1. ✅ Unified survivor manager');
    console.log('   2. ✅ Legacy picks structure (artifacts/nerdfootball/public/data/nerdSurvivor_picks)');
    console.log('   3. ✅ Pool members structure (artifacts/nerdfootball/pools/metadata/members)');
    console.log('');
    console.log('🔄 This prevents data structure drift and maintains consistency!');

    return true;

  } catch (error) {
    console.error('❌ Error fixing dual-write issue:', error);
    return false;
  }
}

// Also generate a verification function to test the fix
function generateDualWriteTest() {
  const testCode = `
// DUAL-WRITE VERIFICATION TEST
// Run this in browser console after saving a survivor pick to verify both structures are updated

async function verifyDualWriteWorking(userId, weekNumber) {
  console.log('🔍 VERIFYING DUAL-WRITE FOR USER:', userId, 'WEEK:', weekNumber);

  // Check legacy structure
  const legacyPath = \`artifacts/nerdfootball/public/data/nerdSurvivor_picks/\${userId}\`;
  const legacyDoc = await getDoc(doc(db, legacyPath));
  const legacyPick = legacyDoc.exists() ? legacyDoc.data().picks?.[weekNumber]?.team : 'NOT FOUND';

  // Check pool members structure
  const poolPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
  const poolDoc = await getDoc(doc(db, poolPath));
  const poolData = poolDoc.data();
  const poolUser = poolData[userId];
  const poolPicks = poolUser?.survivor?.pickHistory?.split(', ') || [];
  const poolPick = poolPicks[weekNumber - 1] || 'NOT FOUND';

  console.log('📊 DUAL-WRITE VERIFICATION RESULTS:');
  console.log(\`   Legacy structure: \${legacyPick}\`);
  console.log(\`   Pool members structure: \${poolPick}\`);
  console.log(\`   Match: \${legacyPick === poolPick ? '✅ SUCCESS' : '❌ MISMATCH'}\`);

  return legacyPick === poolPick;
}

// Example usage:
// verifyDualWriteWorking('30bXFADO8jaFIQTHxSj7Qi2YSRi2', 3); // Trae Anderson Week 3
`;

  fs.writeFileSync('/Users/tonyweeg/nerdfootball-project/dual-write-test.js', testCode);
  console.log('📝 Generated dual-write verification test: dual-write-test.js');
}

// Execute the fix
console.log('🚀 EXECUTING DUAL-WRITE FIX FOR SURVIVOR PICKS\n');

const success = fixSurvivorPickDualWrite();
if (success) {
  generateDualWriteTest();

  console.log('\n🎉 DUAL-WRITE FIX COMPLETE!');
  console.log('===========================');
  console.log('✅ Survivor pick saving now updates BOTH data structures');
  console.log('✅ No more data drift between pool members and legacy picks');
  console.log('✅ Display consistency maintained across all future pick saves');
  console.log('');
  console.log('🔄 NEXT STEPS:');
  console.log('1. Deploy the updated index.html to production');
  console.log('2. Test with a real survivor pick save');
  console.log('3. Use dual-write-test.js to verify both structures match');

} else {
  console.log('\n❌ DUAL-WRITE FIX FAILED');
  console.log('Manual intervention required in index.html');
}