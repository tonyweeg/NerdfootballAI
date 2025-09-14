// 🚀 DOPE LIVE GAME MODAL SYSTEM - Real-time ESPN Integration
// On-demand live game data with zero waste

let currentGameId = null;
let currentEspnEventId = null;
let modalRefreshInterval = null;

// Admin user IDs (matches main app configuration)
const ADMIN_UIDS = ["WxSPmEildJdqs6T5hIpBUZrscwt2", "BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2"];

// Check if current user is admin
function isCurrentUserAdmin() {
    if (typeof window === 'undefined' || !window.auth || !window.auth.currentUser) {
        console.log('🔒 No authenticated user - denying admin access');
        return false;
    }

    const currentUserId = window.auth.currentUser.uid;
    const isAdmin = ADMIN_UIDS.includes(currentUserId);

    console.log(`🔒 Admin check: User ${currentUserId} - ${isAdmin ? 'ADMIN' : 'Regular User'}`);
    return isAdmin;
}

// 🎯 Open the DOPE game modal for any game
async function openLiveGameModal(gameId, espnEventId) {
    console.log(`🚀 Opening DOPE game modal for Game ${gameId} (ESPN: ${espnEventId})`);

    currentGameId = gameId;
    currentEspnEventId = espnEventId;

    // Show modal and loading state
    const modal = document.getElementById('live-game-modal');
    const loading = document.getElementById('modal-loading');
    const content = document.getElementById('modal-game-content');

    modal.classList.remove('hidden');
    loading.classList.remove('hidden');
    content.classList.add('hidden');

    try {
        // Fetch game data and user pick in parallel
        const [gameData, userPick] = await Promise.all([
            fetchLiveGameData(espnEventId),
            fetchUserPickForGame(espnEventId)
        ]);

        if (gameData.success) {
            // Render the enhanced DOPE modal content with user pick and AI analysis
            renderEnhancedGameModalContent(gameData.data, userPick);

            // Hide loading, show content
            loading.classList.add('hidden');
            content.classList.remove('hidden');

            // Auto-refresh for live games (every 15 seconds)
            if (isGameInProgress(gameData.data)) {
                startModalAutoRefresh();
            }
        } else {
            throw new Error(gameData.error || 'Failed to fetch game data');
        }

    } catch (error) {
        console.error('Error loading game data:', error);
        showModalError(`Failed to load game data: ${error.message}`);
    }
}

// 🔄 Fetch live game data from Firebase Function
async function fetchLiveGameData(espnEventId) {
    try {
        // Use testLiveGameDetails function which has CORS headers for now
        const response = await fetch('https://us-central1-nerdfootball.cloudfunctions.net/testLiveGameDetails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ espnEventId })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Live game data received:', result);
        return result;

    } catch (error) {
        console.error('Error calling fetchLiveGameDetails:', error);
        throw error;
    }
}

// 🎨 Render the DOPE modal content with live data
function renderGameModalContent(gameData) {
    const teams = gameData.teams;
    const gameState = gameData.gameState;
    const lastPlay = gameData.lastPlay;
    const teamStats = gameData.teamStats;
    const recentPlays = gameData.recentPlays;
    const venue = gameData.venue;
    const weather = gameData.weather;

    // Update modal title
    document.getElementById('modal-game-title').textContent = `${teams.away.name} @ ${teams.home.name}`;

    // Update team information
    updateTeamInfo('away', teams.away);
    updateTeamInfo('home', teams.home);

    // Update game status and clock
    updateGameStatus(gameData.status, gameData.statusDisplay, gameState);

    // Show/hide live game sections based on game status
    toggleLiveSections(gameData.status, gameState, lastPlay, teamStats);

    // Update live game state (possession, field position, etc.)
    if (gameState) {
        updateLiveGameState(gameState, lastPlay);
    }

    // Update win probability
    if (lastPlay?.probability) {
        updateWinProbability(lastPlay.probability, teams);
    }

    // Update team statistics
    if (teamStats) {
        updateTeamStatistics(teamStats);
    }

    // Update recent plays
    if (recentPlays && recentPlays.length > 0) {
        updateRecentPlays(recentPlays);
    }

    // Update venue and broadcast info
    updateVenueAndBroadcast(venue, weather, gameData.broadcast);

    // Update last updated timestamp
    document.getElementById('modal-last-updated').textContent =
        `Last updated: ${new Date(gameData.lastUpdated).toLocaleTimeString()}`;
}

// Update team information in modal
function updateTeamInfo(teamType, teamData) {
    const prefix = `modal-${teamType}`;

    document.getElementById(`${prefix}-name`).textContent = teamData.name;
    document.getElementById(`${prefix}-score`).textContent = teamData.score || 0;
    document.getElementById(`${prefix}-record`).textContent = `(${teamData.record || '0-0'})`;
    document.getElementById(`${prefix}-abbr`).textContent = teamData.abbreviation || teamData.name?.slice(0, 3) || '???';

    // Set team colors if available
    const logo = document.getElementById(`${prefix}-logo`);
    if (teamData.color) {
        logo.style.backgroundColor = `#${teamData.color}`;
        logo.querySelector('span').style.color = 'white';
    }
}

// Update game status and clock information
function updateGameStatus(status, statusDisplay, gameState) {
    document.getElementById('modal-game-status').textContent = statusDisplay || status || 'Scheduled';

    if (gameState) {
        document.getElementById('modal-game-clock').textContent = gameState.clock?.displayValue || '--:--';
        document.getElementById('modal-game-period').textContent = gameState.period?.displayValue || '--';
    } else {
        document.getElementById('modal-game-clock').textContent = '--:--';
        document.getElementById('modal-game-period').textContent = '--';
    }
}

// Show/hide sections based on game status
function toggleLiveSections(status, gameState, lastPlay, teamStats) {
    const isLive = status?.includes('IN_PROGRESS') || gameState;
    const isComplete = status?.includes('FINAL');

    // Live game state (possession, down & distance)
    const liveStateSection = document.getElementById('modal-live-state');
    if (isLive && gameState) {
        liveStateSection.classList.remove('hidden');
    } else {
        liveStateSection.classList.add('hidden');
    }

    // Win probability (for live games with probability data)
    const probSection = document.getElementById('modal-win-probability');
    if (isLive && lastPlay?.probability) {
        probSection.classList.remove('hidden');
    } else {
        probSection.classList.add('hidden');
    }

    // Team statistics (for live/completed games)
    const statsSection = document.getElementById('modal-team-stats');
    if ((isLive || isComplete) && teamStats) {
        statsSection.classList.remove('hidden');
    } else {
        statsSection.classList.add('hidden');
    }

    // Recent plays (for live/completed games)
    const playsSection = document.getElementById('modal-recent-plays');
    if (isLive || isComplete) {
        playsSection.classList.remove('hidden');
    } else {
        playsSection.classList.add('hidden');
    }
}

// Update live game state information
function updateLiveGameState(gameState, lastPlay) {
    // Possession
    const possession = gameState.possession?.team || '--';
    document.getElementById('modal-possession').textContent = possession;

    // Field position (down & distance)
    let fieldPosition = '--';
    if (gameState.description) {
        fieldPosition = gameState.description;
    } else if (gameState.down && gameState.distance && gameState.yardLine) {
        fieldPosition = `${gameState.down} & ${gameState.distance} at ${gameState.yardLine}`;
    }
    document.getElementById('modal-field-position').textContent = fieldPosition;

    // Last play
    const lastPlayText = lastPlay?.text || '--';
    const lastPlayElement = document.getElementById('modal-last-play');
    lastPlayElement.textContent = lastPlayText;

    // Add excitement styling for touchdowns/big plays
    if (lastPlay?.scoreChange) {
        lastPlayElement.classList.add('text-green-700', 'font-bold');
        lastPlayElement.innerHTML = `🎯 ${lastPlayText}`;
    } else if (lastPlay?.yards && lastPlay.yards >= 15) {
        lastPlayElement.classList.add('text-blue-700', 'font-semibold');
        lastPlayElement.innerHTML = `⚡ ${lastPlayText}`;
    }
}

// Update win probability visualization
function updateWinProbability(probability, teams) {
    const awayWin = probability.awayWin || 0;
    const homeWin = probability.homeWin || 0;

    document.getElementById('modal-away-team-short').textContent = teams.away.abbreviation || 'AWY';
    document.getElementById('modal-home-team-short').textContent = teams.home.abbreviation || 'HOM';

    // Update probability bar (away team percentage)
    const probabilityBar = document.getElementById('modal-probability-bar');
    probabilityBar.style.width = `${awayWin}%`;

    // Update probability text
    document.getElementById('modal-probability-text').textContent = `${awayWin}% - ${homeWin}%`;

    // Color based on which team is favored
    if (awayWin > homeWin) {
        probabilityBar.className = 'bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-500';
    } else {
        probabilityBar.className = 'bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-500';
    }
}

// Update team statistics comparison
function updateTeamStatistics(teamStats) {
    const stats = [
        { key: 'total_yards', awayId: 'modal-away-total-yards', homeId: 'modal-home-total-yards' },
        { key: 'passing_yards', awayId: 'modal-away-passing-yards', homeId: 'modal-home-passing-yards' },
        { key: 'rushing_yards', awayId: 'modal-away-rushing-yards', homeId: 'modal-home-rushing-yards' },
        { key: 'time_of_possession', awayId: 'modal-away-time-possession', homeId: 'modal-home-time-possession' }
    ];

    stats.forEach(stat => {
        const awayValue = teamStats.away?.[stat.key] || '--';
        const homeValue = teamStats.home?.[stat.key] || '--';

        document.getElementById(stat.awayId).textContent = awayValue;
        document.getElementById(stat.homeId).textContent = homeValue;
    });
}

// Update recent plays list with excitement styling
function updateRecentPlays(recentPlays) {
    const playsList = document.getElementById('modal-plays-list');

    playsList.innerHTML = recentPlays.map(play => {
        let playIcon = '🏈';
        let playClass = 'text-slate-700';

        // Add excitement based on play type
        if (play.scoreChange) {
            playIcon = '🎯';
            playClass = 'text-green-700 font-bold';
        } else if (play.yards >= 20) {
            playIcon = '⚡';
            playClass = 'text-blue-700 font-semibold';
        } else if (play.type?.includes('Sack')) {
            playIcon = '💥';
            playClass = 'text-red-600';
        } else if (play.type?.includes('Interception') || play.type?.includes('Fumble')) {
            playIcon = '🔄';
            playClass = 'text-orange-600 font-semibold';
        }

        const timeInfo = play.period ? `Q${play.period} ${play.clock || ''}` : '';

        return `
            <div class="flex items-start space-x-3 p-2 hover:bg-slate-50 rounded-lg">
                <div class="text-lg">${playIcon}</div>
                <div class="flex-1">
                    <div class="${playClass}">${play.text}</div>
                    <div class="text-xs text-slate-500">${timeInfo} • ${play.team || ''}</div>
                </div>
                ${play.yards ? `<div class="text-sm font-medium text-slate-600">${play.yards > 0 ? '+' : ''}${play.yards} yds</div>` : ''}
            </div>
        `;
    }).join('');
}

// Update venue and broadcast information
function updateVenueAndBroadcast(venue, weather, broadcast) {
    // Venue info
    document.getElementById('modal-venue-name').textContent = venue?.name || '--';

    let location = '';
    if (venue?.city && venue?.state) {
        location = `${venue.city}, ${venue.state}`;
    }
    document.getElementById('modal-venue-location').textContent = location || '--';

    const capacity = venue?.capacity ? `Capacity: ${venue.capacity.toLocaleString()}` : '--';
    document.getElementById('modal-venue-capacity').textContent = capacity;

    // Broadcast network
    document.getElementById('modal-broadcast').textContent = broadcast || '--';

    // Weather info
    let weatherInfo = '--';
    if (weather) {
        weatherInfo = `${weather.temperature}°F, ${weather.description}`;
        if (weather.windSpeed) {
            weatherInfo += `, Wind: ${weather.windSpeed} mph`;
        }
    }
    document.getElementById('modal-weather-info').textContent = weatherInfo;
}

// 🔄 Auto-refresh for live games
function startModalAutoRefresh() {
    // Clear any existing interval
    if (modalRefreshInterval) {
        clearInterval(modalRefreshInterval);
    }

    // Refresh every 15 seconds for live games
    modalRefreshInterval = setInterval(async () => {
        if (currentEspnEventId) {
            await refreshLiveGameData();
        }
    }, 15000);
}

// 🔄 Manual refresh button handler
async function refreshLiveGameData() {
    if (!currentEspnEventId) return;

    console.log('🔄 Refreshing live game data...');

    // Show loading state on refresh button
    const refreshBtn = document.getElementById('modal-refresh-btn');
    const originalText = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Refreshing...</span>';
    refreshBtn.disabled = true;

    try {
        // Fetch game data and user pick in parallel for refresh
        const [gameData, userPick] = await Promise.all([
            fetchLiveGameData(currentEspnEventId),
            fetchUserPickForGame(currentEspnEventId)
        ]);

        if (gameData.success) {
            // Use enhanced rendering with user pick
            renderEnhancedGameModalContent(gameData.data, userPick);

            // Stop auto-refresh if game is complete
            if (!isGameInProgress(gameData.data)) {
                stopModalAutoRefresh();
            }
        }

    } catch (error) {
        console.error('Error refreshing game data:', error);
    } finally {
        // Restore refresh button
        refreshBtn.innerHTML = originalText;
        refreshBtn.disabled = false;
    }
}

// ❌ Close the modal
function closeLiveGameModal() {
    const modal = document.getElementById('live-game-modal');
    modal.classList.add('hidden');

    // Clean up
    stopModalAutoRefresh();
    currentGameId = null;
    currentEspnEventId = null;
}

// Stop auto-refresh
function stopModalAutoRefresh() {
    if (modalRefreshInterval) {
        clearInterval(modalRefreshInterval);
        modalRefreshInterval = null;
    }
}

// Check if game is in progress (for auto-refresh)
function isGameInProgress(gameData) {
    return gameData.status?.includes('IN_PROGRESS') ||
           (gameData.gameState && !gameData.status?.includes('FINAL'));
}

// Show error in modal
function showModalError(message) {
    const loading = document.getElementById('modal-loading');
    loading.innerHTML = `
        <div class="text-center p-12">
            <div class="text-red-600 text-6xl mb-4">⚠️</div>
            <h3 class="text-lg font-semibold text-slate-800 mb-2">Error Loading Game</h3>
            <p class="text-slate-600">${message}</p>
            <button onclick="closeLiveGameModal()" class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Close
            </button>
        </div>
    `;
}

// 🎯 Hook into existing game cards - Add click handlers
function initializeLiveGameModal() {
    console.log('🚀 Initializing DOPE Live Game Modal system...');

    // We'll add click handlers to game cards dynamically when they're rendered
    // This will be called from the main app after games are loaded
}

// 🚀 Add click handler to a specific game card (ADMIN ONLY)
function addGameClickHandler(gameElement, gameId, espnEventId) {
    if (!gameElement || !gameId || !espnEventId) {
        console.warn('Missing parameters for game click handler:', { gameElement, gameId, espnEventId });
        return;
    }

    // ADMIN CHECK: Only add click handlers for admin users
    if (!isCurrentUserAdmin()) {
        console.log('🔒 Live game modal restricted to admin users only');
        return;
    }

    // Add click event to open modal
    gameElement.addEventListener('click', (e) => {
        // Don't trigger if clicking on interactive elements like buttons or selects
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') {
            return;
        }

        console.log(`🎯 Game card clicked - opening modal for Game ${gameId} (Admin user)`);
        openLiveGameModal(gameId, espnEventId);
    });

    // Add visual indication that cards are clickable (admin only)
    gameElement.style.cursor = 'pointer';
    gameElement.title = '🔧 Admin: Click to view live game details';
}

// 🔍 Fetch user's pick for this game
async function fetchUserPickForGame(espnEventId) {
    try {
        console.log('🔍 Fetching user pick for ESPN ID:', espnEventId);

        // Check if user is authenticated
        if (!window.auth || !window.auth.currentUser) {
            console.log('No authenticated user for pick lookup');
            return null;
        }

        const currentUser = window.auth.currentUser;
        console.log('🔍 Looking up pick for user:', currentUser.uid);

        // Get the current week (you may need to adjust this logic based on your week calculation)
        const currentWeek = getCurrentWeek();

        // Look up user's unified picks document
        const userPicksRef = doc(db, `artifacts/nerdfootball/public/data/nerdfootball_picks/${currentWeek}/submissions`, currentUser.uid);
        const userPicksDoc = await getDoc(userPicksRef);

        if (!userPicksDoc.exists()) {
            console.log('No picks document found for user');
            return null;
        }

        const picksData = userPicksDoc.data();

        // Look through picks to find one matching this ESPN Event ID
        // This requires mapping ESPN Event ID to your internal game ID structure
        for (const gameId in picksData) {
            const pick = picksData[gameId];
            if (pick && pick.espnEventId === espnEventId) {
                console.log('✅ Found user pick:', pick);
                return {
                    team: pick.teamName || pick.team,
                    confidence: pick.confidence,
                    gameId: gameId,
                    found: true
                };
            }
        }

        console.log('No pick found for ESPN Event ID:', espnEventId);
        return null;

    } catch (error) {
        console.error('Error fetching user pick:', error);
        return null;
    }
}

// Helper function to get current week (adjust based on your week calculation logic)
function getCurrentWeek() {
    // This is a simplified version - you'll need to use your actual week calculation
    const now = new Date();
    const seasonStart = new Date('2025-09-04'); // Week 1 start
    const diffTime = Math.abs(now - seasonStart);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const week = Math.min(Math.max(Math.ceil(diffDays / 7), 1), 18);
    return week;
}

// 🎨 Enhanced modal content rendering with user picks and AI analysis
function renderEnhancedGameModalContent(gameData, userPick = null) {
    if (!gameData) {
        showModalError('No game data available');
        return;
    }

    const teams = gameData.teams;
    const gameState = gameData.gameState;
    const lastPlay = gameData.lastPlay;
    const teamStats = gameData.teamStats;
    const recentPlays = gameData.recentPlays;
    const venue = gameData.venue;
    const weather = gameData.weather;

    // Get team colors
    const awayColor = teams.away.color || '1f2937';
    const homeColor = teams.home.color || '1f2937';

    // Create enhanced content with user pick and AI analysis
    const modalContent = document.getElementById('modal-game-content');
    modalContent.innerHTML = createEnhancedGameDisplay(gameData, userPick);

    // Update last updated timestamp
    const lastUpdatedElement = document.getElementById('modal-last-updated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = `Last updated: ${new Date(gameData.lastUpdated).toLocaleTimeString()}`;
    }
}

// 🎨 Create enhanced game display with user picks and AI analysis
function createEnhancedGameDisplay(gameData, userPick = null) {
    if (!gameData) {
        return '<div class="p-6 text-center text-red-600">No game data available</div>';
    }

    const awayTeam = gameData.teams?.away;
    const homeTeam = gameData.teams?.home;
    const awayStats = gameData.teamStats?.away;
    const homeStats = gameData.teamStats?.home;

    if (!awayTeam || !homeTeam) {
        return '<div class="p-6 text-center text-red-600">Team data not available</div>';
    }

    // Get team colors
    const awayColor = awayTeam.color || '1f2937';
    const homeColor = homeTeam.color || '1f2937';

    // Format game status
    let gameStatus = '';
    if (gameData.status === 'STATUS_FINAL') {
        gameStatus = `<span class="text-gray-600 font-bold">FINAL</span>`;
    } else if (gameData.status === 'STATUS_IN_PROGRESS') {
        gameStatus = `<span class="text-red-500 font-bold animate-pulse">🔴 LIVE</span>`;
        if (gameData.statusDisplay) {
            gameStatus += `<span class="ml-2 text-sm font-semibold">${gameData.statusDisplay}</span>`;
        }
    } else {
        gameStatus = `<span class="text-blue-600 font-bold">${gameData.statusDisplay || 'SCHEDULED'}</span>`;
    }

    // Key stats for comparison
    const keyStats = [
        { label: 'Total Yards', away: awayStats?.total_yards, home: homeStats?.total_yards },
        { label: 'Passing Yards', away: awayStats?.passing, home: homeStats?.passing },
        { label: 'Rushing Yards', away: awayStats?.rushing, home: homeStats?.rushing },
        { label: '1st Downs', away: awayStats?.['1st_downs'], home: homeStats?.['1st_downs'] },
        { label: '3rd Down', away: awayStats?.['3rd_down_efficiency'], home: homeStats?.['3rd_down_efficiency'] },
        { label: 'Red Zone', away: awayStats?.['red_zone_(made-att)'], home: homeStats?.['red_zone_(made-att)'] },
        { label: 'Possession', away: awayStats?.possession, home: homeStats?.possession },
        { label: 'Turnovers', away: awayStats?.turnovers, home: homeStats?.turnovers }
    ];

    return `
        <!-- Game Header with Scores -->
        <div class="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4">
            <div class="text-center mb-3">
                ${gameStatus}
            </div>
            <div class="grid grid-cols-3 items-center gap-4">
                <!-- Away Team -->
                <div class="text-center">
                    <div class="w-16 h-16 mx-auto mb-2 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                         style="background-color: #${awayColor};">
                        ${awayTeam.abbreviation || 'TBD'}
                    </div>
                    <div class="text-sm font-medium">${awayTeam.name || 'Away Team'}</div>
                    <div class="text-2xl font-bold">${awayTeam.score || '0'}</div>
                </div>

                <!-- VS -->
                <div class="text-center">
                    <div class="text-2xl font-bold text-slate-400">VS</div>
                </div>

                <!-- Home Team -->
                <div class="text-center">
                    <div class="w-16 h-16 mx-auto mb-2 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                         style="background-color: #${homeColor};">
                        ${homeTeam.abbreviation || 'TBD'}
                    </div>
                    <div class="text-sm font-medium">${homeTeam.name || 'Home Team'}</div>
                    <div class="text-2xl font-bold">${homeTeam.score || '0'}</div>
                </div>
            </div>
        </div>

        <!-- User Pick Display -->
        ${userPick ? `
        <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200">
            <h4 class="text-md font-bold text-center mb-3 text-blue-800">🎯 Your Pick</h4>
            <div class="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                            ${userPick.confidence}
                        </div>
                        <div>
                            <div class="font-bold text-blue-800">${userPick.team}</div>
                            <div class="text-xs text-blue-600">Confidence: ${userPick.confidence} points</div>
                        </div>
                    </div>
                    ${userPick.found ?
                        '<div class="text-green-600 text-sm font-semibold">✅ Active Pick</div>' :
                        '<div class="text-orange-600 text-sm font-semibold">🔍 Pick Lookup</div>'
                    }
                </div>
            </div>
        </div>` : ''}

        <!-- Team Statistics -->
        <div class="p-4 bg-white">
            <h3 class="text-lg font-bold text-center mb-4 text-slate-800">Team Statistics</h3>

            <!-- Key Stats Cards -->
            <div class="grid grid-cols-2 gap-3 mb-4">
                ${keyStats.slice(0, 4).map(stat => `
                    <div class="bg-slate-50 rounded-lg p-3 border">
                        <div class="text-xs font-semibold text-slate-600 text-center mb-2">${stat.label}</div>
                        <div class="grid grid-cols-3 items-center text-sm">
                            <div class="text-center font-bold" style="color: #${awayColor}">${stat.away || 'N/A'}</div>
                            <div class="text-center text-slate-400">vs</div>
                            <div class="text-center font-bold" style="color: #${homeColor}">${stat.home || 'N/A'}</div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Full Statistics Grid -->
            <div class="bg-slate-50 rounded-lg overflow-hidden">
                <div class="grid grid-cols-5 bg-slate-200 text-xs font-bold py-2">
                    <div class="text-center" style="color: #${awayColor}">${awayTeam.abbreviation}</div>
                    <div class="col-span-3 text-center text-slate-700">Statistic</div>
                    <div class="text-center" style="color: #${homeColor}">${homeTeam.abbreviation}</div>
                </div>
                ${keyStats.map(stat => `
                    <div class="grid grid-cols-5 border-b border-slate-200 py-2 text-xs">
                        <div class="text-center font-semibold" style="color: #${awayColor}">${stat.away || 'N/A'}</div>
                        <div class="col-span-3 text-center text-slate-700">${stat.label}</div>
                        <div class="text-center font-semibold" style="color: #${homeColor}">${stat.home || 'N/A'}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- AI Statistical Analysis -->
        ${awayStats && homeStats ? `
        <div class="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-t-2 border-purple-200">
            <h4 class="text-md font-bold text-center mb-4 text-purple-800">🤖 AI Statistical Analysis</h4>

            <!-- Detailed Comparison -->
            <div class="bg-white rounded-lg p-4 mb-4 border border-purple-200 shadow-sm">
                <h5 class="font-bold mb-3 text-purple-700">📊 Statistical Comparison</h5>
                ${generateDetailedAnalysis(awayStats, homeStats, awayTeam, homeTeam, awayColor, homeColor)}
            </div>

            <!-- AI Win Prediction -->
            <div class="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
                <h5 class="font-bold mb-3 text-purple-700">🎯 AI Win Prediction</h5>
                ${generateWinPrediction(awayStats, homeStats, awayTeam, homeTeam, gameData.status, awayColor, homeColor)}
            </div>
        </div>` : ''}

        <!-- Additional Stats -->
        ${awayStats && homeStats ? `
        <div class="p-4 bg-slate-50">
            <h4 class="text-md font-bold text-center mb-3 text-slate-800">Detailed Statistics</h4>
            <div class="grid grid-cols-2 gap-4 text-xs">
                <!-- Away Team Detailed -->
                <div class="bg-white p-3 rounded border-l-4" style="border-color: #${awayColor}">
                    <h5 class="font-bold mb-2" style="color: #${awayColor}">${awayTeam.name}</h5>
                    <div class="space-y-1">
                        <div>Comp/Att: ${awayStats['comp/att'] || 'N/A'}</div>
                        <div>Yards/Play: ${awayStats.yards_per_play || 'N/A'}</div>
                        <div>Penalties: ${awayStats.penalties || 'N/A'}</div>
                        <div>Total Plays: ${awayStats.total_plays || 'N/A'}</div>
                    </div>
                </div>
                <!-- Home Team Detailed -->
                <div class="bg-white p-3 rounded border-l-4" style="border-color: #${homeColor}">
                    <h5 class="font-bold mb-2" style="color: #${homeColor}">${homeTeam.name}</h5>
                    <div class="space-y-1">
                        <div>Comp/Att: ${homeStats['comp/att'] || 'N/A'}</div>
                        <div>Yards/Play: ${homeStats.yards_per_play || 'N/A'}</div>
                        <div>Penalties: ${homeStats.penalties || 'N/A'}</div>
                        <div>Total Plays: ${homeStats.total_plays || 'N/A'}</div>
                    </div>
                </div>
            </div>
        </div>` : ''}
    `;
}

// 🤖 AI Analysis Functions
function generateDetailedAnalysis(awayStats, homeStats, awayTeam, homeTeam, awayColor, homeColor) {
    const analysis = [];

    // Offensive Efficiency Analysis
    const awayYPP = parseFloat(awayStats.yards_per_play) || 0;
    const homeYPP = parseFloat(homeStats.yards_per_play) || 0;
    const yppDiff = Math.abs(awayYPP - homeYPP);

    if (yppDiff > 1.0) {
        const leader = awayYPP > homeYPP ? awayTeam.name : homeTeam.name;
        const advantage = yppDiff > 2.0 ? 'significant' : 'moderate';
        analysis.push(`🎯 <strong>Offensive Efficiency:</strong> ${leader} has a ${advantage} advantage in yards per play (${Math.max(awayYPP, homeYPP).toFixed(1)} vs ${Math.min(awayYPP, homeYPP).toFixed(1)})`);
    }

    // Red Zone Efficiency
    const awayRZ = awayStats['red_zone_(made-att)']?.split('-') || ['0', '1'];
    const homeRZ = homeStats['red_zone_(made-att)']?.split('-') || ['0', '1'];
    const awayRZPct = parseInt(awayRZ[0]) / parseInt(awayRZ[1]) * 100 || 0;
    const homeRZPct = parseInt(homeRZ[0]) / parseInt(homeRZ[1]) * 100 || 0;

    if (Math.abs(awayRZPct - homeRZPct) > 20) {
        const leader = awayRZPct > homeRZPct ? awayTeam.name : homeTeam.name;
        const pct = Math.max(awayRZPct, homeRZPct).toFixed(0);
        analysis.push(`🔴 <strong>Red Zone Efficiency:</strong> ${leader} is converting at ${pct}% in the red zone, showing superior finishing ability`);
    }

    // Turnover Analysis
    const awayTO = parseInt(awayStats.turnovers) || 0;
    const homeTO = parseInt(homeStats.turnovers) || 0;
    if (awayTO !== homeTO) {
        const safer = awayTO < homeTO ? awayTeam.name : homeTeam.name;
        const toDiff = Math.abs(awayTO - homeTO);
        analysis.push(`⚠️ <strong>Ball Security:</strong> ${safer} is protecting the ball better (${Math.min(awayTO, homeTO)} vs ${Math.max(awayTO, homeTO)} turnovers)`);
    }

    // 3rd Down Analysis
    const away3rd = awayStats['3rd_down_efficiency']?.split('-') || ['0', '1'];
    const home3rd = homeStats['3rd_down_efficiency']?.split('-') || ['0', '1'];
    const away3rdPct = parseInt(away3rd[0]) / parseInt(away3rd[1]) * 100 || 0;
    const home3rdPct = parseInt(home3rd[0]) / parseInt(home3rd[1]) * 100 || 0;

    if (Math.abs(away3rdPct - home3rdPct) > 15) {
        const leader = away3rdPct > home3rdPct ? awayTeam.name : homeTeam.name;
        const pct = Math.max(away3rdPct, home3rdPct).toFixed(0);
        analysis.push(`📈 <strong>3rd Down Conversion:</strong> ${leader} is sustaining drives at ${pct}%, controlling game tempo`);
    }

    // Time of Possession
    const awayPoss = convertPossessionToMinutes(awayStats.possession);
    const homePoss = convertPossessionToMinutes(homeStats.possession);
    const possDiff = Math.abs(awayPoss - homePoss);

    if (possDiff > 5) {
        const leader = awayPoss > homePoss ? awayTeam.name : homeTeam.name;
        analysis.push(`⏱️ <strong>Game Control:</strong> ${leader} is controlling the clock with ${Math.max(awayPoss, homePoss).toFixed(1)} minutes of possession`);
    }

    return analysis.length > 0 ? analysis.map(item => `<div class="mb-2 text-sm">${item}</div>`).join('') :
        '<div class="text-sm text-gray-600">Teams are evenly matched statistically</div>';
}

function generateWinPrediction(awayStats, homeStats, awayTeam, homeTeam, gameStatus, awayColor = '1f2937', homeColor = '1f2937') {
    const factors = [];
    let awayScore = 0;
    let homeScore = 0;

    // Offensive efficiency scoring
    const awayYPP = parseFloat(awayStats.yards_per_play) || 0;
    const homeYPP = parseFloat(homeStats.yards_per_play) || 0;
    if (awayYPP > homeYPP) awayScore += 15; else homeScore += 15;

    // Total yards advantage
    const awayYards = parseInt(awayStats.total_yards) || 0;
    const homeYards = parseInt(homeStats.total_yards) || 0;
    if (awayYards > homeYards) awayScore += 10; else homeScore += 10;

    // Red zone efficiency
    const awayRZ = awayStats['red_zone_(made-att)']?.split('-') || ['0', '1'];
    const homeRZ = homeStats['red_zone_(made-att)']?.split('-') || ['0', '1'];
    const awayRZPct = parseInt(awayRZ[0]) / parseInt(awayRZ[1]) || 0;
    const homeRZPct = parseInt(homeRZ[0]) / parseInt(homeRZ[1]) || 0;
    if (awayRZPct > homeRZPct) awayScore += 20; else homeScore += 20;

    // Turnover differential (fewer is better)
    const awayTO = parseInt(awayStats.turnovers) || 0;
    const homeTO = parseInt(homeStats.turnovers) || 0;
    if (awayTO < homeTO) awayScore += 25; else homeScore += 25;

    // 3rd down conversion
    const away3rd = awayStats['3rd_down_efficiency']?.split('-') || ['0', '1'];
    const home3rd = homeStats['3rd_down_efficiency']?.split('-') || ['0', '1'];
    const away3rdPct = parseInt(away3rd[0]) / parseInt(away3rd[1]) || 0;
    const home3rdPct = parseInt(home3rd[0]) / parseInt(home3rd[1]) || 0;
    if (away3rdPct > home3rdPct) awayScore += 15; else homeScore += 15;

    // Time of possession
    const awayPoss = convertPossessionToMinutes(awayStats.possession);
    const homePoss = convertPossessionToMinutes(homeStats.possession);
    if (awayPoss > homePoss) awayScore += 15; else homeScore += 15;

    // Calculate confidence percentage
    const totalPoints = awayScore + homeScore;
    const winnerScore = Math.max(awayScore, homeScore);
    const confidence = Math.round((winnerScore / totalPoints) * 100);
    const predicted = awayScore > homeScore ? awayTeam.name : homeTeam.name;
    const predColor = awayScore > homeScore ? awayColor : homeColor;

    // Generate reasoning
    const reasoning = [];
    if (awayYPP > homeYPP + 1) reasoning.push("Superior offensive efficiency");
    if (homeYPP > awayYPP + 1) reasoning.push("Superior offensive efficiency");
    if (awayRZPct > homeRZPct + 0.2) reasoning.push("Better red zone execution");
    if (homeRZPct > awayRZPct + 0.2) reasoning.push("Better red zone execution");
    if (awayTO < homeTO) reasoning.push("Better ball security");
    if (homeTO < awayTO) reasoning.push("Better ball security");
    if (Math.abs(awayPoss - homePoss) > 5) reasoning.push("Game control advantage");

    return `
        <div class="text-center mb-4">
            <div class="text-lg font-bold mb-2" style="color: #${predColor}">
                🏆 ${predicted} to Win
            </div>
            <div class="text-2xl font-bold text-purple-700">${confidence}% Confidence</div>
        </div>
        <div class="text-sm space-y-1">
            <div class="font-semibold mb-2">Key Factors:</div>
            ${reasoning.length > 0 ? reasoning.map(r => `<div>• ${r}</div>`).join('') : '<div>• Close statistical matchup</div>'}
            ${gameStatus === 'STATUS_IN_PROGRESS' ?
                '<div class="mt-3 p-2 bg-yellow-50 rounded text-yellow-800 text-xs"><strong>Live Update:</strong> Prediction based on current game performance</div>' :
                '<div class="mt-3 p-2 bg-blue-50 rounded text-blue-800 text-xs"><strong>Final Analysis:</strong> Based on complete game statistics</div>'
            }
        </div>
    `;
}

function convertPossessionToMinutes(possession) {
    if (!possession) return 0;
    const parts = possession.split(':');
    return parseInt(parts[0]) + (parseInt(parts[1]) / 60);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeLiveGameModal);

// Export functions for global use
window.openLiveGameModal = openLiveGameModal;
window.closeLiveGameModal = closeLiveGameModal;
window.refreshLiveGameData = refreshLiveGameData;
window.addGameClickHandler = addGameClickHandler;