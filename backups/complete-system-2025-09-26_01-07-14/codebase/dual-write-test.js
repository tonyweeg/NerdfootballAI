
// DUAL-WRITE VERIFICATION TEST
// Run this in browser console after saving a survivor pick to verify both structures are updated

async function verifyDualWriteWorking(userId, weekNumber) {
  console.log('🔍 VERIFYING DUAL-WRITE FOR USER:', userId, 'WEEK:', weekNumber);

  // Check legacy structure
  const legacyPath = `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}`;
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
  console.log(`   Legacy structure: ${legacyPick}`);
  console.log(`   Pool members structure: ${poolPick}`);
  console.log(`   Match: ${legacyPick === poolPick ? '✅ SUCCESS' : '❌ MISMATCH'}`);

  return legacyPick === poolPick;
}

// Example usage:
// verifyDualWriteWorking('30bXFADO8jaFIQTHxSj7Qi2YSRi2', 3); // Trae Anderson Week 3
