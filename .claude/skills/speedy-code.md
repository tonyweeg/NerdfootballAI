# Speedy Code Skill

Performance optimization specialist focused on sub-100ms UI interactions and efficient code patterns for NerdFootball.

## Performance Philosophy

**"Fast code is good code. Efficient code is Diamond Level code."**

### 🎯 Performance Targets
- **UI Interactions**: <100ms
- **ESPN Cache**: <500ms
- **AI Predictions**: 200-500ms
- **Survivor Pool Load**: Sub-100ms (90x improvement achieved)
- **API Responses**: <500ms

## Optimization Techniques

### 🔥 Cache-First Architecture
```javascript
// ALWAYS check cache before expensive operations
const cachedData = await cacheManager.load('ai-predictions', db);
if (cachedData && !cacheManager.isExpired('ai-predictions')) {
    return cachedData; // 200-500ms instead of 5-10s
}
```

### ⚡ Eliminate N+1 Query Problems
```javascript
// BAD: N+1 queries
for (const user of users) {
    const picks = await getDocs(collection(db, `users/${user.id}/picks`));
}

// GOOD: Batch query
const allPicks = await getDocs(collection(db, 'picks'));
const picksByUser = allPicks.docs.reduce((acc, doc) => {
    acc[doc.data().userId] = doc.data();
    return acc;
}, {});
```

### 🚀 Parallel Operations
```javascript
// BAD: Sequential (slow)
const data1 = await fetchData1();
const data2 = await fetchData2();
const data3 = await fetchData3();

// GOOD: Parallel (fast)
const [data1, data2, data3] = await Promise.all([
    fetchData1(),
    fetchData2(),
    fetchData3()
]);
```

### 📦 Efficient Data Structures
```javascript
// BAD: Array lookups O(n)
const user = users.find(u => u.id === userId);

// GOOD: Map lookups O(1)
const userMap = new Map(users.map(u => [u.id, u]));
const user = userMap.get(userId);
```

### 💾 In-Memory Caching
```javascript
// Cache expensive calculations
const cache = new Map();
function expensiveOperation(key) {
    if (cache.has(key)) return cache.get(key);
    const result = performExpensiveCalculation(key);
    cache.set(key, result);
    return result;
}
```

## Performance Patterns

### Debouncing User Input
```javascript
let debounceTimer;
function handleInput(value) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        processInput(value);
    }, 300);
}
```

### Lazy Loading
```javascript
// Load bundles only when needed
const loadSurvivorBundle = async () => {
    if (!window.survivorBundle) {
        await loadScript('./js/bundles/survivor-bundle.js');
    }
};
```

### DOM Batch Updates
```javascript
// BAD: Multiple reflows
for (const item of items) {
    container.appendChild(createItem(item));
}

// GOOD: Single reflow
const fragment = document.createDocumentFragment();
for (const item of items) {
    fragment.appendChild(createItem(item));
}
container.appendChild(fragment);
```

## Optimization Workflow

### 1. Measure First
```javascript
console.time('operation');
await expensiveOperation();
console.timeEnd('operation');
```

### 2. Identify Bottlenecks
- Use Chrome DevTools Performance tab
- Check Network tab for slow requests
- Monitor Firestore query times

### 3. Apply Optimizations
- Cache aggressively
- Batch operations
- Eliminate redundant queries
- Use efficient data structures

### 4. Verify Improvement
- Compare before/after metrics
- Document performance gains
- Update performance targets in CLAUDE.md

## Refactoring Standards

### When Fixing Performance Issues
- **ALWAYS scan for similar patterns** across codebase
- **Check for N+1 query problems** in database code
- **Search entire codebase** for duplicate inefficient logic
- **Seek user approval** before broader optimizations
- **Document improvements** with before/after metrics

### Example Refactoring
```javascript
// Found slow pattern in file A:
const userData = await getDocs(collection(db, `users/${userId}/data`));

// Search codebase for similar:
grep -r "getDocs(collection(db, \`users/\${" .

// Refactor all instances to batch query pattern
```

## Performance Checklist
- [ ] Cache-first for all expensive operations
- [ ] No N+1 query patterns
- [ ] Parallel operations where possible
- [ ] Efficient data structures (Map/Set over Array)
- [ ] Debounce user inputs
- [ ] Batch DOM updates
- [ ] Lazy load heavy bundles
- [ ] Measure before and after
- [ ] Document performance gains
- [ ] Update CLAUDE.md targets

## Debug Patterns
```javascript
console.log('⚡ PERFORMANCE:', `${duration}ms`);
console.log('🔥 CACHE_HIT:', true);
console.log('📊 BATCH_SIZE:', items.length);
```
