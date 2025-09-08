// SIMPLE SURVIVOR SYSTEM - Fast & Reliable
// Shows: User | Team Picked | Status (Won/Lost/Not Started)

class SimpleSurvivorSystem {
    constructor(db) {
        this.db = db;
        this.currentWeek = 1;
    }

    // Get simple survivor table data - NO CACHING TO AVOID ERRORS
    async getSurvivorTable(poolId) {
        try {
            // Get pool members
            const poolDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/pools/${poolId}/metadata/members`));
            if (!poolDoc.exists()) return [];
            
            const poolMembers = poolDoc.data();
            const results = [];

            // Process first 10 users only to avoid spam
            let count = 0;
            for (const [uid, member] of Object.entries(poolMembers)) {
                if (count >= 10) break;
                
                // Calculate status directly (no caching)
                const status = await this.calculateUserStatus(uid, member);
                results.push(status);
                count++;
            }

            return results;

        } catch (error) {
            console.error('Error getting survivor table:', error);
            return [];
        }
    }

    // Calculate user status from scratch
    async calculateUserStatus(uid, member) {
        try {
            // Get user's pick for current week
            const picksDoc = await getDoc(doc(this.db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`));
            const picks = picksDoc.exists() ? picksDoc.data().picks || {} : {};
            const userPick = picks[this.currentWeek];

            if (!userPick || !userPick.team) {
                return {
                    uid,
                    displayName: member.displayName || member.email,
                    teamPicked: 'No pick',
                    status: 'eliminated',
                    reason: 'No pick made',
                    week: this.currentWeek,
                    cached: false
                };
            }

            // Get ESPN result for this team
            const gameResult = await this.getTeamResult(userPick.team);
            
            let status, reason;
            if (!gameResult) {
                status = 'not_started';
                reason = 'Game not started';
            } else if (gameResult.winner === 'TBD') {
                status = 'not_started';
                reason = 'Game in progress';
            } else if (gameResult.winner === userPick.team) {
                status = 'won';
                reason = `${userPick.team} won`;
            } else {
                status = 'lost';
                reason = `${userPick.team} lost to ${gameResult.winner}`;
            }

            return {
                uid,
                displayName: member.displayName || member.email,
                teamPicked: userPick.team,
                status,
                reason,
                week: this.currentWeek,
                cached: false
            };

        } catch (error) {
            console.error(`Error calculating status for ${uid}:`, error);
            return {
                uid,
                displayName: member.displayName || member.email,
                teamPicked: 'Error',
                status: 'error',
                reason: 'Calculation failed',
                week: this.currentWeek,
                cached: false
            };
        }
    }

    // Get team result from ESPN data
    async getTeamResult(teamName) {
        try {
            // Use ESPN API if available
            if (typeof window.espnNerdApi !== 'undefined') {
                const espnData = await window.espnNerdApi.getCurrentWeekScores();
                if (espnData && espnData.games) {
                    // Find game where this team won
                    const game = espnData.games.find(g => g.winner === teamName);
                    if (game) {
                        return {
                            winner: game.winner,
                            homeScore: game.home_score,
                            awayScore: game.away_score
                        };
                    }
                    
                    // If not found as winner, check if game exists but no winner yet
                    // This is simplified - just return TBD for now
                    return { winner: 'TBD' };
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error getting team result:', error);
            return null;
        }
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
            console.log(`Clearing cache for week ${week}`);
            // Implementation depends on Firebase batch delete
        } catch (error) {
            console.error('Error clearing cache:', error);
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

            return `
                <tr class="border-b border-gray-200">
                    <td class="px-4 py-3 font-medium">${user.displayName}</td>
                    <td class="px-4 py-3">${user.teamPicked}</td>
                    <td class="px-4 py-3">
                        <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusClass[user.status] || 'text-gray-700 bg-gray-100'}">
                            ${statusText[user.status] || user.status}
                        </span>
                        ${user.cached ? '<span class="text-xs text-gray-400 ml-2">(cached)</span>' : ''}
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Picked</th>
                            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
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
    console.log('✅ Simple Survivor System initialized');
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSimpleSurvivor);
} else {
    initializeSimpleSurvivor();
}