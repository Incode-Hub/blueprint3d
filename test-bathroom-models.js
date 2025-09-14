const puppeteer = require('puppeteer');

async function testBathroomModels() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1280, height: 800 });
  
  // Listen for console messages
  page.on('console', msg => {
    console.log('Browser console:', msg.type(), msg.text());
  });
  
  // Listen for errors
  page.on('error', err => {
    console.error('Page error:', err);
  });
  
  page.on('pageerror', err => {
    console.error('Page error:', err);
  });
  
  try {
    console.log('Loading Blueprint3D...');
    await page.goto('http://localhost:8080/example/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for the app to initialize
    await page.waitForTimeout(2000);
    
    // Click on "Add Items" tab
    console.log('Clicking Add Items tab...');
    await page.click('#items_tab');
    await page.waitForTimeout(1000);
    
    // Wait for items to load
    await page.waitForSelector('.category-folder', { timeout: 5000 });
    
    // Click on Bathroom category
    console.log('Looking for Bathroom category...');
    const bathroomCategory = await page.$('a.category-folder[data-category="Bathroom"]');
    
    if (bathroomCategory) {
      console.log('Found Bathroom category, clicking...');
      await bathroomCategory.click();
      await page.waitForTimeout(1000);
      
      // Find and click on a Kepler item
      const keplerItems = await page.$$eval('.add-item', items => 
        items.map(el => ({
          name: el.getAttribute('model-name'),
          url: el.getAttribute('model-url')
        })).filter(item => item.name && item.name.includes('Kepler'))
      );
      
      console.log('Found Kepler items:', keplerItems);
      
      if (keplerItems.length > 0) {
        // Click the first Kepler item
        console.log('Clicking on:', keplerItems[0].name);
        const firstKeplerItem = await page.$('.add-item[model-name*="Kepler"]');
        await firstKeplerItem.click();
        
        // Switch to Design tab
        console.log('Switching to Design tab...');
        await page.waitForTimeout(1000);
        await page.click('#design_tab');
        await page.waitForTimeout(2000);
        
        // Check for errors in console
        const errors = await page.evaluate(() => {
          const logs = [];
          // Check if model loaded successfully
          if (window.blueprint3d && window.blueprint3d.model && window.blueprint3d.model.scene) {
            const items = window.blueprint3d.model.scene.getItems();
            logs.push(`Items in scene: ${items.length}`);
          }
          return logs;
        });
        
        console.log('Scene status:', errors);
        
        // Take a screenshot
        await page.screenshot({ path: 'bathroom-model-test.png', fullPage: true });
        console.log('Screenshot saved as bathroom-model-test.png');
        
        // Wait to see the result
        console.log('Test completed successfully! Check the browser to see if the model loaded.');
        await page.waitForTimeout(5000);
        
      } else {
        console.error('No Kepler items found in Bathroom category');
      }
    } else {
      console.error('Bathroom category not found');
      
      // List available categories for debugging
      const categories = await page.$$eval('.category-folder', cats => 
        cats.map(el => el.getAttribute('data-category'))
      );
      console.log('Available categories:', categories);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
    console.log('Error screenshot saved');
  }
  
  // Keep browser open for inspection
  console.log('Press Ctrl+C to close the browser...');
  await new Promise(() => {}); // Keep running
}

// Run the test
testBathroomModels().catch(console.error);