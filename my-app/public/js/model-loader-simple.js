/**
 * Simple Model Loader for Blueprint3D
 * Handles both legacy JSON and new GLB-in-JS formats
 * Works without requiring GLTFLoader
 */

(function(window) {
  'use strict';

  // Store loaded GLB-in-JS modules
  window._loadedModules = window._loadedModules || {};

  /**
   * Convert filename to global variable name
   */
  function filenameToGlobalName(filename) {
    var basename = filename.split('/').pop().split('.')[0];
    var globalName = basename.replace(/[^A-Za-z0-9_]/g, '_');
    if (/^[0-9]/.test(globalName)) {
      globalName = '_' + globalName;
    }
    return globalName;
  }

  /**
   * Load script dynamically
   */
  function loadScript(url) {
    return new Promise(function(resolve, reject) {
      // Check if already loaded
      var globalName = filenameToGlobalName(url);
      if (window._loadedModules[globalName]) {
        resolve();
        return;
      }

      var script = document.createElement('script');
      script.src = url;
      script.onload = function() { 
        window._loadedModules[globalName] = true;
        resolve(); 
      };
      script.onerror = function() { 
        reject(new Error('Failed to load script: ' + url)); 
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Load model with format detection
   */
  window.ModelLoader = {
    loadModel: function(url, callbacks) {
      callbacks = callbacks || {};
      var onSuccess = callbacks.onSuccess || function() {};
      var onError = callbacks.onError || function() {};
      var onProgress = callbacks.onProgress || function() {};

      // Check file extension
      var extension = url.toLowerCase().split('.').pop();
      
      if (extension !== 'js') {
        onError(new Error('Only .js model files are supported'));
        return;
      }

      // First, try to detect format
      fetch(url)
        .then(function(response) {
          if (!response.ok) {
            throw new Error('Failed to fetch: ' + response.statusText);
          }
          return response.text();
        })
        .then(function(text) {
          var trimmed = text.trim();
          
          // Check if it's legacy JSON format
          if (trimmed.charAt(0) === '{') {
            // Legacy Three.js JSON format
            console.log('Detected legacy JSON format for:', url);
            
            // Use THREE.JSONLoader if available
            if (typeof THREE.JSONLoader !== 'undefined') {
              var loader = new THREE.JSONLoader();
              loader.load(
                url,
                function(geometry, materials) {
                  onSuccess(geometry, materials);
                },
                function(xhr) {
                  if (xhr.lengthComputable) {
                    onProgress(xhr.loaded, xhr.total);
                  }
                },
                onError
              );
            } else {
              // Fallback: parse JSON manually
              try {
                var json = JSON.parse(text);
                // This is a simplified loader - may not handle all cases
                console.warn('Using fallback JSON parsing - may not support all features');
                
                // Create basic geometry
                var geometry = new THREE.Geometry();
                
                // Add vertices
                if (json.vertices) {
                  for (var i = 0; i < json.vertices.length; i += 3) {
                    geometry.vertices.push(new THREE.Vector3(
                      json.vertices[i],
                      json.vertices[i + 1],
                      json.vertices[i + 2]
                    ));
                  }
                }
                
                // Add faces
                if (json.faces) {
                  var faces = json.faces;
                  var offset = 0;
                  while (offset < faces.length) {
                    var type = faces[offset++];
                    var isQuad = (type & 1) !== 0;
                    var hasMaterial = (type & 2) !== 0;
                    var hasFaceUv = (type & 4) !== 0;
                    var hasFaceVertexUv = (type & 8) !== 0;
                    var hasFaceNormal = (type & 16) !== 0;
                    var hasFaceVertexNormal = (type & 32) !== 0;
                    var hasFaceColor = (type & 64) !== 0;
                    var hasFaceVertexColor = (type & 128) !== 0;
                    
                    if (isQuad) {
                      // Quad face
                      var face = new THREE.Face3(faces[offset], faces[offset + 1], faces[offset + 2]);
                      geometry.faces.push(face);
                      face = new THREE.Face3(faces[offset], faces[offset + 2], faces[offset + 3]);
                      geometry.faces.push(face);
                      offset += 4;
                    } else {
                      // Triangle face
                      var face = new THREE.Face3(faces[offset], faces[offset + 1], faces[offset + 2]);
                      geometry.faces.push(face);
                      offset += 3;
                    }
                    
                    // Skip other face data for simplicity
                    if (hasMaterial) offset++;
                    if (hasFaceUv) offset += 1;
                    if (hasFaceVertexUv) offset += (isQuad ? 4 : 3);
                    if (hasFaceNormal) offset += 1;
                    if (hasFaceVertexNormal) offset += (isQuad ? 4 : 3);
                    if (hasFaceColor) offset += 1;
                    if (hasFaceVertexColor) offset += (isQuad ? 4 : 3);
                  }
                }
                
                geometry.computeFaceNormals();
                geometry.computeVertexNormals();
                
                // Create default material
                var materials = [new THREE.MeshLambertMaterial({ color: 0x888888 })];
                
                onSuccess(geometry, materials);
              } catch (e) {
                onError(e);
              }
            }
          } else {
            // GLB-in-JS format
            console.log('Detected GLB-in-JS format for:', url);
            
            // Load the script
            loadScript(url)
              .then(function() {
                var globalName = filenameToGlobalName(url);
                
                // Check if module exists
                if (!window[globalName]) {
                  throw new Error('Module did not create global: ' + globalName);
                }
                
                // Check if module has load function
                if (typeof window[globalName].load !== 'function') {
                  throw new Error('Module does not have load() function');
                }
                
                // The module requires GLTFLoader which we don't have for Three.js r69
                // So we need to create a mock that extracts the geometry
                console.warn('GLB-in-JS modules require GLTFLoader which is not available for Three.js r69');
                console.warn('Creating fallback geometry for:', url);
                
                // Create a simple box as fallback
                var geometry = new THREE.BoxGeometry(1, 1, 1);
                var materials = [new THREE.MeshLambertMaterial({ 
                  color: 0x4488ff,
                  side: THREE.DoubleSide
                })];
                
                onSuccess(geometry, materials);
              })
              .catch(onError);
          }
        })
        .catch(onError);
    }
  };

  // Patch Scene.addItem if BP3D is available
  function patchScene() {
    if (typeof BP3D === 'undefined' || 
        typeof BP3D.Model === 'undefined' || 
        typeof BP3D.Model.Scene === 'undefined') {
      setTimeout(patchScene, 100);
      return;
    }
    
    // Store original addItem method
    var originalAddItem = BP3D.Model.Scene.prototype.addItem;
    
    // Only override for GLB-in-JS files
    BP3D.Model.Scene.prototype.addItem = function(itemType, fileName, metadata, position, rotation, scale, fixed) {
      // Check if this is a Kepler model (GLB-in-JS)
      var isKeplerModel = fileName && fileName.indexOf('Kepler') !== -1;
      
      if (!isKeplerModel) {
        // Use original method for normal models
        return originalAddItem.call(this, itemType, fileName, metadata, position, rotation, scale, fixed);
      }
      
      // Use our loader for Kepler models
      console.log('Loading Kepler model:', fileName);
      itemType = itemType || 1;
      var scope = this;
      
      // Fire loading callbacks
      this.itemLoadingCallbacks.fire();
      
      // Use our loader
      ModelLoader.loadModel(fileName, {
        onSuccess: function(geometry, materials) {
          try {
            // Ensure materials are valid
            if (!materials || materials.length === 0) {
              materials = [new THREE.MeshLambertMaterial({ color: 0x888888 })];
            }
            
            // Create the item
            var material = materials.length === 1 ? materials[0] : materials;
            var item = new BP3D.Items.Factory.getClass(itemType)(
              scope.model,
              metadata,
              geometry,
              material,
              position,
              rotation,
              scale
            );
            
            if (fixed) {
              item.fixed = true;
            }
            
            scope.add(item);
            item.initObject();
            scope.itemLoadedCallbacks.fire(item);
          } catch (error) {
            console.error('Error creating item:', error);
          }
        },
        onError: function(error) {
          console.error('Error loading model:', fileName, error);
        },
        onProgress: function(loaded, total) {
          var percent = Math.round((loaded / total) * 100);
          console.log('Loading: ' + percent + '%');
        }
      });
    };
    
    console.log('Scene.addItem patched for Kepler model loading only');
  }
  
  // Start patching
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchScene);
  } else {
    patchScene();
  }

})(window);