# 🏈 SURVIVOR PICKS PAGE RENOVATION PLAN

## 📋 CURRENT STATE ANALYSIS

### What's Wrong:
1. **No Elimination Check** - Page doesn't check if user is eliminated before allowing picks
2. **No Real-Time Status** - Doesn't use the `getSurvivorPoolData` Firebase Function
3. **Old Data Structure** - Manually checks individual pick results vs using centralized elimination logic
4. **Week Navigation Issues** - Users can navigate to any week without restriction
5. **Missing Alive/Dead UI** - No clear indication if user is eliminated

### What's Working:
- ✅ Team selection interface with helmets
- ✅ Used teams tracking
- ✅ Week lock logic (games that have started)
- ✅ Firebase save functionality
- ✅ Beautiful blood chamber theme

## 🎯 RENOVATION STRATEGY

### Phase 1: Add Survivor Status Check (HIGH PRIORITY)
**Goal:** Use `getSurvivorPoolData` to determine if user is alive/dead

**Implementation:**
1. Call `https://getsurvivorpooldata-np7uealtnq-uc.a.run.app` on page load
2. Find current user in response data:
   - `data.alive[]` - User can make picks
   - `data.eliminated[]` - User is DEAD, show elimination screen
   - `data.nonParticipating[]` - User never joined

3. Store user status:
```javascript
let userSurvivorStatus = {
    isAlive: boolean,
    isEliminated: boolean,
    eliminatedWeek: number,
    eliminatedBy: string (team name),
    allWinningPicks: array
};
```

### Phase 2: Elimination Screen (HIGH PRIORITY)
**Goal:** Block eliminated users from making picks

**If Eliminated:**
- Show full-screen "YOU ARE DEAD" message
- Display:
  - Week they were eliminated
  - Team that killed them
  - All their winning picks before death
  - Option to view history (read-only)
- **DISABLE ALL PICK FUNCTIONALITY**

**UI Design:**
```
┌─────────────────────────────────────────┐
│  💀 SOUL REAPED - WEEK X 💀             │
│                                         │
│  Eliminated By: [Team Name] [Helmet]   │
│                                         │
│  Your Journey:                          │
│  Week 1: [Team] ✅                      │
│  Week 2: [Team] ✅                      │
│  Week 3: [Team] ❌  [DEATH]             │
│                                         │
│  [View Full History]  [Return to Hub]  │
└─────────────────────────────────────────┘
```

### Phase 3: Alive User - Current Week Only (HIGH PRIORITY)
**Goal:** Only show current week picks for alive users

**Changes:**
1. Remove week navigation for alive users
2. Always show CURRENT week only
3. Check if current week is locked:
   - If locked → show "Week X Locked" message
   - If unlocked → show team picker

4. Show user's previous winning picks in sidebar

### Phase 4: Pick Submission Logic Update (MEDIUM PRIORITY)
**Goal:** Ensure picks save correctly and reflect in getSurvivorPoolData

**Current Save Path:** ✅ CORRECT
```javascript
artifacts/nerdfootball/public/data/nerdSurvivor_picks/${userId}
```

**Data Structure:** ✅ CORRECT
```javascript
{
    picks: {
        "1": { team: "Team Name", gameId: "401", result: "Pending", alive: true, submittedAt: "..." },
        "2": { team: "Team Name", gameId: "402", result: "Pending", alive: true, submittedAt: "..." }
    }
}
```

### Phase 5: Historical View for Eliminated Users (LOW PRIORITY)
**Goal:** Let dead users see their picks history

**Implementation:**
- Read-only grid showing all weeks
- Green checkmarks for wins
- Red X for elimination week
- Gray out their death week

## 🔧 DETAILED IMPLEMENTATION STEPS

### Step 1: Add Survivor Status Loader
```javascript
async function loadUserSurvivorStatus() {
    try {
        const response = await fetch('https://getsurvivorpooldata-np7uealtnq-uc.a.run.app');
        const result = await response.json();

        if (!result.success) {
            throw new Error('Failed to load survivor data');
        }

        const survivorData = result.data;

        // Find current user in alive array
        const aliveUser = survivorData.alive.find(s => s.userId === currentUser.uid);
        if (aliveUser) {
            return {
                isAlive: true,
                isEliminated: false,
                allWinningPicks: aliveUser.allWinningPicks || []
            };
        }

        // Find current user in eliminated array
        const deadUser = survivorData.eliminated.find(s => s.userId === currentUser.uid);
        if (deadUser) {
            return {
                isAlive: false,
                isEliminated: true,
                eliminatedWeek: deadUser.eliminatedWeek,
                eliminatedBy: deadUser.eliminatedBy,
                allWinningPicks: deadUser.allWinningPicks || []
            };
        }

        // User not participating
        return {
            isAlive: false,
            isEliminated: false,
            notParticipating: true
        };

    } catch (error) {
        console.error('Error loading survivor status:', error);
        throw error;
    }
}
```

### Step 2: Route Users Based on Status
```javascript
async function initializeInterface() {
    // Load survivor status FIRST
    userSurvivorStatus = await loadUserSurvivorStatus();

    if (userSurvivorStatus.isEliminated) {
        showEliminationScreen();
        return; // STOP - no more functionality
    }

    if (userSurvivorStatus.notParticipating) {
        showNotParticipatingScreen();
        return;
    }

    // User is alive - show current week pick interface
    if (userSurvivorStatus.isAlive) {
        showCurrentWeekPickInterface();
    }
}
```

### Step 3: Disable Week Navigation
```javascript
function showCurrentWeekPickInterface() {
    const currentWeek = getCurrentWeekNumber();

    // FORCE current week only
    document.getElementById('currentWeek').textContent = currentWeek;

    // HIDE week navigation buttons
    document.getElementById('weekNavigationCard').style.display = 'none';

    // Load current week data
    await loadGameData(); // Only for current week

    // Check if week is locked
    const weekLocked = isWeekLocked(currentWeek);

    if (weekLocked) {
        showWeekLockedMessage();
    } else {
        showTeamPicker();
    }
}
```

### Step 4: Show Previous Wins Sidebar
```javascript
function displayPreviousWins() {
    const winsHtml = userSurvivorStatus.allWinningPicks.map(pick => `
        <div class="win-item">
            <span>Week ${pick.week}:</span>
            <img src="${pick.helmetUrl}" class="helmet-small">
            <span>${pick.team}</span>
            <span class="win-icon">✅</span>
        </div>
    `).join('');

    document.getElementById('previousWins').innerHTML = winsHtml;
}
```

## 📊 SUMMARY

### What Gets Fixed:
1. ✅ **Eliminated users CANNOT make picks** (blocked immediately)
2. ✅ **Alive users see ONLY current week** (no navigation)
3. ✅ **Real-time elimination status** (using Firebase Function)
4. ✅ **Clear death screen** (shows elimination details)
5. ✅ **Historical view for dead users** (read-only)

### What Stays the Same:
- ✅ Data paths (already correct)
- ✅ Pick submission logic (already correct)
- ✅ Team selection UI (beautiful)
- ✅ Used teams tracking (works)
- ✅ Week lock logic (works)

### Testing Plan:
1. Test as alive user → Should see current week only
2. Test as eliminated user → Should see death screen with no pick ability
3. Test as non-participant → Should see join screen
4. Test locked week → Should show "Week Locked" message
5. Test unlocked week → Should show team picker

## 🚀 DEPLOYMENT STRATEGY

1. Create backup of current file
2. Implement Phase 1 & 2 (status check + elimination screen)
3. Deploy to test URL
4. User testing with 2-3 eliminated users
5. User testing with 2-3 alive users
6. Deploy to production
7. Monitor for 24 hours

## ⚡ ESTIMATED EFFORT

- **Phase 1-2:** 2-3 hours (critical path)
- **Phase 3:** 1 hour (current week only)
- **Phase 4:** 30 mins (verification)
- **Phase 5:** 1 hour (nice-to-have)

**Total:** 4-5 hours for bulletproof survivor picks

---

**Does this plan make sense? Should we proceed?**
