# 💥 DEEP STAR 6 USER DATA PATHS

**All Firestore paths that contain user-specific data for complete deletion**

## User Data Locations (Per User)

### 1. Pool Membership
```
artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members/{userId}
```

### 2. Confidence Picks (All Weeks)
```
artifacts/nerdfootball/public/data/nerdfootball_picks/{weekNumber}/submissions/{userId}
artifacts/nerdfootball/pools/nerduniverse-2025/confidence/2025/weeks/{weekNumber}/users/{userId}
```

### 3. Survivor Picks (All Weeks)
```
artifacts/nerdfootball/public/data/nerdSurvivor_picks/{weekNumber}/{userId}
artifacts/nerdfootball/pools/nerduniverse-2025/survivor/2025/weeks/{weekNumber}/users/{userId}
```

### 4. Scoring Data
```
artifacts/nerdfootball/pools/nerduniverse-2025/scores/2025/weeks/{weekNumber}/users/{userId}
```

### 5. Elimination Records
```
artifacts/nerdfootball/pools/nerduniverse-2025/survivor/2025/eliminations/{userId}
```

### 6. User Rollups (Season/Weekly Stats)
```
artifacts/nerdfootball/pools/nerduniverse-2025/rollups/season/2025/users/{userId}
artifacts/nerdfootball/pools/nerduniverse-2025/rollups/weekly/2025/week_{weekNumber}/users/{userId}
```

## DEEP STAR 6 Strategy

1. **BACKUP FIRST** - Archive complete user snapshot to:
   ```
   artifacts/nerdfootball/pools/nerduniverse-2025/metadata/deep_star_6_archive/{userId}/{timestamp}
   ```

2. **DELETE IN ORDER**:
   - Loop through all 18 weeks
   - Delete confidence picks (both paths)
   - Delete survivor picks (both paths)
   - Delete scoring data
   - Delete rollups
   - Delete eliminations
   - Delete pool membership (last)

3. **VERIFICATION**:
   - Count deletions
   - Log each deletion
   - Confirm zero remaining user data

## Confirmation Safety

User must type: **FEEEEE** (shown on screen)

Button text: **☠️ DEEP STAR 6 THAT SUCKA**
