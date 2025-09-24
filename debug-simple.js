const puppeteer = require('puppeteer');

async function quickDebug() {
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

    // Check what's in the items wrapper
    const content = await page.evaluate(() => {
      const wrapper = document.getElementById('items-wrapper');
      if (!wrapper) return 'No items-wrapper found';

      const html = wrapper.innerHTML;
      const itemCount = wrapper.querySelectorAll('.add-item, .category-folder').length;
      const gltfCount = wrapper.innerHTML.match(/GLTF/g)?.length || 0;

      return {
        itemCount,
        gltfCount,
        hasFormatSelector: !!document.querySelector('input[name="format"]'),
        firstFewItems: Array.from(wrapper.querySelectorAll('[model-name], [data-category]')).slice(0, 5).map(el =>
          el.getAttribute('model-name') || el.getAttribute('data-category')
        )
      };
    });

    console.log('Results:', JSON.stringify(content, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

quickDebug();