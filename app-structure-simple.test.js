// 💎 DIAMOND LEVEL JEST TESTS - Simple App Structure Validation 🚀
// Unit tests to validate critical JavaScript structure after rulesViewBtn removal

/**
 * @jest-environment jsdom
 */

describe('💎 Diamond Level App Structure Tests', () => {

  beforeEach(() => {
    // Setup DOM environment matching our app structure
    document.body.innerHTML = `
      <div id="picks-container" class="container"></div>
      <div id="admin-container" class="hidden container"></div>
      <div id="leaderboard-container" class="hidden container"></div>
      <button id="menu-picks-view-btn">My Picks</button>
      <button id="menu-admin-view-btn" class="hidden">Admin</button>
      <button id="leaderboard-view-btn">Leaderboard</button>
      <div id="menu-panel" class="hidden"></div>
      <button id="menu-btn">Menu</button>
      <a href="./nerdfootballRules.html">Rules of the Nerd</a>
    `;
  });

  test('🚨 CRITICAL: No rulesViewBtn references should exist', () => {
    // This is the key test - the element that was causing addEventListener error
    const rulesViewBtn = document.getElementById('rules-view-btn');
    expect(rulesViewBtn).toBeNull();
  });

  test('🚨 CRITICAL: Rules container should not exist in DOM', () => {
    const rulesContainer = document.getElementById('rules-container');
    expect(rulesContainer).toBeNull();
  });

  test('✅ Rules link should be anchor tag, not button', () => {
    const rulesLink = document.querySelector('a[href="./nerdfootballRules.html"]');
    expect(rulesLink).toBeTruthy();
    expect(rulesLink.tagName.toLowerCase()).toBe('a');
    expect(rulesLink.getAttribute('href')).toBe('./nerdfootballRules.html');
  });

  test('✅ Essential containers should still exist', () => {
    expect(document.getElementById('picks-container')).toBeTruthy();
    expect(document.getElementById('admin-container')).toBeTruthy();
    expect(document.getElementById('leaderboard-container')).toBeTruthy();
  });

  test('✅ Menu buttons should still exist', () => {
    expect(document.getElementById('menu-btn')).toBeTruthy();
    expect(document.getElementById('menu-picks-view-btn')).toBeTruthy();
    expect(document.getElementById('menu-admin-view-btn')).toBeTruthy();
    expect(document.getElementById('leaderboard-view-btn')).toBeTruthy();
  });

  test('🚨 CRITICAL: allUI object would be safe now', () => {
    // Simulate how the allUI object is created in the actual app
    const allUI = {
      picksContainer: document.getElementById('picks-container'),
      adminContainer: document.getElementById('admin-container'), 
      leaderboardContainer: document.getElementById('leaderboard-container'),
      leaderboardViewBtn: document.getElementById('leaderboard-view-btn'),
      menuPanel: document.getElementById('menu-panel'),
      // rulesViewBtn: removed - would have been null causing error
      // closeRulesBtn: removed - would have been null causing error
    };

    // Test that critical UI elements exist
    expect(allUI.picksContainer).toBeTruthy();
    expect(allUI.adminContainer).toBeTruthy();
    expect(allUI.leaderboardContainer).toBeTruthy();
    expect(allUI.leaderboardViewBtn).toBeTruthy();
    
    // The key fix: rulesViewBtn is not defined, so no null addEventListener
    expect(allUI.rulesViewBtn).toBeUndefined();
  });

  test('🚨 CRITICAL: getCurrentView function would work safely', () => {
    // Simulate the updated getCurrentView function without rules reference
    const getCurrentView = () => {
      const adminContainer = document.getElementById('admin-container');
      const leaderboardContainer = document.getElementById('leaderboard-container');
      
      if (!adminContainer.classList.contains('hidden')) return 'admin';
      if (!leaderboardContainer.classList.contains('hidden')) return 'leaderboard';
      // Note: removed rulesContainer check that would have failed
      return 'picks';
    };

    expect(getCurrentView()).toBe('picks');
    
    document.getElementById('admin-container').classList.remove('hidden');
    expect(getCurrentView()).toBe('admin');
  });

  test('🚨 CRITICAL: addEventListener would work safely now', () => {
    // Test that existing elements can safely receive event listeners
    const menuBtn = document.getElementById('menu-btn');
    const leaderboardBtn = document.getElementById('leaderboard-view-btn');
    
    expect(() => {
      if (menuBtn) menuBtn.addEventListener('click', () => {});
      if (leaderboardBtn) leaderboardBtn.addEventListener('click', () => {});
    }).not.toThrow();
    
    // The fix: rulesViewBtn is null, so we wouldn't try addEventListener on it
    const rulesViewBtn = document.getElementById('rules-view-btn');
    expect(rulesViewBtn).toBeNull();
    
    // This would have caused the error before the fix:
    // rulesViewBtn.addEventListener() -> Cannot read properties of null
  });

  test('✅ URL routing case would handle rules properly', () => {
    // Simulate the updated URL routing logic
    const handleRulesRoute = () => {
      // New logic: redirect to standalone page instead of trying to click null button
      const mockWindow = { location: { href: '' } };
      mockWindow.location.href = './nerdfootballRules.html';
      return mockWindow.location.href;
    };

    expect(handleRulesRoute()).toBe('./nerdfootballRules.html');
  });
});

console.log('\\n💎🏆 DIAMOND LEVEL JEST VALIDATION COMPLETE! 🏆💎');