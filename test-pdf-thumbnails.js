const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Starting PDF thumbnail export test...\n');
  
  // Start the server
  const serverProcess = spawn('node', ['server.js']);
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const browser = await puppeteer.launch({
    headless: false, // Keep visible for testing
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  try {
    const page = await browser.newPage();

    // Set up desktop viewport for easier testing
    await page.setViewport({
      width: 1200,
      height: 800,
    });

    // Add console listener for debugging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Thumbnail') || text.includes('PDF') || text.includes('Error') || text.includes('jsPDF')) {
        console.log('PAGE LOG:', text);
      }
    });

    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });

    // Navigate to the application
    await page.goto('http://localhost:8080/example/index.html', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    console.log('=== TEST 1: Add multiple items with different thumbnails ===');
    
    // Go to Add Items tab
    await page.click('#items_tab');
    await page.waitForTimeout(1000);

    // Wait for items to load
    await page.waitForSelector('.thumbnail', { visible: true, timeout: 5000 });
    
    // Get all available item thumbnails
    const itemThumbnails = await page.$$('.thumbnail');
    console.log(`Found ${itemThumbnails.length} items available`);

    // Add multiple items (5-7 for testing)
    const itemsToAdd = Math.min(7, itemThumbnails.length);
    const addedItems = [];
    
    for (let i = 0; i < itemsToAdd; i++) {
      // Get item info before clicking
      const itemInfo = await itemThumbnails[i].evaluate((el) => {
        return {
          name: el.getAttribute('model-name') || 'Unknown',
          thumbnail: el.getAttribute('model-image') || el.querySelector('img')?.src || 'No thumbnail',
          modelUrl: el.getAttribute('model-url') || 'No model URL'
        };
      });
      
      addedItems.push(itemInfo);
      await itemThumbnails[i].click();
      await page.waitForTimeout(800);
      console.log(`✅ Added item ${i + 1}: ${itemInfo.name}`);
      console.log(`   Thumbnail: ${itemInfo.thumbnail}`);
    }

    console.log(`\n✅ Added ${itemsToAdd} items to the scene`);

    console.log('\n=== TEST 2: Switch to Design tab and verify items ===');
    
    // Go to Design tab
    await page.click('#design_tab');
    await page.waitForTimeout(2000);

    // Check items in scene and their metadata
    const sceneItemsInfo = await page.evaluate(() => {
      if (typeof blueprint3d !== 'undefined' && blueprint3d.model && blueprint3d.model.scene) {
        const items = blueprint3d.model.scene.getItems();
        return items.map((item, index) => ({
          index: index,
          name: item.metadata.itemName || 'Unknown',
          hasThumbnailUrl: !!item.metadata.thumbnailUrl,
          thumbnailUrl: item.metadata.thumbnailUrl,
          modelUrl: item.metadata.modelUrl
        }));
      }
      return [];
    });

    console.log('Items in scene with metadata:');
    sceneItemsInfo.forEach((item, i) => {
      console.log(`${i + 1}. ${item.name}`);
      console.log(`   Has thumbnail URL: ${item.hasThumbnailUrl ? '✅' : '❌'}`);
      console.log(`   Thumbnail URL: ${item.thumbnailUrl || 'Not found'}`);
    });

    console.log('\n=== TEST 3: Test PDF export with thumbnails ===');
    
    // Check if libraries are loaded
    const librariesCheck = await page.evaluate(() => {
      return {
        jsPDF: typeof window.jspdf !== 'undefined',
        PDFExporter: typeof PDFExporter !== 'undefined'
      };
    });
    
    console.log('Library status:');
    console.log('- jsPDF loaded:', librariesCheck.jsPDF ? '✅' : '❌');
    console.log('- PDFExporter available:', librariesCheck.PDFExporter ? '✅' : '❌');

    console.log('\n=== TEST 4: Monitor thumbnail loading and PDF generation ===');
    
    // Click the export button and monitor the process
    const exportButton = await page.$('#export-items-list');
    if (exportButton) {
      console.log('Starting PDF export...');
      
      // Set up promises to monitor loading messages
      let loadingMessages = [];
      const originalConsoleLog = console.log;
      
      await exportButton.click();
      
      // Monitor for loading completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 15; // 15 seconds max
      
      while (!completed && attempts < maxAttempts) {
        await page.waitForTimeout(1000);
        attempts++;
        
        const status = await page.evaluate(() => {
          const loadingModal = document.getElementById('pdf-loading-modal');
          const statusEl = document.getElementById('pdf-status');
          
          return {
            loadingVisible: loadingModal && loadingModal.style.display !== 'none',
            statusVisible: statusEl && statusEl.style.display !== 'none',
            statusText: statusEl ? statusEl.innerText : '',
            isSuccess: statusEl ? statusEl.classList.contains('alert-success') : false,
            isError: statusEl ? statusEl.classList.contains('alert-danger') : false
          };
        });
        
        if (!status.loadingVisible) {
          if (status.statusVisible) {
            console.log('PDF export completed!');
            console.log('Status:', status.statusText);
            if (status.isSuccess) {
              console.log('✅ Export successful!');
            } else if (status.isError) {
              console.log('❌ Export failed:', status.statusText);
            }
            completed = true;
          }
        } else {
          console.log(`Export in progress... (${attempts}/${maxAttempts})`);
        }
      }
      
      if (!completed) {
        console.log('⚠️  Export took longer than expected');
      }
    } else {
      console.log('❌ Export button not found');
    }

    // Take a screenshot
    await page.screenshot({ path: 'pdf-thumbnails-test.png', fullPage: false });
    console.log('\n📸 Screenshot saved as pdf-thumbnails-test.png');

    console.log('\n========================================');
    console.log('TEST SUMMARY:');
    console.log(`- Items added to scene: ${itemsToAdd}`);
    console.log(`- Items with thumbnail URLs: ${sceneItemsInfo.filter(item => item.hasThumbnailUrl).length}/${sceneItemsInfo.length}`);
    console.log('- jsPDF library:', librariesCheck.jsPDF ? '✅ Loaded' : '❌ Missing');
    console.log('- PDFExporter class:', librariesCheck.PDFExporter ? '✅ Available' : '❌ Missing');
    console.log('========================================\n');

    console.log('Manual verification:');
    console.log('1. Check browser downloads for "blueprint3d-items-list.pdf"');
    console.log('2. Open the PDF and verify:');
    console.log('   - All items are listed with thumbnails');
    console.log('   - Thumbnails are properly sized and positioned');
    console.log('   - Text is readable and well-formatted');
    console.log('   - Multiple pages if many items');
    console.log('   - No missing or broken images');

    console.log('\nBrowser will remain open for manual verification...');
    console.log('Press Ctrl+C to exit.');
    
    // Keep the browser open for manual testing
    await new Promise(() => {});

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // await browser.close();
    // serverProcess.kill();
  }
})();