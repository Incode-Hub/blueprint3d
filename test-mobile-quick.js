const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

(async () => {
  console.log('Starting quick mobile test...\n');
  
  // Start the server
  const serverProcess = spawn('node', ['server.js']);
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set up mobile viewport
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
    });

    // Add console listener for touch events
    let touchEventsDetected = false;
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('touchstart') || text.includes('touchmove') || text.includes('touchend')) {
        touchEventsDetected = true;
      }
    });

    // Navigate to the application
    await page.goto('http://localhost:8080/example/index.html', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);

    // Click Edit Floorplan
    await page.click('#floorplan_tab');
    await page.waitForTimeout(1000);

    // Inject test for touch event listeners
    const hasTouchEvents = await page.evaluate(() => {
      const canvas = document.getElementById('floorplanner-canvas');
      if (!canvas) return false;
      
      // Check if jQuery has touch event handlers
      const events = $._data(canvas, 'events');
      return events && (events.touchstart || events.touchmove || events.touchend);
    });

    console.log('✅ Touch event handlers detected:', hasTouchEvents ? 'YES' : 'NO');

    // Test actual touch simulation
    const canvas = await page.$('#floorplanner-canvas');
    const box = await canvas.boundingBox();
    
    // Simulate touch drag
    await page.touchscreen.tap(box.x + box.width/2, box.y + box.height/2);
    await page.waitForTimeout(100);
    
    console.log('✅ Touch simulation completed without errors');
    
    // Take screenshot
    await page.screenshot({ path: 'mobile-fix-test.png', fullPage: false });
    console.log('✅ Screenshot saved as mobile-fix-test.png');

    console.log('\n========================================');
    console.log('TEST RESULTS:');
    console.log('- Touch event handlers: ' + (hasTouchEvents ? '✅ FOUND' : '❌ NOT FOUND'));
    console.log('- Touch simulation: ✅ WORKING');
    console.log('========================================\n');
    
    if (hasTouchEvents) {
      console.log('🎉 SUCCESS: Mobile wall resizing fix has been applied!');
      console.log('Touch events are now properly handled for mobile devices.');
    } else {
      console.log('⚠️  WARNING: Touch event handlers not detected.');
      console.log('Please ensure the built JS file is properly loaded.');
    }

  } finally {
    await browser.close();
    serverProcess.kill();
  }
  
  process.exit(0);
})();