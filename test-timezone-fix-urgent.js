/**
 * URGENT TIMEZONE FIX TEST
 * Run in browser console to verify 1PM games are now properly locked
 */

// Test the fixed timezone parser
async function testUrgentTimezoneFix() {
    console.log('🚨 URGENT TIMEZONE FIX TEST - September 14, 2025');

    // Current time: ~2:10 PM EDT
    const now = new Date();
    console.log('Current time:', now.toString());
    console.log('Current UTC:', now.toISOString());

    // Test 1PM EDT game (should have started 1+ hours ago)
    const onePMGame = '2025-09-14T13:00:00Z';
    console.log('\n🏈 Testing 1PM EDT Game (should be LOCKED):');
    console.log('ESPN timestamp:', onePMGame);

    if (window.easternTimeParser) {
        const gameTime = window.easternTimeParser.parseESPNTimestamp(onePMGame);
        const hasStarted = window.easternTimeParser.hasGameStarted(onePMGame);
        const timeUntil = window.easternTimeParser.getTimeUntilGameStart(onePMGame);

        console.log('Parsed game time (UTC):', gameTime.toISOString());
        console.log('Game has started:', hasStarted);
        console.log('Time until start (ms):', timeUntil);
        console.log('Time until start (minutes):', Math.round(timeUntil / 60000));

        if (hasStarted) {
            console.log('✅ CORRECT: 1PM game is properly detected as started');
        } else {
            console.log('❌ BUG: 1PM game still shows as not started');
        }
    } else {
        console.error('❌ Eastern Time Parser not available');
    }

    // Test 4PM EDT game (should NOT have started yet)
    const fourPMGame = '2025-09-14T16:00:00Z';
    console.log('\n🏈 Testing 4PM EDT Game (should NOT be locked):');
    console.log('ESPN timestamp:', fourPMGame);

    if (window.easternTimeParser) {
        const gameTime = window.easternTimeParser.parseESPNTimestamp(fourPMGame);
        const hasStarted = window.easternTimeParser.hasGameStarted(fourPMGame);
        const timeUntil = window.easternTimeParser.getTimeUntilGameStart(fourPMGame);

        console.log('Parsed game time (UTC):', gameTime.toISOString());
        console.log('Game has started:', hasStarted);
        console.log('Time until start (ms):', timeUntil);
        console.log('Time until start (minutes):', Math.round(timeUntil / 60000));

        if (!hasStarted && timeUntil > 0) {
            console.log('✅ CORRECT: 4PM game is properly detected as not started');
        } else {
            console.log('❌ BUG: 4PM game timing is wrong');
        }
    }

    console.log('\n🎯 TEST COMPLETE - Check results above');
}

// Auto-run after 2 seconds to allow page load
setTimeout(testUrgentTimezoneFix, 2000);

// Manual trigger
window.testUrgentTimezoneFix = testUrgentTimezoneFix;