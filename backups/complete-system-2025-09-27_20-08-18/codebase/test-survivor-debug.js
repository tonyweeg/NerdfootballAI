const puppeteer = require('puppeteer');

async function testSurvivorResults() {
  console.log('🔍 TESTING SURVIVOR RESULTS WITH ENHANCED DEBUGGING\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true 
  });
  
  try {
    const page = await browser.newPage();
    
    // Set up console message logging
    const consoleMessages = [];
    page.on('console', msg => {
      const message = `${msg.type()}: ${msg.text()}`;
      console.log(message);
      consoleMessages.push(message);
    });
    
    page.on('pageerror', error => {
      console.log('❌ PAGE ERROR:', error.message);
    });
    
    page.on('requestfailed', request => {
      console.log('❌ REQUEST FAILED:', request.url(), request.failure().errorText);
    });
    
    console.log('📍 Navigating to survivor results page...');
    await page.goto('http://localhost:3005/survivorResults.html', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait a bit for Firebase auth and data loading
    console.log('⏳ Waiting for data to load...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Try to get the current state
    const pageState = await page.evaluate(() => {
      return {
        title: document.title,
        loading: !document.getElementById('loading-container').classList.contains('hidden'),
        error: !document.getElementById('error-container').classList.contains('hidden'),
        results: !document.getElementById('results-container').classList.contains('hidden'),
        noResults: !document.getElementById('no-results').classList.contains('hidden'),
        userDisplay: document.getElementById('user-display').textContent,
        currentPool: document.getElementById('current-pool-name').textContent
      };
    });
    
    console.log('\n📊 PAGE STATE:');
    console.log('   Title:', pageState.title);
    console.log('   User:', pageState.userDisplay);
    console.log('   Pool:', pageState.currentPool);
    console.log('   Loading visible:', pageState.loading);
    console.log('   Error visible:', pageState.error);
    console.log('   Results visible:', pageState.results);
    console.log('   No results visible:', pageState.noResults);
    
    // If there's an error, get the error message
    if (pageState.error) {
      const errorMessage = await page.$eval('#error-message', el => el.textContent);
      console.log('   Error message:', errorMessage);
    }
    
    // If results are showing, get some table data
    if (pageState.results) {
      const tableData = await page.evaluate(() => {
        const rows = document.querySelectorAll('#results-tbody tr');
        return Array.from(rows).slice(0, 5).map(row => {
          const cols = row.querySelectorAll('td');
          return {
            player: cols[0]?.querySelector('.text-sm.font-medium.text-gray-900')?.textContent || 'N/A',
            status: cols[1]?.textContent?.trim() || 'N/A',
            currentPick: cols[2]?.textContent?.trim() || 'N/A',
            pickWeek: cols[3]?.textContent?.trim() || 'N/A'
          };
        });
      });
      
      console.log('\n📋 FIRST 5 ROWS:');
      tableData.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.player}: ${row.currentPick} (${row.pickWeek}) - ${row.status}`);
      });
    }
    
    console.log('\n💾 Saving page screenshot...');
    await page.screenshot({ path: 'survivor-debug-screenshot.png', fullPage: true });
    
    console.log('⏳ Keeping browser open for 30 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testSurvivorResults().then(() => {
  console.log('\n✅ Test complete');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});