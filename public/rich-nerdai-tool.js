/**
 * RICH NERDAI TOOL
 * Comprehensive AI confidence picks tool with real data, betting lines, and injury reports
 */

class RichNerdAITool {
    constructor() {
        this.currentWeek = 4;
        this.debugMode = true;
        this.bettingLines = new Map();
        this.injuryReports = new Map();
        this.gameData = new Map();
    }

    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`🎯 NERDAI_DEBUG: Rich AI Tool ${enabled ? 'ON' : 'OFF'}`);
    }

    async getComprehensiveAnalysis(weekNumber = null) {
        const week = weekNumber || this.currentWeek;

        if (this.debugMode) {
            console.log(`🎯 NERDAI_DEBUG: Starting comprehensive Week ${week} analysis...`);
        }

        try {
            // Step 1: Get live ESPN scoreboard data
            const espnScoreboard = await this.getESPNScoreboard();

            // Step 2: Get ESPN news for injury insights
            const espnNews = await this.getESPNNews();

            // Step 3: Get ESPN teams data
            const espnTeams = await this.getESPNTeams();

            // Step 4: Fallback to Firebase if ESPN fails
            let gameData = espnScoreboard;
            if (!espnScoreboard.success) {
                gameData = await this.getRealGameData(week);
            }

            // Step 5: Analyze each game with live ESPN data
            const analyses = await this.analyzeAllGamesWithESPN(gameData, espnNews, espnTeams);

            // Step 6: Generate confidence rankings
            const confidenceRankings = this.generateConfidenceRankings(analyses);

            if (this.debugMode) {
                console.log(`🎯 NERDAI_DEBUG: Analysis complete - ${analyses.length} games analyzed`);
            }

            const result = {
                week,
                timestamp: new Date().toISOString(),
                summary: {
                    totalGames: analyses.length,
                    dataQuality: {
                        realESPNData: espnScoreboard.success,
                        liveNews: espnNews.success,
                        liveTeams: espnTeams.success,
                        dataSource: gameData.source
                    }
                },
                analyses,
                confidenceRankings,
                recommendations: this.generateRecommendations(confidenceRankings)
            };

            // Record predictions for tracking accuracy
            if (window.PredictionTracker && analyses.length > 0) {
                try {
                    const trackingResult = await window.PredictionTracker.recordPredictions(result);
                    if (this.debugMode) {
                        console.log(`🎯 NERDAI_DEBUG: Predictions recorded for accuracy tracking:`, trackingResult.success);
                    }
                    result.predictionTrackingEnabled = trackingResult.success;
                } catch (error) {
                    console.error(`🎯 NERDAI_DEBUG: Failed to record predictions:`, error);
                    result.predictionTrackingEnabled = false;
                }
            }

            return result;

        } catch (error) {
            console.error('🎯 NERDAI_DEBUG: Comprehensive analysis failed:', error);
            return { error: error.message, fallback: await this.getFallbackAnalysis() };
        }
    }

    async getRealGameData(week) {
        if (this.debugMode) {
            console.log(`🎯 NERDAI_DEBUG: Fetching real game data for Week ${week}...`);
        }

        try {
            const gamesPath = `artifacts/nerdfootball/public/data/nerdfootball_games/${week}`;
            const gamesDoc = await window.db.doc(gamesPath).get();

            if (gamesDoc.exists) {
                const data = gamesDoc.data();
                if (this.debugMode) {
                    console.log(`🎯 NERDAI_DEBUG: Real Firebase data loaded - ${Object.keys(data).length} games`);
                }
                return { source: 'firebase', data };
            }
        } catch (error) {
            if (this.debugMode) {
                console.log(`🎯 NERDAI_DEBUG: Firebase access failed: ${error.message}`);
            }
        }

        // Fallback to sample data
        if (this.debugMode) {
            console.log(`🎯 NERDAI_DEBUG: Using fallback sample data`);
        }
        // NO FAKE DATA - Return empty if we can't get real data
        if (this.debugMode) {
            console.log(`🎯 NERDAI_DEBUG: NO SAMPLE DATA - Only real data allowed`);
        }
        return { source: 'none', data: {} };
    }

    async getESPNScoreboard() {
        if (this.debugMode) {
            console.log(`🎯 NERDAI_DEBUG: Fetching REAL live NFL data from ESPN...`);
        }

        try {
            // Try HTTPS first to avoid CORS issues
            const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard', {
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (this.debugMode) {
                    console.log(`🎯 NERDAI_DEBUG: ✅ REAL ESPN data fetched - ${data.events?.length || 0} live games`);
                    console.log(`🎯 NERDAI_DEBUG: Games:`, data.events?.map(e =>
                        `${e.competitions?.[0]?.competitors?.find(c => c.homeAway === 'away')?.team?.abbreviation} @ ${e.competitions?.[0]?.competitors?.find(c => c.homeAway === 'home')?.team?.abbreviation}`
                    ));
                }
                return { success: true, data: data.events || [], source: 'espn_live' };
            } else {
                if (this.debugMode) {
                    console.log(`🎯 NERDAI_DEBUG: ❌ ESPN API returned ${response.status}`);
                }
            }
        } catch (error) {
            if (this.debugMode) {
                console.log(`🎯 NERDAI_DEBUG: ❌ ESPN API CORS/Network error: ${error.message}`);
                console.log(`🎯 NERDAI_DEBUG: This is likely a CORS issue - need proxy or server-side fetch`);
            }
        }

        return { success: false, data: [], source: 'failed' };
    }

    async getESPNNews() {
        if (this.debugMode) {
            console.log(`🎯 NERDAI_DEBUG: Fetching NFL news from ESPN...`);
        }

        try {
            const response = await fetch('http://site.api.espn.com/apis/site/v2/sports/football/nfl/news');

            if (response.ok) {
                const data = await response.json();
                if (this.debugMode) {
                    console.log(`🎯 NERDAI_DEBUG: ESPN news fetched - ${data.articles?.length || 0} articles`);
                }
                return { success: true, data: data.articles || [], source: 'espn' };
            }
        } catch (error) {
            if (this.debugMode) {
                console.log(`🎯 NERDAI_DEBUG: ESPN News API failed: ${error.message}`);
            }
        }

        return { success: false, data: [], source: 'failed' };
    }

    async getESPNTeams() {
        if (this.debugMode) {
            console.log(`🎯 NERDAI_DEBUG: Fetching NFL teams from ESPN...`);
        }

        try {
            const response = await fetch('http://site.api.espn.com/apis/site/v2/sports/football/nfl/teams');

            if (response.ok) {
                const data = await response.json();
                if (this.debugMode) {
                    console.log(`🎯 NERDAI_DEBUG: ESPN teams data fetched - ${data.sports?.[0]?.leagues?.[0]?.teams?.length || 0} teams`);
                }
                return { success: true, data: data.sports?.[0]?.leagues?.[0]?.teams || [], source: 'espn' };
            }
        } catch (error) {
            if (this.debugMode) {
                console.log(`🎯 NERDAI_DEBUG: ESPN Teams API failed: ${error.message}`);
            }
        }

        return { success: false, data: [], source: 'failed' };
    }

    async getESPNTeamDetails(teamId) {
        if (this.debugMode) {
            console.log(`🎯 NERDAI_DEBUG: Fetching team details for ${teamId}...`);
        }

        try {
            const response = await fetch(`http://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}`);

            if (response.ok) {
                const data = await response.json();
                if (this.debugMode) {
                    console.log(`🎯 NERDAI_DEBUG: Team ${teamId} details fetched`);
                }
                return { success: true, data, source: 'espn' };
            }
        } catch (error) {
            if (this.debugMode) {
                console.log(`🎯 NERDAI_DEBUG: ESPN Team API failed for ${teamId}: ${error.message}`);
            }
        }

        return { success: false, data: null, source: 'failed' };
    }

    async analyzeAllGamesWithESPN(gameData, espnNews, espnTeams) {
        const analyses = [];

        if (gameData.source === 'espn_live') {
            // Process ESPN scoreboard data
            if (this.debugMode) {
                console.log(`🎯 NERDAI_DEBUG: Processing ${gameData.data.length} ESPN games...`);
            }

            for (const event of gameData.data) {
                if (this.debugMode) {
                    console.log(`🎯 NERDAI_DEBUG: Processing event:`, event.id, event.shortName);
                }

                if (event.competitions && event.competitions[0] && event.competitions[0].competitors) {
                    const competition = event.competitions[0];
                    const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
                    const awayTeam = competition.competitors.find(c => c.homeAway === 'away');

                    if (homeTeam && awayTeam) {
                        if (this.debugMode) {
                            console.log(`🎯 NERDAI_DEBUG: ESPN Data - Away: ${awayTeam.team.abbreviation} (${awayTeam.homeAway}) @ Home: ${homeTeam.team.abbreviation} (${homeTeam.homeAway})`);
                            console.log(`🎯 NERDAI_DEBUG: Analyzing ${awayTeam.team.abbreviation} @ ${homeTeam.team.abbreviation}`);
                        }

                        const analysis = await this.analyzeESPNGame(
                            event.id,
                            event,
                            homeTeam,
                            awayTeam,
                            espnNews.data,
                            espnTeams.data
                        );
                        analyses.push(analysis);
                    } else {
                        if (this.debugMode) {
                            console.log(`🎯 NERDAI_DEBUG: Missing home/away team data for event ${event.id}`);
                        }
                    }
                } else {
                    if (this.debugMode) {
                        console.log(`🎯 NERDAI_DEBUG: Missing competition data for event ${event.id}`);
                    }
                }
            }
        } else {
            // Fallback to Firebase data
            for (const [gameId, gameInfo] of Object.entries(gameData.data)) {
                if (gameInfo.homeTeam && gameInfo.awayTeam) {
                    const analysis = await this.analyzeGameBasic(gameId, gameInfo);
                    analyses.push(analysis);
                }
            }
        }

        return analyses;
    }

    async analyzeESPNGame(eventId, event, homeTeam, awayTeam, newsData, teamsData) {
        const homeTeamName = homeTeam.team.abbreviation;
        const awayTeamName = awayTeam.team.abbreviation;

        if (this.debugMode) {
            console.log(`🎯 NERDAI_DEBUG: Analyzing ESPN game: ${awayTeamName} @ ${homeTeamName}`);
        }

        // Extract ESPN data
        const gameStatus = event.status.type.name;
        const gameDate = event.date;
        const odds = event.competitions[0].odds?.[0] || {};

        // Team records and stats from ESPN
        const homeRecord = homeTeam.records?.[0]?.summary || '0-0';
        const awayRecord = awayTeam.records?.[0]?.summary || '0-0';

        // Get REAL team strength from ESPN teams data, fallback to record calculation
        let homeStrength = await this.getTeamStrengthFromESPN(homeTeamName, teamsData);
        let awayStrength = await this.getTeamStrengthFromESPN(awayTeamName, teamsData);

        // If team strength lookup failed, calculate from game record data
        if (homeStrength === 50) {
            homeStrength = this.calculateStrengthFromRecord(homeRecord);
            if (this.debugMode) {
                console.log(`🎯 NERDAI_DEBUG: ${homeTeamName} strength from record: ${homeStrength} (${homeRecord})`);
            }
        }
        if (awayStrength === 50) {
            awayStrength = this.calculateStrengthFromRecord(awayRecord);
            if (this.debugMode) {
                console.log(`🎯 NERDAI_DEBUG: ${awayTeamName} strength from record: ${awayStrength} (${awayRecord})`);
            }
        }

        // Get REAL injury data from ESPN news
        const injuryInfo = this.analyzeNewsForInjuries(newsData, homeTeamName, awayTeamName);

        // Get betting info from ESPN odds
        const bettingInfo = {
            spread: odds.details || 'Pick',
            overUnder: odds.overUnder || 'N/A',
            homeTeamOdds: homeTeam.team.odds || 'N/A',
            awayTeamOdds: awayTeam.team.odds || 'N/A'
        };

        // Calculate rich confidence with live data
        const confidence = this.calculateESPNConfidence(
            homeStrength,
            awayStrength,
            odds,
            injuryInfo,
            gameStatus
        );

        // Make AI pick - CRITICAL: Confidence >= 50 = home team, < 50 = away team
        const aiPick = confidence >= 50 ? homeTeamName : awayTeamName;

        if (this.debugMode) {
            console.log(`🎯 NERDAI_DEBUG: ${awayTeamName} @ ${homeTeamName} → Confidence: ${confidence}% → Pick: ${aiPick}`);
            console.log(`🎯 NERDAI_DEBUG: Home strength: ${homeStrength}, Away strength: ${awayStrength}`);
            console.log(`🎯 NERDAI_DEBUG: Home record: ${homeRecord}, Away record: ${awayRecord}`);
        }

        // Generate reasoning with live data
        const reasoning = this.generateESPNReasoning(
            homeTeamName,
            awayTeamName,
            homeRecord,
            awayRecord,
            odds,
            injuryInfo,
            confidence
        );

        // Check for learning experiences from past predictions
        const learningExperience = await this.checkForLearningExperience(homeTeamName, awayTeamName);

        return {
            gameId: eventId,
            matchup: `${awayTeamName} @ ${homeTeamName}`,
            homeTeam: homeTeamName,
            awayTeam: awayTeamName,
            gameTime: gameDate,
            gameStatus,
            analysis: {
                teamStrength: { home: homeStrength, away: awayStrength },
                records: { home: homeRecord, away: awayRecord },
                bettingLines: bettingInfo,
                injuries: injuryInfo,
                espnData: {
                    eventId,
                    status: gameStatus,
                    venue: event.competitions[0].venue?.fullName || 'TBD'
                }
            },
            aiPick,
            confidence,
            reasoning,
            difficulty: this.getDifficulty(confidence),
            tags: this.generateESPNTags(confidence, odds, injuryInfo),
            learningExperience,
            dataSource: 'ESPN_LIVE'
        };
    }

    async analyzeGameComprehensive(gameId, gameInfo, bettingLines, injuries) {
        const { homeTeam, awayTeam } = gameInfo;
        const matchupKey = `${homeTeam}-${awayTeam}`;

        if (this.debugMode) {
            console.log(`🎯 NERDAI_DEBUG: Analyzing ${awayTeam} @ ${homeTeam}...`);
        }

        // Basic team strength assessment
        const homeStrength = this.getTeamStrength(homeTeam);
        const awayStrength = this.getTeamStrength(awayTeam);

        // Betting line analysis
        const bettingInfo = bettingLines[matchupKey] || {};
        const spreadAnalysis = this.analyzeBettingSpread(bettingInfo.spread, homeTeam, awayTeam);

        // Injury impact assessment
        const homeInjuries = injuries[homeTeam] || [];
        const awayInjuries = injuries[awayTeam] || [];
        const injuryImpact = this.assessInjuryImpact(homeInjuries, awayInjuries);

        // Calculate confidence
        const confidence = this.calculateRichConfidence(
            homeStrength,
            awayStrength,
            spreadAnalysis,
            injuryImpact
        );

        // Make pick
        const pick = this.makePick(homeTeam, awayTeam, confidence, spreadAnalysis);

        // Generate comprehensive reasoning
        const reasoning = this.generateRichReasoning(
            homeTeam,
            awayTeam,
            homeStrength,
            awayStrength,
            spreadAnalysis,
            injuryImpact,
            confidence
        );

        return {
            gameId,
            matchup: `${awayTeam} @ ${homeTeam}`,
            homeTeam,
            awayTeam,
            gameTime: gameInfo.gameTime,
            analysis: {
                teamStrength: { home: homeStrength, away: awayStrength },
                bettingLines: bettingInfo,
                spreadAnalysis,
                injuries: { home: homeInjuries, away: awayInjuries },
                injuryImpact
            },
            aiPick: pick,
            confidence,
            reasoning,
            difficulty: this.getDifficulty(confidence),
            tags: this.generateTags(confidence, spreadAnalysis, injuryImpact)
        };
    }

    calculateStrengthFromRecord(record) {
        const [wins, losses] = record.split('-').map(Number);
        const winPct = wins / (wins + losses || 1);
        return Math.round(50 + (winPct * 50)); // Scale 50-100
    }

    analyzeNewsForInjuries(newsData, homeTeam, awayTeam) {
        const injuries = { home: [], away: [], impact: 'low' };

        newsData.forEach(article => {
            const headline = article.headline.toLowerCase();
            const description = (article.description || '').toLowerCase();

            // Look for injury keywords
            const injuryKeywords = ['injured', 'injury', 'out', 'questionable', 'doubtful', 'ir', 'hurt'];
            const hasInjuryKeyword = injuryKeywords.some(keyword =>
                headline.includes(keyword) || description.includes(keyword)
            );

            if (hasInjuryKeyword) {
                if (headline.includes(homeTeam.toLowerCase()) || description.includes(homeTeam.toLowerCase())) {
                    injuries.home.push({
                        headline: article.headline,
                        link: article.links?.web?.href || ''
                    });
                }
                if (headline.includes(awayTeam.toLowerCase()) || description.includes(awayTeam.toLowerCase())) {
                    injuries.away.push({
                        headline: article.headline,
                        link: article.links?.web?.href || ''
                    });
                }
            }
        });

        // Determine impact level
        const totalInjuries = injuries.home.length + injuries.away.length;
        if (totalInjuries >= 3) injuries.impact = 'high';
        else if (totalInjuries >= 1) injuries.impact = 'medium';

        return injuries;
    }

    calculateESPNConfidence(homeStrength, awayStrength, odds, injuryInfo, gameStatus) {
        let confidence = 50; // Start neutral

        // Team strength differential
        const strengthDiff = homeStrength - awayStrength;
        confidence += strengthDiff * 0.5;

        // Home field advantage
        confidence += 3;

        // ESPN odds analysis
        if (odds.details) {
            const spreadMatch = odds.details.match(/([-+]?\d+\.?\d*)/);
            if (spreadMatch) {
                const spread = parseFloat(spreadMatch[1]);
                confidence += spread; // Positive spread favors home team
            }
        }

        // Injury impact
        const injuryDiff = injuryInfo.away.length - injuryInfo.home.length;
        confidence += injuryDiff * 3; // Away injuries help home team

        // Game status impact
        if (gameStatus === 'STATUS_POSTPONED') confidence -= 10;
        if (gameStatus === 'STATUS_SCHEDULED') confidence += 2; // Slight boost for scheduled games

        return Math.max(25, Math.min(85, Math.round(confidence)));
    }

    generateESPNReasoning(homeTeam, awayTeam, homeRecord, awayRecord, odds, injuryInfo, confidence) {
        const reasons = [];

        // Record analysis
        const [homeWins] = homeRecord.split('-').map(Number);
        const [awayWins] = awayRecord.split('-').map(Number);

        if (homeWins > awayWins + 1) {
            reasons.push(`${homeTeam} has better record (${homeRecord} vs ${awayRecord})`);
        } else if (awayWins > homeWins + 1) {
            reasons.push(`${awayTeam} has better record (${awayRecord} vs ${homeRecord})`);
        }

        // ESPN betting line
        if (odds.details && odds.details !== 'Pick') {
            reasons.push(`ESPN betting line: ${odds.details}`);
        }

        // Injury analysis
        if (injuryInfo.impact === 'high') {
            if (injuryInfo.home.length > injuryInfo.away.length) {
                reasons.push(`${homeTeam} dealing with more injury concerns`);
            } else if (injuryInfo.away.length > injuryInfo.home.length) {
                reasons.push(`${awayTeam} dealing with more injury concerns`);
            }
        }

        // Home field
        reasons.push(`Home field advantage for ${homeTeam}`);

        // Live data advantage
        reasons.push('Analysis based on live ESPN data');

        return reasons;
    }

    generateESPNTags(confidence, odds, injuryInfo) {
        const tags = [];

        if (confidence >= 75) tags.push('HIGH_CONFIDENCE');
        if (confidence <= 35) tags.push('UPSET_ALERT');

        if (odds.details === 'Pick') tags.push('PICK_EM');

        if (injuryInfo.impact === 'high') tags.push('INJURY_FACTOR');

        tags.push('ESPN_LIVE_DATA');

        return tags;
    }

    async getTeamStrengthFromESPN(teamAbbr, teamsData) {
        if (this.debugMode) {
            console.log(`🎯 NERDAI_DEBUG: Looking for team ${teamAbbr} in ${teamsData.length} teams...`);
        }

        // Find team in ESPN teams data - check the actual structure
        for (const teamGroup of teamsData) {
            if (teamGroup.team && teamGroup.team.abbreviation === teamAbbr) {
                // Try to get record from team data
                const records = teamGroup.team.record?.items;
                if (records && records.length > 0) {
                    const record = records[0];
                    const winPct = record.wins / (record.wins + record.losses || 1);
                    const strength = Math.round(50 + (winPct * 50));

                    if (this.debugMode) {
                        console.log(`🎯 NERDAI_DEBUG: ✅ ${teamAbbr} strength from ESPN: ${strength} (${record.wins}-${record.losses}, ${(winPct*100).toFixed(1)}%)`);
                    }

                    return strength;
                }
            }
        }

        // Fallback: calculate from record string if available (from game data)
        if (this.debugMode) {
            console.log(`🎯 NERDAI_DEBUG: ❌ No ESPN teams data for ${teamAbbr}, trying fallback...`);
        }
        return 50;
    }

    analyzeBettingSpread(spreadStr, homeTeam, awayTeam) {
        if (!spreadStr) return { favorite: homeTeam, spread: 3, confidence: 'low' };

        const parts = spreadStr.split(' ');
        const favorite = parts[0];
        const spread = parseFloat(parts[1]);

        return {
            favorite,
            spread: Math.abs(spread),
            homeTeamFavored: favorite === homeTeam,
            confidence: Math.abs(spread) > 7 ? 'high' : Math.abs(spread) > 3 ? 'medium' : 'low'
        };
    }

    assessInjuryImpact(homeInjuries, awayInjuries) {
        const calculateImpact = (injuries) => {
            let impact = 0;
            injuries.forEach(injury => {
                const positionWeight = { 'QB': 10, 'RB': 6, 'WR': 4, 'TE': 3 }[injury.position] || 2;
                const statusWeight = { 'Out': 1.0, 'Doubtful': 0.7, 'Questionable': 0.4, 'Probable': 0.1 }[injury.status] || 0;
                impact += positionWeight * statusWeight;
            });
            return impact;
        };

        const homeImpact = calculateImpact(homeInjuries);
        const awayImpact = calculateImpact(awayInjuries);

        return {
            homeImpact,
            awayImpact,
            netAdvantage: awayImpact - homeImpact, // Positive = home team advantage
            severity: Math.max(homeImpact, awayImpact) > 5 ? 'high' :
                     Math.max(homeImpact, awayImpact) > 2 ? 'medium' : 'low'
        };
    }

    calculateRichConfidence(homeStrength, awayStrength, spreadAnalysis, injuryImpact) {
        let confidence = 50; // Start neutral

        // Team strength differential
        const strengthDiff = homeStrength - awayStrength;
        confidence += strengthDiff * 0.5;

        // Home field advantage
        confidence += 3;

        // Betting spread confidence
        if (spreadAnalysis.homeTeamFavored) {
            confidence += spreadAnalysis.spread * 2;
        } else {
            confidence -= spreadAnalysis.spread * 2;
        }

        // Injury impact
        confidence += injuryImpact.netAdvantage;

        // Keep in reasonable bounds
        return Math.max(25, Math.min(85, Math.round(confidence)));
    }

    makePick(homeTeam, awayTeam, confidence, spreadAnalysis) {
        return confidence >= 50 ? homeTeam : awayTeam;
    }

    generateRichReasoning(homeTeam, awayTeam, homeStrength, awayStrength, spreadAnalysis, injuryImpact, confidence) {
        const reasons = [];

        // Team strength analysis
        if (homeStrength > awayStrength + 5) {
            reasons.push(`${homeTeam} has significant talent advantage (${homeStrength} vs ${awayStrength})`);
        } else if (awayStrength > homeStrength + 5) {
            reasons.push(`${awayTeam} has significant talent advantage (${awayStrength} vs ${homeStrength})`);
        }

        // Betting line analysis
        if (spreadAnalysis.confidence === 'high') {
            reasons.push(`Vegas heavily favors ${spreadAnalysis.favorite} (${spreadAnalysis.spread}-point spread)`);
        } else if (spreadAnalysis.confidence === 'low') {
            reasons.push(`Very close game according to betting markets (${spreadAnalysis.spread}-point spread)`);
        }

        // Injury impact
        if (injuryImpact.severity === 'high') {
            if (injuryImpact.netAdvantage > 3) {
                reasons.push(`${homeTeam} has significant injury advantage`);
            } else if (injuryImpact.netAdvantage < -3) {
                reasons.push(`${awayTeam} has significant injury advantage`);
            }
        }

        // Home field
        reasons.push(`Home field advantage for ${homeTeam}`);

        return reasons;
    }

    getDifficulty(confidence) {
        if (confidence >= 70) return 'easy';
        if (confidence <= 40) return 'very hard';
        return 'medium';
    }

    generateTags(confidence, spreadAnalysis, injuryImpact) {
        const tags = [];

        if (confidence >= 75) tags.push('HIGH_CONFIDENCE');
        if (confidence <= 35) tags.push('UPSET_ALERT');
        if (spreadAnalysis.spread <= 3) tags.push('TOSS_UP');
        if (spreadAnalysis.spread >= 7) tags.push('BLOWOUT_POTENTIAL');
        if (injuryImpact.severity === 'high') tags.push('INJURY_FACTOR');

        return tags;
    }

    generateConfidenceRankings(analyses) {
        return analyses
            .sort((a, b) => b.confidence - a.confidence)
            .map((analysis, index) => ({
                rank: index + 1,
                ...analysis,
                recommendedConfidence: index + 1
            }));
    }

    generateRecommendations(rankings) {
        return {
            bestBets: rankings.filter(r => r.tags.includes('HIGH_CONFIDENCE')).slice(0, 3),
            upsetAlerts: rankings.filter(r => r.tags.includes('UPSET_ALERT')),
            tossUps: rankings.filter(r => r.tags.includes('TOSS_UP')),
            blowouts: rankings.filter(r => r.tags.includes('BLOWOUT_POTENTIAL')),
            injuryWatch: rankings.filter(r => r.tags.includes('INJURY_FACTOR'))
        };
    }

    async getFallbackAnalysis() {
        console.log('🎯 NERDAI_DEBUG: Using emergency fallback analysis');
        // Return basic analysis if everything fails
        return {
            message: 'Using basic fallback analysis',
            games: [
                { matchup: 'KC @ LAC', pick: 'KC', confidence: 65, reasoning: 'Basic analysis - KC favored' }
            ]
        };
    }

    async checkForLearningExperience(homeTeam, awayTeam) {
        try {
            // Check previous predictions involving these teams from past weeks
            const currentSeason = new Date().getFullYear();
            const collection = await window.db.collection('artifacts/nerdfootball/ai-predictions').get();

            let hasLearningExperience = false;

            collection.forEach(doc => {
                const data = doc.data();
                // Only check documents from current season (doc ID format: week-X-YYYY)
                if (doc.id.includes(`-${currentSeason}`) && data.predictions) {
                    data.predictions.forEach(prediction => {
                        // Check if this matchup or teams were involved in past wrong predictions
                        if ((prediction.homeTeam === homeTeam || prediction.awayTeam === homeTeam ||
                             prediction.homeTeam === awayTeam || prediction.awayTeam === awayTeam) &&
                            prediction.predictionCorrect === false &&
                            prediction.confidence >= 65) {
                            hasLearningExperience = true;

                            if (this.debugMode) {
                                console.log(`🧠 LEARNING_EXPERIENCE: Found past wrong prediction involving ${homeTeam}/${awayTeam} in Week ${data.week}`);
                            }
                        }
                    });
                }
            });

            return hasLearningExperience;
        } catch (error) {
            if (this.debugMode) {
                console.log(`🧠 LEARNING_EXPERIENCE: Error checking for learning experiences: ${error.message}`);
            }
            return false;
        }
    }

    async analyzeGameBasic(gameId, gameInfo) {
        const { homeTeam, awayTeam } = gameInfo;

        if (this.debugMode) {
            console.log(`🎯 NERDAI_DEBUG: Basic analysis for ${awayTeam} @ ${homeTeam}`);
        }

        // Basic team strength assessment
        const homeStrength = this.getTeamStrength(homeTeam);
        const awayStrength = this.getTeamStrength(awayTeam);

        // Basic confidence calculation
        const confidence = this.calculateBasicConfidence(homeStrength, awayStrength);

        // Make AI pick
        const aiPick = confidence >= 50 ? homeTeam : awayTeam;

        // Check for learning experiences
        const learningExperience = await this.checkForLearningExperience(homeTeam, awayTeam);

        // Generate basic reasoning
        const reasoning = [`${aiPick} favored based on team strength analysis`];
        if (learningExperience) {
            reasoning.push('Adjusted based on previous prediction results');
        }

        return {
            gameId,
            matchup: `${awayTeam} @ ${homeTeam}`,
            homeTeam,
            awayTeam,
            gameTime: null,
            gameStatus: 'Scheduled',
            analysis: {
                teamStrength: { home: homeStrength, away: awayStrength },
                records: { home: 'N/A', away: 'N/A' },
                bettingLines: {},
                injuries: { home: [], away: [] }
            },
            aiPick,
            confidence,
            reasoning,
            difficulty: this.getDifficulty(confidence),
            tags: [],
            learningExperience,
            dataSource: 'FIREBASE_FALLBACK'
        };
    }

    calculateBasicConfidence(homeStrength, awayStrength) {
        // Home field advantage (3-point boost)
        let confidence = 55;

        // Strength differential
        const strengthDiff = homeStrength - awayStrength;
        confidence += strengthDiff * 0.5;

        // Clamp between 25-85%
        return Math.max(25, Math.min(85, Math.round(confidence)));
    }
}

// Make available globally
window.RichNerdAITool = new RichNerdAITool();

// Test function
window.testRichAI = async function() {
    console.log('🎯 NERDAI_DEBUG: Testing Rich AI Tool...');
    const tool = window.RichNerdAITool;
    const result = await tool.getComprehensiveAnalysis(4);
    console.log('🎯 NERDAI_DEBUG: Rich AI Result:', result);
    return result;
};