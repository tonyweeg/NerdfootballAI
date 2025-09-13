# 💎 CLAUDE.md - Diamond Level Development Standards for NerdFootball

## Core Philosophy
**"Diamond Level" means absolute precision, no mistakes, and comprehensive verification at every step.**

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