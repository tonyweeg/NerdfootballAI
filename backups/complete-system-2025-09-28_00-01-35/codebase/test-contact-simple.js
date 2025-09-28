const puppeteer = require('puppeteer');

async function testContactForm() {
    console.log('🧪 Testing Contact Form on Live Site...\n');

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // Navigate to the site
        await page.goto('https://nerdfootball.web.app', { waitUntil: 'networkidle2' });

        // Wait for scripts to load
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check if contact link exists
        console.log('🔍 Looking for contact link...');
        const contactLink = await page.$('#contact-footer-link');

        if (contactLink) {
            console.log('✅ Contact link found!');

            // Click the link
            console.log('🖱️  Clicking contact link...');
            await page.click('#contact-footer-link');

            // Wait for modal
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check if modal opened
            const modal = await page.$('#contact-modal:not(.hidden)');
            if (modal) {
                console.log('✅ Contact modal opened successfully!');

                // Check form fields
                const formElements = await page.evaluate(() => {
                    return {
                        nameField: !!document.getElementById('contact-name'),
                        emailField: !!document.getElementById('contact-email'),
                        subjectField: !!document.getElementById('contact-subject'),
                        messageField: !!document.getElementById('contact-message'),
                        submitButton: !!document.getElementById('contact-submit-btn')
                    };
                });

                console.log('📋 Form elements:', formElements);

                const allFieldsPresent = Object.values(formElements).every(field => field);
                if (allFieldsPresent) {
                    console.log('✅ All form fields present!');
                    console.log('🎉 Contact form is working correctly!');
                } else {
                    console.log('❌ Some form fields are missing');
                }
            } else {
                console.log('❌ Contact modal did not open');
            }
        } else {
            console.log('❌ Contact link not found - checking what loaded...');

            // Check if contactForm.js loaded
            const contactFormLoaded = await page.evaluate(() => {
                return typeof window.ContactForm !== 'undefined';
            });

            console.log('ContactForm class loaded:', contactFormLoaded);

            // Check what's in the features bundle
            const featuresBundleLoaded = await page.evaluate(() => {
                return document.querySelector('script[src*="features-bundle.js"]') !== null;
            });

            console.log('Features bundle script tag present:', featuresBundleLoaded);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

testContactForm();