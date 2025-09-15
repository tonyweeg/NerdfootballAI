// Quick elimination lookup based on known Week 1 teams that lost
// We'll populate this based on what we know about Week 1 NFL results

console.log('🏈 Quick elimination data for Week 1...');

// Known Week 1 losing teams (this is faster than API calls)
const WEEK_1_LOSING_TEAMS = [
    'New England Patriots',
    'Houston Texans',
    'Denver Broncos',
    'Arizona Cardinals',
    'Carolina Panthers',
    'Tennessee Titans',
    'New York Giants',
    'Cleveland Browns',
    'Indianapolis Colts',
    'Chicago Bears',
    'Minnesota Vikings',
    'Jacksonville Jaguars',
    'Las Vegas Raiders',
    'New York Jets',
    'Atlanta Falcons',
    'Seattle Seahawks'
];

// Also check common variations
const LOSING_TEAM_VARIATIONS = [
    'Patriots', 'New England Patriots', 'NE Patriots',
    'Texans', 'Houston Texans',
    'Broncos', 'Denver Broncos',
    'Cardinals', 'Arizona Cardinals',
    'Panthers', 'Carolina Panthers',
    'Titans', 'Tennessee Titans',
    'Giants', 'New York Giants', 'NY Giants',
    'Browns', 'Cleveland Browns',
    'Colts', 'Indianapolis Colts',
    'Bears', 'Chicago Bears',
    'Vikings', 'Minnesota Vikings',
    'Jaguars', 'Jacksonville Jaguars',
    'Raiders', 'Las Vegas Raiders', 'LV Raiders', 'Vegas Raiders',
    'Jets', 'New York Jets', 'NY Jets',
    'Falcons', 'Atlanta Falcons',
    'Seahawks', 'Seattle Seahawks'
];

console.log('Week 1 losing teams:', WEEK_1_LOSING_TEAMS);
console.log('\nAll losing variations:', LOSING_TEAM_VARIATIONS);

// Generate elimination template for common users
console.log('\n💎 TEMPLATE FOR ELIMINATED_USERS:');
console.log(`
// Week 1 eliminations - teams that lost
'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2': { week: 1, team: 'Patriots', reason: 'Patriots lost Week 1' },
// Add more users here who picked losing teams

// Week 2 eliminations would go here
// 'user_uid': { week: 2, team: 'Team', reason: 'Team lost Week 2' },
`);

console.log('🚨 CRITICAL: We need to manually identify which users picked losing teams!');
console.log('Check the database to see who picked:', LOSING_TEAM_VARIATIONS.slice(0, 5).join(', '), '...');