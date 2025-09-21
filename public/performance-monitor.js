// 🚀 PERFORMANCE MONITORING SYSTEM
// Track exactly which data sources are being used and their performance

class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.isMonitoring = true;
    }

    // 📊 LOG PERFORMANCE METRIC
    logMetric(operation, source, duration, dataSize = null) {
        if (!this.isMonitoring) return;

        const metric = {
            timestamp: new Date().toISOString(),
            operation: operation,
            source: source, // 'precomputed', 'scoring-system', 'live-calculation'
            duration: Math.round(duration * 100) / 100, // Round to 2 decimals
            dataSize: dataSize,
            improvement: null
        };

        this.metrics.push(metric);

        // Calculate improvement over baseline (live calculation ~5000ms)
        const baseline = 5000;
        if (source === 'precomputed') {
            metric.improvement = Math.round((baseline / duration) * 100) / 100;
        }

        console.log(`📈 PERFORMANCE: ${operation} via ${source} took ${duration}ms ${metric.improvement ? `(${metric.improvement}x faster)` : ''}`);

        // Keep only last 50 metrics
        if (this.metrics.length > 50) {
            this.metrics.shift();
        }
    }

    // 🎯 WRAP LEADERBOARD FUNCTION FOR MONITORING
    wrapLeaderboardFunction() {
        if (window.originalCalculateLeaderboardOptimized) return; // Already wrapped

        window.originalCalculateLeaderboardOptimized = window.calculateLeaderboardOptimized;

        window.calculateLeaderboardOptimized = async (weekNumber = null) => {
            const operation = weekNumber ? `Week ${weekNumber} Leaderboard` : 'Season Leaderboard';
            const startTime = performance.now();

            try {
                const result = await window.originalCalculateLeaderboardOptimized(weekNumber);
                const endTime = performance.now();
                const duration = endTime - startTime;

                // Determine data source from console logs
                let source = 'unknown';
                if (duration < 50) {
                    source = 'precomputed'; // Lightning fast = precomputed
                } else if (duration < 1000) {
                    source = 'scoring-system'; // Medium = scoring system
                } else {
                    source = 'live-calculation'; // Slow = live calculation
                }

                this.logMetric(operation, source, duration, result?.length);
                return result;

            } catch (error) {
                const endTime = performance.now();
                const duration = endTime - startTime;
                this.logMetric(operation, 'error', duration);
                throw error;
            }
        };

        console.log('🎯 Performance monitoring enabled for leaderboard functions');
    }

    // 📊 GET PERFORMANCE SUMMARY
    getPerformanceSummary() {
        const precomputedMetrics = this.metrics.filter(m => m.source === 'precomputed');
        const liveMetrics = this.metrics.filter(m => m.source === 'live-calculation');

        const avgPrecomputed = precomputedMetrics.length > 0 ?
            precomputedMetrics.reduce((sum, m) => sum + m.duration, 0) / precomputedMetrics.length : 0;

        const avgLive = liveMetrics.length > 0 ?
            liveMetrics.reduce((sum, m) => sum + m.duration, 0) / liveMetrics.length : 0;

        return {
            totalOperations: this.metrics.length,
            precomputedOperations: precomputedMetrics.length,
            liveOperations: liveMetrics.length,
            averagePrecomputedTime: Math.round(avgPrecomputed * 100) / 100,
            averageLiveTime: Math.round(avgLive * 100) / 100,
            performanceGain: avgLive > 0 ? Math.round((avgLive / avgPrecomputed) * 100) / 100 : 0,
            recentMetrics: this.metrics.slice(-10)
        };
    }

    // 🎛️ CONTROL MONITORING
    setMonitoring(enabled) {
        this.isMonitoring = enabled;
        console.log(`📊 Performance monitoring ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    // 🗑️ CLEAR METRICS
    clearMetrics() {
        this.metrics = [];
        console.log('🗑️ Performance metrics cleared');
    }
}

// 🌟 GLOBAL INSTANCE
window.performanceMonitor = new PerformanceMonitor();

// 🚀 AUTO-INITIALIZE
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.calculateLeaderboardOptimized) {
            window.performanceMonitor.wrapLeaderboardFunction();
        }
    }, 1000);
});

// 🎯 CONVENIENCE FUNCTIONS
window.getPerformanceReport = () => {
    return window.performanceMonitor.getPerformanceSummary();
};

window.showPerformanceReport = () => {
    const report = window.getPerformanceReport();
    console.log('📊 PERFORMANCE REPORT:', report);

    console.log(`\n🚀 SUMMARY:`);
    console.log(`   Total operations: ${report.totalOperations}`);
    console.log(`   Precomputed (fast): ${report.precomputedOperations}`);
    console.log(`   Live calculation (slow): ${report.liveOperations}`);
    console.log(`   Average precomputed time: ${report.averagePrecomputedTime}ms`);
    console.log(`   Average live time: ${report.averageLiveTime}ms`);
    console.log(`   Performance gain: ${report.performanceGain}x faster`);

    return report;
};

console.log('📊 Performance Monitor loaded - tracking all leaderboard operations');