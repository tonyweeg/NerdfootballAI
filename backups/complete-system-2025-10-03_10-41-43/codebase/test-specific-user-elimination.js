// Test to specifically check if user BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2 should be eliminated
const puppeteer = require('puppeteer');

const PROBLEM_USER_ID = 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2';

async function testSpecificUserElimination() {
    console.log('🔍 Testing specific user elimination for:', PROBLEM_USER_ID);
    
    const browser = await puppeteer.launch({ 
        headless: false, 
        devtools: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    try {
        console.log('📱 Navigating to admin panel...');
        await page.goto('https://nerdfootball.web.app/index.html?view=admin');
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('🔐 Waiting for authentication...');
        // Wait for Firebase auth - look for admin tabs
        await page.waitForSelector('.admin-tab', { timeout: 30000 });
        
        console.log('🎯 Clicking on Survivor Status tab...');
        // Click on survivor status tab
        await page.click('#tab-survivor-status');
        
        // Wait for survivor section to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('🔧 Testing Check Specific User button...');
        // Test the "Check Specific User" button with our problem user
        const result = await page.evaluate(async (userId) => {
            try {
                // Check if SurvivorAutoElimination is available
                if (typeof window.SurvivorAutoElimination === 'undefined') {
                    return { error: 'SurvivorAutoElimination not loaded' };
                }
                
                console.log('🔍 Creating SurvivorAutoElimination instance...');
                const survivorElimination = new window.SurvivorAutoElimination(window.db, window.gameStateCache);
                
                console.log('🔍 Checking specific user:', userId);
                const result = await survivorElimination.checkSpecificUser(userId);
                
                return result;
            } catch (error) {
                return { error: error.message };
            }
        }, PROBLEM_USER_ID);
        
        console.log('\n🏁 SPECIFIC USER TEST RESULTS:');
        console.log('==========================================');
        
        if (result.error) {
            console.log('❌ Error:', result.error);
        } else {
            console.log('👤 User ID:', result.userId);
            console.log('🔍 Current Status:', result.currentStatus?.eliminated ? 
                `Eliminated (Week ${result.currentStatus.eliminatedWeek})` : 'Active');
            console.log('🎯 Should Be Eliminated:', result.shouldBeEliminated);
            console.log('📅 Elimination Week:', result.eliminationWeek || 'N/A');
            console.log('🚨 Needs Fix:', result.needsFix);
            
            if (result.userResults.length > 0) {
                console.log('\n📊 Pick Results:');
                result.userResults.forEach(r => {
                    const icon = r.result === 'WIN' ? '✅' : '❌';
                    console.log(`   Week ${r.week}: ${icon} ${r.result} - Picked ${r.pickedTeam}, Winner: ${r.winner}`);
                });
            } else {
                console.log('\n📊 No pick results found');
            }
            
            if (result.needsFix) {
                console.log('\n🚨 BUG CONFIRMED: User elimination status needs fixing!');
                
                if (result.shouldBeEliminated && !result.currentStatus?.eliminated) {
                    console.log(`   👉 RECOMMENDED ACTION: Eliminate user in Week ${result.eliminationWeek}`);
                    
                    // Test if we can fix it automatically
                    console.log('\n🔧 Testing automatic fix...');
                    const fixResult = await page.evaluate(async (weekNumber) => {
                        try {
                            const survivorElimination = new window.SurvivorAutoElimination(window.db, window.gameStateCache);
                            return await survivorElimination.checkEliminationsForWeek(weekNumber);
                        } catch (error) {
                            return { error: error.message };
                        }
                    }, result.eliminationWeek);
                    
                    if (fixResult.error) {
                        console.log('❌ Auto-fix failed:', fixResult.error);
                    } else if (fixResult.eliminatedCount > 0) {
                        console.log(`✅ Auto-fix successful! ${fixResult.eliminatedCount} users eliminated`);
                        fixResult.details.forEach(detail => {
                            if (detail.userId === PROBLEM_USER_ID) {
                                console.log(`   🎯 Target user ${PROBLEM_USER_ID} was eliminated!`);
                            }
                        });
                    } else {
                        console.log('⚠️ Auto-fix ran but no eliminations were processed');
                    }
                }
            } else {
                console.log('\n✅ User elimination status is correct - no bug found');
            }
        }
        
        // Keep browser open for manual inspection
        console.log('\n⏳ Keeping browser open for 60 seconds for manual inspection...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

// Run the test
testSpecificUserElimination();