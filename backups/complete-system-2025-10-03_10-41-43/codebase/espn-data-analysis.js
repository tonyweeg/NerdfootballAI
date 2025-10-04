// ESPN Data Structure Analysis - Find ALL available data points
const puppeteer = require('puppeteer');

async function analyzeEspnDataStructure() {
    console.log('🔍 Comprehensive ESPN Data Structure Analysis...');
    
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    // Log console for debugging
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`[BROWSER ERROR] ${msg.text()}`);
        }
    });
    
    try {
        // Load production site
        await page.goto('https://nerdfootball.web.app?view=admin', { waitUntil: 'networkidle0' });
        
        // Wait for auth and ESPN API to be ready
        await page.waitForFunction(() => {
            return typeof window.espnApi !== 'undefined' && 
                   window.espnApi !== null &&
                   window.auth &&
                   window.auth.currentUser;
        }, { timeout: 15000 });
        
        console.log('✅ Authenticated and ESPN API loaded');
        
        // Get raw ESPN data structure
        const espnAnalysis = await page.evaluate(async () => {
            try {
                console.log('Fetching raw ESPN data...');
                
                // Call the Firebase Function directly to get raw ESPN response
                const callable = window.httpsCallable(window.functions, 'fetchCurrentWeekGames');
                const result = await callable({ week: 1 });
                
                if (!result.data.success) {
                    return { error: 'Function call failed: ' + result.data.error };
                }
                
                const games = result.data.data;
                
                // Deep analysis of data structure
                function analyzeObject(obj, path = '', depth = 0) {
                    if (depth > 5) return {}; // Prevent infinite recursion
                    
                    const analysis = {};
                    
                    for (const [key, value] of Object.entries(obj)) {
                        const fullPath = path ? `${path}.${key}` : key;
                        
                        analysis[fullPath] = {
                            type: typeof value,
                            value: value,
                            isArray: Array.isArray(value),
                            length: Array.isArray(value) ? value.length : undefined,
                            keys: (typeof value === 'object' && value !== null && !Array.isArray(value)) 
                                ? Object.keys(value) : undefined
                        };
                        
                        // Recurse into objects
                        if (typeof value === 'object' && value !== null && depth < 3) {
                            if (Array.isArray(value) && value.length > 0) {
                                // Analyze first array element
                                const subAnalysis = analyzeObject(value[0], `${fullPath}[0]`, depth + 1);
                                Object.assign(analysis, subAnalysis);
                            } else if (!Array.isArray(value)) {
                                const subAnalysis = analyzeObject(value, fullPath, depth + 1);
                                Object.assign(analysis, subAnalysis);
                            }
                        }
                    }
                    
                    return analysis;
                }
                
                const sampleGame = games[0];
                const analysis = analyzeObject(sampleGame);
                
                return {
                    success: true,
                    totalGames: games.length,
                    sampleGameFull: sampleGame,
                    dataStructure: analysis,
                    allKeys: Object.keys(analysis),
                    potentialProbabilityFields: Object.keys(analysis).filter(key => 
                        key.toLowerCase().includes('prob') ||
                        key.toLowerCase().includes('odds') ||
                        key.toLowerCase().includes('spread') ||
                        key.toLowerCase().includes('line') ||
                        key.toLowerCase().includes('favorite') ||
                        key.toLowerCase().includes('under') ||
                        key.toLowerCase().includes('over') ||
                        key.toLowerCase().includes('total') ||
                        key.toLowerCase().includes('point') ||
                        key.toLowerCase().includes('money') ||
                        key.toLowerCase().includes('bet')
                    )
                };
                
            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    stack: error.stack
                };
            }
        });
        
        if (espnAnalysis.success) {
            console.log('\\n🎯 ESPN DATA ANALYSIS COMPLETE');
            console.log('=====================================');
            console.log(`Games analyzed: ${espnAnalysis.totalGames}`);
            console.log(`Total data fields found: ${espnAnalysis.allKeys.length}`);
            
            console.log('\\n📊 SAMPLE GAME (Full Structure):');
            console.log(JSON.stringify(espnAnalysis.sampleGameFull, null, 2));
            
            console.log('\\n🔑 ALL AVAILABLE DATA FIELDS:');
            espnAnalysis.allKeys.forEach(key => {
                const field = espnAnalysis.dataStructure[key];
                console.log(`  ${key}: ${field.type}${field.isArray ? '[]' : ''} = ${JSON.stringify(field.value).substring(0, 100)}${JSON.stringify(field.value).length > 100 ? '...' : ''}`);
            });
            
            console.log('\\n🎲 POTENTIAL BETTING/PROBABILITY FIELDS:');
            if (espnAnalysis.potentialProbabilityFields.length > 0) {
                espnAnalysis.potentialProbabilityFields.forEach(field => {
                    const fieldData = espnAnalysis.dataStructure[field];
                    console.log(`  ✅ ${field}: ${fieldData.type} = ${JSON.stringify(fieldData.value)}`);
                });
            } else {
                console.log('  ❌ No obvious betting/probability fields found');
            }
            
            console.log('\\n📋 FIELDS WE\'RE NOT CURRENTLY USING:');
            const currentlyUsedFields = ['id', 'a', 'h', 'dt', 'stadium', 'espnId', 'status', 'homeScore', 'awayScore', 'winner', 'lastUpdated'];
            const unusedFields = espnAnalysis.allKeys.filter(key => 
                !currentlyUsedFields.some(used => key.includes(used))
            );
            
            unusedFields.forEach(field => {
                const fieldData = espnAnalysis.dataStructure[field];
                console.log(`  💡 ${field}: ${fieldData.type} = ${JSON.stringify(fieldData.value).substring(0, 80)}${JSON.stringify(fieldData.value).length > 80 ? '...' : ''}`);
            });
            
        } else {
            console.error('❌ Analysis failed:', espnAnalysis.error);
            if (espnAnalysis.stack) {
                console.error('Stack:', espnAnalysis.stack);
            }
        }
        
        // Keep browser open for manual inspection
        console.log('\\n👀 Browser kept open. Check console for raw data...');
        console.log('Press Ctrl+C to close when done inspecting');
        await new Promise(() => {});
        
    } catch (error) {
        console.error('Analysis failed:', error);
        await browser.close();
    }
}

analyzeEspnDataStructure().catch(console.error);