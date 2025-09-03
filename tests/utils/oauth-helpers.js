const TestHelpers = require('./test-helpers');
const path = require('path');

class OAuthTestHelpers extends TestHelpers {
  constructor(page) {
    super(page);
    this.oauthPopup = null;
    this.networkRequests = [];
    this.consoleMessages = [];
    this.setupNetworkMonitoring();
    this.setupConsoleMonitoring();
  }

  setupNetworkMonitoring() {
    this.page.on('request', request => {
      this.networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now(),
        type: 'request'
      });
    });

    this.page.on('response', response => {
      this.networkRequests.push({
        url: response.url(),
        status: response.status(),
        timestamp: Date.now(),
        type: 'response'
      });
    });
  }

  setupConsoleMonitoring() {
    this.page.on('console', msg => {
      this.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });
  }

  async mockGoogleOAuthPopup(userData = null) {
    const defaultUserData = {
      uid: 'mock-google-uid-' + Date.now(),
      email: 'test@example.com',
      displayName: 'Test User',
      providerId: 'google.com',
      emailVerified: true
    };

    const mockUser = userData || defaultUserData;

    // Mock the Google OAuth popup behavior
    await this.page.evaluateOnNewDocument((userData) => {
      // Override Firebase Auth methods for testing
      window.mockFirebaseAuth = {
        signInWithPopup: async (auth, provider) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                user: userData,
                credential: {
                  providerId: 'google.com',
                  signInMethod: 'google.com'
                }
              });
            }, 500); // Simulate OAuth delay
          });
        },
        linkWithCredential: async (user, credential) => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                user: { ...userData, providerData: [userData] }
              });
            }, 300);
          });
        }
      };
    }, mockUser);

    return mockUser;
  }

  async mockOAuthError(errorType = 'popup-closed-by-user') {
    const errorMap = {
      'popup-closed-by-user': {
        code: 'auth/popup-closed-by-user',
        message: 'The popup has been closed by the user before finalizing the operation.'
      },
      'popup-blocked': {
        code: 'auth/popup-blocked',
        message: 'Unable to establish a connection with the popup.'
      },
      'network-request-failed': {
        code: 'auth/network-request-failed',
        message: 'A network error has occurred.'
      },
      'unauthorized-domain': {
        code: 'auth/unauthorized-domain',
        message: 'This domain is not authorized for OAuth operations.'
      },
      'account-exists-with-different-credential': {
        code: 'auth/account-exists-with-different-credential',
        message: 'An account already exists with the same email address but different sign-in credentials.'
      }
    };

    const error = errorMap[errorType] || errorMap['popup-closed-by-user'];

    await this.page.evaluateOnNewDocument((error) => {
      window.mockFirebaseAuth = {
        signInWithPopup: async () => {
          throw error;
        }
      };
    }, error);

    return error;
  }

  async clickGoogleSignInButton() {
    const googleButton = await this.waitForElement('#google-signin-btn', { timeout: 5000 });
    await this.clickElement('#google-signin-btn');
    return googleButton;
  }

  async clickGoogleSignUpButton() {
    const googleButton = await this.waitForElement('#google-signup-btn', { timeout: 5000 });
    await this.clickElement('#google-signup-btn');
    return googleButton;
  }

  async waitForOAuthCompletion(timeout = 10000) {
    try {
      // Wait for auth state change or error message
      await this.page.waitForFunction(
        () => {
          // Check if user is authenticated (auth state changed)
          const userProfile = document.querySelector('#user-profile');
          const errorMessage = document.querySelector('#login-error:not(.hidden)');
          return userProfile && !userProfile.classList.contains('hidden') || 
                 errorMessage && !errorMessage.classList.contains('hidden');
        },
        { timeout }
      );
      return true;
    } catch (error) {
      console.error('OAuth completion timeout:', error);
      return false;
    }
  }

  async verifyAuthenticationState(expectedState = 'authenticated') {
    const isAuthenticated = await this.page.evaluate(() => {
      const userProfile = document.querySelector('#user-profile');
      const loginForm = document.querySelector('#login-form');
      
      return {
        userProfileVisible: userProfile && !userProfile.classList.contains('hidden'),
        loginFormHidden: loginForm && loginForm.classList.contains('hidden'),
        userDisplayName: userProfile ? userProfile.textContent : null
      };
    });

    if (expectedState === 'authenticated') {
      return isAuthenticated.userProfileVisible && isAuthenticated.loginFormHidden;
    } else {
      return !isAuthenticated.userProfileVisible && !isAuthenticated.loginFormHidden;
    }
  }

  async checkForOAuthErrors() {
    const errorElement = await this.page.$('#login-error:not(.hidden)');
    if (errorElement) {
      const errorText = await errorElement.evaluate(el => el.textContent);
      return errorText.trim();
    }
    return null;
  }

  async simulatePopupBlocking() {
    await this.page.evaluateOnNewDocument(() => {
      const originalOpen = window.open;
      window.open = () => {
        throw new Error('Popup blocked by browser');
      };
    });
  }

  async simulateNetworkFailure() {
    await this.page.setOfflineMode(true);
  }

  async restoreNetwork() {
    await this.page.setOfflineMode(false);
  }

  async verifyAccountLinking(userId, expectedProviders = ['password', 'google.com']) {
    // This would typically check Firestore, but for testing we'll check the UI state
    const linkingResult = await this.page.evaluate(() => {
      // Check if the UI shows linked accounts
      const linkedAccountsSection = document.querySelector('#linked-accounts');
      const authMethods = linkedAccountsSection ? 
        Array.from(linkedAccountsSection.querySelectorAll('.auth-method')).map(el => el.dataset.provider) : 
        [];
      
      return {
        hasLinkingSection: !!linkedAccountsSection,
        authMethods: authMethods,
        userEmail: document.querySelector('#user-email') ? document.querySelector('#user-email').textContent : null
      };
    });

    return {
      isLinked: expectedProviders.every(provider => linkingResult.authMethods.includes(provider)),
      actualProviders: linkingResult.authMethods,
      expectedProviders: expectedProviders
    };
  }

  async validateSecurityHeaders() {
    const securityChecks = {
      cors: false,
      csp: false,
      referrerPolicy: false,
      frameOptions: false
    };

    // Check response headers for security configurations
    const responses = this.networkRequests.filter(req => req.type === 'response');
    
    for (const response of responses) {
      try {
        const pageResponse = await this.page.goto(response.url, { waitUntil: 'networkidle2' });
        const headers = pageResponse.headers();
        
        if (headers['access-control-allow-origin']) securityChecks.cors = true;
        if (headers['content-security-policy']) securityChecks.csp = true;
        if (headers['referrer-policy']) securityChecks.referrerPolicy = true;
        if (headers['x-frame-options']) securityChecks.frameOptions = true;
      } catch (error) {
        console.log('Could not check headers for:', response.url);
      }
    }

    return securityChecks;
  }

  async monitorOAuthNetworkRequests() {
    const oauthRequests = this.networkRequests.filter(req => 
      req.url.includes('accounts.google.com') || 
      req.url.includes('oauth2') ||
      req.url.includes('firebase') ||
      req.url.includes('googleapis.com')
    );

    return {
      totalRequests: oauthRequests.length,
      requests: oauthRequests,
      hasGoogleRequests: oauthRequests.some(req => req.url.includes('google')),
      hasFirebaseRequests: oauthRequests.some(req => req.url.includes('firebase'))
    };
  }

  async checkAccessibility() {
    const violations = await super.checkAccessibility();
    
    // Additional OAuth-specific accessibility checks
    const oauthViolations = [];
    
    // Check OAuth buttons have proper ARIA labels
    const oauthButtons = await this.page.$$eval('[id*="google-sign"], button[type="button"]', buttons => 
      buttons.filter(btn => 
        btn.textContent.toLowerCase().includes('google') || 
        btn.textContent.toLowerCase().includes('oauth')
      ).map(btn => ({
        hasAriaLabel: !!btn.getAttribute('aria-label'),
        hasAccessibleText: !!btn.textContent.trim(),
        id: btn.id
      }))
    );

    oauthButtons.forEach(btn => {
      if (!btn.hasAriaLabel && !btn.hasAccessibleText) {
        oauthViolations.push(`OAuth button ${btn.id} lacks accessible text`);
      }
    });

    // Check for proper focus management during OAuth flow
    const focusIssues = await this.page.evaluate(() => {
      const oauthButtons = document.querySelectorAll('[id*="google-sign"]');
      const issues = [];
      
      oauthButtons.forEach(button => {
        if (!button.tabIndex && button.tabIndex !== 0) {
          issues.push(`OAuth button ${button.id} not keyboard accessible`);
        }
      });
      
      return issues;
    });

    return [...violations, ...oauthViolations, ...focusIssues];
  }

  async measureOAuthPerformance() {
    const startTime = Date.now();
    
    // Click OAuth button
    await this.clickGoogleSignInButton();
    
    // Wait for OAuth completion
    const completed = await this.waitForOAuthCompletion();
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    return {
      completed,
      totalTime,
      networkRequests: this.networkRequests.length,
      consoleErrors: this.consoleMessages.filter(msg => msg.type === 'error').length,
      isWithinSLA: totalTime < 2000 // 2 second SLA
    };
  }

  async takeOAuthScreenshot(stepName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `oauth-${stepName}-${timestamp}`;
    await this.takeScreenshot(filename);
    return filename;
  }

  async clearAuthState() {
    // Clear local storage and session storage
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Clear cookies
    const cookies = await this.page.cookies();
    await this.page.deleteCookie(...cookies);
    
    // Reload page to ensure clean state
    await this.page.reload({ waitUntil: 'networkidle2' });
  }

  async setupTestUser(userData) {
    // Mock a test user in the system
    await this.page.evaluateOnNewDocument((userData) => {
      window.testUser = userData;
      // Override Firebase Auth to return test user
      if (window.firebase && window.firebase.auth) {
        const originalAuth = window.firebase.auth;
        window.firebase.auth = () => ({
          ...originalAuth(),
          currentUser: userData
        });
      }
    }, userData);
  }

  async verifyFirestoreWrite(operation, expectedData) {
    // Monitor network requests for Firestore writes
    const firestoreRequests = this.networkRequests.filter(req => 
      req.url.includes('firestore.googleapis.com') && 
      req.method === 'POST'
    );

    return {
      hasFirestoreWrite: firestoreRequests.length > 0,
      requestCount: firestoreRequests.length,
      requests: firestoreRequests
    };
  }

  async simulateConcurrentAuth() {
    // Simulate multiple concurrent authentication attempts
    const promises = [];
    
    for (let i = 0; i < 3; i++) {
      promises.push(
        this.page.evaluate(() => {
          return new Promise(resolve => {
            setTimeout(() => {
              if (window.mockFirebaseAuth) {
                resolve(window.mockFirebaseAuth.signInWithPopup());
              } else {
                resolve('No mock auth available');
              }
            }, Math.random() * 1000);
          });
        })
      );
    }

    try {
      const results = await Promise.all(promises);
      return {
        success: true,
        results: results,
        concurrentOperations: promises.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        concurrentOperations: promises.length
      };
    }
  }

  getNetworkRequestSummary() {
    return {
      total: this.networkRequests.length,
      byType: this.networkRequests.reduce((acc, req) => {
        acc[req.type] = (acc[req.type] || 0) + 1;
        return acc;
      }, {}),
      errors: this.networkRequests.filter(req => 
        req.type === 'response' && req.status >= 400
      ).length
    };
  }

  getConsoleMessageSummary() {
    return {
      total: this.consoleMessages.length,
      byType: this.consoleMessages.reduce((acc, msg) => {
        acc[msg.type] = (acc[msg.type] || 0) + 1;
        return acc;
      }, {}),
      errors: this.consoleMessages.filter(msg => msg.type === 'error'),
      warnings: this.consoleMessages.filter(msg => msg.type === 'warning')
    };
  }

  async validateOAuthFlow(flowType = 'signin') {
    const validation = {
      flowType,
      steps: [],
      errors: [],
      performance: {},
      security: {},
      accessibility: []
    };

    try {
      // Step 1: Initial page load
      validation.steps.push({ step: 'page_load', success: true, timestamp: Date.now() });

      // Step 2: OAuth button click
      const buttonClick = await this.clickGoogleSignInButton();
      validation.steps.push({ step: 'button_click', success: !!buttonClick, timestamp: Date.now() });

      // Step 3: OAuth completion
      const authCompleted = await this.waitForOAuthCompletion();
      validation.steps.push({ step: 'auth_completion', success: authCompleted, timestamp: Date.now() });

      // Step 4: Verify authentication state
      const authState = await this.verifyAuthenticationState('authenticated');
      validation.steps.push({ step: 'auth_verification', success: authState, timestamp: Date.now() });

      // Performance metrics
      validation.performance = await this.measureOAuthPerformance();

      // Security validation
      validation.security = await this.validateSecurityHeaders();

      // Accessibility check
      validation.accessibility = await this.checkAccessibility();

      // Check for errors
      const oauthError = await this.checkForOAuthErrors();
      if (oauthError) {
        validation.errors.push(oauthError);
      }

    } catch (error) {
      validation.errors.push(error.message);
    }

    return validation;
  }
}

module.exports = OAuthTestHelpers;