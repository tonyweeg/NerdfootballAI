const TestHelpers = require('./utils/test-helpers');

describe('Basic OAuth Implementation Tests', () => {
  let helpers;

  beforeEach(async () => {
    helpers = new TestHelpers(page);
  });

  test('should display Google OAuth buttons on login page', async () => {
    await helpers.navigateToPage('index.html');
    
    // Check if Google sign-in button exists
    const googleSigninBtn = await helpers.checkElementExists('#google-signin-btn');
    expect(googleSigninBtn).toBe(true);
    
    // Verify button text
    const buttonText = await helpers.getElementText('#google-signin-btn');
    expect(buttonText).toContain('Continue with Google');
  });

  test('should display Google OAuth buttons on register page', async () => {
    await helpers.navigateToPage('index.html');
    
    // Click to show register form
    await helpers.clickElement('#show-register-link');
    
    // Check if Google sign-up button exists
    const googleSignupBtn = await helpers.checkElementExists('#google-signup-btn');
    expect(googleSignupBtn).toBe(true);
    
    // Verify button text
    const buttonText = await helpers.getElementText('#google-signup-btn');
    expect(buttonText).toContain('Continue with Google');
  });

  test('should have proper OAuth button styling', async () => {
    await helpers.navigateToPage('index.html');
    
    const buttonStyles = await page.evaluate(() => {
      const button = document.querySelector('#google-signin-btn');
      const computedStyle = window.getComputedStyle(button);
      return {
        display: computedStyle.display,
        alignItems: computedStyle.alignItems,
        justifyContent: computedStyle.justifyContent,
        gap: computedStyle.gap
      };
    });
    
    expect(buttonStyles.display).toBe('flex');
    expect(buttonStyles.alignItems).toBe('center');
    expect(buttonStyles.justifyContent).toBe('center');
  });

  test('should show account linking modal elements exist', async () => {
    await helpers.navigateToPage('index.html');
    
    // Check if account linking modal exists (should be hidden)
    const linkingModal = await helpers.checkElementExists('#account-linking-modal');
    expect(linkingModal).toBe(true);
    
    // Check if password prompt modal exists (should be hidden)
    const passwordModal = await helpers.checkElementExists('#password-linking-modal');
    expect(passwordModal).toBe(true);
    
    // Verify modal is initially hidden
    const isHidden = await page.evaluate(() => {
      const modal = document.querySelector('#account-linking-modal');
      return modal.classList.contains('hidden');
    });
    expect(isHidden).toBe(true);
  });

  test('should have proper form separation with OAuth divider', async () => {
    await helpers.navigateToPage('index.html');
    
    // Check for "Or continue with" divider text
    const dividerExists = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      return spans.some(span => span.textContent.includes('Or continue with'));
    });
    
    expect(dividerExists).toBe(true);
  });

  test('should load page without JavaScript errors', async () => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await helpers.navigateToPage('index.html');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Filter out known issues that don't affect OAuth
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('manifest') &&
      !error.includes('net::ERR')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should capture OAuth UI screenshot', async () => {
    await helpers.navigateToPage('index.html');
    await helpers.takeScreenshot('oauth-login-ui');
    
    // Switch to register form
    await helpers.clickElement('#show-register-link');
    await helpers.takeScreenshot('oauth-register-ui');
  });
});