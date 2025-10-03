const TestHelpers = require('./utils/test-helpers');

describe('Nerdfootball The Grid Tests', () => {
  let helpers;

  beforeEach(async () => {
    helpers = new TestHelpers(page);
  });

  test('should load The Grid page successfully', async () => {
    await helpers.navigateToPage('nerdfootballTheGrid.html');
    const title = await helpers.getPageTitle();
    expect(title).toBeDefined();
  });

  test('should display grid layout', async () => {
    await helpers.navigateToPage('nerdfootballTheGrid.html');
    
    const hasGrid = await helpers.checkElementExists('.grid') ||
                    await helpers.checkElementExists('[class*="grid"]') ||
                    await helpers.checkElementExists('table');
    
    expect(hasGrid).toBe(true);
  });

  test('should have interactive elements', async () => {
    await helpers.navigateToPage('nerdfootballTheGrid.html');
    
    const buttons = await page.$$('button');
    const inputs = await page.$$('input');
    const selects = await page.$$('select');
    
    const totalInteractive = buttons.length + inputs.length + selects.length;
    console.log(`Found ${totalInteractive} interactive elements`);
    
    expect(totalInteractive).toBeGreaterThan(0);
  });

  test('should handle user interactions', async () => {
    await helpers.navigateToPage('nerdfootballTheGrid.html');
    
    const clickableElements = await page.$$('[onclick], button, a, input[type="submit"], input[type="button"]');
    
    if (clickableElements.length > 0) {
      const firstClickable = clickableElements[0];
      const tagName = await firstClickable.evaluate(el => el.tagName.toLowerCase());
      
      if (tagName !== 'a' || !(await firstClickable.evaluate(el => el.href))) {
        await firstClickable.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should load data properly', async () => {
    await helpers.navigateToPage('nerdfootballTheGrid.html');
    
    await page.waitForTimeout(2000);
    
    const dataElements = await page.$$('[data-id], [data-team], [data-week], .team, .week');
    console.log(`Found ${dataElements.length} data elements`);
  });

  test('should be responsive on mobile', async () => {
    await page.setViewport({ width: 375, height: 667 });
    await helpers.navigateToPage('nerdfootballTheGrid.html');
    
    const isResponsive = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      const width = Math.max(body.scrollWidth, body.offsetWidth, 
                             html.clientWidth, html.scrollWidth, html.offsetWidth);
      return width <= window.innerWidth;
    });
    
    expect(isResponsive).toBe(true);
  });

  test('should capture grid screenshot', async () => {
    await helpers.navigateToPage('nerdfootballTheGrid.html');
    await page.waitForTimeout(1000);
    await helpers.takeScreenshot('grid-page');
  });
});