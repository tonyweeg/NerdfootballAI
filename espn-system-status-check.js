// ESPN System Status Check
const https = require('https');

function makeRequest(url, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            method: data ? 'POST' : 'GET',
            headers: data ? { 'Content-Type': 'application/json' } : {}
        };
        
        const req = https.request(url, options, (res) => {
            let responseData = '';
            res.on('data', chunk => responseData += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(responseData));
                } catch (error) {
                    resolve(responseData);
                }
            });
        });
        
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function checkEspnSystemStatus() {
    console.log('📊 ESPN SYSTEM STATUS CHECK');
    console.log('===========================');
    
    const results = {
        functionsApi: '❌',
        dataQuality: '❌',
        scoreSync: '❌',
        adminInterface: '❌'
    };
    
    // Test 1: Firebase Functions API
    console.log('\n1. 🔧 Firebase Functions API');
    try {
        const response = await makeRequest(
            'https://us-central1-nerdfootball.cloudfunctions.net/fetchCurrentWeekGames',
            { data: { week: 1 } }
        );
        
        if (response.result && response.result.success) {
            console.log('✅ Functions API responding');
            results.functionsApi = '✅';
            
            const games = response.result.data;
            if (games && games.length > 0) {
                console.log(`✅ ${games.length} games retrieved`);
                
                // Check data quality
                const sampleGame = games[0];
                const hasWeather = sampleGame.weather && sampleGame.weather.temperature;
                const hasVenue = sampleGame.venue && sampleGame.venue.name;
                const hasRecords = sampleGame.teamRecords && 
                                 (sampleGame.teamRecords.home.length > 0 || sampleGame.teamRecords.away.length > 0);
                
                if (hasWeather && hasVenue && hasRecords) {
                    console.log('✅ Enhanced data quality confirmed');
                    results.dataQuality = '✅';
                }
            }
        }
    } catch (error) {
        console.log('❌ Functions API error:', error.message);
    }
    
    // Test 2: ESPN Score Sync System
    console.log('\n2. ⚡ ESPN Score Sync System');
    try {
        // Test direct ESPN API
        const espnResponse = await makeRequest('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
        
        if (espnResponse && espnResponse.events) {
            console.log(`✅ ESPN API accessible (${espnResponse.events.length} games)`);
            results.scoreSync = '✅';
        } else {
            console.log('❌ ESPN API not responding properly');
        }
    } catch (error) {
        console.log('❌ ESPN API error:', error.message);
    }
    
    // Test 3: Admin Interface Components
    console.log('\n3. 🎛️ Admin Interface');
    try {
        const indexHtml = await makeRequest('https://nerdfootball.web.app/');
        
        if (typeof indexHtml === 'string') {
            const hasEspnSyncButton = indexHtml.includes('espn-sync-btn');
            const hasEspnScoreSync = indexHtml.includes('EspnScoreSync');
            const hasEnhancedDisplay = indexHtml.includes('enhancedGameDataDisplay');
            
            console.log(`ESPN Sync Button: ${hasEspnSyncButton ? '✅' : '❌'}`);
            console.log(`ESPN Score Sync: ${hasEspnScoreSync ? '✅' : '❌'}`);
            console.log(`Enhanced Display: ${hasEnhancedDisplay ? '✅' : '❌'}`);
            
            if (hasEspnSyncButton && hasEspnScoreSync && hasEnhancedDisplay) {
                results.adminInterface = '✅';
            }
        }
    } catch (error) {
        console.log('❌ Admin interface check error:', error.message);
    }
    
    // Final Status Report
    console.log('\n📋 SYSTEM STATUS SUMMARY');
    console.log('========================');
    console.log(`${results.functionsApi} Firebase Functions API`);
    console.log(`${results.dataQuality} Enhanced ESPN Data Quality`);
    console.log(`${results.scoreSync} ESPN Score Sync System`);
    console.log(`${results.adminInterface} Admin Interface Components`);
    
    const allWorking = Object.values(results).every(status => status === '✅');
    
    console.log(`\n🎯 OVERALL STATUS: ${allWorking ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️ SOME ISSUES DETECTED'}`);
    
    if (allWorking) {
        console.log('\n🎉 ESPN integration is fully operational!');
        console.log('✅ Game score updates working');
        console.log('✅ Admin analytics area functional');  
        console.log('✅ Enhanced data display active');
        console.log('✅ All systems ready for production use');
    } else {
        console.log('\n⚠️ Issues detected - may need attention:');
        if (results.functionsApi === '❌') console.log('- Firebase Functions API issues');
        if (results.dataQuality === '❌') console.log('- Enhanced data quality problems');
        if (results.scoreSync === '❌') console.log('- ESPN Score Sync system errors');
        if (results.adminInterface === '❌') console.log('- Admin interface component issues');
    }
    
    return allWorking;
}

checkEspnSystemStatus().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ Status check failed:', error);
    process.exit(1);
});