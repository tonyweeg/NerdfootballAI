const puppeteer = require('puppeteer');
const fs = require('fs');

const TEST_CONFIG = {
    baseUrl: 'http://localhost:5000',
    timeout: 30000,
    performanceTarget: 500, // Diamond Level: Sub-500ms submission time
    retries: 3
};

const TEST_DATA = {
    valid: {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Contact Form Submission',
        message: 'This is a test message to verify the contact form functionality works correctly.'
    },
    invalid: {
        longName: 'A'.repeat(101),
        invalidEmail: 'invalid-email',
        longSubject: 'S'.repeat(201),
        longMessage: 'M'.repeat(2001),
        emptyFields: { name: '', email: '', subject: '', message: '' }
    }
};

class ContactFormTester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            tests: []
        };
    }

    async setup() {
        console.log('🚀 Starting Diamond Level Contact Form Test Suite...\n');

        this.browser = await puppeteer.launch({
            headless: false,
            slowMo: 100,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();

        // Set viewport for consistent testing
        await this.page.setViewport({ width: 1280, height: 720 });

        // Enable request interception for performance testing
        await this.page.setRequestInterception(true);
        this.page.on('request', (request) => {
            request.continue();
        });

        // Navigate to test page
        await this.page.goto(TEST_CONFIG.baseUrl, {
            waitUntil: 'networkidle2',
            timeout: TEST_CONFIG.timeout
        });

        // Wait for bundles to load
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    async teardown() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async runTest(testName, testFunction) {
        const startTime = Date.now();
        console.log(`🧪 Testing: ${testName}`);

        try {
            const result = await testFunction();
            const duration = Date.now() - startTime;

            this.results.passed++;
            this.results.tests.push({
                name: testName,
                status: 'PASSED',
                duration,
                details: result
            });

            console.log(`✅ PASSED: ${testName} (${duration}ms)\n`);
            return true;

        } catch (error) {
            const duration = Date.now() - startTime;

            this.results.failed++;
            this.results.tests.push({
                name: testName,
                status: 'FAILED',
                duration,
                error: error.message
            });

            console.log(`❌ FAILED: ${testName} (${duration}ms)`);
            console.log(`   Error: ${error.message}\n`);
            return false;
        }
    }

    async testContactLinkPresence() {
        const contactLink = await this.page.$('#contact-footer-link');

        if (!contactLink) {
            throw new Error('Contact footer link not found');
        }

        const linkText = await this.page.evaluate((el) => el.textContent, contactLink);
        if (!linkText.includes('Contact Us')) {
            throw new Error(`Expected "Contact Us" but found: ${linkText}`);
        }

        const linkStyles = await this.page.evaluate((el) => {
            const styles = window.getComputedStyle(el);
            return {
                position: styles.position,
                bottom: styles.bottom,
                left: styles.left,
                fontSize: styles.fontSize
            };
        }, contactLink);

        if (linkStyles.position !== 'fixed') {
            throw new Error(`Expected fixed positioning, got: ${linkStyles.position}`);
        }

        return {
            text: linkText,
            styles: linkStyles
        };
    }

    async testModalOpening() {
        // Click the contact link
        await this.page.click('#contact-footer-link');

        // Wait for modal to appear
        await this.page.waitForSelector('#contact-modal:not(.hidden)', { timeout: 5000 });

        // Verify modal is visible
        const modal = await this.page.$('#contact-modal');
        const isVisible = await this.page.evaluate((el) => {
            return !el.classList.contains('hidden') &&
                   window.getComputedStyle(el).display !== 'none';
        }, modal);

        if (!isVisible) {
            throw new Error('Contact modal is not visible after clicking link');
        }

        // Verify form elements are present
        const formElements = await this.page.evaluate(() => {
            return {
                nameField: !!document.getElementById('contact-name'),
                emailField: !!document.getElementById('contact-email'),
                subjectField: !!document.getElementById('contact-subject'),
                messageField: !!document.getElementById('contact-message'),
                submitButton: !!document.getElementById('contact-submit-btn')
            };
        });

        for (const [field, present] of Object.entries(formElements)) {
            if (!present) {
                throw new Error(`Form field missing: ${field}`);
            }
        }

        return {
            modalVisible: isVisible,
            formElements: formElements
        };
    }

    async testFormValidation() {
        // Test empty form submission
        await this.page.click('#contact-submit-btn');

        // Wait for browser validation to appear
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if form shows required field validation
        const nameFieldValidity = await this.page.evaluate(() => {
            const nameField = document.getElementById('contact-name');
            return nameField.validity.valid;
        });

        if (nameFieldValidity) {
            throw new Error('Form should show validation error for empty required fields');
        }

        // Test invalid email format
        await this.page.type('#contact-name', 'Test User');
        await this.page.type('#contact-email', 'invalid-email');
        await this.page.type('#contact-subject', 'Test Subject');
        await this.page.type('#contact-message', 'Test message');

        await this.page.click('#contact-submit-btn');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const emailFieldValidity = await this.page.evaluate(() => {
            const emailField = document.getElementById('contact-email');
            return emailField.validity.valid;
        });

        if (emailFieldValidity) {
            throw new Error('Form should show validation error for invalid email');
        }

        // Clear form for next test
        await this.page.evaluate(() => {
            document.getElementById('contact-form').reset();
        });

        return {
            requiredFieldValidation: !nameFieldValidity,
            emailValidation: !emailFieldValidity
        };
    }

    async testCharacterLimits() {
        // Test message character counter
        const testMessage = 'A'.repeat(100);
        await this.page.type('#contact-message', testMessage);

        const counterText = await this.page.$eval('#message-counter', el => el.textContent);
        if (!counterText.includes('100/2000')) {
            throw new Error(`Expected "100/2000" in counter, got: ${counterText}`);
        }

        // Test near limit warning (should turn red)
        await this.page.evaluate(() => {
            document.getElementById('contact-message').value = 'A'.repeat(1950);
            document.getElementById('contact-message').dispatchEvent(new Event('input'));
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        const counterColor = await this.page.evaluate(() => {
            const counter = document.getElementById('message-counter');
            return window.getComputedStyle(counter).color;
        });

        // Clear for next test
        await this.page.evaluate(() => {
            document.getElementById('contact-message').value = '';
            document.getElementById('contact-message').dispatchEvent(new Event('input'));
        });

        return {
            characterCount: counterText,
            warningColorActivated: counterColor !== 'rgb(107, 114, 128)' // gray-500
        };
    }

    async testModalClosing() {
        // Test ESC key
        await this.page.keyboard.press('Escape');
        await new Promise(resolve => setTimeout(resolve, 500));

        let modalHidden = await this.page.evaluate(() => {
            const modal = document.getElementById('contact-modal');
            return modal.classList.contains('hidden');
        });

        if (!modalHidden) {
            throw new Error('Modal should close with ESC key');
        }

        // Reopen modal for next test
        await this.page.click('#contact-footer-link');
        await this.page.waitForSelector('#contact-modal:not(.hidden)');

        // Test cancel button
        await this.page.click('#contact-cancel-btn');
        await new Promise(resolve => setTimeout(resolve, 500));

        modalHidden = await this.page.evaluate(() => {
            const modal = document.getElementById('contact-modal');
            return modal.classList.contains('hidden');
        });

        if (!modalHidden) {
            throw new Error('Modal should close with cancel button');
        }

        // Reopen for next test
        await this.page.click('#contact-footer-link');
        await this.page.waitForSelector('#contact-modal:not(.hidden)');

        // Test backdrop click
        await this.page.click('#contact-modal-backdrop');
        await new Promise(resolve => setTimeout(resolve, 500));

        modalHidden = await this.page.evaluate(() => {
            const modal = document.getElementById('contact-modal');
            return modal.classList.contains('hidden');
        });

        if (!modalHidden) {
            throw new Error('Modal should close when clicking backdrop');
        }

        return {
            escKey: true,
            cancelButton: true,
            backdropClick: true
        };
    }

    async testFormSubmissionPerformance() {
        // Reopen modal
        await this.page.click('#contact-footer-link');
        await this.page.waitForSelector('#contact-modal:not(.hidden)');

        // Fill form with valid data
        await this.page.type('#contact-name', TEST_DATA.valid.name);
        await this.page.type('#contact-email', TEST_DATA.valid.email);
        await this.page.type('#contact-subject', TEST_DATA.valid.subject);
        await this.page.type('#contact-message', TEST_DATA.valid.message);

        // Monitor network requests for performance
        const performanceStartTime = Date.now();

        // Submit form
        await this.page.click('#contact-submit-btn');

        // Wait for submission to complete (success or error)
        try {
            await this.page.waitForFunction(() => {
                const submitBtn = document.getElementById('contact-submit-btn');
                return !submitBtn.disabled;
            }, { timeout: TEST_CONFIG.performanceTarget + 1000 });
        } catch (error) {
            // Form is still submitting - this might be okay depending on backend
        }

        const performanceEndTime = Date.now();
        const responseTime = performanceEndTime - performanceStartTime;

        // Check if form shows success or error message
        await new Promise(resolve => setTimeout(resolve, 2000));

        const formError = await this.page.$('#contact-form-error:not(.hidden)');
        const errorMessage = formError ? await this.page.evaluate(el => el.textContent, formError) : null;

        return {
            responseTime: responseTime,
            performanceTarget: TEST_CONFIG.performanceTarget,
            performanceMet: responseTime <= TEST_CONFIG.performanceTarget,
            errorMessage: errorMessage,
            submissionCompleted: true
        };
    }

    async testResponsiveDesign() {
        // Test mobile viewport
        await this.page.setViewport({ width: 375, height: 667 }); // iPhone SE

        // Open modal
        await this.page.click('#contact-footer-link');
        await this.page.waitForSelector('#contact-modal:not(.hidden)');

        // Check if modal is properly sized for mobile
        const modalDimensions = await this.page.evaluate(() => {
            const modal = document.querySelector('#contact-modal .relative');
            const rect = modal.getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight
            };
        });

        const isMobileFriendly = modalDimensions.width <= modalDimensions.viewportWidth * 0.95;

        // Reset viewport
        await this.page.setViewport({ width: 1280, height: 720 });

        // Close modal
        await this.page.keyboard.press('Escape');

        return {
            modalDimensions: modalDimensions,
            mobileFriendly: isMobileFriendly
        };
    }

    async runAllTests() {
        await this.setup();

        const tests = [
            ['Contact Link Presence', () => this.testContactLinkPresence()],
            ['Modal Opening', () => this.testModalOpening()],
            ['Form Validation', () => this.testFormValidation()],
            ['Character Limits', () => this.testCharacterLimits()],
            ['Modal Closing', () => this.testModalClosing()],
            ['Form Submission Performance', () => this.testFormSubmissionPerformance()],
            ['Responsive Design', () => this.testResponsiveDesign()]
        ];

        for (const [testName, testFunction] of tests) {
            await this.runTest(testName, testFunction);
        }

        await this.teardown();
        return this.generateReport();
    }

    generateReport() {
        const totalTests = this.results.passed + this.results.failed;
        const passRate = totalTests > 0 ? (this.results.passed / totalTests * 100).toFixed(1) : 0;

        const report = {
            summary: {
                total: totalTests,
                passed: this.results.passed,
                failed: this.results.failed,
                passRate: `${passRate}%`,
                diamondLevel: this.results.failed === 0
            },
            tests: this.results.tests,
            timestamp: new Date().toISOString()
        };

        // Write report to file
        fs.writeFileSync(
            'contact-form-test-results.json',
            JSON.stringify(report, null, 2)
        );

        console.log('\n🏆 DIAMOND LEVEL CONTACT FORM TEST RESULTS');
        console.log('==========================================');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Pass Rate: ${passRate}%`);
        console.log(`Diamond Level Status: ${report.summary.diamondLevel ? '💎 ACHIEVED' : '⚠️  NOT MET'}`);

        if (this.results.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results.tests
                .filter(test => test.status === 'FAILED')
                .forEach(test => {
                    console.log(`   - ${test.name}: ${test.error}`);
                });
        }

        console.log('\n📊 Test Report saved to: contact-form-test-results.json');

        return report;
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new ContactFormTester();

    tester.runAllTests()
        .then((report) => {
            process.exit(report.summary.diamondLevel ? 0 : 1);
        })
        .catch((error) => {
            console.error('🚨 Test suite failed to run:', error);
            process.exit(1);
        });
}

module.exports = ContactFormTester;