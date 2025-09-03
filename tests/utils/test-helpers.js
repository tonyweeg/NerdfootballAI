const path = require('path');
const fs = require('fs');

class TestHelpers {
  constructor(page) {
    this.page = page;
  }

  async navigateToPage(pagePath) {
    const url = `http://localhost:8080/${pagePath}`;
    await this.page.goto(url, { waitUntil: 'networkidle2' });
    return url;
  }

  async takeScreenshot(name) {
    const screenshotsDir = path.join(__dirname, '../../screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    await this.page.screenshot({ 
      path: path.join(screenshotsDir, filename),
      fullPage: true 
    });
    console.log(`Screenshot saved: ${filename}`);
  }

  async waitForElement(selector, options = {}) {
    const defaultOptions = { visible: true, timeout: 10000 };
    return await this.page.waitForSelector(selector, { ...defaultOptions, ...options });
  }

  async clickElement(selector) {
    await this.waitForElement(selector);
    await this.page.click(selector);
  }

  async typeText(selector, text) {
    await this.waitForElement(selector);
    await this.page.type(selector, text);
  }

  async getElementText(selector) {
    await this.waitForElement(selector);
    return await this.page.$eval(selector, el => el.textContent);
  }

  async getAllElementsText(selector) {
    await this.waitForElement(selector);
    return await this.page.$$eval(selector, elements => 
      elements.map(el => el.textContent.trim())
    );
  }

  async waitForNavigation(options = {}) {
    const defaultOptions = { waitUntil: 'networkidle2', timeout: 30000 };
    return await this.page.waitForNavigation({ ...defaultOptions, ...options });
  }

  async checkElementExists(selector) {
    try {
      await this.page.waitForSelector(selector, { timeout: 1000 });
      return true;
    } catch (e) {
      return false;
    }
  }

  async getPageTitle() {
    return await this.page.title();
  }

  async getCurrentURL() {
    return this.page.url();
  }

  async checkForConsoleErrors() {
    const errors = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  async measurePageLoadTime() {
    const startTime = Date.now();
    await this.page.reload({ waitUntil: 'networkidle2' });
    const endTime = Date.now();
    return endTime - startTime;
  }

  async checkAccessibility() {
    const violations = [];
    
    const missingAltTexts = await this.page.$$eval('img:not([alt])', imgs => imgs.length);
    if (missingAltTexts > 0) {
      violations.push(`${missingAltTexts} images missing alt text`);
    }
    
    const buttonsWithoutText = await this.page.$$eval('button', buttons => 
      buttons.filter(btn => !btn.textContent.trim() && !btn.getAttribute('aria-label')).length
    );
    if (buttonsWithoutText > 0) {
      violations.push(`${buttonsWithoutText} buttons without accessible text`);
    }
    
    return violations;
  }

  async checkResponsiveness(viewports = []) {
    const defaultViewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 }
    ];
    
    const viewportsToTest = viewports.length > 0 ? viewports : defaultViewports;
    const results = {};
    
    for (const viewport of viewportsToTest) {
      await this.page.setViewport({ width: viewport.width, height: viewport.height });
      await this.page.waitForTimeout(500);
      
      const isResponsive = await this.page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        const width = Math.max(body.scrollWidth, body.offsetWidth, 
                               html.clientWidth, html.scrollWidth, html.offsetWidth);
        return width <= window.innerWidth;
      });
      
      results[viewport.name] = {
        ...viewport,
        isResponsive
      };
    }
    
    return results;
  }
}

module.exports = TestHelpers;