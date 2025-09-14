/* Make Blueprint3D use ModelLoader for *all* items */
(function(){
  'use strict';
  function patchWhenReady(){
    if (!window.BP3D || !BP3D.Model || !BP3D.Model.Scene || !window.ModelLoader) {
      return setTimeout(patchWhenReady, 80);
    }
    var OrigAdd = BP3D.Model.Scene.prototype.addItem;
    BP3D.Model.Scene.prototype.addItem = function(itemType, fileName, metadata, position, rotation, scale, fixed){
      var scope=this; 
      itemType=itemType||1;
      
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
          
          var mats = mesh.material;
          var geometry = mesh.geometry;
          if (!mats) mats = new THREE.MeshLambertMaterial({color:0x8888ff, side:THREE.DoubleSide});
          if (Array.isArray(mats)) { 
            for (var i=0;i<mats.length;i++) mats[i].side = THREE.DoubleSide; 
          } else { 
            mats.side = THREE.DoubleSide; 
          }

          var ItemKlass = BP3D.Items.Factory.getClass(itemType);
          var item = new ItemKlass(scope.model, metadata||{}, geometry, mats, position, rotation, scale);
          if (fixed) item.fixed = true;
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
    console.log('[scene-patch] Blueprint3D Scene.addItem is now using ModelLoader');
  }
  patchWhenReady();
})();