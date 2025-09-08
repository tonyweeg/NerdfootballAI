# 💎 CLAUDE.md - Diamond Level Development Standards for NerdFootball

## Core Philosophy
**"Diamond Level" means absolute precision, no mistakes, and comprehensive verification at every step.**

## 🏆 SURVIVOR SYSTEM BENCHMARK - v2.0
**CURRENT PRODUCTION STANDARD - OPTIMIZED SURVIVOR SYSTEM**

### 📌 Current Benchmark Details:
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
git checkout survivor-system-benchmark-v2
git checkout -b feature/new-feature
```

#### Before ANY deployment:
```bash
# Test survivor system functionality
# Verify all pool members show with correct Win/Lost status
firebase deploy --only hosting
```

#### If ANYTHING breaks:
```bash
# Instant recovery to current benchmark
git checkout survivor-system-benchmark-v2
firebase deploy --only hosting
```

#### To compare changes:
```bash
# See what's different from current benchmark
git diff survivor-system-benchmark-v2
```

#### If survivor system completely fails:
```bash
# Fallback to golden standard
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
- **Always scan for similar patterns** when fixing performance issues
- **Check for N+1 query problems** in any database-related code
- **Search codebase for duplicate inefficient logic** before concluding refactoring
- **Seek user approval** before implementing broader performance optimizations
- **Document performance improvements** with before/after metrics
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
1. **Picks Summary**: "Your Active Picks" and "Season Leaderboard"
2. **The Grid**: Must show picks only after games start (security)
3. **URL Routing**: Parameters like `?view=rules` must work
4. **Admin Functions**: Add/remove users from pools
5. **Pool Settings**: Must display correct users
6. **Authentication**: Users must be able to sign in/out

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
# Deploy to Firebase
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions
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

## 🎯 Data Paths

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
4. No existing functionality broken
5. Deployed successfully
6. **Human regression test passes**: User confirms feature works correctly
7. **Post-feature commit & push**: Changes committed and pushed to remote git
8. Ghost users verified eliminated

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