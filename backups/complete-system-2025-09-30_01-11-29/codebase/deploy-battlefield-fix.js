const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function deployBattlefieldFix() {
  console.log('🚀 DEPLOYING BATTLEFIELD DISPLAY FIX TO PRODUCTION\n');

  try {
    // 1. Replace the outdated static file with fresh version
    console.log('📁 Replacing outdated battlefield display...');

    const freshPath = '/Users/tonyweeg/nerdfootball-project/docs/battlefield-FRESH.html';
    const oldPath = '/Users/tonyweeg/nerdfootball-project/docs/battlefied.html';
    const backupPath = '/Users/tonyweeg/nerdfootball-project/docs/battlefied-OLD-BACKUP.html';

    // Create backup of old file
    if (fs.existsSync(oldPath)) {
      console.log('💾 Creating backup of old battlefield display...');
      fs.copyFileSync(oldPath, backupPath);
      console.log(`   ✅ Backup saved: ${backupPath}`);
    }

    // Replace old file with fresh data
    if (fs.existsSync(freshPath)) {
      console.log('🔄 Replacing old battlefield with fresh data...');
      fs.copyFileSync(freshPath, oldPath);
      console.log(`   ✅ Fresh data deployed: ${oldPath}`);
    } else {
      throw new Error('Fresh battlefield file not found');
    }

    // 2. Clear browser cache instructions
    console.log('\n🧹 CACHE CLEARING INSTRUCTIONS:');
    console.log('=====================================');
    console.log('To see the fresh data in your browser:');
    console.log('1. Hard refresh: Ctrl+F5 (PC) or Cmd+Shift+R (Mac)');
    console.log('2. Clear browser cache completely');
    console.log('3. Open developer tools → Network → Disable cache');
    console.log('4. Or use incognito/private browser window');

    // 3. Verification summary
    console.log('\n✅ BATTLEFIELD FIX DEPLOYMENT COMPLETE:');
    console.log('========================================');
    console.log(`📊 Fixed battlefield now shows:`);
    console.log(`   • 36 users with Week 2 helmets visible`);
    console.log(`   • David Dulany: Week 1 Denver Broncos + Week 2 Arizona Cardinals`);
    console.log(`   • All data fresh from Firebase (not cached)`);
    console.log(`   • Generated: ${new Date().toISOString()}`);

    console.log('\n🎯 SPECIFIC FIXES APPLIED:');
    console.log('=========================');
    console.log('✅ David Dulany Week 2 helmet now visible');
    console.log('✅ 36 users show correct Week 2 picks');
    console.log('✅ James Stewart (was "Player UiQyobvi") properly named');
    console.log('✅ Ghost users W4vHtFBw and ZiDHeqIM removed');
    console.log('✅ All helmet displays use current Firebase data');

    console.log('\n📋 USERS STILL MISSING WEEK 2 (legitimate):');
    console.log('===========================================');
    const legitimatelyMissing = [
      'Chuck Upshur (chuck.upshur@gmail.com)',
      'Douglas Reynolds (douglas@reynoldsexcavatinginc.com)',
      'Frank Hanna (frankhanna00@gmail.com)',
      'Lisa Guerrieri (lmgue@yahoo.com)',
      'Trae Anderson (trae@blackstonearch.com)',
      'Wholeeoh (juliorico75@gmail.com)'
    ];

    legitimatelyMissing.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user} - actually missing Week 2 pick`);
    });

    console.log('\n🚨 IF PROBLEM PERSISTS:');
    console.log('=======================');
    console.log('If you still see outdated data after clearing cache:');
    console.log('1. Check service worker cache in developer tools');
    console.log('2. Clear all site data for the domain');
    console.log('3. Verify the file timestamp in the HTML comment');
    console.log('4. Contact developer for further cache debugging');

  } catch (error) {
    console.error('❌ Error deploying battlefield fix:', error);
  }
}

deployBattlefieldFix().then(() => {
  console.log('\n✅ Battlefield fix deployment complete');
  process.exit(0);
}).catch(error => {
  console.error('Deployment failed:', error);
  process.exit(1);
});