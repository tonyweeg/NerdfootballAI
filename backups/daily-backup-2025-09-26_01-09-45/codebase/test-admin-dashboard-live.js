#!/usr/bin/env node

/**
 * 🧪 TEST LIVE ADMIN DASHBOARD
 * Verify that the corrected admin dashboard is working with real data
 */

const puppeteer = require('puppeteer');

async function testLiveAdminDashboard() {
  console.log('🧪 TESTING LIVE ADMIN DASHBOARD\n');

  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Navigate to admin dashboard
    const adminUrl = 'https://nerdfootball.web.app/index.html?view=admin';
    console.log(`🌐 Opening admin dashboard: ${adminUrl}`);

    await page.goto(adminUrl, { waitUntil: 'networkidle2' });

    // Wait for potential authentication redirect
    await page.waitForTimeout(3000);

    // Check if we're on the right page
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Wait for admin content to load
    console.log('⏳ Waiting for admin content to load...');
    await page.waitForTimeout(5000);

    // Check if MEGATRON dashboard is visible
    const megatronExists = await page.$('#admin-content-survivor-status');
    if (megatronExists) {
      console.log('✅ MEGATRON dashboard found');

      // Check if refresh button exists
      const refreshBtn = await page.$('#megatron-refresh-data-btn');
      if (refreshBtn) {
        console.log('✅ MEGATRON refresh button found');

        // Click refresh button to test Firebase API
        console.log('🔄 Clicking MEGATRON refresh button...');
        await refreshBtn.click();

        // Wait for processing
        await page.waitForTimeout(10000);

        // Capture any console logs
        page.on('console', msg => {
          const text = msg.text();
          if (text.includes('MEGATRON') || text.includes('🎯')) {
            console.log(`🎯 BROWSER LOG: ${text}`);
          }
        });

        // Check for error dialogs
        page.on('dialog', async dialog => {
          console.log(`❌ DIALOG: ${dialog.message()}`);
          await dialog.accept();
        });

        console.log('✅ MEGATRON refresh completed - check browser logs above');
      } else {
        console.log('❌ MEGATRON refresh button not found');
      }

      // Test week selector
      const weekSelector = await page.$('#megatron-week-selector');
      if (weekSelector) {
        console.log('✅ Week selector found');

        // Check available options
        const options = await page.$$eval('#megatron-week-selector option',
          options => options.map(option => ({ value: option.value, text: option.textContent }))
        );

        console.log('📅 Available week options:');
        options.forEach(option => {
          if (option.value) {
            console.log(`   ${option.text}`);
          }
        });

        // Verify only Week 1-2 are available
        const hasWeek3 = options.some(opt => opt.value === '3');
        if (hasWeek3) {
          console.log('❌ ERROR: Week 3+ options still present (should be removed)');
        } else {
          console.log('✅ Week validation working - only Weeks 1-2 available');
        }
      } else {
        console.log('❌ Week selector not found');
      }

    } else {
      console.log('❌ MEGATRON dashboard not found');
    }

    // Keep browser open for manual inspection
    console.log('\n🎯 Browser kept open for manual inspection...');
    console.log('📋 Manual checklist:');
    console.log('   1. Does MEGATRON show real data (49 Week 1, 44 Week 2)?');
    console.log('   2. Are console errors resolved?');
    console.log('   3. Does CSV export work?');
    console.log('   4. Only Weeks 1-2 in dropdown?');
    console.log('\nPress Ctrl+C when done inspecting...');

    // Wait indefinitely for manual inspection
    await new Promise(() => {});

  } catch (error) {
    console.error('💥 TEST ERROR:', error);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  testLiveAdminDashboard().catch(error => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { testLiveAdminDashboard };