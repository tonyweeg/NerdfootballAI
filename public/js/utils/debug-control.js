/**
 * NerdFootball Debug Control System
 * Provides easy-to-use debug mode controls building on centralized logger
 */

import { logger, LogLevel } from './logger.js';

/**
 * Debug Control Utility
 * Simplifies debug mode activation and configuration
 */
class DebugControl {
    constructor() {
        this.logger = logger;
    }

    /**
     * Enable full debug mode (all categories, DEBUG level, timestamps)
     */
    enableFullDebug() {
        this.logger.setLevel(LogLevel.DEBUG);
        this.logger.disableCategories(); // Enable all categories
        this.logger.showTimestamps = true;
        localStorage.setItem('nf_log_timestamps', 'true');
        console.log('🎮 DEBUG_CONTROL: Full debug mode ENABLED');
        this.logger.showConfig();
    }

    /**
     * Disable debug mode (INFO level, no category filtering, no timestamps)
     */
    disableDebug() {
        this.logger.setLevel(LogLevel.INFO);
        this.logger.disableCategories();
        this.logger.showTimestamps = false;
        localStorage.setItem('nf_log_timestamps', 'false');
        console.log('🎮 DEBUG_CONTROL: Debug mode DISABLED (INFO level)');
    }

    /**
     * Enable production mode (WARN level, minimal logging)
     */
    enableProductionMode() {
        this.logger.setLevel(LogLevel.WARN);
        this.logger.disableCategories();
        this.logger.showTimestamps = false;
        localStorage.setItem('nf_log_timestamps', 'false');
        console.log('🎮 DEBUG_CONTROL: Production mode ENABLED (WARN level only)');
    }

    /**
     * Enable silent mode (no console output except errors)
     */
    enableSilentMode() {
        this.logger.setLevel(LogLevel.ERROR);
        this.logger.disableCategories();
        console.log('🎮 DEBUG_CONTROL: Silent mode ENABLED (ERROR level only)');
    }

    /**
     * Enable debug for specific categories only
     * @param {Array<string>} categories - Categories to enable (e.g., ['AUTH', 'CACHE', 'PICKS'])
     */
    enableDebugCategories(categories) {
        this.logger.setLevel(LogLevel.DEBUG);
        this.logger.enableCategories(categories);
        this.logger.showTimestamps = true;
        localStorage.setItem('nf_log_timestamps', 'true');
        console.log(`🎮 DEBUG_CONTROL: Debug enabled for categories: ${categories.join(', ')}`);
        this.logger.showConfig();
    }

    /**
     * Quick debug presets for common scenarios
     */
    presets = {
        /**
         * Authentication debugging
         */
        auth: () => {
            this.enableDebugCategories(['AUTH', 'FIRESTORE']);
            console.log('🎮 PRESET: Authentication debugging enabled');
        },

        /**
         * Cache system debugging
         */
        cache: () => {
            this.enableDebugCategories(['CACHE', 'FIRESTORE', 'AI']);
            console.log('🎮 PRESET: Cache system debugging enabled');
        },

        /**
         * Picks system debugging
         */
        picks: () => {
            this.enableDebugCategories(['PICKS', 'CONFIDENCE', 'FIRESTORE', 'ESPN']);
            console.log('🎮 PRESET: Picks system debugging enabled');
        },

        /**
         * Survivor pool debugging
         */
        survivor: () => {
            this.enableDebugCategories(['SURVIVOR', 'FIRESTORE', 'ESPN']);
            console.log('🎮 PRESET: Survivor pool debugging enabled');
        },

        /**
         * Grid debugging
         */
        grid: () => {
            this.enableDebugCategories(['GRID', 'FIRESTORE', 'ESPN']);
            console.log('🎮 PRESET: Grid system debugging enabled');
        },

        /**
         * Leaderboard debugging
         */
        leaderboard: () => {
            this.enableDebugCategories(['LEADERBOARD', 'FIRESTORE', 'CACHE']);
            console.log('🎮 PRESET: Leaderboard debugging enabled');
        },

        /**
         * AI system debugging
         */
        ai: () => {
            this.enableDebugCategories(['AI', 'CACHE', 'ESPN']);
            console.log('🎮 PRESET: AI system debugging enabled');
        },

        /**
         * ESPN data debugging
         */
        espn: () => {
            this.enableDebugCategories(['ESPN', 'CACHE', 'FIRESTORE']);
            console.log('🎮 PRESET: ESPN data debugging enabled');
        },

        /**
         * Full system debugging (all categories)
         */
        all: () => {
            this.enableFullDebug();
            console.log('🎮 PRESET: Full system debugging enabled');
        }
    };

    /**
     * Show current debug configuration
     */
    showConfig() {
        this.logger.showConfig();
    }

    /**
     * Get current log level
     * @returns {number} Current LogLevel value
     */
    getLogLevel() {
        return this.logger.level;
    }

    /**
     * Check if debug mode is active
     * @returns {boolean} True if DEBUG level is enabled
     */
    isDebugMode() {
        return this.logger.level === LogLevel.DEBUG;
    }
}

// Create and export singleton instance
const debugControl = new DebugControl();

// Export for ES6 modules
export { DebugControl, debugControl };

// Make available globally for console usage
if (typeof window !== 'undefined') {
    window.DebugControl = DebugControl;
    window.debugControl = debugControl;

    // Convenience global functions for console usage
    window.enableDebug = () => debugControl.enableFullDebug();
    window.disableDebug = () => debugControl.disableDebug();
    window.debugPreset = (preset) => {
        if (debugControl.presets[preset]) {
            debugControl.presets[preset]();
        } else {
            console.error(`❌ Unknown debug preset: ${preset}`);
            console.log('Available presets:', Object.keys(debugControl.presets).join(', '));
        }
    };
    window.showDebugConfig = () => debugControl.showConfig();

    // Log available commands
    console.log('🎮 NerdFootball Debug Control loaded. Available commands:');
    console.log('  enableDebug() - Enable full debug mode');
    console.log('  disableDebug() - Disable debug mode');
    console.log('  debugPreset("name") - Enable preset (auth, cache, picks, survivor, grid, leaderboard, ai, espn, all)');
    console.log('  showDebugConfig() - Show current configuration');
}
