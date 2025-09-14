const puppeteer = require('puppeteer');

async function testAddItems() {
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
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log('❌ Console Error:', text);
    } else {
      console.log(`Browser ${type}:`, text);
    }
  });
  
  // Listen for page errors
  page.on('pageerror', err => {
    console.error('❌ Page error:', err.message);
  });
  
  try {
    console.log('Loading Blueprint3D...');
    await page.goto('http://localhost:8080/example/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for the app to initialize
    await page.waitFor(2000);
    
    // Check if blueprint3d initialized
    const initialized = await page.evaluate(() => {
      return {
        blueprint3d: typeof window.blueprint3d !== 'undefined',
        model: window.blueprint3d ? (typeof window.blueprint3d.model !== 'undefined') : false,
        scene: window.blueprint3d && window.blueprint3d.model ? (typeof window.blueprint3d.model.scene !== 'undefined') : false,
        addItem: window.blueprint3d && window.blueprint3d.model && window.blueprint3d.model.scene ? 
                 (typeof window.blueprint3d.model.scene.addItem === 'function') : false
      };
    });
    
    console.log('Blueprint3D initialization status:', initialized);
    
    // Click on "Add Items" tab
    console.log('Clicking Add Items tab...');
    await page.click('#items_tab');
    await page.waitFor(1000);
    
    // Check if items loaded
    const itemsStatus = await page.evaluate(() => {
      const itemsWrapper = document.getElementById('items-wrapper');
      const addItems = document.querySelectorAll('.add-item');
      const categories = document.querySelectorAll('.category-folder');
      
      // Check for any JavaScript errors related to items
      const errors = [];
      
      // Check if click handlers are attached
      const hasHandlers = $('.add-item').length > 0 && $('.add-item').data('events');
      
      return {
        wrapperExists: itemsWrapper !== null,
        wrapperHTML: itemsWrapper ? itemsWrapper.innerHTML.substring(0, 200) : null,
        itemCount: addItems.length,
        categoryCount: categories.length,
        hasClickHandlers: hasHandlers,
        firstItemName: addItems.length > 0 ? addItems[0].getAttribute('model-name') : null,
        firstItemUrl: addItems.length > 0 ? addItems[0].getAttribute('model-url') : null
      };
    });
    
    console.log('Items status:', itemsStatus);
    
    // Try clicking on an item
    if (itemsStatus.itemCount > 0) {
      console.log('Trying to click on first item...');
      
      // Add event listener to detect clicks
      await page.evaluateOnNewDocument(() => {
        document.addEventListener('mousedown', (e) => {
          if (e.target.closest('.add-item')) {
            console.log('Item clicked:', e.target.closest('.add-item').getAttribute('model-name'));
          }
        });
      });
      
      const firstItem = await page.$('.add-item');
      if (firstItem) {
        await firstItem.click();
        await page.waitFor(1000);
        
        // Check if item was added
        const itemAdded = await page.evaluate(() => {
          if (window.blueprint3d && window.blueprint3d.model && window.blueprint3d.model.scene) {
            const items = window.blueprint3d.model.scene.getItems();
            return {
              itemCount: items.length,
              lastItem: items.length > 0 ? items[items.length - 1].metadata : null
            };
          }
          return { itemCount: 0, lastItem: null };
        });
        
        console.log('Items in scene after click:', itemAdded);
      }
    }
    
    // Try to manually call addItem
    console.log('\nTrying to manually add an item...');
    const manualAdd = await page.evaluate(() => {
      try {
        if (window.blueprint3d && window.blueprint3d.model && window.blueprint3d.model.scene) {
          // Try to add a simple model
          window.blueprint3d.model.scene.addItem(
            1, // itemType
            'models/js/closed-door28x80_baked.js', // fileName
            { itemName: 'Test Door', resizable: true } // metadata
          );
          return { success: true, message: 'addItem called successfully' };
        } else {
          return { success: false, message: 'Blueprint3D scene not available' };
        }
      } catch (error) {
        return { success: false, message: error.toString() };
      }
    });
    
    console.log('Manual add result:', manualAdd);
    
    // Take a screenshot
    await page.screenshot({ path: 'add-items-debug.png', fullPage: true });
    console.log('Screenshot saved as add-items-debug.png');
    
    // Wait to see results
    console.log('\nTest completed. Check the browser window.');
    await page.waitFor(5000);
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  }
  
  await browser.close();
}

// Run the test
testAddItems().catch(console.error);