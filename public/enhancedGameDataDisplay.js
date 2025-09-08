// Enhanced Game Data Display Functions
// Displays comprehensive ESPN data points in the game UI

// Add enhanced ESPN data function for game cards
async function addEnhancedGameData(gameId, game, gameState) {
    try {
        const espnGames = await window.espnApi.getWeekGames(currentWeek);
        const espnGame = espnGames.find(eg => 
            (eg.a === game.away || eg.awayTeam === game.away) && 
            (eg.h === game.home || eg.homeTeam === game.home)
        );
        
        if (espnGame) {
            const containerId = gameState === 'IN_PROGRESS' ? `live-data-${gameId}` : `game-data-${gameId}`;
            const container = document.getElementById(containerId);
            
            if (container) {
                let enhancedData = [];
                
                // Weather information
                if (espnGame.weather) {
                    enhancedData.push(`<div class="flex items-center gap-1">
                        <span>🌡️</span>
                        <span>${espnGame.weather.temperature}°F ${espnGame.weather.condition || espnGame.weather.description || ''}</span>
                    </div>`);
                }
                
                // Venue information
                if (espnGame.venue) {
                    enhancedData.push(`<div class="flex items-center gap-1">
                        <span>${espnGame.venue.indoor ? '🏟️' : '🌤️'}</span>
                        <span>${espnGame.venue.name}</span>
                    </div>`);
                }
                
                // Win probability for live games
                if (gameState === 'IN_PROGRESS' && espnGame.probability) {
                    const homeProb = espnGame.probability.homeWinPercentage || espnGame.probability.homeWin;
                    const awayProb = espnGame.probability.awayWinPercentage || espnGame.probability.awayWin;
                    
                    if (homeProb || awayProb) {
                        enhancedData.push(`<div class="flex items-center gap-1 text-emerald-600 font-medium">
                            <span>📊</span>
                            <span>Win Prob: ${game.home} ${homeProb}% | ${game.away} ${awayProb}%</span>
                        </div>`);
                    }
                }
                
                // Broadcast information
                if (espnGame.broadcasts && espnGame.broadcasts.length > 0) {
                    const network = espnGame.broadcasts[0].network || espnGame.broadcasts[0].names?.[0];
                    if (network) {
                        enhancedData.push(`<div class="flex items-center gap-1">
                            <span>📺</span>
                            <span>${network}</span>
                        </div>`);
                    }
                }
                
                // Team records
                if (espnGame.teamRecords) {
                    const homeRecord = espnGame.teamRecords.home;
                    const awayRecord = espnGame.teamRecords.away;
                    if (homeRecord || awayRecord) {
                        enhancedData.push(`<div class="flex items-center gap-1 text-slate-500">
                            <span>📋</span>
                            <span>${homeRecord ? `${game.home} (${homeRecord})` : ''} ${awayRecord ? `${game.away} (${awayRecord})` : ''}</span>
                        </div>`);
                    }
                }
                
                // Quarter scores for completed games
                if (gameState === 'COMPLETED' && espnGame.quarterScores) {
                    const homeQuarters = espnGame.quarterScores.home || [];
                    const awayQuarters = espnGame.quarterScores.away || [];
                    
                    if (homeQuarters.length > 0 && awayQuarters.length > 0) {
                        const quarterDisplay = homeQuarters.map((hq, i) => {
                            const aq = awayQuarters[i] || { score: 0 };
                            return `Q${i + 1}: ${aq.score}-${hq.score}`;
                        }).join(' | ');
                        
                        enhancedData.push(`<div class="flex items-center gap-1 text-slate-600 text-xs">
                            <span>🏈</span>
                            <span>${quarterDisplay}</span>
                        </div>`);
                    }
                }
                
                if (enhancedData.length > 0) {
                    container.innerHTML = enhancedData.join('');
                }
            }
        }
    } catch (error) {
        console.warn('Could not load enhanced game data:', error);
    }
}

// Function to add enhanced data containers to game cards
function addEnhancedDataContainers() {
    // Find all game cards that need enhanced data containers
    const gameCards = document.querySelectorAll('[id^="game-"], [id^="live-data-"]').forEach(container => {
        if (!container.querySelector('.live-game-data')) {
            const enhancedContainer = document.createElement('div');
            enhancedContainer.className = 'live-game-data mt-1 space-y-0.5 text-xs text-slate-600';
            container.appendChild(enhancedContainer);
        }
    });
}

// Initialize enhanced data display when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Add containers for enhanced data
    addEnhancedDataContainers();
    
    // Listen for ESPN data updates
    window.addEventListener('espnScoresUpdated', (event) => {
        console.log('ESPN scores updated, refreshing enhanced data displays');
        // Refresh enhanced data for all visible games
        if (typeof renderActivePicksSummary === 'function') {
            renderActivePicksSummary();
        }
    });
});

// Enhanced Game Data for Picks Area - Shows ESPN data while users make selections
async function addEnhancedGameDataToPicks(gameId, game, gameState) {
    try {
        // Get current week from global variable or default to 1
        const weekNumber = (typeof currentWeek !== 'undefined') ? currentWeek : 
                          (typeof window.currentWeek !== 'undefined') ? window.currentWeek : 1;
        
        console.log('🔍 Loading ESPN data for picks - Week:', weekNumber, 'Game:', game.away, '@', game.home);
        
        const espnGames = await window.espnApi.getWeekGames(weekNumber);
        const espnGame = espnGames.find(eg => 
            (eg.a === game.away || eg.awayTeam === game.away) && 
            (eg.h === game.home || eg.homeTeam === game.home)
        );
        
        if (espnGame) {
            const containerId = `picks-espn-data-${gameId}`;
            const container = document.getElementById(containerId);
            
            console.log('📍 Found ESPN game data, looking for container:', containerId);
            
            if (container) {
                console.log('✅ Found container, populating with ESPN data');
                let enhancedData = [];
                
                // Weather information - crucial for picks
                if (espnGame.weather && espnGame.weather.temperature) {
                    const tempIcon = espnGame.weather.temperature > 70 ? '☀️' : 
                                   espnGame.weather.temperature > 50 ? '🌤️' : 
                                   espnGame.weather.temperature > 32 ? '☁️' : '❄️';
                    enhancedData.push(`<div class="flex items-center gap-1 text-xs text-slate-600">
                        <span class="text-sm">${tempIcon}</span>
                        <span><strong>${espnGame.weather.temperature}°F</strong> ${espnGame.weather.condition || espnGame.weather.description || ''}</span>
                    </div>`);
                }
                
                // Venue information - indoor/outdoor affects weather impact
                if (espnGame.venue && espnGame.venue.name) {
                    const venueIcon = espnGame.venue.indoor ? '🏟️' : '🌤️';
                    const location = espnGame.venue.city && espnGame.venue.state ? 
                                   ` • ${espnGame.venue.city}, ${espnGame.venue.state}` : '';
                    enhancedData.push(`<div class="flex items-center gap-1 text-xs text-slate-600">
                        <span class="text-sm">${venueIcon}</span>
                        <span><strong>${espnGame.venue.name}</strong>${location}</span>
                    </div>`);
                }
                
                // Team records - helpful for picks
                if (espnGame.teamRecords && (espnGame.teamRecords.home.length > 0 || espnGame.teamRecords.away.length > 0)) {
                    const homeRecord = espnGame.teamRecords.home.find(r => r.type === 'total' || r.type === 'overall')?.record;
                    const awayRecord = espnGame.teamRecords.away.find(r => r.type === 'total' || r.type === 'overall')?.record;
                    
                    if (homeRecord || awayRecord) {
                        enhancedData.push(`<div class="flex items-center gap-1 text-xs text-slate-600">
                            <span class="text-sm">📋</span>
                            <span>Records: ${awayRecord ? `${game.away} (${awayRecord})` : game.away} @ ${homeRecord ? `${game.home} (${homeRecord})` : game.home}</span>
                        </div>`);
                    }
                }
                
                // Broadcast information - shows importance/primetime
                if (espnGame.broadcasts && espnGame.broadcasts.length > 0) {
                    const networks = espnGame.broadcasts.map(b => b.network).filter(Boolean).join(', ');
                    if (networks) {
                        const isPrimetime = networks.includes('NBC') || networks.includes('ESPN') || 
                                          networks.includes('FOX') || networks.includes('CBS');
                        const tvIcon = isPrimetime ? '📺⭐' : '📺';
                        enhancedData.push(`<div class="flex items-center gap-1 text-xs text-slate-600">
                            <span class="text-sm">${tvIcon}</span>
                            <span><strong>${networks}</strong>${isPrimetime ? ' (Primetime)' : ''}</span>
                        </div>`);
                    }
                }
                
                // Live win probability (for in-progress games)
                if (gameState === 'IN_PROGRESS' && espnGame.situation && espnGame.situation.probability) {
                    const homeProb = espnGame.situation.probability.homeWinPercentage || espnGame.situation.probability.homeWin;
                    const awayProb = espnGame.situation.probability.awayWinPercentage || espnGame.situation.probability.awayWin;
                    
                    if (homeProb && awayProb) {
                        enhancedData.push(`<div class="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <span class="text-sm">📊</span>
                            <span>Live Win Prob: ${game.away} ${awayProb}% • ${game.home} ${homeProb}%</span>
                        </div>`);
                    }
                }
                
                // Game situation (for in-progress games)
                if (gameState === 'IN_PROGRESS' && espnGame.situation) {
                    let situationText = [];
                    if (espnGame.situation.down && espnGame.situation.distance) {
                        situationText.push(`${espnGame.situation.down} & ${espnGame.situation.distance}`);
                    }
                    if (espnGame.situation.possession) {
                        situationText.push(`${espnGame.situation.possession} has ball`);
                    }
                    if (espnGame.situation.timeRemaining) {
                        situationText.push(espnGame.situation.timeRemaining);
                    }
                    
                    if (situationText.length > 0) {
                        enhancedData.push(`<div class="flex items-center gap-1 text-xs text-blue-600 font-medium">
                            <span class="text-sm">⚡</span>
                            <span>${situationText.join(' • ')}</span>
                        </div>`);
                    }
                }
                
                // Add helpful picking context based on data
                if (enhancedData.length > 0) {
                    // Show the data in a compact, picks-friendly format
                    container.innerHTML = `
                        <div class="space-y-1">
                            ${enhancedData.join('')}
                        </div>
                    `;
                    container.classList.remove('hidden');
                } else {
                    container.classList.add('hidden');
                }
            } else {
                console.warn('❌ Container not found:', containerId);
            }
        } else {
            console.log('❌ No ESPN game found for:', game.away, '@', game.home);
        }
    } catch (error) {
        console.error('🚫 Error loading enhanced game data for picks:', error);
    }
}

// Export function for use in main app
if (typeof window !== 'undefined') {
    window.addEnhancedGameData = addEnhancedGameData;
    window.addEnhancedGameDataToPicks = addEnhancedGameDataToPicks;
    window.addEnhancedDataContainers = addEnhancedDataContainers;
}