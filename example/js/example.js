/* example.js — robust for old Blueprint3D + mobile drag */

(function () {
  'use strict';

  /* =========================
   * Utilities
   * ======================= */

  function debounce(fn, ms) {
    var t = null;
    return function () {
      var self = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  /* =========================
   * Render wiring (no assumptions about addEventListener)
   * ======================= */

  function bindRenderHook(three) {
    if (!three) return;
    var c = three.controls;
    if (!c) return;

    // Already bound to this controls instance?
    if (three._renderHookBoundTo === c) return;

    // Unbind from previous controls instance
    if (three._renderHookBoundTo && three._onControlsChange && typeof three._renderHookBoundTo.removeEventListener === 'function') {
      try { three._renderHookBoundTo.removeEventListener('change', three._onControlsChange); } catch (e) {}
    }

    // Try standard pattern first
    if (typeof c.addEventListener === 'function') {
      three._onControlsChange = function () {
        if (three.updateWindowSize) three.updateWindowSize();
        if (three.render) three.render();
      };
      c.addEventListener('change', three._onControlsChange);
      three._renderHookBoundTo = c;
      return;
    }

    // Try emitter-style .on (some custom controls)
    if (typeof c.on === 'function') {
      three._onControlsChange = function () {
        if (three.updateWindowSize) three.updateWindowSize();
        if (three.render) three.render();
      };
      c.on('change', three._onControlsChange);
      three._renderHookBoundTo = c;
      return;
    }

    // Fallback: monkey-patch controls.update to also render
    if (typeof c.update === 'function' && !c._origUpdatePatchedForRender) {
      var orig = c.update.bind(c);
      c.update = function () {
        orig();
        if (three.render) three.render();
      };
      c._origUpdatePatchedForRender = true;
    }
    three._renderHookBoundTo = c;
  }

  /* =========================
   * Viewer loop (only while 3D visible)
   * ======================= */

  function startViewerLoop(three) {
    if (!three || three._viewerLoop) return;
    three._viewerLoop = true;
    (function loop() {
      if (!three._viewerLoop || !$('#viewer').is(':visible')) { three._viewerLoop = false; return; }
      if (three.controls && typeof three.controls.update === 'function') three.controls.update();
      if (typeof three.render === 'function') three.render();
      requestAnimationFrame(loop);
    })();
  }
  function stopViewerLoop(three){ if (three) three._viewerLoop = false; }
  

  function stopViewerLoop(three) {
    if (three) three._viewerLoop = false;
  }

  /* =========================
   * Mobile guards + touch→mouse bridge for item drag
   * ======================= */

  function installMobileGuards(three) {
    if (!three || !three.renderer || !three.renderer.domElement) return;
    var canvas = three.renderer.domElement;

    // Ensure browser doesn’t steal gestures
    try { canvas.style.touchAction = 'none'; } catch (e) {}

    var prevent = function (e) { e.preventDefault(); };
    canvas.addEventListener('gesturestart', prevent, { passive: false });
    canvas.addEventListener('gesturechange', prevent, { passive: false });
    canvas.addEventListener('gestureend', prevent, { passive: false });

    // Orientation / resize: recompute & render
    var onResize = debounce(function () {
      if (!$('#viewer').is(':visible')) return;
      three.updateWindowSize && three.updateWindowSize();
      if (three.controls && typeof three.controls.update === 'function') three.controls.update();
      bindRenderHook(three);
      three.render && three.render();
      startViewerLoop(three);
    }, 120);

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopViewerLoop(three);
      else if ($('#viewer').is(':visible')) onResize();
    });
  }

/* === Mobile item drag support (robust for old libs) === */
function enableMobileItemDrag(blueprint3d) {
  var three = blueprint3d.three;
  if (!three || !three.renderer || !three.renderer.domElement) return;

  var canvas = three.renderer.domElement;

  // Make sure the browser doesn't steal gestures
  try { canvas.style.touchAction = 'none'; } catch (e) {}
  var block = function (e) { e.preventDefault(); };
  canvas.addEventListener('gesturestart', block, { passive: false });
  canvas.addEventListener('gesturechange', block, { passive: false });
  canvas.addEventListener('gestureend', block, { passive: false });

  // Helper: build a legacy MouseEvent (so e.which, pageX/Y are correct)
  function synthMouse(type, touch) {
    var ev = document.createEvent('MouseEvents');
    var view = window;
    var screenX = touch.screenX || 0, screenY = touch.screenY || 0;
    var clientX = touch.clientX, clientY = touch.clientY;
    // ctrlKey, altKey, shiftKey, metaKey, button (0 = left)
    ev.initMouseEvent(
      type, true, true, view, 1,
      screenX, screenY, clientX, clientY,
      false, false, false, false, 0, null
    );
    // some code reads e.buttons; set when possible
    try { ev.buttons = 1; } catch (e) {}
    return ev;
  }

  // Dispatch to both the canvas AND document so listeners in either place see it
  function dispatchMouse(type, touch) {
    var ev = synthMouse(type, touch);
    canvas.dispatchEvent(ev);
    // Clone for document in case handlers are on document/window
    var ev2 = synthMouse(type, touch);
    document.dispatchEvent(ev2);
  }

  var active = false;

  canvas.addEventListener('touchstart', function (e) {
    if (!e.touches || e.touches.length !== 1) return; // ignore pinch
    var t = e.touches[0];
    e.preventDefault();

    // Disable OrbitControls during single-finger gesture so the item gets the drag
    if (three.controls) {
      three.controls.enabled = false;
      if (typeof three.controls.update === 'function') three.controls.update();
    }

    active = true;
    dispatchMouse('mousedown', t);
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    if (!active) return;
    if (!e.touches || e.touches.length !== 1) return;
    var t = e.touches[0];
    e.preventDefault();

    // continuous move
    dispatchMouse('mousemove', t);
    // force render every move in case the lib doesn't hook change events
    three.render && three.render();
  }, { passive: false });

  function endGesture(e) {
    if (!active) return;
    active = false;

    var t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    if (t) dispatchMouse('mouseup', t);

    if (three.controls) {
      three.controls.enabled = true;
      if (typeof three.controls.update === 'function') three.controls.update();
    }
    three.render && three.render();
  }

  canvas.addEventListener('touchend',   function (e) { e.preventDefault(); endGesture(e); }, { passive: false });
  canvas.addEventListener('touchcancel',function (e) { e.preventDefault(); endGesture(e); }, { passive: false });
}

  /* =========================
   * Camera Buttons
   * ======================= */

  var CameraButtons = function (blueprint3d) {
    var three = blueprint3d.three;
    var orbitControls = three.controls;

    var panSpeed = 30;
    var directions = { UP: 1, DOWN: 2, LEFT: 3, RIGHT: 4 };

    function init() {
      $('#zoom-in').click(zoomIn);
      $('#zoom-out').click(zoomOut).dblclick(stop);
      $('#zoom-in').dblclick(stop);

      $('#reset-view').click(function () {
        three.centerCamera && three.centerCamera();
        if (orbitControls && orbitControls.reset) orbitControls.reset();
      });

      $('#move-left').click(function () { pan(directions.LEFT); });
      $('#move-right').click(function () { pan(directions.RIGHT); });
      $('#move-up').click(function () { pan(directions.UP); });
      $('#move-down').click(function () { pan(directions.DOWN); });
      $('#move-left, #move-right, #move-up, #move-down').on('dblclick', stop);
    }

    function stop(e) { e.preventDefault(); e.stopPropagation(); }
    function refreshOrbitRef() { if (!orbitControls) orbitControls = blueprint3d.three.controls; }

    function pan(direction) {
      refreshOrbitRef();
      if (orbitControls && typeof orbitControls.panXY === 'function') {
        if (direction === directions.UP) orbitControls.panXY(0, panSpeed);
        if (direction === directions.DOWN) orbitControls.panXY(0, -panSpeed);
        if (direction === directions.LEFT) orbitControls.panXY(panSpeed, 0);
        if (direction === directions.RIGHT) orbitControls.panXY(-panSpeed, 0);
        if (typeof orbitControls.update === 'function') orbitControls.update();
      }
    }

    function zoomIn(e) {
      e.preventDefault();
      refreshOrbitRef();
      if (orbitControls && typeof orbitControls.dollyIn === 'function') {
        orbitControls.dollyIn(1.1);
        if (typeof orbitControls.update === 'function') orbitControls.update();
      }
    }

    function zoomOut(e) {
      e.preventDefault();
      refreshOrbitRef();
      if (orbitControls && typeof orbitControls.dollyOut === 'function') {
        orbitControls.dollyOut(1.1);
        if (typeof orbitControls.update === 'function') orbitControls.update();
      }
    }

    this.refreshControls = function () { orbitControls = blueprint3d.three.controls; };

    init();
  };

  /* =========================
   * Context Menu
   * ======================= */

  var ContextMenu = function (blueprint3d) {
    var three = blueprint3d.three;
    var selectedItem = null;

    function init() {
      $('#context-menu-delete').click(function () { if (selectedItem) selectedItem.remove(); });

      three.itemSelectedCallbacks.add(itemSelected);
      three.itemUnselectedCallbacks.add(itemUnselected);

      initResize();

      $('#fixed').click(function () {
        var checked = $(this).prop('checked');
        if (selectedItem) selectedItem.setFixed(checked);
      });
    }

    function cmToIn(cm) { return cm / 2.54; }
    function inToCm(inches) { return inches * 2.54; }

    function itemSelected(item) {
      selectedItem = item;
      $('#context-menu-name').text(item.metadata.itemName);
      $('#item-width').val(cmToIn(selectedItem.getWidth()).toFixed(0));
      $('#item-height').val(cmToIn(selectedItem.getHeight()).toFixed(0));
      $('#item-depth').val(cmToIn(selectedItem.getDepth()).toFixed(0));
      $('#context-menu').show();
      $('#fixed').prop('checked', item.fixed);
    }

    function resize() {
      if (!selectedItem) return;
      selectedItem.resize(
        inToCm($('#item-height').val()),
        inToCm($('#item-width').val()),
        inToCm($('#item-depth').val())
      );
    }

    function initResize() {
      $('#item-height').change(resize);
      $('#item-width').change(resize);
      $('#item-depth').change(resize);
    }

    function itemUnselected() {
      selectedItem = null;
      $('#context-menu').hide();
    }

    init();
  };

  /* =========================
   * Loading Modal
   * ======================= */

  var ModalEffects = function (blueprint3d) {
    var itemsLoading = 0;

    function update() {
      itemsLoading > 0 ? $('#loading-modal').show() : $('#loading-modal').hide();
    }

    function init() {
      blueprint3d.model.scene.itemLoadingCallbacks.add(function () { itemsLoading += 1; update(); });
      blueprint3d.model.scene.itemLoadedCallbacks.add(function () { itemsLoading -= 1; update(); });
      update();
    }

    this.setActiveItem = function () {};
    init();
  };

  /* =========================
   * Floorplanner UI
   * ======================= */

  var ViewerFloorplanner = function (blueprint3d) {
    var canvasWrapper = '#floorplanner';

    var move = '#move';
    var remove = '#delete';
    var draw = '#draw';

    var activeStlye = 'btn-primary disabled';

    this.floorplanner = blueprint3d.floorplanner;
    var scope = this;

    function init() {
      $(window).resize(scope.handleWindowResize);
      scope.handleWindowResize();

      scope.floorplanner.modeResetCallbacks.add(function (mode) {
        $(draw).removeClass(activeStlye);
        $(remove).removeClass(activeStlye);
        $(move).removeClass(activeStlye);

        if (mode === BP3D.Floorplanner.floorplannerModes.MOVE) $(move).addClass(activeStlye);
        else if (mode === BP3D.Floorplanner.floorplannerModes.DRAW) $(draw).addClass(activeStlye);
        else if (mode === BP3D.Floorplanner.floorplannerModes.DELETE) $(remove).addClass(activeStlye);

        if (mode === BP3D.Floorplanner.floorplannerModes.DRAW) {
          $('#draw-walls-hint').show();
          scope.handleWindowResize();
        } else {
          $('#draw-walls-hint').hide();
        }
      });

      $(move).click(function () { scope.floorplanner.setMode(BP3D.Floorplanner.floorplannerModes.MOVE); });
      $(draw).click(function () { scope.floorplanner.setMode(BP3D.Floorplanner.floorplannerModes.DRAW); });
      $(remove).click(function () { scope.floorplanner.setMode(BP3D.Floorplanner.floorplannerModes.DELETE); });
    }

    this.updateFloorplanView = function () { scope.floorplanner.reset(); };

    this.handleWindowResize = function () {
      $(canvasWrapper).height(window.innerHeight - $(canvasWrapper).offset().top);
      scope.floorplanner.resizeView();
    };

    init();
  };

  /* =========================
   * Side Menu (tabs)
   * ======================= */

  var SideMenu = function (blueprint3d, floorplanControls) {
    var ACTIVE_CLASS = 'active';
    var tabs = {
      'FLOORPLAN': $('#floorplan_tab'),
      'SHOP': $('#items_tab'),
      'DESIGN': $('#design_tab')
    };

    var scope = this;
    this.stateChangeCallbacks = $.Callbacks();

    this.states = {
      'DEFAULT':   { 'div': $('#viewer'),      'tab': tabs.DESIGN },
      'FLOORPLAN': { 'div': $('#floorplanner'), 'tab': tabs.FLOORPLAN },
      'SHOP':      { 'div': $('#add-items'),    'tab': tabs.SHOP }
    };

    var currentState = this.states.FLOORPLAN;

    function init() {
      for (var key in tabs) tabs[key].click(tabClicked(tabs[key]));
      $('#update-floorplan').click(floorplanUpdate);

      initLeftMenu();

      blueprint3d.three.updateWindowSize && blueprint3d.three.updateWindowSize();
      handleWindowResize();

      initItems();

      setCurrentState(scope.states.DEFAULT);
    }

    function floorplanUpdate() { setCurrentState(scope.states.DEFAULT); }

    function tabClicked(tab) {
      return function () {
        if (blueprint3d.three.controls) blueprint3d.three.controls.autoRotate = false; // don’t kill loop
        for (var key in scope.states) {
          var state = scope.states[key];
          if (state.tab === tab) { setCurrentState(state); break; }
        }
      };
    }

    function setCurrentState(newState) {
      if (currentState === newState) return;

      if (currentState.tab !== newState.tab) {
        if (currentState.tab) currentState.tab.removeClass(ACTIVE_CLASS);
        if (newState.tab) newState.tab.addClass(ACTIVE_CLASS);
      }

      blueprint3d.three.getController().setSelectedObject(null);

      currentState.div.hide();
      newState.div.show();

      if (newState === scope.states.FLOORPLAN) {
        stopViewerLoop(blueprint3d.three);
        floorplanControls.updateFloorplanView();
        floorplanControls.handleWindowResize();
      }

      if (currentState === scope.states.FLOORPLAN) {
        blueprint3d.model.floorplan.update();
      }

      if (newState === scope.states.DEFAULT) {
        setTimeout(function () {
          blueprint3d.three.updateWindowSize && blueprint3d.three.updateWindowSize();

          if (blueprint3d.three.controls) {
            blueprint3d.three.controls.reset && blueprint3d.three.controls.reset();
            blueprint3d.three.controls.enabled = true;

            if (blueprint3d.three.renderer && blueprint3d.three.renderer.domElement) {
              blueprint3d.three.controls.domElement = blueprint3d.three.renderer.domElement;
            }

            if (typeof blueprint3d.three.controls.update === 'function') {
              blueprint3d.three.controls.update();
            }
            bindRenderHook(blueprint3d.three);
          }

          installMobileGuards(blueprint3d.three);

          blueprint3d.three.render && blueprint3d.three.render();
          blueprint3d.three.centerCamera && blueprint3d.three.centerCamera();
          startViewerLoop(blueprint3d.three);
        }, 100);
      } else {
        stopViewerLoop(blueprint3d.three);
      }

      handleWindowResize();
      currentState = newState;
      scope.stateChangeCallbacks.fire(newState);
    }

    function initLeftMenu() {
      $(window).resize(handleWindowResize);
      handleWindowResize();
    }

    function handleWindowResize() {
      $('.sidebar').height(window.innerHeight);
      $('#add-items').height(window.innerHeight);

      if (currentState === scope.states.DEFAULT) {
        setTimeout(function () {
          blueprint3d.three.updateWindowSize && blueprint3d.three.updateWindowSize();
          if (blueprint3d.three.controls && typeof blueprint3d.three.controls.update === 'function') {
            blueprint3d.three.controls.update();
            bindRenderHook(blueprint3d.three);
          }
        }, 50);
      }
    }

    function initItems() {
      // Static items
      $('#add-items').find('.add-item').on('mousedown touchstart', function () {
        var modelUrl = $(this).attr('model-url');
        var itemType = parseInt($(this).attr('model-type'), 10);
        var thumbnailUrl = $(this).attr('model-image') || $(this).find('img').attr('src');
        var metadata = {
          itemName: $(this).attr('model-name'),
          resizable: true,
          modelUrl: modelUrl,
          itemType: itemType,
          thumbnailUrl: thumbnailUrl
        };
        blueprint3d.model.scene.addItem(itemType, modelUrl, metadata);
        setCurrentState(scope.states.DEFAULT);
      });

      // Dynamic items
      $('#add-items').on('mousedown touchstart', '.add-item', function () {
        if ($(this).data('static-bound')) return;
        var modelUrl = $(this).attr('model-url');
        var itemType = parseInt($(this).attr('model-type'), 10);
        var thumbnailUrl = $(this).attr('model-image') || $(this).find('img').attr('src');
        var metadata = {
          itemName: $(this).attr('model-name'),
          resizable: true,
          modelUrl: modelUrl,
          itemType: itemType,
          thumbnailUrl: thumbnailUrl
        };
        blueprint3d.model.scene.addItem(itemType, modelUrl, metadata);
        setCurrentState(scope.states.DEFAULT);
      });
    }

    init();
  };

  /* =========================
   * Texture Selector
   * ======================= */

  var TextureSelector = function (blueprint3d, sideMenu) {
    var three = blueprint3d.three;
    var currentTarget = null;

    function initTextureSelectors() {
      $('.texture-select-thumbnail').click(function (e) {
        e.preventDefault();
        if (!currentTarget) return;

        var textureUrl = $(this).attr('texture-url');
        var textureStretch = ($(this).attr('texture-stretch') === 'true');
        var textureScale = parseInt($(this).attr('texture-scale'), 10);
        currentTarget.setTexture(textureUrl, textureStretch, textureScale);
      });
    }

    function init() {
      three.wallClicked.add(wallClicked);
      three.floorClicked.add(floorClicked);
      three.itemSelectedCallbacks.add(reset);
      three.nothingClicked.add(reset);
      sideMenu.stateChangeCallbacks.add(reset);
      initTextureSelectors();
    }

    function wallClicked(halfEdge) {
      currentTarget = halfEdge;
      $('#floorTexturesDiv').hide();
      $('#wallTextures').show();
    }

    function floorClicked(room) {
      currentTarget = room;
      $('#wallTextures').hide();
      $('#floorTexturesDiv').show();
    }

    function reset() {
      $('#wallTextures').hide();
      $('#floorTexturesDiv').hide();
    }

    init();
  };

  /* =========================
   * Main controls (new/load/save)
   * ======================= */

  function mainControls(blueprint3d) {
    function newDesign() {
      blueprint3d.model.loadSerialized('{"floorplan":{"corners":{"f90da5e3-9e0e-eba7-173d-eb0b071e838e":{"x":204.85099999999989,"y":289.052},"da026c08-d76a-a944-8e7b-096b752da9ed":{"x":672.2109999999999,"y":289.052},"4e3d65cb-54c0-0681-28bf-bddcc7bdb571":{"x":672.2109999999999,"y":-178.308},"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2":{"x":204.85099999999989,"y":-178.308}},"walls":[{"corner1":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","corner2":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","corner2":"da026c08-d76a-a944-8e7b-096b752da9ed","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"da026c08-d76a-a944-8e7b-096b752da9ed","corner2":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","corner2":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}}],"wallTextures":[],"floorTextures":{},"newFloorTextures":{}},"items":[]}');
    }

    function loadDesign() {
      var files = $('#loadFile').get(0).files;
      if (!files || !files[0]) return;
      var reader = new FileReader();
      reader.onload = function (event) {
        blueprint3d.model.loadSerialized(event.target.result);
      };
      reader.readAsText(files[0]);
    }

    function saveDesign() {
      var data = blueprint3d.model.exportSerialized();
      var a = window.document.createElement('a');
      var blob = new Blob([data], { type: 'text/plain' });
      a.href = window.URL.createObjectURL(blob);
      a.download = 'design.blueprint3d';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    function init() {
      $('#new').click(newDesign);
      $('#loadFile').change(loadDesign);
      $('#saveFile').click(saveDesign);
    }

    init();
  }

  /* =========================
   * Boot
   * ======================= */

  $(document).ready(function () {
    var opts = {
      floorplannerElement: 'floorplanner-canvas',
      threeElement: '#viewer',
      threeCanvasElement: 'three-canvas',
      textureDir: 'models/textures/',
      widget: false
    };

    var blueprint3d = new BP3D.Blueprint3d(opts);

    var modalEffects = new ModalEffects(blueprint3d);
    var viewerFloorplanner = new ViewerFloorplanner(blueprint3d);
    var contextMenu = new ContextMenu(blueprint3d);
    var sideMenu = new SideMenu(blueprint3d, viewerFloorplanner);
    var textureSelector = new TextureSelector(blueprint3d, sideMenu);
    var cameraButtons = new CameraButtons(blueprint3d);
    mainControls(blueprint3d);

    // IMPORTANT: mobile drag + guards + robust render hook + loop
    installMobileGuards(blueprint3d.three);
    enableMobileItemDrag(blueprint3d);
    bindRenderHook(blueprint3d.three);
    startViewerLoop(blueprint3d.three); // if not already running
    // Keep camera buttons in sync if controls objects are recreated
    sideMenu.stateChangeCallbacks.add(function (state) {
      if (state === sideMenu.states.DEFAULT) cameraButtons.refreshControls();
    });

    // Initial scene
    blueprint3d.model.loadSerialized('{"floorplan":{"corners":{"f90da5e3-9e0e-eba7-173d-eb0b071e838e":{"x":204.85099999999989,"y":289.052},"da026c08-d76a-a944-8e7b-096b752da9ed":{"x":672.2109999999999,"y":289.052},"4e3d65cb-54c0-0681-28bf-bddcc7bdb571":{"x":672.2109999999999,"y":-178.308},"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2":{"x":204.85099999999989,"y":-178.308}},"walls":[{"corner1":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","corner2":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","corner2":"da026c08-d76a-a944-8e7b-096b752da9ed","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"da026c08-d76a-a944-8e7b-096b752da9ed","corner2":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","corner2":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}}],"wallTextures":[],"floorTextures":{},"newFloorTextures":{}},"items":[]}');
  });

})();

/* ==== MobileItemControls: on-screen arrows to move/rotate selected item ==== */
function MobileItemControls(blueprint3d){
  var three = blueprint3d.three;
  var $wrap = $('#mobile-item-controls');
  var $stepBtn = $('#mic-step');
  var moveStepCm = 5;                // default step (cm)
  var rotateStepDegDefault = 5;      // default rotation step (deg)
  var holdIntervalMs = 85;           // repeat while holding
  var activeItem = null;
  var holdTimer = null;
  var isMobile = window.matchMedia('(max-width: 768px)').matches;

  // show only on mobile & only when an item is selected
  function updateVisibility(){
    if (isMobile && activeItem && !activeItem.fixed) {
      $wrap.attr('aria-hidden', 'false').show();
    } else {
      $wrap.attr('aria-hidden', 'true').hide();
    }
  }

  // selection hooks from Blueprint3D
  if (three.itemSelectedCallbacks && three.itemSelectedCallbacks.add){
    three.itemSelectedCallbacks.add(function(item){
      activeItem = item || null;
      updateVisibility();
    });
  }
  if (three.itemUnselectedCallbacks && three.itemUnselectedCallbacks.add){
    three.itemUnselectedCallbacks.add(function(){
      activeItem = null;
      updateVisibility();
    });
  }

  // utils to move/rotate with broad compatibility for this old lib
  function nudgeItem(dx_cm, dz_cm){
    if (!activeItem) return;

    // Prefer official methods if they exist
    if (typeof activeItem.move === 'function') {
      activeItem.move(dx_cm, dz_cm);
    } else if (typeof activeItem.setPosition === 'function' && activeItem.position) {
      // fallback: setPosition(x, z) is used by some builds
      activeItem.setPosition(activeItem.position.x + dx_cm, activeItem.position.z + dz_cm);
    } else if (activeItem.position) {
      // raw Object3D position (assuming X/Z are cm in this build)
      activeItem.position.x += dx_cm;
      activeItem.position.z += dz_cm;
      // notify scene if there is a hook
      if (blueprint3d.model && blueprint3d.model.scene && typeof blueprint3d.model.scene.needsUpdate === 'function'){
        blueprint3d.model.scene.needsUpdate();
      }
    }

    // Render
    if (three.controls && typeof three.controls.update === 'function') three.controls.update();
    three.render && three.render();
  }

  function rotateItem(deg){
    if (!activeItem) return;
    var rad = deg * Math.PI / 180;

    if (typeof activeItem.rotateY === 'function') {
      activeItem.rotateY(rad);
    } else if (typeof activeItem.rotate === 'function') {
      // some items expose rotate(x,y,z)
      activeItem.rotate(0, rad, 0);
    } else if (activeItem.rotation && typeof activeItem.rotation.y === 'number') {
      activeItem.rotation.y += rad;
    }

    if (three.controls && typeof three.controls.update === 'function') three.controls.update();
    three.render && three.render();
  }

  // helpers for press-and-hold on buttons
  function startHold(fn){
    stopHold();
    fn(); // immediate first step
    holdTimer = setInterval(fn, holdIntervalMs);
    // disable camera while holding a control
    if (three.controls) three.controls.enabled = false;
  }
  function stopHold(){
    if (holdTimer){ clearInterval(holdTimer); holdTimer = null; }
    if (three.controls) {
      three.controls.enabled = true;
      if (typeof three.controls.update === 'function') three.controls.update();
    }
  }

  // Hook move buttons
  $wrap.on('touchstart mousedown', '.mic-move', function(e){
    if (!activeItem) return;
    e.preventDefault();
    var dxUnit = parseFloat(this.getAttribute('data-dx')) || 0;
    var dzUnit = parseFloat(this.getAttribute('data-dz')) || 0;
    var step = moveStepCm; // cm per tap
    startHold(function(){ nudgeItem(dxUnit * step, dzUnit * step); });
  });
  $(document).on('touchend touchcancel mouseup', function(){ stopHold(); });

  // Hook rotate buttons
  $wrap.on('touchstart mousedown', '.mic-rot', function(e){
    if (!activeItem) return;
    e.preventDefault();
    var deg = parseFloat(this.getAttribute('data-deg')) || rotateStepDegDefault;
    startHold(function(){ rotateItem(deg); });
  });

  // Step toggle button: 5 ↔ 1 ↔ 10 cm
  $stepBtn.on('click touchend', function(e){
    e.preventDefault();
    moveStepCm = (moveStepCm === 5) ? 1 : (moveStepCm === 1 ? 10 : 5);
    $stepBtn.text(moveStepCm + 'cm');
  });

  // Keep visible state correct when resizing/orientation changes
  var mq = window.matchMedia('(max-width: 768px)');
  function onMediaChange(){ isMobile = mq.matches; updateVisibility(); }
  if (mq.addEventListener) mq.addEventListener('change', onMediaChange);
  else if (mq.addListener) mq.addListener(onMediaChange); // older browsers

  // Safety: hide if user switches away from 3D
  $(document).on('visibilitychange', function(){
    if (document.hidden) stopHold();
  });

  // initial
  updateVisibility();
}
