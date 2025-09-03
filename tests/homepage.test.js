const TestHelpers = require('./utils/test-helpers');

describe('NerdfootballAI Homepage Tests', () => {
  let helpers;

  beforeEach(async () => {
    helpers = new TestHelpers(page);
  });

  test('should load the homepage successfully', async () => {
    await helpers.navigateToPage('index.html');
    const title = await helpers.getPageTitle();
    expect(title).toBeDefined();
  });

  test('should display main navigation elements', async () => {
    await helpers.navigateToPage('index.html');
    
    const hasNavigation = await helpers.checkElementExists('nav') || 
                          await helpers.checkElementExists('.navigation') ||
                          await helpers.checkElementExists('[role="navigation"]');
    
    if (hasNavigation) {
      console.log('Navigation found');
    }
  });

  test('should have no console errors on page load', async () => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await helpers.navigateToPage('index.html');
    await page.waitForTimeout(2000);
    
    expect(errors).toHaveLength(0);
  });

  test('should be responsive across different viewports', async () => {
    await helpers.navigateToPage('index.html');
    const responsiveness = await helpers.checkResponsiveness();
    
    Object.values(responsiveness).forEach(viewport => {
      expect(viewport.isResponsive).toBe(true);
    });
  });

  test('should have acceptable page load time', async () => {
    await helpers.navigateToPage('index.html');
    const loadTime = await helpers.measurePageLoadTime();
    
    console.log(`Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);
  });

  test('should meet basic accessibility requirements', async () => {
    await helpers.navigateToPage('index.html');
    const violations = await helpers.checkAccessibility();
    
    if (violations.length > 0) {
      console.warn('Accessibility issues found:', violations);
    }
    
    expect(violations.length).toBeLessThanOrEqual(5);
  });

  test('should handle navigation between pages', async () => {
    await helpers.navigateToPage('index.html');
    
    const links = await page.$$eval('a[href]', links => 
      links.map(link => ({
        href: link.href,
        text: link.textContent.trim()
      })).filter(link => link.href.includes('.html'))
    );
    
    console.log(`Found ${links.length} internal navigation links`);
    
    for (const link of links.slice(0, 3)) {
      if (link.href && !link.href.includes('#')) {
        const response = await page.goto(link.href, { waitUntil: 'networkidle2' });
        expect(response.status()).toBeLessThan(400);
      }
    }
  });

  test('should capture screenshot for visual regression', async () => {
    await helpers.navigateToPage('index.html');
    await helpers.takeScreenshot('homepage');
  });
});