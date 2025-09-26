# Manual Testing Checklist - Unified View System

## Pre-Testing Setup
- [ ] Local server running on http://localhost:3000
- [ ] User authenticated (required for most functionality)
- [ ] Chrome DevTools open for debugging

## 1. Basic Page Loading Tests

### Default View (/)
- [ ] Page loads without errors
- [ ] Login/app view displays correctly
- [ ] No JavaScript console errors

### URL Parameter Routing
- [ ] http://localhost:3000/?view=admin loads and shows admin container
- [ ] http://localhost:3000/?view=grid loads and shows grid container  
- [ ] http://localhost:3000/?view=survivor loads and shows survivor container
- [ ] http://localhost:3000/?view=rules loads and shows rules content

## 2. Navigation Menu Tests (After Authentication)

### Menu Functionality  
- [ ] Menu button (#menu-btn) is visible
- [ ] Clicking menu button opens menu panel (#menu-panel)
- [ ] Clicking menu button again closes menu panel
- [ ] Menu contains expected navigation items

### View Switching
- [ ] "My Picks" button switches to picks view
- [ ] "Leaderboard" button switches to leaderboard view  
- [ ] "The Grid" button switches to grid view
- [ ] "Admin" button switches to admin view (admin users only)

## 3. Data Display Tests (After Authentication)

### Default Picks View
- [ ] "Your Active Picks" section displays (#picks-summary-container)
- [ ] Season leaderboard displays (#yearly-leaderboard-container)
- [ ] Leaderboard contains user data (no ghost users)
- [ ] All user data comes from pool members

### Grid View
- [ ] Grid container displays (#grid-container)
- [ ] Game data loads correctly
- [ ] Week selector functions
- [ ] Grid displays picks after game start times

### Survivor View  
- [ ] Survivor container displays (#survivor-container)
- [ ] Survivor results load (#survivor-results-container)
- [ ] Data displays correctly

### Admin View (Admin Users Only)
- [ ] Admin container displays (#admin-container)
- [ ] User management functions work
- [ ] Pool settings display correct users

## 4. Critical Functionality Preservation

### Ghost User Validation
- [ ] No user with ID "okl4sw2aDhW3yKpOfOwe5lH7OQj1" appears anywhere
- [ ] All displayed users are from pool members list
- [ ] Leaderboard shows only valid pool members

### Performance Validation  
- [ ] Page loads in under 3 seconds
- [ ] View switching is responsive (under 500ms)
- [ ] No excessive Firebase reads in DevTools Network tab
- [ ] Cached data is used when possible

### Error Handling
- [ ] Invalid view parameters gracefully fallback
- [ ] Network errors display appropriate messages
- [ ] Authentication errors are handled properly

## 5. Cross-Browser Testing

### Desktop Browsers
- [ ] Chrome - all functionality works
- [ ] Firefox - all functionality works  
- [ ] Safari - all functionality works

### Mobile Testing
- [ ] Responsive design works on mobile
- [ ] Touch navigation functions correctly
- [ ] All views display properly on small screens

## 6. Production Deployment Validation

### Pre-Deployment
- [ ] All manual tests pass locally
- [ ] No console errors or warnings
- [ ] Performance metrics meet standards

### Post-Deployment  
- [ ] Live site loads correctly
- [ ] All view routing works on production
- [ ] Authentication flow works
- [ ] Data displays correctly
- [ ] No production errors in browser console

## Test Results Summary

### Passing Tests: ___/___
### Critical Issues Found: ___
### Performance Issues: ___  
### Ready for Production: [ ] Yes [ ] No

### Notes:
_Record any issues, observations, or recommendations_

---

**Diamond Standard Requirement: All tests must pass before production deployment.**