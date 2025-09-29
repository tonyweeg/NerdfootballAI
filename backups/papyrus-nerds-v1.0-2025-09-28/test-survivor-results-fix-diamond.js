const admin = require('firebase-admin');
const puppeteer = require('puppeteer');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://nerdfootball-default-rtdb.firebaseio.com/'
});

async function testSurvivorResultsFix() {
  let browser;
  
  try {
    console.log('🔍 Testing survivor results fix...');
    
    // Launch browser and go to survivor results
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    // Listen for console logs
    const logs = [];
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    await page.goto('http://localhost:3000/survivorResults.html', { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for results to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n📋 Console logs from page:');
    logs.forEach(log => {
      if (log.includes('Week 1 results structure') || log.includes('Philadelphia') || log.includes('allWeekResults')) {
        console.log(log);
      }
    });
    
    // Check if we can find any green backgrounds (indicating correct results)
    const playerRows = await page.$$('.player-row');
    console.log(`\n👥 Found ${playerRows.length} player rows`);
    
    let greenCount = 0;
    let yellowCount = 0;
    let redCount = 0;
    
    for (const row of playerRows) {
      const bgColor = await row.evaluate(el => getComputedStyle(el).backgroundColor);
      if (bgColor.includes('144, 238, 144') || bgColor.includes('lightgreen')) {
        greenCount++;
      } else if (bgColor.includes('255, 255, 224') || bgColor.includes('lightyellow')) {
        yellowCount++;
      } else if (bgColor.includes('255, 182, 193') || bgColor.includes('lightpink')) {
        redCount++;
      }
    }
    
    console.log(`\n🎨 Background colors:`);
    console.log(`   Green (survived): ${greenCount}`);
    console.log(`   Yellow (pending): ${yellowCount}`);
    console.log(`   Red (eliminated): ${redCount}`);
    
    // Success criteria: Should have some green backgrounds if Philadelphia picks won
    if (greenCount > 0) {
      console.log('\n✅ SUCCESS: Found players with green backgrounds (survived)');
      console.log('   This indicates the game results are now loading correctly');
      return true;
    } else if (yellowCount > 0 && greenCount === 0 && redCount === 0) {
      console.log('\n⚠️ PARTIAL: All players still showing yellow (pending)');
      console.log('   Results may not be loading or no Philadelphia picks found');
      return false;
    } else {
      console.log('\n❌ UNEXPECTED: Mixed results without green backgrounds');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    return false;
  } finally {
    if (browser) await browser.close();
  }
}

testSurvivorResultsFix().then(success => {
  console.log(`\n${success ? '🎉 Test PASSED' : '💔 Test FAILED'}`);
  process.exit(success ? 0 : 1);
});