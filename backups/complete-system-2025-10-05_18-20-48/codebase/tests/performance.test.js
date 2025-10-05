const TestHelpers = require('./utils/test-helpers');

describe('Performance Tests', () => {
  let helpers;

  beforeEach(async () => {
    helpers = new TestHelpers(page);
  });

  test('should measure homepage performance metrics', async () => {
    await helpers.navigateToPage('index.html');
    
    const metrics = await page.metrics();
    console.log('Performance Metrics:', {
      Timestamp: metrics.Timestamp,
      Documents: metrics.Documents,
      Frames: metrics.Frames,
      JSEventListeners: metrics.JSEventListeners,
      Nodes: metrics.Nodes,
      LayoutCount: metrics.LayoutCount,
      RecalcStyleCount: metrics.RecalcStyleCount,
      LayoutDuration: metrics.LayoutDuration,
      RecalcStyleDuration: metrics.RecalcStyleDuration,
      ScriptDuration: metrics.ScriptDuration,
      TaskDuration: metrics.TaskDuration,
      JSHeapUsedSize: (metrics.JSHeapUsedSize / 1048576).toFixed(2) + ' MB',
      JSHeapTotalSize: (metrics.JSHeapTotalSize / 1048576).toFixed(2) + ' MB'
    });
    
    expect(metrics.JSHeapUsedSize).toBeLessThan(50 * 1048576);
  });

  test('should have acceptable First Contentful Paint', async () => {
    await helpers.navigateToPage('index.html');
    
    const performanceTiming = JSON.parse(
      await page.evaluate(() => JSON.stringify(window.performance.timing))
    );
    
    const pageLoadTime = performanceTiming.loadEventEnd - performanceTiming.navigationStart;
    const domContentLoaded = performanceTiming.domContentLoadedEventEnd - performanceTiming.navigationStart;
    
    console.log('Page Load Metrics:', {
      pageLoadTime: `${pageLoadTime}ms`,
      domContentLoaded: `${domContentLoaded}ms`
    });
    
    expect(pageLoadTime).toBeLessThan(3000);
    expect(domContentLoaded).toBeLessThan(2000);
  });

  test('should handle rapid navigation without memory leaks', async () => {
    const pages = ['index.html', 'nerdfootballTheGrid.html', 'nerdSurvivor.html'];
    const initialMetrics = await page.metrics();
    
    for (let i = 0; i < 5; i++) {
      for (const pagePath of pages) {
        await helpers.navigateToPage(pagePath);
        await page.waitForTimeout(500);
      }
    }
    
    const finalMetrics = await page.metrics();
    const heapGrowth = finalMetrics.JSHeapUsedSize - initialMetrics.JSHeapUsedSize;
    const heapGrowthMB = (heapGrowth / 1048576).toFixed(2);
    
    console.log(`Heap growth after navigation: ${heapGrowthMB} MB`);
    
    expect(heapGrowth).toBeLessThan(20 * 1048576);
  });

  test('should load resources efficiently', async () => {
    const resourceTimings = [];
    
    page.on('response', response => {
      resourceTimings.push({
        url: response.url(),
        status: response.status(),
        size: response.headers()['content-length'] || 0
      });
    });
    
    await helpers.navigateToPage('index.html');
    await page.waitForTimeout(2000);
    
    const largeResources = resourceTimings.filter(r => r.size > 1000000);
    const failedResources = resourceTimings.filter(r => r.status >= 400);
    
    console.log(`Total resources: ${resourceTimings.length}`);
    console.log(`Large resources (>1MB): ${largeResources.length}`);
    console.log(`Failed resources: ${failedResources.length}`);
    
    expect(failedResources.length).toBe(0);
    expect(largeResources.length).toBeLessThan(5);
  });

  test('should have optimized images', async () => {
    await helpers.navigateToPage('index.html');
    
    const images = await page.$$eval('img', imgs => 
      imgs.map(img => ({
        src: img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: img.clientWidth,
        displayHeight: img.clientHeight,
        hasAlt: !!img.alt,
        loading: img.loading
      }))
    );
    
    const oversizedImages = images.filter(img => 
      img.naturalWidth > img.displayWidth * 2 || 
      img.naturalHeight > img.displayHeight * 2
    );
    
    const missingAlt = images.filter(img => !img.hasAlt);
    const notLazyLoaded = images.filter(img => img.loading !== 'lazy');
    
    console.log(`Total images: ${images.length}`);
    console.log(`Oversized images: ${oversizedImages.length}`);
    console.log(`Images missing alt text: ${missingAlt.length}`);
    console.log(`Images not lazy loaded: ${notLazyLoaded.length}`);
    
    expect(oversizedImages.length).toBeLessThan(images.length * 0.3);
  });
});