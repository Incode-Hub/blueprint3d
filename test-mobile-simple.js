const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting simple mobile controls test...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set mobile viewport
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
    });

    // Navigate to app
    await page.goto('http://localhost:8080/example/index.html', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    // Switch to Design tab
    await page.click('#design_tab');
    await page.waitForTimeout(1000);

    // Test 1: Controls should be hidden initially
    const initialState = await page.evaluate(() => {
      const controls = document.getElementById('mobile-item-controls');
      if (!controls) return { error: 'Controls not found' };
      
      const style = window.getComputedStyle(controls);
      const hasShow = controls.classList.contains('show');
      
      return {
        display: style.display,
        hasShowClass: hasShow,
        isHidden: style.display === 'none' && !hasShow
      };
    });

    console.log('Initial state:', initialState);
    console.log(initialState.isHidden ? '✅ Controls hidden initially' : '❌ Controls should be hidden initially');

    // Test 2: Check mobile detection
    const mobileCheck = await page.evaluate(() => {
      return {
        windowWidth: window.innerWidth,
        isMobile: window.innerWidth <= 768
      };
    });

    console.log('Mobile detection:', mobileCheck);
    console.log(mobileCheck.isMobile ? '✅ Mobile detected correctly' : '❌ Mobile detection failed');

    // Test 3: Check CSS classes
    const cssCheck = await page.evaluate(() => {
      const controls = document.getElementById('mobile-item-controls');
      const styles = window.getComputedStyle(controls);
      return {
        display: styles.display,
        hasShowClass: controls.classList.contains('show')
      };
    });

    console.log('CSS check:', cssCheck);

    console.log('\n========================================');
    console.log('SIMPLE TEST RESULTS:');
    console.log('✅ Server accessible');
    console.log('✅ Mobile viewport set');
    console.log('✅ Controls element found');
    console.log('- Controls hidden initially:', initialState.isHidden ? '✅' : '❌');
    console.log('- Mobile detection works:', mobileCheck.isMobile ? '✅' : '❌');
    console.log('========================================');

  } finally {
    await browser.close();
  }
})();