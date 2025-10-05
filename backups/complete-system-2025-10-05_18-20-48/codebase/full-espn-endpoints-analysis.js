// Comprehensive Analysis of All 4 ESPN API Endpoints
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

function extractInterestingFields(obj, path = '', depth = 0, maxDepth = 6) {
    if (depth > maxDepth || obj === null) return [];
    
    const fields = [];
    
    if (typeof obj === 'object' && !Array.isArray(obj)) {
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            const fullPath = path ? `${path}.${key}` : key;
            
            // Categorize fields
            const lowerKey = key.toLowerCase();
            const lowerPath = fullPath.toLowerCase();
            
            let category = 'other';
            if (lowerPath.includes('prob') || lowerPath.includes('prediction')) category = 'probability';
            else if (lowerPath.includes('odds') || lowerPath.includes('line') || lowerPath.includes('spread')) category = 'betting';
            else if (lowerPath.includes('weather') || lowerPath.includes('temperature') || lowerPath.includes('wind')) category = 'weather';
            else if (lowerPath.includes('record') || lowerPath.includes('statistic') || lowerPath.includes('stat')) category = 'stats';
            else if (lowerPath.includes('situation') || lowerPath.includes('down') || lowerPath.includes('possession')) category = 'game_situation';
            else if (lowerPath.includes('broadcast') || lowerPath.includes('tv') || lowerPath.includes('network')) category = 'broadcast';
            else if (lowerPath.includes('ticket') || lowerPath.includes('price')) category = 'ticketing';
            else if (lowerPath.includes('venue') || lowerPath.includes('stadium') || lowerPath.includes('location')) category = 'venue';
            else if (lowerPath.includes('clock') || lowerPath.includes('period') || lowerPath.includes('quarter')) category = 'timing';
            else if (lowerPath.includes('score') || lowerPath.includes('point')) category = 'scoring';
            else if (lowerPath.includes('injury') || lowerPath.includes('status')) category = 'player_status';
            
            fields.push({
                path: fullPath,
                key,
                type: typeof value,
                category,
                hasValue: value !== null && value !== undefined,
                isArray: Array.isArray(value),
                sampleValue: Array.isArray(value) ? `[${value.length} items]` : 
                           (typeof value === 'object' && value !== null) ? '[object]' :
                           String(value).substring(0, 150),
                priority: category === 'probability' ? 10 : 
                         category === 'betting' ? 9 :
                         category === 'game_situation' ? 8 :
                         category === 'weather' ? 7 :
                         category === 'stats' ? 6 : 
                         category === 'timing' ? 5 :
                         category === 'scoring' ? 4 :
                         category === 'venue' ? 3 : 1
            });
            
            // Recurse into objects
            if (typeof value === 'object' && value !== null && depth < maxDepth) {
                if (Array.isArray(value) && value.length > 0) {
                    const subFields = extractInterestingFields(value[0], `${fullPath}[0]`, depth + 1, maxDepth);
                    fields.push(...subFields);
                } else if (!Array.isArray(value)) {
                    const subFields = extractInterestingFields(value, fullPath, depth + 1, maxDepth);
                    fields.push(...subFields);
                }
            }
        });
    }
    
    return fields;
}

async function analyzeAllEspnEndpoints() {
    console.log('🔍 COMPREHENSIVE ESPN API ANALYSIS');
    console.log('======================================');
    
    const endpoints = [
        {
            name: '📊 Scoreboard (Games & Scores)',
            url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
            description: 'Live scores, game status, probabilities'
        },
        {
            name: '📰 News',
            url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/news',
            description: 'NFL news articles and updates'
        },
        {
            name: '🏈 All Teams',
            url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams',
            description: 'Team information, records, stats'
        },
        {
            name: '⭐ Specific Team (Chiefs)',
            url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/kc',
            description: 'Detailed team data, roster, stats'
        }
    ];
    
    const allDataPoints = {
        probability: [],
        betting: [],
        weather: [],
        stats: [],
        game_situation: [],
        broadcast: [],
        venue: [],
        timing: [],
        scoring: [],
        player_status: [],
        other: []
    };
    
    for (const endpoint of endpoints) {
        console.log(`\\n${endpoint.name}`);
        console.log(`URL: ${endpoint.url}`);
        console.log(`Purpose: ${endpoint.description}`);
        console.log('─'.repeat(80));
        
        try {
            const data = await makeHttpsRequest(endpoint.url);
            const fields = extractInterestingFields(data);
            
            console.log(`✅ Success - Found ${fields.length} data fields`);
            
            // Categorize fields
            fields.forEach(field => {
                if (!allDataPoints[field.category].some(existing => existing.path === field.path)) {
                    allDataPoints[field.category].push(field);
                }
            });
            
            // Show top priority fields for this endpoint
            const topFields = fields
                .filter(f => f.priority >= 6)
                .sort((a, b) => b.priority - a.priority)
                .slice(0, 10);
                
            if (topFields.length > 0) {
                console.log('🔥 TOP PRIORITY DATA POINTS:');
                topFields.forEach(field => {
                    console.log(`  ${field.category.toUpperCase()}: ${field.path} = ${field.sampleValue}`);
                });
            }
            
        } catch (error) {
            console.error(`❌ Failed: ${error.message}`);
        }
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Final comprehensive summary
    console.log('\\n🎯 COMPREHENSIVE DATA SUMMARY');
    console.log('==============================');
    
    Object.entries(allDataPoints).forEach(([category, fields]) => {
        if (fields.length > 0) {
            console.log(`\\n📋 ${category.toUpperCase().replace('_', ' ')} (${fields.length} fields):`);
            fields
                .sort((a, b) => b.priority - a.priority)
                .slice(0, 8) // Show top 8 per category
                .forEach(field => {
                    console.log(`  • ${field.path}: ${field.type} = ${field.sampleValue}`);
                });
        }
    });
    
    // Data we're NOT using summary
    console.log('\\n💎 DIAMOND OPPORTUNITY - Data Points We Could Add:');
    console.log('================================================');
    
    const currentlyUsed = ['id', 'a', 'h', 'dt', 'stadium', 'homeScore', 'awayScore', 'winner', 'status'];
    const unusedHighValue = Object.values(allDataPoints)
        .flat()
        .filter(field => field.priority >= 5)
        .filter(field => !currentlyUsed.some(used => field.path.toLowerCase().includes(used.toLowerCase())))
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 15);
        
    unusedHighValue.forEach((field, i) => {
        console.log(`${i + 1}. 🎯 ${field.category.toUpperCase()}: ${field.path}`);
        console.log(`   Value: ${field.sampleValue}`);
        console.log(`   Use Case: ${getUseCase(field.category, field.path)}`);
        console.log('');
    });
}

function getUseCase(category, path) {
    const lowerPath = path.toLowerCase();
    
    if (category === 'probability') return 'Show win probabilities in picks UI';
    if (category === 'betting') return 'Display betting lines and spreads';
    if (category === 'weather') return 'Show weather impact on games';
    if (category === 'game_situation') return 'Real-time game context (down/distance)';
    if (category === 'stats') return 'Team/player performance metrics';
    if (category === 'timing') return 'Detailed game clock information';
    if (category === 'venue') return 'Stadium details and atmosphere';
    if (lowerPath.includes('broadcast')) return 'TV/streaming information';
    if (lowerPath.includes('record')) return 'Team win/loss records';
    if (lowerPath.includes('injury')) return 'Player availability status';
    
    return 'Enhanced user experience data';
}

analyzeAllEspnEndpoints().then(() => {
    console.log('\\n🏆 Analysis Complete! Ready to enhance NerdFootball with ESPN data!');
}).catch(console.error);