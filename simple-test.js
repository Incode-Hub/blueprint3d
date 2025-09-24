// Simple GLTF Integration Test without complex browser automation

const http = require('http');
const fs = require('fs');
const path = require('path');

// Test server accessibility
async function testServerAccess() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:8000/example/', (res) => {
            console.log('✅ Server accessible:', res.statusCode);
            resolve(res.statusCode === 200);
        });

        req.on('error', (err) => {
            console.log('❌ Server access failed:', err.message);
            reject(err);
        });

        req.setTimeout(5000, () => {
            console.log('❌ Server access timeout');
            reject(new Error('Timeout'));
        });
    });
}

// Test file existence
function testFileExists(filePath) {
    const fullPath = path.join(__dirname, filePath);
    const exists = fs.existsSync(fullPath);
    console.log(`${exists ? '✅' : '❌'} File exists: ${filePath}`);
    return exists;
}

// Test GLTF files
function testGLTFFiles() {
    console.log('\n📄 Testing GLTF file accessibility:');

    const gltfFiles = [
        'example/models/sample-box.gltf',
        'example/gltf/Kepler Basin 70.gltf',
        'example/gltf/Kepler Basin 70 Half Pedestal.gltf',
        'example/gltf/Kepler Basin 70 Pedestal.gltf',
        'example/gltf/Kepler Toilet Floor Standing.gltf'
    ];

    let existingFiles = 0;
    gltfFiles.forEach(file => {
        if (testFileExists(file)) {
            existingFiles++;
        }
    });

    console.log(`📊 ${existingFiles}/${gltfFiles.length} GLTF files found`);
    return existingFiles;
}

// Test built files
function testBuiltFiles() {
    console.log('\n🔧 Testing built files:');

    const requiredFiles = [
        'example/js/blueprint3d.js',
        'example/vendor/GLTFLoader.js',
        'example/js/three.min.js',
        'dist/blueprint3d.js'
    ];

    let existingFiles = 0;
    requiredFiles.forEach(file => {
        if (testFileExists(file)) {
            existingFiles++;
        }
    });

    console.log(`📊 ${existingFiles}/${requiredFiles.length} required files found`);
    return existingFiles;
}

// Test catalog integration
function testCatalogIntegration() {
    console.log('\n📚 Testing catalog integration:');

    try {
        const itemsFile = path.join(__dirname, 'example/js/items.js');
        const content = fs.readFileSync(itemsFile, 'utf8');

        // Check for GLTF items in catalog
        const gltfItems = content.match(/"format"\s*:\s*"gltf"/g);
        const sampleBoxItem = content.includes('Sample Box (GLTF)');

        console.log(`✅ GLTF format items in catalog: ${gltfItems ? gltfItems.length : 0}`);
        console.log(`${sampleBoxItem ? '✅' : '❌'} Sample Box GLTF item found`);

        return gltfItems ? gltfItems.length : 0;
    } catch (error) {
        console.log('❌ Failed to read catalog:', error.message);
        return 0;
    }
}

// Test TypeScript compilation
function testTypeScriptCompilation() {
    console.log('\n🔧 Testing TypeScript compilation:');

    try {
        const distFile = path.join(__dirname, 'dist/blueprint3d.js');
        const content = fs.readFileSync(distFile, 'utf8');

        // Check for GLTF loader integration
        const hasGLTFLoader = content.includes('BP3D.Three.Loaders');
        const hasLoadGLTF = content.includes('loadGLTF');
        const hasIsGLTFFile = content.includes('isGLTFFile');

        console.log(`${hasGLTFLoader ? '✅' : '❌'} GLTF Loader module compiled`);
        console.log(`${hasLoadGLTF ? '✅' : '❌'} loadGLTF function available`);
        console.log(`${hasIsGLTFFile ? '✅' : '❌'} isGLTFFile function available`);

        return hasGLTFLoader && hasLoadGLTF && hasIsGLTFFile;
    } catch (error) {
        console.log('❌ Failed to read compiled file:', error.message);
        return false;
    }
}

// Test HTML updates
function testHTMLUpdates() {
    console.log('\n📝 Testing HTML updates:');

    try {
        const htmlFile = path.join(__dirname, 'example/index.html');
        const content = fs.readFileSync(htmlFile, 'utf8');

        // Check for GLTFLoader script inclusion
        const hasGLTFScript = content.includes('vendor/GLTFLoader.js');
        const hasFavicon = content.includes('favicon') || content.includes('icon');

        console.log(`${hasGLTFScript ? '✅' : '❌'} GLTFLoader script included`);
        console.log(`${hasFavicon ? '✅' : '❌'} Favicon configured`);

        return hasGLTFScript;
    } catch (error) {
        console.log('❌ Failed to read HTML file:', error.message);
        return false;
    }
}

// Main test runner
async function runTests() {
    console.log('🧪 GLTF Integration Verification Tests\n');
    console.log('=====================================');

    let passedTests = 0;
    let totalTests = 0;

    // Test 1: Server Access
    totalTests++;
    try {
        const serverOk = await testServerAccess();
        if (serverOk) passedTests++;
    } catch (error) {
        console.log('❌ Server test failed');
    }

    // Test 2: Built Files
    totalTests++;
    const builtFiles = testBuiltFiles();
    if (builtFiles >= 3) passedTests++; // At least 3 of 4 files should exist

    // Test 3: GLTF Files
    totalTests++;
    const gltfFiles = testGLTFFiles();
    if (gltfFiles >= 2) passedTests++; // At least 2 GLTF files should exist

    // Test 4: Catalog Integration
    totalTests++;
    const catalogItems = testCatalogIntegration();
    if (catalogItems >= 1) passedTests++;

    // Test 5: TypeScript Compilation
    totalTests++;
    const compilationOk = testTypeScriptCompilation();
    if (compilationOk) passedTests++;

    // Test 6: HTML Updates
    totalTests++;
    const htmlOk = testHTMLUpdates();
    if (htmlOk) passedTests++;

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
    console.log(`📈 Success Rate: ${Math.round((passedTests/totalTests)*100)}%`);

    if (passedTests === totalTests) {
        console.log('\n🎉 All tests passed! GLTF integration is ready.');
        console.log('\n🚀 Next steps:');
        console.log('   1. Open http://localhost:8000/example/ in your browser');
        console.log('   2. Click "Add Items" tab');
        console.log('   3. Look for GLTF items in the catalog');
        console.log('   4. Try adding a GLTF item to the scene');
        console.log('   5. Test the format filter (All/JS/GLTF)');
    } else {
        console.log('\n⚠️ Some tests failed. Check the output above for details.');
    }

    return {
        passed: passedTests,
        total: totalTests,
        success: passedTests === totalTests
    };
}

// Export for external use
module.exports = { runTests };

// Run if called directly
if (require.main === module) {
    runTests().then((result) => {
        process.exit(result.success ? 0 : 1);
    }).catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}