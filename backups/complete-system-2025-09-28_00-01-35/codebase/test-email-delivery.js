const puppeteer = require('puppeteer');

async function testEmailDelivery() {
    console.log('📧 Testing Live Email Delivery with Gmail SMTP...\n');

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    try {
        console.log('🌐 Navigating to site...');
        await page.goto('https://nerdfootball.web.app', { waitUntil: 'networkidle2' });

        console.log('⏳ Waiting for Firebase to initialize...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        console.log('🖱️ Opening contact form...');
        await page.click('#contact-footer-link');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const testTimestamp = new Date().toLocaleString();

        console.log('📝 Filling out form for email delivery test...');
        await page.type('#contact-name', 'Email Delivery Test');
        await page.type('#contact-email', 'test.email.delivery@example.com');
        await page.type('#contact-subject', 'Testing Gmail SMTP Email Delivery');
        await page.type('#contact-message', `This is a test to verify that Gmail SMTP is working correctly and emails are being delivered to pool administrators.

Test Details:
- Timestamp: ${testTimestamp}
- Testing: Dynamic pool admin email routing
- Expected: Email should be sent to pool administrators
- Gmail SMTP: Recently configured and deployed

If you receive this email, the contact form is working perfectly!`);

        console.log('📤 Submitting form to test live email delivery...');

        await page.click('#contact-submit-btn');

        // Wait for submission to complete
        await new Promise(resolve => setTimeout(resolve, 12000));

        // Check form response
        const formErrorElement = await page.$('#contact-form-error:not(.hidden)');
        let formResponseText = '';
        if (formErrorElement) {
            formResponseText = await page.evaluate(el => el.textContent, formErrorElement);
        }

        console.log('\n📊 Email Delivery Test Results:');
        console.log('==================================');

        if (formResponseText.includes('✓') || formResponseText.includes('success')) {
            console.log('✅ Contact form submitted successfully');
            console.log(`✅ Response: ${formResponseText}`);
            console.log('📧 Gmail SMTP should have sent emails to pool administrators');
        } else if (formResponseText.includes('unauthenticated')) {
            console.log('ℹ️ Form submitted (anonymous user)');
            console.log('📧 Should route to default pool administrators');
        } else if (formResponseText) {
            console.log('⚠️ Form response:', formResponseText);
        } else {
            console.log('✅ Form submitted without client errors');
            console.log('📧 Check pool administrator emails for delivery confirmation');
        }

        console.log('\n📧 Expected Email Delivery:');
        console.log('- Recipients: Pool administrators (dynamic routing)');
        console.log('- Subject: "Contact Form from nerduniverse-2025: Testing Gmail SMTP Email Delivery"');
        console.log('- From: NerdFootball Contact Form <tonyweeg@gmail.com>');
        console.log('- User Confirmation: Sent to test.email.delivery@example.com');

        console.log('\n🔍 To Verify:');
        console.log('1. Check administrator email inbox for contact form notification');
        console.log('2. Check Firebase Functions logs for email delivery status');
        console.log('3. Verify dynamic pool admin routing worked correctly');

        return true;

    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    } finally {
        await browser.close();
    }
}

testEmailDelivery().then((success) => {
    console.log(success ? '\n🎉 Email delivery test completed - check administrator emails!' : '\n😞 Test encountered issues');
    process.exit(success ? 0 : 1);
});