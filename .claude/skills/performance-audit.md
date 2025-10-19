# Performance Audit Skill

Comprehensive performance validation specialist ensuring all NerdFootball performance targets are met.

## Performance Philosophy

**"Measure everything. Verify everything. Sub-500ms or it's broken."**

## Performance Targets

### 🎯 Critical Performance Standards

| System | Target | Status | Benchmark |
|--------|--------|--------|-----------|
| ESPN Cache | <500ms | ✓ | Sub-500ms achieved v3.0 |
| AI Predictions | 200-500ms | ✓ | 99% faster than uncached |
| UI Interactions | <100ms | ✓ | User perception threshold |
| Survivor Pool | Sub-100ms | ✓ | 90x improvement achieved |
| API Responses | <500ms | ✓ | Cloud Functions optimized |

### 📊 Performance Degradation Thresholds

**WARNING** levels (investigate):
- ESPN cache: 500-1000ms
- AI predictions: 500-1000ms
- UI interactions: 100-200ms
- Survivor pool: 100-200ms

**CRITICAL** levels (immediate fix required):
- ESPN cache: >1000ms
- AI predictions: >1000ms
- UI interactions: >200ms
- Survivor pool: >200ms

## Performance Audit Execution

### 1. ESPN Cache Performance

**Test URLs:**
```
https://nerdfootball.web.app/help-ai-picks.html
https://nerdfootball.web.app/nerdfootballConfidencePicks.html
https://nerdfootball.web.app/NerdSurvivorPicks.html
https://nerdfootball.web.app/nerdfootballTheGrid.html
```

**Audit Steps:**
```javascript
// Open browser console on each page
// Filter by "ESPN" or "🔥 CACHE"

// Look for timing logs:
console.time('ESPN_CACHE_LOAD');
const espnData = await loadESPNCache();
console.timeEnd('ESPN_CACHE_LOAD'); // Should show <500ms

// Verify cache hits:
console.log('🔥 CACHE_HIT:', true);
console.log('📊 ESPN_LOAD_TIME:', `${duration}ms`);
```

**Validation Checklist:**
- [ ] First load: <2000ms (acceptable for cache miss)
- [ ] Cached load: <500ms (REQUIRED)
- [ ] Cache-busting working (`?t=${Date.now()}`)
- [ ] Cache-Control headers present
- [ ] No timeout disasters
- [ ] Force refresh available (`?force=true`)

### 2. AI Predictions Performance

**Test URLs:**
```
https://nerdfootball.web.app/help-ai-picks.html
https://nerdfootball.web.app/ai-picks-helper.html
```

**Audit Steps:**
```javascript
// Open Wu-Tang AI Picks page
// Check console for timing:

console.log('🤖 AI_PREDICTIONS_LOAD:', `${duration}ms`);
// REQUIRED: 200-500ms for cache hit

// Verify cache path:
const aiCachePath = 'artifacts/nerdfootball/pools/nerduniverse-2025/cache/latest-ai-intel-sheet';

// Check TTL: 15 minutes
const cacheAge = Date.now() - cacheTimestamp;
console.log('🔥 CACHE_AGE:', `${cacheAge / 1000 / 60}min`);
// Should be <15min for cache hit
```

**Validation Checklist:**
- [ ] Cache hit: 200-500ms (REQUIRED)
- [ ] Cache miss: 5-10s (acceptable, triggers refresh)
- [ ] Cache TTL: 15 minutes
- [ ] Cache path correct
- [ ] Firebase cache system working
- [ ] No API timeout errors

### 3. UI Interactions Performance

**Test Pages:**
```
Confidence Pool - Pick selection
Survivor Pool - Team selection
The Grid - Pick submission
Leaderboards - Sorting/filtering
```

**Audit Steps:**
```javascript
// Measure user interaction response times

// Confidence dropdown change:
console.time('CONFIDENCE_UPDATE');
// User selects confidence value
console.timeEnd('CONFIDENCE_UPDATE');
// REQUIRED: <100ms

// Survivor team selection:
console.time('SURVIVOR_PICK');
// User selects team
console.timeEnd('SURVIVOR_PICK');
// REQUIRED: <100ms

// Grid pick submission:
console.time('GRID_SUBMIT');
// User submits pick
console.timeEnd('GRID_SUBMIT');
// REQUIRED: <100ms (UI feedback)
```

**Validation Checklist:**
- [ ] Button clicks: <100ms visual feedback
- [ ] Dropdown changes: <100ms update
- [ ] Form submissions: <100ms UI response
- [ ] Filter/sort operations: <100ms
- [ ] Modal open/close: <100ms
- [ ] Navigation: <100ms transition

### 4. Survivor Pool Load Performance

**Test URL:**
```
https://nerdfootball.web.app/NerdSurvivorPicks.html
```

**Audit Steps:**
```javascript
// Open Survivor Pool page with DevTools Performance tab

// Measure initial load:
performance.mark('survivor-start');
// Page loads
performance.mark('survivor-end');
performance.measure('survivor-load', 'survivor-start', 'survivor-end');

// Check measurement:
const measure = performance.getEntriesByName('survivor-load')[0];
console.log('💀 SURVIVOR_LOAD:', `${measure.duration}ms`);
// REQUIRED: <100ms

// Verify no N+1 queries:
// Should see batch query, not individual user queries
```

**Validation Checklist:**
- [ ] Initial load: <100ms (90x improvement achieved)
- [ ] No N+1 query patterns
- [ ] Batch data loading
- [ ] Efficient DOM rendering
- [ ] No unnecessary re-renders

### 5. API Response Performance

**Test Cloud Functions:**
```
getweeklyleaderboard
getsurvivorpooldata
espnNerdApi
```

**Audit Steps:**
```bash
# Test Cloud Function response times
curl -w "@curl-format.txt" -o /dev/null -s \
  "https://getweeklyleaderboard-np7uealtnq-uc.a.run.app?week=7"

# curl-format.txt contents:
time_namelookup:  %{time_namelookup}s\n
time_connect:  %{time_connect}s\n
time_starttransfer:  %{time_starttransfer}s\n
time_total:  %{time_total}s\n
```

**Validation Checklist:**
- [ ] Total response time: <500ms
- [ ] Time to first byte: <200ms
- [ ] No cold start delays (>3s)
- [ ] Memory usage optimized (512MB)
- [ ] Timeout config: 60s (safety)

## Performance Audit Report Template

```markdown
# Performance Audit Report
**Date:** [Current date]
**Auditor:** Claude Code - Performance Audit Skill

## Executive Summary
- ✅ [X] systems meeting targets
- ⚠️ [Y] systems with warnings
- 🔴 [Z] systems critical

## Detailed Results

### ESPN Cache Performance
- **Target:** <500ms
- **Actual:** [measurement]ms
- **Status:** ✅ PASS / ⚠️ WARNING / 🔴 CRITICAL
- **Notes:** [observations]

### AI Predictions Performance
- **Target:** 200-500ms
- **Actual:** [measurement]ms
- **Status:** ✅ PASS / ⚠️ WARNING / 🔴 CRITICAL
- **Notes:** [observations]

### UI Interactions Performance
- **Target:** <100ms
- **Actual:** [measurement]ms
- **Status:** ✅ PASS / ⚠️ WARNING / 🔴 CRITICAL
- **Notes:** [observations]

### Survivor Pool Performance
- **Target:** Sub-100ms
- **Actual:** [measurement]ms
- **Status:** ✅ PASS / ⚠️ WARNING / 🔴 CRITICAL
- **Notes:** [observations]

### API Response Performance
- **Target:** <500ms
- **Actual:** [measurement]ms
- **Status:** ✅ PASS / ⚠️ WARNING / 🔴 CRITICAL
- **Notes:** [observations]

## Issues Found
1. [Issue description]
   - **Impact:** [user impact]
   - **Root cause:** [technical cause]
   - **Fix:** [recommended solution]

## Recommendations
1. [Performance improvement suggestion]
2. [Optimization opportunity]
3. [Technical debt to address]

## Performance Trends
- **Improvement since last audit:** [percentage]
- **Degradation areas:** [list]
- **Stable systems:** [list]

## Action Items
- [ ] [Critical fix required]
- [ ] [Optimization task]
- [ ] [Monitoring improvement]
```

## Automated Performance Testing

**Script Template:**
```javascript
// performance-test.js
const puppeteer = require('puppeteer');

async function auditPerformance() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // ESPN Cache Test
    await page.goto('https://nerdfootball.web.app/help-ai-picks.html');
    const espnMetrics = await page.evaluate(() => {
        return performance.getEntriesByType('measure')
            .find(m => m.name.includes('ESPN'));
    });

    console.log('📊 ESPN Cache:', espnMetrics.duration, 'ms');
    console.assert(espnMetrics.duration < 500, 'ESPN cache too slow!');

    // Add more tests...

    await browser.close();
}

auditPerformance();
```

## Performance Monitoring Setup

**Browser Console Snippet:**
```javascript
// Add to page for continuous monitoring
const perfMonitor = {
    marks: {},

    start(label) {
        this.marks[label] = performance.now();
    },

    end(label, target) {
        const duration = performance.now() - this.marks[label];
        const status = duration < target ? '✅' : '🔴';
        console.log(`${status} ${label}: ${duration.toFixed(2)}ms (target: ${target}ms)`);
        return duration;
    }
};

// Usage:
perfMonitor.start('ESPN_LOAD');
await loadESPNData();
perfMonitor.end('ESPN_LOAD', 500); // ✅ ESPN_LOAD: 287.45ms (target: 500ms)
```

## Performance Degradation Alerts

**When to Alert:**
- ESPN cache >500ms on 3+ consecutive loads
- AI predictions >500ms consistently
- UI interactions >100ms for any operation
- Survivor pool >100ms initial load
- API responses >500ms average

**Investigation Steps:**
1. Check browser DevTools Performance tab
2. Review Network tab for slow requests
3. Inspect Firestore query times
4. Check Cloud Functions logs
5. Verify cache system functioning
6. Measure before/after code changes

## Common Performance Issues

**Issue: ESPN cache slow (>500ms)**
- **Cause:** Cache miss or expired cache
- **Fix:** Force cache refresh, verify TTL settings

**Issue: UI interactions laggy (>100ms)**
- **Cause:** Unnecessary re-renders or heavy computations
- **Fix:** Debounce inputs, optimize render logic

**Issue: Survivor pool slow load**
- **Cause:** N+1 query pattern
- **Fix:** Implement batch queries

**Issue: API timeouts**
- **Cause:** Cold start or heavy computation
- **Fix:** Increase memory, optimize queries, add caching

## Success Criteria

Performance audit is successful when:
1. ✅ All systems meet target thresholds
2. ✅ No critical performance issues
3. ✅ Performance report generated
4. ✅ Trends analyzed and documented
5. ✅ Recommendations provided
6. ✅ User notified of audit results

## Debug Patterns
```javascript
console.log('📊 PERFORMANCE_AUDIT:', 'Starting audit');
console.log('✅ ESPN_CACHE:', `${duration}ms - PASS`);
console.log('⚠️ UI_INTERACTION:', `${duration}ms - WARNING`);
console.log('🔴 API_RESPONSE:', `${duration}ms - CRITICAL`);
```

## Diamond Level Standard

**"Sub-500ms is not a goal. It's a requirement. Measure, verify, enforce."**
