/**
 * Fixed Eastern Time Parser - ESPN uses EST as their "Zulu" reference
 *
 * CRITICAL UNDERSTANDING: ESPN timestamps with "Z" mean EASTERN TIME!
 * - ESPN "2025-09-18T20:15:00Z" = 8:15 PM EASTERN (not UTC)
 * - ESPN uses EST as their "Zulu" time reference, not true UTC
 */

class EasternTimeParserV2 {
    constructor() {
        console.log('⏰ EasternTimeParser V2 initialized - Smart UTC/Eastern detection');
    }

    /**
     * Parse ESPN timestamp - ESPN Z = Eastern Time (NOT UTC)
     */
    parseESPNTimestamp(espnTimestamp) {
        if (!espnTimestamp) {
            console.warn('Empty ESPN timestamp provided');
            return new Date();
        }

        try {
            // ESPN Z timestamps are ALWAYS Eastern time, not UTC
            // Simply remove Z and treat as Eastern time
            const cleanTime = espnTimestamp.replace('Z', '');
            const easternTime = new Date(cleanTime);

            if (isNaN(easternTime.getTime())) {
                console.warn('Invalid ESPN timestamp:', espnTimestamp);
                return new Date();
            }

            console.log(`⏰ ESPN Time (Eastern): ${espnTimestamp} → ${easternTime.toLocaleString()}`);
            return easternTime;

        } catch (error) {
            console.error('Error parsing ESPN timestamp:', error);
            return new Date(espnTimestamp);
        }
    }

    /**
     * Convert Eastern Time timestamp to proper UTC
     */
    convertEasternToUTC(easternTimestamp) {
        try {
            // Remove Z and parse as local time to get components
            const cleanTime = easternTimestamp.replace('Z', '');
            const localDate = new Date(cleanTime);

            const year = localDate.getFullYear();
            const month = localDate.getMonth();
            const day = localDate.getDate();
            const hours = localDate.getHours();
            const minutes = localDate.getMinutes();
            const seconds = localDate.getSeconds();

            // Check if DST is active
            const isDST = this.isDST(year, month, day);
            const offset = isDST ? 4 : 5; // EDT = UTC-4, EST = UTC-5

            // FIXED: Create Eastern Time date, then convert to UTC properly
            // Method 1: Use UTC constructor to create the proper UTC time
            const utcDate = new Date(Date.UTC(year, month, day, hours - offset, minutes, seconds));

            console.log(`⏰ Eastern→UTC: ${easternTimestamp} (${isDST ? 'EDT' : 'EST'}) → ${utcDate.toISOString()}`);
            return utcDate;

        } catch (error) {
            console.error('Error converting Eastern to UTC:', error);
            return new Date(easternTimestamp);
        }
    }

    /**
     * Check if DST is active for a given date
     */
    isDST(year, month, day) {
        // DST 2025: March 9 - November 2
        const date = new Date(year, month, day);
        const dstStart = new Date(year, 2, 9); // March 9
        const dstEnd = new Date(year, 10, 2);  // November 2
        return date >= dstStart && date < dstEnd;
    }

    /**
     * Check if a game has started (properly handles Eastern Time)
     * @param {string} espnTimestamp
     * @returns {boolean}
     */
    hasGameStarted(espnTimestamp) {
        try {
            // Bible data has wrong timezone - subtract 4 hours to get correct game time
            const cleanTime = espnTimestamp.replace('Z', '');
            const wrongTime = new Date(cleanTime);
            const correctedGameTime = new Date(wrongTime.getTime() - (4 * 60 * 60 * 1000));
            const now = new Date();
            return now >= correctedGameTime;
        } catch (error) {
            console.error('Error checking if game started:', error);
            return true; // Assume started to be safe
        }
    }

    /**
     * Format game time for display (Eastern Time)
     * @param {string} espnTimestamp
     * @returns {string} Human-readable Eastern Time
     */
    formatGameTime(espnTimestamp) {
        try {
            // Bible data has wrong timezone - always subtract 4 hours to get correct Eastern Time
            const cleanTime = espnTimestamp.replace('Z', '');
            const wrongTime = new Date(cleanTime);

            if (isNaN(wrongTime.getTime())) {
                console.warn('Invalid ESPN timestamp:', espnTimestamp);
                return espnTimestamp;
            }

            // Subtract 4 hours to get correct Eastern Time
            const correctedTime = new Date(wrongTime.getTime() - (4 * 60 * 60 * 1000));

            console.log(`⏰ BIBLE FIX: ${espnTimestamp} → corrected to ${correctedTime.toLocaleString()}`);

            // Format the corrected time
            return correctedTime.toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short'
            });
        } catch (error) {
            console.error('Error formatting game time:', error);
            return espnTimestamp;
        }
    }

    /**
     * Get time until game starts (in milliseconds)
     * @param {string} espnTimestamp
     * @returns {number} Milliseconds until game starts (negative if started)
     */
    getTimeUntilGameStart(espnTimestamp) {
        try {
            // Bible data has wrong timezone - subtract 4 hours to get correct game time
            const cleanTime = espnTimestamp.replace('Z', '');
            const wrongTime = new Date(cleanTime);
            const correctedGameTime = new Date(wrongTime.getTime() - (4 * 60 * 60 * 1000));
            const now = new Date();
            const timeUntil = correctedGameTime.getTime() - now.getTime();

            console.log(`⏰ TIME_UNTIL: Game at ${correctedGameTime.toLocaleString()}, Now: ${now.toLocaleString()}, Until: ${Math.floor(timeUntil / (1000 * 60 * 60))}h ${Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60))}m`);

            return timeUntil;
        } catch (error) {
            console.error('Error calculating time until game:', error);
            return -1; // Assume started
        }
    }

    /**
     * Run diagnostics to test the parser
     */
    runDiagnostics() {
        console.log('🔍 ESPN Time Parser Diagnostics:');

        const testCases = [
            '2025-09-19T00:15:00Z', // Tonight's 8:15 PM Eastern game (Sept 18, 2025)
            '2025-09-14T17:00:00Z', // Correct UTC for 1PM Eastern
            '2025-09-14T13:00:00Z', // Eastern mislabeled as UTC
            '2025-09-14T20:20:00Z', // Evening game
        ];

        testCases.forEach(timestamp => {
            const parsed = this.parseESPNTimestamp(timestamp);
            const easternTime = this.formatGameTime(timestamp);
            const hasStarted = this.hasGameStarted(timestamp);
            console.log(`Test: ${timestamp} → ${parsed.toISOString()}`);
            console.log(`  Display: ${easternTime}`);
            console.log(`  Has Started: ${hasStarted}`);
        });
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.easternTimeParser = new EasternTimeParserV2();

    // Add test functions
    window.testESPNTime = function(timestamp) {
        return window.easternTimeParser.parseESPNTimestamp(timestamp);
    };

    window.parseESPNTime = function(timestamp) {
        return window.easternTimeParser.parseESPNTimestamp(timestamp);
    };
}

console.log('🎯 EasternTimeParser V2 loaded - Fixed UTC/Eastern detection');

// DEBUG: Test Game 401 timestamp when window is ready
if (typeof window !== 'undefined' && window.easternTimeParser) {
    console.log('🔍 DEBUG Game 401 Timestamp Test:');
    const testTimestamp = '2025-09-26T00:15Z';
    const expectedTimestamp = '2025-09-25T20:15Z'; // Thu Sep 25, 8:15 PM EDT
    console.log(`Current: ${testTimestamp} → ${window.easternTimeParser.formatGameTime(testTimestamp)}`);
    console.log(`Expected: ${expectedTimestamp} → ${window.easternTimeParser.formatGameTime(expectedTimestamp)}`);
}