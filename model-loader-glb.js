/**
 * Universal GLB/GLTF Model Loader for Blueprint3D
 * Exposes window.loadModel(url, onLoad, onError)
 */

window.loadModel = function(url, onLoad, onError) {
  console.log('Loading model:', url);

  if (!url) {
    const error = 'No model URL provided';
    console.error(error);
    if (onError) onError(new Error(error));
    return;
  }

  const fileExtension = url.toLowerCase().split('.').pop();

  if (fileExtension === 'glb' || fileExtension === 'gltf') {
    // Use GLTFLoader for GLB/GLTF files
    if (typeof THREE === 'undefined') {
      const error = 'THREE.js not loaded';
      console.error(error);
      if (onError) onError(new Error(error));
      return;
    }

    if (typeof THREE.GLTFLoader === 'undefined') {
      const error = 'THREE.GLTFLoader not loaded';
      console.error(error);
      if (onError) onError(new Error(error));
      return;
    }

    const loader = new THREE.GLTFLoader();

    loader.load(
      url,
      function(gltf) {
        console.log('GLTF loaded successfully:', gltf);

        // Extract the main scene
        const scene = gltf.scene || (gltf.scenes && gltf.scenes[0]);

        if (!scene) {
          const error = 'No scene found in GLTF file';
          console.error(error);
          if (onError) onError(new Error(error));
          return;
        }

        console.log('Returning scene:', scene);
        if (onLoad) onLoad(scene);
      },
      function(progress) {
        console.log('Loading progress:', progress);
      },
      function(error) {
        console.error('Error loading GLTF:', error);
        if (onError) onError(error);
      }
    );
  } else {
    // Fallback for other formats or existing loaders
    const error = 'Unsupported file format: ' + fileExtension + '. Only .glb and .gltf files are supported.';
    console.error(error);
    if (onError) onError(new Error(error));
  }
};

console.log('GLB model loader initialized');