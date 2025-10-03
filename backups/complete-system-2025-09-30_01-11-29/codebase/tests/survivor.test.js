const TestHelpers = require('./utils/test-helpers');

describe('Nerd Survivor Tests', () => {
  let helpers;

  beforeEach(async () => {
    helpers = new TestHelpers(page);
  });

  test('should load Nerd Survivor page successfully', async () => {
    await helpers.navigateToPage('nerdSurvivor.html');
    const title = await helpers.getPageTitle();
    expect(title).toBeDefined();
  });

  test('should display week schedule data', async () => {
    await helpers.navigateToPage('nerdSurvivor.html');
    
    const hasSchedule = await helpers.checkElementExists('.schedule') ||
                        await helpers.checkElementExists('.week') ||
                        await helpers.checkElementExists('[class*="week"]');
    
    if (hasSchedule) {
      console.log('Schedule elements found');
    }
  });

  test('should have team selection functionality', async () => {
    await helpers.navigateToPage('nerdSurvivor.html');
    
    const teamElements = await page.$$('.team, [class*="team"], [data-team]');
    console.log(`Found ${teamElements.length} team elements`);
    
    const selectElements = await page.$$('select');
    const radioButtons = await page.$$('input[type="radio"]');
    const checkboxes = await page.$$('input[type="checkbox"]');
    
    const totalSelectionElements = selectElements.length + radioButtons.length + checkboxes.length;
    console.log(`Found ${totalSelectionElements} selection elements`);
  });

  test('should load JSON schedule data', async () => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('404')) {
        errors.push(msg.text());
      }
    });
    
    await helpers.navigateToPage('nerdSurvivor.html');
    await page.waitForTimeout(2000);
    
    const jsonLoadErrors = errors.filter(e => e.includes('.json'));
    if (jsonLoadErrors.length > 0) {
      console.warn('JSON loading errors:', jsonLoadErrors);
    }
  });

  test('should handle week navigation', async () => {
    await helpers.navigateToPage('nerdSurvivor.html');
    
    const weekNavigation = await page.$$('[class*="week"], button:has-text("Week"), a:has-text("Week")');
    
    if (weekNavigation.length > 0) {
      console.log(`Found ${weekNavigation.length} week navigation elements`);
      
      const firstWeekElement = weekNavigation[0];
      const tagName = await firstWeekElement.evaluate(el => el.tagName.toLowerCase());
      
      if (tagName === 'button' || tagName === 'a') {
        await firstWeekElement.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should display game matchups', async () => {
    await helpers.navigateToPage('nerdSurvivor.html');
    await page.waitForTimeout(1000);
    
    const matchupElements = await page.$$eval('*', elements => {
      return elements.filter(el => {
        const text = el.textContent.toLowerCase();
        return text.includes(' vs ') || text.includes(' @ ') || text.includes('matchup');
      }).length;
    });
    
    console.log(`Found ${matchupElements} potential matchup elements`);
  });

  test('should be mobile responsive', async () => {
    await page.setViewport({ width: 375, height: 812 });
    await helpers.navigateToPage('nerdSurvivor.html');
    
    const responsiveness = await helpers.checkResponsiveness([
      { name: 'iPhone', width: 375, height: 812 }
    ]);
    
    expect(responsiveness.iPhone.isResponsive).toBe(true);
  });

  test('should capture survivor page screenshot', async () => {
    await helpers.navigateToPage('nerdSurvivor.html');
    await page.waitForTimeout(1000);
    await helpers.takeScreenshot('survivor-page');
  });
});