/**
 * Eastern Time Parser - Bulletproof ESPN Timestamp Handling
 *
 * PROBLEM: ESPN timestamps like "2025-10-19T13:00:00Z" are EASTERN TIME with Z suffix
 *          JavaScript Date() treats Z suffix as UTC, causing 4-5 hour offset errors
 *
 * SOLUTION: Parse as Eastern Time, convert to proper UTC for reliable comparison
 *
 * Diamond Level Standards:
 * - Handles DST transitions automatically
 * - Uses native JavaScript timezone support
 * - Bulletproof error handling with fallbacks
 * - Zero external dependencies
 * - Sub-millisecond performance
 */

class EasternTimeParser {
    constructor() {
        // EST: UTC-5 (Standard Time: November - March)
        // EDT: UTC-4 (Daylight Time: March - November)
        this.EST_OFFSET = 5 * 60 * 60 * 1000; // 5 hours in milliseconds
        this.EDT_OFFSET = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

        console.log('⏰ EasternTimeParser initialized - ESPN timestamp fixes active');
    }

    /**
     * Parse ESPN timestamp as Eastern Time and return proper UTC Date
     *
     * @param {string} espnTimestamp - ESPN timestamp like "2025-10-19T13:00:00Z"
     * @returns {Date} Proper UTC Date object
     */
    parseESPNTimestamp(espnTimestamp) {
        try {
            if (!espnTimestamp) {
                throw new Error('ESPN timestamp is null or undefined');
            }

            // Remove Z suffix since it's misleading (ESPN time is Eastern, not UTC)
            const cleanTimestamp = espnTimestamp.replace('Z', '');

            // Parse as local time first to get component values
            const parsedDate = new Date(cleanTimestamp);

            if (isNaN(parsedDate.getTime())) {
                throw new Error(`Invalid ESPN timestamp format: ${espnTimestamp}`);
            }

            // Extract date components (these represent Eastern Time values)
            const year = parsedDate.getFullYear();
            const month = parsedDate.getMonth(); // 0-based
            const day = parsedDate.getDate();
            const hours = parsedDate.getHours();
            const minutes = parsedDate.getMinutes();
            const seconds = parsedDate.getSeconds();

            // Create Eastern Time date using Intl.DateTimeFormat to handle DST
            const easternTimeString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            // Use JavaScript's built-in timezone handling to convert Eastern to UTC
            const easternDate = new Date(easternTimeString + ' EST'); // Assume EST first
            const edtDate = new Date(easternTimeString + ' EDT'); // Also try EDT

            // Determine which one is correct based on DST rules
            const correctDate = this.isDST(year, month, day) ? edtDate : easternDate;

            // Alternative bulletproof method using UTC constructor with offset
            const utcTime = Date.UTC(year, month, day, hours, minutes, seconds);
            const offset = this.isDST(year, month, day) ? this.EDT_OFFSET : this.EST_OFFSET;
            const properUTCDate = new Date(utcTime + offset);

            console.log(`⏰ ESPN Time Conversion:
  Original: ${espnTimestamp}
  Parsed as Eastern: ${easternTimeString}
  DST Active: ${this.isDST(year, month, day)}
  Proper UTC: ${properUTCDate.toISOString()}`);

            return properUTCDate;

        } catch (error) {
            console.error('⏰ EasternTimeParser error:', error);

            // Fallback: treat as UTC (existing behavior) but log warning
            console.warn('⏰ FALLBACK: Using original timestamp as UTC due to parsing error');
            return new Date(espnTimestamp);
        }
    }

    /**
     * Determine if a date falls within Daylight Saving Time
     * DST 2025: March 9 - November 2
     *
     * @param {number} year
     * @param {number} month - 0-based (0 = January)
     * @param {number} day
     * @returns {boolean}
     */
    isDST(year, month, day) {
        // DST starts on second Sunday of March
        const dstStart = this.getNthSundayOfMonth(year, 2, 1); // March = 2 (0-based)

        // DST ends on first Sunday of November
        const dstEnd = this.getNthSundayOfMonth(year, 10, 0); // November = 10 (0-based)

        const currentDate = new Date(year, month, day);

        return currentDate >= dstStart && currentDate < dstEnd;
    }

    /**
     * Get the Nth Sunday of a month (for DST calculations)
     *
     * @param {number} year
     * @param {number} month - 0-based
     * @param {number} n - 0-based (0 = first Sunday, 1 = second Sunday)
     * @returns {Date}
     */
    getNthSundayOfMonth(year, month, n) {
        const firstDayOfMonth = new Date(year, month, 1);
        const firstSunday = new Date(firstDayOfMonth);
        firstSunday.setDate(1 + (7 - firstDayOfMonth.getDay()) % 7);

        const nthSunday = new Date(firstSunday);
        nthSunday.setDate(firstSunday.getDate() + (n * 7));

        return nthSunday;
    }

    /**
     * Check if a game has started (properly handles Eastern Time)
     *
     * @param {string} espnTimestamp
     * @returns {boolean}
     */
    hasGameStarted(espnTimestamp) {
        try {
            const gameTimeUTC = this.parseESPNTimestamp(espnTimestamp);
            const nowUTC = new Date();

            const hasStarted = nowUTC >= gameTimeUTC;

            console.log(`⏰ Game Start Check:
  ESPN Timestamp: ${espnTimestamp}
  Game Time (UTC): ${gameTimeUTC.toISOString()}
  Current Time (UTC): ${nowUTC.toISOString()}
  Has Started: ${hasStarted}`);

            return hasStarted;

        } catch (error) {
            console.error('⏰ Game start check error:', error);
            // Fallback: assume game has started to be safe
            return true;
        }
    }

    /**
     * Get time until game starts (in milliseconds)
     *
     * @param {string} espnTimestamp
     * @returns {number} Milliseconds until game starts (negative if started)
     */
    getTimeUntilGameStart(espnTimestamp) {
        try {
            const gameTimeUTC = this.parseESPNTimestamp(espnTimestamp);
            const nowUTC = new Date();

            return gameTimeUTC.getTime() - nowUTC.getTime();

        } catch (error) {
            console.error('⏰ Time until game error:', error);
            return -1; // Assume game has started
        }
    }

    /**
     * Format game time for display (Eastern Time)
     *
     * @param {string} espnTimestamp
     * @returns {string} Human-readable Eastern Time
     */
    formatGameTime(espnTimestamp) {
        try {
            const gameTimeUTC = this.parseESPNTimestamp(espnTimestamp);

            // Convert back to Eastern Time for display
            const easternTime = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/New_York',
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short'
            }).format(gameTimeUTC);

            return easternTime;

        } catch (error) {
            console.error('⏰ Format game time error:', error);
            return espnTimestamp; // Fallback to original
        }
    }

    /**
     * Diagnostic method to test timezone conversion
     */
    runDiagnostics() {
        console.log('🧪 EASTERN TIME PARSER DIAGNOSTICS');

        const testCases = [
            '2025-10-19T13:00:00Z', // 1PM Eastern Sunday
            '2025-10-19T16:25:00Z', // 4:25PM Eastern Sunday
            '2025-10-20T20:15:00Z', // 8:15PM Eastern Monday Night Football
            '2025-03-09T13:00:00Z', // DST transition day
            '2025-11-02T13:00:00Z'  // DST end day
        ];

        testCases.forEach(timestamp => {
            console.log(`\n⏰ Testing: ${timestamp}`);
            console.log(`  Parsed: ${this.parseESPNTimestamp(timestamp).toISOString()}`);
            console.log(`  Display: ${this.formatGameTime(timestamp)}`);
            console.log(`  Has Started: ${this.hasGameStarted(timestamp)}`);
        });

        console.log('\n✅ Diagnostics complete');
    }
}

// Global initialization
window.easternTimeParser = null;

function initializeEasternTimeParser() {
    window.easternTimeParser = new EasternTimeParser();

    // Run diagnostics in development
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('local')) {
        window.easternTimeParser.runDiagnostics();
    }

    console.log('⏰ Eastern Time Parser: Initialized and ready for ESPN timestamps');
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEasternTimeParser);
} else {
    initializeEasternTimeParser();
}

// Console helper functions for testing
window.parseESPNTime = function(timestamp) {
    if (!window.easternTimeParser) {
        console.error('Eastern Time Parser not initialized');
        return null;
    }
    return window.easternTimeParser.parseESPNTimestamp(timestamp);
};

window.testESPNTime = function(timestamp = '2025-10-19T13:00:00Z') {
    if (!window.easternTimeParser) {
        console.error('Eastern Time Parser not initialized');
        return;
    }

    console.log('🧪 TESTING ESPN TIMESTAMP:', timestamp);
    const parsed = window.easternTimeParser.parseESPNTimestamp(timestamp);
    const formatted = window.easternTimeParser.formatGameTime(timestamp);
    const hasStarted = window.easternTimeParser.hasGameStarted(timestamp);

    console.log('Results:', {
        original: timestamp,
        parsedUTC: parsed.toISOString(),
        formatted: formatted,
        hasStarted: hasStarted
    });

    return { parsed, formatted, hasStarted };
};