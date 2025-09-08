# 🏆 DIAMOND QA: Global Week Management System Regression Test Checklist

## Critical Production Deployment Validation
**Environment**: https://nerdfootball.web.app  
**Test Suite**: Global Week Management System  
**Architecture Change**: Date-based → Data-driven week detection  

---

## 🔬 PHASE 1: Global Week System Validation

### Browser Console Testing
1. **Load Manual Test Suite**:
   ```javascript
   // Copy contents of manual-week-system-validation.js into browser console
   // Or load via: 
   fetch('/manual-week-system-validation.js').then(r=>r.text()).then(eval)
   ```

2. **Execute Core Validation**:
   ```javascript
   diamondQA.runAllManualTests()
   ```

3. **Expected Results**:
   - ✅ `window.currentWeek` defined and in range 1-18
   - ✅ `window.nextWeek` and `window.previousWeek` properly clamped
   - ✅ `window.weekManager` initialized successfully
   - ✅ No console errors related to week detection

---

## 🏈 PHASE 2: Survivor Results Page Critical Test

### Navigation Test
1. **Navigate to**: `https://nerdfootball.web.app/?view=survivor`
2. **Wait for load**: 5+ seconds for initialization
3. **Execute**: `diamondQA.validateSurvivorPage()`

### Visual Validation Checklist
- [ ] **Pool Summary Display**: Shows correct "Current Week" (not defaulting to 18)
- [ ] **Still Alive vs Eliminated Counts**: Accurate numbers displayed
- [ ] **Game Matching**: No "game not found" errors in console
- [ ] **Week Display**: Consistent week number across all page elements

### Expected vs Actual
| Element | Before (Week 18 Bug) | After (Fixed) |
|---------|---------------------|---------------|
| Current Week Display | Week 18 | Correct current week |
| Pool Summary Counts | Incorrect | Accurate elimination counts |
| Console Errors | "game not found" | Clean console |
| Game ID Matching | 101,103,111 missing | Games found in results |

---

## 🔄 PHASE 3: Cross-Page Consistency Validation

### Page-by-Page Testing
Test each page and record `window.currentWeek` value:

1. **Main Page**: `https://nerdfootball.web.app/`
   - Execute: `diamondQA.validateGlobalWeekVariables()`
   - Record: `window.currentWeek = ___`

2. **Survivor Results**: `https://nerdfootball.web.app/?view=survivor`
   - Execute: `diamondQA.validateGlobalWeekVariables()`
   - Record: `window.currentWeek = ___`

3. **Confidence Pool**: `https://nerdfootball.web.app/?view=confidence`
   - Execute: `diamondQA.validateGlobalWeekVariables()`
   - Record: `window.currentWeek = ___`

4. **The Grid**: `https://nerdfootball.web.app/nerdfootballTheGrid.html`
   - Execute: `diamondQA.validateGlobalWeekVariables()`
   - Record: `window.currentWeek = ___`

### Consistency Validation
- [ ] **All pages show identical `window.currentWeek` value**
- [ ] **No week-related console errors on any page**
- [ ] **WeekManager initialized successfully on all pages**

---

## ⚡ PHASE 4: Performance and Error Monitoring

### Console Error Monitoring
```javascript
// Run on each critical page
diamondQA.monitorConsoleErrors()
// Wait 10 seconds, review results
```

### Performance Validation
```javascript
// Execute on main pages
diamondQA.analyzePerformance()
```

### Critical Error Patterns to Watch For:
- ❌ `game not found in results`
- ❌ `getCurrentWeek is not defined`
- ❌ `weekManager initialization failed`
- ❌ `Cannot read property 'currentWeek' of undefined`

---

## 🎯 PHASE 5: Functional Regression Testing

### Core Feature Validation
Test these critical features remain functional:

#### Survivor Pool Functionality
- [ ] **User picks display correctly**
- [ ] **Elimination logic works without errors**
- [ ] **Pool member counts accurate**
- [ ] **Game results matching picks**

#### Confidence Pool
- [ ] **Current week games display**
- [ ] **User confidence picks load**
- [ ] **Leaderboard calculations correct**

#### The Grid
- [ ] **Pre-game security working**
- [ ] **Games appear only after start time**
- [ ] **Week-appropriate games shown**

#### Admin Functions
- [ ] **User management still works**
- [ ] **Pool settings reflect correct users**
- [ ] **No ghost users (okl4sw2aDhW3yKpOfOwe5lH7OQj1) appear**

---

## 🚨 PHASE 6: Critical Failure Recovery Test

### Week Refresh Functionality
```javascript
// Test recovery from failed week detection
diamondQA.testWeekRefresh()
```

### Expected Behavior:
- ✅ **Graceful fallback**: If detection fails, defaults to week 1
- ✅ **Recovery capability**: Manual refresh updates week correctly
- ✅ **No breaking errors**: System continues functioning with fallback

---

## 📊 DIAMOND STANDARDS COMPLIANCE

### Pass/Fail Criteria

#### ✅ PASSED REQUIREMENTS:
- [ ] All global week variables defined and in valid range (1-18)
- [ ] Survivor results page shows correct week without console errors
- [ ] Cross-page week consistency maintained
- [ ] No regression in existing functionality
- [ ] Performance within acceptable limits (<10s page load)
- [ ] Console free of critical week-related errors

#### ❌ CRITICAL FAILURE CONDITIONS:
- Console errors: "game not found", "getCurrentWeek undefined"
- Incorrect week display (showing 18 when not week 18)
- Cross-page week inconsistency
- Broken survivor elimination functionality
- Ghost users appearing in any display

---

## 🏁 FINAL VALIDATION REPORT

### Test Execution Summary
| Phase | Test | Status | Notes |
|-------|------|---------|-------|
| 1 | Global Week Variables | ⚪ PENDING | |
| 2 | Survivor Results Page | ⚪ PENDING | |
| 3 | Cross-Page Consistency | ⚪ PENDING | |
| 4 | Performance/Errors | ⚪ PENDING | |
| 5 | Functional Regression | ⚪ PENDING | |
| 6 | Failure Recovery | ⚪ PENDING | |

### Overall Production Readiness
- **Status**: ⚪ PENDING VALIDATION
- **Critical Issues**: None identified / [List issues]
- **Recommendation**: HOLD / APPROVE for production

---

## 📋 TESTER INSTRUCTIONS

1. **Open**: https://nerdfootball.web.app in Chrome/Firefox
2. **Load**: Copy manual-week-system-validation.js into console
3. **Execute**: Each phase systematically
4. **Record**: Results in this checklist
5. **Report**: Any failures immediately

**Timeline**: Complete all phases within 30 minutes  
**Escalation**: Report critical failures immediately to development team