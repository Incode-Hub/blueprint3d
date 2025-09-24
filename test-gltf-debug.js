const puppeteer = require('puppeteer');

async function testGLTFError() {
  console.log('Starting GLTF error test...');
  console.log('Make sure to run: node server.js in another terminal first');

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    slowMo: 500, // Slow down for debugging
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--use-gl=swiftshader',
      '--disable-web-security'
    ]
  });

  const page = await browser.newPage();

  // Capture detailed logs
  page.on('console', msg => {
    const type = msg.type().toUpperCase();
    const text = msg.text();
    console.log(`[BROWSER ${type}] ${text}`);
  });

  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
    console.log(`[STACK] ${error.stack}`);
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`[HTTP ${response.status()}] ${response.url()}`);
    }
  });

  try {
    console.log('Loading page...');
    await page.goto('http://localhost:8080/example/index.html', { waitUntil: 'networkidle0' });

    console.log('Waiting for Blueprint3D...');
    await page.waitForFunction('typeof BP3D !== "undefined"', { timeout: 15000 });

    console.log('Setting up error monitoring...');
    await page.evaluate(() => {
      window.detailedErrorLog = [];

      // Capture all errors with stack traces
      const originalError = console.error;
      console.error = function(...args) {
        const errorMsg = args.join(' ');
        const stack = new Error().stack;
        window.detailedErrorLog.push({
          type: 'console.error',
          message: errorMsg,
          stack: stack,
          timestamp: Date.now()
        });
        originalError.apply(console, args);
      };

      // Capture window errors
      window.addEventListener('error', (event) => {
        window.detailedErrorLog.push({
          type: 'window.error',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error ? event.error.stack : null,
          timestamp: Date.now()
        });
      });

      // Capture unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        window.detailedErrorLog.push({
          type: 'unhandledrejection',
          reason: event.reason.toString(),
          timestamp: Date.now()
        });
      });

      console.log('Error monitoring set up');
    });

    // Wait for full initialization
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Checking if main is available...');
    const mainStatus = await page.evaluate(() => {
      return {
        mainExists: typeof window.main !== 'undefined',
        mainType: typeof window.main,
        hasGetModel: window.main && typeof window.main.getModel === 'function',
        sceneExists: window.main && window.main.getModel && window.main.getModel().scene
      };
    });
    console.log('Main status:', mainStatus);

    if (!mainStatus.mainExists) {
      console.log('window.main not found, cannot proceed with test');
      return;
    }

    console.log('Adding GLTF item...');
    const addResult = await page.evaluate(() => {
      try {
        const model = window.main.getModel();
        const scene = model.scene;

        console.log('Scene object:', scene);
        console.log('Available methods:', Object.getOwnPropertyNames(scene.__proto__));

        // Add item with detailed logging
        console.log('Calling scene.addItem...');
        scene.addItem(
          1, // itemType - floor item
          'example/gltf/Kepler Basin 70.gltf',
          { height: 24 },
          new THREE.Vector3(100, 0, 100), // position
          0, // rotation
          new THREE.Vector3(1, 1, 1), // scale
          false // fixed
        );

        return { success: true, message: 'addItem called successfully' };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          stack: error.stack
        };
      }
    });

    console.log('Add item result:', addResult);

    // Wait for async operations and rendering
    console.log('Waiting for async operations...');
    await new Promise(resolve => setTimeout(resolve, 8000));

    // Force a render to trigger any rendering errors
    console.log('Forcing render...');
    await page.evaluate(() => {
      if (window.main && window.main.needsUpdate) {
        console.log('Calling needsUpdate...');
        window.main.needsUpdate();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get all captured errors
    const errorLog = await page.evaluate(() => {
      return window.detailedErrorLog || [];
    });

    console.log('\n=== DETAILED ERROR LOG ===');
    if (errorLog.length === 0) {
      console.log('No errors captured');
    } else {
      errorLog.forEach((error, index) => {
        console.log(`\n--- Error ${index + 1} ---`);
        console.log(`Type: ${error.type}`);
        console.log(`Message: ${error.message}`);
        if (error.filename) console.log(`File: ${error.filename}:${error.lineno}:${error.colno}`);
        if (error.stack) console.log(`Stack: ${error.stack}`);
        console.log(`Time: ${new Date(error.timestamp).toISOString()}`);
      });
    }

    console.log('\nTest will keep running for manual inspection...');
    console.log('Press Ctrl+C to exit');

    // Keep the browser open for manual inspection
    await new Promise(() => {}); // Never resolves

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // This won't be reached due to the infinite promise above
    await browser.close();
  }
}

testGLTFError().catch(console.error);