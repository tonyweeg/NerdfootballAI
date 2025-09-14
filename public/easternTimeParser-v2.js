/**
 * Fixed Eastern Time Parser - Handles both correct UTC and Eastern Time formats
 *
 * PROBLEM SOLVED: ESPN data can be in different formats:
 * - Correct UTC: "2025-09-14T17:00:00Z" (1PM Eastern = 5PM UTC)
 * - Eastern Time: "2025-09-14T13:00:00Z" (1PM Eastern mislabeled as UTC)
 */

class EasternTimeParserV2 {
    constructor() {
        console.log('⏰ EasternTimeParser V2 initialized - Smart UTC/Eastern detection');
    }

    /**
     * Parse ESPN timestamp with intelligent format detection
     */
    parseESPNTimestamp(espnTimestamp) {
        if (!espnTimestamp) {
            console.warn('Empty ESPN timestamp provided');
            return new Date();
        }

        try {
            // Parse as standard UTC first
            const utcDate = new Date(espnTimestamp);

            if (isNaN(utcDate.getTime())) {
                console.warn('Invalid ESPN timestamp:', espnTimestamp);
                return new Date();
            }

            // Check if this is a reasonable time (within 2 weeks of now)
            const now = new Date();
            const timeDiff = Math.abs(utcDate - now);
            const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

            // If the UTC interpretation seems reasonable, use it
            if (daysDiff <= 14) {
                console.log(`⏰ ESPN Time (correct UTC): ${espnTimestamp} → ${utcDate.toISOString()}`);
                return utcDate;
            }

            // If UTC seems wrong, treat as Eastern Time that needs conversion
            console.log(`⏰ ESPN Time (treating as Eastern): ${espnTimestamp}`);
            return this.convertEasternToUTC(espnTimestamp);

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

            // Create UTC time by adding offset hours
            const utcDate = new Date(year, month, day, hours + offset, minutes, seconds);

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
     * Run diagnostics to test the parser
     */
    runDiagnostics() {
        console.log('🔍 ESPN Time Parser Diagnostics:');

        const testCases = [
            '2025-09-14T17:00:00Z', // Correct UTC for 1PM Eastern
            '2025-09-14T13:00:00Z', // Eastern mislabeled as UTC
            '2025-09-14T20:20:00Z', // Evening game
        ];

        testCases.forEach(timestamp => {
            const parsed = this.parseESPNTimestamp(timestamp);
            const easternTime = parsed.toLocaleString('en-US', { timeZone: 'America/New_York' });
            console.log(`Test: ${timestamp} → ${parsed.toISOString()} (${easternTime} Eastern)`);
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