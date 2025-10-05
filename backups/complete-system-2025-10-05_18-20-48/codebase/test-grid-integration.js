const puppeteer = require('puppeteer');

async function testGridIntegration() {
  console.log('🧪 Testing Grid Integration...');
  
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  try {
    // Test 1: Direct URL access with ?view=grid parameter
    console.log('📋 Test 1: Direct URL access with ?view=grid');
    await page.goto('http://localhost:3000/?view=grid');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if grid container is visible
    const gridVisible = await page.evaluate(() => {
      const gridContainer = document.getElementById('grid-container');
      return gridContainer && !gridContainer.classList.contains('hidden');
    });
    
    if (gridVisible) {
      console.log('✅ Grid container is visible with ?view=grid parameter');
    } else {
      console.log('❌ Grid container is not visible with ?view=grid parameter');
    }
    
    // Test 2: Check if Grid view button exists in menu
    console.log('📋 Test 2: Grid view button exists in hamburger menu');
    const gridButtonExists = await page.evaluate(() => {
      const gridBtn = document.getElementById('grid-view-btn');
      return !!gridBtn;
    });
    
    if (gridButtonExists) {
      console.log('✅ Grid view button exists in menu');
    } else {
      console.log('❌ Grid view button missing from menu');
    }
    
    // Test 3: Test Grid elements are present
    console.log('📋 Test 3: Grid elements are present');
    const gridElements = await page.evaluate(() => {
      return {
        weekSelector: !!document.getElementById('grid-week-selector'),
        tableContent: !!document.getElementById('grid-table-content'),
        yearlyLink: !!document.getElementById('grid-yearly-leaderboard-link')
      };
    });
    
    if (gridElements.weekSelector && gridElements.tableContent && gridElements.yearlyLink) {
      console.log('✅ All Grid elements are present');
    } else {
      console.log('❌ Some Grid elements are missing:', gridElements);
    }
    
    // Test 4: Check for JavaScript errors
    console.log('📋 Test 4: Checking for JavaScript errors');
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (errors.length === 0) {
      console.log('✅ No JavaScript errors detected');
    } else {
      console.log('❌ JavaScript errors detected:', errors);
    }
    
    console.log('🎯 Grid Integration Test Summary:');
    console.log(`- Direct URL access: ${gridVisible ? '✅' : '❌'}`);
    console.log(`- Menu button exists: ${gridButtonExists ? '✅' : '❌'}`);
    console.log(`- Grid elements present: ${gridElements.weekSelector && gridElements.tableContent && gridElements.yearlyLink ? '✅' : '❌'}`);
    console.log(`- No JS errors: ${errors.length === 0 ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

testGridIntegration();