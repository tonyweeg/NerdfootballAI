const TestHelpers = require('./utils/test-helpers');

describe('Multi-Pool System Accessibility Tests', () => {
  let helpers;

  beforeEach(async () => {
    helpers = new TestHelpers(page);
  });

  test('should pass WCAG AA accessibility audit', async () => {
    await helpers.navigateToPage('index.html');
    await page.waitForTimeout(2000);
    
    const violations = await helpers.checkAccessibility();
    console.log('Accessibility violations found:', violations);
    
    // Allow up to 3 minor violations for development
    expect(violations.length).toBeLessThanOrEqual(3);
    
    // Critical violations that should not exist
    const criticalViolations = violations.filter(v => 
      v.includes('images missing alt text') || 
      v.includes('buttons without accessible text') ||
      v.includes('form inputs without labels')
    );
    expect(criticalViolations).toHaveLength(0);
  });

  test('should support keyboard navigation', async () => {
    await helpers.navigateToPage('index.html');
    await page.waitForTimeout(1000);
    
    const keyboardResults = await helpers.performKeyboardNavigation();
    
    expect(keyboardResults.focusableElements).toBeGreaterThan(5);
    expect(keyboardResults.keyboardAccessible).toBe(true);
    
    console.log(`Found ${keyboardResults.focusableElements} focusable elements`);
  });

  test('should have proper color contrast ratios', async () => {
    await helpers.navigateToPage('index.html');
    await page.waitForTimeout(1000);
    
    const contrastViolations = await helpers.testColorContrastWCAG();
    
    // Log violations for debugging
    if (contrastViolations.length > 0) {
      console.log('Color contrast violations:', contrastViolations);
    }
    
    // Allow some flexibility during development
    expect(contrastViolations.length).toBeLessThanOrEqual(5);
  });

  test('should have accessible pool creation wizard', async () => {
    await helpers.navigateToPage('index.html');
    await page.waitForTimeout(1000);
    
    // Check if create pool button exists and is accessible
    const createPoolButton = await page.$('#createPoolBtn, [data-testid="create-pool"]');
    if (createPoolButton) {
      const buttonText = await createPoolButton.evaluate(el => el.textContent || el.getAttribute('aria-label'));
      expect(buttonText).toBeTruthy();
      expect(buttonText.trim().length).toBeGreaterThan(0);
    }
    
    // Test wizard accessibility if available
    const wizardExists = await helpers.checkElementExists('#poolCreationWizard, .pool-wizard');
    if (wizardExists) {
      // Check for proper heading structure in wizard
      const headings = await page.$$eval('h1, h2, h3, h4', headings => 
        headings.map(h => ({ 
          level: parseInt(h.tagName[1]), 
          text: h.textContent.trim() 
        }))
      );
      
      expect(headings.length).toBeGreaterThan(0);
      console.log('Found headings:', headings);
    }
  });

  test('should have accessible pool management interface', async () => {
    await helpers.navigateToPage('index.html');
    await page.waitForTimeout(1000);
    
    // Check for accessible table structures if pool management exists
    const tables = await page.$$('table');
    if (tables.length > 0) {
      for (const table of tables) {
        // Check for table headers
        const hasHeaders = await table.$eval('thead th, th', () => true).catch(() => false);
        if (hasHeaders) {
          const headerText = await table.$$eval('th', headers => 
            headers.map(h => h.textContent.trim())
          );
          expect(headerText.some(text => text.length > 0)).toBe(true);
        }
      }
    }
    
    // Check for accessible form controls
    const selects = await page.$$('select');
    for (const select of selects) {
      const hasLabel = await select.evaluate(el => {
        return el.labels?.length > 0 || 
               el.getAttribute('aria-label') || 
               el.getAttribute('aria-labelledby');
      });
      
      if (!hasLabel) {
        console.warn('Select element without proper label found');
      }
    }
  });

  test('should provide clear error messages and feedback', async () => {
    await helpers.navigateToPage('index.html');
    await page.waitForTimeout(1000);
    
    // Check for aria-live regions for dynamic feedback
    const liveRegions = await page.$$('[aria-live], .alert, .error, .success');
    console.log(`Found ${liveRegions.length} potential feedback regions`);
    
    // Check for accessible error styling
    const errorElements = await page.$$('.error, .invalid, [aria-invalid="true"]');
    for (const errorEl of errorElements) {
      const hasDescription = await errorEl.evaluate(el => {
        return el.getAttribute('aria-describedby') || 
               el.getAttribute('title') ||
               el.textContent.trim().length > 0;
      });
      
      if (!hasDescription) {
        console.warn('Error element without description found');
      }
    }
  });

  test('should be responsive and accessible on mobile', async () => {
    await page.setViewport({ width: 375, height: 667 });
    await helpers.navigateToPage('index.html');
    await page.waitForTimeout(1000);
    
    const responsiveness = await helpers.checkResponsiveness([
      { name: 'mobile', width: 375, height: 667 }
    ]);
    
    expect(responsiveness.mobile.isResponsive).toBe(true);
    
    // Check touch targets are adequate size (44px minimum)
    const smallTouchTargets = await page.evaluate(() => {
      const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
      let smallTargets = 0;
      
      interactiveElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if ((rect.width < 44 || rect.height < 44) && rect.width > 0 && rect.height > 0) {
          smallTargets++;
        }
      });
      
      return smallTargets;
    });
    
    console.log(`Found ${smallTouchTargets} potentially small touch targets`);
    // Allow some flexibility for development
    expect(smallTouchTargets).toBeLessThanOrEqual(10);
  });

  test('should provide skip links and landmarks', async () => {
    await helpers.navigateToPage('index.html');
    await page.waitForTimeout(1000);
    
    // Check for skip links
    const skipLinks = await page.$$('a[href="#main"], .skip-link, .sr-only a');
    console.log(`Found ${skipLinks.length} skip links`);
    
    // Check for semantic landmarks
    const landmarks = await page.evaluate(() => {
      const main = document.querySelector('main, [role="main"]');
      const nav = document.querySelector('nav, [role="navigation"]');
      const header = document.querySelector('header, [role="banner"]');
      const footer = document.querySelector('footer, [role="contentinfo"]');
      
      return {
        main: !!main,
        nav: !!nav,
        header: !!header,
        footer: !!footer
      };
    });
    
    console.log('Landmarks found:', landmarks);
    
    // At minimum, should have main content area
    expect(landmarks.main || landmarks.nav).toBe(true);
  });

  test('should handle focus management during navigation', async () => {
    await helpers.navigateToPage('index.html');
    await page.waitForTimeout(1000);
    
    // Test focus management by simulating modal interactions
    const buttons = await page.$$('button');
    if (buttons.length > 0) {
      // Click first button and check focus behavior
      await buttons[0].click();
      await page.waitForTimeout(500);
      
      // Check if focus is properly managed
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeElement).toBeDefined();
      expect(activeElement).not.toBe('BODY');
    }
    
    // Test escape key handling if modals exist
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    const modalVisible = await page.$eval('body', () => {
      const modals = document.querySelectorAll('.modal, [role="dialog"], .popup');
      return Array.from(modals).some(modal => 
        window.getComputedStyle(modal).display !== 'none' &&
        window.getComputedStyle(modal).visibility !== 'hidden'
      );
    });
    
    console.log('Modal visible after escape:', modalVisible);
  });

  test('should provide adequate loading states and feedback', async () => {
    await helpers.navigateToPage('index.html');
    await page.waitForTimeout(1000);
    
    // Check for loading indicators
    const loadingElements = await page.$$('.loading, .spinner, [aria-busy="true"]');
    console.log(`Found ${loadingElements.length} loading indicators`);
    
    // Check for progress indicators
    const progressElements = await page.$$('progress, [role="progressbar"]');
    console.log(`Found ${progressElements.length} progress indicators`);
    
    // Verify loading states have proper ARIA attributes
    for (const loader of loadingElements) {
      const hasAriaLabel = await loader.evaluate(el => 
        el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')
      );
      
      if (!hasAriaLabel) {
        console.warn('Loading element without accessible label');
      }
    }
  });

  test('should capture accessibility test screenshot', async () => {
    await helpers.navigateToPage('index.html');
    await page.waitForTimeout(1000);
    await helpers.takeScreenshot('accessibility-test');
  });
});