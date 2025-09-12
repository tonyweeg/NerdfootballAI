// SIMPLE SURVIVOR SYSTEM - Fast & Reliable
// Shows: User | Team Picked | Status (Won/Lost/Not Started)

class SimpleSurvivorSystem {
    constructor(db) {
        this.db = db;
        this.currentWeek = 1;
    }

    // Get simple survivor table data for all pool members - NO CACHING TO AVOID ERRORS
    async getSurvivorTable(poolId) {
        try {
            // Get pool members
            const poolDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/pools/${poolId}/metadata/members`));
            if (!poolDoc.exists()) return [];
            
            const poolMembers = poolDoc.data();
            const results = [];

            // Process all users in the pool
            for (const [uid, member] of Object.entries(poolMembers)) {
                // Calculate status directly (no caching)
                const status = await this.calculateUserStatus(uid, member);
                results.push(status);
            }

            return results;

        } catch (error) {
            return [];
        }
    }

    // Enhanced user status calculation with elimination tracking
    async calculateUserStatus(uid, member) {
        try {
            // Get all user's picks across all weeks
            const picksDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`));
            const allPicks = picksDoc.exists() ? picksDoc.data().picks || {} : {};
            
            // Track elimination across all weeks
            let eliminationWeek = null;
            let eliminationDetails = null;
            let eliminationTeam = null;
            let weeksActive = 0;
            
            // Check each week from 1 to current week for elimination
            for (let week = 1; week <= this.currentWeek; week++) {
                const weekPick = allPicks[week];
                
                if (!weekPick || !weekPick.team) {
                    // No pick = immediate elimination
                    if (!eliminationWeek) {
                        eliminationWeek = week;
                        eliminationDetails = 'No pick submitted';
                        eliminationTeam = 'No pick';
                    }
                    break; // Stop checking further weeks
                }
                
                // Get game result for this week's pick
                const gameResult = await this.getTeamResultForWeek(weekPick.team, week);
                
                if (gameResult && gameResult.winner !== 'TBD') {
                    // Game finished - check if they lost
                    const normalizedTeam = this.normalizeTeamName(weekPick.team);
                    const normalizedWinner = this.normalizeTeamName(gameResult.winner);
                    
                    if (normalizedWinner !== normalizedTeam) {
                        // They lost - eliminated this week
                        if (!eliminationWeek) {
                            eliminationWeek = week;
                            eliminationDetails = `${weekPick.team} lost to ${gameResult.winner}`;
                            eliminationTeam = weekPick.team;
                        }
                        break; // Stop checking further weeks
                    } else {
                        // They won this week
                        weeksActive++;
                    }
                } else {
                    // Game not finished or no result - assume still active for this week
                    weeksActive++;
                }
            }
            
            // Get current week's pick for display
            const currentWeekPick = allPicks[this.currentWeek];
            const currentTeamPicked = currentWeekPick ? currentWeekPick.team : 'No pick';
            
            // Determine current status
            let status, reason;
            if (eliminationWeek) {
                status = 'eliminated';
                reason = eliminationDetails;
            } else if (!currentWeekPick || !currentWeekPick.team) {
                status = 'eliminated';
                reason = 'No pick made';
                eliminationWeek = this.currentWeek;
                eliminationDetails = 'No pick submitted';
            } else {
                // Still active - check current week game
                const currentGameResult = await this.getTeamResultForWeek(currentWeekPick.team, this.currentWeek);
                
                if (!currentGameResult) {
                    status = 'not_started';
                    reason = 'Game not started';
                } else if (currentGameResult.winner === 'TBD') {
                    status = 'not_started';
                    reason = 'Game in progress';
                } else {
                    const normalizedTeam = this.normalizeTeamName(currentWeekPick.team);
                    const normalizedWinner = this.normalizeTeamName(currentGameResult.winner);
                    
                    if (normalizedWinner === normalizedTeam) {
                        status = 'won';
                        reason = `${currentWeekPick.team} won`;
                    } else {
                        status = 'lost';
                        reason = `${currentWeekPick.team} lost to ${currentGameResult.winner}`;
                    }
                }
            }

            return {
                uid,
                displayName: member.displayName || member.email,
                teamPicked: currentTeamPicked,
                status,
                reason,
                week: this.currentWeek,
                eliminationWeek,
                eliminationDetails, 
                eliminationTeam,
                weeksActive,
                cached: false
            };

        } catch (error) {
            return {
                uid,
                displayName: member.displayName || member.email,
                teamPicked: 'Error',
                status: 'error',
                reason: 'Calculation failed',
                week: this.currentWeek,
                eliminationWeek: null,
                eliminationDetails: null,
                eliminationTeam: null,
                weeksActive: 0,
                cached: false
            };
        }
    }

    // Get team result for specific week
    async getTeamResultForWeek(teamName, weekNumber) {
        try {
            // Normalize team name before lookup
            const normalizedTeam = this.normalizeTeamName(teamName);
            
            // Use ESPN API if available
            if (typeof window.espnNerdApi !== 'undefined') {
                const espnData = await window.espnNerdApi.getWeekScores(weekNumber);
                if (espnData && espnData.games) {
                    // Find game where this team participated (home or away)
                    const game = espnData.games.find(g => 
                        this.normalizeTeamName(g.home_team) === normalizedTeam || 
                        this.normalizeTeamName(g.away_team) === normalizedTeam
                    );
                    
                    if (game) {
                        return {
                            winner: game.winner || 'TBD',
                            homeScore: game.home_score || 0,
                            awayScore: game.away_score || 0,
                            homeTeam: game.home_team,
                            awayTeam: game.away_team,
                            status: game.status,
                            week: weekNumber
                        };
                    }
                }
            }
            
            return null;
        } catch (error) {
            return null;
        }
    }

    // Get team result from ESPN data (current week - kept for compatibility)
    async getTeamResult(teamName) {
        return this.getTeamResultForWeek(teamName, this.currentWeek);
    }

    // Team name normalization (matches ESPN API style)
    normalizeTeamName(teamName) {
        if (!teamName) return null;
        
        // Team name mapping for consistency with ESPN data
        const teamMappings = {
            'LA Rams': 'Los Angeles Rams',
            'LA Chargers': 'Los Angeles Chargers', 
            'LV Raiders': 'Las Vegas Raiders',
            'Vegas Raiders': 'Las Vegas Raiders',
            'NY Giants': 'New York Giants',
            'NY Jets': 'New York Jets',
            'TB Buccaneers': 'Tampa Bay Buccaneers',
            'NE Patriots': 'New England Patriots',
            'GB Packers': 'Green Bay Packers',
            'NO Saints': 'New Orleans Saints',
            'KC Chiefs': 'Kansas City Chiefs',
            'SF 49ers': 'San Francisco 49ers'
        };
        
        return teamMappings[teamName] || teamName;
    }

    // Get cached user status - DISABLED due to Firebase path issues
    async getCachedUserStatus(uid) {
        // Skip caching for now to avoid Firebase document path errors
        return null;
    }

    // Cache user status - DISABLED due to Firebase path issues  
    async cacheUserStatus(uid, status) {
        // Skip caching for now to avoid Firebase document path errors
        return;
    }

    // Clear cache for a specific week (when results change)
    async clearWeekCache(week) {
        try {
            // This would delete the entire cache collection for the week
            // Implementation depends on Firebase batch delete
        } catch (error) {
            // Silent fail
        }
    }

    // Generate simple HTML table
    generateTable(results) {
        if (!results || results.length === 0) {
            return '<p class="text-gray-500 text-center py-8">No users found.</p>';
        }

        const rows = results.map(user => {
            const statusClass = {
                'won': 'text-green-700 bg-green-100',
                'lost': 'text-red-700 bg-red-100', 
                'not_started': 'text-gray-700 bg-gray-100',
                'eliminated': 'text-red-700 bg-red-100',
                'error': 'text-orange-700 bg-orange-100'
            };

            const statusText = {
                'won': 'Won',
                'lost': 'Lost',
                'not_started': 'Not Started', 
                'eliminated': 'Eliminated',
                'error': 'Error'
            };

            // Format elimination info
            const eliminationWeekDisplay = user.eliminationWeek ? `Week ${user.eliminationWeek}` : '-';
            const eliminationDetailsDisplay = user.eliminationDetails || '-';
            const weeksActiveDisplay = user.weeksActive || 0;

            return `
                <tr class="border-b border-gray-200 ${user.status === 'eliminated' ? 'bg-red-50' : ''}">
                    <td class="px-4 py-3 font-medium">${user.displayName}</td>
                    <td class="px-4 py-3">${user.teamPicked}</td>
                    <td class="px-4 py-3">
                        <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusClass[user.status] || 'text-gray-700 bg-gray-100'}">
                            ${statusText[user.status] || user.status}
                        </span>
                        ${user.cached ? '<span class="text-xs text-gray-400 ml-2">(cached)</span>' : ''}
                    </td>
                    <td class="px-4 py-3 text-sm ${user.eliminationWeek ? 'text-red-600 font-medium' : 'text-gray-400'}">${eliminationWeekDisplay}</td>
                    <td class="px-4 py-3 text-sm ${user.eliminationDetails ? 'text-red-600' : 'text-gray-400'}">${eliminationDetailsDisplay}</td>
                    <td class="px-4 py-3 text-sm text-gray-600 text-center">${weeksActiveDisplay}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Pick</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Eliminated Week</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Elimination Details</th>
                            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Weeks Survived</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    }
}

// Global initialization
window.simpleSurvivorSystem = null;

async function initializeSimpleSurvivor() {
    if (typeof window.db === 'undefined') {
        setTimeout(initializeSimpleSurvivor, 500);
        return;
    }

    window.simpleSurvivorSystem = new SimpleSurvivorSystem(window.db);
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSimpleSurvivor);
} else {
    initializeSimpleSurvivor();
}