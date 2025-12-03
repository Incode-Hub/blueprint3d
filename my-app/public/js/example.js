/* example.js — mobile drag + on-screen arrows + robust render + responsive sidebar */
(function () {
  'use strict';
  function debounce(fn, ms) {
    var t=null; return function(){ var self=this,args=arguments; clearTimeout(t); t=setTimeout(function(){ fn.apply(self,args); }, ms); };
  }
  function bindRenderHook(three) {
    if (!three || !three.controls) return;
    var c = three.controls;
    if (three._renderHookBoundTo === c) return;
    if (typeof c.addEventListener === 'function') {
      three._onControlsChange = function(){ three.updateWindowSize && three.updateWindowSize(); three.render && three.render(); };
      c.addEventListener('change', three._onControlsChange);
      three._renderHookBoundTo = c; return;
    }
    if (typeof c.on === 'function') {
      three._onControlsChange = function(){ three.updateWindowSize && three.updateWindowSize(); three.render && three.render(); };
      c.on('change', three._onControlsChange);
      three._renderHookBoundTo = c; return;
    }
    if (typeof c.update === 'function' && !c._origUpdatePatchedForRender) {
      var orig=c.update.bind(c);
      c.update=function(){ orig(); three.render && three.render(); };
      c._origUpdatePatchedForRender=true;
    }
    three._renderHookBoundTo = c;
  }
  function startViewerLoop(three){
    if (!three || three._viewerLoop) return;
    three._viewerLoop = true;
    (function loop(){
      if (!three._viewerLoop || !$('#viewer').is(':visible')) { three._viewerLoop=false; return; }
      if (three.controls && typeof three.controls.update==='function') three.controls.update();
      if (typeof three.render==='function') three.render();
      requestAnimationFrame(loop);
    })();
  }
  function stopViewerLoop(three){ if (three) three._viewerLoop=false; }
  function installMobileGuards(three){
    if (!three || !three.renderer || !three.renderer.domElement) return;
    var canvas=three.renderer.domElement;
    try{ canvas.style.touchAction='none'; }catch(e){}
    var prevent=function(e){ e.preventDefault(); };
    canvas.addEventListener('gesturestart', prevent, {passive:false});
    canvas.addEventListener('gesturechange', prevent, {passive:false});
    canvas.addEventListener('gestureend', prevent, {passive:false});
    var onResize=debounce(function(){
      if (!$('#viewer').is(':visible')) return;
      three.updateWindowSize && three.updateWindowSize();
      if (three.controls && typeof three.controls.update==='function') three.controls.update();
      bindRenderHook(three);
      three.render && three.render();
      startViewerLoop(three);
    },120);
    window.addEventListener('resize', onResize, {passive:true});
    window.addEventListener('orientationchange', onResize, {passive:true});
    document.addEventListener('visibilitychange', function(){
      if (document.hidden) stopViewerLoop(three);
      else if ($('#viewer').is(':visible')) onResize();
    });
  }

  /* ---------- Floorplanner: Touch bridge + bolder lines ---------- */
  function enableFloorplannerTouch(canvasEl){
    var canvas = (typeof canvasEl === 'string') ? document.getElementById(canvasEl) : canvasEl;
    if (!canvas) return;
    try{ canvas.style.touchAction='none'; }catch(e){}
    var active=false;

    function synthMouse(type, touch){
      var ev=document.createEvent('MouseEvents');
      ev.initMouseEvent(type, true, true, window, 1,
        touch.screenX||0, touch.screenY||0, touch.clientX, touch.clientY,
        false,false,false,false, 0, null);
      try{ ev.buttons=1; }catch(e){}
      return ev;
    }
    function dispatch(type, touch){
      var e1=synthMouse(type,touch); canvas.dispatchEvent(e1);
      var e2=synthMouse(type,touch); document.dispatchEvent(e2);
    }

    canvas.addEventListener('touchstart', function(e){
      if (e.touches && e.touches.length===1){
        active=true;
        e.preventDefault();
        dispatch('mousedown', e.touches[0]);
      }
    }, {passive:false});

    canvas.addEventListener('touchmove', function(e){
      if (!active) return;
      if (e.touches && e.touches.length===1){
        e.preventDefault();
        dispatch('mousemove', e.touches[0]);
      }
    }, {passive:false});

    function end(e){
      if (!active) return;
      active=false;
      var t=(e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
      if (t) dispatch('mouseup', t);
    }
    canvas.addEventListener('touchend', function(e){ e.preventDefault(); end(e); }, {passive:false});
    canvas.addEventListener('touchcancel', function(e){ e.preventDefault(); end(e); }, {passive:false});
  }

  function boldenFloorplannerLines(canvasEl, factor){
    var canvas = (typeof canvasEl === 'string') ? document.getElementById(canvasEl) : canvasEl;
    if (!canvas) return;
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx || ctx._lineBoldPatched) return;
    var mult = Math.max(1, factor || 1.8);
    var origStroke = ctx.stroke.bind(ctx);
    ctx.stroke = function(){
      var prev = this.lineWidth;
      try { if (prev) this.lineWidth = Math.max(prev * mult, prev + (mult-1)); } catch(e){}
      try { return origStroke(); } finally { try{ this.lineWidth = prev; }catch(e){} }
    };
    ctx._lineBoldPatched = true;
  }

  function enableMobileItemDrag(blueprint3d){
    var three = blueprint3d.three;
    if (!three || !three.renderer || !three.renderer.domElement) return;
    var canvas=three.renderer.domElement;
    try{ canvas.style.touchAction='none'; }catch(e){}
    var block=function(e){ e.preventDefault(); };
    canvas.addEventListener('gesturestart', block, {passive:false});
    canvas.addEventListener('gesturechange', block, {passive:false});
    canvas.addEventListener('gestureend', block, {passive:false});
    function synthMouse(type, touch){
      var ev=document.createEvent('MouseEvents');
      ev.initMouseEvent(type, true, true, window, 1,
        touch.screenX||0, touch.screenY||0, touch.clientX, touch.clientY,
        false,false,false,false, 0, null);
      try{ ev.buttons=1; }catch(e){}
      return ev;
    }
    function dispatchMouse(type, touch){
      var e1=synthMouse(type,touch); canvas.dispatchEvent(e1);
      var e2=synthMouse(type,touch); document.dispatchEvent(e2);
    }
    var active=false;
    canvas.addEventListener('touchstart', function(e){
      if (!e.touches || e.touches.length!==1) return;
      var t=e.touches[0]; e.preventDefault();
      if (three.controls){ three.controls.enabled=false; three.controls.update && three.controls.update(); }
      active=true; dispatchMouse('mousedown', t);
    }, {passive:false});
    canvas.addEventListener('touchmove', function(e){
      if (!active) return;
      if (!e.touches || e.touches.length!==1) return;
      var t=e.touches[0]; e.preventDefault();
      dispatchMouse('mousemove', t);
      three.render && three.render();
    }, {passive:false});
    function endGesture(e){
      if (!active) return;
      active=false;
      var t=(e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
      if (t) dispatchMouse('mouseup', t);
      if (three.controls){ three.controls.enabled=true; three.controls.update && three.controls.update(); }
      three.render && three.render();
    }
    canvas.addEventListener('touchend', function(e){ e.preventDefault(); endGesture(e); }, {passive:false});
    canvas.addEventListener('touchcancel', function(e){ e.preventDefault(); endGesture(e); }, {passive:false});
  }
  function MobileItemControls(blueprint3d){
    var three = blueprint3d.three;
    var $wrap = $('#mobile-item-controls');
    var $stepBtn = $('#mic-step');
    var moveStepCm = 5;
    var rotateStepDegDefault = 5;
    var holdIntervalMs = 85;
    var activeItem = null;
    var holdTimer = null;
    
    // Mobile detection function
    function isMobile() {
      return window.innerWidth <= 768;
    }
    
    // Show/hide controls based on item selection and mobile status
    function updateControlsVisibility() {
      if (isMobile()) {
        if (activeItem) {
          $wrap.addClass('show');
        } else {
          $wrap.removeClass('show');
        }
      } else {
        // On desktop, always hide mobile controls
        $wrap.removeClass('show');
      }
    }
    
    // Item selection callback
    function onItemSelected(item) {
      activeItem = item || null;
      updateControlsVisibility();
    }
    
    // Item unselection callback
    function onItemUnselected() {
      activeItem = null;
      updateControlsVisibility();
    }
    
    if (three.itemSelectedCallbacks && three.itemSelectedCallbacks.add){
      three.itemSelectedCallbacks.add(onItemSelected);
    }
    if (three.itemUnselectedCallbacks && three.itemUnselectedCallbacks.add){
      three.itemUnselectedCallbacks.add(onItemUnselected);
    }
    
    // Listen for window resize to update visibility on orientation/window size changes
    $(window).on('resize', function() {
      updateControlsVisibility();
    });
    function nudgeItem(dx_cm, dz_cm){
      if (!activeItem) return;
      if (typeof activeItem.move==='function') {
        activeItem.move(dx_cm, dz_cm);
      } else if (typeof activeItem.setPosition==='function' && activeItem.position) {
        activeItem.setPosition(activeItem.position.x + dx_cm, activeItem.position.z + dz_cm);
      } else if (activeItem.position) {
        activeItem.position.x += dx_cm; activeItem.position.z += dz_cm;
        if (blueprint3d.model && blueprint3d.model.scene && typeof blueprint3d.model.scene.needsUpdate==='function'){
          blueprint3d.model.scene.needsUpdate();
        }
      }
      three.controls && three.controls.update && three.controls.update();
      three.render && three.render();
    }
    function rotateItem(deg){
      if (!activeItem) return;
      var rad=deg*Math.PI/180;
      if (typeof activeItem.rotateY==='function') {
        activeItem.rotateY(rad);
      } else if (typeof activeItem.rotate==='function') {
        activeItem.rotate(0, rad, 0);
      } else if (activeItem.rotation && typeof activeItem.rotation.y==='number') {
        activeItem.rotation.y += rad;
      }
      three.controls && three.controls.update && three.controls.update();
      three.render && three.render();
    }
    function startHold(fn){
      stopHold();
      fn();
      holdTimer=setInterval(fn, holdIntervalMs);
      if (three.controls) three.controls.enabled=false;
    }
    function stopHold(){
      if (holdTimer){ clearInterval(holdTimer); holdTimer=null; }
      if (three.controls){ three.controls.enabled=true; three.controls.update && three.controls.update(); }
    }
    $(document)
      .off('touchend.mobileMic touchcancel.mobileMic mouseup.mobileMic')
      .on('touchend.mobileMic touchcancel.mobileMic mouseup.mobileMic', function(){ stopHold(); });
    $wrap.off('touchstart mousedown', '.mic-move').on('touchstart mousedown', '.mic-move', function(e){
      e.preventDefault();
      var dxUnit=parseFloat(this.getAttribute('data-dx'))||0;
      var dzUnit=parseFloat(this.getAttribute('data-dz'))||0;
      startHold(function(){ nudgeItem(dxUnit*moveStepCm, dzUnit*moveStepCm); });
    });
    $wrap.off('touchstart mousedown', '.mic-rot').on('touchstart mousedown', '.mic-rot', function(e){
      e.preventDefault();
      var deg=parseFloat(this.getAttribute('data-deg'))||rotateStepDegDefault;
      startHold(function(){ rotateItem(deg); });
    });
    if ($stepBtn.length){
      $stepBtn.off('click touchend').on('click touchend', function(e){
        e.preventDefault();
        moveStepCm = (moveStepCm===5) ? 1 : (moveStepCm===1 ? 10 : 5);
        $stepBtn.text(moveStepCm + 'cm');
      });
    }
    
    // Initialize controls visibility on page load
    updateControlsVisibility();
  }
  var CameraButtons = function(blueprint3d){
    var three = blueprint3d.three;
    var orbitControls = three.controls;
    var panSpeed = 30;
    var directions = {UP:1,DOWN:2,LEFT:3,RIGHT:4};
    function init(){
      $('#zoom-in').click(zoomIn);
      $('#zoom-out').click(zoomOut).dblclick(stop);
      $('#zoom-in').dblclick(stop);
      $('#reset-view').click(function(){
        three.centerCamera && three.centerCamera();
        if (orbitControls && orbitControls.reset) orbitControls.reset();
      });
      $('#move-left').click(function(){ pan(directions.LEFT); });
      $('#move-right').click(function(){ pan(directions.RIGHT); });
      $('#move-up').click(function(){ pan(directions.UP); });
      $('#move-down').click(function(){ pan(directions.DOWN); });
      $('#move-left,#move-right,#move-up,#move-down').on('dblclick', stop);
    }
    function stop(e){ e.preventDefault(); e.stopPropagation(); }
    function refresh(){ if (!orbitControls) orbitControls = blueprint3d.three.controls; }
    function pan(d){
      refresh();
      if (orbitControls && typeof orbitControls.panXY==='function'){
        if (d===directions.UP) orbitControls.panXY(0, panSpeed);
        if (d===directions.DOWN) orbitControls.panXY(0, -panSpeed);
        if (d===directions.LEFT) orbitControls.panXY(panSpeed, 0);
        if (d===directions.RIGHT) orbitControls.panXY(-panSpeed, 0);
        orbitControls.update && orbitControls.update();
      }
    }
    function zoomIn(e){ e.preventDefault(); refresh(); if (orbitControls && orbitControls.dollyIn){ orbitControls.dollyIn(1.1); orbitControls.update && orbitControls.update(); } }
    function zoomOut(e){ e.preventDefault(); refresh(); if (orbitControls && orbitControls.dollyOut){ orbitControls.dollyOut(1.1); orbitControls.update && orbitControls.update(); } }
    this.refreshControls=function(){ orbitControls = blueprint3d.three.controls; };
    init();
  };
  var ContextMenu = function(blueprint3d){
    var three = blueprint3d.three, selectedItem=null;
    function init(){
      $('#context-menu-delete').click(function(){ if (selectedItem) selectedItem.remove(); });
      three.itemSelectedCallbacks.add(itemSelected);
      three.itemUnselectedCallbacks.add(itemUnselected);
      initResize();
      $('#fixed').click(function(){
        var checked=$(this).prop('checked'); if (selectedItem) selectedItem.setFixed(checked);
      });
    }
    function cmToIn(cm){ return cm/2.54; }
    function inToCm(i){ return i*2.54; }
    function itemSelected(item){
      selectedItem=item;
      $('#context-menu-name').text(item.metadata.itemName);
      $('#item-width').val(cmToIn(selectedItem.getWidth()).toFixed(0));
      $('#item-height').val(cmToIn(selectedItem.getHeight()).toFixed(0));
      $('#item-depth').val(cmToIn(selectedItem.getDepth()).toFixed(0));
      $('#context-menu').show();
      $('#fixed').prop('checked', item.fixed);
    }
    function resize(){
      if (!selectedItem) return;
      selectedItem.resize(
        inToCm($('#item-height').val()),
        inToCm($('#item-width').val()),
        inToCm($('#item-depth').val())
      );
    }
    function initResize(){ $('#item-height').change(resize); $('#item-width').change(resize); $('#item-depth').change(resize); }
    function itemUnselected(){ selectedItem=null; $('#context-menu').hide(); }
    init();
  };
  var ModalEffects = function(blueprint3d){
    var itemsLoading=0;
    function update(){ itemsLoading>0 ? $('#loading-modal').show() : $('#loading-modal').hide(); }
    function init(){
      blueprint3d.model.scene.itemLoadingCallbacks.add(function(){ itemsLoading+=1; update(); });
      blueprint3d.model.scene.itemLoadedCallbacks.add(function(){ itemsLoading-=1; update(); });
      update();
    }
    this.setActiveItem=function(){};
    init();
  };
  var ViewerFloorplanner = function(blueprint3d){
    var canvasWrapper='#floorplanner';
    var move='#move', remove='#delete', draw='#draw';
    var activeStyle='btn-primary disabled';
    this.floorplanner=blueprint3d.floorplanner;
    var scope=this;
    function init(){
      $(window).resize(scope.handleWindowResize);
      scope.handleWindowResize();
      scope.floorplanner.modeResetCallbacks.add(function(mode){
        $(draw).removeClass(activeStyle); $(remove).removeClass(activeStyle); $(move).removeClass(activeStyle);
        if (mode===BP3D.Floorplanner.floorplannerModes.MOVE) $(move).addClass(activeStyle);
        else if (mode===BP3D.Floorplanner.floorplannerModes.DRAW) $(draw).addClass(activeStyle);
        else if (mode===BP3D.Floorplanner.floorplannerModes.DELETE) $(remove).addClass(activeStyle);
        if (mode===BP3D.Floorplanner.floorplannerModes.DRAW){
          $('#draw-walls-hint').show(); scope.handleWindowResize();
        } else { $('#draw-walls-hint').hide(); }
      });
      $(move).click(function(){ scope.floorplanner.setMode(BP3D.Floorplanner.floorplannerModes.MOVE); });
      $(draw).click(function(){ scope.floorplanner.setMode(BP3D.Floorplanner.floorplannerModes.DRAW); });
      $(remove).click(function(){ scope.floorplanner.setMode(BP3D.Floorplanner.floorplannerModes.DELETE); });
    }
    this.updateFloorplanView=function(){ scope.floorplanner.reset(); };
    this.handleWindowResize=function(){
      $(canvasWrapper).height(window.innerHeight - $(canvasWrapper).offset().top);
      scope.floorplanner.resizeView();
    };
    init();
  };
  var SideMenu = function(blueprint3d, floorplanControls){
    var ACTIVE='active';
    var tabs={ FLOOPLAN:$('#floorplan_tab'), SHOP:$('#items_tab'), DESIGN:$('#design_tab') };
    tabs = { FLOORPLAN: $('#floorplan_tab'), SHOP: $('#items_tab'), DESIGN: $('#design_tab') };
    var scope=this; this.stateChangeCallbacks=$.Callbacks();
    this.states={
      DEFAULT:   { div:$('#viewer'),      tab:tabs.DESIGN },
      FLOORPLAN: { div:$('#floorplanner'), tab:tabs.FLOORPLAN },
      SHOP:      { div:$('#add-items'),    tab:tabs.SHOP }
    };
    var current=this.states.FLOORPLAN;
    function init(){
      for (var k in tabs) tabs[k].click(tabClicked(tabs[k]));
      $('#update-floorplan').click(function(){ setState(scope.states.DEFAULT); });
      initLeftMenu();
      blueprint3d.three.updateWindowSize && blueprint3d.three.updateWindowSize();
      handleResize();
      initItems();
      setState(scope.states.DEFAULT);
    }
    function tabClicked(tab){
      return function(){
        if (blueprint3d.three.controls) blueprint3d.three.controls.autoRotate=false;
        for (var key in scope.states){ var st=scope.states[key]; if (st.tab===tab){ setState(st); break; } }
      };
    }
    function setState(next){
      if (current===next) return;
      if (current.tab!==next.tab){
        current.tab && current.tab.removeClass(ACTIVE);
        next.tab && next.tab.addClass(ACTIVE);
      }
      blueprint3d.three.getController().setSelectedObject(null);
      current.div.hide(); next.div.show();
      if (next===scope.states.FLOORPLAN){
        stopViewerLoop(blueprint3d.three);
        floorplanControls.updateFloorplanView();
        floorplanControls.handleWindowResize();
      }
      if (current===scope.states.FLOORPLAN){
        blueprint3d.model.floorplan.update();
      }
      if (next===scope.states.DEFAULT){
        setTimeout(function(){
          blueprint3d.three.updateWindowSize && blueprint3d.three.updateWindowSize();
          if (blueprint3d.three.controls){
            blueprint3d.three.controls.reset && blueprint3d.three.controls.reset();
            blueprint3d.three.controls.enabled=true;
            if (blueprint3d.three.renderer && blueprint3d.three.renderer.domElement){
              blueprint3d.three.controls.domElement = blueprint3d.three.renderer.domElement;
            }
            blueprint3d.three.controls.update && blueprint3d.three.controls.update();
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
      handleResize();
      current=next;
      scope.stateChangeCallbacks.fire(next);
    }
    function initLeftMenu(){ $(window).resize(handleResize); handleResize(); }
    function handleResize(){
      var isMobile = window.innerWidth < 768;
      if (!isMobile){
        $('.sidebar, #add-items').height(window.innerHeight);
      } else {
        $('.sidebar, #add-items').css('height',''); // let CSS control height on phones
      }
      if (current===scope.states.DEFAULT){
        setTimeout(function(){
          blueprint3d.three.updateWindowSize && blueprint3d.three.updateWindowSize();
          if (blueprint3d.three.controls && typeof blueprint3d.three.controls.update==='function'){
            blueprint3d.three.controls.update(); bindRenderHook(blueprint3d.three);
          }
        },50);
      }
    }
    function initItems(){
      // Use single event delegation for all add-item elements
      $('#add-items').on('mousedown touchstart', '.add-item', function(e){
        e.preventDefault();
        e.stopPropagation();
        
        var $target = $(this);
        var modelUrl = $target.attr('model-url');
        var itemType = parseInt($target.attr('model-type'), 10);
        var thumbnailUrl = $target.attr('model-image') || $target.find('img').attr('src');
        var metadata = { 
          itemName: $target.attr('model-name'), 
          resizable: true, 
          modelUrl: modelUrl, 
          itemType: itemType, 
          thumbnailUrl: thumbnailUrl 
        };
        
        blueprint3d.model.scene.addItem(itemType, modelUrl, metadata);
        setState(scope.states.DEFAULT);
      });
    }
    init();
  };
  var TextureSelector=function(blueprint3d, sideMenu){
    var three=blueprint3d.three, currentTarget=null;
    function initTextureSelectors(){
      $('.texture-select-thumbnail').click(function(e){
        e.preventDefault(); if (!currentTarget) return;
        var url=$(this).attr('texture-url');
        var stretch=($(this).attr('texture-stretch')==='true');
        var scale=parseInt($(this).attr('texture-scale'),10);
        currentTarget.setTexture(url, stretch, scale);
      });
    }
    function init(){
      three.wallClicked.add(function(halfEdge){ currentTarget=halfEdge; $('#floorTexturesDiv').hide(); $('#wallTextures').show(); });
      three.floorClicked.add(function(room){ currentTarget=room; $('#wallTextures').hide(); $('#floorTexturesDiv').show(); });
      three.itemSelectedCallbacks.add(reset);
      three.nothingClicked.add(reset);
      sideMenu.stateChangeCallbacks.add(reset);
      initTextureSelectors();
    }
    function reset(){ $('#wallTextures').hide(); $('#floorTexturesDiv').hide(); }
    init();
  };
  function mainControls(blueprint3d){
    function newDesign(){
      blueprint3d.model.loadSerialized('{"floorplan":{"corners":{"f90da5e3-9e0e-eba7-173d-eb0b071e838e":{"x":204.85099999999989,"y":289.052},"da026c08-d76a-a944-8e7b-096b752da9ed":{"x":672.2109999999999,"y":289.052},"4e3d65cb-54c0-0681-28bf-bddcc7bdb571":{"x":672.2109999999999,"y":-178.308},"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2":{"x":204.85099999999989,"y":-178.308}},"walls":[{"corner1":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","corner2":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","corner2":"da026c08-d76a-a944-8e7b-096b752da9ed","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"da026c08-d76a-a944-8e7b-096b752da9ed","corner2":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","corner2":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}}],"wallTextures":[],"floorTextures":{},"newFloorTextures":{}},"items":[]}');
    }
    function loadDesign(){
      var files=$('#loadFile').get(0).files; if (!files || !files[0]) return;
      var reader=new FileReader();
      reader.onload=function(ev){ blueprint3d.model.loadSerialized(ev.target.result); };
      reader.readAsText(files[0]);
    }
    function saveDesign(){
      var data=blueprint3d.model.exportSerialized();
      var a=document.createElement('a');
      var blob=new Blob([data], {type:'text/plain'});
      a.href=window.URL.createObjectURL(blob); a.download='design.blueprint3d';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }
    $('#new').click(newDesign);
    $('#loadFile').change(loadDesign);
    $('#saveFile').click(saveDesign);
  }
  $(document).ready(function(){
    var opts={
      floorplannerElement:'floorplanner-canvas',
      threeElement:'#viewer',
      threeCanvasElement:'three-canvas',
      textureDir:'models/textures/',
      widget:false
    };
    var blueprint3d=new BP3D.Blueprint3d(opts);
    var modalEffects=new ModalEffects(blueprint3d);
    var viewerFloorplanner=new ViewerFloorplanner(blueprint3d);
    var contextMenu=new ContextMenu(blueprint3d);
    var sideMenu=new SideMenu(blueprint3d, viewerFloorplanner);
    var textureSelector=new TextureSelector(blueprint3d, sideMenu);
    var cameraButtons=new CameraButtons(blueprint3d);
    mainControls(blueprint3d);
    var mobileItemControls=new MobileItemControls(blueprint3d);
    var pdfExporter=new PDFExporter(blueprint3d); // Initialize PDF export functionality
    // Expose globally for manual triggering or testing
    window.PDFExporterInstance = pdfExporter;
    installMobileGuards(blueprint3d.three);
    enableMobileItemDrag(blueprint3d);
    bindRenderHook(blueprint3d.three);
    startViewerLoop(blueprint3d.three);
    sideMenu.stateChangeCallbacks.add(function(state){
      if (state===sideMenu.states.DEFAULT) cameraButtons.refreshControls();
    });
    blueprint3d.model.loadSerialized('{"floorplan":{"corners":{"f90da5e3-9e0e-eba7-173d-eb0b071e838e":{"x":204.85099999999989,"y":289.052},"da026c08-d76a-a944-8e7b-096b752da9ed":{"x":672.2109999999999,"y":289.052},"4e3d65cb-54c0-0681-28bf-bddcc7bdb571":{"x":672.2109999999999,"y":-178.308},"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2":{"x":204.85099999999989,"y":-178.308}},"walls":[{"corner1":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","corner2":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"f90da5e3-9e0e-eba7-173d-eb0b071e838e","corner2":"da026c08-d76a-a944-8e7b-096b752da9ed","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"da026c08-d76a-a944-8e7b-096b752da9ed","corner2":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}},{"corner1":"4e3d65cb-54c0-0681-28bf-bddcc7bdb571","corner2":"71d4f128-ae80-3d58-9bd2-711c6ce6cdf2","frontTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0},"backTexture":{"url":"rooms/textures/wallmap.png","stretch":true,"scale":0}}],"wallTextures":[],"floorTextures":{},"newFloorTextures":{}},"items":[]}');
    /* Off-canvas controller */
    (function(){
      var $sidebar   = $('#sidebar');
      var $backdrop  = $('#sidebar-backdrop');
      var $toggleBtn = $('#sidebar-toggle');
      function openSidebar(){
        $('body').addClass('sidebar-open');
        $sidebar.addClass('open');
        $backdrop.addClass('active').removeClass('hidden-xs');
      }
      function closeSidebar(){
        $('body').removeClass('sidebar-open');
        $sidebar.removeClass('open');
        $backdrop.removeClass('active').addClass('hidden-xs');
      }
      function toggleSidebar(e){ e && e.preventDefault(); $sidebar.hasClass('open') ? closeSidebar() : openSidebar(); }
      $toggleBtn.on('click', toggleSidebar);
      $backdrop.on('click', closeSidebar);
      $('.nav-sidebar a').on('click', closeSidebar);
      $(window).on('resize', function(){
        if (window.innerWidth >= 768) closeSidebar();
      });
    })();
  });
})();