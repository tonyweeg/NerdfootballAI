# Week 4 Scoring Fix - Comprehensive Action Plan
**Created:** 2025-09-30 12:40 AM EDT
**Issue:** Week 4 shows 13 games instead of 16 in user scoring and leaderboards

---

## CURRENT STATE ANALYSIS

### ✅ What's Working (16 games)
```
Path: /artifacts/nerdfootball/public/data/nerdfootball_games/4
Status: ALL 16 GAMES EXIST with final scores including:
- Game 415: MIA 27, NYJ 21 (FINAL)
- Game 416: DEN 28, CIN 3 (FINAL)
- Game 414: GB 40, DAL 40 (TIE)
```

### ✅ User Picks (16 picks)
```
Path: /artifacts/nerdfootball/public/data/nerdfootball_picks/4/submissions/{userId}
Example: WxSPmEildJdqs6T5hIpBUZrscwt2
Status: ALL 16 PICKS EXIST (401-416)
```

### ❌ User Scoring (13 games - STALE)
```
Path: /artifacts/nerdfootball/pools/nerduniverse-2025/scoring-users/{userId}
Last Updated: 2025-09-29T02:39:33.258Z (BEFORE Monday night games)
Issue: weeklyPoints[4].gamesPlayed = 13 (should be 16)
Issue: gameResults array shows games 414, 415, 416 as "gameCompleted: false"
```

### ❌ Leaderboards (13 games - READING FROM STALE SCORING)
```
Weekly Leaderboard Cache: Shows "totalPicks": 13
Season Leaderboard Cache: Shows week4: {"total": 13}
Root Cause: Reading from stale scoring-users documents
```

---

## DATA FLOW ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: GAMES (Source of Truth)                            │
│ /artifacts/nerdfootball/public/data/nerdfootball_games/4   │
│ - ESPN updates via espnScoreMonitor.js                      │
│ - Contains all 16 games with final scores ✅                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: USER PICKS (User Submissions)                      │
│ /artifacts/nerdfootball/public/data/nerdfootball_picks/4/  │
│   submissions/{userId}                                      │
│ - Users make picks via UI                                   │
│ - Contains all 16 picks ✅                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: SCORING CALCULATION (The Problem!)                 │
│ /artifacts/nerdfootball/pools/nerduniverse-2025/           │
│   scoring-users/{userId}                                    │
│ - UNKNOWN FUNCTION writes this data ❌                     │
│ - Last run: 2025-09-29T02:39:33Z (before MNF)             │
│ - Contains detailed gameResults array with:                 │
│   * gamesPlayed: 13 (WRONG - should be 16)                 │
│   * gameResults[]: array of 16 games with picks/results    │
│   * Games 414, 415, 416 marked "gameCompleted: false"      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: LEADERBOARD CACHES (Reading Stale Data)            │
│ - generateWeeklyLeaderboardCache reads scoring-users        │
│ - generateSeasonLeaderboardCache reads scoring-users        │
│ - Both show "totalPicks": 13 ❌                            │
└─────────────────────────────────────────────────────────────┘
```

---

## FUNCTIONS ATTEMPTED (NOT THE RIGHT ONE)

### ❌ processWeeklyScoring (weeklyScoring.js)
- **What it does:** Simple scoring with pick.team/pick.winner comparison
- **What it writes:** weeklyPoints[week].totalPoints, correctPicks, totalPicks
- **Issue:** Does NOT write the detailed gameResults array format
- **Fixed:** Added support for `pick.winner` field, but still wrong format

### ❌ syncGameScores
- **What it does:** Updates game scores from ESPN
- **What it writes:** Game data only, NOT user scoring
- **Result:** Games updated, scoring unchanged

### ❌ updateLiveScores
- **What it does:** Updates game scores (all showing gameId "401" - BUG)
- **What it writes:** Game data only, NOT user scoring
- **Result:** Games updated, scoring unchanged

---

## THE MYSTERY FUNCTION

### What We're Looking For:
**A function that writes this exact structure to scoring-users/{userId}:**
```javascript
{
  weeklyPoints: {
    "4": {
      gamesPlayed: 13,  // ← This field
      totalPicks: 13,   // ← This field
      gameResults: [    // ← This array
        {
          gameId: "401",
          userPick: "Seattle Seahawks",
          actualWinner: "Seattle Seahawks",
          confidencePoints: 16,
          pointsEarned: 16,
          correct: true,
          gameCompleted: true  // ← This field
        },
        // ... 15 more games
      ],
      // Standard fields
      totalPoints: 69,
      correctPicks: 7,
      accuracy: 53.84,
      lastUpdated: "2025-09-29T02:39:33.258Z"
    }
  }
}
```

### Candidates to Investigate:
1. **Frontend JavaScript** - Pages that calculate scoring client-side
2. **Scheduled Function** - autoGameCompletion or scheduledScoreUpdate
3. **Legacy Scoring System** - Old function still in use

---

## EXECUTION PLAN

### Phase 1: Find The Function ⏳
- [ ] Search all .js files for "gameResults" write operations
- [ ] Search all .html files for scoring calculation logic
- [ ] Check index.js for exports we haven't tried
- [ ] Review Firebase Functions logs for 2025-09-29T02:39:33Z

### Phase 2: Trigger Recalculation
- [ ] Once found, call the function for Week 4
- [ ] Verify scoring-users shows gamesPlayed: 16
- [ ] Verify gameResults array has all 16 games as completed

### Phase 3: Refresh Caches
- [ ] Call generateWeeklyLeaderboardCache?week=4
- [ ] Call generateSeasonLeaderboardCache
- [ ] Verify both show totalPicks: 16

### Phase 4: Verify Frontend
- [ ] Check weekly-leaderboard.html shows correct data
- [ ] Verify all user scores reflect 16 games
- [ ] Confirm no users stuck at 13 picks

---

## NEXT IMMEDIATE ACTIONS

1. **Search HTML files** for scoring calculation (likely client-side)
   ```bash
   grep -rn "gamesPlayed\|gameResults.*push\|scoring-users" /Users/tonyweeg/nerdfootball-project/public/*.html
   ```

2. **Check Firebase Functions logs** for what ran at 2025-09-29T02:39:33Z
   ```bash
   firebase functions:log --only processWeeklyScoring,autoGameCompletion --limit 100
   ```

3. **Search for frontend scoring logic** in leaderboard pages
   - weekly-leaderboard.html
   - leaderboard.html
   - nerd-universe.html

---

## SUCCESS CRITERIA

✅ All users show `gamesPlayed: 16` in scoring-users documents
✅ Weekly leaderboard cache shows `"totalPicks": 16`
✅ Season leaderboard cache shows `week4: {"total": 16}`
✅ weekly-leaderboard.html displays correct standings with 16 games
✅ No users stuck with 13-pick scoring

---

## ROLLBACK PLAN (If Needed)

1. Games are correct - no rollback needed
2. Picks are correct - no rollback needed
3. If scoring breaks further:
   ```bash
   # Restore from backup
   firebase firestore:export gs://nerdfootball-backups/emergency-$(date +%s)
   ```

---

**STATUS:** Phase 1 in progress - Finding the mystery function that writes gameResults array