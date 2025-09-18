/**
 * 🏆 SURVIVOR BATTLEFIELD - STUNNING VISUAL DISPLAY
 *
 * Transforms the boring survivor table into a visually stunning battlefield
 * showing the living vs the dead with hearts, tombstones, and helmet histories.
 */

class SurvivorBattlefieldDisplay {
    constructor() {
        this.currentWeek = this.calculateCurrentWeek(); // Self-contained week calculation
        this.teamToHelmetMap = this.buildTeamHelmetMap();
        this.gameResults = null;
        this.init();
    }

    // Self-contained week calculation - no external dependencies
    calculateCurrentWeek() {
        const seasonStart = new Date('2025-09-04');
        const now = new Date();
        const daysSinceStart = Math.floor((now - seasonStart) / (1000 * 60 * 60 * 24));
        const week = Math.min(Math.max(Math.floor(daysSinceStart / 7) + 1, 1), 18);
        console.log(`🏆 BATTLEFIELD: Self-calculated current week: ${week}`);
        return week;
    }

    // Build team name to helmet CSS class mapping
    buildTeamHelmetMap() {
        return {
            'Arizona Cardinals': 'ari',
            'Atlanta Falcons': 'atl',
            'Baltimore Ravens': 'bal',
            'Buffalo Bills': 'buf',
            'Carolina Panthers': 'car',
            'Chicago Bears': 'chi',
            'Cincinnati Bengals': 'cin',
            'Cleveland Browns': 'cle',
            'Dallas Cowboys': 'dal',
            'Denver Broncos': 'den',
            'Detroit Lions': 'det',
            'Green Bay Packers': 'gb',
            'Houston Texans': 'hou',
            'Indianapolis Colts': 'ind',
            'Jacksonville Jaguars': 'jax',
            'Kansas City Chiefs': 'kc',
            'Las Vegas Raiders': 'lv',
            'Los Angeles Chargers': 'lac',
            'Los Angeles Rams': 'lar',
            'Miami Dolphins': 'mia',
            'Minnesota Vikings': 'min',
            'New England Patriots': 'ne',
            'New Orleans Saints': 'no',
            'New York Giants': 'nyg',
            'New York Jets': 'nyj',
            'Philadelphia Eagles': 'phi',
            'Pittsburgh Steelers': 'pit',
            'San Francisco 49ers': 'sf',
            'Seattle Seahawks': 'sea',
            'Tampa Bay Buccaneers': 'tb',
            'Tennessee Titans': 'ten',
            'Washington Commanders': 'was'
        };
    }

    async init() {
        console.log('🏆 Initializing Survivor Battlefield Display...');

        // Load game results for current context
        await this.loadGameResults();

        console.log('✅ Survivor Battlefield ready for deployment');
    }

    async loadGameResults() {
        try {
            // Load game results to understand what games have started/finished
            this.gameResults = {};

            // Check if we have game state cache
            if (window.gameStateCache) {
                const cacheData = await window.gameStateCache.getCachedData();
                if (cacheData && cacheData.espnData) {
                    this.gameResults = cacheData.espnData;
                }
            }
        } catch (error) {
            console.log('⚠️ Could not load game results, using fallback:', error.message);
        }
    }

    async renderBattlefield() {
        console.log('🎨 Rendering Survivor Battlefield...');

        try {
            // Wait for Firebase to be ready (with timeout)
            await this.waitForFirebase();

            // Use global Firebase functions (matching index.html pattern)
            const doc = window.doc;
            const getDoc = window.getDoc;

            if (!doc || !getDoc || !window.db) {
                throw new Error('Firebase utilities not available');
            }

            console.log('📡 Loading embedded survivor data (READ ONLY)...');

            // Use our validated embedded survivor data for lightning-fast performance (READ ONLY)
            const poolDoc = await getDoc(doc(window.db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members'));

            if (!poolDoc.exists()) {
                throw new Error('Pool members data not found in Firestore');
            }

            const poolMembers = poolDoc.data();

            if (!poolMembers || typeof poolMembers !== 'object') {
                throw new Error('Invalid pool members data format');
            }

            console.log(`📊 Loaded data for ${Object.keys(poolMembers).length} pool members`);

            // Process data with comprehensive null handling
            const battlefieldData = this.processBattlefieldData(poolMembers);

            if (!battlefieldData || battlefieldData.stats.total === 0) {
                console.warn('⚠️ No survivor data found');
                this.showBattlefieldError('No survivor data available to display');
                return;
            }

            // Update stats display
            this.updateBattlefieldStats(battlefieldData);

            // Render the battlefield display
            this.renderBattlefieldDisplay(battlefieldData);

            console.log(`✅ Survivor Battlefield rendered successfully! (${battlefieldData.stats.alive} alive, ${battlefieldData.stats.eliminated} eliminated)`);

        } catch (error) {
            console.error('❌ Error rendering battlefield:', error);

            // Provide detailed error information
            const errorDetails = {
                message: error.message,
                stack: error.stack,
                firebaseAvailable: !!window.firebaseUtils,
                dbAvailable: !!window.db
            };

            console.error('🔍 Error details:', errorDetails);

            this.showBattlefieldError(`Failed to load survivor battlefield: ${error.message}`);
        }
    }

    processBattlefieldData(poolMembers) {
        const living = [];
        const dead = [];
        let totalPlayers = 0;

        if (!poolMembers || typeof poolMembers !== 'object') {
            console.error('❌ Invalid pool members data:', poolMembers);
            return {
                living: [],
                dead: [],
                stats: { total: 0, alive: 0, eliminated: 0, survivalRate: 0 }
            };
        }

        Object.keys(poolMembers).forEach(userId => {
            try {
                const member = poolMembers[userId];

                // Comprehensive null/undefined checking
                if (!member || typeof member !== 'object') {
                    console.warn(`⚠️ Invalid member data for ${userId}:`, member);
                    return;
                }

                if (!member.survivor || typeof member.survivor !== 'object') {
                    console.log(`ℹ️ User ${userId} has no survivor data, skipping`);
                    return; // Skip users without survivor data
                }

                // 🎯 FILTER: Skip users with ZERO picks (they shouldn't appear in battlefield)
                const totalPicks = (typeof member.survivor.totalPicks === 'number') ? member.survivor.totalPicks : 0;
                const pickHistory = member.survivor.pickHistory || '';
                const hasNoPicks = totalPicks === 0 && (!pickHistory || pickHistory.trim() === '');

                if (hasNoPicks) {
                    console.log(`🚫 User ${userId} has zero picks, excluding from battlefield`);
                    return; // Skip users with no picks
                }

                totalPlayers++;

                const survivorData = member.survivor;
                const isAlive = survivorData.alive === 18;

                // Safe name handling with multiple fallbacks
                let playerName = 'Unknown Player';
                if (member.displayName && typeof member.displayName === 'string' && member.displayName.trim()) {
                    playerName = member.displayName.trim();
                } else if (member.email && typeof member.email === 'string' && member.email.trim()) {
                    playerName = member.email.split('@')[0]; // Use email prefix as fallback
                } else {
                    playerName = `Player ${userId.substring(0, 8)}`; // Use partial user ID as last resort
                }

                const playerData = {
                    userId,
                    name: playerName,
                    email: (member.email && typeof member.email === 'string') ? member.email : '',
                    isAlive,
                    pickHistory: (survivorData.pickHistory && typeof survivorData.pickHistory === 'string') ? survivorData.pickHistory : '',
                    totalPicks: (typeof survivorData.totalPicks === 'number') ? survivorData.totalPicks : 0,
                    eliminationWeek: (typeof survivorData.eliminationWeek === 'number') ? survivorData.eliminationWeek : null,
                    lastUpdated: survivorData.lastUpdated || null,
                    helmets: this.buildHelmetDisplay(survivorData, isAlive, playerName),
                    currentWeekPick: this.getCurrentWeekPick(survivorData)
                };

                if (isAlive) {
                    living.push(playerData);
                } else {
                    dead.push(playerData);
                }

            } catch (error) {
                console.error(`❌ Error processing user ${userId}:`, error);
                // Continue processing other users
            }
        });

        // Sort alphabetically as requested (with safe comparison)
        living.sort((a, b) => {
            const nameA = (a.name || '').toString();
            const nameB = (b.name || '').toString();
            return nameA.localeCompare(nameB);
        });

        dead.sort((a, b) => {
            const nameA = (a.name || '').toString();
            const nameB = (b.name || '').toString();
            return nameA.localeCompare(nameB);
        });

        console.log(`✅ Processed ${totalPlayers} users: ${living.length} alive, ${dead.length} eliminated`);

        return {
            living,
            dead,
            stats: {
                total: totalPlayers,
                alive: living.length,
                eliminated: dead.length,
                survivalRate: totalPlayers > 0 ? Math.round((living.length / totalPlayers) * 100) : 0
            }
        };
    }

    buildHelmetDisplay(survivorData, isAlive, playerName) {
        if (!survivorData || !survivorData.pickHistory || typeof survivorData.pickHistory !== 'string') {
            return [];
        }

        const picks = survivorData.pickHistory.split(', ').filter(pick => pick && pick.trim());
        const helmets = [];

        picks.forEach((teamName, index) => {
            try {
                const week = index + 1;
                const cleanTeamName = (teamName || '').trim();

                if (!cleanTeamName) return; // Skip empty team names

                const helmetClass = this.teamToHelmetMap[cleanTeamName] || 'default';

                let isKillerHelmet = false;
                if (!isAlive && typeof survivorData.eliminationWeek === 'number' && survivorData.eliminationWeek === week) {
                    isKillerHelmet = true;
                }

                const safePlayerName = playerName || 'this player';

                helmets.push({
                    teamName: cleanTeamName,
                    week,
                    helmetClass,
                    isKillerHelmet,
                    tooltip: isKillerHelmet
                        ? `This team killed ${safePlayerName} in Week ${week}`
                        : `Week ${week}: ${cleanTeamName}`
                });
            } catch (error) {
                console.warn(`⚠️ Error processing helmet for week ${index + 1}:`, error);
                // Continue processing other helmets
            }
        });

        return helmets;
    }

    getCurrentWeekPick(survivorData) {
        // For now, show thinking emoji if no current week pick visible
        // TODO: Integrate with game start times to show/hide appropriately
        return {
            isHidden: true,
            displayText: '🤔', // Unicode thinking emoji
            tooltip: 'Pick hidden until games start'
        };
    }

    // Parse pick history string into array of team names
    parsePickHistory(pickHistoryString) {
        if (!pickHistoryString || typeof pickHistoryString !== 'string') {
            return [];
        }

        return pickHistoryString
            .split(', ')
            .map(pick => pick.trim())
            .filter(pick => pick && pick.length > 0);
    }

    updateBattlefieldStats(battlefieldData) {
        // Update the stats display using safe DOM selection
        const totalPlayersElement = document.querySelector('#survivor-total-players') || document.querySelector('.survivor-total-players');
        if (totalPlayersElement) {
            totalPlayersElement.textContent = battlefieldData.stats.total;
        }

        const activePlayersElement = document.querySelector('#survivor-active-players') || document.querySelector('.survivor-active-players');
        if (activePlayersElement) {
            activePlayersElement.textContent = battlefieldData.stats.alive;
        }

        const eliminatedPlayersElement = document.querySelector('#survivor-eliminated-players') || document.querySelector('.survivor-eliminated-players');
        if (eliminatedPlayersElement) {
            eliminatedPlayersElement.textContent = battlefieldData.stats.eliminated;
        }

        const currentWeekElement = document.querySelector('#survivor-current-week') || document.querySelector('.survivor-current-week');
        if (currentWeekElement) {
            currentWeekElement.textContent = `${battlefieldData.stats.survivalRate}%`;
        }
    }

    renderBattlefieldDisplay(battlefieldData) {
        const container = document.querySelector('#survivor-results-container') || document.querySelector('.survivor-results') || document.querySelector('#survivor-table-container');
        if (!container) return;

        let html = `
            <!-- Battlefield Header -->
            <div class="bg-gradient-to-r from-green-500 to-red-500 text-white rounded-lg shadow-lg mb-6 p-6">
                <h1 class="text-3xl font-bold text-center mb-2">⚔️ SURVIVOR BATTLEFIELD ⚔️</h1>
                <p class="text-center text-lg opacity-90">
                    ${battlefieldData.stats.alive} Heroes Standing | ${battlefieldData.stats.eliminated} Fallen Warriors
                </p>
            </div>

            <!-- ACTIVE SURVIVORS - Ocean Breeze Theme -->
            <div class="mb-6 bg-blue-50 rounded-lg border border-blue-200 overflow-hidden">
                <div class="bg-blue-100 px-4 py-3 border-b border-blue-200">
                    <h3 class="text-lg font-semibold text-blue-900 flex items-center">
                        ⭐ Active Survivors (${battlefieldData.stats.alive})
                        <span class="ml-2 text-sm font-normal text-blue-600">Fighting for victory</span>
                    </h3>
                </div>
        `;

        if (battlefieldData.living.length === 0) {
            html += `
                <div class="text-center py-8">
                    <div class="text-4xl mb-2">💤</div>
                    <h4 class="text-lg font-medium text-slate-600">No Active Survivors</h4>
                    <p class="text-slate-500 text-sm">All warriors have fallen...</p>
                </div>
            `;
        } else {
            html += `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">`;

            battlefieldData.living.forEach(player => {
                html += this.renderCompactCard(player, true);
            });

            html += `</div>`;
        }

        html += `
                </div>
            </div>

            <!-- ELIMINATED PLAYERS - Ocean Breeze Theme -->
            <div class="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                <div class="bg-slate-100 px-4 py-3 border-b border-slate-200">
                    <h3 class="text-lg font-semibold text-slate-700 flex items-center">
                        💤 Eliminated (${battlefieldData.stats.eliminated})
                        <span class="ml-2 text-sm font-normal text-slate-500">Honorable warriors</span>
                    </h3>
                </div>
        `;

        if (battlefieldData.dead.length === 0) {
            html += `
                <div class="text-center py-8">
                    <div class="text-4xl mb-2">⭐</div>
                    <h4 class="text-lg font-medium text-slate-600">Perfect Season</h4>
                    <p class="text-slate-500 text-sm">No eliminations yet...</p>
                </div>
            `;
        } else {
            html += `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">`;

            battlefieldData.dead.forEach(player => {
                html += this.renderCompactCard(player, false);
            });

            html += `</div>`;
        }

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Add event listeners for interactive elements
        this.attachBattlefieldEventListeners();
    }

    renderPlayerCard(player, isAlive) {
        const bgClass = isAlive
            ? 'bg-white border-2 border-green-300 hover:border-green-500'
            : 'bg-gray-900 border-2 border-gray-700 hover:border-gray-500';

        const textClass = isAlive ? 'text-gray-900' : 'text-white';
        const statusIcon = isAlive ? '💚' : '🪦';

        let helmetsHtml = '';
        if (player.helmets.length > 0) {
            helmetsHtml = player.helmets.map(helmet => {
                const greyClass = helmet.isKillerHelmet ? 'grayscale opacity-50' : '';
                const borderClass = helmet.isKillerHelmet ? 'border-2 border-red-500' : '';

                return `
                    <div class="helmet-container relative group">
                        <div class="helmet helmet-${helmet.helmetClass} ${greyClass} ${borderClass}"
                             title="${helmet.tooltip}"
                             data-team="${helmet.teamName}"
                             data-week="${helmet.week}">
                        </div>
                        ${helmet.isKillerHelmet ? '<div class="killer-overlay">💀</div>' : ''}
                    </div>
                `;
            }).join('');
        } else {
            helmetsHtml = '<div class="text-gray-500 italic">No picks yet</div>';
        }

        return `
            <div class="player-card ${bgClass} rounded-lg p-4 transition-all duration-200 shadow-sm hover:shadow-md">
                <div class="flex items-center justify-between">
                    <!-- Status & Name -->
                    <div class="flex items-center space-x-3">
                        <div class="status-icon text-2xl">${statusIcon}</div>
                        <div>
                            <h3 class="font-bold ${textClass} text-lg">${player.name}</h3>
                            ${!isAlive ? `<p class="text-red-400 text-sm">Eliminated Week ${player.eliminationWeek}</p>` : ''}
                        </div>
                    </div>

                    <!-- Current Week Pick -->
                    <div class="current-pick text-center">
                        <div class="text-2xl mb-1" title="${player.currentWeekPick.tooltip}">
                            ${player.currentWeekPick.displayText}
                        </div>
                        <div class="${textClass} text-xs opacity-75">Week ${this.currentWeek}</div>
                    </div>
                </div>

                <!-- Helmet History -->
                <div class="helmet-history mt-4">
                    <div class="flex items-center space-x-2 mb-2">
                        <span class="${textClass} text-sm font-medium">Pick History:</span>
                        <span class="${textClass} text-xs opacity-75">(${player.totalPicks} picks)</span>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        ${helmetsHtml}
                    </div>
                </div>
            </div>
        `;
    }

    // Render compact card with Ocean Breeze theme (for grid layout)
    renderCompactCard(player, isAlive) {
        const statusIcon = isAlive ? '⭐' : '💤';
        const statusText = isAlive ? 'Active' : `Eliminated Week ${player.eliminationWeek || 'Unknown'}`;
        const cardBg = isAlive ? 'bg-white border-blue-200' : 'bg-slate-50 border-slate-300';
        const nameColor = isAlive ? 'text-blue-900' : 'text-slate-700';
        const statusColor = isAlive ? 'text-blue-600' : 'text-slate-500';
        const shadowHover = isAlive ? 'hover:shadow-blue-100' : 'hover:shadow-slate-200';

        // Build helmet display with thinking emoji for current week
        let helmetsHtml = '';
        const picks = this.parsePickHistory(player.pickHistory || '');

        if (picks.length > 0) {
            helmetsHtml = picks.map((teamName, index) => {
                const isLastPick = index === picks.length - 1 && !isAlive;
                const opacity = isLastPick ? 'opacity-50' : 'opacity-100';
                const ring = isLastPick ? 'ring-2 ring-red-400' : '';
                const title = isLastPick ? `Week ${index + 1}: ${teamName} (💤 Elimination)` : `Week ${index + 1}: ${teamName}`;
                const helmetClass = this.teamToHelmetMap[teamName] || 'default';

                return `
                    <div class="helmet-container inline-block" title="${title}">
                        <div class="helmet ${helmetClass} ${opacity} ${ring}"
                             data-team="${teamName}"
                             data-week="${index + 1}"
                             style="width: 28px; height: 28px; background-size: contain; background-repeat: no-repeat; background-position: center;">
                        </div>
                    </div>
                `;
            }).join('');

            // 🤔 Add thinking emoji for active players with current week pending
            if (isAlive && picks.length === this.currentWeek - 1) {
                helmetsHtml += `
                    <div class="inline-block" title="Week ${this.currentWeek}: Pick pending">
                        <div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                            🤔
                        </div>
                    </div>
                `;
            }
        } else {
            helmetsHtml = '<span class="text-xs text-slate-400">No picks</span>';
        }

        return `
            <div class="p-4 ${cardBg} border-2 rounded-lg ${shadowHover} hover:shadow-md transition-all duration-200">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-semibold ${nameColor} truncate flex-1">${player.name}</h4>
                    <span class="text-xl ml-2">${statusIcon}</span>
                </div>
                <p class="text-sm ${statusColor} mb-3">${statusText}</p>
                <div class="space-y-2">
                    <div class="text-xs ${isAlive ? 'text-blue-600' : 'text-slate-600'} font-medium">
                        Pick History (${player.totalPicks || 0} weeks):
                    </div>
                    <div class="flex flex-wrap gap-1">
                        ${helmetsHtml}
                    </div>
                </div>
            </div>
        `;
    }

    attachBattlefieldEventListeners() {
        // Add click handlers for helmet interactions
        document.querySelectorAll('.helmet-container').forEach(helmet => {
            helmet.addEventListener('click', (e) => {
                const teamName = e.currentTarget.querySelector('.helmet').dataset.team;
                const week = e.currentTarget.querySelector('.helmet').dataset.week;

                // Show detailed pick information
                this.showPickDetail(teamName, week);
            });
        });
    }

    // Wait for Firebase to be ready
    async waitForFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max

            const checkFirebase = () => {
                attempts++;

                if (window.doc && window.getDoc && window.db) {
                    console.log('🔥 Firebase ready for battlefield!');
                    resolve();
                    return;
                }

                if (attempts >= maxAttempts) {
                    reject(new Error('Firebase initialization timeout'));
                    return;
                }

                setTimeout(checkFirebase, 100); // Check every 100ms
            };

            checkFirebase();
        });
    }

    showPickDetail(teamName, week) {
        // Simple alert for now - could be enhanced with modal
        alert(`Week ${week} Pick: ${teamName}`);
    }

    showBattlefieldError(message) {
        // Find survivor container using safe DOM selection
        const container = document.querySelector('#survivor-results-container') || document.querySelector('.survivor-results');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl mb-4">💥</div>
                <h2 class="text-2xl font-bold text-gray-900 mb-2">Battlefield Unavailable</h2>
                <p class="text-gray-600 mb-4">${message}</p>
                <button onclick="SurvivorView.loadSurvivorResults()"
                        class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    Retry Battle Connection
                </button>
            </div>
        `;
    }
}

// Enhanced CSS for the battlefield display
const battlefieldStyles = `
<style>
/* Helmet Display Styles */
.helmet {
    width: 32px;
    height: 32px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.helmet:hover {
    transform: scale(1.1);
    z-index: 10;
}

.helmet-container {
    position: relative;
    display: inline-block;
}

.killer-overlay {
    position: absolute;
    top: -2px;
    right: -2px;
    font-size: 12px;
    background: rgba(0,0,0,0.8);
    border-radius: 50%;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Player Card Animations */
.player-card {
    transition: all 0.3s ease;
}

.player-card:hover {
    transform: translateY(-2px);
}

/* Status Icon Animations */
.status-icon {
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

/* Responsive Design */
@media (max-width: 768px) {
    .helmet {
        width: 24px;
        height: 24px;
    }

    .player-card {
        padding: 12px;
    }

    .status-icon {
        font-size: 20px;
    }
}
</style>
`;

// Initialize the battlefield display
window.SurvivorBattlefieldDisplay = SurvivorBattlefieldDisplay;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Add styles to head
        document.head.insertAdjacentHTML('beforeend', battlefieldStyles);

        // Initialize battlefield
        window.survivorBattlefield = new SurvivorBattlefieldDisplay();
    });
} else {
    // Add styles to head
    document.head.insertAdjacentHTML('beforeend', battlefieldStyles);

    // Initialize battlefield
    window.survivorBattlefield = new SurvivorBattlefieldDisplay();
}

console.log('🏆 Survivor Battlefield Display loaded and ready for battle!');