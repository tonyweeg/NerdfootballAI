#!/usr/bin/env node

const puppeteer = require('puppeteer');

// Test configuration for local emulator
const LOCAL_HOST = 'http://localhost:5002';
const TEST_TIMEOUT = 30000;

// Test users from local-data-import.js
const TEST_USERS = {
  MULTI_ENTRY: { email: 'tony@test.com', uid: 'test-user-1' },
  SINGLE_ENTRY: { email: 'mike@test.com', uid: 'test-user-2' },
  ADMIN: { email: 'sarah@test.com', uid: 'test-user-3' }
};

class MultiEntryTestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
  }

  async setup() {
    console.log('🚀 Starting Multi-Entry Local Test Suite...');
    
    this.browser = await puppeteer.launch({ 
      headless: false, // Set to true for CI
      defaultViewport: { width: 1280, height: 720 }
    });
    
    this.page = await this.browser.newPage();
    
    // Configure for emulator
    await this.page.evaluateOnNewDocument(() => {
      window.FIREBASE_CONFIG = {
        useEmulator: true,
        emulatorConfig: {
          auth: ['localhost', 9099],
          firestore: ['localhost', 8080]
        }
      };
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running: ${testName}`);
    try {
      await testFunction();
      console.log(`✅ PASSED: ${testName}`);
      this.testResults.push({ name: testName, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ FAILED: ${testName}`);
      console.error(`   Error: ${error.message}`);
      this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  async signInTestUser(userEmail) {
    // Navigate to app
    await this.page.goto(LOCAL_HOST);
    await this.page.waitForTimeout(2000);

    // Check if already signed in
    const signedInUser = await this.page.$('#user-info');
    if (signedInUser) {
      const currentUser = await this.page.$eval('#user-info', el => el.textContent);
      if (currentUser.includes(userEmail)) {
        console.log(`   Already signed in as: ${userEmail}`);
        return;
      }
      
      // Sign out first
      await this.page.click('#sign-out-btn');
      await this.page.waitForTimeout(1000);
    }

    // Sign in with test user (emulator allows any email/password)
    const signInBtn = await this.page.$('#sign-in-btn');
    if (signInBtn) {
      await this.page.click('#sign-in-btn');
      await this.page.waitForTimeout(1000);
      
      // Fill in email and password (emulator accepts any values)
      await this.page.type('#email-input', userEmail);
      await this.page.type('#password-input', 'testpassword');
      await this.page.click('#sign-in-submit');
      await this.page.waitForTimeout(2000);
    }
  }

  // Test 1: Basic App Loading
  async testAppLoadsWithEmulator() {
    await this.page.goto(LOCAL_HOST);
    await this.page.waitForSelector('#app', { timeout: 10000 });
    
    const title = await this.page.title();
    if (!title.includes('NerdFootball')) {
      throw new Error('App title not found or incorrect');
    }
  }

  // Test 2: Feature Flag Detection
  async testFeatureFlagDetection() {
    await this.signInTestUser(TEST_USERS.MULTI_ENTRY.email);
    
    // Check if multi-entry features are detected
    const multiEntryEnabled = await this.page.evaluate(() => {
      return window.featureFlags && window.featureFlags['multi-entry-survivor'];
    });
    
    if (!multiEntryEnabled) {
      throw new Error('Multi-entry feature flag not detected');
    }
  }

  // Test 3: Entry Selector UI for Multi-Entry User
  async testEntrySelectorUI() {
    await this.signInTestUser(TEST_USERS.MULTI_ENTRY.email);
    
    // Navigate to survivor section
    await this.page.click('button[onclick="showView(\'nerdSurvivor\')"]');
    await this.page.waitForTimeout(2000);
    
    // Check for entry selector
    const entrySelector = await this.page.$('#entry-selector');
    if (!entrySelector) {
      throw new Error('Entry selector not found for multi-entry user');
    }
    
    // Verify multiple entries are shown
    const entryOptions = await this.page.$$('#entry-selector option');
    if (entryOptions.length < 2) {
      throw new Error('Expected multiple entries in selector');
    }
  }

  // Test 4: Single Entry User Experience
  async testSingleEntryUserExperience() {
    await this.signInTestUser(TEST_USERS.SINGLE_ENTRY.email);
    
    // Navigate to survivor section
    await this.page.click('button[onclick="showView(\'nerdSurvivor\')"]');
    await this.page.waitForTimeout(2000);
    
    // Entry selector should not be visible
    const entrySelector = await this.page.$('#entry-selector');
    if (entrySelector) {
      const isVisible = await this.page.evaluate(el => 
        el.style.display !== 'none' && el.style.visibility !== 'hidden', entrySelector);
      
      if (isVisible) {
        throw new Error('Entry selector should not be visible for single-entry user');
      }
    }
  }

  // Test 5: Admin Entry Creation
  async testAdminEntryCreation() {
    await this.signInTestUser(TEST_USERS.MULTI_ENTRY.email); // Has admin powers
    
    // Navigate to admin section
    await this.page.click('button[onclick="showView(\'admin\')"]');
    await this.page.waitForTimeout(2000);
    
    // Check for admin entry management UI
    const adminEntrySection = await this.page.$('#admin-entry-management');
    if (!adminEntrySection) {
      throw new Error('Admin entry management section not found');
    }
    
    // Test creating a new entry
    await this.page.click('#create-entry-btn');
    await this.page.type('#new-entry-name', 'Test Admin Entry');
    await this.page.select('#entry-user-selector', TEST_USERS.SINGLE_ENTRY.uid);
    await this.page.click('#confirm-create-entry');
    
    await this.page.waitForTimeout(2000);
    
    // Verify success message or entry appears
    const successMsg = await this.page.$('.success-message');
    if (!successMsg) {
      throw new Error('Entry creation did not show success message');
    }
  }

  // Test 6: Entry Renaming
  async testEntryRenaming() {
    await this.signInTestUser(TEST_USERS.MULTI_ENTRY.email);
    
    // Navigate to survivor section
    await this.page.click('button[onclick="showView(\'nerdSurvivor\')"]');
    await this.page.waitForTimeout(2000);
    
    // Select an entry and rename it
    await this.page.select('#entry-selector', 'entry-1-main');
    await this.page.click('#rename-entry-btn');
    
    await this.page.type('#entry-name-input', ' - Renamed');
    await this.page.click('#save-entry-name');
    
    await this.page.waitForTimeout(1000);
    
    // Verify the rename was successful
    const updatedName = await this.page.$eval('#entry-selector option:checked', el => el.textContent);
    if (!updatedName.includes('Renamed')) {
      throw new Error('Entry rename did not update the display name');
    }
  }

  // Test 7: Entry Switching Functionality
  async testEntrySwitching() {
    await this.signInTestUser(TEST_USERS.MULTI_ENTRY.email);
    
    // Navigate to survivor section
    await this.page.click('button[onclick="showView(\'nerdSurvivor\')"]');
    await this.page.waitForTimeout(2000);
    
    // Get initial entry
    const initialEntry = await this.page.$eval('#entry-selector', el => el.value);
    
    // Switch to different entry
    const options = await this.page.$$eval('#entry-selector option', els => 
      els.map(el => el.value).filter(val => val !== initialEntry)
    );
    
    if (options.length === 0) {
      throw new Error('No alternative entries to switch to');
    }
    
    await this.page.select('#entry-selector', options[0]);
    await this.page.waitForTimeout(1000);
    
    // Verify the switch happened
    const currentEntry = await this.page.$eval('#entry-selector', el => el.value);
    if (currentEntry === initialEntry) {
      throw new Error('Entry switching did not work');
    }
  }

  // Test 8: Backward Compatibility
  async testBackwardCompatibility() {
    await this.signInTestUser(TEST_USERS.SINGLE_ENTRY.email);
    
    // Navigate to survivor section
    await this.page.click('button[onclick="showView(\'nerdSurvivor\')"]');
    await this.page.waitForTimeout(2000);
    
    // Verify survivor functionality still works for single-entry users
    const survivorContent = await this.page.$('#survivor-content');
    if (!survivorContent) {
      throw new Error('Survivor content not displayed for single-entry user');
    }
    
    // Check that picks interface is available
    const picksSection = await this.page.$('#survivor-picks');
    if (!picksSection) {
      throw new Error('Picks section not available for single-entry user');
    }
  }

  // Test 9: Data Consistency
  async testDataConsistency() {
    await this.signInTestUser(TEST_USERS.MULTI_ENTRY.email);
    
    // Navigate to survivor section
    await this.page.click('button[onclick="showView(\'nerdSurvivor\')"]');
    await this.page.waitForTimeout(2000);
    
    // Select first entry and check data
    const entries = await this.page.$$eval('#entry-selector option', els => 
      els.map(el => ({ value: el.value, text: el.textContent }))
    );
    
    for (const entry of entries) {
      await this.page.select('#entry-selector', entry.value);
      await this.page.waitForTimeout(1000);
      
      // Verify entry-specific data loads
      const entryData = await this.page.evaluate(() => window.currentEntry);
      if (!entryData || entryData.entryId !== entry.value) {
        throw new Error(`Data consistency issue for entry: ${entry.text}`);
      }
    }
  }

  // Test 10: Feature Flag Disabling
  async testFeatureFlagDisabling() {
    // This would require external script to disable flags
    console.log('   Note: Feature flag disabling should be tested manually with local-feature-flags.js');
    
    // Basic check that app still works when flags are disabled
    await this.signInTestUser(TEST_USERS.MULTI_ENTRY.email);
    
    const appContent = await this.page.$('#app');
    if (!appContent) {
      throw new Error('App not functional when feature flags disabled');
    }
  }

  async runAllTests() {
    await this.setup();
    
    try {
      await this.runTest('App Loads with Emulator', () => this.testAppLoadsWithEmulator());
      await this.runTest('Feature Flag Detection', () => this.testFeatureFlagDetection());
      await this.runTest('Entry Selector UI', () => this.testEntrySelectorUI());
      await this.runTest('Single Entry User Experience', () => this.testSingleEntryUserExperience());
      await this.runTest('Admin Entry Creation', () => this.testAdminEntryCreation());
      await this.runTest('Entry Renaming', () => this.testEntryRenaming());
      await this.runTest('Entry Switching', () => this.testEntrySwitching());
      await this.runTest('Backward Compatibility', () => this.testBackwardCompatibility());
      await this.runTest('Data Consistency', () => this.testDataConsistency());
      await this.runTest('Feature Flag Disabling', () => this.testFeatureFlagDisabling());
      
    } finally {
      await this.cleanup();
    }
    
    // Report results
    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 MULTI-ENTRY TEST RESULTS');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAILED')
        .forEach(r => console.log(`   - ${r.name}: ${r.error}`));
    }
    
    console.log('\n📋 Recommendations:');
    if (failed === 0) {
      console.log('✅ All tests passed! Multi-entry functionality ready for production.');
    } else {
      console.log('⚠️  Fix failed tests before production deployment.');
    }
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Address any failed tests');
    console.log('   2. Run manual testing scenarios');
    console.log('   3. Deploy to production with confidence');
    
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run tests if called directly
if (require.main === module) {
  const testSuite = new MultiEntryTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = MultiEntryTestSuite;