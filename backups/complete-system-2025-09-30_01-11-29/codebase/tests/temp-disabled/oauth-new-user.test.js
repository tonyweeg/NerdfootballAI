const OAuthTestHelpers = require('./utils/oauth-helpers');

describe('New User Google OAuth Flow', () => {
  let page;
  let oauthHelper;

  beforeEach(async () => {
    page = await browser.newPage();
    oauthHelper = new OAuthTestHelpers(page);
    
    // Clear any existing auth state
    await oauthHelper.clearAuthState();
    
    // Navigate to the homepage
    await oauthHelper.navigateToPage('');
    
    // Wait for the page to fully load
    await page.waitForTimeout(1000);
  });

  afterEach(async () => {
    if (page) {
      await oauthHelper.takeOAuthScreenshot('test-cleanup');
      await page.close();
    }
  });

  test('Successfully creates account with Google OAuth', async () => {
    // Setup mock OAuth response
    const mockUser = await oauthHelper.mockGoogleOAuthPopup({
      uid: 'test-google-uid-new-user',
      email: 'newuser@example.com',
      displayName: 'New Test User',
      providerId: 'google.com',
      emailVerified: true
    });

    // Take screenshot before OAuth attempt
    await oauthHelper.takeOAuthScreenshot('before-oauth-signin');

    // Verify Google sign-in button exists
    const googleButtonExists = await oauthHelper.checkElementExists('#google-signin-btn');
    expect(googleButtonExists).toBe(true);

    // Click Google sign-in button
    await oauthHelper.clickGoogleSignInButton();

    // Wait for OAuth completion
    const completed = await oauthHelper.waitForOAuthCompletion();
    expect(completed).toBe(true);

    // Take screenshot after OAuth completion
    await oauthHelper.takeOAuthScreenshot('after-oauth-signin');

    // Verify user is authenticated
    const isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    // Verify no errors occurred
    const oauthError = await oauthHelper.checkForOAuthErrors();
    expect(oauthError).toBeNull();

    // Verify user profile is displayed
    const userProfile = await oauthHelper.checkElementExists('#user-profile');
    expect(userProfile).toBe(true);

    // Verify display name is shown
    const displayName = await oauthHelper.getElementText('#user-display-name');
    expect(displayName).toContain('New Test User');

    // Check network requests were made
    const networkSummary = oauthHelper.getNetworkRequestSummary();
    expect(networkSummary.total).toBeGreaterThan(0);

    // Check for console errors
    const consoleSummary = oauthHelper.getConsoleMessageSummary();
    expect(consoleSummary.errors.length).toBe(0);
  }, 15000);

  test('Handles OAuth popup cancellation gracefully', async () => {
    // Setup mock OAuth error
    await oauthHelper.mockOAuthError('popup-closed-by-user');

    // Take screenshot before OAuth attempt
    await oauthHelper.takeOAuthScreenshot('before-oauth-cancellation');

    // Click Google sign-in button
    await oauthHelper.clickGoogleSignInButton();

    // Wait a moment for error to be processed
    await page.waitForTimeout(1000);

    // Take screenshot after cancellation
    await oauthHelper.takeOAuthScreenshot('after-oauth-cancellation');

    // Verify user is not authenticated
    const isAuthenticated = await oauthHelper.verifyAuthenticationState('unauthenticated');
    expect(isAuthenticated).toBe(true);

    // Verify appropriate error message is shown
    const errorMessage = await oauthHelper.checkForOAuthErrors();
    expect(errorMessage).toContain('cancelled');

    // Verify login form is still visible
    const loginFormVisible = await oauthHelper.checkElementExists('#login-form:not(.hidden)');
    expect(loginFormVisible).toBe(true);
  }, 10000);

  test('Handles popup blocked scenario', async () => {
    // Setup popup blocking simulation
    await oauthHelper.simulatePopupBlocking();

    // Take screenshot before popup blocking test
    await oauthHelper.takeOAuthScreenshot('before-popup-blocked');

    // Try to click Google sign-in button
    try {
      await oauthHelper.clickGoogleSignInButton();
      await page.waitForTimeout(1000);
    } catch (error) {
      // Expected to fail due to popup blocking
    }

    // Take screenshot after popup blocking
    await oauthHelper.takeOAuthScreenshot('after-popup-blocked');

    // Verify appropriate error message is displayed
    const errorMessage = await oauthHelper.checkForOAuthErrors();
    expect(errorMessage).toContain('popup');

    // Verify user remains unauthenticated
    const isAuthenticated = await oauthHelper.verifyAuthenticationState('unauthenticated');
    expect(isAuthenticated).toBe(true);
  }, 10000);

  test('Handles network failure during OAuth', async () => {
    // Setup network failure simulation
    await oauthHelper.mockOAuthError('network-request-failed');

    // Take screenshot before network failure test
    await oauthHelper.takeOAuthScreenshot('before-network-failure');

    // Click Google sign-in button
    await oauthHelper.clickGoogleSignInButton();

    // Wait for error processing
    await page.waitForTimeout(2000);

    // Take screenshot after network failure
    await oauthHelper.takeOAuthScreenshot('after-network-failure');

    // Verify network error is handled gracefully
    const errorMessage = await oauthHelper.checkForOAuthErrors();
    expect(errorMessage).toContain('network');

    // Verify user remains unauthenticated
    const isAuthenticated = await oauthHelper.verifyAuthenticationState('unauthenticated');
    expect(isAuthenticated).toBe(true);

    // Verify fallback options are available
    const emailLoginVisible = await oauthHelper.checkElementExists('#email-input');
    expect(emailLoginVisible).toBe(true);
  }, 12000);

  test('OAuth button accessibility compliance', async () => {
    // Check accessibility of OAuth button
    const accessibilityIssues = await oauthHelper.checkAccessibility();
    
    // Filter OAuth-specific issues
    const oauthIssues = accessibilityIssues.filter(issue => 
      issue.toLowerCase().includes('oauth') || 
      issue.toLowerCase().includes('google')
    );

    expect(oauthIssues.length).toBe(0);

    // Verify button is keyboard accessible
    const googleButton = await oauthHelper.waitForElement('#google-signin-btn');
    
    // Test keyboard navigation to button
    await page.keyboard.press('Tab'); // Navigate to first focusable element
    let activeElement = await page.evaluate(() => document.activeElement.id);
    
    // Keep tabbing until we reach the Google button or exhaust reasonable attempts
    let attempts = 0;
    while (activeElement !== 'google-signin-btn' && attempts < 10) {
      await page.keyboard.press('Tab');
      activeElement = await page.evaluate(() => document.activeElement.id);
      attempts++;
    }

    expect(activeElement).toBe('google-signin-btn');

    // Verify button responds to Enter key
    // This would trigger the OAuth flow, so we'll just check that it's possible
    const isButtonFocusable = await page.evaluate(() => {
      const button = document.getElementById('google-signin-btn');
      return button && button.tabIndex >= 0;
    });
    expect(isButtonFocusable).toBe(true);
  }, 10000);

  test('OAuth performance meets SLA requirements', async () => {
    // Setup mock OAuth response
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'performance-test-uid',
      email: 'performance@example.com',
      displayName: 'Performance Test User',
      providerId: 'google.com',
      emailVerified: true
    });

    // Measure OAuth performance
    const performance = await oauthHelper.measureOAuthPerformance();

    // Take screenshot of performance results
    await oauthHelper.takeOAuthScreenshot('oauth-performance-results');

    // Verify performance meets SLA
    expect(performance.completed).toBe(true);
    expect(performance.totalTime).toBeLessThan(2000); // 2 second SLA
    expect(performance.isWithinSLA).toBe(true);

    // Verify no console errors during OAuth
    expect(performance.consoleErrors).toBe(0);

    // Log performance metrics for analysis
    console.log('OAuth Performance Metrics:', performance);
  }, 15000);

  test('Validates OAuth flow end-to-end', async () => {
    // Setup mock OAuth response
    const mockUser = await oauthHelper.mockGoogleOAuthPopup({
      uid: 'e2e-test-uid',
      email: 'e2e-test@example.com',
      displayName: 'E2E Test User',
      providerId: 'google.com',
      emailVerified: true
    });

    // Run complete OAuth validation
    const validation = await oauthHelper.validateOAuthFlow('signin');

    // Take screenshot of validation results
    await oauthHelper.takeOAuthScreenshot('oauth-e2e-validation');

    // Verify all steps completed successfully
    const failedSteps = validation.steps.filter(step => !step.success);
    expect(failedSteps.length).toBe(0);

    // Verify no errors occurred
    expect(validation.errors.length).toBe(0);

    // Verify performance is acceptable
    expect(validation.performance.isWithinSLA).toBe(true);

    // Verify accessibility compliance
    expect(validation.accessibility.length).toBe(0);

    // Log validation results
    console.log('OAuth Flow Validation:', JSON.stringify(validation, null, 2));
  }, 20000);
});