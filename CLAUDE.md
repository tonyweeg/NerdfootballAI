# 💎 CLAUDE.md - Diamond Level Development Standards for NerdFootball

## Core Philosophy
**"Diamond Level" means absolute precision, no mistakes, and comprehensive verification at every step.**

## 🤖 SPECIALIZED AGENTS
- **god-agent-dev-discipline** - All development work with absolute precision
- **verification-agent** - Claims verification and quality assurance
- **engine-architect-pharoah** - System architecture and technical design
- **fantasy-sports-ux-designer** - UI/UX design and user experience
- **firebase-deployment-specialist** - Production deployments and Firebase expertise

## 🏆 CURRENT PRODUCTION STANDARD - v2.1
**Main Branch**: `main` (all deployments)

### Core Application Files:
- `nerd-universe.html` - Main hub with terminal theme
- `help-ai-picks.html` - Wu-Tang AI prediction chamber
- `nerdfootballConfidencePicks.html` - Confidence pool (🐝 KILLER BEES)
- `NerdSurvivorPicks.html` - Survivor pool
- `nerdfootballTheGrid.html` - The Grid
- `leaderboard.html` - All leaderboard displays

## 🔥 FIREBASE CACHE SYSTEM
**Performance**: Sub-500ms AI predictions and ESPN responses

### Cache Paths:
```javascript
// AI Cache: 15-minute expiry, 200-500ms loads
const aiCachePath = 'artifacts/nerdfootball/pools/nerduniverse-2025/cache/latest-ai-intel-sheet';

// ESPN Cache: 6-hour expiry, sub-500ms loads
const espnCachePath = 'cache/espn_current_data';
```

### Cache Performance:
| System | First Load | Cache Hit | Performance Gain |
|--------|------------|-----------|------------------|
| AI Predictions | 5-10s | 200-500ms | 99% faster |
| ESPN Data | 2-5s | <500ms | 90% faster |

## 🐝 KILLER BEES - CONFIDENCE FILTERING
**Feature**: Dynamic confidence dropdown filtering for locked games

### Core Logic:
- Locked games remove their confidence values from other dropdowns
- Real-time updates when confidence values change
- Console debug: 🎯 CONFIDENCE_FILTER and 🔄 CONFIDENCE_REFRESH

## 🚀 ADMIN DASHBOARD
**URL**: https://nerdfootball.web.app/nerdfootball-system-architecture.html

### Authentication Pattern:
```javascript
// URL parameter (hamburger menu) → Firebase Auth fallback
const adminUID = urlParams.get('admin');
if (adminUID && ADMIN_UIDS.includes(adminUID)) {
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
}
```

## 🚨 LEADERBOARD AGGREGATION FIX
**Issue**: Season leaderboard manual aggregation required
**Solution**: Modified `generateSeasonLeaderboard()` to manually sum weeklyPoints data instead of relying on stored season stats


## 🛡️ DEVELOPMENT WORKFLOW

### Recovery Commands:
```bash
# If anything breaks - instant recovery
git checkout main
firebase deploy --only hosting
firebase deploy --only functions
```

### Core Features (MUST ALL WORK):
- Hamburger menu navigation
- Confidence pool with locked game protection
- The Grid with pre-game security
- Survivor pool functionality
- Admin features
- No ghost users (okl4sw2aDhW3yKpOfOwe5lH7OQj1 blocked)

## 🔧 FIREBASE CONFIGURATION MANAGEMENT
**CRITICAL: Consistent Firebase configs prevent authentication disasters**

### 🛡️ Standard Firebase Configuration (USE THIS):
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDAF1MbAhL2uPIVUGMDlXvCqtknUUCX5Gw",
    authDomain: "nerdfootball.firebaseapp.com",
    databaseURL: "https://nerdfootball-default-rtdb.firebaseio.com",
    projectId: "nerdfootball",
    storageBucket: "nerdfootball.appspot.com",
    messagingSenderId: "969304790725",
    appId: "1:969304790725:web:892df38db0b0e62bde02ac"
};
```

### ⚠️ WRONG Configuration (NEVER USE):
```javascript
// WRONG - Different project, breaks authentication
const firebaseConfig = {
    apiKey: "AIzaSyC9bJIbGGTlwE21BDV1ihV6q3qQzm3Vpo8",
    messagingSenderId: "631080493141",
    appId: "1:631080493141:web:e7c5dde9013b0b4b60fe49"
    // ... other wrong values
};
```

### 🔍 Configuration Verification Checklist:
- [ ] **messagingSenderId**: Must be `969304790725`
- [ ] **appId**: Must be `1:969304790725:web:892df38db0b0e62bde02ac`
- [ ] **storageBucket**: Must be `nerdfootball.appspot.com`
- [ ] **projectId**: Must be `nerdfootball`


## 🛠️ AUTHENTICATION TROUBLESHOOTING GUIDE

### 🚨 "Admin Access Required" on Dashboard Refresh
**SYMPTOM**: Dashboard works initially but shows access denied on refresh
**ROOT CAUSE**: Firebase Auth state timing during hard refresh
**SOLUTION**: Always wait for `onAuthStateChanged` callback:

```javascript
async function waitForFirebaseAuth() {
    return new Promise((resolve) => {
        // ALWAYS wait for Firebase Auth to determine state
        // (don't assume null means undetermined vs logged-out)
        const unsubscribe = window.auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(); // Auth state determined (user OR null)
        });

        // Timeout after 5 seconds
        setTimeout(() => {
            unsubscribe();
            resolve();
        }, 5000);
    });
}
```


### 🚨 Scoring System Path Issues - CRITICAL FIX
**SYMPTOM**: Scoring system finds zero picks despite users having made picks
**ROOT CAUSE**: Using wrong Firebase path - not matching The Grid's working path structure
**CRITICAL SOLUTION**: Use EXACT same path as The Grid (nerdfootballTheGrid.html:624):

```javascript
// WRONG (my attempts):
// `picks/pools/nerduniverse-2025/weeks/${weekNumber}/users/${userId}` (7 segments error)
// `artifacts/nerdfootball/pools/nerduniverse-2025/confidence/2025/weeks/${weekNumber}` (wrong structure)

// CORRECT (The Grid's working path):
const picksCollectionPath = `artifacts/nerdfootball/public/data/nerdfootball_picks/${weekNumber}/submissions`;
const picksDocRef = window.doc(window.db, picksCollectionPath, userId);
const picksSnap = await window.getDoc(picksDocRef);
return picksSnap.data(); // Direct user pick data
```

**NEVER USE** any other path structure for picks - ALWAYS copy The Grid's exact logic!


### 🚨 ESPN Timezone Bug (4-Hour Offset)
**SYMPTOM**: Game times show 4 hours early, games appear started when they haven't
**ROOT CAUSE**: ESPN uses EST as "Zulu" reference, NOT true UTC
**CRITICAL UNDERSTANDING**: ESPN "2025-09-18T20:15:00Z" = 8:15 PM EASTERN (not UTC)

**SOLUTION**: Apply ESPN EST-as-Zulu conversion logic
```javascript
// ESPN "Z" = Eastern Time, NOT UTC!
const cleanTime = espnTimestamp.replace('Z', '');
const easternTime = new Date(cleanTime);
const offsetHours = isDST ? 4 : 5; // EDT = UTC-4, EST = UTC-5
gameTime = new Date(Date.UTC(year, month, day, hours + offsetHours, minutes, seconds));
```

**DST RULES**: March 9 - November 2 (EDT), November 3 - March 8 (EST)

## 🎯 Critical Standards

### 1. Testing BEFORE Deployment
- **ALWAYS** write and run tests before deploying
- Use Puppeteer for integration testing
- Use JEST for unit testing  
- Create comprehensive test plans for any significant change
- If tests fail, fix issues before proceeding
- Document all test results

### 2. User Data Integrity
- **Single Source of Truth**: Pool members (`artifacts/nerdfootball/pools/nerduniverse-2025/metadata/members`)
- **NO GHOST USERS**: Specifically eliminate `okl4sw2aDhW3yKpOfOwe5lH7OQj1`
- All 9 user displays must use pool members as the authoritative source
- No user should appear in any list if they're not part of a pool

### 3. Code Quality Standards
- **NO COMMENTS** in code unless explicitly requested
- **NO DOCUMENTATION FILES** (*.md, README) unless explicitly requested
- Follow existing code conventions and patterns
- Use existing libraries - never assume a library is available
- After completing tasks, run:
  - `npm run lint` (if available)
  - `npm run typecheck` (if available)
- Ask for these commands if not known, then document in CLAUDE.md

### 4. Functionality Preservation
- **NEVER** break existing functionality while adding new features
- **NEVER** lose features when fixing bugs
- Test comprehensively to ensure nothing is lost
- Maintain all existing UI/UX behaviors
- Keep all existing features when refactoring

### 5. Git & Deployment Discipline  
- **Commit BEFORE each new feature**: `git add . && git commit -m "Pre-feature: Working state before [feature name]"`
- **ONLY deploy after human regression testing passes**
- **Commit AFTER feature complete**: `git add . && git commit -m "Feature complete: [feature description]"`
- **Push to remote after human verification**: `git push` (only after user confirms feature works)
- Always verify both deployment and git push succeeded
- This enables easy rollback to last working state if issues arise

### 6. Communication Standards
- Be concise and direct - minimize output tokens
- Answer in 1-3 sentences when possible
- No unnecessary preambles or postambles
- No explanations unless requested
- Stop after completing task (don't explain what you did)

### 7. Task Management
- Use TodoWrite tool for complex multi-step tasks
- Mark tasks complete immediately when done
- Don't batch todo completions
- Break complex tasks into specific steps
- Track progress in real-time

### 8. Problem-Solving Approach
- **No shortcuts** - do things properly the first time
- **Surgical precision** - make targeted fixes, not broad changes
- Research thoroughly before implementing
- Understand existing code before modifying
- When in doubt, ask for clarification

### 9. Performance & Refactoring Standards
- **ESPN Cache Target**: Sub-500ms response times (achieved v3.0)
- **UI Response Target**: <100ms for user interactions
- **Survivor Pool Target**: Sub-100ms loading (90x improvement achieved)
- **Always scan for similar patterns** when fixing performance issues
- **Check for N+1 query problems** in any database-related code
- **Search codebase for duplicate inefficient logic** before concluding refactoring
- **Seek user approval** before implementing broader performance optimizations
- **Document performance improvements** with before/after metrics
- **Cache First**: Use ESPN Firebase cache system to eliminate API timeouts
- Example: If fixing `getDocs(collection(db, users/${user.id}/...))` in one function, search entire codebase for similar patterns

### 10. Cross-Impact Analysis Standards
- **CRITICAL**: Before removing/modifying any code element, search entire codebase for dependencies
- Use `grep` to find all references to variables, functions, DOM elements before deletion
- Check if shared functions/elements are used by multiple features
- When removing UI elements, verify corresponding JavaScript references are safe
- Example: Removing `#leaderboard-body` requires checking if `allUI.leaderboardBody` is used elsewhere
- Ask user for confirmation when potential cross-impacts are identified

## 🚨 Known Issues to Always Check

### Ghost Users
- The ghost user `okl4sw2aDhW3yKpOfOwe5lH7OQj1` must NEVER appear
- Always verify ghost elimination after user-related changes
- Use pool members to prevent ghost users

### Critical Features That Must Work
1. **ESPN Cache System**: Sub-500ms performance, zero timeout disasters
2. **Game Credit System**: Users get credit when games show FINAL status
3. **UI Security**: Buttons disabled for completed games, proper game state display
4. **Picks Summary**: "Your Active Picks" and "Season Leaderboard"
5. **The Grid**: Must show picks only after games start (security)
6. **URL Routing**: Parameters like `?view=rules` must work
7. **Admin Functions**: Add/remove users from pools
8. **Pool Settings**: Must display correct users
9. **Authentication**: Users must be able to sign in/out

## 📋 Project-Specific Commands

### Testing
```bash
# Puppeteer Tests
node test-picks-summary-diamond.js
node test-datetime-security-diamond.js
node test-pool-members-diamond.js

# JEST Tests
npx jest app-structure-simple.test.js
npx jest pool-members-unit.test.js
```

### Build & Deploy
```bash
# Full deployment (recommended for major updates)
firebase deploy

# Deploy only hosting (frontend changes)
firebase deploy --only hosting

# Deploy only functions (backend/cache/API changes)
firebase deploy --only functions

# Deploy with cache system validation
firebase deploy --only functions && firebase deploy --only hosting
```

### Linting & Type Checking
```bash
# TO BE DETERMINED - Ask user for specific commands
# npm run lint
# npm run typecheck
```

## 🔍 Key File Paths

### Project Structure
- **Web Root**: `/Users/tonyweeg/nerdfootball-project/public/` 
- All web files must be placed in `/public` to be accessible via Firebase hosting

### Core Application Files
- `/Users/tonyweeg/nerdfootball-project/public/index.html` - Main application
- `/Users/tonyweeg/nerdfootball-project/public/nerdfootballTheGrid.html` - The Grid
- `/Users/tonyweeg/nerdfootball-project/public/nerdSurvivor.html` - Survivor pool
- `/Users/tonyweeg/nerdfootball-project/public/nerdfootballRules.html` - Rules page


### Configuration
- `/Users/tonyweeg/nerdfootball-project/firestore.rules` - Database security
- `/Users/tonyweeg/nerdfootball-project/firebase.json` - Firebase config

### Test Files
- `test-*-diamond.js` - Diamond Level integration tests
- `*.test.js` - JEST unit tests

## 🎯 Data Paths & Production URLs

### 🚀 Production URLs (Current Live System):
- **Main Hub**: `https://nerdfootball.web.app/nerd-universe.html`
- **Wu-Tang AI Picks**: `https://nerdfootball.web.app/ai-picks-helper.html` (🔥 Firebase cached)
- **Confidence Picks**: `https://nerdfootball.web.app/nerdfootballConfidencePicks.html` (🐝 KILLER BEES)
- **Survivor Picks**: `https://nerdfootball.web.app/NerdSurvivorPicks.html`
- **The Grid**: `https://nerdfootball.web.app/nerdfootballTheGrid.html`
- **Leaderboards**: `https://nerdfootball.web.app/leaderboard.html`

### Pool Members (Authoritative)
```javascript
const poolId = 'nerduniverse-2025';
const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
```


### Legacy Paths (Deprecated - contains ghosts)
```javascript
// DO NOT USE - contains ghost users
const legacyUsersPath = `artifacts/nerdfootball/public/data/nerdfootball_users`;
```

## ✅ Definition of Done

A task is ONLY complete when:
1. **Pre-feature commit**: Working state committed to git before starting
2. Code is written and tested
3. All tests pass (Puppeteer + JEST)
4. **Firebase AI Cache Performance**: Sub-500ms AI prediction loads maintained (🔥 system)
5. **ESPN Cache Performance**: Sub-500ms ESPN response times maintained
6. **KILLER BEES Functionality**: Confidence dropdown filtering working correctly (🐝 system)
7. **Game Credit System**: Proper credit assignment and UI security verified
8. No existing functionality broken
9. Deployed successfully (both hosting and functions if needed)
10. **Human regression test passes**: User confirms feature works correctly
11. **Console Debug Verification**: All systems showing proper debug messages
12. **Post-feature commit & push**: Changes committed and pushed to remote git
13. Ghost users verified eliminated

## 🚀 Emergency Procedures

### If Something Breaks
1. STOP immediately
2. Identify what functionality was lost
3. Restore functionality FIRST
4. Then attempt fix again with more care
5. Test comprehensively before deploying

### If Ghost Users Appear
1. Check pool members source is being used
2. Verify no fallback to legacy users
3. Add specific blocking for ghost user ID
4. Test and verify elimination

## 💎 The Diamond Standard Checklist

Before starting ANY new feature:
- [ ] **Pre-feature git commit**: Current working state committed

Before ANY deployment:
- [ ] Tests written (Puppeteer/JEST)
- [ ] Tests passing
- [ ] **ESPN Cache Performance**: Sub-500ms response times verified
- [ ] **Game Credit System**: Proper credit assignment and UI security tested
- [ ] No functionality lost
- [ ] Ghost users eliminated
- [ ] Pool members used everywhere
- [ ] Existing features preserved
- [ ] Code follows conventions
- [ ] No unnecessary comments/docs
- [ ] TodoWrite updated
- [ ] Ready for production

After human regression testing passes:
- [ ] **Post-feature git commit**: Feature changes committed
- [ ] **Git push**: Changes pushed to remote repository
- [ ] Both firebase deploy and git push succeeded

---

**Remember: "Diamond Level" means no mistakes, comprehensive testing, and absolute precision in everything we do.**
- week 1 of the 2025 season is september 4th - 10th, and it goes for 18 weeks, and ends on january 7, 2026
- remember Nerdfootball works in the 18 week season of the NFL, there either 16, 15, or 14 games per week.  Confidence values can only be 1-n where n=the number of games per week.

---

**Survivor Picks Path**: `/artifacts/nerdfootball/public/data/nerdSurvivor_picks/`