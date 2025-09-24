// Debug commands to paste into browser console
// Run these commands in the browser console when the app is loaded

console.log('=== Blueprint3D Debug Commands ===');

// Command 1: Check current scene state
window.debugSceneState = function() {
  if (!window.main) {
    console.log('window.main not available');
    return;
  }

  const scene = window.main.getModel().scene.getScene();
  console.log('Scene children count:', scene.children.length);

  scene.children.forEach((child, i) => {
    console.log(`Object ${i}:`, {
      type: child.type || 'Unknown',
      uuid: child.uuid,
      hasGeometry: !!child.geometry,
      geometryType: child.geometry ? child.geometry.type : 'none',
      vertices: child.geometry && child.geometry.vertices ? child.geometry.vertices.length : 'none',
      faces: child.geometry && child.geometry.faces ? child.geometry.faces.length : 'none',
      hasMaterial: !!child.material,
      materialType: child.material ? child.material.type : 'none'
    });
  });
};

// Command 2: Test individual object rendering
window.debugRenderObjects = function() {
  if (!window.main) {
    console.log('window.main not available');
    return;
  }

  const renderer = window.main.renderer;
  const camera = window.main.getCamera();
  const mainScene = window.main.getModel().scene.getScene();

  if (!renderer || !camera) {
    console.log('Renderer or camera not available');
    return;
  }

  console.log(`Testing ${mainScene.children.length} objects individually...`);

  const testScene = new THREE.Scene();
  const problematicObjects = [];

  for (let i = 0; i < mainScene.children.length; i++) {
    const obj = mainScene.children[i];
    console.log(`Testing object ${i}: ${obj.type || 'Unknown'}`);

    testScene.add(obj);

    try {
      renderer.render(testScene, camera);
      console.log(`✓ Object ${i} rendered successfully`);
    } catch (error) {
      console.error(`✗ Object ${i} failed:`, error);
      problematicObjects.push({ index: i, object: obj, error: error.message });
    }

    testScene.remove(obj);
  }

  console.log('Problematic objects found:', problematicObjects.length);
  problematicObjects.forEach(item => {
    console.log(`Problem object ${item.index}:`, {
      type: item.object.type,
      uuid: item.object.uuid,
      error: item.error,
      geometry: item.object.geometry ? {
        type: item.object.geometry.type,
        vertices: item.object.geometry.vertices ? item.object.geometry.vertices.length : 'none',
        faces: item.object.geometry.faces ? item.object.geometry.faces.length : 'none'
      } : 'none'
    });
  });

  return problematicObjects;
};

// Command 3: Remove problematic objects
window.debugRemoveProblematic = function() {
  const problematic = window.debugRenderObjects();
  const mainScene = window.main.getModel().scene.getScene();

  problematic.forEach(item => {
    console.log(`Removing problematic object ${item.index}`);
    mainScene.remove(item.object);
  });

  console.log(`Removed ${problematic.length} problematic objects`);
  return problematic.length;
};

// Command 4: Add GLTF and monitor
window.debugAddGLTF = function(filename = 'example/gltf/Kepler Basin 70.gltf') {
  if (!window.main) {
    console.log('window.main not available');
    return;
  }

  const model = window.main.getModel();
  const scene = model.scene;

  console.log('Before adding GLTF - scene children:', scene.getScene().children.length);

  // Monitor for new errors
  const originalError = console.error;
  const errors = [];
  console.error = function(...args) {
    errors.push(args.join(' '));
    originalError.apply(console, args);
  };

  try {
    scene.addItem(
      1, // itemType
      filename,
      { height: 24 },
      new THREE.Vector3(100, 0, 100),
      0,
      new THREE.Vector3(1, 1, 1),
      false
    );

    console.log('GLTF item added successfully');

    // Wait and check for errors
    setTimeout(() => {
      console.log('After GLTF loading - scene children:', scene.getScene().children.length);
      console.log('Errors during GLTF loading:', errors);
      console.error = originalError; // Restore original

      // Test rendering after GLTF load
      setTimeout(() => {
        console.log('Testing render after GLTF load...');
        window.debugRenderObjects();
      }, 2000);

    }, 5000);

  } catch (error) {
    console.error('Error adding GLTF item:', error);
    console.error = originalError; // Restore original
  }
};

// Command 5: Force cleanup
window.debugCleanup = function() {
  if (window.main && typeof window.main.cleanupScene === 'function') {
    window.main.cleanupScene();
  } else {
    console.log('cleanupScene function not available');
  }
};

// Command 6: Reset render errors and restart animation
window.debugResetRender = function() {
  if (window.main && typeof window.main.resetRenderErrors === 'function') {
    console.log('Current render error count:', window.main.getRenderErrorCount());
    window.main.resetRenderErrors();
    console.log('Render errors reset, animation restarted');
  } else {
    console.log('resetRenderErrors function not available');
  }
};

// Command 7: Check if black screen is due to stopped animation
window.debugRenderStatus = function() {
  if (!window.main) {
    console.log('window.main not available');
    return { error: 'No main object' };
  }

  const status = {
    hasRenderer: !!window.main.renderer,
    renderErrorCount: window.main.getRenderErrorCount ? window.main.getRenderErrorCount() : 'unknown',
    sceneChildren: window.main.getModel ? window.main.getModel().scene.getScene().children.length : 'unknown',
    hasCamera: !!window.main.getCamera,
    cameraPosition: window.main.getCamera ? {
      x: window.main.getCamera().position.x,
      y: window.main.getCamera().position.y,
      z: window.main.getCamera().position.z
    } : 'unknown'
  };

  console.log('Render Status:', status);

  if (status.renderErrorCount >= 5) {
    console.log('⚠️ Animation loop may have stopped due to too many render errors');
    console.log('Run debugResetRender() to restart');
  }

  if (status.sceneChildren === 0) {
    console.log('⚠️ Scene is empty - no objects to render');
  }

  return status;
};

// Command 8: Emergency scene restoration
window.debugRestoreScene = function() {
  console.log('Attempting emergency scene restoration...');

  // Reset render errors
  window.debugResetRender();

  // Cleanup scene
  window.debugCleanup();

  // Add a test object to ensure rendering works
  if (window.main && window.main.getModel) {
    const scene = window.main.getModel().scene;
    console.log('Adding test geometry to verify rendering...');

    try {
      scene.addItem(
        1, // itemType
        'models/js/cb-blue-block-60x96.js', // Use a known working model
        {},
        new THREE.Vector3(0, 0, 0),
        0,
        new THREE.Vector3(1, 1, 1),
        false
      );
      console.log('Test object added successfully');
    } catch (error) {
      console.error('Failed to add test object:', error);
    }
  }
};

console.log('Debug commands loaded:');
console.log('- debugSceneState() - Check current scene state');
console.log('- debugRenderObjects() - Test individual object rendering');
console.log('- debugRemoveProblematic() - Remove problematic objects');
console.log('- debugAddGLTF() - Add GLTF and monitor for errors');
console.log('- debugCleanup() - Force scene cleanup');
console.log('- debugResetRender() - Reset render errors and restart animation');
console.log('- debugRenderStatus() - Check render status and diagnose black screen');
console.log('- debugRestoreScene() - Emergency scene restoration');
console.log('');
console.log('🚨 If you see a black screen after adding GLTF:');
console.log('1. Run: debugRenderStatus()');
console.log('2. If render errors >= 5, run: debugResetRender()');
console.log('3. If still black, run: debugRestoreScene()');
console.log('');
console.log('To start debugging, run: debugSceneState()');