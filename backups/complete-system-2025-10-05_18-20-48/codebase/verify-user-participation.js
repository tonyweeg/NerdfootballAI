/**
 * Verify that user XAEvbGQ77bWsbo9WuTkJhdMUIAH2 is only in survivor pool
 */

const puppeteer = require('puppeteer');

async function verifyUserParticipation() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null 
    });
    
    const page = await browser.newPage();
    const targetUserId = 'XAEvbGQ77bWsbo9WuTkJhdMUIAH2';
    
    try {
        console.log('🔍 Verifying user participation for:', targetUserId);
        console.log('Expected: Survivor ✅, Confidence ❌\n');
        
        // Navigate to the app
        await page.goto('http://127.0.0.1:5000', { waitUntil: 'networkidle2' });
        
        // Wait for and click sign in
        await page.waitForSelector('#sign-in-btn', { timeout: 5000 });
        await page.click('#sign-in-btn');
        
        // Wait for app to load
        await page.waitForSelector('#hamburger-menu', { timeout: 10000 });
        console.log('✅ Signed in successfully');
        
        // Open hamburger menu
        await page.click('#hamburger-menu');
        await page.waitForSelector('#admin-nav-link', { timeout: 5000 });
        
        // Navigate to admin
        await page.click('#admin-nav-link');
        await page.waitForSelector('#admin-nav-members', { timeout: 5000 });
        
        // Go to pool members
        await page.click('#admin-nav-members');
        await page.waitForSelector('#pool-members-tbody', { timeout: 5000 });
        console.log('✅ Navigated to Pool Members\n');
        
        // Check in console for the user's participation
        const userParticipation = await page.evaluate((userId) => {
            // Look for the user in the table
            const rows = document.querySelectorAll('#pool-members-tbody tr');
            for (const row of rows) {
                const text = row.textContent;
                if (text && text.includes(userId)) {
                    // Found the user row
                    const badges = row.querySelectorAll('span');
                    const participation = {
                        confidence: false,
                        survivor: false,
                        found: true,
                        rowText: text
                    };
                    
                    badges.forEach(badge => {
                        const badgeText = badge.textContent;
                        const hasStrikethrough = badge.classList.contains('line-through');
                        
                        if (badgeText.includes('Confidence')) {
                            participation.confidence = !hasStrikethrough;
                            participation.confidenceBadge = badgeText;
                        }
                        if (badgeText.includes('Survivor')) {
                            participation.survivor = !hasStrikethrough;
                            participation.survivorBadge = badgeText;
                        }
                    });
                    
                    return participation;
                }
            }
            return { found: false };
        }, targetUserId);
        
        if (!userParticipation.found) {
            // Try finding by looking at the actual Firebase data
            const checkResult = await page.evaluate(async () => {
                if (typeof poolParticipationManager !== 'undefined' && poolParticipationManager.initialized) {
                    const members = await poolParticipationManager.getPoolMembers();
                    return Object.entries(members).map(([uid, data]) => ({
                        uid,
                        name: data.displayName || data.email,
                        confidence: data.participation?.confidence?.enabled,
                        survivor: data.participation?.survivor?.enabled
                    }));
                }
                return null;
            });
            
            if (checkResult) {
                const targetUser = checkResult.find(u => u.uid === targetUserId);
                if (targetUser) {
                    console.log('📊 Found user in Firebase data:');
                    console.log(`   Name: ${targetUser.name}`);
                    console.log(`   Confidence: ${targetUser.confidence ? '✅ ENABLED' : '❌ DISABLED'}`);
                    console.log(`   Survivor: ${targetUser.survivor ? '✅ ENABLED' : '❌ DISABLED'}`);
                    
                    if (!targetUser.confidence && targetUser.survivor) {
                        console.log('\n✅ SUCCESS! User is correctly set to Survivor-only!');
                    } else {
                        console.log('\n❌ ISSUE: User participation not set correctly');
                        console.log('   Expected: Confidence ❌, Survivor ✅');
                        console.log(`   Actual: Confidence ${targetUser.confidence ? '✅' : '❌'}, Survivor ${targetUser.survivor ? '✅' : '❌'}`);
                    }
                }
            }
        } else {
            console.log('📊 User found in Pool Members table:');
            console.log(`   Confidence: ${userParticipation.confidence ? '✅ ENABLED' : '❌ DISABLED'}`);
            console.log(`   Survivor: ${userParticipation.survivor ? '✅ ENABLED' : '❌ DISABLED'}`);
            
            if (!userParticipation.confidence && userParticipation.survivor) {
                console.log('\n✅ SUCCESS! User is correctly set to Survivor-only!');
            } else {
                console.log('\n❌ ISSUE: User participation not set correctly');
            }
        }
        
        // Now check if user appears in confidence leaderboard
        await page.click('#hamburger-menu');
        await page.waitForSelector('#confidence-nav-link', { timeout: 5000 });
        await page.click('#confidence-nav-link');
        
        await page.waitForTimeout(2000); // Wait for leaderboard to load
        
        const inConfidenceLeaderboard = await page.evaluate((userId) => {
            const leaderboardText = document.body.textContent;
            return leaderboardText.includes(userId);
        }, targetUserId);
        
        console.log(`\n🏆 Confidence Leaderboard: User ${inConfidenceLeaderboard ? '⚠️ FOUND (should not be)' : '✅ NOT FOUND (correct)'}`);
        
        // Check survivor pool
        await page.click('#hamburger-menu');
        await page.waitForSelector('#survivor-nav-link', { timeout: 5000 });
        await page.click('#survivor-nav-link');
        
        await page.waitForTimeout(2000); // Wait for survivor table to load
        
        const inSurvivorPool = await page.evaluate((userId) => {
            const survivorText = document.body.textContent;
            return survivorText.includes(userId);
        }, targetUserId);
        
        console.log(`🛡️ Survivor Pool: User ${inSurvivorPool ? '✅ FOUND (correct)' : '⚠️ NOT FOUND (should be)'}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        console.log('\nPress Ctrl+C to close browser and exit');
        // Keep browser open for manual inspection
        await new Promise(() => {});
    }
}

verifyUserParticipation();