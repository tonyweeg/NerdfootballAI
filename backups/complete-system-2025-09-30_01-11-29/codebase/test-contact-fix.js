const puppeteer = require('puppeteer');

async function testContactFormFix() {
    console.log('🧪 Testing Contact Form Fix...\n');

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    const consoleErrors = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    try {
        console.log('🌐 Navigating to site...');
        await page.goto('https://nerdfootball.web.app', { waitUntil: 'networkidle2' });

        console.log('⏳ Waiting for scripts to load...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('🖱️ Opening contact form...');
        await page.click('#contact-footer-link');
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('📝 Filling out form...');
        await page.type('#contact-name', 'Test User Bug Fix');
        await page.type('#contact-email', 'test@example.com');
        await page.type('#contact-subject', 'Testing Bug Fix for All Fields Required Error');
        await page.type('#contact-message', 'This is a test to verify that the contact form data extraction fix works correctly. The form should now properly extract data from Firebase Functions v2 format.');

        console.log('📤 Submitting form...');

        // Clear console errors before submission
        consoleErrors.length = 0;

        await page.click('#contact-submit-btn');

        // Wait for submission response
        await new Promise(resolve => setTimeout(resolve, 8000));

        // Check for the "All fields are required" error
        const allFieldsError = consoleErrors.find(error =>
            error.includes('All fields are required')
        );

        const formErrorElement = await page.$('#contact-form-error:not(.hidden)');
        let formErrorText = '';
        if (formErrorElement) {
            formErrorText = await page.evaluate(el => el.textContent, formErrorElement);
        }

        console.log('\n📊 Test Results:');
        console.log('================');

        if (allFieldsError) {
            console.log('❌ Still getting "All fields are required" error:', allFieldsError);
        } else {
            console.log('✅ No "All fields are required" error found');
        }

        if (formErrorText.includes('All fields are required')) {
            console.log('❌ Form still showing "All fields are required" error:', formErrorText);
        } else if (formErrorText.includes('✓')) {
            console.log('✅ Form submitted successfully:', formErrorText);
        } else if (formErrorText.includes('unauthenticated')) {
            console.log('ℹ️ Form requires authentication (expected for anonymous users):', formErrorText);
        } else if (formErrorText) {
            console.log('ℹ️ Form showed other error:', formErrorText);
        } else {
            console.log('✅ Form submitted without "All fields are required" error');
        }

        const isFixed = !allFieldsError && !formErrorText.includes('All fields are required');
        console.log(`\n🎯 Bug Status: ${isFixed ? '✅ FIXED' : '❌ STILL BROKEN'}`);

        if (consoleErrors.length > 0) {
            console.log('\n⚠️ Console Errors:');
            consoleErrors.forEach(error => console.log(`   - ${error}`));
        }

        return isFixed;

    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    } finally {
        await browser.close();
    }
}

testContactFormFix().then((success) => {
    console.log(success ? '\n🎉 Contact form bug is FIXED!' : '\n😞 Contact form bug still exists');
    process.exit(success ? 0 : 1);
});