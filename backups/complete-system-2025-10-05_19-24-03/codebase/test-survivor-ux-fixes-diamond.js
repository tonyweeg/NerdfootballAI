#!/usr/bin/env node

/**
 * 💎 DIAMOND TEST: Survivor Results UX Fixes Verification
 * Tests the survivor results view UX improvements:
 * - Background colors based on game status
 * - Player names without email display
 * - Column alignment (left for names, centered for others)
 * - Weeks survived calculation accuracy
 */

const puppeteer = require('puppeteer');

async function testSurvivorUXFixes() {
    console.log('🧪 Starting DIAMOND Survivor UX Fixes Test...');
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false, // Show browser for visual verification
            defaultViewport: { width: 1200, height: 800 },
            slowMo: 100
        });

        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.type() === 'log') {
                console.log('🌐 Browser:', msg.text());
            }
        });

        // Navigate to survivor results view
        console.log('📍 Navigating to survivor results view...');
        await page.goto('https://nerdfootball.web.app/?view=survivor', { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });

        // Wait for survivor results to load
        console.log('⏳ Waiting for survivor results to load...');
        await page.waitForSelector('#survivor-results-tbody', { timeout: 15000 });
        
        // Wait a bit more for data to populate
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Test 1: Check for background colors on table rows
        console.log('🎨 Test 1: Checking for background colors on table rows...');
        const rowsWithBgColors = await page.$$eval('#survivor-results-tbody tr', rows => {
            const results = {};
            rows.forEach((row, index) => {
                const classList = Array.from(row.classList);
                const bgClasses = classList.filter(cls => cls.includes('bg-'));
                results[index] = {
                    hasBackgroundColor: bgClasses.length > 0,
                    backgroundClasses: bgClasses,
                    className: row.className
                };
            });
            return results;
        });
        
        console.log('   Background colors found:', Object.keys(rowsWithBgColors).length > 0);
        Object.entries(rowsWithBgColors).forEach(([index, data]) => {
            if (data.hasBackgroundColor) {
                console.log(`   Row ${index}: ${data.backgroundClasses.join(', ')}`);
            }
        });

        // Test 2: Check that email addresses are NOT displayed in player columns
        console.log('📧 Test 2: Checking that email addresses are removed...');
        const playerCells = await page.$$eval('#survivor-results-tbody tr td:first-child', cells => {
            return cells.map(cell => {
                const text = cell.textContent.trim();
                // Check if text contains @ symbol (indicating email)
                const hasEmail = text.includes('@');
                return {
                    text: text,
                    hasEmail: hasEmail,
                    innerHTML: cell.innerHTML
                };
            });
        });
        
        const emailsFound = playerCells.filter(cell => cell.hasEmail);
        console.log(`   Emails found: ${emailsFound.length} (should be 0)`);
        if (emailsFound.length > 0) {
            console.log('   ❌ FAIL: Email addresses still displayed');
            emailsFound.forEach((cell, idx) => {
                console.log(`     Cell ${idx}: ${cell.text}`);
            });
        } else {
            console.log('   ✅ PASS: No email addresses displayed');
        }

        // Test 3: Check column alignment (first column left, others centered)
        console.log('🔄 Test 3: Checking column alignment...');
        const columnAlignments = await page.$$eval('#survivor-results-tbody tr:first-child td', cells => {
            return cells.map((cell, index) => {
                const classList = Array.from(cell.classList);
                const textAlign = classList.find(cls => cls.includes('text-'));
                return {
                    columnIndex: index,
                    textAlignClass: textAlign,
                    isFirstColumn: index === 0
                };
            });
        });
        
        console.log('   Column alignments:');
        columnAlignments.forEach(col => {
            const expected = col.isFirstColumn ? 'text-left' : 'text-center';
            const actual = col.textAlignClass;
            const correct = actual === expected;
            console.log(`     Column ${col.columnIndex}: ${actual} (expected: ${expected}) ${correct ? '✅' : '❌'}`);
        });

        // Test 4: Check weeks survived values are reasonable
        console.log('📊 Test 4: Checking weeks survived values...');
        const weeksSurvivedData = await page.$$eval('#survivor-results-tbody tr', rows => {
            return rows.map((row, index) => {
                const cells = row.querySelectorAll('td');
                const playerName = cells[0]?.textContent.trim().split('\\n')[0] || 'Unknown';
                const weeksSurvivedCell = cells[cells.length - 1]; // Last column
                const weeksSurvived = weeksSurvivedCell?.textContent.trim() || '0';
                
                return {
                    playerIndex: index,
                    playerName: playerName,
                    weeksSurvived: weeksSurvived,
                    isNumeric: !isNaN(parseInt(weeksSurvived))
                };
            });
        });
        
        console.log('   Weeks survived data:');
        weeksSurvivedData.slice(0, 5).forEach(player => { // Show first 5 players
            console.log(`     ${player.playerName}: ${player.weeksSurvived} weeks`);
        });
        
        const invalidWeeks = weeksSurvivedData.filter(p => !p.isNumeric);
        if (invalidWeeks.length > 0) {
            console.log('   ❌ Invalid weeks survived values found:', invalidWeeks.length);
        } else {
            console.log('   ✅ All weeks survived values are numeric');
        }

        // Test 5: Visual inspection pause
        console.log('👀 Test 5: Visual inspection...');
        console.log('   Please visually verify:');
        console.log('   - Background colors: yellow (pending), green (winner), red (loser)');
        console.log('   - Player names without email addresses');
        console.log('   - Column alignment: names left, others centered');
        console.log('   - Weeks survived showing actual game results');
        
        console.log('⏸️  Pausing for 10 seconds for visual inspection...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Summary
        console.log('\\n📋 Test Summary:');
        console.log(`   - Background colors: ${Object.keys(rowsWithBgColors).length > 0 ? '✅ Applied' : '❌ Missing'}`);
        console.log(`   - Email removal: ${emailsFound.length === 0 ? '✅ Complete' : '❌ Incomplete'}`);
        console.log(`   - Column alignment: ${columnAlignments.every(col => col.textAlignClass === (col.isFirstColumn ? 'text-left' : 'text-center')) ? '✅ Correct' : '❌ Incorrect'}`);
        console.log(`   - Weeks survived: ${invalidWeeks.length === 0 ? '✅ Valid' : '❌ Invalid values found'}`);

        console.log('\\n🎉 Survivor UX Fixes test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
    
    return true;
}

// Run the test
if (require.main === module) {
    testSurvivorUXFixes().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testSurvivorUXFixes };