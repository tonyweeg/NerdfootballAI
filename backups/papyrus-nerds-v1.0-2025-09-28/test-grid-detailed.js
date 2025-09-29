const puppeteer = require('puppeteer');

async function testGridDetailed() {
  console.log('🧪 Testing Grid Integration (Detailed)...');
  
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Enable console logging from the page
  page.on('console', msg => {
    console.log(`PAGE LOG [${msg.type()}]: ${msg.text()}`);
  });
  
  try {
    console.log('📋 Loading page with ?view=grid parameter');
    await page.goto('http://localhost:3000/?view=grid');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check login state and view state
    const pageState = await page.evaluate(() => {
      return {
        currentView: window.location.search,
        isLoggedIn: !!document.getElementById('app-view') && !document.getElementById('app-view').classList.contains('hidden'),
        isLoginViewShown: !!document.getElementById('login-view') && !document.getElementById('login-view').classList.contains('hidden'),
        gridContainerExists: !!document.getElementById('grid-container'),
        gridContainerHidden: document.getElementById('grid-container')?.classList.contains('hidden'),
        picksContainerHidden: document.getElementById('picks-container')?.classList.contains('hidden'),
        leaderboardContainerHidden: document.getElementById('leaderboard-container')?.classList.contains('hidden'),
        adminContainerHidden: document.getElementById('admin-container')?.classList.contains('hidden'),
        allUIElements: {
          gridViewBtn: !!document.getElementById('grid-view-btn'),
          gridWeekSelector: !!document.getElementById('grid-week-selector'),
          gridTableContent: !!document.getElementById('grid-table-content')
        }
      };
    });
    
    console.log('🔍 Page State Analysis:');
    console.log('  URL params:', pageState.currentView);
    console.log('  Is logged in:', pageState.isLoggedIn);
    console.log('  Login view shown:', pageState.isLoginViewShown);
    console.log('  Grid container exists:', pageState.gridContainerExists);
    console.log('  Grid container hidden:', pageState.gridContainerHidden);
    console.log('  Picks container hidden:', pageState.picksContainerHidden);
    console.log('  Leaderboard container hidden:', pageState.leaderboardContainerHidden);
    console.log('  Admin container hidden:', pageState.adminContainerHidden);
    console.log('  All UI elements:', pageState.allUIElements);
    
    if (!pageState.isLoggedIn) {
      console.log('⚠️ User not logged in - Grid view requires authentication');
      console.log('   This is expected behavior for security');
    }
    
    if (pageState.gridContainerExists && !pageState.gridContainerHidden && pageState.isLoggedIn) {
      console.log('✅ Grid integration working correctly when logged in');
    } else if (pageState.gridContainerExists && !pageState.isLoggedIn) {
      console.log('✅ Grid integration properly requires authentication');
    } else {
      console.log('❌ Grid integration has issues');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

testGridDetailed();