# Google OAuth Manual Testing Checklist

This checklist provides detailed manual test cases for comprehensive verification of Google OAuth implementation with account linking. Use this alongside the automated Puppeteer tests for complete coverage.

## Pre-Test Setup Requirements

### Environment Setup
- [ ] Firebase project configured with Google OAuth provider enabled
- [ ] Google OAuth client ID configured for test domain
- [ ] Test user accounts prepared (both Google and email/password)
- [ ] Browser extensions disabled that might interfere with OAuth
- [ ] Network monitoring tools available (if needed)
- [ ] Screenshot capture capability ready

### Test Data Preparation
- [ ] Clean Google test account (newuser.oauth.test@gmail.com)
- [ ] Existing email/password account (existing.user@example.com)
- [ ] Google account with same email as existing account
- [ ] Google account with unverified email
- [ ] Google account with minimal profile data

## New User OAuth Signup Flow Tests

### Test Case: OAUTH-MANUAL-001
**Objective**: Verify first-time Google OAuth user registration
**Priority**: HIGH

**Prerequisites**:
- Clean browser state (incognito mode recommended)
- Valid Google account not previously used with the app

**Test Steps**:
1. Navigate to application login page
2. Verify "Sign in with Google" button is visible and accessible
3. Click "Sign in with Google" button
4. **Expected**: Google OAuth popup opens within 2 seconds
5. Complete Google authentication in popup
6. **Expected**: Popup closes and user is redirected to main app
7. **Expected**: User profile is created and displayed
8. **Expected**: No error messages shown
9. Verify user can access protected features
10. Check browser developer tools for console errors

**Success Criteria**:
- [ ] OAuth popup opens successfully
- [ ] Authentication completes within 10 seconds
- [ ] User profile populated with Google data
- [ ] No JavaScript errors in console
- [ ] User authenticated and can access app features

**Edge Cases to Test**:
- [ ] Popup blocked by browser
- [ ] User cancels OAuth in popup
- [ ] Network interruption during OAuth
- [ ] Google account without profile picture
- [ ] Google account with special characters in name

### Test Case: OAUTH-MANUAL-002
**Objective**: Verify OAuth works across different browsers
**Priority**: MEDIUM

**Test Steps**:
1. Repeat OAUTH-MANUAL-001 in Chrome
2. Repeat OAUTH-MANUAL-001 in Firefox
3. Repeat OAUTH-MANUAL-001 in Safari (if available)
4. Repeat OAUTH-MANUAL-001 in Edge

**Success Criteria**:
- [ ] OAuth works consistently across all browsers
- [ ] User experience is consistent
- [ ] No browser-specific errors occur

## Account Linking Flow Tests

### Test Case: LINK-MANUAL-001
**Objective**: Successfully link Google account to existing email/password account
**Priority**: HIGH

**Prerequisites**:
- Existing email/password account in system
- Google account with same email address

**Test Steps**:
1. Log in with existing email/password account
2. Navigate to profile/settings page
3. Locate "Link Google Account" or similar option
4. Click to initiate Google account linking
5. **Expected**: Google OAuth popup opens
6. Authenticate with Google account (same email)
7. **Expected**: Success message appears
8. Verify both auth methods now work:
   - Log out and test Google OAuth login
   - Log out and test email/password login
9. Check that user data is preserved

**Success Criteria**:
- [ ] Account linking completes without errors
- [ ] Both authentication methods work
- [ ] User data preserved from original account
- [ ] Success confirmation displayed to user

### Test Case: LINK-MANUAL-002
**Objective**: Prevent linking accounts with different email addresses
**Priority**: HIGH

**Prerequisites**:
- Existing account: user@example.com
- Google account: different@gmail.com

**Test Steps**:
1. Log in with existing email/password account
2. Attempt to link Google account with different email
3. **Expected**: Error message prevents linking
4. **Expected**: Original account remains unchanged
5. Verify no partial linking occurred

**Success Criteria**:
- [ ] Linking blocked with clear error message
- [ ] No unauthorized account modifications
- [ ] User remains logged in with original account

### Test Case: LINK-MANUAL-003
**Objective**: Handle account linking with unverified Google email
**Priority**: MEDIUM

**Test Steps**:
1. Log in with existing email/password account
2. Attempt to link Google account with unverified email
3. **Expected**: System requires email verification or blocks linking
4. Verify appropriate user feedback

**Success Criteria**:
- [ ] Unverified accounts handled appropriately
- [ ] Clear instructions provided to user
- [ ] Security maintained

## Post-Linking Login Behavior Tests

### Test Case: LOGIN-MANUAL-001
**Objective**: Verify OAuth login works after account linking
**Priority**: HIGH

**Prerequisites**:
- Successfully linked account from previous tests

**Test Steps**:
1. Completely log out of the application
2. Clear browser session (but not cache/cookies entirely)
3. Return to login page
4. Click "Sign in with Google"
5. **Expected**: Quick OAuth authentication (should recognize returning user)
6. **Expected**: Full user profile and data available immediately

**Success Criteria**:
- [ ] OAuth login faster for returning linked user
- [ ] All user data accessible
- [ ] No re-linking required

### Test Case: LOGIN-MANUAL-002
**Objective**: Verify email/password login still works after linking
**Priority**: HIGH

**Test Steps**:
1. Log out completely
2. Use email/password login form
3. **Expected**: Successful authentication
4. **Expected**: Same user profile as OAuth login
5. **Expected**: Linked account indicators visible

**Success Criteria**:
- [ ] Email/password authentication works
- [ ] Identical user experience
- [ ] Account linking status preserved

## Error Scenarios and Edge Cases

### Test Case: ERROR-MANUAL-001
**Objective**: Handle popup blocking gracefully
**Priority**: HIGH

**Test Steps**:
1. Enable popup blocking in browser settings
2. Attempt Google OAuth sign-in
3. **Expected**: Clear error message about popup blocking
4. **Expected**: Instructions on how to allow popups
5. **Expected**: Fallback to email/password available

**Success Criteria**:
- [ ] Popup blocking detected and communicated
- [ ] User provided with solution steps
- [ ] Alternative authentication available

### Test Case: ERROR-MANUAL-002
**Objective**: Handle network connectivity issues during OAuth
**Priority**: MEDIUM

**Test Steps**:
1. Start Google OAuth flow
2. Disable network connectivity during authentication
3. **Expected**: Appropriate error handling
4. Re-enable network
5. **Expected**: User can retry OAuth or use alternative auth

**Success Criteria**:
- [ ] Network errors handled gracefully
- [ ] Retry mechanism available
- [ ] No broken UI state

### Test Case: ERROR-MANUAL-003
**Objective**: Handle concurrent authentication attempts
**Priority**: LOW

**Test Steps**:
1. Rapidly click Google sign-in button multiple times
2. **Expected**: System handles concurrent requests gracefully
3. **Expected**: Only one authentication session created
4. **Expected**: No duplicate user accounts

**Success Criteria**:
- [ ] No race conditions or duplicate processing
- [ ] Single authentication result
- [ ] UI remains responsive

## Security Verification Tests

### Test Case: SECURITY-MANUAL-001
**Objective**: Verify OAuth state parameter CSRF protection
**Priority**: HIGH

**Test Steps**:
1. Open browser developer tools, Network tab
2. Initiate Google OAuth flow
3. Monitor network requests for state parameter
4. **Expected**: State parameter present in OAuth URLs
5. **Expected**: State parameter validated on return

**Success Criteria**:
- [ ] State parameter present in OAuth flow
- [ ] State parameter appears random/unique
- [ ] No CSRF vulnerability present

### Test Case: SECURITY-MANUAL-002
**Objective**: Verify secure token handling
**Priority**: HIGH

**Test Steps**:
1. Open browser developer tools, Console tab
2. Perform Google OAuth authentication
3. Check console for any exposed tokens
4. Check Network tab for token transmission
5. **Expected**: No tokens visible in console logs
6. **Expected**: Tokens transmitted over HTTPS only

**Success Criteria**:
- [ ] No token exposure in console
- [ ] Secure transmission protocols used
- [ ] Tokens not stored in localStorage

### Test Case: SECURITY-MANUAL-003
**Objective**: Prevent unauthorized account linking
**Priority**: HIGH

**Test Steps**:
1. Have User A logged in
2. Attempt to link User B's Google account
3. **Expected**: Linking blocked by email verification
4. **Expected**: User A's account not compromised

**Success Criteria**:
- [ ] Cross-account linking prevented
- [ ] Appropriate security error shown
- [ ] Original user session preserved

## Data Integrity During Account Merge Tests

### Test Case: DATA-MANUAL-001
**Objective**: Verify user profile data preservation during linking
**Priority**: HIGH

**Prerequisites**:
- User account with rich profile data (preferences, game history, etc.)

**Test Steps**:
1. Document all existing user data before linking
2. Perform Google account linking
3. Compare all data after linking
4. **Expected**: All original data preserved
5. **Expected**: Additional Google profile data merged appropriately

**Success Criteria**:
- [ ] No data loss during linking
- [ ] Profile data consistent
- [ ] Game history preserved
- [ ] User preferences maintained

### Test Case: DATA-MANUAL-002
**Objective**: Handle conflicting profile data during merge
**Priority**: MEDIUM

**Prerequisites**:
- Email account with display name "Email User"
- Google account with display name "Google User"

**Test Steps**:
1. Link accounts with conflicting display names
2. **Expected**: Conflict resolution strategy applied
3. **Expected**: User informed of resolution
4. Verify final profile data is consistent

**Success Criteria**:
- [ ] Conflict resolution strategy consistent
- [ ] User notified of any changes
- [ ] Final profile data is clean and accurate

## Accessibility Testing

### Test Case: ACCESS-MANUAL-001
**Objective**: Verify OAuth flow is keyboard accessible
**Priority**: MEDIUM

**Test Steps**:
1. Navigate to login page using only keyboard
2. Tab to "Sign in with Google" button
3. Press Enter to activate OAuth
4. Complete OAuth flow using keyboard only
5. **Expected**: Full flow completable without mouse

**Success Criteria**:
- [ ] Google sign-in button reachable via Tab
- [ ] Button activatable with Enter/Space
- [ ] OAuth popup keyboard accessible
- [ ] Focus management proper throughout flow

### Test Case: ACCESS-MANUAL-002
**Objective**: Verify screen reader compatibility
**Priority**: LOW

**Prerequisites**:
- Screen reader software (NVDA, JAWS, or VoiceOver)

**Test Steps**:
1. Enable screen reader
2. Navigate to OAuth button
3. **Expected**: Button properly announced with purpose
4. Activate OAuth flow
5. **Expected**: Status updates announced to screen reader

**Success Criteria**:
- [ ] OAuth button has proper ARIA labels
- [ ] Authentication status communicated
- [ ] Error messages announced clearly

## Performance Testing

### Test Case: PERF-MANUAL-001
**Objective**: Verify OAuth performance under normal conditions
**Priority**: MEDIUM

**Test Steps**:
1. Measure OAuth popup launch time (should be < 1 second)
2. Measure total authentication time (should be < 5 seconds)
3. Measure account linking time (should be < 3 seconds)
4. Test with slow network conditions (3G simulation)

**Success Criteria**:
- [ ] OAuth popup launches quickly
- [ ] Authentication completes within SLA
- [ ] Performance acceptable on slow connections

### Test Case: PERF-MANUAL-002
**Objective**: Verify OAuth doesn't cause memory leaks
**Priority**: LOW

**Test Steps**:
1. Open browser developer tools, Memory tab
2. Perform OAuth authentication 10 times
3. Force garbage collection between attempts
4. **Expected**: Memory usage doesn't continuously increase

**Success Criteria**:
- [ ] No significant memory increase
- [ ] Cleanup occurs between OAuth attempts
- [ ] No browser performance degradation

## Cross-Device and Browser Testing

### Test Case: CROSS-MANUAL-001
**Objective**: Verify OAuth works on mobile devices
**Priority**: MEDIUM

**Test Steps**:
1. Test on iOS Safari
2. Test on Android Chrome
3. Test on mobile Firefox
4. Verify touch interactions work properly
5. **Expected**: Consistent behavior across mobile platforms

**Success Criteria**:
- [ ] OAuth popup displays correctly on mobile
- [ ] Touch interactions responsive
- [ ] Mobile-specific OAuth flows work

### Test Case: CROSS-MANUAL-002
**Objective**: Verify cross-device session consistency
**Priority**: LOW

**Test Steps**:
1. Link account on desktop
2. Login with OAuth on mobile
3. **Expected**: Same account data on both devices
4. Make changes on mobile
5. **Expected**: Changes reflected on desktop

**Success Criteria**:
- [ ] Account linking persists across devices
- [ ] Data synchronization works
- [ ] Consistent user experience

## Rollback and Recovery Testing

### Test Case: ROLLBACK-MANUAL-001
**Objective**: Verify OAuth can be disabled without breaking existing functionality
**Priority**: MEDIUM

**Test Steps**:
1. Verify current OAuth functionality works
2. Disable Google OAuth provider in Firebase
3. **Expected**: OAuth buttons hidden/disabled
4. **Expected**: Email/password login still works
5. **Expected**: Existing linked users can still login with email/password

**Success Criteria**:
- [ ] Graceful degradation when OAuth disabled
- [ ] Existing users not locked out
- [ ] Clear communication to users

## User Experience Testing

### Test Case: UX-MANUAL-001
**Objective**: Verify intuitive OAuth user flow
**Priority**: HIGH

**Test Steps**:
1. Have non-technical user attempt OAuth signup
2. Observe without providing guidance
3. **Expected**: User completes flow without confusion
4. **Expected**: Clear feedback at each step
5. Gather user feedback on experience

**Success Criteria**:
- [ ] Intuitive button placement and labeling
- [ ] Clear status indicators
- [ ] Helpful error messages
- [ ] Positive user feedback

### Test Case: UX-MANUAL-002
**Objective**: Verify account linking is discoverable and clear
**Priority**: MEDIUM

**Test Steps**:
1. Login with email/password account
2. Look for account linking option without guidance
3. **Expected**: Linking option is discoverable
4. **Expected**: Benefits of linking are clear
5. **Expected**: Process is straightforward

**Success Criteria**:
- [ ] Account linking feature discoverable
- [ ] Clear benefits communicated
- [ ] Simple linking process

## Test Execution Tracking

### Test Session Information
- **Date**: ___________
- **Tester**: ___________
- **Browser**: ___________
- **OS**: ___________
- **App Version**: ___________

### Test Results Summary
- **Total Tests Executed**: ___ / 25
- **Passed**: ___
- **Failed**: ___
- **Blocked**: ___
- **Critical Issues Found**: ___

### Critical Issues
1. _________________________________
2. _________________________________
3. _________________________________

### Recommendations
1. _________________________________
2. _________________________________
3. _________________________________

## Post-Testing Checklist

- [ ] All critical issues documented with reproduction steps
- [ ] Screenshots captured for failed test cases
- [ ] Performance metrics recorded
- [ ] Browser console errors documented
- [ ] Network requests analyzed for security issues
- [ ] User feedback collected (if applicable)
- [ ] Test results communicated to development team
- [ ] Follow-up automated tests created for found issues

## Notes and Observations
_Use this space to document any additional observations, edge cases discovered during testing, or suggestions for improvement._

---

**Testing completed by**: _________________ **Date**: _________________

**Approved by**: _________________ **Date**: _________________