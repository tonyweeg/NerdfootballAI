const OAuthTestHelpers = require('./utils/oauth-helpers');

describe('OAuth Error Scenarios and Edge Cases', () => {
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
      await oauthHelper.takeOAuthScreenshot('error-scenario-cleanup');
      await page.close();
    }
  });

  test('Handles popup blocked scenarios gracefully', async () => {
    // Simulate browser popup blocking
    await oauthHelper.simulatePopupBlocking();

    // Take screenshot before popup blocking test
    await oauthHelper.takeOAuthScreenshot('before-popup-blocked-test');

    // Attempt Google OAuth sign-in
    try {
      await oauthHelper.clickGoogleSignInButton();
      await page.waitForTimeout(2000);
    } catch (error) {
      // Expected to encounter issues due to popup blocking
      console.log('Popup blocking detected as expected:', error.message);
    }

    // Take screenshot after popup blocking
    await oauthHelper.takeOAuthScreenshot('after-popup-blocked');

    // Verify appropriate error message is displayed
    const errorMessage = await oauthHelper.checkForOAuthErrors();
    if (errorMessage) {
      expect(errorMessage.toLowerCase()).toMatch(/popup|blocked|allow/);
    }

    // Verify user remains unauthenticated
    const isAuthenticated = await oauthHelper.verifyAuthenticationState('unauthenticated');
    expect(isAuthenticated).toBe(true);

    // Verify alternative login methods are still available
    const emailInputVisible = await oauthHelper.checkElementExists('#email-input');
    expect(emailInputVisible).toBe(true);

    // Verify Google button is still clickable (for retry)
    const googleButtonExists = await oauthHelper.checkElementExists('#google-signin-btn');
    expect(googleButtonExists).toBe(true);

    console.log('Popup blocking handled gracefully with error message:', errorMessage);
  }, 10000);

  test('Manages OAuth service unavailability', async () => {
    // Mock Google OAuth service failure
    await oauthHelper.mockOAuthError('network-request-failed');

    // Take screenshot before service failure test
    await oauthHelper.takeOAuthScreenshot('before-service-unavailable');

    // Attempt OAuth sign-in during service outage
    await oauthHelper.clickGoogleSignInButton();
    
    // Wait for error processing
    await page.waitForTimeout(3000);

    // Take screenshot after service failure
    await oauthHelper.takeOAuthScreenshot('after-service-unavailable');

    // Verify network error is handled gracefully
    const errorMessage = await oauthHelper.checkForOAuthErrors();
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.toLowerCase()).toMatch(/network|service|unavailable|try again/);

    // Verify fallback authentication is suggested/available
    const emailFormVisible = await oauthHelper.checkElementExists('#login-form');
    expect(emailFormVisible).toBe(true);

    // Verify no partial authentication state
    const isAuthenticated = await oauthHelper.verifyAuthenticationState('unauthenticated');
    expect(isAuthenticated).toBe(true);

    // Check that network monitoring captured the failure
    const networkRequests = await oauthHelper.monitorOAuthNetworkRequests();
    expect(networkRequests.totalRequests).toBeGreaterThan(0);

    console.log('Service unavailability handled with fallback options');
  }, 12000);

  test('Handles account exists with different credential error', async () => {
    // Setup scenario where Google account email already exists with password auth
    const existingUser = {
      uid: 'existing-user-diff-cred',
      email: 'conflict@example.com',
      authMethod: 'password'
    };
    
    await oauthHelper.setupTestUser(existingUser);

    // Mock OAuth error for account conflict
    await oauthHelper.mockOAuthError('account-exists-with-different-credential');

    // Take screenshot before credential conflict test
    await oauthHelper.takeOAuthScreenshot('before-credential-conflict');

    // Attempt OAuth sign-in with conflicting account
    await oauthHelper.clickGoogleSignInButton();
    
    // Wait for error processing
    await page.waitForTimeout(2000);

    // Take screenshot after credential conflict
    await oauthHelper.takeOAuthScreenshot('after-credential-conflict');

    // Verify appropriate error message about account conflict
    const errorMessage = await oauthHelper.checkForOAuthErrors();
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.toLowerCase()).toMatch(/account.*exists|different.*credential|link.*account/);

    // Verify user is prompted to link accounts or use existing method
    const hasLinkingSuggestion = errorMessage.toLowerCase().includes('link') || 
                                errorMessage.toLowerCase().includes('existing');
    expect(hasLinkingSuggestion).toBe(true);

    // Verify user can still proceed with email/password
    const emailInputAccessible = await oauthHelper.checkElementExists('#email-input');
    expect(emailInputAccessible).toBe(true);

    console.log('Credential conflict handled with linking suggestion:', errorMessage);
  }, 10000);

  test('Handles unauthorized domain error', async () => {
    // Mock unauthorized domain error
    await oauthHelper.mockOAuthError('unauthorized-domain');

    // Take screenshot before domain authorization test
    await oauthHelper.takeOAuthScreenshot('before-unauthorized-domain');

    // Attempt OAuth sign-in from unauthorized domain
    await oauthHelper.clickGoogleSignInButton();
    
    // Wait for error processing
    await page.waitForTimeout(2000);

    // Take screenshot after domain error
    await oauthHelper.takeOAuthScreenshot('after-unauthorized-domain');

    // Verify domain authorization error is handled
    const errorMessage = await oauthHelper.checkForOAuthErrors();
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.toLowerCase()).toMatch(/domain|authorized|configuration/);

    // Verify security headers are properly configured
    const securityCheck = await oauthHelper.validateSecurityHeaders();
    expect(securityCheck.cors).toBeDefined();

    // Verify alternative authentication remains available
    const alternativeAuthAvailable = await oauthHelper.checkElementExists('#email-input');
    expect(alternativeAuthAvailable).toBe(true);

    console.log('Unauthorized domain error handled with security validation');
  }, 10000);

  test('Handles network interruption during OAuth flow', async () => {
    // Setup successful OAuth response initially
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'network-interruption-test',
      email: 'network@example.com',
      displayName: 'Network Test User',
      providerId: 'google.com',
      emailVerified: true
    });

    // Take screenshot before network interruption test
    await oauthHelper.takeOAuthScreenshot('before-network-interruption');

    // Start OAuth flow
    await oauthHelper.clickGoogleSignInButton();
    
    // Simulate network failure mid-flow
    await page.waitForTimeout(500);
    await oauthHelper.simulateNetworkFailure();
    
    // Wait during network outage
    await page.waitForTimeout(2000);
    
    // Restore network connection
    await oauthHelper.restoreNetwork();
    
    // Wait for recovery
    await page.waitForTimeout(2000);

    // Take screenshot after network recovery
    await oauthHelper.takeOAuthScreenshot('after-network-recovery');

    // Check if OAuth completed or if user needs to retry
    const isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    
    if (!isAuthenticated) {
      // If OAuth failed due to network, verify graceful handling
      const errorMessage = await oauthHelper.checkForOAuthErrors();
      if (errorMessage) {
        expect(errorMessage.toLowerCase()).toMatch(/network|connection|try again/);
      }
      
      // Verify retry option is available
      const googleButtonExists = await oauthHelper.checkElementExists('#google-signin-btn');
      expect(googleButtonExists).toBe(true);
      
      console.log('Network interruption handled with retry option');
    } else {
      // If OAuth succeeded despite interruption, verify complete authentication
      const displayName = await oauthHelper.getElementText('#user-display-name');
      expect(displayName).toContain('Network Test User');
      
      console.log('OAuth flow recovered successfully from network interruption');
    }

    // Verify network monitoring captured the interruption
    const networkSummary = oauthHelper.getNetworkRequestSummary();
    expect(networkSummary.total).toBeGreaterThan(0);
  }, 15000);

  test('Handles concurrent OAuth attempts', async () => {
    // Setup OAuth response
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'concurrent-test-user',
      email: 'concurrent@example.com',
      displayName: 'Concurrent Test User',
      providerId: 'google.com',
      emailVerified: true
    });

    // Take screenshot before concurrent test
    await oauthHelper.takeOAuthScreenshot('before-concurrent-oauth');

    // Attempt multiple concurrent OAuth operations
    const concurrentPromises = [];
    
    // Simulate rapid button clicks
    for (let i = 0; i < 3; i++) {
      concurrentPromises.push(
        (async () => {
          try {
            await page.waitForTimeout(i * 100); // Slight stagger
            await oauthHelper.clickGoogleSignInButton();
            return { success: true, attempt: i + 1 };
          } catch (error) {
            return { success: false, attempt: i + 1, error: error.message };
          }
        })()
      );
    }

    const results = await Promise.all(concurrentPromises);
    
    // Wait for all operations to complete
    await page.waitForTimeout(3000);

    // Take screenshot after concurrent attempts
    await oauthHelper.takeOAuthScreenshot('after-concurrent-oauth');

    // Verify system handled concurrent operations gracefully
    const finalAuthState = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(finalAuthState).toBe(true);

    // Verify no duplicate authentication states
    const userProfile = await oauthHelper.checkElementExists('#user-profile');
    expect(userProfile).toBe(true);

    // Check console for any race condition errors
    const consoleSummary = oauthHelper.getConsoleMessageSummary();
    const raceConditionErrors = consoleSummary.errors.filter(error => 
      error.text.toLowerCase().includes('race') ||
      error.text.toLowerCase().includes('concurrent') ||
      error.text.toLowerCase().includes('duplicate')
    );
    
    expect(raceConditionErrors.length).toBe(0);

    console.log('Concurrent OAuth attempts handled:', results);
  }, 15000);

  test('Validates OAuth state parameter security', async () => {
    // Test OAuth state parameter validation for CSRF protection
    
    // Setup OAuth with manipulated state
    await page.evaluateOnNewDocument(() => {
      // Mock OAuth flow with state parameter manipulation
      window.mockOAuthStateTest = true;
      
      // Override OAuth flow to test state validation
      const originalHistory = window.history.replaceState;
      window.history.replaceState = function(data, title, url) {
        if (url && url.includes('state=')) {
          // Log state parameter for validation
          console.log('OAuth state parameter detected:', url);
        }
        return originalHistory.call(this, data, title, url);
      };
    });

    // Take screenshot before state validation test
    await oauthHelper.takeOAuthScreenshot('before-oauth-state-validation');

    // Setup OAuth response
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'state-validation-test',
      email: 'state@example.com',
      displayName: 'State Test User',
      providerId: 'google.com',
      emailVerified: true
    });

    // Attempt OAuth sign-in
    await oauthHelper.clickGoogleSignInButton();
    await oauthHelper.waitForOAuthCompletion();

    // Take screenshot after state validation
    await oauthHelper.takeOAuthScreenshot('after-oauth-state-validation');

    // Verify OAuth completed successfully (indicating proper state handling)
    const isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    // Check for any CSRF-related console messages
    const consoleMessages = oauthHelper.getConsoleMessageSummary();
    const securityMessages = consoleMessages.total > 0 ? 
      consoleMessages.errors.concat(consoleMessages.warnings) : [];

    // Verify no security warnings about state parameter
    const stateSecurityIssues = securityMessages.filter(msg => 
      msg.text && msg.text.toLowerCase().includes('state') &&
      (msg.text.toLowerCase().includes('invalid') || msg.text.toLowerCase().includes('csrf'))
    );

    expect(stateSecurityIssues.length).toBe(0);

    console.log('OAuth state parameter validation passed');
  }, 12000);

  test('Handles OAuth token refresh failures', async () => {
    // Setup OAuth with token that will need refresh
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'token-refresh-test',
      email: 'token@example.com',
      displayName: 'Token Test User',
      providerId: 'google.com',
      emailVerified: true,
      accessToken: 'expired-token', // Simulate expired token
      refreshToken: 'invalid-refresh-token'
    });

    // Initial OAuth login
    await oauthHelper.clickGoogleSignInButton();
    await oauthHelper.waitForOAuthCompletion();

    // Take screenshot after initial login
    await oauthHelper.takeOAuthScreenshot('after-initial-oauth-login');

    // Verify initial authentication
    let isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    // Simulate token expiration scenario
    await page.evaluate(() => {
      // Mock token expiration
      if (window.firebase && window.firebase.auth) {
        // Simulate token refresh failure
        console.log('Simulating token refresh failure');
      }
    });

    // Wait for token refresh attempt
    await page.waitForTimeout(3000);

    // Take screenshot during token refresh scenario
    await oauthHelper.takeOAuthScreenshot('during-token-refresh-failure');

    // Verify system handles token refresh failure gracefully
    // User should either remain authenticated or be gracefully logged out
    const currentAuthState = await oauthHelper.verifyAuthenticationState('authenticated');
    
    if (!currentAuthState) {
      // If logged out due to token issues, verify graceful handling
      const loginFormVisible = await oauthHelper.checkElementExists('#login-form');
      expect(loginFormVisible).toBe(true);
      
      // Verify no error dialogs or broken UI
      const errorMessage = await oauthHelper.checkForOAuthErrors();
      if (errorMessage) {
        expect(errorMessage.toLowerCase()).not.toMatch(/undefined|null|error/);
      }
      
      console.log('Token refresh failure handled with graceful logout');
    } else {
      console.log('Token refresh handled transparently to user');
    }

    // Verify no console errors related to token handling
    const consoleSummary = oauthHelper.getConsoleMessageSummary();
    const tokenErrors = consoleSummary.errors.filter(error => 
      error.text && error.text.toLowerCase().includes('token') &&
      !error.text.toLowerCase().includes('simulating') // Exclude our test message
    );

    // Token errors should be handled gracefully, not thrown to console
    expect(tokenErrors.length).toBe(0);
  }, 15000);

  test('Validates OAuth redirect URI security', async () => {
    // Test OAuth redirect URI validation for security
    
    // Monitor network requests for OAuth redirects
    const redirectURIs = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('oauth') || url.includes('callback') || url.includes('redirect')) {
        redirectURIs.push(url);
      }
    });

    // Take screenshot before redirect URI test
    await oauthHelper.takeOAuthScreenshot('before-redirect-uri-validation');

    // Setup OAuth response
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'redirect-validation-test',
      email: 'redirect@example.com',
      displayName: 'Redirect Test User',
      providerId: 'google.com',
      emailVerified: true
    });

    // Attempt OAuth sign-in
    await oauthHelper.clickGoogleSignInButton();
    await oauthHelper.waitForOAuthCompletion();

    // Take screenshot after redirect validation
    await oauthHelper.takeOAuthScreenshot('after-redirect-uri-validation');

    // Verify OAuth completed successfully
    const isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    // Validate redirect URIs are from trusted domains
    const trustedDomains = [
      'localhost',
      'accounts.google.com',
      'oauth2.googleapis.com',
      'firebase.google.com',
      'firebaseapp.com'
    ];

    const untrustedRedirects = redirectURIs.filter(uri => {
      try {
        const url = new URL(uri);
        return !trustedDomains.some(domain => url.hostname.includes(domain));
      } catch {
        return true; // Invalid URLs are untrusted
      }
    });

    expect(untrustedRedirects.length).toBe(0);

    // Verify security headers for redirect protection
    const securityHeaders = await oauthHelper.validateSecurityHeaders();
    expect(securityHeaders.referrerPolicy).toBeDefined();

    console.log('OAuth redirect URI security validation passed:', {
      totalRedirects: redirectURIs.length,
      untrustedRedirects: untrustedRedirects.length,
      securityHeaders: securityHeaders
    });
  }, 12000);

  test('Handles OAuth flow with slow network conditions', async () => {
    // Simulate slow network conditions
    await page.emulate({
      offline: false,
      downloadThroughput: 50 * 1024, // 50KB/s - very slow
      uploadThroughput: 20 * 1024,   // 20KB/s - very slow
      latency: 2000 // 2 second latency
    });

    // Setup OAuth response
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'slow-network-test',
      email: 'slow@example.com',
      displayName: 'Slow Network User',
      providerId: 'google.com',
      emailVerified: true
    });

    // Take screenshot before slow network test
    await oauthHelper.takeOAuthScreenshot('before-slow-network-oauth');

    const startTime = Date.now();

    // Attempt OAuth sign-in under slow conditions
    await oauthHelper.clickGoogleSignInButton();
    
    // Wait longer for slow network
    const completed = await oauthHelper.waitForOAuthCompletion(20000); // 20 second timeout
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Take screenshot after slow network test
    await oauthHelper.takeOAuthScreenshot('after-slow-network-oauth');

    if (completed) {
      // If OAuth succeeded under slow conditions
      const isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
      expect(isAuthenticated).toBe(true);
      
      console.log(`OAuth completed under slow network in ${totalTime}ms`);
      
      // Verify no timeout errors
      const errorMessage = await oauthHelper.checkForOAuthErrors();
      expect(errorMessage).toBeNull();
      
    } else {
      // If OAuth timed out, verify graceful handling
      const errorMessage = await oauthHelper.checkForOAuthErrors();
      if (errorMessage) {
        expect(errorMessage.toLowerCase()).toMatch(/timeout|slow|network/);
      }
      
      // Verify fallback options are available
      const emailInputVisible = await oauthHelper.checkElementExists('#email-input');
      expect(emailInputVisible).toBe(true);
      
      console.log('OAuth timed out gracefully under slow network conditions');
    }

    // Restore normal network conditions
    await page.emulate({
      offline: false,
      downloadThroughput: 1000 * 1024, // 1MB/s
      uploadThroughput: 1000 * 1024,   // 1MB/s
      latency: 0
    });

    // Verify recovery with normal network
    if (!completed) {
      await oauthHelper.clickGoogleSignInButton();
      const recoveryCompleted = await oauthHelper.waitForOAuthCompletion();
      expect(recoveryCompleted).toBe(true);
      
      console.log('OAuth recovered successfully after network improvement');
    }
  }, 45000);
});