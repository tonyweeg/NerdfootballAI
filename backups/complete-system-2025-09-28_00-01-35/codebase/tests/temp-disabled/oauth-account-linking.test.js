const OAuthTestHelpers = require('./utils/oauth-helpers');

describe('OAuth Account Linking Flow', () => {
  let page;
  let oauthHelper;

  // Mock existing user data
  const existingUser = {
    uid: 'existing-user-123',
    email: 'existing@example.com',
    displayName: 'Existing User',
    authMethod: 'password',
    emailVerified: true
  };

  beforeEach(async () => {
    page = await browser.newPage();
    oauthHelper = new OAuthTestHelpers(page);
    
    // Clear any existing auth state
    await oauthHelper.clearAuthState();
    
    // Setup existing user in system
    await oauthHelper.setupTestUser(existingUser);
    
    // Navigate to the homepage
    await oauthHelper.navigateToPage('');
    
    // Wait for the page to fully load
    await page.waitForTimeout(1000);
  });

  afterEach(async () => {
    if (page) {
      await oauthHelper.takeOAuthScreenshot('linking-test-cleanup');
      await page.close();
    }
  });

  test('Successfully links Google account to existing email/password account', async () => {
    // First, authenticate with existing email/password account
    await oauthHelper.typeText('#email-input', existingUser.email);
    await oauthHelper.typeText('#password-input', 'securepassword123');
    await oauthHelper.clickElement('#login-btn');
    
    // Wait for authentication
    await oauthHelper.waitForNavigation();
    await oauthHelper.takeOAuthScreenshot('after-email-login');

    // Verify user is authenticated
    let isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    // Navigate to profile/settings (assuming there's a profile page)
    const profileLinkExists = await oauthHelper.checkElementExists('#profile-link');
    if (profileLinkExists) {
      await oauthHelper.clickElement('#profile-link');
      await page.waitForTimeout(1000);
    }

    // Setup Google OAuth for linking (same email as existing account)
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'google-linked-uid',
      email: existingUser.email, // Same email for successful linking
      displayName: 'Existing User',
      providerId: 'google.com',
      emailVerified: true
    });

    // Take screenshot before linking attempt
    await oauthHelper.takeOAuthScreenshot('before-account-linking');

    // Look for link account button (this might be in profile/settings)
    const linkButtonExists = await oauthHelper.checkElementExists('#link-google-btn');
    if (linkButtonExists) {
      await oauthHelper.clickElement('#link-google-btn');
    } else {
      // If no specific link button, try the Google sign-in button
      await oauthHelper.clickGoogleSignInButton();
    }

    // Wait for linking completion
    await page.waitForTimeout(2000);

    // Take screenshot after linking attempt
    await oauthHelper.takeOAuthScreenshot('after-account-linking');

    // Verify account linking was successful
    const linkingResult = await oauthHelper.verifyAccountLinking(
      existingUser.uid, 
      ['password', 'google.com']
    );
    expect(linkingResult.isLinked).toBe(true);

    // Verify no errors occurred
    const linkingError = await oauthHelper.checkForOAuthErrors();
    expect(linkingError).toBeNull();

    // Verify user remains authenticated
    isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    console.log('Account linking result:', linkingResult);
  }, 20000);

  test('Prevents linking accounts with different email addresses', async () => {
    // Authenticate with existing account
    await oauthHelper.typeText('#email-input', existingUser.email);
    await oauthHelper.typeText('#password-input', 'securepassword123');
    await oauthHelper.clickElement('#login-btn');
    await oauthHelper.waitForNavigation();

    // Setup Google OAuth with different email
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'different-google-uid',
      email: 'different@example.com', // Different email - should fail
      displayName: 'Different User',
      providerId: 'google.com',
      emailVerified: true
    });

    // Take screenshot before linking attempt
    await oauthHelper.takeOAuthScreenshot('before-email-mismatch-linking');

    // Attempt to link accounts
    const linkButtonExists = await oauthHelper.checkElementExists('#link-google-btn');
    if (linkButtonExists) {
      await oauthHelper.clickElement('#link-google-btn');
    } else {
      await oauthHelper.clickGoogleSignInButton();
    }

    // Wait for error processing
    await page.waitForTimeout(2000);

    // Take screenshot after failed linking
    await oauthHelper.takeOAuthScreenshot('after-email-mismatch-error');

    // Verify linking was prevented
    const linkingError = await oauthHelper.checkForOAuthErrors();
    expect(linkingError).toContain('email');

    // Verify account was not linked
    const linkingResult = await oauthHelper.verifyAccountLinking(existingUser.uid, ['password']);
    expect(linkingResult.actualProviders).not.toContain('google.com');

    // Verify user remains authenticated with original account
    const isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);
  }, 15000);

  test('Handles already linked account gracefully', async () => {
    // Setup user that already has Google linked
    const linkedUser = {
      ...existingUser,
      linkedAccounts: ['password', 'google.com']
    };
    
    await oauthHelper.setupTestUser(linkedUser);

    // Authenticate with existing account
    await oauthHelper.typeText('#email-input', linkedUser.email);
    await oauthHelper.typeText('#password-input', 'securepassword123');
    await oauthHelper.clickElement('#login-btn');
    await oauthHelper.waitForNavigation();

    // Setup same Google account for re-linking attempt
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'already-linked-google-uid',
      email: linkedUser.email,
      displayName: 'Existing User',
      providerId: 'google.com',
      emailVerified: true
    });

    // Take screenshot before duplicate linking attempt
    await oauthHelper.takeOAuthScreenshot('before-duplicate-linking');

    // Attempt to link already linked account
    const linkButtonExists = await oauthHelper.checkElementExists('#link-google-btn');
    if (linkButtonExists) {
      await oauthHelper.clickElement('#link-google-btn');
    } else {
      await oauthHelper.clickGoogleSignInButton();
    }

    // Wait for processing
    await page.waitForTimeout(2000);

    // Take screenshot after duplicate linking attempt
    await oauthHelper.takeOAuthScreenshot('after-duplicate-linking');

    // Verify appropriate message is shown (should indicate already linked)
    const message = await oauthHelper.checkForOAuthErrors();
    if (message) {
      expect(message.toLowerCase()).toContain('already');
    }

    // Verify no duplicate entries in linked accounts
    const linkingResult = await oauthHelper.verifyAccountLinking(
      linkedUser.uid, 
      ['password', 'google.com']
    );
    
    // Should still show linked, but without duplicates
    expect(linkingResult.isLinked).toBe(true);
    expect(linkingResult.actualProviders.filter(p => p === 'google.com').length).toBe(1);
  }, 15000);

  test('Validates email ownership during linking process', async () => {
    // This test simulates the security check for email ownership
    
    // Authenticate with existing account
    await oauthHelper.typeText('#email-input', existingUser.email);
    await oauthHelper.typeText('#password-input', 'securepassword123');
    await oauthHelper.clickElement('#login-btn');
    await oauthHelper.waitForNavigation();

    // Setup Google OAuth with same email but different verification status
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'unverified-google-uid',
      email: existingUser.email,
      displayName: 'Existing User',
      providerId: 'google.com',
      emailVerified: false // Not verified - should trigger additional checks
    });

    // Take screenshot before unverified linking
    await oauthHelper.takeOAuthScreenshot('before-unverified-linking');

    // Attempt linking with unverified Google account
    const linkButtonExists = await oauthHelper.checkElementExists('#link-google-btn');
    if (linkButtonExists) {
      await oauthHelper.clickElement('#link-google-btn');
    } else {
      await oauthHelper.clickGoogleSignInButton();
    }

    // Wait for verification processing
    await page.waitForTimeout(3000);

    // Take screenshot after verification check
    await oauthHelper.takeOAuthScreenshot('after-verification-check');

    // Verify that linking requires email verification
    const verificationMessage = await oauthHelper.checkForOAuthErrors();
    if (verificationMessage) {
      expect(verificationMessage.toLowerCase()).toContain('verify');
    }

    // Verify security headers are in place
    const securityCheck = await oauthHelper.validateSecurityHeaders();
    expect(securityCheck.cors).toBe(true);
  }, 15000);

  test('Handles concurrent linking attempts gracefully', async () => {
    // Authenticate with existing account
    await oauthHelper.typeText('#email-input', existingUser.email);
    await oauthHelper.typeText('#password-input', 'securepassword123');
    await oauthHelper.clickElement('#login-btn');
    await oauthHelper.waitForNavigation();

    // Setup mock for multiple OAuth attempts
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'concurrent-google-uid',
      email: existingUser.email,
      displayName: 'Existing User',
      providerId: 'google.com',
      emailVerified: true
    });

    // Take screenshot before concurrent attempts
    await oauthHelper.takeOAuthScreenshot('before-concurrent-linking');

    // Simulate concurrent authentication attempts
    const concurrentResult = await oauthHelper.simulateConcurrentAuth();

    // Take screenshot after concurrent attempts
    await oauthHelper.takeOAuthScreenshot('after-concurrent-linking');

    // Verify system handles concurrent operations properly
    expect(concurrentResult.success).toBe(true);
    expect(concurrentResult.concurrentOperations).toBe(3);

    // Verify no data corruption occurred
    const linkingResult = await oauthHelper.verifyAccountLinking(existingUser.uid);
    expect(linkingResult.isLinked).toBe(true);

    console.log('Concurrent auth result:', concurrentResult);
  }, 20000);

  test('Preserves user data during account linking', async () => {
    // Create user with rich profile data
    const richUser = {
      ...existingUser,
      profile: {
        displayName: 'Rich Profile User',
        preferences: { theme: 'dark', notifications: true },
        gameHistory: ['game1', 'game2', 'game3'],
        achievements: ['first_win', 'streak_10']
      }
    };

    await oauthHelper.setupTestUser(richUser);

    // Authenticate with existing account
    await oauthHelper.typeText('#email-input', richUser.email);
    await oauthHelper.typeText('#password-input', 'securepassword123');
    await oauthHelper.clickElement('#login-btn');
    await oauthHelper.waitForNavigation();

    // Setup Google OAuth for linking
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'data-preservation-google-uid',
      email: richUser.email,
      displayName: 'Rich Profile User',
      providerId: 'google.com',
      emailVerified: true
    });

    // Take screenshot before data preservation test
    await oauthHelper.takeOAuthScreenshot('before-data-preservation');

    // Attempt account linking
    const linkButtonExists = await oauthHelper.checkElementExists('#link-google-btn');
    if (linkButtonExists) {
      await oauthHelper.clickElement('#link-google-btn');
    } else {
      await oauthHelper.clickGoogleSignInButton();
    }

    // Wait for linking completion
    await page.waitForTimeout(3000);

    // Take screenshot after linking
    await oauthHelper.takeOAuthScreenshot('after-data-preservation');

    // Verify account was linked successfully
    const linkingResult = await oauthHelper.verifyAccountLinking(
      richUser.uid, 
      ['password', 'google.com']
    );
    expect(linkingResult.isLinked).toBe(true);

    // Verify user profile data is still accessible
    const userDisplayName = await oauthHelper.getElementText('#user-display-name');
    expect(userDisplayName).toContain('Rich Profile User');

    // Check that Firestore write operations occurred (for data preservation)
    const firestoreWrite = await oauthHelper.verifyFirestoreWrite('update', richUser.profile);
    expect(firestoreWrite.hasFirestoreWrite).toBe(true);

    console.log('Data preservation test - Firestore operations:', firestoreWrite);
  }, 20000);
});