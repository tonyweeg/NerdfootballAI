/**
 * NerdFootball Centralized Logging System (Compatibility Version)
 * Provides consistent console debugging with emoji prefixes and filtering
 *
 * This version is for use with <script> tags (non-module)
 * For ES6 modules, use logger.js instead
 */

const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

class Logger {
    constructor() {
        // Get debug flag from localStorage or default to INFO
        const savedLevel = localStorage.getItem('nf_log_level');
        this.level = savedLevel !== null ? parseInt(savedLevel) : LogLevel.INFO;

        // Category filtering - empty array means all categories enabled
        const savedCategories = localStorage.getItem('nf_log_categories');
        this.enabledCategories = savedCategories ? JSON.parse(savedCategories) : [];

        // Timestamp support
        this.showTimestamps = localStorage.getItem('nf_log_timestamps') === 'true';
    }

    setLevel(level) {
        this.level = level;
        localStorage.setItem('nf_log_level', level.toString());
    }

    enableCategories(categories) {
        this.enabledCategories = Array.isArray(categories) ? categories : [categories];
        localStorage.setItem('nf_log_categories', JSON.stringify(this.enabledCategories));
    }

    disableCategories() {
        this.enabledCategories = [];
        localStorage.removeItem('nf_log_categories');
    }

    toggleTimestamps() {
        this.showTimestamps = !this.showTimestamps;
        localStorage.setItem('nf_log_timestamps', this.showTimestamps.toString());
    }

    shouldLog(level, category) {
        if (level < this.level) return false;
        if (this.enabledCategories.length === 0) return true;
        return this.enabledCategories.includes(category);
    }

    formatMessage(prefix, category, message, data) {
        const parts = [];

        if (this.showTimestamps) {
            const now = new Date();
            parts.push(`[${now.toLocaleTimeString()}.${now.getMilliseconds()}]`);
        }

        parts.push(prefix);

        if (category) {
            parts.push(`[${category}]`);
        }

        parts.push(message);

        return data !== undefined ? [parts.join(' '), data] : [parts.join(' ')];
    }

    debug(category, message, data) {
        if (this.shouldLog(LogLevel.DEBUG, category)) {
            console.log(...this.formatMessage('🔍', category, message, data));
        }
    }

    info(category, message, data) {
        if (this.shouldLog(LogLevel.INFO, category)) {
            console.log(...this.formatMessage('ℹ️', category, message, data));
        }
    }

    warn(category, message, data) {
        if (this.shouldLog(LogLevel.WARN, category)) {
            console.warn(...this.formatMessage('⚠️', category, message, data));
        }
    }

    error(category, message, data) {
        if (this.shouldLog(LogLevel.ERROR, category)) {
            console.error(...this.formatMessage('❌', category, message, data));
        }
    }

    success(category, message, data) {
        if (this.shouldLog(LogLevel.INFO, category)) {
            console.log(...this.formatMessage('✅', category, message, data));
        }
    }

    // Domain-specific logging methods with preset emoji prefixes
    auth(message, data) {
        if (this.shouldLog(LogLevel.INFO, 'AUTH')) {
            console.log(...this.formatMessage('🔐', 'AUTH', message, data));
        }
    }

    cache(message, data) {
        if (this.shouldLog(LogLevel.INFO, 'CACHE')) {
            console.log(...this.formatMessage('🔥', 'CACHE', message, data));
        }
    }

    picks(message, data) {
        if (this.shouldLog(LogLevel.INFO, 'PICKS')) {
            console.log(...this.formatMessage('🎯', 'PICKS', message, data));
        }
    }

    survivor(message, data) {
        if (this.shouldLog(LogLevel.INFO, 'SURVIVOR')) {
            console.log(...this.formatMessage('💀', 'SURVIVOR', message, data));
        }
    }

    confidence(message, data) {
        if (this.shouldLog(LogLevel.INFO, 'CONFIDENCE')) {
            console.log(...this.formatMessage('🐝', 'CONFIDENCE', message, data));
        }
    }

    grid(message, data) {
        if (this.shouldLog(LogLevel.INFO, 'GRID')) {
            console.log(...this.formatMessage('🎲', 'GRID', message, data));
        }
    }

    leaderboard(message, data) {
        if (this.shouldLog(LogLevel.INFO, 'LEADERBOARD')) {
            console.log(...this.formatMessage('🏆', 'LEADERBOARD', message, data));
        }
    }

    ai(message, data) {
        if (this.shouldLog(LogLevel.INFO, 'AI')) {
            console.log(...this.formatMessage('🤖', 'AI', message, data));
        }
    }

    espn(message, data) {
        if (this.shouldLog(LogLevel.INFO, 'ESPN')) {
            console.log(...this.formatMessage('📊', 'ESPN', message, data));
        }
    }

    firestore(message, data) {
        if (this.shouldLog(LogLevel.INFO, 'FIRESTORE')) {
            console.log(...this.formatMessage('📦', 'FIRESTORE', message, data));
        }
    }

    // Helper methods for common patterns
    group(label, callback) {
        if (this.level <= LogLevel.INFO) {
            console.group(label);
            callback();
            console.groupEnd();
        }
    }

    table(data) {
        if (this.level <= LogLevel.INFO) {
            console.table(data);
        }
    }

    // Utility method to show current configuration
    showConfig() {
        console.log('🎮 NerdFootball Logger Configuration:');
        console.log(`   Level: ${Object.keys(LogLevel).find(k => LogLevel[k] === this.level)}`);
        console.log(`   Categories: ${this.enabledCategories.length === 0 ? 'ALL' : this.enabledCategories.join(', ')}`);
        console.log(`   Timestamps: ${this.showTimestamps ? 'ON' : 'OFF'}`);
    }
}

// Create singleton instance
const logger = new Logger();

// Make LogLevel available for configuration
logger.LogLevel = LogLevel;

// Make available globally
if (typeof window !== 'undefined') {
    window.logger = logger;
    window.LogLevel = LogLevel;
}
