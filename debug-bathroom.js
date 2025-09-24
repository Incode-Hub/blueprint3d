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
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Checking categories...');
    const categories = await page.evaluate(() => {
      const cats = document.querySelectorAll('.category-folder');
      return Array.from(cats).map(cat => ({
        name: cat.getAttribute('data-category'),
        text: cat.textContent.trim()
      }));
    });

    console.log('Available categories:', categories);

    // Find and click Bathroom category
    const bathroomExists = await page.$('[data-category="Bathroom"]');
    if (bathroomExists) {
      console.log('Clicking Bathroom category...');
      await page.click('[data-category="Bathroom"]');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check what items are shown
      const bathroomItems = await page.evaluate(() => {
        const items = document.querySelectorAll('.add-item');
        return Array.from(items).map(item => ({
          name: item.getAttribute('model-name'),
          url: item.getAttribute('model-url'),
          type: item.getAttribute('model-type')
        }));
      });

      console.log('Bathroom items found:', bathroomItems);

      // Check format filter state
      const formatState = await page.evaluate(() => {
        const radios = document.querySelectorAll('input[name="format"]');
        return Array.from(radios).map(radio => ({
          value: radio.value,
          checked: radio.checked
        }));
      });

      console.log('Format filter state:', formatState);

      // Try switching to GLTF only
      console.log('Switching to GLTF filter...');
      await page.click('input[value="gltf"]');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const gltfOnlyItems = await page.evaluate(() => {
        const items = document.querySelectorAll('.add-item');
        return Array.from(items).map(item => ({
          name: item.getAttribute('model-name'),
          url: item.getAttribute('model-url')
        }));
      });

      console.log('GLTF-only items:', gltfOnlyItems);

    } else {
      console.log('Bathroom category not found!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugBathroom();