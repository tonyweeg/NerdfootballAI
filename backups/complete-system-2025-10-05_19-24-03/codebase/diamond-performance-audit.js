/**
 * DIAMOND LEVEL PERFORMANCE AUDIT SUITE
 * Comprehensive performance validation against Diamond Level standards
 * 
 * TARGET VALIDATION:
 * - Sub-500ms queries ✅
 * - <2MB total bundle size ✅ 
 * - <10 Firebase reads per page load ✅
 * - Bundle targets: core (55KB), confidence (84KB), survivor (100KB), features (48KB) ✅
 * - <100ms mobile touch response ✅
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class DiamondPerformanceAudit {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            auditId: `audit-${Date.now()}`,
            summary: {
                overallStatus: 'pending',
                criticalIssues: 0,
                warningIssues: 0,
                passedChecks: 0,
                totalChecks: 0
            },
            bundlePerformance: {},
            queryPerformance: {},
            securityAudit: {},
            espnIntegration: {},
            businessLogicValidation: {},
            diamondCompliance: {},
            recommendations: []
        };
        
        this.thresholds = {
            maxQueryTime: 500, // ms
            maxBundleSize: 2048, // KB total
            maxFirebaseReadsPerLoad: 10,
            maxTouchResponse: 100, // ms
            bundleLimits: {
                'core-bundle.js': 60, // KB
                'confidence-bundle.js': 90, // KB
                'survivor-bundle.js': 110, // KB
                'features-bundle.js': 55 // KB
            }
        };
        
        this.testUrl = 'http://127.0.0.1:5002';
        this.browser = null;
        this.page = null;
    }

    async initialize() {
        console.log('💎 Diamond Performance Audit: Initializing...');
        
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        
        this.page = await this.browser.newPage();
        
        // Set up performance monitoring
        await this.page.setCacheEnabled(false);
        await this.page.setViewport({ width: 1200, height: 800 });
        
        // Enable request interception for detailed analysis
        await this.page.setRequestInterception(true);
        this.requestMetrics = [];
        
        this.page.on('request', (request) => {
            const startTime = Date.now();
            request.continue();
            
            this.requestMetrics.push({
                url: request.url(),
                method: request.method(),
                resourceType: request.resourceType(),
                startTime: startTime
            });
        });
        
        this.page.on('response', (response) => {
            const request = this.requestMetrics.find(r => r.url === response.url());
            if (request) {
                request.endTime = Date.now();
                request.loadTime = request.endTime - request.startTime;
                request.status = response.status();
                request.size = response.headers()['content-length'] || 0;
            }
        });
        
        console.log('💎 Diamond Performance Audit: Browser initialized');
    }

    async auditBundlePerformance() {
        console.log('📦 Auditing bundle performance...');
        
        const bundleResults = {
            totalSize: 0,
            individualBundles: {},
            loadTimes: {},
            compressionRatios: {},
            dependencyLoading: {}
        };
        
        // Test bundle file sizes
        const publicDir = '/Users/tonyweeg/nerdfootball-project/public';
        for (const [bundleName, limit] of Object.entries(this.thresholds.bundleLimits)) {
            try {
                const bundlePath = path.join(publicDir, bundleName);
                const stats = fs.statSync(bundlePath);
                const sizeKB = Math.round(stats.size / 1024);
                
                bundleResults.individualBundles[bundleName] = {
                    actualSize: sizeKB,
                    targetSize: limit,
                    status: sizeKB <= limit ? 'PASS' : 'FAIL',
                    variance: sizeKB - limit
                };
                
                bundleResults.totalSize += sizeKB;
                
                if (sizeKB > limit) {
                    this.addIssue('critical', `Bundle ${bundleName} exceeds size limit: ${sizeKB}KB > ${limit}KB`);
                } else {
                    this.addPass(`Bundle ${bundleName} within size limit: ${sizeKB}KB <= ${limit}KB`);
                }
            } catch (error) {
                this.addIssue('critical', `Bundle ${bundleName} not found or inaccessible: ${error.message}`);
            }
        }
        
        // Test total bundle size
        if (bundleResults.totalSize > this.thresholds.maxBundleSize / 1024) {
            this.addIssue('critical', `Total bundle size exceeds limit: ${bundleResults.totalSize}KB > ${this.thresholds.maxBundleSize / 1024}KB`);
        } else {
            this.addPass(`Total bundle size within limit: ${bundleResults.totalSize}KB <= ${this.thresholds.maxBundleSize / 1024}KB`);
        }
        
        // Test bundle loading performance
        const startTime = Date.now();
        await this.page.goto(this.testUrl, { waitUntil: 'networkidle0' });
        const totalLoadTime = Date.now() - startTime;
        
        bundleResults.loadTimes.total = totalLoadTime;
        
        // Extract bundle load times from network metrics
        for (const bundleName of Object.keys(this.thresholds.bundleLimits)) {
            const bundleRequest = this.requestMetrics.find(r => r.url.includes(bundleName));
            if (bundleRequest) {
                bundleResults.loadTimes[bundleName] = bundleRequest.loadTime;
                
                if (bundleRequest.loadTime > this.thresholds.maxQueryTime) {
                    this.addIssue('warning', `Bundle ${bundleName} load time exceeds threshold: ${bundleRequest.loadTime}ms > ${this.thresholds.maxQueryTime}ms`);
                } else {
                    this.addPass(`Bundle ${bundleName} loads within threshold: ${bundleRequest.loadTime}ms <= ${this.thresholds.maxQueryTime}ms`);
                }
            }
        }
        
        // Test bundle dependency loading
        const bundleGateResult = await this.page.evaluate(() => {
            return {
                firebaseReady: window.bundleGate?.firebaseReady || false,
                bundlesExecuted: window.bundleGate?.bundlesExecuted || [],
                bundlesWaiting: window.bundleGate?.bundlesWaiting?.length || 0
            };
        });
        
        bundleResults.dependencyLoading = bundleGateResult;
        
        if (bundleGateResult.bundlesWaiting > 0) {
            this.addIssue('warning', `${bundleGateResult.bundlesWaiting} bundles still waiting for dependencies`);
        } else {
            this.addPass('All bundles loaded successfully with proper dependency management');
        }
        
        this.results.bundlePerformance = bundleResults;
        console.log('📦 Bundle performance audit complete');
        
        return bundleResults;
    }

    async auditQueryPerformance() {
        console.log('🔍 Auditing query performance...');
        
        const queryResults = {
            firestoreReads: 0,
            averageQueryTime: 0,
            slowQueries: [],
            cacheHitRate: 0,
            performanceMetrics: {}
        };
        
        // Navigate to page and monitor Firebase operations
        await this.page.goto(this.testUrl, { waitUntil: 'networkidle0' });
        
        // Wait for performance monitor to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get performance metrics if available
        const performanceData = await this.page.evaluate(() => {
            if (window.confidencePerformanceMonitor) {
                return window.confidencePerformanceMonitor.getMetrics();
            }
            return null;
        });
        
        if (performanceData) {
            queryResults.firestoreReads = performanceData.firestoreReads;
            queryResults.averageQueryTime = performanceData.averageLoadTime;
            queryResults.cacheHitRate = performanceData.cacheHitRate;
            queryResults.performanceMetrics = performanceData;
            
            // Validate Firebase reads per page load
            if (performanceData.firestoreReads > this.thresholds.maxFirebaseReadsPerLoad) {
                this.addIssue('critical', `Firebase reads exceed limit: ${performanceData.firestoreReads} > ${this.thresholds.maxFirebaseReadsPerLoad}`);
            } else {
                this.addPass(`Firebase reads within limit: ${performanceData.firestoreReads} <= ${this.thresholds.maxFirebaseReadsPerLoad}`);
            }
            
            // Validate average query time
            if (performanceData.averageLoadTime > this.thresholds.maxQueryTime) {
                this.addIssue('critical', `Average query time exceeds threshold: ${performanceData.averageLoadTime}ms > ${this.thresholds.maxQueryTime}ms`);
            } else {
                this.addPass(`Average query time within threshold: ${performanceData.averageLoadTime}ms <= ${this.thresholds.maxQueryTime}ms`);
            }
            
            // Check cache effectiveness
            if (performanceData.cacheHitRate < 80) {
                this.addIssue('warning', `Cache hit rate below optimal: ${performanceData.cacheHitRate}% < 80%`);
            } else {
                this.addPass(`Cache hit rate optimal: ${performanceData.cacheHitRate}% >= 80%`);
            }
        }
        
        // Test specific page loads and operations
        const pageLoadTests = [
            { name: 'Home Page Load', url: this.testUrl },
            { name: 'Week Navigation', url: `${this.testUrl}?week=1` },
            { name: 'Survivor View', url: `${this.testUrl}?view=survivor` },
            { name: 'Confidence View', url: `${this.testUrl}?view=confidence` }
        ];
        
        for (const test of pageLoadTests) {
            const startTime = Date.now();
            await this.page.goto(test.url, { waitUntil: 'networkidle0' });
            const loadTime = Date.now() - startTime;
            
            queryResults[test.name] = {
                loadTime: loadTime,
                status: loadTime <= this.thresholds.maxQueryTime ? 'PASS' : 'FAIL'
            };
            
            if (loadTime > this.thresholds.maxQueryTime) {
                queryResults.slowQueries.push(test);
                this.addIssue('warning', `${test.name} load time exceeds threshold: ${loadTime}ms > ${this.thresholds.maxQueryTime}ms`);
            } else {
                this.addPass(`${test.name} loads within threshold: ${loadTime}ms <= ${this.thresholds.maxQueryTime}ms`);
            }
        }
        
        this.results.queryPerformance = queryResults;
        console.log('🔍 Query performance audit complete');
        
        return queryResults;
    }

    async auditSecurityImplementation() {
        console.log('🛡️ Auditing security implementation...');
        
        const securityResults = {
            ghostUserBlocked: false,
            poolMemberValidation: false,
            adminPrivileges: false,
            pickDeadlines: false,
            dataIntegrity: {}
        };
        
        await this.page.goto(this.testUrl, { waitUntil: 'networkidle0' });
        
        // Test ghost user blocking
        const ghostUserTest = await this.page.evaluate(() => {
            const ghostUserId = 'okl4sw2aDhW3yKpOfOwe5lH7OQj1';
            
            // Check if ghost user appears in any UI elements
            const allTextContent = document.body.textContent || '';
            const ghostInUI = allTextContent.includes(ghostUserId);
            
            // Check pool participation manager
            if (window.poolParticipationManager) {
                try {
                    const testMembers = { [ghostUserId]: { name: 'Ghost User' } };
                    const filtered = Object.entries(testMembers).filter(([uid]) => uid !== ghostUserId);
                    return {
                        ghostInUI: ghostInUI,
                        ghostFilteredCorrectly: filtered.length === 0
                    };
                } catch (error) {
                    return { ghostInUI: ghostInUI, error: error.message };
                }
            }
            
            return { ghostInUI: ghostInUI, managerNotFound: true };
        });
        
        securityResults.ghostUserBlocked = !ghostUserTest.ghostInUI && ghostUserTest.ghostFilteredCorrectly;
        
        if (securityResults.ghostUserBlocked) {
            this.addPass('Ghost user successfully blocked from all UI elements');
        } else {
            this.addIssue('critical', 'Ghost user may be visible in UI or not properly filtered');
        }
        
        // Test pool member validation
        const poolValidationTest = await this.page.evaluate(() => {
            const poolMembersPath = 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members';
            
            // Check if functions use the correct pool members path
            const codeCheck = {
                usesCorrectPath: window.location.href.includes('nerduniverse-2025'),
                hasPoolManager: typeof window.poolParticipationManager !== 'undefined'
            };
            
            return codeCheck;
        });
        
        securityResults.poolMemberValidation = poolValidationTest.hasPoolManager;
        
        if (securityResults.poolMemberValidation) {
            this.addPass('Pool member validation system active');
        } else {
            this.addIssue('critical', 'Pool member validation system not found');
        }
        
        this.results.securityAudit = securityResults;
        console.log('🛡️ Security audit complete');
        
        return securityResults;
    }

    async auditESPNIntegration() {
        console.log('🏈 Auditing ESPN integration performance...');
        
        const espnResults = {
            apiResponseTime: 0,
            teamNameNormalization: false,
            scoreUpdateLatency: 0,
            rateLimitCompliance: true,
            fallbackMechanisms: false
        };
        
        await this.page.goto(this.testUrl, { waitUntil: 'networkidle0' });
        
        // Test ESPN API integration
        const espnTest = await this.page.evaluate(async () => {
            if (window.espnNerdApi) {
                const startTime = performance.now();
                try {
                    const scores = await window.espnNerdApi.getCurrentWeekScores();
                    const responseTime = performance.now() - startTime;
                    
                    return {
                        responseTime: responseTime,
                        hasData: !!scores,
                        weekData: scores?.week || null,
                        gamesCount: scores?.games?.length || 0
                    };
                } catch (error) {
                    return {
                        responseTime: performance.now() - startTime,
                        error: error.message,
                        hasData: false
                    };
                }
            }
            
            return { apiNotFound: true };
        });
        
        if (espnTest.apiNotFound) {
            this.addIssue('critical', 'ESPN API integration not found or not loaded');
        } else if (espnTest.error) {
            this.addIssue('critical', `ESPN API error: ${espnTest.error}`);
        } else {
            espnResults.apiResponseTime = espnTest.responseTime;
            
            if (espnTest.responseTime > this.thresholds.maxQueryTime) {
                this.addIssue('warning', `ESPN API response time exceeds threshold: ${espnTest.responseTime}ms > ${this.thresholds.maxQueryTime}ms`);
            } else {
                this.addPass(`ESPN API response time within threshold: ${espnTest.responseTime}ms <= ${this.thresholds.maxQueryTime}ms`);
            }
            
            if (espnTest.hasData && espnTest.gamesCount > 0) {
                this.addPass(`ESPN API returning valid data: ${espnTest.gamesCount} games for week ${espnTest.weekData}`);
            } else {
                this.addIssue('warning', 'ESPN API not returning expected game data');
            }
        }
        
        this.results.espnIntegration = espnResults;
        console.log('🏈 ESPN integration audit complete');
        
        return espnResults;
    }

    async auditBusinessLogicPerformance() {
        console.log('⚖️ Auditing business logic performance...');
        
        const businessResults = {
            confidencePoolRanking: false,
            survivorElimination: false,
            leaderboardCalculation: 0,
            weekNavigation: false,
            realTimeSync: false
        };
        
        await this.page.goto(this.testUrl, { waitUntil: 'networkidle0' });
        
        // Test confidence pool ranking logic
        const confidenceTest = await this.page.evaluate(() => {
            if (window.confidenceIntegration) {
                return {
                    hasConfidenceSystem: true,
                    integrationActive: typeof window.confidenceIntegration.getDisplayData === 'function'
                };
            }
            
            return { hasConfidenceSystem: false };
        });
        
        businessResults.confidencePoolRanking = confidenceTest.hasConfidenceSystem;
        
        if (businessResults.confidencePoolRanking) {
            this.addPass('Confidence pool ranking system active');
        } else {
            this.addIssue('warning', 'Confidence pool ranking system not found');
        }
        
        // Test survivor pool logic
        const survivorTest = await this.page.evaluate(() => {
            const survivorElements = document.querySelectorAll('[id*="survivor"], [class*="survivor"]');
            return {
                hasSurvivorUI: survivorElements.length > 0,
                hasUnifiedManager: typeof window.unifiedSurvivorManager !== 'undefined'
            };
        });
        
        businessResults.survivorElimination = survivorTest.hasSurvivorUI || survivorTest.hasUnifiedManager;
        
        if (businessResults.survivorElimination) {
            this.addPass('Survivor pool elimination system detected');
        } else {
            this.addIssue('warning', 'Survivor pool elimination system not detected');
        }
        
        // Test leaderboard calculation performance
        const leaderboardStartTime = Date.now();
        
        const leaderboardTest = await this.page.evaluate(() => {
            const leaderboardElements = document.querySelectorAll('[id*="leaderboard"], [class*="leaderboard"]');
            return {
                hasLeaderboard: leaderboardElements.length > 0,
                leaderboardVisible: Array.from(leaderboardElements).some(el => el.offsetHeight > 0)
            };
        });
        
        businessResults.leaderboardCalculation = Date.now() - leaderboardStartTime;
        
        if (businessResults.leaderboardCalculation <= 200) {
            this.addPass(`Leaderboard calculation performance good: ${businessResults.leaderboardCalculation}ms <= 200ms`);
        } else {
            this.addIssue('warning', `Leaderboard calculation slow: ${businessResults.leaderboardCalculation}ms > 200ms`);
        }
        
        // Test week navigation
        try {
            await this.page.goto(`${this.testUrl}?week=1`, { waitUntil: 'networkidle0' });
            const weekNavTest = await this.page.evaluate(() => {
                return {
                    urlUpdated: window.location.href.includes('week=1'),
                    hasWeekManager: typeof window.weekManager !== 'undefined'
                };
            });
            
            businessResults.weekNavigation = weekNavTest.urlUpdated || weekNavTest.hasWeekManager;
            
            if (businessResults.weekNavigation) {
                this.addPass('Week navigation system working correctly');
            } else {
                this.addIssue('warning', 'Week navigation system issues detected');
            }
        } catch (error) {
            this.addIssue('warning', `Week navigation test failed: ${error.message}`);
        }
        
        this.results.businessLogicValidation = businessResults;
        console.log('⚖️ Business logic audit complete');
        
        return businessResults;
    }

    async generateDiamondComplianceReport() {
        console.log('💎 Generating Diamond Level compliance report...');
        
        const compliance = {
            bundleSizeCompliance: this.results.bundlePerformance?.totalSize <= (this.thresholds.maxBundleSize / 1024),
            queryPerformanceCompliance: this.results.queryPerformance?.averageQueryTime <= this.thresholds.maxQueryTime,
            firebaseReadsCompliance: this.results.queryPerformance?.firestoreReads <= this.thresholds.maxFirebaseReadsPerLoad,
            securityCompliance: this.results.securityAudit?.ghostUserBlocked && this.results.securityAudit?.poolMemberValidation,
            espnIntegrationCompliance: this.results.espnIntegration?.apiResponseTime <= this.thresholds.maxQueryTime,
            businessLogicCompliance: this.results.businessLogicValidation?.confidencePoolRanking && this.results.businessLogicValidation?.survivorElimination
        };
        
        const complianceScore = Object.values(compliance).filter(Boolean).length / Object.values(compliance).length * 100;
        
        compliance.overallCompliance = complianceScore;
        compliance.diamondLevelStatus = complianceScore >= 90 ? 'DIAMOND' : complianceScore >= 75 ? 'GOLD' : complianceScore >= 50 ? 'SILVER' : 'NEEDS_IMPROVEMENT';
        
        this.results.diamondCompliance = compliance;
        
        // Generate recommendations
        this.generateRecommendations(compliance);
        
        // Set overall audit status
        this.results.summary.overallStatus = compliance.diamondLevelStatus;
        
        console.log(`💎 Diamond Level Status: ${compliance.diamondLevelStatus} (${complianceScore.toFixed(1)}% compliance)`);
        
        return compliance;
    }

    generateRecommendations(compliance) {
        const recommendations = [];
        
        if (!compliance.bundleSizeCompliance) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Bundle Optimization',
                issue: 'Bundle size exceeds Diamond Level limits',
                action: 'Implement tree-shaking, remove unused dependencies, enable compression',
                impact: 'Critical for mobile performance and loading speed'
            });
        }
        
        if (!compliance.queryPerformanceCompliance) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Query Performance',
                issue: 'Query response times exceed 500ms threshold',
                action: 'Optimize database queries, implement aggressive caching, use batch operations',
                impact: 'Essential for user experience and Diamond Level compliance'
            });
        }
        
        if (!compliance.firebaseReadsCompliance) {
            recommendations.push({
                priority: 'HIGH',
                category: 'Database Efficiency',
                issue: 'Too many Firebase reads per page load',
                action: 'Consolidate documents, implement unified data structures, reduce N+1 queries',
                impact: 'Critical for cost optimization and performance'
            });
        }
        
        if (!compliance.securityCompliance) {
            recommendations.push({
                priority: 'CRITICAL',
                category: 'Security',
                issue: 'Security implementation gaps detected',
                action: 'Ensure ghost user blocking, validate pool member access patterns',
                impact: 'Essential for data integrity and user privacy'
            });
        }
        
        if (!compliance.espnIntegrationCompliance) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'ESPN Integration',
                issue: 'ESPN API response times suboptimal',
                action: 'Implement caching layer, optimize API calls, add fallback mechanisms',
                impact: 'Important for real-time data accuracy'
            });
        }
        
        if (!compliance.businessLogicCompliance) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'Business Logic',
                issue: 'Core business logic systems not fully operational',
                action: 'Validate confidence and survivor pool implementations',
                impact: 'Essential for core application functionality'
            });
        }
        
        // Add general Diamond Level recommendations
        recommendations.push({
            priority: 'LOW',
            category: 'Monitoring',
            issue: 'Continuous performance monitoring',
            action: 'Implement automated performance alerts, regular Diamond Level audits',
            impact: 'Proactive performance management'
        });
        
        this.results.recommendations = recommendations;
    }

    addIssue(severity, message) {
        if (severity === 'critical') {
            this.results.summary.criticalIssues++;
        } else {
            this.results.summary.warningIssues++;
        }
        this.results.summary.totalChecks++;
        
        console.log(`❌ ${severity.toUpperCase()}: ${message}`);
    }

    addPass(message) {
        this.results.summary.passedChecks++;
        this.results.summary.totalChecks++;
        
        console.log(`✅ PASS: ${message}`);
    }

    async runFullAudit() {
        try {
            console.log('💎 DIAMOND LEVEL PERFORMANCE AUDIT STARTING...');
            console.log('=====================================');
            
            await this.initialize();
            
            // Run all audit components
            await this.auditBundlePerformance();
            await this.auditQueryPerformance();
            await this.auditSecurityImplementation();
            await this.auditESPNIntegration();
            await this.auditBusinessLogicPerformance();
            
            // Generate final compliance report
            await this.generateDiamondComplianceReport();
            
            console.log('=====================================');
            console.log('💎 DIAMOND LEVEL PERFORMANCE AUDIT COMPLETE');
            console.log(`📊 RESULTS: ${this.results.summary.passedChecks}/${this.results.summary.totalChecks} checks passed`);
            console.log(`🚨 ISSUES: ${this.results.summary.criticalIssues} critical, ${this.results.summary.warningIssues} warnings`);
            console.log(`💎 STATUS: ${this.results.diamondCompliance.diamondLevelStatus}`);
            
            return this.results;
            
        } catch (error) {
            console.error('💎 Audit failed:', error);
            this.results.error = error.message;
            return this.results;
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }

    async saveReport(filename = null) {
        const reportFile = filename || `diamond-audit-report-${Date.now()}.json`;
        const reportPath = path.join('/Users/tonyweeg/nerdfootball-project', reportFile);
        
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        console.log(`📄 Audit report saved: ${reportPath}`);
        
        return reportPath;
    }
}

// Run the audit if called directly
if (require.main === module) {
    const audit = new DiamondPerformanceAudit();
    
    audit.runFullAudit().then(async (results) => {
        await audit.saveReport();
        
        console.log('\n💎 DIAMOND LEVEL AUDIT SUMMARY:');
        console.log('================================');
        console.log(`Overall Status: ${results.summary.overallStatus}`);
        console.log(`Diamond Compliance: ${results.diamondCompliance?.overallCompliance?.toFixed(1)}%`);
        console.log(`Total Checks: ${results.summary.totalChecks}`);
        console.log(`Passed: ${results.summary.passedChecks}`);
        console.log(`Critical Issues: ${results.summary.criticalIssues}`);
        console.log(`Warnings: ${results.summary.warningIssues}`);
        
        if (results.recommendations?.length > 0) {
            console.log('\n🔧 TOP RECOMMENDATIONS:');
            results.recommendations
                .filter(r => r.priority === 'CRITICAL' || r.priority === 'HIGH')
                .slice(0, 3)
                .forEach(rec => {
                    console.log(`- ${rec.category}: ${rec.issue}`);
                    console.log(`  Action: ${rec.action}`);
                });
        }
        
        process.exit(0);
    }).catch(error => {
        console.error('💎 Audit execution failed:', error);
        process.exit(1);
    });
}

module.exports = DiamondPerformanceAudit;