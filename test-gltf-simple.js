const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple static file server
function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(__dirname, req.url === '/' ? 'example/index.html' : req.url);

      // Security: prevent directory traversal
      if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end();
        return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('File not found');
          return;
        }

        const ext = path.extname(filePath);
        const contentType = {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.gltf': 'model/gltf+json',
          '.json': 'application/json'
        }[ext] || 'text/plain';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });

    server.listen(0, () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

async function testGLTFError() {
  const { server, port } = await createServer();
  console.log(`Server running on port ${port}`);

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--use-gl=swiftshader',
      '--disable-web-security'
    ]
  });

  const page = await browser.newPage();

  // Capture all console and error messages
  page.on('console', msg => {
    console.log(`[${msg.type().toUpperCase()}]`, msg.text());
  });

  page.on('pageerror', error => {
    console.log('[PAGE ERROR]', error.message);
  });

  try {
    await page.goto(`http://localhost:${port}`);

    // Wait for BP3D to load
    await page.waitForFunction('typeof BP3D !== "undefined"', { timeout: 10000 });

    console.log('\n=== Testing GLTF item addition ===');

    // Add comprehensive error monitoring
    await page.evaluate(() => {
      window.errorLog = [];

      // Override console methods
      ['error', 'warn'].forEach(method => {
        const original = console[method];
        console[method] = function(...args) {
          window.errorLog.push(`[${method.toUpperCase()}] ${args.join(' ')}`);
          original.apply(console, args);
        };
      });

      // Monitor Three.js renderer errors
      if (window.THREE && window.THREE.WebGLRenderer) {
        const originalRender = window.THREE.WebGLRenderer.prototype.render;
        window.THREE.WebGLRenderer.prototype.render = function(...args) {
          try {
            return originalRender.apply(this, args);
          } catch (error) {
            window.errorLog.push(`[RENDER ERROR] ${error.message}`);
            throw error;
          }
        };
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to add a GLTF item
    const addResult = await page.evaluate(() => {
      try {
        if (!window.main) {
          return { success: false, error: 'window.main not found' };
        }

        const model = window.main.getModel();
        if (!model || !model.scene) {
          return { success: false, error: 'model.scene not found' };
        }

        console.log('Adding GLTF item...');
        model.scene.addItem(
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
        return { success: false, error: error.message, stack: error.stack };
      }
    });

    console.log('Add result:', addResult);

    // Wait and check for errors
    await new Promise(resolve => setTimeout(resolve, 5000));

    const errorLog = await page.evaluate(() => window.errorLog || []);
    console.log('\n=== Error Log ===');
    errorLog.forEach(error => console.log(error));

    // Force a render update
    await page.evaluate(() => {
      if (window.main && window.main.needsUpdate) {
        window.main.needsUpdate();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const finalErrorLog = await page.evaluate(() => window.errorLog || []);
    console.log('\n=== Final Error Log ===');
    finalErrorLog.slice(errorLog.length).forEach(error => console.log(error));

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
    server.close();
    console.log('Test completed');
  }
}

testGLTFError().catch(console.error);