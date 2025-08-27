const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

// Function to wait for server to be ready
function waitForServer(url, maxAttempts = 20) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const checkServer = () => {
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error('Server failed to start'));
          } else {
            setTimeout(checkServer, 500);
          }
        });
    };
    checkServer();
  });
}

(async () => {
  console.log('Starting HTTP server...');
  
  // Start the server
  const serverProcess = spawn('node', ['server.js']);
  
  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  // Wait a bit for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('Starting mobile wall resize test...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
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

    // Add console event listener to capture debug logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Debug]') || text.includes('Touch') || text.includes('Mouse')) {
        console.log('PAGE LOG:', text);
      }
    });

    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });

    // Navigate to the application
    const url = 'http://localhost:8080/example/index.html';
    console.log('Loading:', url);
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Click on "Edit Floorplan" button
    console.log('\n=== Clicking Edit Floorplan button ===');
    const editButton = await page.waitForSelector('#floorplan_tab', { visible: true });
    await editButton.click();

    // Wait for canvas to be ready
    await page.waitForTimeout(1000);

    // Get canvas element
    const canvas = await page.$('#floorplanner-canvas');
    const canvasBox = await canvas.boundingBox();
    
    console.log('\n=== Testing Touch Events (Mobile Simulation) ===');
    
    // Find a wall position (usually in the center of default floorplan)
    const wallX = canvasBox.x + canvasBox.width / 2;
    const wallY = canvasBox.y + canvasBox.height / 2;
    
    console.log(`Canvas dimensions: ${canvasBox.width}x${canvasBox.height}`);
    console.log(`Testing touch at position: (${wallX}, ${wallY})`);
    
    // Simulate touch drag to resize a wall
    console.log('1. Simulating touchstart...');
    await page.touchscreen.tap(wallX, wallY);
    await page.waitForTimeout(500);
    
    console.log('2. Simulating touch drag (touchstart -> touchmove -> touchend)...');
    // Touch down
    await page.evaluate((x, y) => {
      const canvas = document.getElementById('floorplanner-canvas');
      const touchObj = new Touch({
        identifier: Date.now(),
        target: canvas,
        clientX: x,
        clientY: y,
        pageX: x,
        pageY: y,
        radiusX: 2.5,
        radiusY: 2.5,
        rotationAngle: 0,
        force: 0.5,
      });
      
      const touchEvent = new TouchEvent('touchstart', {
        cancelable: true,
        bubbles: true,
        touches: [touchObj],
        targetTouches: [touchObj],
        changedTouches: [touchObj],
      });
      
      canvas.dispatchEvent(touchEvent);
    }, wallX, wallY);
    
    await page.waitForTimeout(100);
    
    // Touch move
    for (let i = 1; i <= 5; i++) {
      const moveX = wallX + (i * 20);
      console.log(`   Moving to: ${moveX}, ${wallY}`);
      
      await page.evaluate((x, y) => {
        const canvas = document.getElementById('floorplanner-canvas');
        const touchObj = new Touch({
          identifier: Date.now(),
          target: canvas,
          clientX: x,
          clientY: y,
          pageX: x,
          pageY: y,
          radiusX: 2.5,
          radiusY: 2.5,
          rotationAngle: 0,
          force: 0.5,
        });
        
        const touchEvent = new TouchEvent('touchmove', {
          cancelable: true,
          bubbles: true,
          touches: [touchObj],
          targetTouches: [touchObj],
          changedTouches: [touchObj],
        });
        
        canvas.dispatchEvent(touchEvent);
      }, moveX, wallY);
      
      await page.waitForTimeout(100);
    }
    
    // Touch end
    console.log('3. Simulating touchend...');
    await page.evaluate(() => {
      const canvas = document.getElementById('floorplanner-canvas');
      const touchEvent = new TouchEvent('touchend', {
        cancelable: true,
        bubbles: true,
        touches: [],
        targetTouches: [],
        changedTouches: [],
      });
      
      canvas.dispatchEvent(touchEvent);
    });
    
    await page.waitForTimeout(1000);
    
    console.log('\n=== Testing Mouse Events (Desktop Comparison) ===');
    
    // Test mouse events for comparison
    console.log('1. Simulating mouse drag...');
    await page.mouse.move(wallX, wallY);
    await page.mouse.down();
    
    for (let i = 1; i <= 5; i++) {
      const moveX = wallX - (i * 20);
      console.log(`   Moving to: ${moveX}, ${wallY}`);
      await page.mouse.move(moveX, wallY);
      await page.waitForTimeout(100);
    }
    
    await page.mouse.up();
    
    console.log('\n=== Test Complete ===');
    console.log('Check the browser window to see if walls can be resized.');
    console.log('The debug logs above should show touch event handling.');
    
    // Take a screenshot
    await page.screenshot({ path: 'mobile-test-result.png' });
    console.log('Screenshot saved as mobile-test-result.png');
    
    // Keep browser open for manual inspection
    console.log('\nBrowser will remain open for manual testing.');
    console.log('Try dragging walls manually on the touch-simulated device.');
    console.log('Press Ctrl+C to exit.');
    
    // Keep the process running
    await new Promise(() => {});
    
  } catch (error) {
    console.error('Test error:', error);
    await browser.close();
    serverProcess.kill();
    process.exit(1);
  }
})();