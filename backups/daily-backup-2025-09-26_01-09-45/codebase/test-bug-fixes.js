const puppeteer = require('puppeteer');

async function testBugFixes() {
    console.log('🐛 Testing Bug Fixes on Live Site...\n');

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    const consoleErrors = [];
    const jsErrors = [];

    // Capture console errors
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    // Capture JavaScript errors
    page.on('pageerror', (error) => {
        jsErrors.push(error.message);
    });

    try {
        console.log('🌐 Navigating to site...');
        await page.goto('https://nerdfootball.web.app', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for scripts to load and check for errors
        console.log('⏳ Waiting for scripts to load...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Test 1: Check for SimpleSurvivorSystem error
        console.log('🧪 Test 1: Checking for SimpleSurvivorSystem duplicate declaration error...');
        const simpleSurvivorSystemError = consoleErrors.find(error =>
            error.includes('SimpleSurvivorSystem') && error.includes('already been declared')
        );

        if (simpleSurvivorSystemError) {
            console.log('❌ SimpleSurvivorSystem error still present:', simpleSurvivorSystemError);
        } else {
            console.log('✅ No SimpleSurvivorSystem duplicate declaration error found');
        }

        // Test 2: Test contact form functionality
        console.log('\n🧪 Test 2: Testing contact form Firebase Functions...');

        // Open contact form
        await page.click('#contact-footer-link');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Fill form with test data
        await page.type('#contact-name', 'Test User');
        await page.type('#contact-email', 'test@example.com');
        await page.type('#contact-subject', 'Test Bug Fix');
        await page.type('#contact-message', 'Testing that Firebase Functions are properly available.');

        // Clear previous errors
        consoleErrors.length = 0;
        jsErrors.length = 0;

        // Submit form
        console.log('📤 Submitting contact form...');
        await page.click('#contact-submit-btn');

        // Wait for submission to complete
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check for Firebase Functions error
        const firebaseFunctionsError = consoleErrors.find(error =>
            error.includes('Firebase Functions not available')
        );

        if (firebaseFunctionsError) {
            console.log('❌ Firebase Functions error still present:', firebaseFunctionsError);
        } else {
            console.log('✅ No Firebase Functions error found');
        }

        // Check if form submission worked (success or proper error handling)
        const formErrorElement = await page.$('#contact-form-error:not(.hidden)');
        let formErrorText = '';
        if (formErrorElement) {
            formErrorText = await page.evaluate(el => el.textContent, formErrorElement);
        }

        if (formErrorText.includes('Firebase Functions not available')) {
            console.log('❌ Contact form showing Firebase Functions error:', formErrorText);
        } else if (formErrorText.includes('✓')) {
            console.log('✅ Contact form submitted successfully:', formErrorText);
        } else if (formErrorText) {
            console.log('ℹ️ Contact form showed error (this may be expected):', formErrorText);
        } else {
            console.log('✅ Contact form processed without Firebase Functions error');
        }

        // Summary
        console.log('\n📊 Bug Fix Test Results:');
        console.log('========================');
        console.log(`SimpleSurvivorSystem Fix: ${!simpleSurvivorSystemError ? '✅ FIXED' : '❌ STILL BROKEN'}`);
        console.log(`Firebase Functions Fix: ${!firebaseFunctionsError ? '✅ FIXED' : '❌ STILL BROKEN'}`);

        if (consoleErrors.length > 0) {
            console.log('\n⚠️ Other Console Errors Found:');
            consoleErrors.forEach(error => console.log(`   - ${error}`));
        }

        if (jsErrors.length > 0) {
            console.log('\n❌ JavaScript Errors Found:');
            jsErrors.forEach(error => console.log(`   - ${error}`));
        }

        const allFixed = !simpleSurvivorSystemError && !firebaseFunctionsError;
        console.log(`\n🎯 Overall Status: ${allFixed ? '✅ ALL BUGS FIXED' : '❌ SOME ISSUES REMAIN'}`);

        return allFixed;

    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    } finally {
        await browser.close();
    }
}

testBugFixes().then((success) => {
    process.exit(success ? 0 : 1);
});