const puppeteer = require('puppeteer');

async function debugGLTFItems() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => {
    console.log('BROWSER LOG:', msg.text());
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  try {
    console.log('🔍 Loading main application...');
    await page.goto('http://localhost:8080/example/index.html', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Page loaded');

    // Wait for the application to initialize
    await page.waitForTimeout(3000);

    console.log('🔍 Clicking Design tab...');
    await page.click('#design_tab');
    await page.waitForTimeout(2000);

    console.log('🔍 Checking if items are visible...');

    // Check if items wrapper exists
    const itemsWrapper = await page.$('#items-wrapper');
    if (!itemsWrapper) {
      console.log('❌ #items-wrapper not found');
      return;
    }

    // Get all items in the wrapper
    const itemsCount = await page.evaluate(() => {
      const wrapper = document.getElementById('items-wrapper');
      return wrapper ? wrapper.children.length : 0;
    });

    console.log(`📊 Found ${itemsCount} items in wrapper`);

    // Check for GLTF items specifically
    const gltfItems = await page.evaluate(() => {
      const items = document.querySelectorAll('.add-item');
      let gltfCount = 0;
      let jsCount = 0;
      let totalCount = items.length;

      items.forEach(item => {
        const name = item.getAttribute('model-name') || '';
        if (name.includes('GLTF')) {
          gltfCount++;
        } else if (name.includes('JS')) {
          jsCount++;
        }
      });

      return { total: totalCount, gltf: gltfCount, js: jsCount };
    });

    console.log(`📊 Items breakdown: Total: ${gltfItems.total}, JS: ${gltfItems.js}, GLTF: ${gltfItems.gltf}`);

    // Check if format selector exists
    const formatSelector = await page.$('input[name="format"]');
    if (formatSelector) {
      console.log('✅ Format selector found');

      // Test format filtering
      console.log('🔍 Testing GLTF filter...');
      await page.click('input[value="gltf"]');
      await page.waitForTimeout(1000);

      const gltfFilteredItems = await page.evaluate(() => {
        return document.querySelectorAll('.add-item').length;
      });

      console.log(`📊 After GLTF filter: ${gltfFilteredItems} items visible`);

      // Test clicking on Bathroom category
      console.log('🔍 Looking for Bathroom category...');
      const bathroomCategory = await page.$('[data-category="Bathroom"]');
      if (bathroomCategory) {
        console.log('✅ Bathroom category found, clicking...');
        await page.click('[data-category="Bathroom"]');
        await page.waitForTimeout(2000);

        const bathroomItems = await page.evaluate(() => {
          const items = document.querySelectorAll('.add-item');
          const itemNames = [];
          items.forEach(item => {
            itemNames.push(item.getAttribute('model-name'));
          });
          return itemNames;
        });

        console.log('📊 Bathroom items:', bathroomItems);

        // Try to click a GLTF item
        const gltfItem = await page.$('.add-item[model-name*="GLTF"]');
        if (gltfItem) {
          console.log('🔍 Found GLTF item, attempting to click...');

          // Get the model URL before clicking
          const modelUrl = await page.evaluate(el => el.getAttribute('model-url'), gltfItem);
          console.log(`📄 Model URL: ${modelUrl}`);

          await gltfItem.click();
          await page.waitForTimeout(3000);

          // Check for any errors
          const errors = await page.evaluate(() => {
            return window.lastError || 'No errors captured';
          });

          console.log('🔍 Post-click status:', errors);
        } else {
          console.log('❌ No GLTF items found in Bathroom category');
        }

      } else {
        console.log('❌ Bathroom category not found');

        // List all available categories
        const categories = await page.evaluate(() => {
          const cats = document.querySelectorAll('.category-folder');
          return Array.from(cats).map(cat => cat.getAttribute('data-category'));
        });

        console.log('📊 Available categories:', categories);
      }

    } else {
      console.log('❌ Format selector not found');
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved as debug-screenshot.png');

    // Keep browser open for manual inspection
    console.log('🔍 Browser kept open for manual inspection. Press any key to close...');

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }

  // Don't close automatically - let user inspect
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', () => {
    browser.close();
    process.exit();
  });
}

debugGLTFItems().catch(console.error);