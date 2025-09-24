const puppeteer = require('puppeteer');

async function debugBathroom() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log('Loading page...');
    await page.goto('http://localhost:8080/example/index.html', { waitUntil: 'networkidle0' });

    console.log('Clicking Design tab...');
    await page.click('#design_tab');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Great! Bathroom category has 8 items. Using JavaScript to click Bathroom...');

    // Use evaluate to click via JavaScript instead
    await page.evaluate(() => {
      const bathroomCategory = document.querySelector('[data-category="Bathroom"]');
      if (bathroomCategory) {
        bathroomCategory.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check what items are shown
    const bathroomItems = await page.evaluate(() => {
      const items = document.querySelectorAll('.add-item');
      console.log('Found', items.length, 'items');
      return Array.from(items).map(item => ({
        name: item.getAttribute('model-name'),
        url: item.getAttribute('model-url'),
        type: item.getAttribute('model-type')
      }));
    });

    console.log(`Found ${bathroomItems.length} bathroom items:`);
    bathroomItems.forEach((item, i) => {
      console.log(`${i + 1}. ${item.name} -> ${item.url}`);
    });

    // Check if we can see GLTF items
    const gltfItems = bathroomItems.filter(item => item.name && item.name.includes('GLTF'));
    console.log(`\nGLTF items: ${gltfItems.length}`);

    // Check format filter functionality
    console.log('\nTesting format filters...');

    // Test JS filter
    await page.evaluate(() => {
      const jsRadio = document.querySelector('input[value="js"]');
      if (jsRadio) jsRadio.click();
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const jsOnlyItems = await page.evaluate(() => {
      return document.querySelectorAll('.add-item').length;
    });

    console.log(`JS filter: ${jsOnlyItems} items visible`);

    // Test GLTF filter
    await page.evaluate(() => {
      const gltfRadio = document.querySelector('input[value="gltf"]');
      if (gltfRadio) gltfRadio.click();
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    const gltfOnlyItems = await page.evaluate(() => {
      return document.querySelectorAll('.add-item').length;
    });

    console.log(`GLTF filter: ${gltfOnlyItems} items visible`);

    // Test clicking a GLTF item
    if (gltfOnlyItems > 0) {
      console.log('\nTrying to click a GLTF item...');

      const clickResult = await page.evaluate(() => {
        const gltfItem = document.querySelector('.add-item');
        if (gltfItem) {
          const modelName = gltfItem.getAttribute('model-name');
          const modelUrl = gltfItem.getAttribute('model-url');
          console.log('Clicking:', modelName, 'at', modelUrl);
          gltfItem.click();
          return { modelName, modelUrl, clicked: true };
        }
        return { clicked: false };
      });

      console.log('Click result:', clickResult);

      // Wait a bit and check for any errors or success
      await new Promise(resolve => setTimeout(resolve, 3000));

      const finalStatus = await page.evaluate(() => {
        // Check if there are any visible errors
        const errors = document.querySelectorAll('.alert-danger, .error');
        return {
          errorCount: errors.length,
          errorMessages: Array.from(errors).map(e => e.textContent),
          // Check if the 3D scene has any objects
          hasThreeScene: typeof window.THREE !== 'undefined'
        };
      });

      console.log('Final status:', finalStatus);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugBathroom();