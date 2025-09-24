const puppeteer = require('puppeteer');

async function testModelLoad() {
  const browser = await puppeteer.launch({
    headless: false, // Let's see what happens
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Capture console logs
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('pageerror', error => console.log('ERROR:', error.message));

  try {
    console.log('Loading Blueprint3D application...');
    await page.goto('http://localhost:8080/example/index.html', { waitUntil: 'networkidle0' });

    console.log('Switching to Design tab...');
    await page.click('#design_tab');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Opening Bathroom category...');
    await page.evaluate(() => {
      document.querySelector('[data-category="Bathroom"]').click();
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Filtering to GLTF only...');
    await page.evaluate(() => {
      document.querySelector('input[value="gltf"]').click();
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Clicking first GLTF model...');
    const loadResult = await page.evaluate(() => {
      const gltfItem = document.querySelector('.add-item');
      if (gltfItem) {
        const modelName = gltfItem.getAttribute('model-name');
        const modelUrl = gltfItem.getAttribute('model-url');

        // Simulate the click that should trigger model loading
        gltfItem.click();

        return { modelName, modelUrl, timestamp: Date.now() };
      }
      return null;
    });

    console.log('Model click initiated:', loadResult);

    // Wait for model to load and check for objects in scene
    console.log('Waiting for model to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const sceneStatus = await page.evaluate(() => {
      // Check if Blueprint3D is available and has scene objects
      if (window.bp3d && window.bp3d.three && window.bp3d.three.scene) {
        const scene = window.bp3d.three.scene;
        return {
          hasScene: true,
          objectCount: scene.children.length,
          objects: scene.children.map(child => ({
            type: child.type,
            name: child.name || 'unnamed',
            hasGeometry: !!child.geometry,
            hasMaterial: !!child.material
          }))
        };
      }
      return { hasScene: false };
    });

    console.log('Scene status after load:', JSON.stringify(sceneStatus, null, 2));

    // Keep browser open for inspection
    console.log('\n🎯 Browser opened for manual inspection. Check if the GLTF model loaded in the 3D scene!');
    console.log('Press Enter to close the browser...');

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
      browser.close();
      process.exit();
    });

  } catch (error) {
    console.error('Error:', error);
    await browser.close();
  }
}

testModelLoad();