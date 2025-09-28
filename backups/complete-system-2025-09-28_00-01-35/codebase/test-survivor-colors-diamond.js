const puppeteer = require('puppeteer');

async function testSurvivorColors() {
    console.log('🧪 Testing Survivor Results Color Logic...');
    
    let browser;
    try {
        browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        
        // Navigate to survivor results
        console.log('📄 Loading survivor results page...');
        await page.goto('http://localhost:3003/survivorResults.html');
        
        // Wait for authentication and data to load
        console.log('⏳ Waiting for results to load...');
        await page.waitForSelector('#results-container', { timeout: 30000 });
        
        // Wait a bit more for data to fully populate
        await page.waitForTimeout(3000);
        
        // Get all table rows
        const tableRows = await page.$$('#results-tbody tr');
        console.log(`📊 Found ${tableRows.length} player rows`);
        
        if (tableRows.length === 0) {
            console.log('⚠️  No player rows found - may need to sign in first');
            return;
        }
        
        // Check for different color classes
        const colorStats = {
            won: 0,
            lost: 0,
            pending: 0,
            eliminated: 0,
            active: 0
        };
        
        for (let i = 0; i < tableRows.length; i++) {
            const row = tableRows[i];
            const className = await page.evaluate(el => el.className, row);
            
            // Get player name for logging
            const playerName = await page.evaluate(el => {
                const nameElement = el.querySelector('.text-sm.font-medium.text-gray-900');
                return nameElement ? nameElement.textContent.trim() : 'Unknown';
            }, row);
            
            if (className.includes('survivor-won')) {
                colorStats.won++;
                console.log(`✅ ${playerName}: Green background (won)`);
            } else if (className.includes('survivor-lost')) {
                colorStats.lost++;
                console.log(`❌ ${playerName}: Red background (lost)`);
            } else if (className.includes('survivor-pending')) {
                colorStats.pending++;
                console.log(`⏳ ${playerName}: Yellow background (pending)`);
            } else if (className.includes('survivor-eliminated')) {
                colorStats.eliminated++;
                console.log(`💀 ${playerName}: Red background (eliminated)`);
            } else if (className.includes('survivor-active')) {
                colorStats.active++;
                console.log(`🟢 ${playerName}: Green background (active)`);
            } else {
                console.log(`❓ ${playerName}: Unknown color class: ${className}`);
            }
        }
        
        console.log('\n📈 Color Distribution:');
        console.log(`  Won (Green): ${colorStats.won}`);
        console.log(`  Pending (Yellow): ${colorStats.pending}`);
        console.log(`  Lost (Red): ${colorStats.lost}`);
        console.log(`  Eliminated (Red): ${colorStats.eliminated}`);
        console.log(`  Active (Green): ${colorStats.active}`);
        
        // Check if user CX0etIyJbGg33nmHCo4eezPWrsr2 appears and their color
        const targetUserId = 'CX0etIyJbGg33nmHCo4eezPWrsr2';
        console.log(`\n🎯 Looking for target user ${targetUserId}...`);
        
        // Check console logs for any errors
        const consoleLogs = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleLogs.push(`❌ Console Error: ${msg.text()}`);
            } else if (msg.text().includes('Philadelphia') || msg.text().includes('CX0etIyJbGg33nmHCo4eezPWrsr2')) {
                consoleLogs.push(`📝 Relevant Log: ${msg.text()}`);
            }
        });
        
        if (consoleLogs.length > 0) {
            console.log('\n📜 Console Messages:');
            consoleLogs.forEach(log => console.log(log));
        }
        
        // Test the getPlayerRowStatus function logic directly
        console.log('\n🔧 Testing getPlayerRowStatus function logic...');
        const testResult = await page.evaluate(() => {
            // Mock data for testing
            const mockUser = {
                isEliminated: false,
                currentWeekPick: 'Philadelphia'
            };
            
            const mockWeekResults = {
                1: {
                    game1: {
                        homeTeam: 'Philadelphia',
                        awayTeam: 'Green Bay',
                        winner: 'Philadelphia'
                    }
                }
            };
            
            // Test if function exists
            if (typeof getPlayerRowStatus === 'function') {
                const result = getPlayerRowStatus(mockUser, 1, mockWeekResults);
                return {
                    functionExists: true,
                    result: result,
                    expected: 'survivor-won'
                };
            } else {
                return {
                    functionExists: false,
                    error: 'getPlayerRowStatus function not found'
                };
            }
        });
        
        console.log('Function Test Result:', testResult);
        
        // Success indicators
        const hasColorVariety = (colorStats.won + colorStats.pending + colorStats.lost) > 0;
        const functionalityWorking = testResult.functionExists && testResult.result === testResult.expected;
        
        if (hasColorVariety && functionalityWorking) {
            console.log('\n🎉 SUCCESS: Survivor color logic is working correctly!');
        } else {
            console.log('\n⚠️  ISSUES DETECTED:');
            if (!hasColorVariety) console.log('  - No weekly result colors found (only active/eliminated)');
            if (!functionalityWorking) console.log('  - getPlayerRowStatus function not working correctly');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testSurvivorColors();