# ESPN Sync Skill

Expert in ESPN API integration, cache management, and real-time sports data synchronization for NerdFootball.

## Expertise Areas

### 🎯 ESPN API Integration
- ESPN scoreboard API endpoint management
- Game data fetching and parsing
- Real-time score updates via WebSocket/RTDB
- NFL game status tracking (scheduled, in-progress, final)

### 🔥 Cache System Management
- **ESPN Cache Path**: `cache/espn_current_data`
- **TTL**: 6 hours
- **Performance Target**: Sub-500ms response times
- Cache-busting with `Date.now()` timestamps
- Force refresh with `?force=true` parameter

### ⏰ ESPN Timezone Bug Handling
**CRITICAL**: ESPN uses EST as "Zulu" reference, NOT true UTC

```javascript
// ESPN "Z" = Eastern Time, NOT UTC!
const cleanTime = espnTimestamp.replace('Z', '');
const easternTime = new Date(cleanTime);
const offsetHours = isDST ? 4 : 5; // EDT = UTC-4, EST = UTC-5
gameTime = new Date(Date.UTC(year, month, day, hours + offsetHours, minutes, seconds));
```

**DST RULES**: March 9 - November 2 (EDT), November 3 - March 8 (EST)

### 📊 Data Synchronization
- Game status monitoring (FINAL status triggers scoring)
- Real-time leaderboard updates
- Pick validation against game start times
- Weekly cache regeneration (weeks 1-18)

### 🚀 Performance Standards
- **ESPN Cache Hit**: <500ms ✓
- **API Timeout Prevention**: Use Firebase cache ALWAYS
- **Bulk Operations**: Rate limit at 1-second intervals
- **Cache Verification**: Validate timestamps and freshness

## Common Tasks

### Cache Refresh
```javascript
const cacheBuster = Date.now();
const response = await fetch(`https://your-espn-endpoint?t=${cacheBuster}`, {
    headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
    }
});
```

### Force Cache Regeneration
```javascript
// Weekly leaderboard bulk refresh
const refreshAllWeeklyCaches = async () => {
    for (let week = 1; week <= 18; week++) {
        await fetch(`https://generateweeklyleaderboardcache-np7uealtnq-uc.a.run.app?week=${week}&force=true`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    }
};
```

### Game Status Validation
- Check for "FINAL" status before awarding points
- Validate game start times for pick deadlines
- Handle timezone conversions properly

## Key Files
- `public/js/utils/firebase-cache.js` - Cache manager
- ESPN integration in confidence/survivor/grid bundles
- Cloud Functions: `getweeklyleaderboard`, `getsurvivorpooldata`

## Debug Patterns
```javascript
console.log('📊 ESPN:', gameData);
console.log('🔥 CACHE:', cacheStatus);
console.log('⏰ TIMEZONE:', gameTime);
```

## Performance Checklist
- [ ] Sub-500ms ESPN cache hits
- [ ] Cache-busting on all fetch calls
- [ ] Proper timezone conversion
- [ ] Rate limiting on bulk operations
- [ ] Force refresh available for admins
