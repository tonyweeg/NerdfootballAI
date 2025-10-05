const puppeteer = require('puppeteer');

/**
 * DIAGNOSTIC MOBILE TOUCH TEST
 * Focused on debugging why MobileTouchOptimizer isn't loading
 */

async function diagnoseMobileTouchLoading() {
    console.log('🔍 DIAGNOSTIC: Mobile Touch Optimizer Loading');
    console.log('=' .repeat(50));

    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: false, 
            devtools: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        
        // Enable console logging from the page
        page.on('console', msg => {
            console.log(`🌐 [BROWSER]: ${msg.text()}`);
        });
        
        page.on('pageerror', error => {
            console.log(`❌ [PAGE ERROR]: ${error.message}`);
        });

        // Navigate to application
        console.log('📡 Connecting to application...');
        await page.goto('http://localhost:5002', { waitUntil: 'networkidle0', timeout: 30000 });
        console.log('✅ Connected successfully');

        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Detailed bundle loading diagnostics
        const bundleAnalysis = await page.evaluate(() => {
            const analysis = {
                // Check if features bundle script tag exists
                featuresBundleScript: !!document.querySelector('script[src*="features-bundle"]'),
                
                // Check script loading
                allScripts: Array.from(document.querySelectorAll('script')).map(s => ({
                    src: s.src,
                    loaded: s.readyState || 'unknown'
                })).filter(s => s.src),
                
                // Check for MobileTouchOptimizer specifically
                mobileTouchOptimizerClass: typeof window.MobileTouchOptimizer,
                mobileTouchOptimizerInstance: typeof window.mobileTouchOptimizer,
                
                // Check other expected classes from features bundle
                pickAnalyticsClient: typeof window.PickAnalyticsClient,
                liveGameRefresh: typeof window.LiveGameRefresh,
                addEnhancedGameData: typeof window.addEnhancedGameData,
                
                // Check if DOM is ready
                domReadyState: document.readyState,
                
                // Check for initialization functions
                windowKeys: Object.keys(window).filter(k => k.includes('Mobile') || k.includes('Touch') || k.includes('Optimizer')),
                
                // Check if initialization scripts have run
                initEvents: {
                    DOMContentLoaded: document.readyState === 'complete',
                    windowLoaded: true
                },
                
                // Look for any error messages
                errorMessages: [],
                
                // Check bundle content by trying to fetch it
                bundleContent: null
            };
            
            // Try to get bundle content
            try {
                analysis.bundleContentCheck = 'Attempting to fetch bundle content...';
            } catch (e) {
                analysis.errorMessages.push(`Bundle fetch error: ${e.message}`);
            }
            
            return analysis;
        });

        console.log('\n📋 BUNDLE LOADING ANALYSIS:');
        console.log('Features Bundle Script Tag:', bundleAnalysis.featuresBundleScript ? '✅ Found' : '❌ Missing');
        console.log('DOM Ready State:', bundleAnalysis.domReadyState);
        
        console.log('\n🔧 LOADED SCRIPTS:');
        bundleAnalysis.allScripts.forEach(script => {
            const isFeatures = script.src.includes('features-bundle');
            console.log(`   ${isFeatures ? '🎯' : '📄'} ${script.src.split('/').pop()} - ${script.loaded}`);
        });
        
        console.log('\n🏗️ EXPECTED CLASSES STATUS:');
        console.log(`   MobileTouchOptimizer: ${bundleAnalysis.mobileTouchOptimizerClass} ${bundleAnalysis.mobileTouchOptimizerClass === 'function' ? '✅' : '❌'}`);
        console.log(`   mobileTouchOptimizer instance: ${bundleAnalysis.mobileTouchOptimizerInstance} ${bundleAnalysis.mobileTouchOptimizerInstance === 'object' ? '✅' : '❌'}`);
        console.log(`   PickAnalyticsClient: ${bundleAnalysis.pickAnalyticsClient} ${bundleAnalysis.pickAnalyticsClient === 'function' ? '✅' : '❌'}`);
        console.log(`   LiveGameRefresh: ${bundleAnalysis.liveGameRefresh} ${bundleAnalysis.liveGameRefresh === 'function' ? '✅' : '❌'}`);
        console.log(`   addEnhancedGameData: ${bundleAnalysis.addEnhancedGameData} ${bundleAnalysis.addEnhancedGameData === 'function' ? '✅' : '❌'}`);
        
        console.log('\n🔑 WINDOW KEYS (Mobile/Touch related):');
        if (bundleAnalysis.windowKeys.length > 0) {
            bundleAnalysis.windowKeys.forEach(key => console.log(`   📌 ${key}`));
        } else {
            console.log('   ❌ No Mobile/Touch related keys found');
        }

        // Try to manually execute MobileTouchOptimizer initialization
        console.log('\n🧪 MANUAL INITIALIZATION TEST:');
        const manualTest = await page.evaluate(() => {
            try {
                if (typeof MobileTouchOptimizer === 'function') {
                    const testOptimizer = new MobileTouchOptimizer();
                    testOptimizer.initialize();
                    return {
                        success: true,
                        initialized: testOptimizer.isInitialized,
                        message: 'Manual initialization successful'
                    };
                } else {
                    return {
                        success: false,
                        message: 'MobileTouchOptimizer class not available'
                    };
                }
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        if (manualTest.success) {
            console.log('   ✅ Manual initialization successful');
            console.log(`   📊 Is Initialized: ${manualTest.initialized}`);
        } else {
            console.log('   ❌ Manual initialization failed:', manualTest.message || manualTest.error);
        }

        // Check bundle size and content
        console.log('\n📦 BUNDLE SIZE CHECK:');
        try {
            const bundleResponse = await page.evaluate(async () => {
                const response = await fetch('/features-bundle.js');
                const content = await response.text();
                return {
                    size: content.length,
                    sizeKB: (content.length / 1024).toFixed(2),
                    containsMobileOptimizer: content.includes('MobileTouchOptimizer'),
                    containsInitialize: content.includes('initialize()'),
                    containsSetupTouch: content.includes('setupPassiveEventListeners'),
                    firstLines: content.substring(0, 200)
                };
            });

            console.log(`   📏 Bundle Size: ${bundleResponse.sizeKB}KB (${bundleResponse.size} bytes)`);
            console.log(`   🔍 Contains MobileTouchOptimizer: ${bundleResponse.containsMobileOptimizer ? '✅' : '❌'}`);
            console.log(`   🔍 Contains initialize(): ${bundleResponse.containsInitialize ? '✅' : '❌'}`);
            console.log(`   🔍 Contains touch setup: ${bundleResponse.containsSetupTouch ? '✅' : '❌'}`);
            console.log(`   📄 First 200 chars: ${bundleResponse.firstLines}`);

            if (!bundleResponse.containsMobileOptimizer) {
                console.log('\n❗ CRITICAL ISSUE: MobileTouchOptimizer class not found in bundle!');
            }

        } catch (error) {
            console.log(`   ❌ Bundle fetch error: ${error.message}`);
        }

        // Final recommendation
        console.log('\n💡 DIAGNOSTIC SUMMARY:');
        if (bundleAnalysis.mobileTouchOptimizerClass === 'function') {
            console.log('✅ MobileTouchOptimizer is properly loaded - initialization might be the issue');
        } else if (bundleAnalysis.featuresBundleScript) {
            console.log('⚠️  Features bundle script tag exists but class not loaded - bundle execution issue');
        } else {
            console.log('❌ Features bundle script tag missing from HTML');
        }

        return {
            bundleLoaded: bundleAnalysis.featuresBundleScript,
            classAvailable: bundleAnalysis.mobileTouchOptimizerClass === 'function',
            instanceCreated: bundleAnalysis.mobileTouchOptimizerInstance === 'object',
            manualInitSuccess: manualTest.success,
            analysis: bundleAnalysis
        };

    } catch (error) {
        console.error('❌ DIAGNOSTIC ERROR:', error.message);
        return { error: error.message };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run if called directly
if (require.main === module) {
    diagnoseMobileTouchLoading()
        .then(results => {
            console.log('\n🔍 Diagnostic Complete!');
            if (results.classAvailable && results.instanceCreated) {
                console.log('🎉 Mobile Touch Optimization is working correctly!');
            } else if (results.bundleLoaded && !results.classAvailable) {
                console.log('🔧 Bundle loads but classes not available - check bundle content');
            } else {
                console.log('💔 Mobile Touch Optimization is not working');
            }
        })
        .catch(error => {
            console.error('FATAL ERROR:', error);
        });
}

module.exports = diagnoseMobileTouchLoading;