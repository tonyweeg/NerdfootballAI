/**
 * NerdFootball Centralized Error Handling System
 * Provides consistent error classification, logging, and user-friendly messaging
 */

// Error categories for classification
const ErrorCategory = {
    FIREBASE: 'firebase',
    NETWORK: 'network',
    AUTHENTICATION: 'authentication',
    VALIDATION: 'validation',
    PERMISSION: 'permission',
    DATA: 'data',
    UNKNOWN: 'unknown'
};

// Error severity levels
const ErrorSeverity = {
    CRITICAL: 'critical',    // System cannot continue
    HIGH: 'high',           // Major feature broken
    MEDIUM: 'medium',       // Feature degraded
    LOW: 'low'             // Minor issue, workaround available
};

/**
 * NerdFootball Error Handler
 * Classifies, logs, and presents errors with recovery suggestions
 */
class ErrorHandler {
    constructor(logger = null) {
        this.logger = logger || (typeof window !== 'undefined' && window.logger) || console;
        this.errorHistory = [];
        this.maxHistorySize = 50;
    }

    /**
     * Classify an error into a category
     * @param {Error} error - The error to classify
     * @returns {string} Error category
     */
    classifyError(error) {
        const message = error.message?.toLowerCase() || '';
        const code = error.code?.toLowerCase() || '';

        // Firebase errors
        if (code.includes('firebase') ||
            code.includes('firestore') ||
            code.includes('permission-denied') ||
            code.includes('unauthenticated')) {
            return ErrorCategory.FIREBASE;
        }

        // Network errors
        if (message.includes('network') ||
            message.includes('fetch') ||
            message.includes('timeout') ||
            code.includes('network')) {
            return ErrorCategory.NETWORK;
        }

        // Authentication errors
        if (message.includes('auth') ||
            message.includes('login') ||
            message.includes('credential') ||
            code.includes('auth')) {
            return ErrorCategory.AUTHENTICATION;
        }

        // Permission errors
        if (message.includes('permission') ||
            message.includes('forbidden') ||
            message.includes('unauthorized') ||
            code.includes('permission') ||
            code.includes('403')) {
            return ErrorCategory.PERMISSION;
        }

        // Validation errors
        if (message.includes('invalid') ||
            message.includes('validation') ||
            message.includes('required') ||
            code.includes('invalid')) {
            return ErrorCategory.VALIDATION;
        }

        // Data errors
        if (message.includes('not found') ||
            message.includes('missing') ||
            message.includes('undefined') ||
            message.includes('null') ||
            code.includes('not-found')) {
            return ErrorCategory.DATA;
        }

        return ErrorCategory.UNKNOWN;
    }

    /**
     * Determine error severity
     * @param {string} category - Error category
     * @param {Error} error - The error object
     * @returns {string} Severity level
     */
    determineSeverity(category, error) {
        const message = error.message?.toLowerCase() || '';

        // Critical errors that prevent core functionality
        if (category === ErrorCategory.FIREBASE && message.includes('init')) {
            return ErrorSeverity.CRITICAL;
        }

        // High severity for authentication issues
        if (category === ErrorCategory.AUTHENTICATION ||
            category === ErrorCategory.PERMISSION) {
            return ErrorSeverity.HIGH;
        }

        // Medium for network and data issues
        if (category === ErrorCategory.NETWORK ||
            category === ErrorCategory.DATA) {
            return ErrorSeverity.MEDIUM;
        }

        // Low for validation issues
        if (category === ErrorCategory.VALIDATION) {
            return ErrorSeverity.LOW;
        }

        return ErrorSeverity.MEDIUM;
    }

    /**
     * Get user-friendly error message
     * @param {string} category - Error category
     * @param {Error} error - The error object
     * @returns {string} User-friendly message
     */
    getUserMessage(category, error) {
        switch (category) {
            case ErrorCategory.FIREBASE:
                if (error.code === 'permission-denied') {
                    return 'You do not have permission to access this data. Please ensure you are logged in with an authorized account.';
                }
                if (error.code === 'unauthenticated') {
                    return 'Your session has expired. Please log in again to continue.';
                }
                return 'There was a problem connecting to the database. Please try again in a moment.';

            case ErrorCategory.NETWORK:
                return 'Network connection issue detected. Please check your internet connection and try again.';

            case ErrorCategory.AUTHENTICATION:
                return 'Authentication failed. Please log in again to continue.';

            case ErrorCategory.PERMISSION:
                return 'Access denied. You do not have permission to perform this action.';

            case ErrorCategory.VALIDATION:
                return 'Invalid data provided. Please check your input and try again.';

            case ErrorCategory.DATA:
                return 'The requested data could not be found. It may have been moved or deleted.';

            case ErrorCategory.UNKNOWN:
            default:
                return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
        }
    }

    /**
     * Get recovery suggestions for an error
     * @param {string} category - Error category
     * @param {Error} error - The error object
     * @returns {Array<string>} List of recovery suggestions
     */
    getRecoverySuggestions(category, error) {
        const suggestions = [];

        switch (category) {
            case ErrorCategory.FIREBASE:
                if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
                    suggestions.push('Log out and log back in');
                    suggestions.push('Clear your browser cache and cookies');
                    suggestions.push('Contact an administrator to verify your account permissions');
                } else {
                    suggestions.push('Refresh the page');
                    suggestions.push('Wait a moment and try again');
                    suggestions.push('Check Firebase console for service status');
                }
                break;

            case ErrorCategory.NETWORK:
                suggestions.push('Check your internet connection');
                suggestions.push('Disable any VPN or proxy connections');
                suggestions.push('Try refreshing the page');
                suggestions.push('Clear browser cache');
                break;

            case ErrorCategory.AUTHENTICATION:
                suggestions.push('Log out and log back in');
                suggestions.push('Reset your password if needed');
                suggestions.push('Clear browser cookies');
                suggestions.push('Try a different browser');
                break;

            case ErrorCategory.PERMISSION:
                suggestions.push('Verify you are logged in with the correct account');
                suggestions.push('Contact an administrator for access');
                suggestions.push('Check if your account has the required permissions');
                break;

            case ErrorCategory.VALIDATION:
                suggestions.push('Double-check the data you entered');
                suggestions.push('Ensure all required fields are filled');
                suggestions.push('Verify data format matches requirements');
                break;

            case ErrorCategory.DATA:
                suggestions.push('Refresh the page to reload data');
                suggestions.push('Check if the item was recently deleted');
                suggestions.push('Try searching for the item again');
                break;

            case ErrorCategory.UNKNOWN:
                suggestions.push('Refresh the page');
                suggestions.push('Clear browser cache and cookies');
                suggestions.push('Try again in a few minutes');
                suggestions.push('Contact support with error details');
                break;
        }

        return suggestions;
    }

    /**
     * Handle an error with full classification and logging
     * @param {Error} error - The error to handle
     * @param {Object} context - Additional context information
     * @returns {Object} Error details object
     */
    handle(error, context = {}) {
        const category = this.classifyError(error);
        const severity = this.determineSeverity(category, error);
        const userMessage = this.getUserMessage(category, error);
        const suggestions = this.getRecoverySuggestions(category, error);

        const errorDetails = {
            timestamp: new Date().toISOString(),
            category,
            severity,
            userMessage,
            suggestions,
            originalError: error.message,
            code: error.code || null,
            context,
            stack: error.stack
        };

        // Log based on severity
        const logCategory = context.category || category.toUpperCase();
        switch (severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                if (this.logger.error) {
                    this.logger.error(logCategory, userMessage, errorDetails);
                } else {
                    console.error(`${logCategory}: ${userMessage}`, errorDetails);
                }
                break;

            case ErrorSeverity.MEDIUM:
                if (this.logger.warn) {
                    this.logger.warn(logCategory, userMessage, errorDetails);
                } else {
                    console.warn(`${logCategory}: ${userMessage}`, errorDetails);
                }
                break;

            case ErrorSeverity.LOW:
                if (this.logger.info) {
                    this.logger.info(logCategory, userMessage, errorDetails);
                } else {
                    console.info(`${logCategory}: ${userMessage}`, errorDetails);
                }
                break;
        }

        // Store in history
        this.addToHistory(errorDetails);

        return errorDetails;
    }

    /**
     * Add error to history with size limit
     * @param {Object} errorDetails - Error details to store
     */
    addToHistory(errorDetails) {
        this.errorHistory.unshift(errorDetails);
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.pop();
        }
    }

    /**
     * Get error history
     * @param {number} limit - Max number of errors to return
     * @returns {Array<Object>} Recent errors
     */
    getHistory(limit = 10) {
        return this.errorHistory.slice(0, limit);
    }

    /**
     * Display error to user with recovery UI
     * @param {Object} errorDetails - Error details from handle()
     * @param {HTMLElement} container - Container element to show error in
     */
    displayError(errorDetails, container) {
        if (!container) return;

        const severityColors = {
            critical: 'red',
            high: 'orange',
            medium: 'yellow',
            low: 'blue'
        };

        const color = severityColors[errorDetails.severity] || 'gray';

        container.innerHTML = `
            <div style="border: 2px solid ${color}; border-radius: 8px; padding: 16px; margin: 16px 0; background: rgba(255, 255, 255, 0.9);">
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <span style="font-size: 24px; margin-right: 12px;">⚠️</span>
                    <h3 style="margin: 0; color: #333;">Error Occurred</h3>
                </div>

                <p style="color: #666; margin: 8px 0; font-size: 14px;">
                    ${errorDetails.userMessage}
                </p>

                ${errorDetails.suggestions.length > 0 ? `
                    <div style="margin-top: 12px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
                        <strong style="color: #333; display: block; margin-bottom: 8px;">Try these solutions:</strong>
                        <ul style="margin: 0; padding-left: 20px; color: #666;">
                            ${errorDetails.suggestions.map(suggestion =>
                                `<li style="margin: 4px 0;">${suggestion}</li>`
                            ).join('')}
                        </ul>
                    </div>
                ` : ''}

                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 12px; color: #999;">
                    Error ID: ${errorDetails.timestamp}
                </div>
            </div>
        `;
    }

    /**
     * Wrap an async function with automatic error handling
     * @param {Function} fn - Async function to wrap
     * @param {Object} context - Context for error logging
     * @returns {Function} Wrapped function
     */
    wrapAsync(fn, context = {}) {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                const errorDetails = this.handle(error, context);
                throw errorDetails;
            }
        };
    }

    /**
     * Clear error history
     */
    clearHistory() {
        this.errorHistory = [];
    }
}

// Create and export singleton instance
const errorHandler = new ErrorHandler();

// Export for ES6 modules
export { ErrorHandler, ErrorCategory, ErrorSeverity, errorHandler };

// Also make available globally for non-module scripts
if (typeof window !== 'undefined') {
    window.ErrorHandler = ErrorHandler;
    window.ErrorCategory = ErrorCategory;
    window.ErrorSeverity = ErrorSeverity;
    window.errorHandler = errorHandler;
}
