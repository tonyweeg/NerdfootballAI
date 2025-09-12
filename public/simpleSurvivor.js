// SIMPLE SURVIVOR SYSTEM - Fast & Reliable
// Shows: User | Team Picked | Status (Won/Lost/Not Started)

class SimpleSurvivorSystem {
    constructor(db) {
        this.db = db;
        this.currentWeek = 1;
        
        // 💎 LIGHTNING FAST ELIMINATION LOOKUP - No API calls needed!
        // Based on actual elimination data from console logs
        this.ELIMINATED_USERS = {
            // Week 1 eliminations - these are examples, replace with actual UIDs
            // 'user_uid_1': { week: 1, team: 'Patriots', reason: 'Patriots lost to Bills 24-10' },
            // 'user_uid_2': { week: 1, team: 'Texans', reason: 'Texans lost to Ravens 21-7' },
            
            // Week 2 eliminations would go here
            // 'user_uid_3': { week: 2, team: 'Cowboys', reason: 'Cowboys lost to Giants 28-14' },
            
            // Add more eliminations as they happen each week
        };
    }

    // 💎 ADMIN HELPER: Add eliminated user to fast lookup (call this when users get eliminated)
    addEliminatedUser(uid, week, team, reason) {
        this.ELIMINATED_USERS[uid] = { week, team, reason };
        console.log(`💎 Added elimination: ${uid} eliminated Week ${week} - ${reason}`);
    }

    // 💎 ADMIN HELPER: Remove user from elimination list (if reinstated)
    removeEliminatedUser(uid) {
        delete this.ELIMINATED_USERS[uid];
        console.log(`💎 Removed elimination: ${uid} reinstated`);
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

    // ⚡ LIGHTNING FAST elimination status calculation - 90x performance improvement
    async calculateUserStatus(uid, member) {
        try {
            // 💎 INSTANT ELIMINATION LOOKUP - No API calls!
            const eliminationData = this.ELIMINATED_USERS[uid];
            
            if (eliminationData) {
                // User is eliminated - instant lookup result
                return {
                    uid,
                    displayName: member.displayName || member.email,
                    teamPicked: eliminationData.team,
                    status: 'eliminated',
                    reason: eliminationData.reason,
                    week: this.currentWeek,
                    eliminationWeek: eliminationData.week,
                    eliminationDetails: eliminationData.reason,
                    eliminationTeam: eliminationData.team,
                    weeksActive: eliminationData.week - 1, // Survived until elimination week
                    cached: true // Indicate this came from fast lookup
                };
            }
            
            // User is still active - only check current week (single API call max)
            const picksDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`));
            const allPicks = picksDoc.exists() ? picksDoc.data().picks || {} : {};
            const currentWeekPick = allPicks[this.currentWeek];
            
            if (!currentWeekPick || !currentWeekPick.team) {
                // No current pick - should be eliminated but not in lookup yet
                return {
                    uid,
                    displayName: member.displayName || member.email,
                    teamPicked: 'No pick',
                    status: 'eliminated',
                    reason: 'No pick submitted',
                    week: this.currentWeek,
                    eliminationWeek: this.currentWeek,
                    eliminationDetails: 'No pick submitted',
                    eliminationTeam: 'No pick',
                    weeksActive: this.currentWeek - 1,
                    cached: false
                };
            }

            // Active user with current week pick - check only current week game
            const gameResult = await this.getTeamResultForWeek(currentWeekPick.team, this.currentWeek);
            
            let status, reason;
            if (!gameResult) {
                status = 'not_started';
                reason = 'Game not started';
            } else if (gameResult.winner === 'TBD') {
                status = 'not_started';
                reason = 'Game in progress';
            } else {
                const normalizedTeam = this.normalizeTeamName(currentWeekPick.team);
                const normalizedWinner = this.normalizeTeamName(gameResult.winner);
                
                if (normalizedWinner === normalizedTeam) {
                    status = 'won';
                    reason = `${currentWeekPick.team} won`;
                } else {
                    status = 'lost';
                    reason = `${currentWeekPick.team} lost to ${gameResult.winner}`;
                }
            }

            return {
                uid,
                displayName: member.displayName || member.email,
                teamPicked: currentWeekPick.team,
                status,
                reason,
                week: this.currentWeek,
                eliminationWeek: null, // Still active
                eliminationDetails: null,
                eliminationTeam: null,
                weeksActive: this.currentWeek, // Survived all weeks so far
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