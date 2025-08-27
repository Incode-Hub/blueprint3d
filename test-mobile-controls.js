const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

(async () => {
  console.log('Starting mobile controls visibility test...\n');
  
  // Start the server
  const serverProcess = spawn('node', ['server.js']);
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const browser = await puppeteer.launch({
    headless: false, // Keep visible for debugging
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set up mobile viewport (iPhone 12 Pro)
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });

    // Add console listener for debugging
    page.on('console', msg => {
      console.log('PAGE LOG:', msg.text());
    });

    // Navigate to the application
    await page.goto('http://localhost:8080/example/index.html', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    console.log('=== TEST 1: Mobile controls should be hidden by default ===');
    
    // Click on Design tab first to make sure we're in the right view
    await page.click('#design_tab');
    await page.waitForTimeout(1000);

    // Check if mobile controls are hidden
    const controlsHiddenInitially = await page.evaluate(() => {
      const controls = document.getElementById('mobile-item-controls');
      if (!controls) return { error: 'Controls element not found' };
      
      const computedStyle = window.getComputedStyle(controls);
      const hasShowClass = controls.classList.contains('show');
      const isDisplayNone = computedStyle.display === 'none';
      
      return {
        display: computedStyle.display,
        hasShowClass: hasShowClass,
        isHidden: isDisplayNone && !hasShowClass
      };
    });

    console.log('Initial controls state:', controlsHiddenInitially);
    console.log(controlsHiddenInitially.isHidden ? '✅ PASS: Controls are hidden by default' : '❌ FAIL: Controls should be hidden by default');

    console.log('\n=== TEST 2: Add an item to the scene ===');
    
    // Go to Add Items tab
    await page.click('#items_tab');
    await page.waitForTimeout(1000);

    // Wait for items to load and click on an item category (assuming there's at least one)
    await page.waitForSelector('.thumbnail', { visible: true, timeout: 5000 });
    
    // Click on first available item
    const firstItem = await page.$('.thumbnail');
    if (firstItem) {
      await firstItem.click();
      await page.waitForTimeout(1000);
      console.log('✅ Item added to scene');
    } else {
      console.log('❌ No items found to add');
      await browser.close();
      serverProcess.kill();
      return;
    }

    console.log('\n=== TEST 3: Switch to Design tab and test item selection ===');
    
    // Go back to Design tab
    await page.click('#design_tab');
    await page.waitForTimeout(1000);

    // Check that controls are still hidden (no item selected yet)
    const controlsBeforeSelection = await page.evaluate(() => {
      const controls = document.getElementById('mobile-item-controls');
      const computedStyle = window.getComputedStyle(controls);
      const hasShowClass = controls.classList.contains('show');
      return {
        display: computedStyle.display,
        hasShowClass: hasShowClass,
        isHidden: computedStyle.display === 'none' && !hasShowClass
      };
    });

    console.log('Controls before item selection:', controlsBeforeSelection);
    console.log(controlsBeforeSelection.isHidden ? '✅ PASS: Controls hidden before item selection' : '❌ FAIL: Controls should be hidden before item selection');

    console.log('\n=== TEST 4: Click on the item in the 3D scene ===');
    
    // Get the 3D viewer canvas and click in the center to try to select the item
    const canvas = await page.$('#viewer canvas');
    if (canvas) {
      const canvasBox = await canvas.boundingBox();
      const centerX = canvasBox.x + canvasBox.width / 2;
      const centerY = canvasBox.y + canvasBox.height / 2;
      
      console.log(`Clicking on canvas at: ${centerX}, ${centerY}`);
      await page.click('#viewer canvas', { x: centerX - canvasBox.x, y: centerY - canvasBox.y });
      await page.waitForTimeout(1000);
      
      // Check if controls are now visible
      const controlsAfterSelection = await page.evaluate(() => {
        const controls = document.getElementById('mobile-item-controls');
        const computedStyle = window.getComputedStyle(controls);
        const hasShowClass = controls.classList.contains('show');
        return {
          display: computedStyle.display,
          hasShowClass: hasShowClass,
          isVisible: computedStyle.display === 'block' && hasShowClass
        };
      });

      console.log('Controls after item click:', controlsAfterSelection);
      console.log(controlsAfterSelection.isVisible ? '✅ PASS: Controls visible after item selection' : '⚠️  Controls may not be visible - item might not be selected');
    }

    console.log('\n=== TEST 5: Test desktop view behavior ===');
    
    // Change to desktop viewport
    await page.setViewport({
      width: 1200,
      height: 800,
      isMobile: false,
      hasTouch: false
    });
    
    await page.waitForTimeout(500);

    // Check that controls are hidden in desktop view
    const controlsOnDesktop = await page.evaluate(() => {
      const controls = document.getElementById('mobile-item-controls');
      const computedStyle = window.getComputedStyle(controls);
      const hasShowClass = controls.classList.contains('show');
      return {
        display: computedStyle.display,
        hasShowClass: hasShowClass,
        isHidden: !hasShowClass // In desktop, should not have 'show' class
      };
    });

    console.log('Controls on desktop:', controlsOnDesktop);
    console.log(controlsOnDesktop.isHidden ? '✅ PASS: Controls hidden on desktop' : '❌ FAIL: Controls should be hidden on desktop');

    console.log('\n=== TEST 6: Switch back to mobile and test again ===');
    
    // Switch back to mobile viewport
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });
    
    await page.waitForTimeout(500);

    // Final check - controls should be visible if item is selected, hidden if not
    const finalControlsState = await page.evaluate(() => {
      const controls = document.getElementById('mobile-item-controls');
      const computedStyle = window.getComputedStyle(controls);
      const hasShowClass = controls.classList.contains('show');
      return {
        display: computedStyle.display,
        hasShowClass: hasShowClass,
        expectedBehavior: 'Should be visible if item is selected, hidden if not'
      };
    });

    console.log('Final controls state on mobile:', finalControlsState);

    // Take a screenshot for manual verification
    await page.screenshot({ path: 'mobile-controls-test.png', fullPage: false });
    console.log('\n📸 Screenshot saved as mobile-controls-test.png');

    console.log('\n========================================');
    console.log('TEST SUMMARY:');
    console.log('- Controls hidden by default: ' + (controlsHiddenInitially.isHidden ? '✅' : '❌'));
    console.log('- Controls hidden before selection: ' + (controlsBeforeSelection.isHidden ? '✅' : '❌'));
    console.log('- Controls hidden on desktop: ' + (controlsOnDesktop.isHidden ? '✅' : '❌'));
    console.log('========================================\n');

    console.log('🎯 To manually verify item selection:');
    console.log('1. The browser window shows the mobile view');
    console.log('2. Click on items in the 3D scene to select them');
    console.log('3. Controls should appear when an item is selected');
    console.log('4. Controls should disappear when clicking empty space');
    console.log('\nPress Ctrl+C to exit.');
    
    // Keep the browser open for manual testing
    await new Promise(() => {});

  } catch (error) {
    console.error('Test error:', error);
    await browser.close();
    serverProcess.kill();
    process.exit(1);
  }
})();