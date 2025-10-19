# NerdFootball Deploy Skill

Complete deployment workflow automation following Diamond Level standards.

## Deployment Philosophy

**"Deploy with confidence. Test before deploy. Verify after deploy. Never break production."**

## Full Deployment Workflow

### Pre-Deployment Phase

**1. Code Quality Check**
```bash
# Run linting (if available)
npm run lint

# Run type checking (if available)
npm run typecheck
```

**2. Git Status Verification**
```bash
git status
git branch  # Verify on correct branch
```

**3. Pre-Deployment Commit**
```bash
git add .
git commit -m "Pre-deploy: Working state before [feature name]

- [List of changes]
- [Files affected]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Deployment Phase

**4. Firebase Deployment**
```bash
# Full deployment (hosting + functions)
firebase deploy

# OR specific deployments:
# firebase deploy --only hosting      # Frontend only
# firebase deploy --only functions    # Backend only
```

**5. Deployment Verification**
- Check deployment success message
- Note deployment URLs
- Verify timestamp

### Post-Deployment Phase

**6. Production Testing**

Test critical features in production:
- [ ] **Main Hub**: https://nerdfootball.web.app/nerd-universe.html
  - [ ] Hamburger menu navigation
  - [ ] Authentication working
  - [ ] Admin panel accessible

- [ ] **Wu-Tang AI Picks**: https://nerdfootball.web.app/help-ai-picks.html
  - [ ] AI predictions loading (200-500ms)
  - [ ] Firebase cache working (<500ms)

- [ ] **Confidence Pool**: https://nerdfootball.web.app/nerdfootballConfidencePicks.html
  - [ ] 🐝 KILLER BEES filtering working
  - [ ] Locked games protected
  - [ ] Pick submission functional

- [ ] **Survivor Pool**: https://nerdfootball.web.app/NerdSurvivorPicks.html
  - [ ] Sub-100ms load times
  - [ ] Pick submission working

- [ ] **The Grid**: https://nerdfootball.web.app/nerdfootballTheGrid.html
  - [ ] Pre-game security active
  - [ ] Post-game reveal working

- [ ] **Leaderboards**: https://nerdfootball.web.app/leaderboard.html
  - [ ] Season leaderboard displaying
  - [ ] Weekly leaderboard accurate
  - [ ] No ghost users

**7. Performance Verification**
```javascript
// Open browser console on each page
// Check for performance metrics:
// - ESPN cache: <500ms ✓
// - AI predictions: 200-500ms ✓
// - UI interactions: <100ms ✓
```

**8. Ghost User Check**
- Verify `okl4sw2aDhW3yKpOfOwe5lH7OQj1` not appearing
- Check all 9 user displays use pool members
- Validate user lists across all pages

**9. Console Error Check**
- Open DevTools on each critical page
- Check for console errors
- Verify no authentication issues
- Confirm cache systems working

### Git Finalization Phase

**10. Post-Deployment Commit**
```bash
git add .
git commit -m "Deploy complete: [Feature name]

✅ Deployed to production
✅ All tests passing
✅ Performance targets met
✅ Ghost users eliminated

Changes:
- [Specific changes deployed]
- [Files affected]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

**11. Push to Remote**
```bash
git push origin main  # Or feature branch
```

**12. Verify Push Success**
```bash
git log -1  # Verify commit pushed
# Check GitHub to confirm
```

## Deployment Checklist

### Pre-Deploy
- [ ] Code quality checks passed
- [ ] Git status reviewed
- [ ] Working state committed
- [ ] On correct branch

### Deploy
- [ ] Firebase deploy command executed
- [ ] Deployment successful message received
- [ ] URLs noted

### Post-Deploy
- [ ] All critical pages tested
- [ ] Performance targets met (<500ms caches)
- [ ] No ghost users appearing
- [ ] No console errors
- [ ] Authentication working
- [ ] Cache systems functional

### Git Finalize
- [ ] Post-deploy commit created
- [ ] Pushed to remote
- [ ] Verified on GitHub

## Emergency Rollback

If deployment breaks production:

```bash
# 1. Identify last working state
git log --oneline  # Find last good commit

# 2. Rollback to safe tag
git checkout SAFE-WEEKLIES  # Or other known-good tag

# 3. Re-deploy
firebase deploy

# 4. Verify recovery
# Test production URLs

# 5. Fix issue on branch
git checkout -b fix/deployment-issue
# Make fixes
# Test thoroughly
# Deploy again
```

## Known Safe Rollback Points

- `PAPYRUS-NERDS-v1.0` - Complete documentation system
- `SAFE-WEEKLIES` - Cache-busting checkpoint (2025-10-07)
- Check `git tag` for other safe points

## Performance Targets

After every deployment, verify:
- [ ] ESPN cache: <500ms
- [ ] AI predictions: 200-500ms
- [ ] UI interactions: <100ms
- [ ] Survivor pool: sub-100ms
- [ ] No timeout disasters

## Common Deployment Issues

**Issue: Authentication breaks on refresh**
- Check Firebase config centralized
- Verify `onAuthStateChanged` callback
- Confirm messagingSenderId: `969304790725`

**Issue: Stale cache data**
- Verify cache-busting with `Date.now()`
- Check Cache-Control headers
- Force refresh with `?force=true&t=${Date.now()}`

**Issue: Ghost users appearing**
- Confirm pool members as source
- Check for fallback to legacy paths
- Block ghost UID explicitly

**Issue: 7-segment path error**
- Use correct Firestore path structure
- Match The Grid's working paths
- Avoid deep nesting

## Debug Patterns
```javascript
console.log('🚀 DEPLOY:', 'Starting deployment');
console.log('✅ VERIFY:', 'Testing production URL');
console.log('📊 PERFORMANCE:', `${duration}ms`);
console.log('🔥 CACHE:', 'Performance verified');
```

## Success Criteria

Deployment is complete when:
1. ✅ Firebase deploy succeeded
2. ✅ All production URLs responding
3. ✅ Performance targets met
4. ✅ No ghost users
5. ✅ No console errors
6. ✅ Critical features functional
7. ✅ Post-deploy commit created
8. ✅ Changes pushed to remote
9. ✅ User confirms feature works correctly

## Diamond Level Standard

**"Every deployment must be production-ready, fully tested, and backed by git history."**
