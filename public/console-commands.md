# 🔧 Survivor System Console Commands

## Immediate Fix Commands (Run in Main App Console)

### 1. Load Recalculation Script
```javascript
// Load the recalculation script
const script = document.createElement('script');
script.src = './survivorRecalc.js';
document.head.appendChild(script);
```

### 2. Quick Status Check (Target User)
```javascript
// Check specific user status with fixed logic
await survivorRecalc.checkUserStatus('aaG5Wc2JZkZJD1r7ozfJG04QRrf1');
```

### 3. Force Complete Recalculation
```javascript
// Recalculate all users with fixed week-isolation logic
await survivorRecalc.forceRecalculation();
```

### 4. Clear Cache and Recalculate
```javascript
// Clear all cache and force fresh calculation
await survivorRecalc.clearCacheAndRecalculate();
```

### 5. Full Page Refresh
```javascript
// Complete refresh with new data
await survivorRecalc.reloadSurvivorPage();
```

## Alternative: Direct SurvivorSystem Commands

### Direct Pool Status Check
```javascript
// Direct call to SurvivorSystem (if loaded)
if (window.survivorSystem) {
    const results = await window.survivorSystem.getPoolSurvivalStatus('nerduniverse-2025');
    console.log('Survival results:', results);

    // Find target user
    const targetUser = results.find(u => u.uid === 'aaG5Wc2JZkZJD1r7ozfJG04QRrf1');
    console.log('Target user:', targetUser);
}
```

### Migration Command (if needed)
```javascript
// Run migration if unified documents are missing
await survivorMigration.runFullMigration();
```

## Debug Commands

### Check ESPN Data
```javascript
// Verify ESPN data is loading correctly with week isolation
const weekData = await window.espnNerdApi.getWeekGames(1);
console.log('Week 1 ESPN data:', weekData);
```

### Check Pool Members
```javascript
// Verify pool members are loading
const poolDoc = await getDoc(doc(db, 'artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members'));
console.log('Pool members:', poolDoc.data());
```

### Check User Picks
```javascript
// Check specific user's picks
const uid = 'aaG5Wc2JZkZJD1r7ozfJG04QRrf1';
const picksDoc = await getDoc(doc(db, `artifacts/nerdfootball/public/data/nerdSurvivor_picks/${uid}`));
console.log('User picks:', picksDoc.data());
```

## Expected Results

After running the recalculation:
- Target user `aaG5Wc2JZkZJD1r7ozfJG04QRrf1` should show correct elimination status
- Survivor table should display accurate Win/Loss statuses
- "Everyone alive" issue should be resolved
- Status calculations should use `getWeekGames(week)` instead of `getCurrentWeekScores()`