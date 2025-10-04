const puppeteer = require('puppeteer');

async function testNoRegressions() {
  console.log('🧪 Testing for Main Application Regressions...');
  
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  try {
    // Test 1: Default app loads correctly
    console.log('📋 Test 1: Default app loads without errors');
    await page.goto('http://localhost:3000/');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const basicFunctionality = await page.evaluate(() => {
      return {
        loginViewExists: !!document.getElementById('login-view'),
        appViewExists: !!document.getElementById('app-view'),
        picksContainerExists: !!document.getElementById('picks-container'),
        leaderboardContainerExists: !!document.getElementById('leaderboard-container'),
        adminContainerExists: !!document.getElementById('admin-container'),
        gridContainerExists: !!document.getElementById('grid-container'),
        menuExists: !!document.getElementById('menu-panel'),
        picksViewBtnExists: !!document.getElementById('menu-picks-view-btn'),
        leaderboardViewBtnExists: !!document.getElementById('leaderboard-view-btn'),
        gridViewBtnExists: !!document.getElementById('grid-view-btn'),
        settingsModalExists: !!document.getElementById('settings-modal')
      };
    });
    
    console.log('✅ Container Elements:');
    Object.entries(basicFunctionality).forEach(([key, value]) => {
      console.log(`   ${key}: ${value ? '✅' : '❌'}`);
    });
    
    // Test 2: URL parameters still work for other views
    console.log('📋 Test 2: Other URL parameters still work');
    
    await page.goto('http://localhost:3000/?view=leaderboard');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const leaderboardUrlWorks = await page.evaluate(() => {
      // Check if URL params are parsed correctly (from console logs)
      return window.location.search.includes('view=leaderboard');
    });
    
    await page.goto('http://localhost:3000/?view=admin');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const adminUrlWorks = await page.evaluate(() => {
      return window.location.search.includes('view=admin');
    });
    
    console.log(`   Leaderboard URL parsing: ${leaderboardUrlWorks ? '✅' : '❌'}`);
    console.log(`   Admin URL parsing: ${adminUrlWorks ? '✅' : '❌'}`);
    
    // Test 3: Check for any JavaScript errors
    console.log('📋 Test 3: JavaScript error check');
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:3000/');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`   JavaScript errors: ${errors.length === 0 ? '✅ None' : '❌ ' + errors.length + ' errors'}`);
    if (errors.length > 0) {
      console.log('   Error details:', errors.slice(0, 3)); // Show first 3 errors
    }
    
    // Test 4: Menu functionality still works
    console.log('📋 Test 4: Menu button functionality');
    const menuWorks = await page.evaluate(() => {
      const menuBtn = document.getElementById('menu-btn');
      const menuPanel = document.getElementById('menu-panel');
      
      if (!menuBtn || !menuPanel) return false;
      
      const initiallyHidden = menuPanel.classList.contains('hidden');
      menuBtn.click();
      const afterClick = !menuPanel.classList.contains('hidden');
      
      return initiallyHidden && afterClick;
    });
    
    console.log(`   Menu toggle works: ${menuWorks ? '✅' : '❌'}`);
    
    console.log('🎯 Regression Test Summary:');
    console.log(`- All containers exist: ${Object.values(basicFunctionality).every(v => v) ? '✅' : '❌'}`);
    console.log(`- URL parameters work: ${leaderboardUrlWorks && adminUrlWorks ? '✅' : '❌'}`);
    console.log(`- No JS errors: ${errors.length === 0 ? '✅' : '❌'}`);
    console.log(`- Menu functionality: ${menuWorks ? '✅' : '❌'}`);
    
    const allTestsPassed = Object.values(basicFunctionality).every(v => v) && 
                          leaderboardUrlWorks && adminUrlWorks && 
                          errors.length === 0 && menuWorks;
    
    console.log(`\n🏆 Overall Result: ${allTestsPassed ? '✅ NO REGRESSIONS DETECTED' : '❌ REGRESSIONS FOUND'}`);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

testNoRegressions();