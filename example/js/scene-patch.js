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
          if (objOrMesh && !objOrMesh.isMesh) {
            var found=null;
            objOrMesh.traverse && objOrMesh.traverse(function(c){ if(!found && c.isMesh) found=c; });
            mesh = found || objOrMesh;
          }
          if (!mesh || !mesh.geometry) throw new Error('No geometry from loader');
          
          var materials = mesh.material;
          var geometry = mesh.geometry;
          
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
          scope.items.push(item);
          scope.add(item);
          item.initObject();
          
          // Fire success callback
          if (scope.itemLoadedCallbacks) {
            scope.itemLoadedCallbacks.fire(item);
          }
        } catch (e){
          console.error('Model add failed:', e);
          // Fire error callback
          if (scope.itemLoadedCallbacks) {
            scope.itemLoadedCallbacks.fire(null);
          }
        }
      }).catch(function(err){
        console.error('Load error:', fileName, err);
        // Fire error callback
        if (scope.itemLoadedCallbacks) {
          scope.itemLoadedCallbacks.fire(null);
        }
      });
    };
    console.log('[scene-patch] Blueprint3D Scene.addItem patched to use ModelLoader for Kepler models only');
  }
  patchWhenReady();
})();