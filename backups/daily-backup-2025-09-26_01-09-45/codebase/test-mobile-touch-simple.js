const puppeteer = require('puppeteer');
const fs = require('fs');

/**
 * SIMPLIFIED MOBILE TOUCH VALIDATION
 * Uses the console validator to test mobile touch optimization
 */

async function runMobileTouchValidation() {
    console.log('🔷 DIAMOND MOBILE TOUCH OPTIMIZATION VALIDATOR');
    console.log('📱 Starting simplified validation test...\n');

    let browser;
    try {
        // Launch browser in mobile mode
        browser = await puppeteer.launch({
            headless: false,
            devtools: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Set mobile viewport
        await page.setViewport({
            width: 375,
            height: 812,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true
        });

        // Navigate to emulator (try both ports)
        let connected = false;
        const ports = [5002, 5000, 5001];
        
        for (const port of ports) {
            try {
                console.log(`Trying http://localhost:${port}...`);
                await page.goto(`http://localhost:${port}`, { 
                    waitUntil: 'networkidle0', 
                    timeout: 10000 
                });
                console.log(`✅ Connected to http://localhost:${port}`);
                connected = true;
                break;
            } catch (error) {
                console.log(`❌ Port ${port} failed: ${error.message.split('\n')[0]}`);
            }
        }

        if (!connected) {
            throw new Error('Could not connect to application on any port');
        }

        // Wait a bit for the page to fully load
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Load and execute the console validator
        const validatorScript = fs.readFileSync('/Users/tonyweeg/nerdfootball-project/mobile-touch-console-validator.js', 'utf8');
        
        console.log('🔧 Executing mobile touch validation in browser...\n');
        
        // Execute the validator and capture console output
        const validationResults = await page.evaluate((script) => {
            // Capture console output
            const originalLog = console.log;
            const logs = [];
            console.log = (...args) => {
                logs.push(args.join(' '));
                originalLog.apply(console, args);
            };

            // Execute validation script
            eval(script);

            // Restore console.log
            console.log = originalLog;

            // Return both logs and results
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        logs: logs,
                        results: window.mobileValidationResults || null
                    });
                }, 3000);
            });
        }, validatorScript);

        // Output the console logs from the browser
        validationResults.logs.forEach(log => console.log(log));

        // Generate summary
        if (validationResults.results) {
            const results = validationResults.results;
            
            console.log('\n🏆 VALIDATION SUMMARY');
            console.log('='.repeat(50));
            console.log(`✅ Overall Pass Rate: ${results.passRate}%`);
            console.log(`📊 Tests: ${results.results.overall.passed}/${results.results.overall.total}`);
            
            if (results.touchPerformance && results.touchPerformance.tests > 0) {
                console.log(`⚡ Touch Performance: ${results.touchPerformance.rate.toFixed(1)}% responsive`);
            }
            
            console.log(`🎯 Status: ${results.passed ? '🏆 DIAMOND STANDARD' : '⚠️  NEEDS IMPROVEMENT'}`);
            
            // Check key features
            console.log('\n🔍 KEY FEATURES STATUS:');
            const keyChecks = [
                ['MobileTouchOptimizer Available', results.results.initialization?.['MobileTouchOptimizer class exists']?.passed],
                ['Instance Initialized', results.results.initialization?.['Instance created']?.passed],
                ['Hardware Acceleration', results.results.styling?.['Hardware acceleration styles applied']?.passed],
                ['Touch Events Working', results.results.functionality?.['Touch-active class toggle']?.passed],
                ['Bundle Optimized', results.results.bundle?.['Bundle size optimized']?.passed]
            ];
            
            keyChecks.forEach(([feature, status]) => {
                console.log(`   ${feature}: ${status ? '✅' : '❌'}`);
            });

            return results;
        } else {
            console.log('❌ No validation results returned');
            return { passed: false, error: 'No validation results' };
        }

    } catch (error) {
        console.error('❌ VALIDATION ERROR:', error.message);
        return { passed: false, error: error.message };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run if called directly
if (require.main === module) {
    runMobileTouchValidation()
        .then(results => {
            console.log('\n🔷 Validation Complete!');
            process.exit(results.passed ? 0 : 1);
        })
        .catch(error => {
            console.error('FATAL ERROR:', error);
            process.exit(1);
        });
}

module.exports = runMobileTouchValidation;