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
                
                const url = `${this.BASE_URL}${endpoint}`;
                console.log(`ESPN API Request: ${url}`);
                
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'NerdFootball/1.0 (Contact: admin@nerdfootball.com)',
                        'Accept': 'application/json'
                    },
                    timeout: 10000 // 10 second timeout
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`ESPN API Error Response: ${errorText}`);
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
        const seasonStart = new Date('2024-09-05'); // 2024 NFL Season started Sept 5
        const weekMs = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
        
        if (now < seasonStart) return 1;
        
        const weeksDiff = Math.floor((now - seasonStart) / weekMs) + 1;
        return Math.min(Math.max(weeksDiff, 1), 22); // Clamp between 1 and 22 (includes playoffs)
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

    // Transform ESPN game data to comprehensive NerdFootball format with ALL data points
    transformGameData(espnGame, baseId = 0) {
        const homeCompetitor = espnGame.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home');
        const awayCompetitor = espnGame.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away');
        const homeTeam = this.normalizeTeamName(homeCompetitor?.team);
        const awayTeam = this.normalizeTeamName(awayCompetitor?.team);
        
        const competition = espnGame.competitions?.[0];
        const venue = competition?.venue;
        const status = competition?.status?.type?.name || 'STATUS_SCHEDULED';
        const isCompleted = status === 'STATUS_FINAL';
        const homeScore = homeCompetitor?.score || '0';
        const awayScore = awayCompetitor?.score || '0';
        
        // Calculate winner
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

        // Extract enhanced data points
        const enhancedData = {
            // Basic game info
            id: baseId + parseInt(espnGame.id.slice(-2)),
            espnId: espnGame.id,
            name: espnGame.name || `${awayTeam} at ${homeTeam}`,
            shortName: espnGame.shortName || `${awayTeam} @ ${homeTeam}`,
            
            // Teams and scores
            a: awayTeam,
            h: homeTeam,
            dt: espnGame.date, // ESPN timestamp (Eastern Time with Z suffix - needs parsing)
            homeScore: homeScore,
            awayScore: awayScore,
            winner: winner,
            status: status,
            
            // 🎲 Quarter-by-Quarter Scores (linescores)
            quarterScores: {
                home: homeCompetitor?.linescores?.map(ls => ({
                    quarter: ls.period,
                    score: ls.value,
                    displayValue: ls.displayValue
                })) || [],
                away: awayCompetitor?.linescores?.map(ls => ({
                    quarter: ls.period,
                    score: ls.value,
                    displayValue: ls.displayValue
                })) || []
            },
            
            // 🏆 Team Records & Performance
            teamRecords: {
                home: homeCompetitor?.records?.map(r => ({
                    type: r.name || null,
                    category: r.type || null,
                    record: r.summary || null,
                    abbreviation: r.abbreviation || null
                })).filter(r => r.type || r.record) || [],
                away: awayCompetitor?.records?.map(r => ({
                    type: r.name || null,
                    category: r.type || null,
                    record: r.summary || null,
                    abbreviation: r.abbreviation || null
                })).filter(r => r.type || r.record) || []
            },
            
            // 🏟️ Enhanced Venue Information
            venue: {
                id: venue?.id || null,
                name: venue?.fullName || 'TBD',
                city: venue?.address?.city || null,
                state: venue?.address?.state || null,
                country: venue?.address?.country || 'USA',
                indoor: venue?.indoor || false,
                capacity: venue?.capacity || null,
                grass: venue?.grass || null
            },
            stadium: venue?.fullName || 'TBD', // Keep for backward compatibility
            
            // ⛈️ Weather Data
            weather: espnGame.weather ? {
                temperature: espnGame.weather.temperature || null,
                highTemperature: espnGame.weather.highTemperature || null,
                lowTemperature: espnGame.weather.lowTemperature || null,
                condition: espnGame.weather.conditionId || null,
                description: espnGame.weather.displayValue || null,
                humidity: espnGame.weather.humidity || null,
                windSpeed: espnGame.weather.windSpeed || null,
                windDirection: espnGame.weather.windDirection || null
            } : null,
            
            // 📺 Broadcast Information
            broadcasts: competition?.broadcasts?.map(b => ({
                network: b.names?.[0] || null,
                type: b.type?.shortName || null,
                market: b.market || null,
                lang: b.lang || null
            })).filter(b => b.network) || [],
            tv: competition?.broadcast || null, // Primary network
            
            // ⚡ Live Game Situation (for in-progress games)
            situation: competition?.situation ? {
                possession: competition.situation.possession || null,
                down: competition.situation.down || null,
                distance: competition.situation.distance || null,
                yardLine: competition.situation.yardLine || null,
                timeRemaining: competition.situation.clock?.displayValue || null,
                period: competition.situation.period || null,
                
                // 🎯 Win Probability (if available)
                probability: competition.situation.lastPlay?.probability ? {
                    homeWinPercentage: competition.situation.lastPlay.probability.homeWinPercentage || null,
                    awayWinPercentage: competition.situation.lastPlay.probability.awayWinPercentage || null,
                    tiePercentage: competition.situation.lastPlay.probability.tiePercentage || null
                } : null,
                
                lastPlay: competition.situation.lastPlay ? {
                    id: competition.situation.lastPlay.id || null,
                    type: competition.situation.lastPlay.type?.text || null,
                    text: competition.situation.lastPlay.text || null,
                    scoreValue: competition.situation.lastPlay.scoreValue || null,
                    yards: competition.situation.lastPlay.statYardage || null,
                    team: competition.situation.lastPlay.team?.displayName || null
                } : null
            } : null,
            
            // 📊 Game Format & Timing
            format: {
                periods: competition?.format?.regulation?.periods || 4,
                periodLength: competition?.format?.regulation?.minutesPerPeriod || 15,
                overtime: competition?.format?.overtime || null
            },
            
            // 🏆 Season Context
            season: {
                year: espnGame.season?.year || null,
                type: espnGame.season?.type || null,
                week: espnGame.week?.number || null
            },
            
            // 📈 Additional Metadata
            attendance: competition?.attendance || null,
            playByPlayAvailable: competition?.playByPlayAvailable || false,
            neutralSite: competition?.neutralSite || false,
            conferenceGame: competition?.conferenceCompetition || false,
            
            // ⏰ Timestamps
            lastUpdated: new Date().toISOString(),
            dataEnhanced: true // Flag to indicate this has full ESPN data
        };

        return enhancedData;
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
        const seasonStart = new Date('2024-09-05'); // First Thursday of 2024 season
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

    // Fetch all NFL teams with enhanced data
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
                location: teamData.team.location,
                color: teamData.team.color,
                alternateColor: teamData.team.alternateColor,
                logo: teamData.team.logos?.[0]?.href,
                logos: teamData.team.logos || [],
                isActive: teamData.team.isActive,
                venue: teamData.team.venue,
                lastUpdated: new Date().toISOString()
            }));

        } catch (error) {
            console.error('Error fetching teams from ESPN:', error);
            throw error;
        }
    }

    // Fetch NFL news articles
    async fetchNews(limit = 20) {
        try {
            const data = await this.makeRequest('/news');
            
            if (!data.articles) {
                throw new Error('No news articles found in ESPN response');
            }

            return data.articles.slice(0, limit).map(article => ({
                id: article.id,
                headline: article.headline,
                description: article.description,
                byline: article.byline,
                published: article.published,
                lastModified: article.lastModified,
                premium: article.premium || false,
                images: article.images?.map(img => ({
                    url: img.url,
                    width: img.width,
                    height: img.height,
                    alt: img.alt,
                    caption: img.caption
                })) || [],
                categories: article.categories || [],
                keywords: article.keywords || [],
                links: article.links || [],
                lastUpdated: new Date().toISOString()
            }));

        } catch (error) {
            console.error('Error fetching news from ESPN:', error);
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
        // If no week specified, fetch current ESPN scoreboard (no dates = current games)
        const week = data.week || espnApi.getCurrentWeek();
        
        const games = await espnApi.getCachedOrFetch(
            `games_current`,
            async () => {
                // Don't specify dates to get current/upcoming games from ESPN
                const endpoint = '/scoreboard';
                const espnData = await espnApi.makeRequest(endpoint);
                
                if (!espnData.events || !Array.isArray(espnData.events)) {
                    console.warn('No events found in ESPN response');
                    return [];
                }
                
                return espnData.events.map(game => espnApi.transformGameData(game, week * 100));
            },
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

// Fetch NFL news
exports.fetchNflNews = functions.https.onCall(async (data, context) => {
    try {
        const limit = data.limit || 20;
        
        const news = await espnApi.getCachedOrFetch(
            `nfl_news_${limit}`,
            () => espnApi.fetchNews(limit),
            2 * 60 * 60 * 1000 // 2 hours cache for news
        );
        
        return { success: true, data: news, count: news.length };
        
    } catch (error) {
        console.error('fetchNflNews error:', error);
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
        lastCheck: new Date().toISOString(),
        enhancedDataEnabled: true // Flag for new comprehensive data
    };
});

// Scheduled function to update live games (runs every 30 seconds during game days)
// TODO: Re-enable when scheduler API is available
/*exports.scheduledGameUpdates = functions.pubsub.schedule('every 30 minutes').onRun(async (context) => {
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
});*/

// Export class for direct usage
module.exports.EspnNerdApi = EspnNerdApi;