/// <reference path="../../../lib/three.d.ts" />

module BP3D.Three.Loaders {

  export interface GLTFLoadOptions {
    scaleInches?: number;
    castShadow?: boolean;
    receiveShadow?: boolean;
  }

  /**
   * GLTF Loader for Blueprint3D
   * Loads .gltf/.glb models and converts them to THREE.Object3D compatible with legacy Three.js r69
   */
  export function loadGLTF(url: string, opts?: GLTFLoadOptions): any {
    opts = opts || {};
    var scaleInches = opts.scaleInches;
    var castShadow = opts.castShadow !== false;
    var receiveShadow = opts.receiveShadow !== false;

    // Create a simple promise-like object for ES5 compatibility
    var promiseObj = {
      then: function(onSuccess, onError) {
        // Check if global THREE and GLTFLoader are available
        if (typeof THREE === 'undefined') {
          if (onError) onError(new Error('THREE.js not loaded'));
          return;
        }

        // Try to use native GLTFLoader if available (for upgraded three.js)
        if (typeof THREE['GLTFLoader'] !== 'undefined') {
          var loader = new THREE['GLTFLoader']();
          loader.load(url, function(gltf) {
            var object = gltf.scene || gltf.scenes[0] || gltf;
            processGLTFObject(object, scaleInches, castShadow, receiveShadow);
            if (onSuccess) onSuccess(object);
          }, undefined, onError);
          return;
        }

        // Fallback to ModelLoader if GLTFLoader not available
        if (typeof window['ModelLoader'] !== 'undefined') {
          var ModelLoader = window['ModelLoader'];
          ModelLoader.loadAnyModel(url)
            .then(function(object) {
              processGLTFObject(object, scaleInches, castShadow, receiveShadow);
              if (onSuccess) onSuccess(object);
            })
            .catch(onError);
          return;
        }

        if (onError) onError(new Error('No GLTF loader available. Ensure GLTFLoader.js is loaded or ModelLoader is available.'));
      },
      catch: function(onError) {
        // Handle catch method for promise-like interface
        return promiseObj;
      }
    };

    return promiseObj;
  }

  /**
   * Process loaded GLTF object: set shadows, scale, and recenter
   */
  function processGLTFObject(object: THREE.Object3D, scaleInches: number, castShadow: boolean, receiveShadow: boolean): void {
    if (!object) return;

    // Apply shadow settings to all meshes
    object.traverse(function(child) {
      if (child instanceof THREE.Mesh) {
        child.castShadow = castShadow;
        child.receiveShadow = receiveShadow;

        // Ensure double-sided materials for compatibility
        if (child.material) {
          // Check if material has length property to determine if it's an array
          if (child.material.hasOwnProperty('length')) {
            var materials = <any>child.material;
            for (var i = 0; i < materials.length; i++) {
              var mat = materials[i];
              if (mat && mat.side !== undefined) {
                mat.side = THREE.DoubleSide;
              }
            }
          } else {
            var singleMat = <any>child.material;
            if (singleMat.side !== undefined) {
              singleMat.side = THREE.DoubleSide;
            }
          }
        }
      }
    });

    // Scale normalization if height specified
    if (scaleInches && scaleInches > 0) {
      var bbox = new THREE.Box3().setFromObject(object);
      var currentHeight = bbox.max.y - bbox.min.y;
      var targetHeight = scaleInches * 0.0254; // Convert inches to meters

      if (currentHeight > 0) {
        var scale = targetHeight / currentHeight;
        object.scale.multiplyScalar(scale);
      }
    }

    // Recenter to local origin
    var bbox = new THREE.Box3().setFromObject(object);
    var center = new THREE.Vector3();
    center.x = (bbox.min.x + bbox.max.x) * 0.5;
    center.y = (bbox.min.y + bbox.max.y) * 0.5;
    center.z = (bbox.min.z + bbox.max.z) * 0.5;

    // Translate so bottom center is at origin
    object.position.set(-center.x, -bbox.min.y, -center.z);
  }

  /**
   * Helper function to check if a URL is a GLTF/GLB file
   */
  export function isGLTFFile(url: string): boolean {
    var parts = url.split('.');
    var extension = parts.length > 0 ? parts[parts.length - 1].toLowerCase() : '';
    return extension === 'gltf' || extension === 'glb';
  }
}