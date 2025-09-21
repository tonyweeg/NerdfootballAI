// PERFORMANCE MEGA-BUNDLE - Consolidate critical scripts
// This replaces 18+ individual script loads with one optimized bundle

console.log('🚀 PERFORMANCE BUNDLE LOADING...');

// Inline critical functions only - remove redundancy
window.loadCriticalSystems = async function() {
    // Only load essential systems for initial page load
    const essentials = [
        './gameStateCache.js',
        './core-bundle.js',
        './ScoringSystemManager.js'
    ];

    for (const script of essentials) {
        if (!document.querySelector(`script[src="${script}"]`)) {
            const s = document.createElement('script');
            s.src = script;
            s.async = true;
            document.head.appendChild(s);
        }
    }
};

// Lazy load non-critical systems after page ready
window.loadNonCriticalSystems = async function() {
    console.log('⚡ Loading non-critical systems...');

    const nonCritical = [
        './confidence-bundle.js',
        './features-bundle.js',
        './realtimeManager.js'
    ];

    setTimeout(() => {
        nonCritical.forEach(script => {
            const s = document.createElement('script');
            s.src = script;
            s.async = true;
            document.head.appendChild(s);
        });
    }, 100);
};

console.log('✅ Performance bundle ready');