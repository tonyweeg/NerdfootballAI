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
    
    // Check images for alt text
    const missingAltTexts = await this.page.$$eval('img:not([alt])', imgs => imgs.length);
    if (missingAltTexts > 0) {
      violations.push(`${missingAltTexts} images missing alt text`);
    }
    
    // Check buttons for accessible text
    const buttonsWithoutText = await this.page.$$eval('button', buttons => 
      buttons.filter(btn => !btn.textContent.trim() && !btn.getAttribute('aria-label')).length
    );
    if (buttonsWithoutText > 0) {
      violations.push(`${buttonsWithoutText} buttons without accessible text`);
    }
    
    // Check form inputs for labels
    const inputsWithoutLabels = await this.page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea, select');
      let unlabeled = 0;
      
      inputs.forEach(input => {
        const hasLabel = input.labels && input.labels.length > 0;
        const hasAriaLabel = input.getAttribute('aria-label');
        const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
        
        if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
          unlabeled++;
        }
      });
      
      return unlabeled;
    });
    if (inputsWithoutLabels > 0) {
      violations.push(`${inputsWithoutLabels} form inputs without labels`);
    }
    
    // Check heading structure
    const headingStructure = await this.page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const levels = headings.map(h => parseInt(h.tagName.charAt(1)));
      const issues = [];
      
      if (levels.length > 0 && levels[0] !== 1) {
        issues.push('Page does not start with h1');
      }
      
      for (let i = 1; i < levels.length; i++) {
        if (levels[i] > levels[i-1] + 1) {
          issues.push(`Heading level jumps from h${levels[i-1]} to h${levels[i]}`);
        }
      }
      
      return issues;
    });
    violations.push(...headingStructure);
    
    // Check color contrast (basic check)
    const lowContrastElements = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let lowContrast = 0;
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const bgColor = styles.backgroundColor;
        const textColor = styles.color;
        
        // Basic check for common low contrast combinations
        if (bgColor && textColor) {
          const isLightGray = bgColor.includes('rgb(240') || bgColor.includes('rgb(248');
          const isLightText = textColor.includes('rgb(180') || textColor.includes('rgb(200');
          
          if (isLightGray && isLightText && el.textContent.trim()) {
            lowContrast++;
          }
        }
      });
      
      return lowContrast;
    });
    if (lowContrastElements > 0) {
      violations.push(`${lowContrastElements} elements may have low color contrast`);
    }
    
    // Check for keyboard navigation
    const keyboardIssues = await this.page.evaluate(() => {
      const focusableElements = document.querySelectorAll('a, button, input, textarea, select, [tabindex]');
      const issues = [];
      
      let hasPositiveTabIndex = false;
      focusableElements.forEach(el => {
        const tabIndex = el.getAttribute('tabindex');
        if (tabIndex && parseInt(tabIndex) > 0) {
          hasPositiveTabIndex = true;
        }
      });
      
      if (hasPositiveTabIndex) {
        issues.push('Positive tabindex values detected (breaks natural tab order)');
      }
      
      return issues;
    });
    violations.push(...keyboardIssues);
    
    // Check for ARIA landmarks
    const landmarkIssues = await this.page.evaluate(() => {
      const hasMain = document.querySelector('main, [role="main"]');
      const hasNav = document.querySelector('nav, [role="navigation"]');
      const issues = [];
      
      if (!hasMain) {
        issues.push('No main landmark found');
      }
      
      return issues;
    });
    violations.push(...landmarkIssues);
    
    return violations;
  }

  async performKeyboardNavigation() {
    const results = {
      focusableElements: 0,
      tabTrapped: false,
      skipLinks: false,
      keyboardAccessible: true
    };
    
    try {
      // Count focusable elements
      results.focusableElements = await this.page.$$eval('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])', 
        elements => elements.length
      );
      
      // Test basic tab navigation
      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(100);
      
      const activeElement = await this.page.evaluate(() => document.activeElement?.tagName);
      if (!activeElement || activeElement === 'BODY') {
        results.keyboardAccessible = false;
      }
      
      // Check for skip links
      results.skipLinks = await this.page.$('.skip-link, .sr-only a, [href="#main"]') !== null;
      
    } catch (error) {
      results.keyboardAccessible = false;
    }
    
    return results;
  }

  async testColorContrastWCAG() {
    return await this.page.evaluate(() => {
      function getRGB(color) {
        const div = document.createElement('div');
        div.style.color = color;
        document.body.appendChild(div);
        const computedColor = window.getComputedStyle(div).color;
        document.body.removeChild(div);
        
        const match = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
      }
      
      function getLuminance([r, g, b]) {
        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      }
      
      function getContrastRatio(color1, color2) {
        const lum1 = getLuminance(getRGB(color1));
        const lum2 = getLuminance(getRGB(color2));
        return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
      }
      
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, button, span, div');
      const violations = [];
      
      textElements.forEach(el => {
        if (!el.textContent.trim()) return;
        
        const styles = window.getComputedStyle(el);
        const textColor = styles.color;
        const bgColor = styles.backgroundColor;
        
        if (bgColor !== 'rgba(0, 0, 0, 0)') {
          const ratio = getContrastRatio(textColor, bgColor);
          const fontSize = parseInt(styles.fontSize);
          const fontWeight = styles.fontWeight;
          
          const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
          const requiredRatio = isLargeText ? 3 : 4.5;
          
          if (ratio < requiredRatio) {
            violations.push({
              element: el.tagName.toLowerCase(),
              text: el.textContent.slice(0, 50),
              ratio: ratio.toFixed(2),
              required: requiredRatio,
              passed: false
            });
          }
        }
      });
      
      return violations;
    });
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