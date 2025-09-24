const puppeteer = require('puppeteer');

async function testRenderIsolation() {
  console.log('Starting render isolation test...');
  console.log('Make sure server is running: node server.js');

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--use-gl=swiftshader'
    ]
  });

  const page = await browser.newPage();

  // Capture all console messages with timestamps
  page.on('console', msg => {
    const timestamp = new Date().toISOString().substr(11, 8);
    console.log(`[${timestamp}] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.log(`[ERROR] ${error.message}`);
  });

  try {
    await page.goto('http://localhost:8080/example/index.html', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('Page loaded, waiting for Blueprint3D...');
    await page.waitForFunction('typeof BP3D !== "undefined"', { timeout: 15000 });

    console.log('Waiting for initialization...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if main is available and run scene cleanup
    const cleanupResult = await page.evaluate(() => {
      if (window.main && typeof window.main.cleanupScene === 'function') {
        console.log('Running proactive scene cleanup...');
        window.main.cleanupScene();
        return { success: true, mainExists: true };
      } else {
        return { success: false, mainExists: typeof window.main !== 'undefined' };
      }
    });

    console.log('Cleanup result:', cleanupResult);

    if (!cleanupResult.mainExists) {
      console.error('Blueprint3D main not initialized properly');
      return;
    }

    console.log('Adding GLTF item to test render isolation...');
    const addItemResult = await page.evaluate(() => {
      try {
        const model = window.main.getModel();
        const scene = model.scene;

        console.log('Current scene children count:', scene.getScene().children.length);

        // Add a GLTF item
        scene.addItem(
          1, // itemType
          'example/gltf/Kepler Basin 70.gltf',
          { height: 24 },
          new THREE.Vector3(100, 0, 100),
          0,
          new THREE.Vector3(1, 1, 1),
          false
        );

        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    console.log('Add item result:', addItemResult);

    // Wait for GLTF loading and rendering attempts
    console.log('Waiting for GLTF loading and render attempts...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check the final state
    const finalState = await page.evaluate(() => {
      const scene = window.main.getModel().scene.getScene();
      return {
        childrenCount: scene.children.length,
        hasRenderer: window.main.renderer !== null,
        renderErrorCount: window.main.renderErrorCount || 0
      };
    });

    console.log('Final state:', finalState);

    // Run another cleanup to see if it finds anything new
    console.log('Running final cleanup check...');
    await page.evaluate(() => {
      if (window.main && typeof window.main.cleanupScene === 'function') {
        window.main.cleanupScene();
      }
    });

    console.log('Test completed. Check console for render isolation details.');
    console.log('Browser will stay open for inspection. Press Ctrl+C to exit.');

    // Keep browser open
    await new Promise(() => {});

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Won't be reached due to infinite promise
    await browser.close();
  }
}

testRenderIsolation().catch(console.error);