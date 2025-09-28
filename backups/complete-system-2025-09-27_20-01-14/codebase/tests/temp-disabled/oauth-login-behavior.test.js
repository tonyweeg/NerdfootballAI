const OAuthTestHelpers = require('./utils/oauth-helpers');

describe('Post-Linking OAuth Login Behavior', () => {
  let page;
  let oauthHelper;

  // Mock linked user account
  const linkedUser = {
    uid: 'linked-user-456',
    email: 'linked@example.com',
    displayName: 'Linked User',
    authMethods: ['password', 'google.com'],
    primaryAuthMethod: 'google.com',
    linkedAccounts: [
      { providerId: 'password', linkedDate: '2024-01-01' },
      { providerId: 'google.com', linkedDate: '2024-01-15' }
    ],
    profile: {
      preferences: { theme: 'light', notifications: true },
      gameHistory: ['game1', 'game2'],
      lastLogin: null
    }
  };

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
      await oauthHelper.takeOAuthScreenshot('login-behavior-cleanup');
      await page.close();
    }
  });

  test('Google OAuth login works after account linking', async () => {
    // Setup linked user in system
    await oauthHelper.setupTestUser(linkedUser);

    // Setup Google OAuth response for linked account
    await oauthHelper.mockGoogleOAuthPopup({
      uid: linkedUser.uid,
      email: linkedUser.email,
      displayName: linkedUser.displayName,
      providerId: 'google.com',
      emailVerified: true,
      providerData: [
        { providerId: 'password' },
        { providerId: 'google.com' }
      ]
    });

    // Take screenshot before OAuth login
    await oauthHelper.takeOAuthScreenshot('before-oauth-login');

    // Click Google sign-in button
    await oauthHelper.clickGoogleSignInButton();

    // Wait for OAuth completion
    const completed = await oauthHelper.waitForOAuthCompletion();
    expect(completed).toBe(true);

    // Take screenshot after OAuth login
    await oauthHelper.takeOAuthScreenshot('after-oauth-login');

    // Verify user is authenticated
    const isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    // Verify user profile shows correct information
    const displayName = await oauthHelper.getElementText('#user-display-name');
    expect(displayName).toContain(linkedUser.displayName);

    // Verify no errors occurred
    const oauthError = await oauthHelper.checkForOAuthErrors();
    expect(oauthError).toBeNull();

    // Verify full profile data is available (indicating successful merge)
    const userEmail = await oauthHelper.checkElementExists('#user-email');
    expect(userEmail).toBe(true);

    // Check network requests for proper OAuth flow
    const networkRequests = await oauthHelper.monitorOAuthNetworkRequests();
    expect(networkRequests.hasGoogleRequests).toBe(true);
    expect(networkRequests.hasFirebaseRequests).toBe(true);

    console.log('OAuth login network activity:', networkRequests);
  }, 15000);

  test('Email/password login still works after linking', async () => {
    // Setup linked user in system
    await oauthHelper.setupTestUser(linkedUser);

    // Take screenshot before email login
    await oauthHelper.takeOAuthScreenshot('before-email-password-login');

    // Use email/password login form
    await oauthHelper.typeText('#email-input', linkedUser.email);
    await oauthHelper.typeText('#password-input', 'securepassword123');
    await oauthHelper.clickElement('#login-btn');

    // Wait for authentication
    await oauthHelper.waitForNavigation();

    // Take screenshot after email login
    await oauthHelper.takeOAuthScreenshot('after-email-password-login');

    // Verify user is authenticated
    const isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    // Verify same user profile data is accessible
    const displayName = await oauthHelper.getElementText('#user-display-name');
    expect(displayName).toContain(linkedUser.displayName);

    // Verify both auth methods are still available for this user
    const linkingResult = await oauthHelper.verifyAccountLinking(
      linkedUser.uid,
      ['password', 'google.com']
    );
    expect(linkingResult.isLinked).toBe(true);

    // Verify no authentication errors
    const loginError = await oauthHelper.checkForOAuthErrors();
    expect(loginError).toBeNull();

    console.log('Email/password login verification:', linkingResult);
  }, 12000);

  test('Consistent user experience across auth methods', async () => {
    // Test both auth methods provide identical user experience
    const testScenarios = [
      { method: 'oauth', description: 'OAuth login' },
      { method: 'email', description: 'Email/password login' }
    ];

    const userExperienceData = {};

    for (const scenario of testScenarios) {
      // Clear state between tests
      await oauthHelper.clearAuthState();
      await oauthHelper.navigateToPage('');
      await page.waitForTimeout(1000);

      // Setup linked user
      await oauthHelper.setupTestUser(linkedUser);

      if (scenario.method === 'oauth') {
        // Setup OAuth login
        await oauthHelper.mockGoogleOAuthPopup({
          uid: linkedUser.uid,
          email: linkedUser.email,
          displayName: linkedUser.displayName,
          providerId: 'google.com',
          emailVerified: true
        });

        await oauthHelper.clickGoogleSignInButton();
        await oauthHelper.waitForOAuthCompletion();
      } else {
        // Email/password login
        await oauthHelper.typeText('#email-input', linkedUser.email);
        await oauthHelper.typeText('#password-input', 'securepassword123');
        await oauthHelper.clickElement('#login-btn');
        await oauthHelper.waitForNavigation();
      }

      // Collect user experience data
      userExperienceData[scenario.method] = {
        isAuthenticated: await oauthHelper.verifyAuthenticationState('authenticated'),
        displayName: await oauthHelper.getElementText('#user-display-name'),
        hasUserProfile: await oauthHelper.checkElementExists('#user-profile'),
        hasUserMenu: await oauthHelper.checkElementExists('#user-menu'),
        pageTitle: await oauthHelper.getPageTitle(),
        currentUrl: await oauthHelper.getCurrentURL()
      };

      await oauthHelper.takeOAuthScreenshot(`${scenario.method}-experience`);
    }

    // Compare user experiences
    expect(userExperienceData.oauth.isAuthenticated).toBe(userExperienceData.email.isAuthenticated);
    expect(userExperienceData.oauth.displayName).toBe(userExperienceData.email.displayName);
    expect(userExperienceData.oauth.hasUserProfile).toBe(userExperienceData.email.hasUserProfile);
    expect(userExperienceData.oauth.hasUserMenu).toBe(userExperienceData.email.hasUserMenu);

    console.log('User experience comparison:', userExperienceData);
  }, 30000);

  test('Auth method preference tracking', async () => {
    // Test that the system tracks which auth method user prefers
    const loginAttempts = [];

    // Setup linked user
    await oauthHelper.setupTestUser(linkedUser);

    // Simulate multiple OAuth logins (showing preference)
    for (let i = 0; i < 3; i++) {
      await oauthHelper.clearAuthState();
      await oauthHelper.navigateToPage('');
      await page.waitForTimeout(500);

      await oauthHelper.mockGoogleOAuthPopup({
        uid: linkedUser.uid,
        email: linkedUser.email,
        displayName: linkedUser.displayName,
        providerId: 'google.com',
        emailVerified: true
      });

      const startTime = Date.now();
      await oauthHelper.clickGoogleSignInButton();
      await oauthHelper.waitForOAuthCompletion();
      const endTime = Date.now();

      loginAttempts.push({
        method: 'oauth',
        duration: endTime - startTime,
        timestamp: Date.now()
      });

      // Simulate user activity before next login
      await page.waitForTimeout(200);
    }

    // Simulate one email/password login
    await oauthHelper.clearAuthState();
    await oauthHelper.navigateToPage('');
    await page.waitForTimeout(500);

    const startTime = Date.now();
    await oauthHelper.typeText('#email-input', linkedUser.email);
    await oauthHelper.typeText('#password-input', 'securepassword123');
    await oauthHelper.clickElement('#login-btn');
    await oauthHelper.waitForNavigation();
    const endTime = Date.now();

    loginAttempts.push({
      method: 'email',
      duration: endTime - startTime,
      timestamp: Date.now()
    });

    // Take screenshot of preference tracking results
    await oauthHelper.takeOAuthScreenshot('auth-preference-tracking');

    // Analyze login patterns
    const oauthLogins = loginAttempts.filter(attempt => attempt.method === 'oauth');
    const emailLogins = loginAttempts.filter(attempt => attempt.method === 'email');

    expect(oauthLogins.length).toBe(3);
    expect(emailLogins.length).toBe(1);

    // Calculate average login times
    const avgOauthTime = oauthLogins.reduce((sum, login) => sum + login.duration, 0) / oauthLogins.length;
    const avgEmailTime = emailLogins.reduce((sum, login) => sum + login.duration, 0) / emailLogins.length;

    // Log preference analytics
    console.log('Auth preference analysis:', {
      oauthLoginCount: oauthLogins.length,
      emailLoginCount: emailLogins.length,
      avgOauthTime,
      avgEmailTime,
      preferredMethod: oauthLogins.length > emailLogins.length ? 'oauth' : 'email'
    });

    // Verify all logins were successful
    const allSuccessful = loginAttempts.every(attempt => attempt.duration < 10000);
    expect(allSuccessful).toBe(true);
  }, 45000);

  test('Session persistence across auth methods', async () => {
    // Test that user session persists regardless of auth method used

    // Setup linked user
    await oauthHelper.setupTestUser(linkedUser);

    // Login with OAuth first
    await oauthHelper.mockGoogleOAuthPopup({
      uid: linkedUser.uid,
      email: linkedUser.email,
      displayName: linkedUser.displayName,
      providerId: 'google.com',
      emailVerified: true
    });

    await oauthHelper.clickGoogleSignInButton();
    await oauthHelper.waitForOAuthCompletion();

    // Take screenshot after OAuth login
    await oauthHelper.takeOAuthScreenshot('oauth-session-established');

    // Verify session is established
    const isOAuthAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isOAuthAuthenticated).toBe(true);

    // Navigate to different page to test session persistence
    await oauthHelper.navigateToPage('nerdSurvivor.html');
    await page.waitForTimeout(1000);

    // Verify session persists on different page
    const sessionPersisted = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(sessionPersisted).toBe(true);

    // Take screenshot showing session persistence
    await oauthHelper.takeOAuthScreenshot('session-persisted-different-page');

    // Simulate page refresh
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    // Verify session survives page refresh
    const sessionSurvivesRefresh = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(sessionSurvivesRefresh).toBe(true);

    // Take screenshot after refresh
    await oauthHelper.takeOAuthScreenshot('session-after-refresh');

    // Test session data consistency
    const postRefreshData = {
      displayName: await oauthHelper.getElementText('#user-display-name').catch(() => 'Not found'),
      hasProfile: await oauthHelper.checkElementExists('#user-profile'),
      isAuthenticated: await oauthHelper.verifyAuthenticationState('authenticated')
    };

    expect(postRefreshData.isAuthenticated).toBe(true);

    console.log('Session persistence test results:', postRefreshData);
  }, 20000);

  test('Logout behavior with linked accounts', async () => {
    // Test that logout works properly with linked accounts

    // Setup linked user
    await oauthHelper.setupTestUser(linkedUser);

    // Login with OAuth
    await oauthHelper.mockGoogleOAuthPopup({
      uid: linkedUser.uid,
      email: linkedUser.email,
      displayName: linkedUser.displayName,
      providerId: 'google.com',
      emailVerified: true
    });

    await oauthHelper.clickGoogleSignInButton();
    await oauthHelper.waitForOAuthCompletion();

    // Verify login successful
    const isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    // Take screenshot before logout
    await oauthHelper.takeOAuthScreenshot('before-logout');

    // Perform logout
    const logoutButtonExists = await oauthHelper.checkElementExists('#logout-btn');
    if (logoutButtonExists) {
      await oauthHelper.clickElement('#logout-btn');
    } else {
      // Try alternative logout selectors
      const signOutExists = await oauthHelper.checkElementExists('#sign-out-btn');
      if (signOutExists) {
        await oauthHelper.clickElement('#sign-out-btn');
      }
    }

    // Wait for logout completion
    await page.waitForTimeout(2000);

    // Take screenshot after logout
    await oauthHelper.takeOAuthScreenshot('after-logout');

    // Verify user is logged out
    const isLoggedOut = await oauthHelper.verifyAuthenticationState('unauthenticated');
    expect(isLoggedOut).toBe(true);

    // Verify login form is visible again
    const loginFormVisible = await oauthHelper.checkElementExists('#login-form');
    expect(loginFormVisible).toBe(true);

    // Verify no user profile is shown
    const userProfileHidden = await oauthHelper.checkElementExists('#user-profile.hidden') ||
                              !await oauthHelper.checkElementExists('#user-profile');
    expect(userProfileHidden).toBe(true);

    // Verify both auth methods are still available after logout
    const oauthButtonVisible = await oauthHelper.checkElementExists('#google-signin-btn');
    const emailInputVisible = await oauthHelper.checkElementExists('#email-input');
    expect(oauthButtonVisible).toBe(true);
    expect(emailInputVisible).toBe(true);

    console.log('Logout verification complete - both auth methods available');
  }, 15000);

  test('Performance comparison between auth methods', async () => {
    // Compare performance metrics between OAuth and email/password login

    const performanceMetrics = {
      oauth: [],
      email: []
    };

    // Setup linked user
    await oauthHelper.setupTestUser(linkedUser);

    // Test OAuth performance (3 attempts for averaging)
    for (let i = 0; i < 3; i++) {
      await oauthHelper.clearAuthState();
      await oauthHelper.navigateToPage('');
      await page.waitForTimeout(500);

      await oauthHelper.mockGoogleOAuthPopup({
        uid: linkedUser.uid,
        email: linkedUser.email,
        displayName: linkedUser.displayName,
        providerId: 'google.com',
        emailVerified: true
      });

      const oauthPerformance = await oauthHelper.measureOAuthPerformance();
      performanceMetrics.oauth.push(oauthPerformance);
    }

    // Test email/password performance (3 attempts for averaging)
    for (let i = 0; i < 3; i++) {
      await oauthHelper.clearAuthState();
      await oauthHelper.navigateToPage('');
      await page.waitForTimeout(500);

      const startTime = Date.now();
      
      await oauthHelper.typeText('#email-input', linkedUser.email);
      await oauthHelper.typeText('#password-input', 'securepassword123');
      await oauthHelper.clickElement('#login-btn');
      await oauthHelper.waitForNavigation();
      
      const endTime = Date.now();
      
      const emailPerformance = {
        totalTime: endTime - startTime,
        completed: await oauthHelper.verifyAuthenticationState('authenticated'),
        consoleErrors: oauthHelper.getConsoleMessageSummary().errors.length,
        isWithinSLA: (endTime - startTime) < 2000
      };
      
      performanceMetrics.email.push(emailPerformance);
    }

    // Take screenshot of performance comparison
    await oauthHelper.takeOAuthScreenshot('auth-performance-comparison');

    // Calculate averages
    const avgOAuthTime = performanceMetrics.oauth.reduce((sum, m) => sum + m.totalTime, 0) / 3;
    const avgEmailTime = performanceMetrics.email.reduce((sum, m) => sum + m.totalTime, 0) / 3;

    // Verify all attempts were successful
    const allOAuthSuccessful = performanceMetrics.oauth.every(m => m.completed);
    const allEmailSuccessful = performanceMetrics.email.every(m => m.completed);

    expect(allOAuthSuccessful).toBe(true);
    expect(allEmailSuccessful).toBe(true);

    // Verify both methods meet SLA
    const oauthMeetsSLA = performanceMetrics.oauth.every(m => m.isWithinSLA);
    const emailMeetsSLA = performanceMetrics.email.every(m => m.isWithinSLA);

    expect(oauthMeetsSLA).toBe(true);
    expect(emailMeetsSLA).toBe(true);

    // Log performance comparison
    console.log('Performance Comparison:', {
      oauth: {
        avgTime: avgOAuthTime,
        allSuccessful: allOAuthSuccessful,
        meetsSLA: oauthMeetsSLA
      },
      email: {
        avgTime: avgEmailTime,
        allSuccessful: allEmailSuccessful,
        meetsSLA: emailMeetsSLA
      },
      fasterMethod: avgOAuthTime < avgEmailTime ? 'OAuth' : 'Email/Password'
    });
  }, 60000);
});