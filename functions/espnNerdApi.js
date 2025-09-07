const functions = require('firebase-functions');
const admin = require('firebase-admin');

class EspnNerdApi {
    constructor() {
        this.BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
        this.RATE_LIMIT = {
            requests: 0,
            resetTime: Date.now() + (60 * 60 * 1000) // 1 hour from now
        };
        this.MAX_REQUESTS_PER_HOUR = 900; // Conservative limit
        this.CACHE_DURATION = {
            LIVE_GAMES: 30 * 1000,    // 30 seconds during live games
            PRE_GAME: 60 * 60 * 1000, // 1 hour before games start
            COMPLETED: Infinity        // Never expire completed games
        };
    }

    // Rate limiting check
    canMakeRequest() {
        const now = Date.now();
        if (now > this.RATE_LIMIT.resetTime) {
            // Reset rate limit counter
            this.RATE_LIMIT.requests = 0;
            this.RATE_LIMIT.resetTime = now + (60 * 60 * 1000);
        }
        return this.RATE_LIMIT.requests < this.MAX_REQUESTS_PER_HOUR;
    }

    // Increment rate limit counter
    incrementRateLimit() {
        this.RATE_LIMIT.requests++;
    }

    // Robust HTTP request with retries and error handling
    async makeRequest(endpoint, maxRetries = 3) {
        if (!this.canMakeRequest()) {
            throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }

        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.incrementRateLimit();
                
                const response = await fetch(`${this.BASE_URL}${endpoint}`, {
                    headers: {
                        'User-Agent': 'NerdFootball/1.0 (Contact: admin@nerdfootball.com)',
                        'Accept': 'application/json'
                    },
                    timeout: 10000 // 10 second timeout
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log(`ESPN API Success: ${endpoint} (Attempt ${attempt})`);
                return data;

            } catch (error) {
                lastError = error;
                console.warn(`ESPN API Attempt ${attempt}/${maxRetries} failed:`, error.message);
                
                if (attempt < maxRetries) {
                    // Exponential backoff
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw new Error(`ESPN API request failed after ${maxRetries} attempts: ${lastError.message}`);
    }

    // Get current NFL week
    getCurrentWeek() {
        const now = new Date();
        const seasonStart = new Date('2025-09-04'); // NFL Season start
        const weekMs = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
        
        if (now < seasonStart) return 1;
        
        const weeksDiff = Math.floor((now - seasonStart) / weekMs) + 1;
        return Math.min(Math.max(weeksDiff, 1), 18); // Clamp between 1 and 18
    }

    // Normalize ESPN team name to NerdFootball format
    normalizeTeamName(espnTeam) {
        const teamMap = {
            'Arizona Cardinals': 'Arizona Cardinals',
            'Atlanta Falcons': 'Atlanta Falcons',
            'Baltimore Ravens': 'Baltimore Ravens',
            'Buffalo Bills': 'Buffalo Bills',
            'Carolina Panthers': 'Carolina Panthers',
            'Chicago Bears': 'Chicago Bears',
            'Cincinnati Bengals': 'Cincinnati Bengals',
            'Cleveland Browns': 'Cleveland Browns',
            'Dallas Cowboys': 'Dallas Cowboys',
            'Denver Broncos': 'Denver Broncos',
            'Detroit Lions': 'Detroit Lions',
            'Green Bay Packers': 'Green Bay Packers',
            'Houston Texans': 'Houston Texans',
            'Indianapolis Colts': 'Indianapolis Colts',
            'Jacksonville Jaguars': 'Jacksonville Jaguars',
            'Kansas City Chiefs': 'Kansas City Chiefs',
            'Las Vegas Raiders': 'Las Vegas Raiders',
            'Los Angeles Chargers': 'Los Angeles Chargers',
            'Los Angeles Rams': 'Los Angeles Rams',
            'Miami Dolphins': 'Miami Dolphins',
            'Minnesota Vikings': 'Minnesota Vikings',
            'New England Patriots': 'New England Patriots',
            'New Orleans Saints': 'New Orleans Saints',
            'New York Giants': 'New York Giants',
            'New York Jets': 'New York Jets',
            'Philadelphia Eagles': 'Philadelphia Eagles',
            'Pittsburgh Steelers': 'Pittsburgh Steelers',
            'San Francisco 49ers': 'San Francisco 49ers',
            'Seattle Seahawks': 'Seattle Seahawks',
            'Tampa Bay Buccaneers': 'Tampa Bay Buccaneers',
            'Tennessee Titans': 'Tennessee Titans',
            'Washington Commanders': 'Washington Commanders'
        };

        return teamMap[espnTeam?.displayName] || espnTeam?.displayName || 'Unknown Team';
    }

    // Transform ESPN game data to NerdFootball format
    transformGameData(espnGame, baseId = 0) {
        const homeTeam = this.normalizeTeamName(espnGame.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team);
        const awayTeam = this.normalizeTeamName(espnGame.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team);
        
        const competition = espnGame.competitions?.[0];
        const venue = competition?.venue;
        const stadium = venue ? `${venue.fullName}` : 'TBD';
        
        // Game status and scoring
        const status = competition?.status?.type?.name || 'STATUS_SCHEDULED';
        const isCompleted = status === 'STATUS_FINAL';
        const homeScore = competition?.competitors?.find(c => c.homeAway === 'home')?.score || '0';
        const awayScore = competition?.competitors?.find(c => c.homeAway === 'away')?.score || '0';
        
        let winner = 'TBD';
        if (isCompleted) {
            const homeScoreNum = parseInt(homeScore);
            const awayScoreNum = parseInt(awayScore);
            if (homeScoreNum > awayScoreNum) {
                winner = homeTeam;
            } else if (awayScoreNum > homeScoreNum) {
                winner = awayTeam;
            } else {
                winner = 'TIE';
            }
        }

        return {
            id: baseId + parseInt(espnGame.id.slice(-2)), // Use last 2 digits of ESPN ID
            a: awayTeam,
            h: homeTeam,
            dt: espnGame.date,
            stadium: stadium,
            espnId: espnGame.id,
            status: status,
            homeScore: homeScore,
            awayScore: awayScore,
            winner: winner,
            lastUpdated: new Date().toISOString()
        };
    }

    // Fetch games for a specific date or week
    async fetchGames(date = null, week = null) {
        try {
            let endpoint = '/scoreboard';
            
            if (date) {
                // Format: YYYY-MM-DD
                endpoint += `?dates=${date}`;
            } else if (week) {
                // Calculate dates for the week
                const weekDates = this.getWeekDates(week);
                endpoint += `?dates=${weekDates.start}`;
            }

            const data = await this.makeRequest(endpoint);
            
            if (!data.events || !Array.isArray(data.events)) {
                console.warn('No events found in ESPN response');
                return [];
            }

            const baseId = week ? (week * 100) : 0;
            return data.events.map(game => this.transformGameData(game, baseId));

        } catch (error) {
            console.error('Error fetching games from ESPN:', error);
            throw error;
        }
    }

    // Get date range for a specific NFL week
    getWeekDates(week) {
        const seasonStart = new Date('2025-09-04'); // First Thursday of 2025 season
        const weekOffset = (week - 1) * 7;
        const weekStart = new Date(seasonStart.getTime() + (weekOffset * 24 * 60 * 60 * 1000));
        
        // Format as YYYY-MM-DD
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        return {
            start: formatDate(weekStart),
            end: formatDate(new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000)))
        };
    }

    // Fetch all NFL teams
    async fetchTeams() {
        try {
            const data = await this.makeRequest('/teams');
            
            if (!data.sports?.[0]?.leagues?.[0]?.teams) {
                throw new Error('No teams data found in ESPN response');
            }

            return data.sports[0].leagues[0].teams.map(teamData => ({
                id: teamData.team.id,
                name: this.normalizeTeamName(teamData.team),
                displayName: teamData.team.displayName,
                abbreviation: teamData.team.abbreviation,
                color: teamData.team.color,
                alternateColor: teamData.team.alternateColor,
                logo: teamData.team.logos?.[0]?.href,
                lastUpdated: new Date().toISOString()
            }));

        } catch (error) {
            console.error('Error fetching teams from ESPN:', error);
            throw error;
        }
    }

    // Fetch current season schedule
    async fetchSeasonSchedule() {
        try {
            const schedule = {
                year: 2025,
                weeks: [],
                lastUpdated: new Date().toISOString()
            };

            for (let week = 1; week <= 18; week++) {
                console.log(`Fetching Week ${week}...`);
                
                try {
                    const games = await this.fetchGames(null, week);
                    schedule.weeks.push({
                        week: week,
                        games: games
                    });
                    
                    // Add delay to respect rate limits
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error(`Error fetching Week ${week}:`, error);
                    // Continue with next week rather than failing completely
                }
            }

            return schedule;

        } catch (error) {
            console.error('Error fetching season schedule:', error);
            throw error;
        }
    }

    // Store data to Firestore
    async storeScheduleData(scheduleData) {
        try {
            const db = admin.firestore();
            const docRef = db.collection('artifacts').doc('nerdfootball').collection('espn').doc('schedule_2025');
            
            await docRef.set(scheduleData, { merge: true });
            console.log('Schedule data stored to Firestore successfully');
            
            return { success: true, message: 'Schedule data stored successfully' };

        } catch (error) {
            console.error('Error storing schedule data:', error);
            throw error;
        }
    }

    // Get cached data or fetch fresh data
    async getCachedOrFetch(cacheKey, fetchFunction, cacheDuration = this.CACHE_DURATION.PRE_GAME) {
        try {
            const db = admin.firestore();
            const cacheRef = db.collection('cache').doc(cacheKey);
            const cacheDoc = await cacheRef.get();
            
            if (cacheDoc.exists) {
                const cached = cacheDoc.data();
                const age = Date.now() - cached.timestamp;
                
                if (cacheDuration === Infinity || age < cacheDuration) {
                    console.log(`Cache hit for ${cacheKey}`);
                    return cached.data;
                }
            }
            
            // Cache miss or expired - fetch fresh data
            console.log(`Cache miss for ${cacheKey} - fetching fresh data`);
            const freshData = await fetchFunction();
            
            // Store in cache
            await cacheRef.set({
                data: freshData,
                timestamp: Date.now(),
                lastUpdated: new Date().toISOString()
            });
            
            return freshData;
            
        } catch (error) {
            console.error(`Error in getCachedOrFetch for ${cacheKey}:`, error);
            throw error;
        }
    }
}

// Firebase Cloud Functions
const espnApi = new EspnNerdApi();

// Fetch current week games
exports.fetchCurrentWeekGames = functions.https.onCall(async (data, context) => {
    try {
        const week = data.week || espnApi.getCurrentWeek();
        const games = await espnApi.getCachedOrFetch(
            `games_week_${week}`,
            () => espnApi.fetchGames(null, week),
            espnApi.CACHE_DURATION.PRE_GAME
        );
        
        return { success: true, data: games, week };
        
    } catch (error) {
        console.error('fetchCurrentWeekGames error:', error);
        return { success: false, error: error.message };
    }
});

// Fetch games for specific date
exports.fetchGamesByDate = functions.https.onCall(async (data, context) => {
    try {
        const date = data.date;
        if (!date) {
            throw new Error('Date parameter is required');
        }
        
        const games = await espnApi.getCachedOrFetch(
            `games_date_${date}`,
            () => espnApi.fetchGames(date),
            espnApi.CACHE_DURATION.PRE_GAME
        );
        
        return { success: true, data: games, date };
        
    } catch (error) {
        console.error('fetchGamesByDate error:', error);
        return { success: false, error: error.message };
    }
});

// Fetch all teams
exports.fetchNflTeams = functions.https.onCall(async (data, context) => {
    try {
        const teams = await espnApi.getCachedOrFetch(
            'nfl_teams',
            () => espnApi.fetchTeams(),
            24 * 60 * 60 * 1000 // 24 hours cache for teams
        );
        
        return { success: true, data: teams };
        
    } catch (error) {
        console.error('fetchNflTeams error:', error);
        return { success: false, error: error.message };
    }
});

// Fetch complete season schedule (Admin function)
exports.fetchSeasonSchedule = functions.https.onCall(async (data, context) => {
    try {
        // This is a heavy operation, should be admin-only
        if (!context.auth || !context.auth.token.admin) {
            throw new Error('Admin access required');
        }
        
        const schedule = await espnApi.fetchSeasonSchedule();
        await espnApi.storeScheduleData(schedule);
        
        return { success: true, message: 'Season schedule fetched and stored', gamesCount: schedule.weeks.reduce((acc, week) => acc + week.games.length, 0) };
        
    } catch (error) {
        console.error('fetchSeasonSchedule error:', error);
        return { success: false, error: error.message };
    }
});

// Get API status and diagnostics
exports.espnApiStatus = functions.https.onCall(async (data, context) => {
    return {
        success: true,
        status: 'online',
        rateLimitRemaining: espnApi.MAX_REQUESTS_PER_HOUR - espnApi.RATE_LIMIT.requests,
        rateLimitResetTime: new Date(espnApi.RATE_LIMIT.resetTime).toISOString(),
        currentWeek: espnApi.getCurrentWeek(),
        lastCheck: new Date().toISOString()
    };
});

// Scheduled function to update live games (runs every 30 seconds during game days)
exports.scheduledGameUpdates = functions.pubsub.schedule('*/30 * * * *').onRun(async (context) => {
    try {
        const currentWeek = espnApi.getCurrentWeek();
        const weekDates = espnApi.getWeekDates(currentWeek);
        const today = new Date().toISOString().split('T')[0];
        
        // Only run during game days (Thursday through Monday)
        const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
        const isGameDay = dayOfWeek === 0 || dayOfWeek === 1 || dayOfWeek === 4; // Sun, Mon, Thu
        
        if (!isGameDay) {
            console.log('Not a game day, skipping scheduled update');
            return null;
        }
        
        console.log(`Scheduled update for Week ${currentWeek} games`);
        
        // Fetch current day's games
        const games = await espnApi.fetchGames(today);
        
        // Check if any games are live
        const liveGames = games.filter(game => 
            game.status && !game.status.includes('FINAL') && !game.status.includes('SCHEDULED')
        );
        
        if (liveGames.length > 0) {
            console.log(`Found ${liveGames.length} live games, updating cache`);
            
            // Store with short cache duration for live games
            const db = admin.firestore();
            await db.collection('cache').doc(`games_week_${currentWeek}`).set({
                data: games,
                timestamp: Date.now(),
                lastUpdated: new Date().toISOString()
            });
        }
        
        return { success: true, gamesUpdated: games.length, liveGames: liveGames.length };
        
    } catch (error) {
        console.error('Scheduled game update error:', error);
        return { success: false, error: error.message };
    }
});

module.exports = { EspnNerdApi };