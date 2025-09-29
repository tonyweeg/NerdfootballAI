const OAuthTestHelpers = require('./utils/oauth-helpers');

describe('Data Integrity During OAuth Account Merge', () => {
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
      await oauthHelper.takeOAuthScreenshot('data-integrity-cleanup');
      await page.close();
    }
  });

  test('Preserves all user profile data during linking', async () => {
    // Create user with comprehensive profile data
    const richUser = {
      uid: 'rich-profile-user-123',
      email: 'rich@example.com',
      displayName: 'Rich Profile User',
      authMethod: 'password',
      profile: {
        firstName: 'Rich',
        lastName: 'User',
        avatar: 'https://example.com/avatar.jpg',
        bio: 'A comprehensive user profile for testing',
        location: 'Test City, TC',
        timezone: 'America/New_York',
        language: 'en',
        theme: 'dark',
        notifications: {
          email: true,
          push: false,
          sms: true
        },
        preferences: {
          autoSave: true,
          publicProfile: false,
          twoFactorAuth: true
        }
      },
      gameData: {
        totalGames: 45,
        wins: 23,
        losses: 22,
        winStreak: 5,
        longestStreak: 12,
        favoriteTeams: ['Patriots', 'Rams', 'Chiefs'],
        achievements: ['first_win', 'ten_streak', 'season_winner'],
        statistics: {
          correctPicks: 67.8,
          averageScore: 8.5,
          bestWeek: 14,
          totalPoints: 385
        }
      },
      accountHistory: {
        createdAt: '2023-01-15',
        lastLogin: '2024-01-20',
        loginCount: 127,
        passwordChangeHistory: ['2023-01-15', '2023-06-10'],
        securityEvents: []
      },
      subscriptions: {
        premium: true,
        newsletter: true,
        notifications: 'weekly'
      }
    };

    // Setup rich user in system
    await oauthHelper.setupTestUser(richUser);

    // Authenticate with existing email/password account
    await oauthHelper.typeText('#email-input', richUser.email);
    await oauthHelper.typeText('#password-input', 'securepassword123');
    await oauthHelper.clickElement('#login-btn');
    await oauthHelper.waitForNavigation();

    // Verify user is authenticated with rich data
    let isAuthenticated = await oauthHelper.verifyAuthenticationState('authenticated');
    expect(isAuthenticated).toBe(true);

    // Take screenshot before data preservation test
    await oauthHelper.takeOAuthScreenshot('before-comprehensive-data-preservation');

    // Capture pre-linking data state
    const preLinkingData = await page.evaluate(() => {
      // Simulate capturing user data from UI/state
      const userData = {
        displayName: document.querySelector('#user-display-name') ? 
          document.querySelector('#user-display-name').textContent : null,
        email: document.querySelector('#user-email') ? 
          document.querySelector('#user-email').textContent : null,
        profileVisible: !!document.querySelector('#user-profile'),
        menuItems: Array.from(document.querySelectorAll('#user-menu .menu-item')).length,
        dashboardElements: Array.from(document.querySelectorAll('.dashboard-widget')).length
      };
      
      // Capture any profile data visible in UI
      const profileElements = document.querySelectorAll('[data-profile]');
      userData.visibleProfileData = Array.from(profileElements).map(el => ({
        key: el.dataset.profile,
        value: el.textContent || el.value
      }));
      
      return userData;
    });

    // Setup Google OAuth for linking (same email)
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'google-linked-rich-user',
      email: richUser.email, // Same email for successful linking
      displayName: richUser.displayName,
      providerId: 'google.com',
      emailVerified: true,
      // Google may provide additional data
      googleProfile: {
        picture: 'https://google.com/avatar.jpg',
        locale: 'en',
        given_name: 'Rich',
        family_name: 'User'
      }
    });

    // Perform account linking
    const linkButtonExists = await oauthHelper.checkElementExists('#link-google-btn');
    if (linkButtonExists) {
      await oauthHelper.clickElement('#link-google-btn');
    } else {
      await oauthHelper.clickGoogleSignInButton();
    }

    // Wait for linking completion
    await page.waitForTimeout(4000);

    // Take screenshot after linking
    await oauthHelper.takeOAuthScreenshot('after-comprehensive-data-preservation');

    // Verify account linking was successful
    const linkingResult = await oauthHelper.verifyAccountLinking(
      richUser.uid, 
      ['password', 'google.com']
    );
    expect(linkingResult.isLinked).toBe(true);

    // Capture post-linking data state
    const postLinkingData = await page.evaluate(() => {
      const userData = {
        displayName: document.querySelector('#user-display-name') ? 
          document.querySelector('#user-display-name').textContent : null,
        email: document.querySelector('#user-email') ? 
          document.querySelector('#user-email').textContent : null,
        profileVisible: !!document.querySelector('#user-profile'),
        menuItems: Array.from(document.querySelectorAll('#user-menu .menu-item')).length,
        dashboardElements: Array.from(document.querySelectorAll('.dashboard-widget')).length
      };
      
      // Capture profile data after linking
      const profileElements = document.querySelectorAll('[data-profile]');
      userData.visibleProfileData = Array.from(profileElements).map(el => ({
        key: el.dataset.profile,
        value: el.textContent || el.value
      }));
      
      return userData;
    });

    // Verify data integrity
    expect(postLinkingData.displayName).toBe(preLinkingData.displayName);
    expect(postLinkingData.email).toBe(preLinkingData.email);
    expect(postLinkingData.profileVisible).toBe(preLinkingData.profileVisible);
    expect(postLinkingData.menuItems).toBe(preLinkingData.menuItems);

    // Verify no data loss in visible profile elements
    expect(postLinkingData.visibleProfileData.length).toBeGreaterThanOrEqual(preLinkingData.visibleProfileData.length);

    // Verify no linking errors occurred
    const linkingError = await oauthHelper.checkForOAuthErrors();
    expect(linkingError).toBeNull();

    // Verify Firestore operations occurred for data preservation
    const firestoreOperations = await oauthHelper.verifyFirestoreWrite('update', richUser.profile);
    expect(firestoreOperations.hasFirestoreWrite).toBe(true);

    console.log('Comprehensive Data Preservation Test:', {
      preLinkingElements: preLinkingData.visibleProfileData.length,
      postLinkingElements: postLinkingData.visibleProfileData.length,
      dataIntegrityMaintained: postLinkingData.displayName === preLinkingData.displayName,
      firestoreOperations: firestoreOperations.requestCount
    });
  }, 25000);

  test('Handles conflicting profile data appropriately', async () => {
    // Create users with conflicting profile data
    const emailUser = {
      uid: 'email-user-conflicts',
      email: 'conflicts@example.com',
      displayName: 'Email User Profile',
      authMethod: 'password',
      profile: {
        firstName: 'Email',
        lastName: 'User',
        avatar: 'https://example.com/email-avatar.jpg',
        bio: 'User created via email signup',
        location: 'Email City, EC',
        timezone: 'America/Chicago',
        language: 'en',
        theme: 'light',
        preferences: {
          publicProfile: true,
          notifications: 'daily'
        }
      },
      metadata: {
        source: 'email_registration',
        createdAt: '2023-06-01',
        lastUpdated: '2023-12-15'
      }
    };

    const conflictingGoogleData = {
      uid: 'google-user-conflicts',
      email: 'conflicts@example.com', // Same email, different profile data
      displayName: 'Google User Profile', // Conflict: different display name
      providerId: 'google.com',
      emailVerified: true,
      googleProfile: {
        given_name: 'Google',      // Conflict: different first name
        family_name: 'User',       // Same last name
        picture: 'https://google.com/google-avatar.jpg', // Conflict: different avatar
        locale: 'es',              // Conflict: different language
        bio: 'User from Google OAuth'  // Conflict: different bio
      },
      metadata: {
        source: 'google_oauth',
        createdAt: '2024-01-10'
      }
    };

    // Setup email user first
    await oauthHelper.setupTestUser(emailUser);

    // Authenticate with email/password
    await oauthHelper.typeText('#email-input', emailUser.email);
    await oauthHelper.typeText('#password-input', 'securepassword123');
    await oauthHelper.clickElement('#login-btn');
    await oauthHelper.waitForNavigation();

    // Take screenshot before conflict resolution
    await oauthHelper.takeOAuthScreenshot('before-conflict-resolution');

    // Capture original user data
    const originalUserData = await page.evaluate(() => ({
      displayName: document.querySelector('#user-display-name') ? 
        document.querySelector('#user-display-name').textContent : null,
      avatar: document.querySelector('#user-avatar') ? 
        document.querySelector('#user-avatar').src : null,
      profileData: Array.from(document.querySelectorAll('[data-profile]')).map(el => ({
        key: el.dataset.profile,
        value: el.textContent || el.value || el.src
      }))
    }));

    // Setup OAuth with conflicting data
    await oauthHelper.mockGoogleOAuthPopup(conflictingGoogleData);

    // Attempt account linking with conflicting data
    const linkButtonExists = await oauthHelper.checkElementExists('#link-google-btn');
    if (linkButtonExists) {
      await oauthHelper.clickElement('#link-google-btn');
    } else {
      await oauthHelper.clickGoogleSignInButton();
    }

    // Wait for conflict resolution processing
    await page.waitForTimeout(5000);

    // Take screenshot after conflict resolution
    await oauthHelper.takeOAuthScreenshot('after-conflict-resolution');

    // Check if conflict resolution dialog appeared
    const conflictDialogExists = await oauthHelper.checkElementExists('#conflict-resolution-dialog');
    
    if (conflictDialogExists) {
      // If system shows conflict resolution UI
      await oauthHelper.takeOAuthScreenshot('conflict-resolution-dialog');
      
      // Simulate user choosing to keep original data (or system default)
      const keepOriginalButton = await oauthHelper.checkElementExists('#keep-original-btn');
      const mergeDataButton = await oauthHelper.checkElementExists('#merge-data-btn');
      
      if (keepOriginalButton) {
        await oauthHelper.clickElement('#keep-original-btn');
      } else if (mergeDataButton) {
        await oauthHelper.clickElement('#merge-data-btn');
      }
      
      await page.waitForTimeout(2000);
    }

    // Verify account linking completed
    const linkingResult = await oauthHelper.verifyAccountLinking(
      emailUser.uid,
      ['password', 'google.com']
    );
    expect(linkingResult.isLinked).toBe(true);

    // Capture resolved user data
    const resolvedUserData = await page.evaluate(() => ({
      displayName: document.querySelector('#user-display-name') ? 
        document.querySelector('#user-display-name').textContent : null,
      avatar: document.querySelector('#user-avatar') ? 
        document.querySelector('#user-avatar').src : null,
      profileData: Array.from(document.querySelectorAll('[data-profile]')).map(el => ({
        key: el.dataset.profile,
        value: el.textContent || el.value || el.src
      }))
    }));

    // Verify conflict resolution strategy
    // The system should have a consistent strategy (e.g., keep original, prefer Google, or merge)
    expect(resolvedUserData.displayName).toBeTruthy();
    
    // Verify no data was lost entirely
    const hasUserData = resolvedUserData.displayName && 
                       (resolvedUserData.displayName === originalUserData.displayName ||
                        resolvedUserData.displayName === conflictingGoogleData.displayName);
    expect(hasUserData).toBe(true);

    // Verify no system errors during conflict resolution
    const conflictError = await oauthHelper.checkForOAuthErrors();
    if (conflictError) {
      expect(conflictError.toLowerCase()).not.toMatch(/error|failed|undefined/);
    }

    console.log('Conflict Resolution Analysis:', {
      originalDisplayName: originalUserData.displayName,
      conflictingDisplayName: conflictingGoogleData.displayName,
      resolvedDisplayName: resolvedUserData.displayName,
      hadConflictDialog: conflictDialogExists,
      resolutionStrategy: resolvedUserData.displayName === originalUserData.displayName ? 'kept_original' : 
                         resolvedUserData.displayName === conflictingGoogleData.displayName ? 'used_google' : 'merged_data',
      accountsLinked: linkingResult.isLinked
    });
  }, 30000);

  test('Maintains user activity history during merge', async () => {
    // Create user with extensive activity history
    const activeUser = {
      uid: 'active-history-user',
      email: 'history@example.com',
      displayName: 'Active History User',
      authMethod: 'password',
      gameHistory: [
        { 
          gameId: 'game_001', 
          date: '2023-09-01', 
          picks: ['Patriots', 'Cowboys', 'Chiefs'], 
          score: 12, 
          result: 'win' 
        },
        { 
          gameId: 'game_002', 
          date: '2023-09-08', 
          picks: ['Bills', 'Dolphins', 'Ravens'], 
          score: 8, 
          result: 'loss' 
        },
        { 
          gameId: 'game_003', 
          date: '2023-09-15', 
          picks: ['Steelers', 'Bengals', 'Browns'], 
          score: 14, 
          result: 'win' 
        }
      ],
      achievements: [
        { id: 'first_win', date: '2023-09-01', description: 'First game victory' },
        { id: 'five_wins', date: '2023-10-15', description: 'Won 5 games' },
        { id: 'perfect_week', date: '2023-11-01', description: 'Perfect week prediction' }
      ],
      statistics: {
        totalGames: 28,
        totalWins: 16,
        totalLosses: 12,
        bestStreak: 7,
        currentStreak: 3,
        averageScore: 9.2,
        totalPoints: 258
      },
      loginHistory: [
        { date: '2024-01-20', ip: '192.168.1.100', device: 'Chrome/Desktop' },
        { date: '2024-01-19', ip: '192.168.1.100', device: 'Chrome/Desktop' },
        { date: '2024-01-18', ip: '10.0.0.50', device: 'Safari/Mobile' }
      ]
    };

    // Setup active user
    await oauthHelper.setupTestUser(activeUser);

    // Authenticate user
    await oauthHelper.typeText('#email-input', activeUser.email);
    await oauthHelper.typeText('#password-input', 'securepassword123');
    await oauthHelper.clickElement('#login-btn');
    await oauthHelper.waitForNavigation();

    // Take screenshot before history preservation
    await oauthHelper.takeOAuthScreenshot('before-history-preservation');

    // Capture existing activity data visible in UI
    const preActivityData = await page.evaluate(() => {
      const activityData = {
        gameHistoryCount: document.querySelectorAll('.game-history-item').length,
        achievementCount: document.querySelectorAll('.achievement-item').length,
        statisticsVisible: !!document.querySelector('.user-statistics'),
        totalGamesDisplay: document.querySelector('#total-games') ? 
          document.querySelector('#total-games').textContent : null,
        totalWinsDisplay: document.querySelector('#total-wins') ? 
          document.querySelector('#total-wins').textContent : null,
        currentStreakDisplay: document.querySelector('#current-streak') ? 
          document.querySelector('#current-streak').textContent : null
      };
      
      // Capture specific game history if visible
      activityData.gameHistoryItems = Array.from(document.querySelectorAll('.game-history-item')).map(item => ({
        id: item.dataset.gameId || item.id,
        visible: !item.classList.contains('hidden'),
        content: item.textContent.trim().substring(0, 50) + '...'
      }));
      
      return activityData;
    });

    // Setup Google OAuth for linking
    await oauthHelper.mockGoogleOAuthPopup({
      uid: 'google-history-preservation',
      email: activeUser.email,
      displayName: activeUser.displayName,
      providerId: 'google.com',
      emailVerified: true
    });

    // Perform account linking
    const linkButtonExists = await oauthHelper.checkElementExists('#link-google-btn');
    if (linkButtonExists) {
      await oauthHelper.clickElement('#link-google-btn');
    } else {
      await oauthHelper.clickGoogleSignInButton();
    }

    // Wait for linking and data merge completion
    await page.waitForTimeout(5000);

    // Take screenshot after history preservation
    await oauthHelper.takeOAuthScreenshot('after-history-preservation');

    // Verify account linking succeeded
    const linkingResult = await oauthHelper.verifyAccountLinking(
      activeUser.uid,
      ['password', 'google.com']
    );
    expect(linkingResult.isLinked).toBe(true);

    // Capture post-linking activity data
    const postActivityData = await page.evaluate(() => {
      const activityData = {
        gameHistoryCount: document.querySelectorAll('.game-history-item').length,
        achievementCount: document.querySelectorAll('.achievement-item').length,
        statisticsVisible: !!document.querySelector('.user-statistics'),
        totalGamesDisplay: document.querySelector('#total-games') ? 
          document.querySelector('#total-games').textContent : null,
        totalWinsDisplay: document.querySelector('#total-wins') ? 
          document.querySelector('#total-wins').textContent : null,
        currentStreakDisplay: document.querySelector('#current-streak') ? 
          document.querySelector('#current-streak').textContent : null
      };
      
      activityData.gameHistoryItems = Array.from(document.querySelectorAll('.game-history-item')).map(item => ({
        id: item.dataset.gameId || item.id,
        visible: !item.classList.contains('hidden'),
        content: item.textContent.trim().substring(0, 50) + '...'
      }));
      
      return activityData;
    });

    // Verify activity history preservation
    expect(postActivityData.gameHistoryCount).toBe(preActivityData.gameHistoryCount);
    expect(postActivityData.achievementCount).toBe(preActivityData.achievementCount);
    expect(postActivityData.statisticsVisible).toBe(preActivityData.statisticsVisible);

    // Verify specific statistics maintained
    if (preActivityData.totalGamesDisplay && postActivityData.totalGamesDisplay) {
      expect(postActivityData.totalGamesDisplay).toBe(preActivityData.totalGamesDisplay);
    }
    
    if (preActivityData.totalWinsDisplay && postActivityData.totalWinsDisplay) {
      expect(postActivityData.totalWinsDisplay).toBe(preActivityData.totalWinsDisplay);
    }

    // Verify individual game history items preserved
    expect(postActivityData.gameHistoryItems.length).toBe(preActivityData.gameHistoryItems.length);
    
    preActivityData.gameHistoryItems.forEach((preItem, index) => {
      const postItem = postActivityData.gameHistoryItems[index];
      if (postItem) {
        expect(postItem.id).toBe(preItem.id);
        expect(postItem.visible).toBe(preItem.visible);
      }
    });

    // Verify no data corruption occurred
    const dataIntegrityError = await oauthHelper.checkForOAuthErrors();
    expect(dataIntegrityError).toBeNull();

    // Check for database operations preserving history
    const firestoreOperations = await oauthHelper.verifyFirestoreWrite('merge', activeUser);
    expect(firestoreOperations.hasFirestoreWrite).toBe(true);

    console.log('Activity History Preservation Test:', {
      preGameHistoryCount: preActivityData.gameHistoryCount,
      postGameHistoryCount: postActivityData.gameHistoryCount,
      preAchievementCount: preActivityData.achievementCount,
      postAchievementCount: postActivityData.achievementCount,
      historyIntegrityMaintained: postActivityData.gameHistoryCount === preActivityData.gameHistoryCount,
      firestoreOperations: firestoreOperations.requestCount
    });
  }, 30000);

  test('Validates data consistency across multiple sessions', async () => {
    // Test data consistency when user accesses account from different sessions/devices
    
    const multiSessionUser = {
      uid: 'multi-session-user',
      email: 'multisession@example.com',
      displayName: 'Multi Session User',
      authMethod: 'password',
      linkedAccounts: ['password', 'google.com'],
      sessionData: {
        preferences: { theme: 'dark', autoSave: true },
        currentGame: 'week_15_2024',
        activePicks: ['Patriots', 'Cowboys', 'Chiefs'],
        temporaryData: { lastAction: 'pick_selection', timestamp: Date.now() }
      }
    };

    await oauthHelper.setupTestUser(multiSessionUser);

    // Session 1: Login with email/password
    await oauthHelper.typeText('#email-input', multiSessionUser.email);
    await oauthHelper.typeText('#password-input', 'securepassword123');
    await oauthHelper.clickElement('#login-btn');
    await oauthHelper.waitForNavigation();

    // Take screenshot of session 1
    await oauthHelper.takeOAuthScreenshot('session1-email-login');

    // Capture session 1 data
    const session1Data = await page.evaluate(() => ({
      displayName: document.querySelector('#user-display-name') ? 
        document.querySelector('#user-display-name').textContent : null,
      theme: document.body.classList.contains('dark-theme') ? 'dark' : 'light',
      userMenuVisible: !!document.querySelector('#user-menu'),
      activePicksCount: document.querySelectorAll('.active-pick').length,
      gameDataVisible: !!document.querySelector('.game-data'),
      preferences: Array.from(document.querySelectorAll('[data-preference]')).map(el => ({
        key: el.dataset.preference,
        value: el.checked || el.value || el.textContent
      }))
    }));

    // Simulate user making changes in session 1
    await page.evaluate(() => {
      // Simulate user activity
      const themeToggle = document.querySelector('#theme-toggle');
      if (themeToggle) themeToggle.click();
      
      const autoSaveToggle = document.querySelector('#auto-save-toggle');
      if (autoSaveToggle) autoSaveToggle.click();
    });

    await page.waitForTimeout(1000);

    // Logout from session 1
    const logoutButton = await oauthHelper.checkElementExists('#logout-btn');
    if (logoutButton) {
      await oauthHelper.clickElement('#logout-btn');
      await page.waitForTimeout(2000);
    }

    // Clear browser state to simulate different device/session
    await oauthHelper.clearAuthState();
    await oauthHelper.navigateToPage('');
    await page.waitForTimeout(1000);

    // Session 2: Login with Google OAuth (same account, different auth method)
    await oauthHelper.setupTestUser(multiSessionUser);
    await oauthHelper.mockGoogleOAuthPopup({
      uid: multiSessionUser.uid,
      email: multiSessionUser.email,
      displayName: multiSessionUser.displayName,
      providerId: 'google.com',
      emailVerified: true
    });

    await oauthHelper.clickGoogleSignInButton();
    await oauthHelper.waitForOAuthCompletion();

    // Take screenshot of session 2
    await oauthHelper.takeOAuthScreenshot('session2-oauth-login');

    // Capture session 2 data
    const session2Data = await page.evaluate(() => ({
      displayName: document.querySelector('#user-display-name') ? 
        document.querySelector('#user-display-name').textContent : null,
      theme: document.body.classList.contains('dark-theme') ? 'dark' : 'light',
      userMenuVisible: !!document.querySelector('#user-menu'),
      activePicksCount: document.querySelectorAll('.active-pick').length,
      gameDataVisible: !!document.querySelector('.game-data'),
      preferences: Array.from(document.querySelectorAll('[data-preference]')).map(el => ({
        key: el.dataset.preference,
        value: el.checked || el.value || el.textContent
      }))
    }));

    // Verify data consistency between sessions
    expect(session2Data.displayName).toBe(session1Data.displayName);
    expect(session2Data.userMenuVisible).toBe(session1Data.userMenuVisible);
    expect(session2Data.gameDataVisible).toBe(session1Data.gameDataVisible);

    // Verify user preferences persisted across sessions and auth methods
    if (session1Data.preferences.length > 0 && session2Data.preferences.length > 0) {
      session1Data.preferences.forEach(pref1 => {
        const pref2 = session2Data.preferences.find(p => p.key === pref1.key);
        if (pref2) {
          expect(pref2.value).toBe(pref1.value);
        }
      });
    }

    // Verify no authentication errors across sessions
    const session2Error = await oauthHelper.checkForOAuthErrors();
    expect(session2Error).toBeNull();

    // Test rapid session switching (back to email/password)
    await oauthHelper.clearAuthState();
    await oauthHelper.navigateToPage('');
    await page.waitForTimeout(500);

    // Session 3: Quick switch back to email/password
    await oauthHelper.typeText('#email-input', multiSessionUser.email);
    await oauthHelper.typeText('#password-input', 'securepassword123');
    await oauthHelper.clickElement('#login-btn');
    await oauthHelper.waitForNavigation();

    // Take screenshot of session 3
    await oauthHelper.takeOAuthScreenshot('session3-rapid-switch');

    // Verify data consistency after rapid switching
    const session3Data = await page.evaluate(() => ({
      displayName: document.querySelector('#user-display-name') ? 
        document.querySelector('#user-display-name').textContent : null,
      userMenuVisible: !!document.querySelector('#user-menu'),
      gameDataVisible: !!document.querySelector('.game-data')
    }));

    expect(session3Data.displayName).toBe(session1Data.displayName);
    expect(session3Data.userMenuVisible).toBe(session1Data.userMenuVisible);

    // Verify account linking status remains consistent
    const finalLinkingStatus = await oauthHelper.verifyAccountLinking(
      multiSessionUser.uid,
      ['password', 'google.com']
    );
    expect(finalLinkingStatus.isLinked).toBe(true);

    console.log('Multi-Session Data Consistency Test:', {
      session1DisplayName: session1Data.displayName,
      session2DisplayName: session2Data.displayName,
      session3DisplayName: session3Data.displayName,
      dataConsistencyMaintained: 
        session1Data.displayName === session2Data.displayName && 
        session2Data.displayName === session3Data.displayName,
      preferencesConsistent: session1Data.preferences.length === session2Data.preferences.length,
      accountsRemainsLinked: finalLinkingStatus.isLinked
    });
  }, 35000);
});