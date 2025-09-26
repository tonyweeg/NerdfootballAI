console.log('=== GAME 309 DEBUG ===');
const weekData = { week: 3, games: await getGamesForWeek(3) };
const game309 = weekData.games.find(g => g.id === 309);
console.log('Game 309 from getGamesForWeek:', game309);

// Check ESPN enhancement
if (window.espnApi) {
  const espnGames = await window.espnApi.getWeekGames(3);
  console.log('ESPN games count:', espnGames.length);
  
  // Find ESPN match for Game 309
  const espnMatch = espnGames.find(eg => 
    (eg.away_team === 'Indianapolis Colts' || eg.awayTeam === 'Indianapolis Colts' || eg.a === 'Indianapolis Colts') &&
    (eg.home_team === 'Tennessee Titans' || eg.homeTeam === 'Tennessee Titans' || eg.h === 'Tennessee Titans')
  );
  console.log('ESPN match for Colts vs Titans:', espnMatch);
  
  // Check if there's wrong ESPN data
  const wrongMatch = espnGames.find(eg => 
    (eg.away_team === 'Las Vegas Raiders' || eg.awayTeam === 'Las Vegas Raiders' || eg.a === 'Las Vegas Raiders') &&
    (eg.home_team === 'Washington Commanders' || eg.homeTeam === 'Washington Commanders' || eg.h === 'Washington Commanders')
  );
  console.log('Wrong ESPN data (Raiders vs Commanders):', wrongMatch);
}
