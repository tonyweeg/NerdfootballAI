const puppeteer = require('puppeteer');

async function testSurvivorSimple() {
  console.log('🔍 SIMPLE SURVIVOR RESULTS TEST\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--no-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set up console message logging
    page.on('console', msg => {
      console.log(`CONSOLE: ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      console.log('❌ PAGE ERROR:', error.message);
    });
    
    console.log('📍 Opening survivor results page...');
    await page.goto('http://localhost:3005/survivorResults.html', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    
    console.log('⏳ Waiting 5 seconds to see what happens...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check current URL in case of redirect
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);
    
    // Take a screenshot
    await page.screenshot({ path: 'survivor-simple-test.png', fullPage: true });
    console.log('📸 Screenshot saved as survivor-simple-test.png');
    
    // Keep browser open for manual inspection
    console.log('🔍 Browser will stay open for inspection. Close manually when done.');
    
    // Wait indefinitely (user closes browser manually)
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await browser.close();
  }
}

testSurvivorSimple();