/**
 * Suppress Tailwind CDN Production Warning
 * Filters out the annoying "cdn.tailwindcss.com should not be used in production" warning
 * while preserving other legitimate console warnings
 */

(function() {
    const originalWarn = console.warn;
    console.warn = function(...args) {
        // Filter out Tailwind CDN warning
        const message = args.join(' ');
        if (message.includes('cdn.tailwindcss.com should not be used in production')) {
            return; // Suppress this specific warning
        }
        // Allow all other warnings through
        originalWarn.apply(console, args);
    };
})();
