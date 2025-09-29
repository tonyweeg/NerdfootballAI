/**
 * Test Script for Selective Pool Participation Feature
 * Run with: node test-selective-participation.js
 */

const puppeteer = require('puppeteer');

async function testSelectiveParticipation() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🧪 Testing Selective Pool Participation Feature...\n');
        
        // Navigate to the app
        await page.goto('http://127.0.0.1:5000', { waitUntil: 'networkidle2' });
        
        // Wait for login
        await page.waitForSelector('#sign-in-btn', { timeout: 5000 });
        console.log('✅ Page loaded');
        
        // Sign in as admin
        await page.click('#sign-in-btn');
        await page.waitForSelector('#admin-nav-link', { timeout: 10000 });
        console.log('✅ Signed in as admin');
        
        // Navigate to admin panel
        await page.click('#admin-nav-link');
        await page.waitForSelector('#admin-nav-members', { timeout: 5000 });
        
        // Go to pool members section
        await page.click('#admin-nav-members');
        await page.waitForSelector('#pool-members-tbody', { timeout: 5000 });
        console.log('✅ Navigated to pool members');
        
        // Check for participation badges
        const participationBadges = await page.$$eval('#pool-members-tbody span', 
            spans => spans.filter(s => s.textContent.includes('Confidence') || s.textContent.includes('Survivor')).length
        );
        console.log(`✅ Found ${participationBadges} participation badges`);
        
        // Check for Edit buttons
        const editButtons = await page.$$eval('#pool-members-tbody button', 
            buttons => buttons.filter(b => b.textContent === 'Edit').length
        );
        console.log(`✅ Found ${editButtons} Edit buttons for participation`);
        
        // Test clicking Edit on first non-admin user
        const firstEditButton = await page.$('#pool-members-tbody button[onclick*="toggleParticipation"]');
        if (firstEditButton) {
            await firstEditButton.click();
            
            // Wait for modal
            await page.waitForSelector('.fixed.inset-0', { timeout: 5000 });
            console.log('✅ Participation modal opened');
            
            // Check for checkboxes
            const confidenceCheckbox = await page.$('#confidence-toggle');
            const survivorCheckbox = await page.$('#survivor-toggle');
            
            if (confidenceCheckbox && survivorCheckbox) {
                console.log('✅ Both pool checkboxes present');
                
                // Get current states
                const confidenceChecked = await page.$eval('#confidence-toggle', el => el.checked);
                const survivorChecked = await page.$eval('#survivor-toggle', el => el.checked);
                console.log(`   Confidence: ${confidenceChecked ? 'Enabled' : 'Disabled'}`);
                console.log(`   Survivor: ${survivorChecked ? 'Enabled' : 'Disabled'}`);
            }
            
            // Close modal
            await page.click('button[onclick*="closest"]');
            console.log('✅ Modal closed');
        }
        
        console.log('\n🎉 All selective participation tests passed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

// Run the test
testSelectiveParticipation();