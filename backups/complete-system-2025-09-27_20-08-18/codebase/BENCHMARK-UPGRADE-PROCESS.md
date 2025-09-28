# 📈 Benchmark Upgrade Process

## When to Create a New Benchmark

Create a new golden benchmark when you have:
- ✅ Added significant new features that work perfectly
- ✅ All v1.0 features still working
- ✅ Thoroughly tested in production for at least a week
- ✅ No known bugs or issues

## How to Upgrade the Benchmark

### 1. Verify Current State is Golden
```bash
# Run all tests
node test-golden-benchmark.js

# Verify in production for a week
# Document any new features added since v1.0
```

### 2. Create New Benchmark
```bash
# Create new benchmark branch from current stable
git checkout main  # or wherever your stable code is
git checkout -b golden-benchmark-v2

# Tag the new version
git tag -a v2.0-golden -m "Golden Benchmark v2.0: [List major additions]"

# Push to remote
git push -u origin golden-benchmark-v2
git push origin v2.0-golden
```

### 3. Update CLAUDE.md
Replace the benchmark section with new details:
```markdown
## 🏆 GOLDEN BENCHMARK STANDARD - v2.0  <!-- Update version -->
**THIS IS THE PRODUCTION STANDARD - NEVER GO BELOW THIS**

### 📌 Benchmark Details:
- **Branch**: `golden-benchmark-v2`  <!-- Update branch name -->
- **Tag**: `v2.0-golden`  <!-- Update tag -->
- **Documentation**: `GOLDEN-BENCHMARK.md` 
- **Test Suite**: `test-golden-benchmark.js`
- **Commit**: `[new commit hash]`  <!-- Update commit -->

### ✅ Golden Standard Features (MUST ALL WORK):
- [Previous v1.0 features]
- [NEW FEATURE 1]  <!-- Add new features -->
- [NEW FEATURE 2]
```

### 4. Update Test Suite
Add tests for new features:
```javascript
// In test-golden-benchmark.js
// Add new tests for v2.0 features
await test('New Feature X works', async () => {
  // Test implementation
});
```

### 5. Archive Previous Benchmark
The old benchmark remains as historical reference:
- Branch `golden-benchmark-v1` stays in GitHub
- Tag `v1.0-golden` remains permanent
- Can always roll back if needed: `git checkout v1.0-golden`

## Version History

### v1.0-golden (January 7, 2025)
- Initial golden benchmark
- Hamburger menu navigation
- Confidence pool with swap protection
- The Grid with security
- Survivor pool
- Admin features
- Ghost user elimination

### v2.0-golden (Future)
- All v1.0 features +
- [New features to be added]

## Quick Reference

### Current Golden Benchmark
```bash
# Always check CLAUDE.md for current version
git checkout golden-benchmark-v2  # or whatever is current
```

### Emergency Rollback
```bash
# To any previous golden version
git checkout v1.0-golden  # or v2.0-golden, etc.
firebase deploy --only hosting
```

### Compare Versions
```bash
# See what changed between benchmarks
git diff v1.0-golden v2.0-golden
```

## Important Notes

1. **CLAUDE.md is the source of truth** - Always update it with current benchmark
2. **Keep all benchmark branches** - Never delete old benchmarks
3. **Test thoroughly** - New benchmark must be MORE stable than previous
4. **Document changes** - List what's new in each version
5. **Backwards compatible** - New features shouldn't break old ones

## Benchmark Naming Convention

- Branches: `golden-benchmark-v[X]`
- Tags: `v[X].0-golden`
- Major versions only (v1, v2, v3)
- Minor fixes don't get new benchmarks

This ensures CLAUDE.md always points to your current "home base" while preserving all previous safe states!