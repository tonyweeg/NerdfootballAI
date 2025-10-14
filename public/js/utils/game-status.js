/**
 * Centralized Game Status Checker
 * Handles all ESPN status format variations and provides validation
 *
 * Usage:
 *   import { GameStatusChecker } from './js/utils/game-status.js';
 *
 *   const checker = new GameStatusChecker();
 *   const isComplete = checker.isGameCompleted(game);
 *   const isStarted = checker.hasGameStarted(game);
 *   const status = checker.getGameStatus(game);
 */

export class GameStatusChecker {
    constructor() {
        // ESPN status variations we've observed
        this.FINAL_STATUSES = [
            'final',
            'final/ot',
            'status_final',
            'final_overtime',
            'status_end_period'
        ];

        this.IN_PROGRESS_STATUSES = [
            'in_progress',
            'in progress',
            'halftime',
            'half',
            'status_halftime',
            'status_in_progress'
        ];

        this.NOT_STARTED_STATUSES = [
            'pre',
            'pregame',
            'scheduled',
            'status_scheduled',
            'tbd'
        ];
    }

    /**
     * Normalize status string for comparison
     * @param {string} status - Raw status from ESPN
     * @returns {string} Normalized lowercase status
     */
    normalizeStatus(status) {
        if (!status) return '';
        return status.toString().toLowerCase().trim();
    }

    /**
     * Check if game is completed
     * @param {Object} game - Game object with status, winner, etc.
     * @returns {boolean}
     */
    isGameCompleted(game) {
        if (!game) return false;

        const status = this.normalizeStatus(game.status);

        // Check explicit final statuses
        if (this.FINAL_STATUSES.some(finalStatus => status.includes(finalStatus))) {
            return true;
        }

        // Additional validation: winner exists and isn't TBD
        if (game.winner && game.winner !== 'TBD' && game.winner.trim() !== '') {
            // Only trust winner if scores also exist and aren't zero
            if (game.homeScore !== undefined && game.awayScore !== undefined) {
                const homeScore = parseInt(game.homeScore) || 0;
                const awayScore = parseInt(game.awayScore) || 0;

                // If both scores are 0, game likely hasn't started despite winner being set
                if (homeScore === 0 && awayScore === 0) {
                    console.warn('⚠️ GAME_STATUS: Game has winner but 0-0 score, treating as not complete', game);
                    return false;
                }

                return true;
            }
        }

        return false;
    }

    /**
     * Check if game is in progress
     * @param {Object} game - Game object
     * @returns {boolean}
     */
    isGameInProgress(game) {
        if (!game) return false;

        const status = this.normalizeStatus(game.status);

        // Check explicit in-progress statuses
        if (this.IN_PROGRESS_STATUSES.some(ipStatus => status.includes(ipStatus))) {
            return true;
        }

        // If status contains a quarter or time indicator, it's in progress
        if (status.match(/\d+(st|nd|rd|th)/i) || status.match(/\d+:\d+/)) {
            return true;
        }

        // Check if game has scores but isn't marked final
        if (game.homeScore !== undefined && game.awayScore !== undefined) {
            const homeScore = parseInt(game.homeScore) || 0;
            const awayScore = parseInt(game.awayScore) || 0;

            // If there are scores but no final status, might be in progress
            if ((homeScore > 0 || awayScore > 0) && !this.isGameCompleted(game)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if game has started (either in progress or completed)
     * @param {Object} game - Game object
     * @returns {boolean}
     */
    hasGameStarted(game) {
        if (!game) return false;
        return this.isGameCompleted(game) || this.isGameInProgress(game);
    }

    /**
     * Get game status category
     * @param {Object} game - Game object
     * @returns {string} 'completed' | 'in_progress' | 'not_started'
     */
    getGameStatus(game) {
        if (!game) return 'not_started';

        if (this.isGameCompleted(game)) {
            return 'completed';
        }

        if (this.isGameInProgress(game)) {
            return 'in_progress';
        }

        return 'not_started';
    }

    /**
     * Validate game data integrity
     * Checks for suspicious patterns that might indicate bad ESPN data
     * @param {Object} game - Game object
     * @returns {Object} { isValid: boolean, warnings: string[] }
     */
    validateGameData(game) {
        const warnings = [];

        if (!game) {
            return { isValid: false, warnings: ['Game object is null or undefined'] };
        }

        // Check 1: Status marked final but scores are 0-0
        if (this.isGameCompleted(game)) {
            const homeScore = parseInt(game.homeScore) || 0;
            const awayScore = parseInt(game.awayScore) || 0;

            if (homeScore === 0 && awayScore === 0) {
                warnings.push('Game marked complete but scores are 0-0');
            }
        }

        // Check 2: Winner exists but doesn't match score leader
        if (game.winner && game.winner !== 'TBD') {
            const homeScore = parseInt(game.homeScore) || 0;
            const awayScore = parseInt(game.awayScore) || 0;

            if (homeScore !== awayScore) {
                const actualWinner = homeScore > awayScore ? game.homeTeam || game.h : game.awayTeam || game.a;
                if (game.winner !== actualWinner) {
                    warnings.push(`Winner mismatch: marked as ${game.winner} but ${actualWinner} has higher score`);
                }
            }
        }

        // Check 3: Game time validation (if available)
        if (game.gameTime) {
            const gameTime = new Date(game.gameTime);
            const now = new Date();

            // If game is marked complete but scheduled for the future
            if (this.isGameCompleted(game) && gameTime > now) {
                warnings.push(`Game marked complete but scheduled for future: ${gameTime.toISOString()}`);
            }
        }

        return {
            isValid: warnings.length === 0,
            warnings
        };
    }

    /**
     * Get human-readable status description
     * @param {Object} game - Game object
     * @returns {string}
     */
    getStatusDescription(game) {
        if (!game) return 'Unknown';

        const status = this.getGameStatus(game);

        switch (status) {
            case 'completed':
                return game.status?.includes('ot') || game.status?.includes('overtime')
                    ? 'Final/OT'
                    : 'Final';
            case 'in_progress':
                return game.status || 'In Progress';
            case 'not_started':
                return game.gameTime
                    ? `Scheduled: ${new Date(game.gameTime).toLocaleString()}`
                    : 'Scheduled';
            default:
                return 'Unknown';
        }
    }
}

// Export singleton instance for convenience
export const gameStatusChecker = new GameStatusChecker();

// Also export individual functions for backwards compatibility
export function isGameCompleted(game) {
    return gameStatusChecker.isGameCompleted(game);
}

export function isGameInProgress(game) {
    return gameStatusChecker.isGameInProgress(game);
}

export function hasGameStarted(game) {
    return gameStatusChecker.hasGameStarted(game);
}

export function getGameStatus(game) {
    return gameStatusChecker.getGameStatus(game);
}

export function validateGameData(game) {
    return gameStatusChecker.validateGameData(game);
}

export function getStatusDescription(game) {
    return gameStatusChecker.getStatusDescription(game);
}
