/// <reference path="../../lib/jQuery.d.ts" />
/// <reference path="../../lib/three.d.ts" />
/// <reference path="controller.ts" />
/// <reference path="floorPlan.ts" />
/// <reference path="lights.ts" />
/// <reference path="skybox.ts" />
/// <reference path="controls.ts" />
/// <reference path="hud.ts" />

module BP3D.Three {
  export var Main = function (model, element, canvasElement, opts) {
    var scope = this;

    var options = {
      resize: true,
      pushHref: false,
      spin: true,
      spinSpeed: .00002,
      clickPan: true,
      canMoveFixedItems: false
    }

    // override with manually set options
    for (var opt in options) {
      if (options.hasOwnProperty(opt) && opts.hasOwnProperty(opt)) {
        options[opt] = opts[opt]
      }
    }

    var scene = model.scene;

    var model = model;
    this.element = $(element);
    var domElement;

    var camera;
    var renderer;
    this.controls;
    var canvas;
    var controller;
    var floorplan;

    //var canvas;
    //var canvasElement = canvasElement;

    var needsUpdate = false;

    var lastRender = Date.now();
    var mouseOver = false;
    var hasClicked = false;

    var hud;

    this.heightMargin;
    this.widthMargin;
    this.elementHeight;
    this.elementWidth;

    this.itemSelectedCallbacks = $.Callbacks(); // item
    this.itemUnselectedCallbacks = $.Callbacks();

    this.wallClicked = $.Callbacks(); // wall
    this.floorClicked = $.Callbacks(); // floor
    this.nothingClicked = $.Callbacks();

    function init() {
      THREE.ImageUtils.crossOrigin = "";

      domElement = scope.element.get(0) // Container
      camera = new THREE.PerspectiveCamera(45, 1, 1, 10000);

      // Try to create WebGL renderer with error handling
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true // required to support .toDataURL()
        });
        renderer.autoClear = false,
          renderer.shadowMapEnabled = true;
        renderer.shadowMapSoft = true;
        renderer.shadowMapType = THREE.PCFSoftShadowMap;
      } catch (error) {
        console.error('Failed to create WebGL renderer:', error);
        console.error('WebGL may not be available in your browser or environment.');

        // Create a null object to prevent further errors
        renderer = null;

        // Show error message
        var errorDiv = document.createElement('div');
        errorDiv.innerHTML = '<div style="padding: 20px; background: #ffcccc; border: 1px solid #ff0000; margin: 10px; color: #cc0000;">' +
          '<h3>WebGL Error</h3>' +
          '<p>Your browser or environment does not support WebGL, which is required for 3D rendering.</p>' +
          '<p>Please try using a different browser or enable WebGL support.</p>' +
          '</div>';
        domElement.appendChild(errorDiv);
        return;
      }

      var skybox = new Three.Skybox(scene);

      scope.controls = new Three.Controls(camera, domElement);

      hud = new Three.HUD(scope);

      controller = new Three.Controller(
        scope, model, camera, scope.element, scope.controls, hud);

      if (renderer && renderer.domElement) {
        domElement.appendChild(renderer.domElement);
      }

      // handle window resizing
      scope.updateWindowSize();
      if (options.resize) {
        $(window).resize(scope.updateWindowSize);
      }

      // setup camera nicely
      scope.centerCamera();
      model.floorplan.fireOnUpdatedRooms(scope.centerCamera);

      var lights = new Three.Lights(scene, model.floorplan);

      floorplan = new Three.Floorplan(scene,
        model.floorplan, scope.controls);

      animate();

      scope.element.mouseenter(function () {
        mouseOver = true;
      }).mouseleave(function () {
        mouseOver = false;
      }).click(function () {
        hasClicked = true;
      });

      //canvas = new ThreeCanvas(canvasElement, scope);
    }

    function spin() {
      if (options.spin && !mouseOver && !hasClicked) {
        var theta = 2 * Math.PI * options.spinSpeed * (Date.now() - lastRender);
        scope.controls.rotateLeft(theta);
        scope.controls.update()
      }
    }

    this.dataUrl = function () {
      if (renderer && renderer.domElement) {
        var dataUrl = renderer.domElement.toDataURL("image/png");
        return dataUrl;
      } else {
        console.warn('Renderer not available for dataUrl export');
        return null;
      }
    }

    this.stopSpin = function () {
      hasClicked = true;
    }

    this.options = function () {
      return options;
    }

    this.getModel = function () {
      return model;
    }

    this.getScene = function () {
      return scene;
    }

    this.getController = function () {
      return controller;
    }

    this.getCamera = function () {
      return camera;
    }

    this.needsUpdate = function () {
      needsUpdate = true;
    }

    this.cleanupScene = function() {
      console.log('Running scene cleanup...');
      var mainScene = scene.getScene();
      if (!mainScene || !mainScene.children) return;

      var objectsToRemove = [];
      var totalObjects = mainScene.children.length;

      mainScene.children.forEach((child, index) => {
        if (!child) {
          objectsToRemove.push(child);
          return;
        }

        // Check for objects with problematic geometry
        if (child.geometry) {
          var geom = child.geometry;

          // Check for missing critical properties
          if (!geom.vertices && !geom.attributes) {
            console.warn(`Object ${index} has geometry with no vertices or attributes`);
            objectsToRemove.push(child);
            return;
          }

          // Check for Three.js v0.69 specific issues
          if (geom.vertices) {
            // Empty vertices with faces
            if (geom.vertices.length === 0 && geom.faces && geom.faces.length > 0) {
              console.warn(`Object ${index} has faces but no vertices`);
              objectsToRemove.push(child);
              return;
            }

            // Vertices with no faces
            if (geom.vertices.length > 0 && (!geom.faces || geom.faces.length === 0)) {
              console.warn(`Object ${index} has vertices but no faces`);
              // Try to fix by computing geometry
              try {
                geom.computeFaceNormals();
                geom.computeVertexNormals();
                geom.computeBoundingBox();
                geom.verticesNeedUpdate = true;
              } catch (fixError) {
                console.warn(`Failed to fix object ${index}, removing`);
                objectsToRemove.push(child);
                return;
              }
            }
          }
        }

        // Check for problematic materials
        if (child.material) {
          var mat = child.material;

          // Check MeshFaceMaterial
          if (mat.materials && Array.isArray(mat.materials)) {
            var hasNullMaterial = mat.materials.some(m => !m);
            if (hasNullMaterial) {
              console.warn(`Object ${index} has null materials in MeshFaceMaterial`);
              objectsToRemove.push(child);
              return;
            }
          }
        }
      });

      // Remove problematic objects
      if (objectsToRemove.length > 0) {
        console.log(`Removing ${objectsToRemove.length} problematic objects out of ${totalObjects}`);
        objectsToRemove.forEach(obj => {
          if (obj) {
            mainScene.remove(obj);
            problematicObjectsRemoved.push(obj.uuid);
          }
        });
      } else {
        console.log(`All ${totalObjects} objects passed cleanup validation`);
      }
    }

    this.resetRenderErrors = function() {
      console.log('Resetting render error count and restarting animation');
      renderErrorCount = 0;
      problematicObjectsRemoved = [];
      needsUpdate = true;

      // Restart animation loop if it was stopped
      animate();
    }

    this.getRenderErrorCount = function() {
      return renderErrorCount;
    }
    function shouldRender() {
      // Do we need to draw a new frame
      if (scope.controls.needsUpdate || controller.needsUpdate || needsUpdate || model.scene.needsUpdate) {
        scope.controls.needsUpdate = false;
        controller.needsUpdate = false;
        needsUpdate = false;
        model.scene.needsUpdate = false;
        return true;
      } else {
        return false;
      }
    }

    var renderErrorCount = 0;
    var maxRenderErrors = 5;
    var problematicObjectsRemoved = [];

    function isolateProblematicObject(mainScene) {
      if (!mainScene || !mainScene.children || mainScene.children.length === 0) {
        return false;
      }

      console.log(`Testing ${mainScene.children.length} objects individually...`);

      // Create a temporary scene for testing individual objects
      var testScene = new THREE.Scene();

      for (var i = 0; i < mainScene.children.length; i++) {
        var testObject = mainScene.children[i];
        if (!testObject) continue;

        // Skip already identified problematic objects
        if (problematicObjectsRemoved.indexOf(testObject.uuid) !== -1) continue;

        console.log(`Testing object ${i}: ${testObject.type || 'Unknown'}, uuid: ${testObject.uuid}`);

        // Add only this object to test scene
        testScene.add(testObject);

        try {
          // Try to render just this object
          renderer.render(testScene, camera);
          console.log(`Object ${i} rendered successfully`);
        } catch (objectError) {
          console.error(`Object ${i} failed to render:`, objectError);
          console.log('Problematic object details:', {
            type: testObject.type,
            uuid: testObject.uuid,
            geometry: testObject.geometry ? {
              type: testObject.geometry.type,
              vertices: testObject.geometry.vertices ? testObject.geometry.vertices.length : 'none',
              faces: testObject.geometry.faces ? testObject.geometry.faces.length : 'none'
            } : 'none',
            material: testObject.material ? testObject.material.type : 'none'
          });

          // Remove the problematic object from the main scene
          mainScene.remove(testObject);
          problematicObjectsRemoved.push(testObject.uuid);
          console.log(`Removed problematic object ${i} from scene`);

          // Remove from test scene
          testScene.remove(testObject);
          return true; // Found and removed a problematic object
        }

        // Remove from test scene for next iteration
        testScene.remove(testObject);
      }

      return false; // No problematic objects found
    }

    function render() {
      spin();
      if (shouldRender() && renderer) {
        try {
          renderer.clear();

          // Try to render main scene
          try {
            var mainScene = scene.getScene();
            renderer.render(mainScene, camera);

            // Reset error count on successful render
            if (renderErrorCount > 0) {
              console.log('Rendering successful, resetting error count');
              renderErrorCount = 0;
            }

          } catch (sceneError) {
            renderErrorCount++;
            console.error(`Error rendering main scene (${renderErrorCount}/${maxRenderErrors}):`, sceneError);

            if (renderErrorCount >= maxRenderErrors) {
              console.error('Too many render errors, stopping animation loop');
              return;
            }

            // Try to isolate the problematic object
            var mainScene = scene.getScene();
            if (isolateProblematicObject(mainScene)) {
              console.log('Problematic object removed, attempting to continue rendering...');
              // Reset error count since we fixed something
              renderErrorCount = Math.max(0, renderErrorCount - 2);
            }
          }

          if (renderer.clearDepth) {
            renderer.clearDepth();
          }

          // Try to render HUD scene
          try {
            var hudScene = hud.getScene();
            renderer.render(hudScene, camera);
          } catch (hudError) {
            console.error('Error rendering HUD scene:', hudError);
            // Clear HUD scene if it's problematic
            if (hudScene && hudScene.children) {
              console.log('Clearing HUD scene due to render error');
              while (hudScene.children.length > 0) {
                hudScene.remove(hudScene.children[0]);
              }
            }
          }

        } catch (error) {
          renderErrorCount++;
          console.error(`General rendering error (${renderErrorCount}/${maxRenderErrors}):`, error);

          if (renderErrorCount >= maxRenderErrors) {
            console.error('Too many render errors, stopping animation loop');
            return;
          }
        }
      }
      lastRender = Date.now();
    };

    function animate() {
      var delay = 50;
      setTimeout(function () {
        requestAnimationFrame(animate);
      }, delay);
      render();
    };

    this.rotatePressed = function () {
      controller.rotatePressed();
    }

    this.rotateReleased = function () {
      controller.rotateReleased();
    }

    this.setCursorStyle = function (cursorStyle) {
      domElement.style.cursor = cursorStyle;
    };

    this.updateWindowSize = function () {
      scope.heightMargin = scope.element.offset().top;
      scope.widthMargin = scope.element.offset().left;

      scope.elementWidth = scope.element.innerWidth();
      if (options.resize) {
        scope.elementHeight = window.innerHeight - scope.heightMargin;
      } else {
        scope.elementHeight = scope.element.innerHeight();
      }

      camera.aspect = scope.elementWidth / scope.elementHeight;
      camera.updateProjectionMatrix();

      if (renderer) {
        renderer.setSize(scope.elementWidth, scope.elementHeight);
      }
      needsUpdate = true;
    }

    this.centerCamera = function () {
      var yOffset = 150.0;

      var pan = model.floorplan.getCenter();
      pan.y = yOffset;

      scope.controls.target = pan;

      var distance = model.floorplan.getSize().z * 1.5;

      var offset = pan.clone().add(
        new THREE.Vector3(0, distance, distance));
      //scope.controls.setOffset(offset);
      camera.position.copy(offset);

      scope.controls.update();
    }

    // projects the object's center point into x,y screen coords
    // x,y are relative to top left corner of viewer
    this.projectVector = function (vec3, ignoreMargin) {
      ignoreMargin = ignoreMargin || false;

      var widthHalf = scope.elementWidth / 2;
      var heightHalf = scope.elementHeight / 2;

      var vector = new THREE.Vector3();
      vector.copy(vec3);
      vector.project(camera);

      var vec2 = new THREE.Vector2();

      vec2.x = (vector.x * widthHalf) + widthHalf;
      vec2.y = - (vector.y * heightHalf) + heightHalf;

      if (!ignoreMargin) {
        vec2.x += scope.widthMargin;
        vec2.y += scope.heightMargin;
      }

      return vec2;
    }

    init();
  }
}