/**
 * ConfidencePerformanceMonitor.js - Real-time Performance Analytics
 * 
 * PURPOSE: Monitor and optimize confidence pool performance in real-time
 * TARGETS: Track 1-2 read operations, <200ms load times, 99% cost reduction
 */

class ConfidencePerformanceMonitor {
    constructor() {
        this.metrics = {
            // Core performance metrics
            firestoreReads: 0,
            firestoreCacheHits: 0,
            localCacheHits: 0,
            totalRequests: 0,
            
            // Load time tracking
            loadTimes: [],
            slowQueries: [],
            
            // Cost tracking
            estimatedCost: 0,
            costSaved: 0,
            
            // System health
            errors: 0,
            recoveries: 0,
            
            // Session tracking
            sessionStart: Date.now(),
            lastReset: Date.now()
        };
        
        this.thresholds = {
            slowQuery: 500, // ms
            maxLoadTime: 200, // ms target
            errorRate: 0.05, // 5%
            targetReads: 2, // max reads per request
            costPerRead: 0.00036 // Firebase cost per document read
        };
        
        this.alerts = [];
        this.performanceLog = [];
        this.isMonitoring = true;
        
        console.log('📊 ConfidencePerformanceMonitor initialized - Tracking enterprise metrics');
    }

    /**
     * Track a Firestore read operation
     */
    trackRead(operation, loadTime = 0, fromCache = false) {
        if (!this.isMonitoring) return;
        
        this.metrics.totalRequests++;
        
        if (fromCache) {
            this.metrics.firestoreCacheHits++;
        } else {
            this.metrics.firestoreReads++;
            this.metrics.estimatedCost += this.thresholds.costPerRead;
        }
        
        // Track load time
        if (loadTime > 0) {
            this.metrics.loadTimes.push(loadTime);
            
            // Check for slow queries
            if (loadTime > this.thresholds.slowQuery) {
                this.trackSlowQuery(operation, loadTime);
            }
            
            // Alert if exceeding target load time
            if (loadTime > this.thresholds.maxLoadTime) {
                this.createAlert('performance', `Load time ${loadTime.toFixed(0)}ms exceeds target ${this.thresholds.maxLoadTime}ms`, {
                    operation,
                    loadTime,
                    target: this.thresholds.maxLoadTime
                });
            }
        }
        
        // Check read efficiency
        if (this.metrics.firestoreReads > this.thresholds.targetReads * this.metrics.totalRequests) {
            this.createAlert('efficiency', `Read count ${this.metrics.firestoreReads} exceeds target`, {
                reads: this.metrics.firestoreReads,
                requests: this.metrics.totalRequests,
                target: this.thresholds.targetReads
            });
        }
        
        this.logPerformanceEvent('read', {
            operation,
            loadTime,
            fromCache,
            totalReads: this.metrics.firestoreReads
        });
    }

    /**
     * Track local cache hit
     */
    trackCacheHit(operation, loadTime = 0) {
        if (!this.isMonitoring) return;
        
        this.metrics.totalRequests++;
        this.metrics.localCacheHits++;
        
        if (loadTime > 0) {
            this.metrics.loadTimes.push(loadTime);
        }
        
        // Calculate cost saved
        this.metrics.costSaved += this.thresholds.costPerRead;
        
        this.logPerformanceEvent('cache_hit', {
            operation,
            loadTime,
            totalCacheHits: this.metrics.localCacheHits
        });
    }

    /**
     * Track an error
     */
    trackError(error, operation, recovered = false) {
        if (!this.isMonitoring) return;
        
        this.metrics.errors++;
        
        if (recovered) {
            this.metrics.recoveries++;
        }
        
        this.createAlert('error', `Error in ${operation}: ${error.message}`, {
            error: error.message,
            operation,
            recovered,
            stack: error.stack?.substring(0, 200)
        });
        
        this.logPerformanceEvent('error', {
            operation,
            error: error.message,
            recovered
        });
        
        // Check error rate
        const errorRate = this.metrics.errors / this.metrics.totalRequests;
        if (errorRate > this.thresholds.errorRate) {
            this.createAlert('critical', `Error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold`, {
                errorRate,
                threshold: this.thresholds.errorRate,
                totalErrors: this.metrics.errors,
                totalRequests: this.metrics.totalRequests
            });
        }
    }

    /**
     * Track slow query
     */
    trackSlowQuery(operation, loadTime) {
        this.metrics.slowQueries.push({
            operation,
            loadTime,
            timestamp: Date.now()
        });
        
        // Keep only last 50 slow queries
        if (this.metrics.slowQueries.length > 50) {
            this.metrics.slowQueries.shift();
        }
        
        console.warn(`🐌 Slow query detected: ${operation} took ${loadTime.toFixed(0)}ms`);
    }

    /**
     * Create performance alert
     */
    createAlert(level, message, details = {}) {
        const alert = {
            level, // 'info', 'warning', 'error', 'critical'
            message,
            details,
            timestamp: Date.now(),
            id: Math.random().toString(36).substring(2, 15)
        };
        
        this.alerts.push(alert);
        
        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
            this.alerts.shift();
        }
        
        // Console output based on level
        const logMethod = {
            info: 'log',
            warning: 'warn',
            error: 'error',
            critical: 'error'
        }[level] || 'log';
        
        console[logMethod](`🚨 Performance Alert [${level.toUpperCase()}]: ${message}`, details);
        
        // Critical alerts should be more visible
        if (level === 'critical') {
            this.displayCriticalAlert(alert);
        }
    }

    /**
     * Display critical alert in UI
     */
    displayCriticalAlert(alert) {
        // Try to find a notification area or create one
        let notificationArea = document.getElementById('performance-notifications');
        
        if (!notificationArea) {
            notificationArea = document.createElement('div');
            notificationArea.id = 'performance-notifications';
            notificationArea.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 300px;
            `;
            document.body.appendChild(notificationArea);
        }
        
        const alertDiv = document.createElement('div');
        alertDiv.style.cssText = `
            background: #fee2e2;
            border: 1px solid #dc2626;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        `;
        
        alertDiv.innerHTML = `
            <div style="display: flex; justify-content: between; items: center;">
                <span style="color: #dc2626; font-weight: bold;">⚠️ Performance Issue</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
            </div>
            <div style="color: #7f1d1d; font-size: 14px; margin-top: 4px;">${alert.message}</div>
        `;
        
        notificationArea.appendChild(alertDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 10000);
    }

    /**
     * Log performance event
     */
    logPerformanceEvent(type, data) {
        this.performanceLog.push({
            type,
            data,
            timestamp: Date.now()
        });
        
        // Keep only last 1000 events
        if (this.performanceLog.length > 1000) {
            this.performanceLog.shift();
        }
    }

    /**
     * Get current performance metrics
     */
    getMetrics() {
        const now = Date.now();
        const sessionDuration = now - this.metrics.sessionStart;
        const avgLoadTime = this.metrics.loadTimes.length > 0 
            ? this.metrics.loadTimes.reduce((a, b) => a + b, 0) / this.metrics.loadTimes.length
            : 0;
        
        return {
            // Core metrics
            firestoreReads: this.metrics.firestoreReads,
            localCacheHits: this.metrics.localCacheHits,
            firestoreCacheHits: this.metrics.firestoreCacheHits,
            totalRequests: this.metrics.totalRequests,
            
            // Performance
            averageLoadTime: parseFloat(avgLoadTime.toFixed(2)),
            slowQueries: this.metrics.slowQueries.length,
            readsPerRequest: this.metrics.totalRequests > 0 
                ? parseFloat((this.metrics.firestoreReads / this.metrics.totalRequests).toFixed(2))
                : 0,
            
            // Efficiency
            cacheHitRate: this.metrics.totalRequests > 0 
                ? parseFloat(((this.metrics.localCacheHits + this.metrics.firestoreCacheHits) / this.metrics.totalRequests * 100).toFixed(1))
                : 0,
            
            // Cost
            estimatedCost: parseFloat(this.metrics.estimatedCost.toFixed(6)),
            costSaved: parseFloat(this.metrics.costSaved.toFixed(6)),
            
            // Reliability
            errorRate: this.metrics.totalRequests > 0 
                ? parseFloat((this.metrics.errors / this.metrics.totalRequests * 100).toFixed(1))
                : 0,
            recoveryRate: this.metrics.errors > 0 
                ? parseFloat((this.metrics.recoveries / this.metrics.errors * 100).toFixed(1))
                : 0,
            
            // Session
            sessionDuration: Math.floor(sessionDuration / 1000),
            activeAlerts: this.alerts.filter(a => now - a.timestamp < 5 * 60 * 1000).length
        };
    }

    /**
     * Get performance targets vs actual
     */
    getPerformanceComparison() {
        const metrics = this.getMetrics();
        
        return {
            loadTime: {
                target: this.thresholds.maxLoadTime,
                actual: metrics.averageLoadTime,
                status: metrics.averageLoadTime <= this.thresholds.maxLoadTime ? 'good' : 'poor'
            },
            readsPerRequest: {
                target: this.thresholds.targetReads,
                actual: metrics.readsPerRequest,
                status: metrics.readsPerRequest <= this.thresholds.targetReads ? 'good' : 'poor'
            },
            errorRate: {
                target: this.thresholds.errorRate * 100,
                actual: metrics.errorRate,
                status: metrics.errorRate <= this.thresholds.errorRate * 100 ? 'good' : 'poor'
            }
        };
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const metrics = this.getMetrics();
        const comparison = this.getPerformanceComparison();
        
        const report = {
            summary: {
                status: this.getOverallStatus(comparison),
                generatedAt: new Date().toISOString(),
                sessionDuration: metrics.sessionDuration
            },
            performance: metrics,
            targets: comparison,
            alerts: {
                total: this.alerts.length,
                active: metrics.activeAlerts,
                recent: this.alerts.filter(a => Date.now() - a.timestamp < 15 * 60 * 1000)
            },
            optimization: {
                costSavings: {
                    total: metrics.costSaved,
                    percentage: metrics.estimatedCost > 0 
                        ? parseFloat((metrics.costSaved / (metrics.estimatedCost + metrics.costSaved) * 100).toFixed(1))
                        : 0
                },
                efficiency: {
                    cacheEffectiveness: metrics.cacheHitRate,
                    readOptimization: this.thresholds.targetReads / Math.max(metrics.readsPerRequest, 0.1)
                }
            },
            recommendations: this.generateRecommendations(metrics, comparison)
        };
        
        return report;
    }

    /**
     * Generate optimization recommendations
     */
    generateRecommendations(metrics, comparison) {
        const recommendations = [];
        
        if (comparison.loadTime.status === 'poor') {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: `Average load time ${metrics.averageLoadTime}ms exceeds target ${this.thresholds.maxLoadTime}ms`,
                action: 'Enable more aggressive caching or optimize query patterns'
            });
        }
        
        if (comparison.readsPerRequest.status === 'poor') {
            recommendations.push({
                type: 'efficiency',
                priority: 'high',
                message: `Average ${metrics.readsPerRequest} reads per request exceeds target ${this.thresholds.targetReads}`,
                action: 'Implement more unified document structures or batch operations'
            });
        }
        
        if (metrics.cacheHitRate < 80) {
            recommendations.push({
                type: 'caching',
                priority: 'medium',
                message: `Cache hit rate ${metrics.cacheHitRate}% could be improved`,
                action: 'Increase cache duration or pre-warm frequently accessed data'
            });
        }
        
        if (comparison.errorRate.status === 'poor') {
            recommendations.push({
                type: 'reliability',
                priority: 'critical',
                message: `Error rate ${metrics.errorRate}% is too high`,
                action: 'Investigate error patterns and improve fallback mechanisms'
            });
        }
        
        return recommendations;
    }

    /**
     * Get overall system status
     */
    getOverallStatus(comparison) {
        const statuses = Object.values(comparison).map(c => c.status);
        
        if (statuses.every(s => s === 'good')) {
            return 'excellent';
        } else if (statuses.filter(s => s === 'good').length >= statuses.length / 2) {
            return 'good';
        } else {
            return 'needs_attention';
        }
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        const oldMetrics = { ...this.metrics };
        
        this.metrics = {
            firestoreReads: 0,
            firestoreCacheHits: 0,
            localCacheHits: 0,
            totalRequests: 0,
            loadTimes: [],
            slowQueries: [],
            estimatedCost: 0,
            costSaved: 0,
            errors: 0,
            recoveries: 0,
            sessionStart: this.metrics.sessionStart,
            lastReset: Date.now()
        };
        
        console.log('📊 Performance metrics reset', oldMetrics);
    }

    /**
     * Export metrics for external analysis
     */
    exportMetrics() {
        const report = this.generateReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `confidence-performance-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📊 Performance report exported');
    }

    /**
     * Start real-time monitoring
     */
    startMonitoring() {
        this.isMonitoring = true;
        console.log('📊 Performance monitoring started');
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        this.isMonitoring = false;
        console.log('📊 Performance monitoring stopped');
    }

    /**
     * Display real-time metrics in console
     */
    displayRealTimeMetrics() {
        const metrics = this.getMetrics();
        console.table({
            'Firestore Reads': metrics.firestoreReads,
            'Cache Hits': metrics.localCacheHits + metrics.firestoreCacheHits,
            'Avg Load Time (ms)': metrics.averageLoadTime,
            'Reads/Request': metrics.readsPerRequest,
            'Cache Hit Rate (%)': metrics.cacheHitRate,
            'Error Rate (%)': metrics.errorRate,
            'Estimated Cost ($)': metrics.estimatedCost,
            'Cost Saved ($)': metrics.costSaved
        });
    }
}

// Global performance monitor instance
window.confidencePerformanceMonitor = new ConfidencePerformanceMonitor();

// Integrate with confidence system
if (window.confidenceIntegration) {
    // Hook into the integration layer to track metrics
    const originalGetDisplayData = window.confidenceIntegration.getDisplayData;
    if (originalGetDisplayData) {
        window.confidenceIntegration.getDisplayData = async function(...args) {
            const startTime = performance.now();
            try {
                const result = await originalGetDisplayData.apply(this, args);
                const loadTime = performance.now() - startTime;
                
                window.confidencePerformanceMonitor.trackRead(
                    'getDisplayData',
                    loadTime,
                    result.fromCache
                );
                
                return result;
            } catch (error) {
                window.confidencePerformanceMonitor.trackError(error, 'getDisplayData');
                throw error;
            }
        };
    }
}

// Periodic reporting
setInterval(() => {
    if (window.confidencePerformanceMonitor.isMonitoring) {
        const metrics = window.confidencePerformanceMonitor.getMetrics();
        if (metrics.totalRequests > 0) {
            console.log(`📊 Performance Summary: ${metrics.averageLoadTime}ms avg, ${metrics.readsPerRequest} reads/req, ${metrics.cacheHitRate}% cache hit`);
        }
    }
}, 60000); // Every minute

console.log('📊 ConfidencePerformanceMonitor loaded - Enterprise performance tracking active');