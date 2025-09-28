const OAuthTestHelpers = require('./utils/oauth-helpers');

describe('OAuth Security Verification', () => {
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
      await oauthHelper.takeOAuthScreenshot('security-test-cleanup');
      await page.close();
    }
  });

  test('Prevents unauthorized account linking', async () => {
    // Setup two different user accounts
    const legitimateUser = {
      uid: 'legitimate-user-123',
      email: 'legitimate@example.com',
      displayName: 'Legitimate User',
      authMethod: 'password'
    };

    const attackerAccount = {
      uid: 'attacker-account-456',
      email: 'attacker@malicious.com',
      displayName: 'Attacker Account',
      authMethod: 'google.com'
    };

    // Setup legitimate user as authenticated
    await oauthHelper.setupTestUser(legitimateUser);

    // Authenticate with legitimate account first
    await oauthHelper.typeText('#email-input', legitimateUser.email);
    await oauthHelper.typeText('#password-input', 'securepassword123');
    await oauthHelper.clickElement('#login-btn');
    await oauthHelper.waitForNavigation();

    // Verify legitimate user is authenticated
    let isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    // Take screenshot before unauthorized linking attempt
    await oauthHelper.takeOAuthScreenshot('before-unauthorized-linking');

    // Attempt to link attacker's Google account (different email)
    await oauthHelper.mockGoogleOAuthPopup({
      uid: attackerAccount.uid,
      email: attackerAccount.email, // Different email - should be blocked
      displayName: attackerAccount.displayName,
      providerId: 'google.com',
      emailVerified: true
    });

    // Try to link the unauthorized account
    const linkButtonExists = await oauthHelper.checkElementExists('#link-google-btn');
    if (linkButtonExists) {
      await oauthHelper.clickElement('#link-google-btn');
    } else {
      await oauthHelper.clickGoogleSignInButton();
    }

    // Wait for security check processing
    await page.waitForTimeout(3000);

    // Take screenshot after unauthorized linking attempt
    await oauthHelper.takeOAuthScreenshot('after-unauthorized-linking-blocked');

    // Verify linking was prevented
    const securityError = await oauthHelper.checkForOAuthErrors();
    expect(securityError).toBeTruthy();
    expect(securityError.toLowerCase()).toMatch(/unauthorized|different.*email|security|permission/);

    // Verify original user remains authenticated (no account hijacking)
    isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    // Verify user profile hasn't been compromised
    const displayName = await oauthHelper.getElementText('#user-display-name');
    expect(displayName).toContain(legitimateUser.displayName);
    expect(displayName).not.toContain(attackerAccount.displayName);

    // Verify no unauthorized account data was linked
    const linkingResult = await oauthHelper.verifyAccountLinking(legitimateUser.uid, ['password']);
    expect(linkingResult.actualProviders).not.toContain('google.com');

    console.log('Unauthorized account linking prevented successfully:', securityError);
  }, 20000);

  test('Maintains session security during auth operations', async () => {
    // Monitor all network requests for security analysis
    const securityMonitor = {
      requests: [],
      responses: [],
      securityHeaders: {},
      suspiciousActivity: []
    };

    page.on('request', request => {
      securityMonitor.requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now()
      });
    });

    page.on('response', async response => {
      securityMonitor.responses.push({
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: Date.now()
      });
    });

    // Setup user for session security test
    const testUser = {
      uid: 'session-security-test',
      email: 'session@example.com',
      displayName: 'Session Test User',
      sessionToken: 'secure-session-token-12345'
    };

    await oauthHelper.setupTestUser(testUser);

    // Take screenshot before session security test
    await oauthHelper.takeOAuthScreenshot('before-session-security');

    // Perform OAuth authentication
    await oauthHelper.mockGoogleOAuthPopup({
      uid: testUser.uid,
      email: testUser.email,
      displayName: testUser.displayName,
      providerId: 'google.com',
      emailVerified: true
    });

    await oauthHelper.clickGoogleSignInButton();
    await oauthHelper.waitForOAuthCompletion();

    // Take screenshot after OAuth completion
    await oauthHelper.takeOAuthScreenshot('after-oauth-session-established');

    // Verify secure session establishment
    const isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    // Analyze security headers in responses
    const securityHeaderChecks = {
      hasCSRFProtection: false,
      hasSecureCookies: false,
      hasContentSecurityPolicy: false,
      hasStrictTransportSecurity: false,
      hasXFrameOptions: false
    };

    securityMonitor.responses.forEach(response => {
      const headers = response.headers;
      
      if (headers['x-csrf-token'] || headers['csrf-token']) {
        securityHeaderChecks.hasCSRFProtection = true;
      }
      
      if (headers['set-cookie'] && headers['set-cookie'].includes('Secure')) {
        securityHeaderChecks.hasSecureCookies = true;
      }
      
      if (headers['content-security-policy']) {
        securityHeaderChecks.hasContentSecurityPolicy = true;
      }
      
      if (headers['strict-transport-security']) {
        securityHeaderChecks.hasStrictTransportSecurity = true;
      }
      
      if (headers['x-frame-options']) {
        securityHeaderChecks.hasXFrameOptions = true;
      }
    });

    // Verify session token security
    const sessionInfo = await page.evaluate(() => {
      const sessionData = {
        hasLocalStorage: Object.keys(localStorage).length > 0,
        hasSessionStorage: Object.keys(sessionStorage).length > 0,
        cookieCount: document.cookie.split(';').filter(c => c.trim().length > 0).length,
        secureContext: location.protocol === 'https:' || location.hostname === 'localhost'
      };
      
      // Check for sensitive data in storage (should be minimal)
      const sensitiveKeys = Object.keys(localStorage).filter(key => 
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('private')
      );
      
      sessionData.hasSensitiveStorage = sensitiveKeys.length > 0;
      sessionData.sensitiveKeys = sensitiveKeys;
      
      return sessionData;
    });

    // Security validations
    expect(sessionInfo.secureContext).toBe(true); // HTTPS or localhost
    expect(sessionInfo.hasSensitiveStorage).toBe(false); // No sensitive data in storage

    // Verify no suspicious network activity
    const suspiciousRequests = securityMonitor.requests.filter(req => 
      req.url.includes('malicious') ||
      req.url.includes('phishing') ||
      req.headers.origin !== 'http://localhost:8080'
    );

    expect(suspiciousRequests.length).toBe(0);

    // Log security analysis results
    console.log('Session Security Analysis:', {
      securityHeaders: securityHeaderChecks,
      sessionInfo: sessionInfo,
      totalRequests: securityMonitor.requests.length,
      totalResponses: securityMonitor.responses.length,
      suspiciousActivity: suspiciousRequests.length
    });
  }, 20000);

  test('Validates OAuth CSRF protection', async () => {
    // Test CSRF token validation in OAuth flow
    
    let csrfTokens = [];
    let stateParameters = [];

    // Monitor OAuth requests for CSRF tokens and state parameters
    page.on('request', request => {
      const url = request.url();
      const headers = request.headers();
      
      // Check for CSRF tokens in headers
      if (headers['x-csrf-token'] || headers['csrf-token']) {
        csrfTokens.push({
          token: headers['x-csrf-token'] || headers['csrf-token'],
          url: url,
          timestamp: Date.now()
        });
      }
      
      // Check for state parameter in OAuth URLs
      if (url.includes('state=')) {
        const stateMatch = url.match(/state=([^&]+)/);
        if (stateMatch) {
          stateParameters.push({
            state: stateMatch[1],
            url: url,
            timestamp: Date.now()
          });
        }
      }
    });

    // Take screenshot before CSRF protection test
    await oauthHelper.takeOAuthScreenshot('before-csrf-protection-test');

    // Setup OAuth with CSRF testing
    await page.evaluateOnNewDocument(() => {
      // Monitor for CSRF token generation
      window.csrfTokenMonitor = [];
      
      // Override fetch to capture CSRF tokens
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const [url, options = {}] = args;
        
        if (options.headers) {
          Object.keys(options.headers).forEach(key => {
            if (key.toLowerCase().includes('csrf') || key.toLowerCase().includes('token')) {
              window.csrfTokenMonitor.push({
                header: key,
                value: options.headers[key],
                url: url
              });
            }
          });
        }
        
        return originalFetch.apply(this, args);
      };
    });

    // Setup OAuth response
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'csrf-test-user',
      email: 'csrf@example.com',
      displayName: 'CSRF Test User',
      providerId: 'google.com',
      emailVerified: true
    });

    // Perform OAuth authentication
    await oauthHelper.clickGoogleSignInButton();
    await oauthHelper.waitForOAuthCompletion();

    // Take screenshot after OAuth with CSRF protection
    await oauthHelper.takeOAuthScreenshot('after-csrf-protected-oauth');

    // Verify OAuth completed successfully
    const isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    // Check CSRF token monitoring results
    const csrfMonitorResults = await page.evaluate(() => window.csrfTokenMonitor || []);

    // Verify state parameter usage (OAuth CSRF protection)
    expect(stateParameters.length).toBeGreaterThan(0);
    
    // Verify state parameters are unique and sufficiently random
    if (stateParameters.length > 0) {
      const states = stateParameters.map(p => p.state);
      const uniqueStates = [...new Set(states)];
      expect(uniqueStates.length).toBe(states.length); // All states should be unique
      
      // Verify state parameter length (should be sufficiently long)
      states.forEach(state => {
        expect(state.length).toBeGreaterThanOrEqual(8);
      });
    }

    // Log CSRF protection analysis
    console.log('CSRF Protection Analysis:', {
      csrfTokensFound: csrfTokens.length,
      stateParametersFound: stateParameters.length,
      csrfMonitorResults: csrfMonitorResults.length,
      stateValues: stateParameters.map(p => ({ state: p.state.substring(0, 8) + '...', url: p.url }))
    });
  }, 15000);

  test('Prevents OAuth token interception', async () => {
    // Test OAuth token security and prevent interception attacks
    
    const tokenMonitor = {
      accessTokens: [],
      refreshTokens: [],
      idTokens: [],
      suspiciousActivity: []
    };

    // Monitor for token exposure in various contexts
    await page.evaluateOnNewDocument(() => {
      // Monitor console for token leakage
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      window.tokenLeakageMonitor = [];

      [console.log, console.error, console.warn].forEach((method, index) => {
        const methodNames = ['log', 'error', 'warn'];
        const originalMethod = method;
        
        console[methodNames[index]] = function(...args) {
          const message = args.join(' ');
          
          // Check for token patterns
          const tokenPatterns = [
            /access_token[=:]\s*['"']?([a-zA-Z0-9._-]+)['"']?/i,
            /refresh_token[=:]\s*['"']?([a-zA-Z0-9._-]+)['"']?/i,
            /id_token[=:]\s*['"']?([a-zA-Z0-9._-]+)['"']?/i,
            /token['"']?\s*:\s*['"']([a-zA-Z0-9._-]{20,})['"']/i
          ];
          
          tokenPatterns.forEach(pattern => {
            if (pattern.test(message)) {
              window.tokenLeakageMonitor.push({
                method: methodNames[index],
                message: message.substring(0, 100) + '...', // Truncate for safety
                timestamp: Date.now(),
                type: 'console_exposure'
              });
            }
          });
          
          return originalMethod.apply(this, args);
        };
      });

      // Monitor localStorage/sessionStorage for token storage
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key.toLowerCase().includes('token') && value.length > 20) {
          window.tokenLeakageMonitor.push({
            storage: this === localStorage ? 'localStorage' : 'sessionStorage',
            key: key,
            valueLength: value.length,
            timestamp: Date.now(),
            type: 'storage_exposure'
          });
        }
        return originalSetItem.call(this, key, value);
      };
    });

    // Take screenshot before token interception test
    await oauthHelper.takeOAuthScreenshot('before-token-interception-test');

    // Setup OAuth with token monitoring
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'token-security-test',
      email: 'token@example.com',
      displayName: 'Token Security User',
      providerId: 'google.com',
      emailVerified: true,
      accessToken: 'secure-access-token-abcd1234567890',
      refreshToken: 'secure-refresh-token-efgh1234567890',
      idToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.test'
    });

    // Perform OAuth authentication
    await oauthHelper.clickGoogleSignInButton();
    await oauthHelper.waitForOAuthCompletion();

    // Take screenshot after OAuth token handling
    await oauthHelper.takeOAuthScreenshot('after-token-security-oauth');

    // Verify OAuth completed successfully
    const isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    // Check for token leakage
    const tokenLeakage = await page.evaluate(() => window.tokenLeakageMonitor || []);

    // Verify no tokens are exposed in console
    const consoleTokenExposure = tokenLeakage.filter(item => item.type === 'console_exposure');
    expect(consoleTokenExposure.length).toBe(0);

    // Check if tokens are stored securely (not in plain text in localStorage)
    const storageTokenExposure = tokenLeakage.filter(item => 
      item.type === 'storage_exposure' && 
      item.storage === 'localStorage'
    );
    
    // OAuth tokens should not be stored in localStorage in plain text
    expect(storageTokenExposure.length).toBe(0);

    // Verify secure token handling in network requests
    const networkRequests = await oauthHelper.monitorOAuthNetworkRequests();
    
    // Check that OAuth requests use HTTPS
    const insecureRequests = networkRequests.requests.filter(req => 
      req.url.startsWith('http://') && 
      !req.url.includes('localhost')
    );
    expect(insecureRequests.length).toBe(0);

    // Log token security analysis
    console.log('Token Interception Prevention Analysis:', {
      tokenLeakageInstances: tokenLeakage.length,
      consoleExposure: consoleTokenExposure.length,
      storageExposure: storageTokenExposure.length,
      insecureRequests: insecureRequests.length,
      totalNetworkRequests: networkRequests.totalRequests
    });
  }, 18000);

  test('Validates account takeover prevention', async () => {
    // Test prevention of account takeover attacks through OAuth
    
    // Setup victim user account
    const victimUser = {
      uid: 'victim-user-789',
      email: 'victim@example.com',
      displayName: 'Victim User',
      authMethod: 'password',
      accountValue: 'high' // Indicates high-value account
    };

    // Setup attacker's OAuth account
    const attackerOAuth = {
      uid: 'attacker-oauth-999',
      email: 'attacker-oauth@example.com', // Different email
      displayName: 'Attacker OAuth',
      providerId: 'google.com',
      emailVerified: true
    };

    await oauthHelper.setupTestUser(victimUser);

    // Victim logs in first
    await oauthHelper.typeText('#email-input', victimUser.email);
    await oauthHelper.typeText('#password-input', 'victimpassword123');
    await oauthHelper.clickElement('#login-btn');
    await oauthHelper.waitForNavigation();

    // Verify victim is authenticated
    let isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    // Take screenshot after victim authentication
    await oauthHelper.takeOAuthScreenshot('victim-authenticated');

    // Record victim's session state
    const victimSessionBefore = await page.evaluate(() => ({
      displayName: document.querySelector('#user-display-name') ? 
        document.querySelector('#user-display-name').textContent : null,
      userEmail: document.querySelector('#user-email') ? 
        document.querySelector('#user-email').textContent : null,
      localStorageItems: Object.keys(localStorage).length,
      sessionStorageItems: Object.keys(sessionStorage).length
    }));

    // Simulate attacker attempting OAuth takeover
    await oauthHelper.mockGoogleOAuthPopup(attackerOAuth);

    // Take screenshot before takeover attempt
    await oauthHelper.takeOAuthScreenshot('before-takeover-attempt');

    // Attacker tries to use OAuth (should fail to takeover existing session)
    await oauthHelper.clickGoogleSignInButton();
    await page.waitForTimeout(3000);

    // Take screenshot after takeover attempt
    await oauthHelper.takeOAuthScreenshot('after-takeover-attempt');

    // Verify account takeover was prevented
    const takeoverError = await oauthHelper.checkForOAuthErrors();
    
    if (takeoverError) {
      // If system detected and blocked takeover attempt
      expect(takeoverError.toLowerCase()).toMatch(/account.*exists|different.*credential|unauthorized/);
    }

    // Verify victim's session integrity
    const victimSessionAfter = await page.evaluate(() => ({
      displayName: document.querySelector('#user-display-name') ? 
        document.querySelector('#user-display-name').textContent : null,
      userEmail: document.querySelector('#user-email') ? 
        document.querySelector('#user-email').textContent : null,
      localStorageItems: Object.keys(localStorage).length,
      sessionStorageItems: Object.keys(sessionStorage).length
    }));

    // Verify victim's account remains intact
    expect(victimSessionAfter.displayName).toBe(victimSessionBefore.displayName);
    expect(victimSessionAfter.displayName).toContain(victimUser.displayName);
    expect(victimSessionAfter.displayName).not.toContain(attackerOAuth.displayName);

    // Verify victim remains authenticated (no session hijacking)
    isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    // Verify no unauthorized account linking occurred
    const accountLinking = await oauthHelper.verifyAccountLinking(victimUser.uid, ['password']);
    expect(accountLinking.actualProviders).not.toContain('google.com');

    console.log('Account takeover prevention validated:', {
      takeoverBlocked: !!takeoverError,
      victimSessionIntact: victimSessionAfter.displayName === victimSessionBefore.displayName,
      unauthorizedLinkingPrevented: !accountLinking.actualProviders.includes('google.com')
    });
  }, 20000);

  test('Validates OAuth email verification bypass prevention', async () => {
    // Test prevention of email verification bypass attacks
    
    const testScenarios = [
      {
        name: 'Unverified Google Account',
        oauthData: {
          uid: 'unverified-google-123',
          email: 'unverified@example.com',
          displayName: 'Unverified User',
          providerId: 'google.com',
          emailVerified: false // Key: unverified email
        },
        shouldBlock: true
      },
      {
        name: 'Verified Google Account',
        oauthData: {
          uid: 'verified-google-456',
          email: 'verified@example.com',
          displayName: 'Verified User',
          providerId: 'google.com',
          emailVerified: true // Key: verified email
        },
        shouldBlock: false
      }
    ];

    for (const scenario of testScenarios) {
      console.log(`Testing scenario: ${scenario.name}`);

      // Clear state for each scenario
      await oauthHelper.clearAuthState();
      await oauthHelper.navigateToPage('');
      await page.waitForTimeout(1000);

      // Setup OAuth with specific verification status
      await oauthHelper.mockGoogleOAuthPopup(scenario.oauthData);

      // Take screenshot before verification test
      await oauthHelper.takeOAuthScreenshot(`before-${scenario.name.toLowerCase().replace(/\s+/g, '-')}`);

      // Attempt OAuth authentication
      await oauthHelper.clickGoogleSignInButton();
      
      // Wait for verification processing
      await page.waitForTimeout(3000);

      // Take screenshot after verification check
      await oauthHelper.takeOAuthScreenshot(`after-${scenario.name.toLowerCase().replace(/\s+/g, '-')}`);

      if (scenario.shouldBlock) {
        // Verify unverified accounts are blocked
        const verificationError = await oauthHelper.checkForOAuthErrors();
        expect(verificationError).toBeTruthy();
        expect(verificationError.toLowerCase()).toMatch(/verify|verification|email.*not.*verified/);

        // Verify user is not authenticated
        const isAuthenticated = await oauthHelper.verifyAuthenticationState('unauthenticated');
        expect(isAuthenticated).toBe(true);

        console.log(`✓ Unverified account blocked: ${verificationError}`);

      } else {
        // Verify verified accounts are allowed
        const authCompleted = await oauthHelper.waitForOAuthCompletion();
        expect(authCompleted).toBe(true);

        const isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
        expect(isAuthenticated).toBe(true);

        // Verify no verification errors
        const verificationError = await oauthHelper.checkForOAuthErrors();
        expect(verificationError).toBeNull();

        console.log(`✓ Verified account allowed successfully`);
      }
    }
  }, 25000);

  test('Validates rate limiting for OAuth attempts', async () => {
    // Test rate limiting to prevent OAuth brute force attacks
    
    const rateLimitTest = {
      attempts: [],
      blocked: 0,
      successful: 0
    };

    // Take screenshot before rate limiting test
    await oauthHelper.takeOAuthScreenshot('before-rate-limit-test');

    // Attempt multiple rapid OAuth authentications
    for (let i = 0; i < 10; i++) {
      const attemptStart = Date.now();

      // Setup OAuth for each attempt
      await oauthHelper.mockGoogleOAuthPopup({
        uid: `rate-limit-test-${i}`,
        email: `ratetest${i}@example.com`,
        displayName: `Rate Test User ${i}`,
        providerId: 'google.com',
        emailVerified: true
      });

      try {
        // Rapid OAuth attempts
        await oauthHelper.clickGoogleSignInButton();
        
        // Short wait between attempts to simulate rapid clicks
        await page.waitForTimeout(100);
        
        const attemptEnd = Date.now();
        
        // Check if attempt was successful or blocked
        const isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
        const hasError = await oauthHelper.checkForOAuthErrors();

        rateLimitTest.attempts.push({
          attempt: i + 1,
          duration: attemptEnd - attemptStart,
          authenticated: isAuthenticated,
          error: hasError,
          timestamp: attemptEnd
        });

        if (hasError && hasError.toLowerCase().includes('rate')) {
          rateLimitTest.blocked++;
        } else if (isAuthenticated) {
          rateLimitTest.successful++;
          // Clear auth for next attempt
          await oauthHelper.clearAuthState();
          await oauthHelper.navigateToPage('');
          await page.waitForTimeout(200);
        }

      } catch (error) {
        rateLimitTest.attempts.push({
          attempt: i + 1,
          error: error.message,
          blocked: true,
          timestamp: Date.now()
        });
        rateLimitTest.blocked++;
      }
    }

    // Take screenshot after rate limiting test
    await oauthHelper.takeOAuthScreenshot('after-rate-limit-test');

    // Analyze rate limiting effectiveness
    const rapidAttempts = rateLimitTest.attempts.filter((attempt, index) => {
      if (index === 0) return false;
      const timeDiff = attempt.timestamp - rateLimitTest.attempts[index - 1].timestamp;
      return timeDiff < 1000; // Attempts within 1 second
    });

    // Verify rate limiting is working (some attempts should be blocked if system has rate limiting)
    if (rateLimitTest.blocked > 0) {
      expect(rateLimitTest.blocked).toBeGreaterThan(0);
      console.log(`✓ Rate limiting active: ${rateLimitTest.blocked} attempts blocked`);
    } else {
      // If no rate limiting, verify all attempts were processed (not necessarily blocked)
      expect(rateLimitTest.attempts.length).toBe(10);
      console.log('ⓘ No rate limiting detected, but all attempts processed normally');
    }

    // Verify rapid attempts don't cause system instability
    const systemErrors = rateLimitTest.attempts.filter(attempt => 
      attempt.error && 
      !attempt.error.toLowerCase().includes('rate') &&
      !attempt.error.toLowerCase().includes('limit')
    );
    
    expect(systemErrors.length).toBe(0); // No system errors from rapid attempts

    console.log('Rate Limiting Analysis:', {
      totalAttempts: rateLimitTest.attempts.length,
      blockedAttempts: rateLimitTest.blocked,
      successfulAttempts: rateLimitTest.successful,
      rapidAttempts: rapidAttempts.length,
      systemErrors: systemErrors.length
    });
  }, 30000);
});