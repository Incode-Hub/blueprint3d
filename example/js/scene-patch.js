/* Make Blueprint3D use ModelLoader only for Kepler models, preserve original for others */
(function(){
  'use strict';
  function patchWhenReady(){
    if (!window.BP3D || !BP3D.Model || !BP3D.Model.Scene || !window.ModelLoader) {
      return setTimeout(patchWhenReady, 80);
    }
    var OrigAddItem = BP3D.Model.Scene.prototype.addItem;
    BP3D.Model.Scene.prototype.addItem = function(itemType, fileName, metadata, position, rotation, scale, fixed){
      var scope=this; 
      itemType=itemType||1;
      
      // Only use our loader for Kepler models, let original handle legacy models
      var isKeplerModel = fileName && fileName.indexOf('Kepler') !== -1;
      
      if (!isKeplerModel) {
        // Use original method for legacy models
        return OrigAddItem.call(this, itemType, fileName, metadata, position, rotation, scale, fixed);
      }
      
      console.log('Loading Kepler model with universal loader:', fileName);
      
      // Fire loading callback
      if (scope.itemLoadingCallbacks) {
        scope.itemLoadingCallbacks.fire();
      }
      
      ModelLoader.loadAnyModel(fileName, {
        onProgress: function(l,t){ /* hook for progress UI if wanted */ }
      }).then(function(objOrMesh){
        try{
          var mesh = objOrMesh;
          var materials = null;
          var geometry = null;

          // Handle GLTF scene objects vs direct mesh objects
          if (objOrMesh && !objOrMesh.isMesh) {
            // For GLTF scene objects, find the first mesh and extract its properties
            var found = null;
            objOrMesh.traverse && objOrMesh.traverse(function(c){
              if (!found && c.isMesh && c.geometry) {
                found = c;
              }
            });
            mesh = found;
          }

          // Extract geometry and materials
          if (mesh && mesh.geometry) {
            geometry = mesh.geometry;
            materials = mesh.material;
          } else {
            // For complex GLTF objects without simple geometry, create a wrapper
            console.log('Creating wrapper geometry for complex GLTF object');

            // Calculate bounding box of the entire GLTF object
            var bbox = new THREE.Box3();
            bbox.setFromObject(objOrMesh);

            var size = new THREE.Vector3();
            size.subVectors(bbox.max, bbox.min);
            if (size.x === 0 && size.y === 0 && size.z === 0) {
              // Fallback if no geometry found
              size.set(1, 1, 1);
            }

            geometry = new THREE.BoxGeometry(size.x || 1, size.y || 1, size.z || 1);
            materials = new THREE.MeshLambertMaterial({
              color: 0x8888ff,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.1  // Make it nearly invisible since it's just a wrapper
            });
          }

          if (!geometry) throw new Error('No geometry available');
          
          // Ensure we have materials array for MeshFaceMaterial
          if (!materials) {
            materials = [new THREE.MeshLambertMaterial({color:0x8888ff, side:THREE.DoubleSide})];
          } else if (!Array.isArray(materials)) {
            materials = [materials];
          }
          
          // Make materials double-sided
          for (var i=0;i<materials.length;i++) {
            materials[i].side = THREE.DoubleSide;
          }

          // Use MeshFaceMaterial like the original Blueprint3D (Three.js r69)
          var finalMaterial = new THREE.MeshFaceMaterial(materials);
          
          var ItemKlass = BP3D.Items.Factory.getClass(itemType);
          var item = new ItemKlass(scope.model, metadata||{}, geometry, finalMaterial, position, rotation, scale);
          if (fixed) item.fixed = true;

          // If we created a wrapper geometry, add the original GLTF object as a child
          if (materials && materials.opacity === 0.1) {
            // This indicates we created a wrapper, so add the original GLTF object
            if (objOrMesh && objOrMesh !== mesh) {
              // Reset the GLTF object position since it's now a child
              objOrMesh.position.set(0, 0, 0);
              objOrMesh.rotation.set(0, 0, 0);
              objOrMesh.scale.set(1, 1, 1);
              item.add(objOrMesh);
            }
          }

          scope.items.push(item);
          scope.add(item);
          item.initObject();
          
          // Fire success callback
          if (scope.itemLoadedCallbacks) {
            scope.itemLoadedCallbacks.fire(item);
          }
        } catch (e){
          console.error('Model add failed:', e);
          // Don't fire callback with null - just log the error
        }
      }).catch(function(err){
        console.error('Load error:', fileName, err);
        // Don't fire callback with null - just log the error
      });
    };
    console.log('[scene-patch] Blueprint3D Scene.addItem patched to use ModelLoader for Kepler models only');
  }
  patchWhenReady();
})();