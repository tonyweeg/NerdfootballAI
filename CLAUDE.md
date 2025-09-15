# 💎 CLAUDE.md - Diamond Level Development Standards for NerdFootball

## Core Philosophy
**"Diamond Level" means absolute precision, no mistakes, and comprehensive verification at every step.**

## 🤖 AI DEVELOPMENT TEAM - SPECIALIZED AGENTS
**Use these specialized agents at your discretion for optimal development efficiency:**

### 🚀 Primary Power Duo:
- **god-agent-dev-discipline** - All development work with absolute precision
- **verification-agent** - Claims verification and quality assurance

### 🎯 Specialized Experts:
- **engine-architect-pharoah** - System architecture and technical design
- **fantasy-sports-ux-designer** - UI/UX design and user experience
- **firebase-deployment-specialist** - Production deployments and Firebase expertise
- **project-manager-todd** - Feature planning and project coordination

### 📊 Analytics & Testing:
- **fantasy-user-simulator** - User validation and testing scenarios
- **nfl-analytics-predictor** - Sports analytics and data insights

**Usage**: Call upon these agents using the Task tool when their expertise matches your development needs.

## 🤖 MEGATRON DASHBOARD SYSTEM - v1.0
**CURRENT ULTIMATE STANDARD - ABSOLUTE PERFECTION ACHIEVED**

### 📌 MEGATRON Benchmark Details:
- **Branch**: `main` (MEGATRON perfection)
- **Tag**: `MEGATRON-v1.0` (legendary status reference point)
- **Features**: Perfect admin dashboard with zero console errors
- **Performance**: Sub-500ms ESPN monitoring, bulletproof authentication
- **Commit**: `64e293e` (Dashboard Perfection: Eliminate all console errors)

### 🎯 MEGATRON Dashboard Features (ALL PERFECT):
- **Zero Console Errors**: Eliminated ALL CORS errors and Tailwind warnings
- **Bulletproof Authentication**: Firebase Auth with refresh resilience and fallback
- **Real-time Monitoring**: ESPN cache performance tracking (145ms response)
- **Live Pool Tracking**: 54 members synchronized instantly
- **Analytics Integration**: Real-time dashboard updates with perfect data flow
- **Professional Polish**: Diamond Level v3.0 interface with production-ready UX
- **Admin Security**: Hamburger menu integration with secure credential passing
- **Service Worker Optimization**: Removed problematic cache entries, kept core functionality

### 🛡️ MEGATRON Authentication Pattern:
```javascript
// PRIMARY: URL parameter authentication (initial hamburger menu access)
const adminUID = urlParams.get('admin');
if (adminUID && ADMIN_UIDS.includes(adminUID)) {
    // Clear URL for security, authenticate successfully
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
}

// FALLBACK: Firebase Auth state (refresh/direct access)
await waitForFirebaseAuth();
const currentUser = window.auth.currentUser;
if (currentUser && ADMIN_UIDS.includes(currentUser.uid)) {
    return true; // Authenticated admin via Firebase
}
```

### 🚀 MEGATRON Production URL:
**Admin Dashboard**: https://nerdfootball.web.app/nerdfootball-system-architecture.html

## 🏆 ESPN CACHE SYSTEM BENCHMARK - v3.0
**CURRENT PRODUCTION STANDARD - SUB-500MS ESPN PERFORMANCE**

### 📌 Current Benchmark Details:
- **Branch**: `main` (latest Diamond Fixes)
- **Tag**: `v3.0-espn-cache-benchmark` (permanent reference point)
- **Features**: ESPN Firebase cache system, game credit tracking, UI security
- **Performance**: Sub-500ms ESPN responses, 90x survivor performance improvement
- **Commit**: `f94ffec` (Diamond Fixes: Game credit + UI security complete)

### ✅ ESPN Cache System v3.0 Features (MUST ALL WORK):
- ESPN Firebase cache system with sub-500ms response times
- Game credit system - users get credit when games show FINAL status
- UI security - buttons disabled for completed games (Packers game example)
- Firestore permissions optimized for cache system
- Zero ESPN API timeout disasters (eliminated 14+ second failures)
- Real-time score synchronization with cache invalidation

## 🏆 SURVIVOR SYSTEM BENCHMARK - v2.0
**FALLBACK STANDARD - OPTIMIZED SURVIVOR SYSTEM**

### 📌 Survivor Benchmark Details:
- **Branch**: `survivor-system-benchmark-v2` (protected in GitHub)
- **Tag**: `v2.0-survivor-benchmark` (permanent reference point)
- **Features**: All pool members, correct Win/Lost status, fast loading
- **Performance**: Debug logs removed, ESPN integration optimized
- **Commit**: `acd5067` (optimized survivor system)

### ✅ Survivor System v2.0 Features (MUST ALL WORK):
- Show all pool members in survivor table (no 10-user limit)
- Correct Win/Lost/Not Started status for all games
- Fast loading with no debug log spam
- Proper ESPN team name normalization (NE Patriots <-> New England Patriots)
- Simple table format: User | Team Picked | Status
- No Firebase caching errors or document path issues

## 🏆 GOLDEN BENCHMARK STANDARD - v1.0
**FALLBACK STANDARD IF SURVIVOR SYSTEM BREAKS**

### 📌 Benchmark Details:
- **Branch**: `golden-benchmark-v1` (protected in GitHub)
- **Tag**: `v1.0-golden` (permanent reference point)
- **Documentation**: `GOLDEN-BENCHMARK.md` (feature checklist)
- **Test Suite**: `test-golden-benchmark.js` (automated verification)
- **Commit**: `3d73d9b` (b474270 + confidence fix)

### 🛡️ Development Workflow - ALWAYS FOLLOW:

#### Before ANY new development:
```bash
git checkout main
git checkout -b feature/new-feature
```

#### Before ANY deployment:
```bash
# Test ESPN cache system and game credit functionality
# Verify sub-500ms performance and UI security features
firebase deploy --only hosting
firebase deploy --only functions
```

#### If ANYTHING breaks:
```bash
# Instant recovery to current benchmark
git checkout main
firebase deploy --only hosting
firebase deploy --only functions
```

#### To compare changes:
```bash
# See what's different from current benchmark
git diff main
```

#### If ESPN cache system fails:
```bash
# Fallback to survivor system benchmark
git checkout survivor-system-benchmark-v2
firebase deploy --only hosting
```

#### If complete system failure:
```bash
# Emergency fallback to golden standard
git checkout golden-benchmark-v1
firebase deploy --only hosting
```

### ✅ Golden Standard Features (MUST ALL WORK):
- Hamburger menu navigation (top-right, slides from right)
- Confidence pool with locked game protection
- The Grid with pre-game security
- Survivor pool functionality
- Admin features (user management, pool settings)
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

### 🚨 Storage Bucket Management:
**PROBLEM**: NFL logos exist in old bucket (`nerdfootball.firebasestorage.app`) but Firebase config uses new bucket (`nerdfootball.appspot.com`)

**SOLUTION APPLIED**: Remove cross-bucket asset caching from Service Worker to eliminate CORS errors:
```javascript
// BEFORE (caused CORS errors):
const HELMET_URLS = [
  'https://firebasestorage.googleapis.com/v0/b/nerdfootball.firebasestorage.app/o/nfl-logos%2F...'
];

// AFTER (clean, no errors):
const urlsToCache = [
  '/',
  '/manifest.json',
  '/gameStateCache.js'
];
```

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

### 🚨 CORS Errors from Service Worker
**SYMPTOM**: `Access to fetch at 'https://firebasestorage.googleapis.com/...' has been blocked by CORS policy`
**ROOT CAUSE**: Service Worker trying to cache assets from different Firebase project
**SOLUTION**: Remove cross-bucket URLs from Service Worker cache list

### 🚨 "Cannot set properties of null (setting 'textContent')"
**SYMPTOM**: JavaScript errors in dashboard console
**ROOT CAUSE**: Missing DOM elements that JavaScript expects
**SOLUTION**: Add missing elements with proper IDs:
```html
<div class="text-xs ocean-text-muted mt-1" id="espn-cache-status-detail">Cache details loading...</div>
```

### 🚨 Tailwind CSS Production Warnings
**SYMPTOM**: `cdn.tailwindcss.com should not be used in production`
**ROOT CAUSE**: Development CDN warning in production
**SOLUTION**: Add production config override:
```html
<script>
    tailwind.config = {
        corePlugins: { preflight: true }
    }
</script>
```

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
# Run Puppeteer tests
node test-picks-summary-diamond.js
node test-datetime-security-diamond.js
node test-pool-members-diamond.js

# Run JEST tests
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

### ESPN Cache System Files
- `/Users/tonyweeg/nerdfootball-project/public/espnCacheManager.js` - Frontend cache manager
- `/Users/tonyweeg/nerdfootball-project/functions/espnNerdApi.js` - Backend ESPN API integration
- `/Users/tonyweeg/nerdfootball-project/functions/realtimeGameSync.js` - Real-time synchronization
- `/Users/tonyweeg/nerdfootball-project/functions/survivorCacheUpdater.js` - Survivor cache optimization

### Bundle Architecture Files
- `/Users/tonyweeg/nerdfootball-project/public/core-bundle.js` - Core application functionality
- `/Users/tonyweeg/nerdfootball-project/public/confidence-bundle.js` - Confidence pool features
- `/Users/tonyweeg/nerdfootball-project/public/bundle-dependency-gate.js` - Bundle loading coordination

### Configuration
- `/Users/tonyweeg/nerdfootball-project/firestore.rules` - Database security
- `/Users/tonyweeg/nerdfootball-project/firebase.json` - Firebase config

### Test Files
- `test-*-diamond.js` - Diamond Level integration tests
- `*.test.js` - JEST unit tests

## 🎯 Data Paths

### Pool Members (Authoritative)
```javascript
const poolId = 'nerduniverse-2025';
const poolMembersPath = `artifacts/nerdfootball/pools/${poolId}/metadata/members`;
```

### ESPN Cache System (Primary Performance)
```javascript
// ESPN Firebase cache - Sub-500ms performance
const espnCachePath = 'cache/espn_current_data';
const teamResultsKey = `${normalizedTeamName}_${weekNumber}`;
const cacheMaxAge = 6 * 60 * 60 * 1000; // 6 hours
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
4. **ESPN Cache Performance**: Sub-500ms response times maintained
5. **Game Credit System**: Proper credit assignment and UI security verified
6. No existing functionality broken
7. Deployed successfully (both hosting and functions if needed)
8. **Human regression test passes**: User confirms feature works correctly
9. **Post-feature commit & push**: Changes committed and pushed to remote git
10. Ghost users verified eliminated

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