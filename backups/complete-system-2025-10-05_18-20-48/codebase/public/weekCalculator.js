// NFL Week Calculator - Centralized Dynamic Week Calculation
// Provides consistent, date-based week calculation for 2025 NFL season

class NFLWeekCalculator {
    constructor() {
        // 2025 NFL Season configuration
        this.SEASON_YEAR = 2025;
        this.SEASON_START_DATE = new Date('2025-09-04'); // Week 1 starts September 4, 2025
        this.TOTAL_WEEKS = 18; // Regular season weeks
        this.WEEK_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
    }

    // Get current NFL week based on date
    getCurrentWeek() {
        const now = new Date();
        
        // Before season starts - return Week 1 for pre-season testing
        if (now < this.SEASON_START_DATE) {
            console.log('🏈 Pre-season mode: Returning Week 1 for testing');
            return 1;
        }
        
        // Calculate weeks since season started
        const timeDiff = now.getTime() - this.SEASON_START_DATE.getTime();
        const weeksDiff = Math.floor(timeDiff / this.WEEK_DURATION_MS) + 1;
        
        // Clamp between 1 and 18 weeks
        const currentWeek = Math.min(Math.max(weeksDiff, 1), this.TOTAL_WEEKS);
        
        console.log(`🏈 Dynamic week calculation: Week ${currentWeek} (${now.toISOString().split('T')[0]})`);
        return currentWeek;
    }

    // Get season information
    getSeasonInfo() {
        return {
            year: this.SEASON_YEAR,
            startDate: this.SEASON_START_DATE,
            totalWeeks: this.TOTAL_WEEKS,
            currentWeek: this.getCurrentWeek()
        };
    }

    // Check if we're in pre-season
    isPreSeason() {
        return new Date() < this.SEASON_START_DATE;
    }

    // Get week start date for any week
    getWeekStartDate(weekNumber) {
        if (weekNumber < 1 || weekNumber > this.TOTAL_WEEKS) {
            throw new Error(`Invalid week number: ${weekNumber}. Must be between 1 and ${this.TOTAL_WEEKS}`);
        }
        
        const weekStartMs = this.SEASON_START_DATE.getTime() + ((weekNumber - 1) * this.WEEK_DURATION_MS);
        return new Date(weekStartMs);
    }

    // Get week end date for any week
    getWeekEndDate(weekNumber) {
        const weekStart = this.getWeekStartDate(weekNumber);
        return new Date(weekStart.getTime() + this.WEEK_DURATION_MS - 1);
    }
}

// Create global singleton instance
const nflWeekCalculator = new NFLWeekCalculator();

// Export for browser usage
if (typeof window !== 'undefined') {
    window.nflWeekCalculator = nflWeekCalculator;
    window.NFLWeekCalculator = NFLWeekCalculator;
    
    // Create global getCurrentWeek function for backward compatibility
    window.getNFLCurrentWeek = () => nflWeekCalculator.getCurrentWeek();
}

// Export for Node.js
if (typeof module !== 'undefined') {
    module.exports = { NFLWeekCalculator, nflWeekCalculator };
}