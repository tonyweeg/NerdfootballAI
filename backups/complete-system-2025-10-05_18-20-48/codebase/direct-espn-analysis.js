// Direct ESPN API Analysis - Check what data ESPN actually provides
const https = require('https');

function makeHttpsRequest(url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, {
            headers: {
                'User-Agent': 'NerdFootball Data Analysis/1.0',
                'Accept': 'application/json'
            }
        }, (response) => {
            let data = '';
            
            response.on('data', chunk => {
                data += chunk;
            });
            
            response.on('end', () => {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(new Error(`JSON parse error: ${error.message}`));
                    }
                } else {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                }
            });
        });
        
        request.on('error', reject);
        request.setTimeout(10000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

function analyzeDataStructure(obj, path = '', depth = 0, maxDepth = 4) {
    if (depth > maxDepth || obj === null) return {};
    
    const analysis = {};
    
    if (typeof obj === 'object' && !Array.isArray(obj)) {
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            const fullPath = path ? `${path}.${key}` : key;
            
            analysis[fullPath] = {
                type: typeof value,
                hasValue: value !== null && value !== undefined,
                isArray: Array.isArray(value),
                sampleValue: Array.isArray(value) ? `[${value.length} items]` : 
                           (typeof value === 'object' && value !== null) ? '[object]' :
                           String(value).substring(0, 100)
            };
            
            // Recurse into objects
            if (typeof value === 'object' && value !== null && depth < maxDepth) {
                if (Array.isArray(value) && value.length > 0) {
                    const subAnalysis = analyzeDataStructure(value[0], `${fullPath}[0]`, depth + 1, maxDepth);
                    Object.assign(analysis, subAnalysis);
                } else if (!Array.isArray(value)) {
                    const subAnalysis = analyzeDataStructure(value, fullPath, depth + 1, maxDepth);
                    Object.assign(analysis, subAnalysis);
                }
            }
        });
    }
    
    return analysis;
}

async function analyzeEspnApi() {
    console.log('🔍 Direct ESPN API Analysis...');
    console.log('=====================================');
    
    try {
        // Test multiple ESPN endpoints
        const endpoints = [
            {
                name: 'Current NFL Scoreboard',
                url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard'
            },
            {
                name: 'NFL Teams',
                url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams'
            }
        ];
        
        for (const endpoint of endpoints) {
            console.log(`\\n📡 Analyzing: ${endpoint.name}`);
            console.log(`URL: ${endpoint.url}`);
            console.log('─'.repeat(60));
            
            try {
                const data = await makeHttpsRequest(endpoint.url);
                
                console.log('✅ Request successful');
                console.log(`📊 Response size: ${JSON.stringify(data).length} characters`);
                
                // Analyze structure
                const analysis = analyzeDataStructure(data);
                const allKeys = Object.keys(analysis);
                
                console.log(`🔑 Total data fields found: ${allKeys.length}`);
                
                // Look for betting/probability related fields
                const bettingFields = allKeys.filter(key => {
                    const lowerKey = key.toLowerCase();
                    return lowerKey.includes('prob') ||
                           lowerKey.includes('odds') ||
                           lowerKey.includes('spread') ||
                           lowerKey.includes('line') ||
                           lowerKey.includes('favorite') ||
                           lowerKey.includes('under') ||
                           lowerKey.includes('over') ||
                           lowerKey.includes('total') ||
                           lowerKey.includes('point') ||
                           lowerKey.includes('money') ||
                           lowerKey.includes('bet') ||
                           lowerKey.includes('handicap') ||
                           lowerKey.includes('margin') ||
                           lowerKey.includes('prediction');
                });
                
                console.log('\\n🎲 Potential Betting/Probability Fields:');
                if (bettingFields.length > 0) {
                    bettingFields.forEach(field => {
                        const fieldData = analysis[field];
                        console.log(`  ✅ ${field}: ${fieldData.type} = ${fieldData.sampleValue}`);
                    });
                } else {
                    console.log('  ❌ No obvious betting/probability fields found');
                }
                
                // Show interesting fields (excluding basic stuff)
                console.log('\\n💡 Interesting Data Fields:');
                const interestingFields = allKeys.filter(key => {
                    const lowerKey = key.toLowerCase();
                    return !lowerKey.includes('id') &&
                           !lowerKey.includes('href') &&
                           !lowerKey.includes('logo') &&
                           !lowerKey.includes('color') &&
                           !lowerKey.includes('abbreviation') &&
                           !lowerKey.includes('displayname') &&
                           (lowerKey.includes('record') ||
                            lowerKey.includes('statistic') ||
                            lowerKey.includes('weather') ||
                            lowerKey.includes('venue') ||
                            lowerKey.includes('broadcast') ||
                            lowerKey.includes('status') ||
                            lowerKey.includes('situation') ||
                            lowerKey.includes('clock') ||
                            lowerKey.includes('period') ||
                            lowerKey.includes('possession') ||
                            lowerKey.includes('down') ||
                            lowerKey.includes('distance') ||
                            lowerKey.includes('temperature') ||
                            lowerKey.includes('wind') ||
                            lowerKey.includes('forecast') ||
                            lowerKey.includes('ticket'));
                }).slice(0, 20); // Show first 20
                
                interestingFields.forEach(field => {
                    const fieldData = analysis[field];
                    console.log(`  💡 ${field}: ${fieldData.type} = ${fieldData.sampleValue}`);
                });
                
                // If this is scoreboard, show a sample game structure
                if (endpoint.name.includes('Scoreboard') && data.events && data.events.length > 0) {
                    console.log('\\n📋 SAMPLE GAME STRUCTURE:');
                    const sampleGame = data.events[0];
                    console.log(JSON.stringify(sampleGame, null, 2).substring(0, 2000) + '...');
                }
                
            } catch (error) {
                console.error(`❌ Failed to fetch ${endpoint.name}:`, error.message);
            }
        }
        
    } catch (error) {
        console.error('Analysis failed:', error);
    }
}

analyzeEspnApi().then(() => {
    console.log('\\n🎯 Analysis complete!');
}).catch(console.error);