const puppeteer = require('puppeteer');
const path = require('path');

async function testGLTFError() {
  const browser = await puppeteer.launch({
    headless: false, // Set to true if you don't want to see the browser
    devtools: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--ignore-gpu-blacklist',
      '--disable-web-security',
      '--use-gl=swiftshader'
    ]
  });

  const page = await browser.newPage();

  // Enable console logging
  page.on('console', msg => {
    console.log('CONSOLE:', msg.type(), msg.text());
  });

  // Enable error logging
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
    console.log('STACK:', error.stack);
  });

  // Monitor for uncaught exceptions
  page.on('error', error => {
    console.log('ERROR:', error.message);
  });

  try {
    // Load the example page
    const examplePath = path.join(__dirname, 'example', 'index.html');
    await page.goto(`file://${examplePath}`);

    console.log('Page loaded, waiting for blueprint3d to initialize...');

    // Wait for the page to load and blueprint3d to be available
    await page.waitForFunction('typeof BP3D !== "undefined"', { timeout: 10000 });

    console.log('Blueprint3D loaded, setting up error monitoring...');

    // Inject error monitoring
    await page.evaluate(() => {
      // Override console.error to capture Three.js errors
      const originalError = console.error;
      console.error = function(...args) {
        window.capturedErrors = window.capturedErrors || [];
        window.capturedErrors.push(args.join(' '));
        originalError.apply(console, args);
      };

      // Monitor for Three.js render errors
      window.addEventListener('error', (event) => {
        window.capturedErrors = window.capturedErrors || [];
        window.capturedErrors.push(`Global error: ${event.message} at ${event.filename}:${event.lineno}`);
      });
    });

    // Wait a bit for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Adding GLTF item to trigger the error...');

    // Try to add a GLTF item to trigger the error
    const result = await page.evaluate(() => {
      try {
        // Access the main application instance
        if (window.main && window.main.getModel && window.main.getModel().scene) {
          const scene = window.main.getModel().scene;

          // Try to add a GLTF item - this should trigger the error
          console.log('Attempting to add GLTF item...');
          scene.addItem(
            1, // itemType
            'example/gltf/Kepler Basin 70.gltf', // fileName
            { height: 24 }, // metadata
            new THREE.Vector3(0, 0, 0), // position
            0, // rotation
            new THREE.Vector3(1, 1, 1), // scale
            false // fixed
          );

          return { success: true, message: 'GLTF item added' };
        } else {
          return { success: false, message: 'Blueprint3D not properly initialized' };
        }
      } catch (error) {
        return { success: false, message: error.message, stack: error.stack };
      }
    });

    console.log('Add item result:', result);

    // Wait for potential async errors
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check for captured errors
    const errors = await page.evaluate(() => {
      return window.capturedErrors || [];
    });

    console.log('Captured errors:', errors);

    // Try to trigger rendering to see if that's where the error occurs
    console.log('Triggering render...');
    await page.evaluate(() => {
      if (window.main && window.main.needsUpdate) {
        window.main.needsUpdate();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check for new errors
    const finalErrors = await page.evaluate(() => {
      return window.capturedErrors || [];
    });

    console.log('Final captured errors:', finalErrors);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testGLTFError().catch(console.error);