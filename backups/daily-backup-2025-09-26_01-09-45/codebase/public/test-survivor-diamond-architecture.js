// DIAMOND LEVEL: Comprehensive Survivor System Architecture Test
// Tests the bulletproof ESPN data integration and matching algorithms

class SurvivorSystemArchitectureTest {
    constructor() {
        this.testResults = [];
        this.mockESPNData = {
            games: [
                {
                    id: '2229',
                    home_team: 'Denver Broncos',
                    away_team: 'Tennessee Titans', 
                    home_score: 24,
                    away_score: 17,
                    status: 'Final',
                    dt: '2025-09-07T16:05:00Z'
                },
                {
                    id: '2219',
                    home_team: 'Cleveland Browns',
                    away_team: 'Cincinnati Bengals',
                    home_score: 21,
                    away_score: 28,
                    status: 'Final',
                    dt: '2025-09-07T13:00:00Z'
                }
            ]
        };
        
        this.mockUserPicks = [
            { gameId: 104, team: 'Cincinnati Bengals', userId: 'test1' },
            { gameId: 111, team: 'Denver Broncos', userId: 'test2' },
            { gameId: 104, team: 'Cleveland Browns', userId: 'test3' }
        ];
    }

    async runAllTests() {
        console.log('🚀 DIAMOND LEVEL: Starting Survivor System Architecture Tests');
        console.log('=' .repeat(70));
        
        try {
            await this.testFirebaseInitialization();
            await this.testESPNAPIIntegration();
            await this.testTeamNameNormalization();
            await this.testGameIDMapping();
            await this.testSurvivalCalculation();
            await this.testErrorHandling();
            
            this.printTestSummary();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            return false;
        }
        
        return this.testResults.every(test => test.passed);
    }
    
    async testFirebaseInitialization() {
        console.log('\n📋 TEST 1: Firebase Initialization');
        console.log('-'.repeat(40));
        
        try {
            // Test ESPN API initialization
            if (typeof window.espnNerdApi !== 'undefined') {
                await window.espnNerdApi.ensureReady();
                this.logTest('ESPN API Initialization', true, 'ESPN API ready');
            } else {
                this.logTest('ESPN API Initialization', false, 'ESPN API not available');
            }
            
            // Test Survivor System initialization
            if (typeof window.survivorSystem !== 'undefined' && window.survivorSystem.db) {
                this.logTest('Survivor System Initialization', true, 'Survivor System ready');
            } else {
                this.logTest('Survivor System Initialization', false, 'Survivor System not ready');
            }
            
        } catch (error) {
            this.logTest('Firebase Initialization', false, error.message);
        }
    }
    
    async testESPNAPIIntegration() {
        console.log('\n📋 TEST 2: ESPN API Integration');
        console.log('-'.repeat(40));
        
        try {
            if (window.espnNerdApi) {
                // Test team name normalization
                const normalized = window.espnNerdApi.normalizeTeamName('CIN');
                const expected = 'Cincinnati Bengals';
                this.logTest('Team Name Normalization', normalized === expected, 
                    `Expected: ${expected}, Got: ${normalized}`);
                
                // Test current week scores format
                const mockData = window.espnNerdApi.transformToNerdFootballFormat(this.mockESPNData.games, 1);
                const hasRequiredFields = mockData[0].hasOwnProperty('home_team') && 
                                        mockData[0].hasOwnProperty('away_team') &&
                                        mockData[0].hasOwnProperty('winner');
                this.logTest('ESPN Data Transformation', hasRequiredFields, 
                    hasRequiredFields ? 'All required fields present' : 'Missing required fields');
                
            } else {
                this.logTest('ESPN API Integration', false, 'ESPN API not available');
            }
            
        } catch (error) {
            this.logTest('ESPN API Integration', false, error.message);
        }
    }
    
    testTeamNameNormalization() {
        console.log('\n📋 TEST 3: Team Name Normalization');
        console.log('-'.repeat(40));
        
        const testCases = [
            { input: 'CIN', expected: 'Cincinnati Bengals' },
            { input: 'DEN', expected: 'Denver Broncos' },
            { input: 'Cincinnati Bengals', expected: 'Cincinnati Bengals' },
            { input: 'LA Rams', expected: 'Los Angeles Rams' },
            { input: 'NY Giants', expected: 'New York Giants' }
        ];
        
        testCases.forEach(testCase => {
            if (window.survivorSystem) {
                const result = window.survivorSystem.normalizeTeamName(testCase.input);
                this.logTest(`Normalize "${testCase.input}"`, result === testCase.expected,
                    `Expected: ${testCase.expected}, Got: ${result}`);
            }
        });
    }
    
    async testGameIDMapping() {
        console.log('\n📋 TEST 4: Game ID Mapping');
        console.log('-'.repeat(40));
        
        try {
            if (window.survivorSystem) {
                // Test internal schedule loading
                const schedule = await window.survivorSystem.loadInternalSchedule();
                this.logTest('Internal Schedule Loading', !!schedule && !!schedule.weeks, 
                    schedule ? `Loaded ${schedule.weeks?.length} weeks` : 'Failed to load schedule');
                
                if (schedule && schedule.weeks) {
                    const week1Games = schedule.weeks.find(w => w.week === 1)?.games || [];
                    const testGame = week1Games.find(g => g.id === 104);
                    
                    if (testGame) {
                        // Test team matching logic
                        const mockESPNGame = {
                            home_team: 'Cleveland Browns',
                            away_team: 'Cincinnati Bengals'
                        };
                        
                        const match = window.survivorSystem.findMatchingInternalGame(mockESPNGame, week1Games);
                        this.logTest('Team-Based Game Matching', !!match && match.id === 104,
                            match ? `Found match: Game ${match.id}` : 'No match found');
                    }
                }
            }
        } catch (error) {
            this.logTest('Game ID Mapping', false, error.message);
        }
    }
    
    async testSurvivalCalculation() {
        console.log('\n📋 TEST 5: Survival Calculation Logic');
        console.log('-'.repeat(40));
        
        if (!window.survivorSystem) {
            this.logTest('Survival Calculation', false, 'Survivor System not available');
            return;
        }
        
        try {
            // Create mock ESPN results
            const mockResults = {
                '104': {
                    homeTeam: 'Cleveland Browns',
                    awayTeam: 'Cincinnati Bengals',
                    homeScore: 21,
                    awayScore: 28,
                    winner: 'Cincinnati Bengals',
                    status: 'Final'
                },
                '111': {
                    homeTeam: 'Denver Broncos', 
                    awayTeam: 'Tennessee Titans',
                    homeScore: 24,
                    awayScore: 17,
                    winner: 'Denver Broncos',
                    status: 'Final'
                }
            };
            
            // Test survival calculations
            for (const pick of this.mockUserPicks) {
                const result = await window.survivorSystem.checkUserSurvival(pick, mockResults);
                
                let expectedStatus;
                if (pick.team === 'Cincinnati Bengals' && pick.gameId === 104) {
                    expectedStatus = 'survived'; // Bengals won
                } else if (pick.team === 'Denver Broncos' && pick.gameId === 111) {
                    expectedStatus = 'survived'; // Broncos won  
                } else if (pick.team === 'Cleveland Browns' && pick.gameId === 104) {
                    expectedStatus = 'eliminated'; // Browns lost
                }
                
                this.logTest(`Survival Check: ${pick.team}`, result.status === expectedStatus,
                    `User: ${pick.userId}, Team: ${pick.team}, Status: ${result.status}, Reason: ${result.reason}`);
            }
            
        } catch (error) {
            this.logTest('Survival Calculation', false, error.message);
        }
    }
    
    async testErrorHandling() {
        console.log('\n📋 TEST 6: Error Handling');
        console.log('-'.repeat(40));
        
        if (!window.survivorSystem) {
            this.logTest('Error Handling', false, 'Survivor System not available');
            return;
        }
        
        try {
            // Test with invalid pick
            const invalidPick = { gameId: 999, team: 'Invalid Team' };
            const result = await window.survivorSystem.checkUserSurvival(invalidPick, {});
            
            this.logTest('Invalid Pick Handling', result.status === 'eliminated',
                `Result: ${result.status}, Reason: ${result.reason}`);
            
            // Test with no pick
            const noPick = null;
            const noPickResult = await window.survivorSystem.checkUserSurvival(noPick, {});
            
            this.logTest('No Pick Handling', noPickResult.status === 'eliminated' && noPickResult.reason.includes('No pick made'),
                `Result: ${noPickResult.status}, Reason: ${noPickResult.reason}`);
            
        } catch (error) {
            this.logTest('Error Handling', false, error.message);
        }
    }
    
    logTest(testName, passed, details) {
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${details}`);
        
        this.testResults.push({
            name: testName,
            passed,
            details
        });
    }
    
    printTestSummary() {
        console.log('\n🏆 TEST SUMMARY');
        console.log('=' .repeat(70));
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(test => test.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests} ✅`);
        console.log(`Failed: ${failedTests} ❌`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.filter(test => !test.passed).forEach(test => {
                console.log(`  • ${test.name}: ${test.details}`);
            });
        }
        
        if (passedTests === totalTests) {
            console.log('\n🎉 All tests passed! DIAMOND LEVEL architecture is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Please review the architecture.');
        }
    }
}

// Auto-run tests when page loads (after a delay for initialization)
window.addEventListener('load', () => {
    setTimeout(async () => {
        console.log('🧪 Starting automated DIAMOND LEVEL architecture tests...');
        const tester = new SurvivorSystemArchitectureTest();
        const success = await tester.runAllTests();
        
        if (success) {
            console.log('🎯 ARCHITECTURE VERIFICATION: PASSED');
        } else {
            console.log('🚨 ARCHITECTURE VERIFICATION: FAILED');
        }
    }, 3000); // Allow 3 seconds for full initialization
});

// Export for manual testing
window.SurvivorSystemArchitectureTest = SurvivorSystemArchitectureTest;