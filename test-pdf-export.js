const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Starting PDF export test...\n');
  
  // Start the server
  const serverProcess = spawn('node', ['server.js']);
  
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const browser = await puppeteer.launch({
    headless: false, // Keep visible for testing
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
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
      if (text.includes('PDF') || text.includes('Error') || text.includes('jsPDF')) {
        console.log('PAGE LOG:', text);
      }
    });

    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });

    // Navigate to the application
    await page.goto('http://localhost:8080/example/index.html', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    console.log('=== TEST 1: Verify PDF export button exists ===');
    
    const exportButton = await page.$('#export-items-list');
    console.log(exportButton ? '✅ Export button found' : '❌ Export button not found');

    console.log('\n=== TEST 2: Add multiple items to the scene ===');
    
    // Go to Add Items tab
    await page.click('#items_tab');
    await page.waitForTimeout(1000);

    // Wait for items to load
    await page.waitForSelector('.thumbnail', { visible: true, timeout: 5000 });
    
    // Get all available item thumbnails
    const itemThumbnails = await page.$$('.thumbnail');
    console.log(`Found ${itemThumbnails.length} items to add`);

    // Add multiple items (up to 5 for testing)
    const itemsToAdd = Math.min(5, itemThumbnails.length);
    for (let i = 0; i < itemsToAdd; i++) {
      await itemThumbnails[i].click();
      await page.waitForTimeout(500);
      console.log(`✅ Added item ${i + 1}/${itemsToAdd}`);
    }

    console.log(`\n✅ Added ${itemsToAdd} items to the scene`);

    console.log('\n=== TEST 3: Switch to Design tab and verify items ===');
    
    // Go to Design tab
    await page.click('#design_tab');
    await page.waitForTimeout(2000);

    // Check if items are visible in the scene
    const sceneItems = await page.evaluate(() => {
      if (typeof blueprint3d !== 'undefined' && blueprint3d.model && blueprint3d.model.scene) {
        return blueprint3d.model.scene.getItems().length;
      }
      return 0;
    });

    console.log(`Items in scene: ${sceneItems}`);
    console.log(sceneItems > 0 ? '✅ Items found in scene' : '❌ No items in scene');

    console.log('\n=== TEST 4: Test PDF export functionality ===');
    
    // Check if jsPDF is loaded
    const jsPDFLoaded = await page.evaluate(() => {
      return typeof window.jspdf !== 'undefined';
    });
    
    console.log('jsPDF loaded:', jsPDFLoaded ? '✅' : '❌');

    // Check if PDFExporter is initialized
    const pdfExporterExists = await page.evaluate(() => {
      return typeof PDFExporter !== 'undefined';
    });
    
    console.log('PDFExporter class exists:', pdfExporterExists ? '✅' : '❌');

    console.log('\n=== TEST 5: Trigger PDF export ===');
    
    // Click the export button
    if (exportButton) {
      await exportButton.click();
      console.log('✅ Clicked export button');
      
      // Wait for potential PDF generation
      await page.waitForTimeout(3000);
      
      // Check for success/error messages
      const statusMessage = await page.evaluate(() => {
        const statusEl = document.getElementById('pdf-status');
        if (statusEl && statusEl.style.display !== 'none') {
          return {
            visible: true,
            text: statusEl.innerText,
            isSuccess: statusEl.classList.contains('alert-success'),
            isError: statusEl.classList.contains('alert-danger')
          };
        }
        return { visible: false };
      });

      console.log('Status message:', statusMessage);
      
      if (statusMessage.visible) {
        if (statusMessage.isSuccess) {
          console.log('✅ PDF export successful:', statusMessage.text);
        } else if (statusMessage.isError) {
          console.log('❌ PDF export error:', statusMessage.text);
        }
      } else {
        console.log('⚠️  No status message visible');
      }
    }

    console.log('\n=== TEST 6: Manual verification instructions ===');
    console.log('The browser window is now open for manual verification:');
    console.log('1. Check that items are visible in the 3D design view');
    console.log('2. Look for the "Download Items List" button in the sidebar');
    console.log('3. Click the button to test PDF export');
    console.log('4. Check browser downloads folder for "blueprint3d-items-list.pdf"');
    console.log('5. Verify the PDF contains all items with proper pagination');
    
    // Take a screenshot
    await page.screenshot({ path: 'pdf-export-test.png', fullPage: false });
    console.log('\n📸 Screenshot saved as pdf-export-test.png');

    console.log('\n========================================');
    console.log('TEST RESULTS:');
    console.log('- Export button found:', exportButton ? '✅' : '❌');
    console.log('- Items in scene:', sceneItems > 0 ? '✅ ' + sceneItems : '❌ 0');
    console.log('- jsPDF library loaded:', jsPDFLoaded ? '✅' : '❌');
    console.log('- PDFExporter class exists:', pdfExporterExists ? '✅' : '❌');
    console.log('========================================\n');

    console.log('Browser will remain open for manual testing...');
    console.log('Press Ctrl+C to exit.');
    
    // Keep the browser open for manual testing
    await new Promise(() => {});

  } catch (error) {
    console.error('Test error:', error);
    await browser.close();
    serverProcess.kill();
    process.exit(1);
  }
})();