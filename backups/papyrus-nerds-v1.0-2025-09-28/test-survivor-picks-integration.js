const puppeteer = require('puppeteer');

(async () => {
  console.log('🧪 Testing Survivor Picks Integration...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
    
    // Navigate to the app
    console.log('📋 Loading main app...');
    await page.goto('http://localhost:3001', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for app to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if survivor-picks view is accessible via URL
    console.log('🔗 Testing survivor-picks URL routing...');
    await page.goto('http://localhost:3001?view=survivor-picks', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Check if survivor picks container is visible
    const survivorPicksVisible = await page.evaluate(() => {
      const container = document.getElementById('survivor-picks-container');
      return container && !container.classList.contains('hidden');
    });
    
    if (survivorPicksVisible) {
      console.log('✅ Survivor Picks container is visible');
      
      // Check if content is loaded (should show login prompt or survivor interface)
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for content to load
      
      const contentLoaded = await page.evaluate(() => {
        const container = document.getElementById('survivor-picks-container');
        return container && container.innerHTML.trim().length > 50; // Has substantial content
      });
      
      if (contentLoaded) {
        console.log('✅ Survivor Picks content loaded successfully');
        
        // Check if the SurvivorPicksView object exists
        const viewObjectExists = await page.evaluate(() => {
          return typeof window.SurvivorPicksView !== 'undefined';
        });
        
        if (viewObjectExists) {
          console.log('✅ SurvivorPicksView object is available');
        } else {
          console.log('❌ SurvivorPicksView object not found');
        }
        
        // Test navigation menu
        console.log('📋 Testing navigation menu...');
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Click menu button
        const menuButton = await page.$('#menu-btn');
        if (menuButton) {
          await menuButton.click();
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if Survivor Picks button is present
          const survivorPicksButton = await page.$('#survivor-picks-view-btn');
          if (survivorPicksButton) {
            console.log('✅ Survivor Picks menu button found');
            
            // Check if button text is correct
            const buttonText = await page.evaluate(btn => btn.textContent, survivorPicksButton);
            if (buttonText.includes('Survivor Picks')) {
              console.log('✅ Survivor Picks menu button has correct text');
            } else {
              console.log('❌ Survivor Picks menu button text incorrect:', buttonText);
            }
          } else {
            console.log('❌ Survivor Picks menu button not found');
          }
        } else {
          console.log('❌ Menu button not found');
        }
        
      } else {
        console.log('❌ Survivor Picks content failed to load');
      }
    } else {
      console.log('❌ Survivor Picks container not visible');
    }
    
    console.log('🎉 Integration test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();