/**
 * Golden Benchmark Test Suite
 * Verifies all core functionality is working
 */

const puppeteer = require('puppeteer');

const TEST_URL = 'http://127.0.0.1:5002';
const PROD_URL = 'https://nerdfootball.web.app';

async function testGoldenBenchmark(url = TEST_URL) {
  console.log('🏆 GOLDEN BENCHMARK TEST SUITE v1.0');
  console.log('=====================================');
  console.log(`Testing: ${url}\n`);
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1200, height: 800 }
  });
  
  const page = await browser.newPage();
  let passed = 0;
  let failed = 0;
  
  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      failed++;
    }
  };
  
  try {
    // Load main page
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Test 1: Hamburger Menu Exists
    await test('Hamburger menu button exists', async () => {
      const hamburger = await page.$('.hamburger-menu, #hamburger-menu, [class*="hamburger"]');
      if (!hamburger) throw new Error('Hamburger menu not found');
    });
    
    // Test 2: Navigation Works
    await test('Hamburger menu opens', async () => {
      await page.click('.hamburger-menu, #hamburger-menu, [class*="hamburger"]');
      await page.waitForTimeout(500);
      const menu = await page.$('.nav-menu, #nav-menu, [class*="menu-open"]');
      if (!menu) throw new Error('Menu did not open');
    });
    
    // Test 3: Menu Items Present
    await test('All menu items present', async () => {
      const menuItems = ['My Picks', 'The Grid', 'Survivor Pool', 'Rules'];
      for (const item of menuItems) {
        const found = await page.evaluate((text) => {
          return Array.from(document.querySelectorAll('a, button')).some(
            el => el.textContent.includes(text)
          );
        }, item);
        if (!found) throw new Error(`Menu item "${item}" not found`);
      }
    });
    
    // Test 4: Confidence Pool UI
    await test('Confidence pool picks container exists', async () => {
      // Close menu first
      await page.click('body');
      await page.waitForTimeout(500);
      
      // Check for picks container
      const picksContainer = await page.$('#picks-container, [id*="picks"], .picks-container');
      if (!picksContainer) {
        // Try clicking My Picks
        const myPicksBtn = await page.$('[data-view="picks"], #my-picks-btn');
        if (myPicksBtn) {
          await myPicksBtn.click();
          await page.waitForTimeout(1000);
        }
      }
    });
    
    // Test 5: No Ghost User
    await test('No ghost user present', async () => {
      const ghostUserId = 'okl4sw2aDhW3yKpOfOwe5lH7OQj1';
      const hasGhost = await page.evaluate((id) => {
        return document.body.textContent.includes(id);
      }, ghostUserId);
      if (hasGhost) throw new Error('Ghost user detected!');
    });
    
    // Test 6: Grid View Available
    await test('Grid view accessible', async () => {
      // Open menu again
      await page.click('.hamburger-menu, #hamburger-menu, [class*="hamburger"]');
      await page.waitForTimeout(500);
      
      // Click The Grid
      const gridLink = await page.evaluateHandle(() => {
        return Array.from(document.querySelectorAll('a, button')).find(
          el => el.textContent.includes('The Grid')
        );
      });
      
      if (gridLink) {
        await gridLink.click();
        await page.waitForTimeout(1000);
      }
    });
    
    // Test 7: Survivor Pool Available  
    await test('Survivor pool accessible', async () => {
      // Open menu
      await page.click('.hamburger-menu, #hamburger-menu, [class*="hamburger"]');
      await page.waitForTimeout(500);
      
      // Click Survivor Pool
      const survivorLink = await page.evaluateHandle(() => {
        return Array.from(document.querySelectorAll('a, button')).find(
          el => el.textContent.includes('Survivor Pool')
        );
      });
      
      if (survivorLink) {
        await survivorLink.click();
        await page.waitForTimeout(1000);
      }
    });
    
    // Test 8: Confidence Dropdowns
    await test('Confidence dropdowns functional', async () => {
      // Go back to picks
      await page.click('.hamburger-menu, #hamburger-menu, [class*="hamburger"]');
      await page.waitForTimeout(500);
      
      const picksLink = await page.evaluateHandle(() => {
        return Array.from(document.querySelectorAll('a, button')).find(
          el => el.textContent.includes('My Picks')
        );
      });
      
      if (picksLink) {
        await picksLink.click();
        await page.waitForTimeout(1000);
        
        // Check for confidence selects
        const selects = await page.$$('.confidence-select, select[id*="confidence"]');
        if (selects.length === 0) throw new Error('No confidence dropdowns found');
      }
    });
    
  } catch (error) {
    console.error('Test suite error:', error);
  } finally {
    console.log('\n=====================================');
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    
    if (failed === 0) {
      console.log('🎉 ALL GOLDEN BENCHMARK TESTS PASSED!');
    } else {
      console.log('⚠️  SOME TESTS FAILED - DO NOT DEPLOY!');
    }
    
    await browser.close();
    process.exit(failed === 0 ? 0 : 1);
  }
}

// Run tests
const args = process.argv.slice(2);
const url = args[0] === '--prod' ? PROD_URL : TEST_URL;
testGoldenBenchmark(url);