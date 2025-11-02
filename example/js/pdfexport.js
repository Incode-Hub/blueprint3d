/*
 * PDF Export Functionality
 */

var PDFExporter = function (blueprint3d) {
  var blueprint3d = blueprint3d;
  var scope = this;

  // Helper: get the active WebGL canvas reliably
  function getRendererCanvas() {
    try {
      if (blueprint3d && blueprint3d.three && blueprint3d.three.renderer && blueprint3d.three.renderer.domElement) {
        return blueprint3d.three.renderer.domElement;
      }
    } catch (e) {}
    var el = document.querySelector('#viewer canvas');
    if (el) return el;
    return document.querySelector('canvas');
  }

  // Test if the jsPDF library is loaded
  this.testPDFLibrary = function () {
    if (typeof window.jspdf === "undefined") {
      console.error("jsPDF library not loaded!");
      return false;
    }
    console.log("jsPDF library loaded successfully!");
    return true;
  };

  // Capture an image of a specific item
  this.captureItemImage = function (item) {
    try {
      // Store current camera position and target
      var currentPosition = blueprint3d.three.controls.object.position.clone();
      var currentTarget = blueprint3d.three.controls.target.clone();

      // Focus camera on the item
      var itemPosition = item.position.clone();
      var distance =
        Math.max(item.getWidth(), item.getDepth(), item.getHeight()) * 1.5;

      // Position camera to look at the item from a good angle
      var cameraPosition = itemPosition.clone();
      cameraPosition.y += distance * 0.5;
      cameraPosition.z += distance;
      cameraPosition.x += distance * 0.5;

      // Set camera position and target
      blueprint3d.three.controls.object.position.copy(cameraPosition);
      blueprint3d.three.controls.target.copy(itemPosition);
      blueprint3d.three.controls.update();

      // Force render to update the view
      blueprint3d.three.needsUpdate = true;
      if (blueprint3d.three.render) {
        blueprint3d.three.render();
      }

      // Capture the canvas image
      var canvas = getRendererCanvas();
      if (!canvas) {
        throw new Error("WebGL canvas not found");
      }
      var imgData = canvas.toDataURL("image/jpeg", 0.8);

      // Restore original camera position and target
      blueprint3d.three.controls.object.position.copy(currentPosition);
      blueprint3d.three.controls.target.copy(currentTarget);
      blueprint3d.three.controls.update();

      // Force render to restore the view
      blueprint3d.three.needsUpdate = true;
      if (blueprint3d.three.render) {
        blueprint3d.three.render();
      }

      return imgData;
    } catch (error) {
      console.error("Error capturing item image:", error);
      return null;
    }
  };

  // Export 3D view to PDF
  this.export3DViewToPDF = function () {
    if (!this.testPDFLibrary()) {
      alert("Error: jsPDF library not loaded!");
      return;
    }

    try {
      // Show loading modal
      $("#pdf-loading-modal").show();
      $("#pdf-loading-message").text("Generating 3D View PDF...");

      // Create a new jsPDF instance
      var { jsPDF } = window.jspdf;
      var pdf = new jsPDF();

      // Get the WebGL canvas - find the canvas in the three container
      var canvas = getRendererCanvas();
      if (!canvas) {
        console.error("Canvas not found");
        $("#pdf-loading-modal").hide();
        $("#pdf-status")
          .removeClass("alert-success")
          .addClass("alert-danger")
          .text("Failed to export: Canvas not found")
          .show();
        setTimeout(function () {
          $("#pdf-status").fadeOut();
        }, 3000);
        return;
      }

      // Convert canvas to image
      var imgData = canvas.toDataURL("image/jpeg", 1.0);

      // Add image to PDF (adjust dimensions as needed)
      var imgProps = pdf.getImageProperties(imgData);
      var pdfWidth = pdf.internal.pageSize.getWidth();
      var pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

      // Save the PDF
      pdf.save("blueprint3d-3d-view.pdf");

      // Hide loading modal and show success message
      $("#pdf-loading-modal").hide();
      $("#pdf-status")
        .removeClass("alert-danger")
        .addClass("alert-success")
        .text("3D view exported successfully!")
        .show();
      setTimeout(function () {
        $("#pdf-status").fadeOut();
      }, 3000);
    } catch (error) {
      console.error("Error exporting 3D view:", error);
      $("#pdf-loading-modal").hide();
      $("#pdf-status")
        .removeClass("alert-success")
        .addClass("alert-danger")
        .text("Failed to export: " + error.message)
        .show();
    }
  };

  // Get thumbnail URL for an item based on its model URL
  this.getThumbnailUrl = function (item) {
    if (!item || !item.metadata) {
      return null;
    }

    try {
      // First try to use the stored thumbnailUrl from metadata
      if (item.metadata.thumbnailUrl) {
        console.log("Using stored thumbnail URL:", item.metadata.thumbnailUrl);
        return item.metadata.thumbnailUrl;
      }

      // Fallback: try to construct from modelUrl
      if (item.metadata.modelUrl) {
        var modelUrl = item.metadata.modelUrl;
        var modelName = modelUrl.split("/").pop().replace(".js", "");
        var thumbnailPath = "models/thumbnails/thumbnail_" + modelName + ".png";
        
        console.log("Fallback thumbnail path:", thumbnailPath);
        return thumbnailPath;
      }

      return null;
    } catch (error) {
      console.error("Error getting thumbnail URL:", error);
      return null;
    }
  };

  // Store item thumbnails
  var itemThumbnails = {};

  // Capture and store thumbnail for an item
  this.captureAndStoreThumbnail = function (item) {
    if (!item) return;

    var itemId =
      item.metadata.itemId || item.metadata.itemName || item.metadata.id;
    if (!itemId) return;

    var thumbnailData = this.captureItemImage(item);
    if (thumbnailData) {
      itemThumbnails[itemId] = thumbnailData;
      console.log("Thumbnail stored for item:", itemId);
    }
  };

  // Get stored thumbnail for an item
  this.getItemThumbnail = function (item) {
    if (!item) return null;

    var itemId =
      item.metadata.itemId || item.metadata.itemName || item.metadata.id;
    if (!itemId) return null;

    // First check if we have a captured thumbnail
    if (itemThumbnails[itemId]) {
      return itemThumbnails[itemId];
    }

    // If not, check if the item has a thumbnailUrl in its metadata
    if (item.metadata.thumbnailUrl) {
      return item.metadata.thumbnailUrl;
    }

    // If no thumbnail is available, capture one now
    var thumbnailData = this.captureItemImage(item);
    if (thumbnailData) {
      itemThumbnails[itemId] = thumbnailData;
      return thumbnailData;
    }

    return null;
  };

  // Compute a simple bounding box for the current scene items
  function computeSceneBounds(items) {
    var minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity,
      maxSize = 0;
    if (!items || items.length === 0) {
      return {
        center: new THREE.Vector3(0, 0, 0),
        size: 100,
      };
    }
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var pos = it.position || { x: 0, z: 0 };
      var w = (typeof it.getWidth === "function" ? it.getWidth() : 0) || 0;
      var d = (typeof it.getDepth === "function" ? it.getDepth() : 0) || 0;
      var h = (typeof it.getHeight === "function" ? it.getHeight() : 0) || 0;
      var halfW = w / 2;
      var halfD = d / 2;
      minX = Math.min(minX, pos.x - halfW);
      maxX = Math.max(maxX, pos.x + halfW);
      minZ = Math.min(minZ, pos.z - halfD);
      maxZ = Math.max(maxZ, pos.z + halfD);
      maxSize = Math.max(maxSize, w, d, h);
    }
    var sizeX = Math.abs(maxX - minX);
    var sizeZ = Math.abs(maxZ - minZ);
    var span = Math.max(sizeX, sizeZ, maxSize);
    var center = new THREE.Vector3((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
    if (!isFinite(center.x) || !isFinite(center.z)) {
      center = new THREE.Vector3(0, 0, 0);
      span = 100;
    }
    return { center: center, size: Math.max(span, 50) };
  }

  // Capture two scene screenshots: top view and corner/angled view
  this.captureSceneScreenshots = function () {
    try {
      // Stop auto-rotation to keep camera stable during capture
      if (blueprint3d && blueprint3d.three && typeof blueprint3d.three.stopSpin === 'function') {
        blueprint3d.three.stopSpin();
      }
      var items = blueprint3d.model.scene.getItems();
      var bounds = computeSceneBounds(items);
      var center = bounds.center;
      var size = bounds.size;

      var controls = blueprint3d.three.controls;
      if (!controls || !controls.object) {
        throw new Error("OrbitControls or camera not available");
      }

      var camera = controls.object;
      var originalPos = camera.position.clone();
      var originalTarget = controls.target.clone();

      // Attempt to force transparent background during capture if supported
      var renderer = (blueprint3d && blueprint3d.three) ? blueprint3d.three.renderer : null;
      var supportsAlpha = false;
      var origClearColor = null;
      var origClearAlpha = 1;
      try {
        if (renderer && renderer.getContext) {
          var attrs = renderer.getContext().getContextAttributes();
          supportsAlpha = !!(attrs && attrs.alpha);
        }
        if (renderer && renderer.getClearColor) {
          origClearColor = renderer.getClearColor().clone();
        }
        if (renderer && renderer.getClearAlpha) {
          origClearAlpha = renderer.getClearAlpha();
        }
        if (supportsAlpha && renderer && renderer.setClearColor) {
          // Set clear alpha to 0 for transparent capture
          renderer.setClearColor(origClearColor || new THREE.Color(0x000000), 0);
        }
      } catch (e) {
        // Non-fatal; transparency not guaranteed
      }

      // Helper to capture current canvas (PNG for high quality)
      function grabCanvas() {
        var canvas = getRendererCanvas();
        if (!canvas) throw new Error("Canvas not found");
        return canvas.toDataURL("image/png", 1.0);
      }

      // Top view (bird's eye)
      var originalUp = camera.up.clone();
      var originalFov = camera.fov;
      camera.up.set(0, 0, 1); // orient so Z is up -> cleaner top view roll
      camera.fov = Math.max(25, Math.min(45, camera.fov));
      var topPos = new THREE.Vector3(center.x, size * 2.0, center.z);
      camera.position.copy(topPos);
      controls.target.copy(center);
      controls.update && controls.update();
      blueprint3d.three.needsUpdate = true;
      if (blueprint3d.three.render) { blueprint3d.three.render(); blueprint3d.three.render(); }
      var topImg = null;
      try {
        topImg = grabCanvas();
      } catch (e) {
        console.error("Top view capture failed:", e);
      }

      // Corner / angled view
      var cornerPos = new THREE.Vector3(
        center.x + size * 0.9,
        size * 0.75,
        center.z + size * 0.9
      );
      camera.position.copy(cornerPos);
      camera.up.copy(originalUp); // restore normal orientation
      camera.fov = originalFov;
      controls.target.copy(center);
      controls.update && controls.update();
      blueprint3d.three.needsUpdate = true;
      if (blueprint3d.three.render) { blueprint3d.three.render(); blueprint3d.three.render(); }
      var cornerImg = null;
      try {
        cornerImg = grabCanvas();
      } catch (e) {
        console.error("Corner view capture failed:", e);
      }

      // Restore camera
      camera.position.copy(originalPos);
      camera.up.copy(originalUp);
      camera.fov = originalFov;
      controls.target.copy(originalTarget);
      controls.update && controls.update();
      blueprint3d.three.needsUpdate = true;
      if (blueprint3d.three.render) blueprint3d.three.render();

      // Restore renderer clear color/alpha
      try {
        if (renderer && renderer.setClearColor && origClearColor) {
          renderer.setClearColor(origClearColor, origClearAlpha);
        }
      } catch (e) {}

      return { topImg: topImg, cornerImg: cornerImg };
    } catch (error) {
      console.error("Error capturing scene screenshots:", error);
      return { topImg: null, cornerImg: null };
    }
  };

  // Map an item to test data structure used in items.js
  function mapItemToTestData(item) {
    var md = item && item.metadata ? item.metadata : {};
    var name = md.itemName || md.name || "Unnamed Item";
    var modelUrl = md.modelUrl || md.model || null;
    // Try to derive format from model URL
    var format = null;
    if (modelUrl) {
      var lower = modelUrl.toLowerCase();
      if (lower.endsWith(".gltf")) format = "gltf";
      else if (lower.endsWith(".glb")) format = "glb";
      else if (lower.endsWith(".json")) format = "json";
      else if (lower.endsWith(".js")) format = "js";
    }
    var type = md.type || md.itemType || "1";
    var image = scope.getItemThumbnail(item) || md.image || null;
    return {
      name: name,
      image: image,
      model: modelUrl,
      type: String(type),
      format: format || (md.format || "js"),
    };
  }

  // Helper function to generate fake product details
  function generateFakeProductDetails(itemName, index) {
    // Generate product codes
    var productCodes = [
      generateProductCode() + ": " + itemName,
      generateProductCode() + ": " + itemName + " Unterbau",
      generateProductCode() + ": " + itemName + " Spiegel"
    ];

    // Generate random dimensions
    var width = (Math.random() * 100 + 50).toFixed(1);
    var height = (Math.random() * 200 + 80).toFixed(1);
    var depth = (Math.random() * 80 + 30).toFixed(1);

    // Color options
    var colors = ["Schwarz Hochglanz", "Weiß Supermatt", "Eiche Natur", "Anthrazit Matt", "Beige Seidenmatt"];
    var korpusColors = ["Weiß Supermatt", "Schwarz Matt", "Graphit", "Eiche Dekor", "Nussbaum"];
    var frontColors = ["66 Marmor Struktur PG 3", "Hochglanz Weiß", "Matt Schwarz", "Eiche Rustikal", "Beton Optik"];

    // Article info variations
    var articleInfos = [
      "Waschplatz mit Möbelwaschtisch, Waschtischunterbau wandhängend mit 1 Auszug und 1 Schubkasten",
      "Komplettset mit Spiegel, Handtuchhalter und Beleuchtung",
      "Wandhängende Montage, inkl. Befestigungsmaterial",
      "Mit Soft-Close Funktion und höhenverstellbaren Füßen"
    ];

    return {
      productCodes: productCodes,
      dimensions: "B / H / T " + width + " / " + height + " / " + depth + " cm",
      articleInfo: "Artikelinfo " + articleInfos[index % articleInfos.length],
      color: "Farbe " + colors[index % colors.length],
      korpusColor: "Farbe Korpus " + korpusColors[index % korpusColors.length],
      frontColor: "Farbe Front " + frontColors[index % frontColors.length],
      heating: "Spiegelheizung " + (index % 2 === 0 ? "ohne" : "mit")
    };
  }

  // Helper to generate random product code
  function generateProductCode() {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var nums = "0123456789";
    var code = "";

    // 2-3 letters
    for (var i = 0; i < 2; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // 8-12 digits
    var digitCount = Math.floor(Math.random() * 5) + 8;
    for (var j = 0; j < digitCount; j++) {
      code += nums.charAt(Math.floor(Math.random() * nums.length));
    }

    return code;
  }

  // Export selected items (or all if none selected) with fake product details
  this.exportSelectedItemsLayoutPDF = function () {
    if (!this.testPDFLibrary()) {
      alert("Error: jsPDF library not loaded!");
      return;
    }

    try {
      $("#pdf-loading-modal").show();
      $("#pdf-loading-message").text("Generating Selected Items PDF...");

      // Gather selected items; fallback to all when empty
      var items = blueprint3d.model.scene.getItems() || [];
      var selected = items.filter(function (it) {
        return !!it.selected;
      });
      var usingFallbackAll = false;
      if (selected.length === 0) {
        selected = items.slice();
        usingFallbackAll = true;
      }

      if (selected.length === 0) {
        $("#pdf-loading-modal").hide();
        $("#pdf-status")
          .removeClass("alert-success")
          .addClass("alert-danger")
          .text("No items selected and scene is empty")
          .show();
        setTimeout(function () {
          $("#pdf-status").fadeOut();
        }, 3000);
        return;
      }

      // Build PDF (no screenshots)
      var { jsPDF } = window.jspdf;
      var pdf = new jsPDF();
      var pageWidth = pdf.internal.pageSize.getWidth();
      var pageHeight = pdf.internal.pageSize.getHeight();
      var margin = 15;
      var contentWidth = pageWidth - margin * 2;
      var curY = margin;

      // Header (blue bar)
      pdf.setFillColor(40, 96, 166);
      pdf.rect(margin, curY, contentWidth, 12, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.text("Artikelliste", margin + 4, curY + 8);

      // Items list
      curY += 16; // space below header
      var itemGap = 8;

      for (var i = 0; i < selected.length; i++) {
        var data = mapItemToTestData(selected[i]);
        var fakeDetails = generateFakeProductDetails(data.name || "Item", i);

        // Calculate block height based on content
        var blockHeight = 85;

        // Check for page overflow
        if (curY + blockHeight > pageHeight - margin) {
          pdf.addPage();
          // re-draw header on new page
          curY = margin;
          pdf.setFillColor(40, 96, 166);
          pdf.rect(margin, curY, contentWidth, 12, "F");
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(12);
          pdf.text("Artikelliste (Fortsetzung)", margin + 4, curY + 8);
          curY += 16;
        }

        // Block background for each item
        pdf.setFillColor(245, 245, 245);
        pdf.roundedRect(margin, curY, contentWidth, blockHeight, 2, 2, "F");

        // Thumbnail (optional)
        var thumb = data.image;
        var thumbW = 20;
        var thumbH = 20;
        var thumbX = margin + 4;
        var thumbY = curY + 4;
        if (thumb) {
          try {
            pdf.addImage(thumb, "JPEG", thumbX, thumbY, thumbW, thumbH);
          } catch (imgErr) {
            console.warn("Thumbnail add failed:", imgErr);
          }
        }

        var textX = thumb ? thumbX + thumbW + 4 : margin + 6;
        var textY = curY + 8;

        // Product codes (multiple lines)
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        for (var j = 0; j < fakeDetails.productCodes.length; j++) {
          pdf.text(fakeDetails.productCodes[j], textX, textY);
          textY += 5;
        }

        textY += 3; // extra space

        // Dimensions
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(10);
        pdf.text(fakeDetails.dimensions, textX, textY);
        textY += 6;

        // Article info
        pdf.setFont(undefined, "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(60, 60, 60);
        var wrapped = pdf.splitTextToSize(fakeDetails.articleInfo, contentWidth - 12);
        pdf.text(wrapped, textX, textY);
        textY += wrapped.length * 4 + 4;

        // Color details
        pdf.setFontSize(8);
        pdf.text(fakeDetails.color, textX, textY);
        textY += 4;
        pdf.text(fakeDetails.korpusColor, textX, textY);
        textY += 4;
        pdf.text(fakeDetails.frontColor, textX, textY);
        textY += 4;
        pdf.text(fakeDetails.heating, textX, textY);

        // Advance cursor
        curY += blockHeight + itemGap;
      }

      var fileName = usingFallbackAll
        ? "blueprint3d-items-all.pdf"
        : "blueprint3d-selected.pdf";
      pdf.save(fileName);

      $("#pdf-loading-modal").hide();
      $("#pdf-status")
        .removeClass("alert-danger")
        .addClass("alert-success")
        .text("PDF exported successfully!")
        .show();
      setTimeout(function () {
        $("#pdf-status").fadeOut();
      }, 3000);
    } catch (error) {
      console.error("Error exporting selected items layout:", error);
      $("#pdf-loading-modal").hide();
      $("#pdf-status")
        .removeClass("alert-success")
        .addClass("alert-danger")
        .text("Failed to export: " + error.message)
        .show();
      setTimeout(function () {
        $("#pdf-status").fadeOut();
      }, 3000);
    }
  };

  // Export current 3D design with two labeled perspectives (Top + 45° Corner)
  this.exportMultiPerspectivePDF = function () {
    if (!this.testPDFLibrary()) {
      alert("Error: jsPDF library not loaded!");
      return;
    }

    try {
      // Show loading modal
      $("#pdf-loading-modal").show();
      $("#pdf-loading-message").text("Generating Multi-Perspective PDF...");

      // Capture screenshots (this keeps camera stable and restores state afterward)
      var shots = this.captureSceneScreenshots();
      var hasAnyShot = !!(shots.topImg || shots.cornerImg);
      if (!hasAnyShot) {
        $("#pdf-loading-modal").hide();
        $("#pdf-status")
          .removeClass("alert-success")
          .addClass("alert-danger")
          .text("Could not capture screenshots from the viewer")
          .show();
        setTimeout(function () { $("#pdf-status").fadeOut(); }, 3000);
        return;
      }

      var { jsPDF } = window.jspdf;
      var pdf = new jsPDF();
      var pageWidth = pdf.internal.pageSize.getWidth();
      var pageHeight = pdf.internal.pageSize.getHeight();
      var margin = 15;

      // Title
      pdf.setFontSize(16);
      pdf.text("3D Design — Multi-Perspective Views", pageWidth / 2, margin, { align: "center" });

      // Determine image sizing based on canvas aspect (fallback gracefully)
      var canvas = (function(){ try { return getRendererCanvas(); } catch(e){ return null; } })();
      var aspect = 0.6; // fallback aspect ratio if canvas not available
      if (canvas && canvas.width && canvas.height && canvas.height > 0) {
        aspect = canvas.height / canvas.width;
      } else {
        // If we can read properties via jsPDF
        try {
          if (shots.topImg) {
            var p = pdf.getImageProperties(shots.topImg);
            if (p.width && p.height) aspect = p.height / p.width;
          }
        } catch(_){}
      }

      var y = margin + 8;
      var imgW = pageWidth - margin * 2;
      var topH = imgW * aspect;
      var cornerH = imgW * aspect;

      // Top view block
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Top View (Bird's-Eye)", margin, y);
      y += 4;
      if (shots.topImg) {
        try {
          // ensure height fits page; if it exceeds, reduce proportionally
          if (y + topH > pageHeight - margin) {
            topH = Math.max(40, (pageHeight - margin - y) - 10);
          }
          pdf.addImage(shots.topImg, "PNG", margin, y, imgW, topH);
          pdf.setDrawColor(200, 200, 200);
          pdf.rect(margin, y, imgW, topH);
          // Caption below image
          pdf.setFontSize(9);
          pdf.setTextColor(60, 60, 60);
          pdf.text("Top View (Bird's-Eye)", margin + imgW / 2, y + topH + 6, { align: "center" });
          pdf.setTextColor(0, 0, 0);
          y += topH + 10;
        } catch (eTop) {
          console.warn("Top view image add failed:", eTop);
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, y, imgW, 40, "F");
          pdf.setTextColor(150, 150, 150);
          pdf.setFontSize(9);
          pdf.text("Screenshot unavailable", margin + imgW / 2, y + 24, { align: "center" });
          pdf.setTextColor(0, 0, 0);
          y += 50;
        }
      } else {
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin, y, imgW, 40, "F");
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(9);
        pdf.text("Screenshot unavailable", margin + imgW / 2, y + 24, { align: "center" });
        pdf.setTextColor(0, 0, 0);
        y += 50;
      }

      // Corner view block
      // If remaining space is tight, add a new page
      if (y + cornerH + margin > pageHeight) {
        pdf.addPage();
        y = margin;
      }
      pdf.setFontSize(11);
      pdf.text("Corner View (45°)", margin, y);
      y += 4;
      if (shots.cornerImg) {
        try {
          if (y + cornerH > pageHeight - margin) {
            cornerH = Math.max(40, (pageHeight - margin - y) - 10);
          }
          pdf.addImage(shots.cornerImg, "PNG", margin, y, imgW, cornerH);
          pdf.setDrawColor(200, 200, 200);
          pdf.rect(margin, y, imgW, cornerH);
          // Caption below image
          pdf.setFontSize(9);
          pdf.setTextColor(60, 60, 60);
          pdf.text("Corner View (45°)", margin + imgW / 2, y + cornerH + 6, { align: "center" });
          pdf.setTextColor(0, 0, 0);
          y += cornerH + 10;
        } catch (eCorner) {
          console.warn("Corner view image add failed:", eCorner);
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, y, imgW, 40, "F");
          pdf.setTextColor(150, 150, 150);
          pdf.setFontSize(9);
          pdf.text("Screenshot unavailable", margin + imgW / 2, y + 24, { align: "center" });
          pdf.setTextColor(0, 0, 0);
          y += 50;
        }
      } else {
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin, y, imgW, 40, "F");
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(9);
        pdf.text("Screenshot unavailable", margin + imgW / 2, y + 24, { align: "center" });
        pdf.setTextColor(0, 0, 0);
        y += 50;
      }

      // Save and status
      pdf.save("blueprint3d-multi-perspective.pdf");
      $("#pdf-loading-modal").hide();
      $("#pdf-status")
        .removeClass("alert-danger")
        .addClass("alert-success")
        .text("Multi-perspective PDF exported successfully!")
        .show();
      setTimeout(function () { $("#pdf-status").fadeOut(); }, 3000);
    } catch (err) {
      console.error("Error exporting multi-perspective PDF:", err);
      $("#pdf-loading-modal").hide();
      $("#pdf-status")
        .removeClass("alert-success")
        .addClass("alert-danger")
        .text("Failed to export multi-perspective PDF: " + err.message)
        .show();
      setTimeout(function () { $("#pdf-status").fadeOut(); }, 3000);
    }
  };

  // Export all items as a list with thumbnails
  this.exportAllItemsAsList = function () {
    if (!this.testPDFLibrary()) {
      alert("Error: jsPDF library not loaded!");
      return;
    }

    try {
      // Show loading modal
      $("#pdf-loading-modal").show();
      $("#pdf-loading-message").text("Generating Items Catalog PDF...");

      // Get all items
      var allItems = blueprint3d.model.scene.getItems();

      if (allItems.length === 0) {
        $("#pdf-loading-modal").hide();
        $("#pdf-status")
          .removeClass("alert-success")
          .addClass("alert-danger")
          .text("No items in the scene")
          .show();
        setTimeout(function () {
          $("#pdf-status").fadeOut();
        }, 3000);
        return;
      }

      // Create a new jsPDF instance
      var { jsPDF } = window.jspdf;
      var pdf = new jsPDF();

      // Add title
      pdf.setFontSize(18);
      pdf.text("Complete Items Catalog", 105, 15, { align: "center" });

      // Set up layout
      pdf.setFontSize(12);
      var startY = 30;
      var margin = 20;
      var pageWidth = pdf.internal.pageSize.getWidth();
      var pageHeight = pdf.internal.pageSize.getHeight();
      var contentWidth = pageWidth - margin * 2;

      // Image dimensions
      var imageWidth = 60;
      var imageHeight = 60;
      var itemHeight = 80; // Height for each item block
      var itemsPerRow = 2;
      var itemWidth = contentWidth / itemsPerRow;
      
      // Calculate how many items can fit on a page
      var itemsPerPage = Math.floor((pageHeight - startY - margin) / itemHeight) * itemsPerRow;

      var currentX = margin;
      var currentY = startY;
      var itemCount = 0;

      // Process each item
      for (var i = 0; i < allItems.length; i++) {
        var item = allItems[i];

        // Capture thumbnail if not already stored
        if (!this.getItemThumbnail(item)) {
          this.captureAndStoreThumbnail(item);
        }

        // Get item details
        var metadata = item.metadata;
        var name = metadata.itemName || "Unnamed Item";
        var thumbnail = this.getItemThumbnail(item);

        // Check if we need a new page - add more margin to prevent truncation
        if (currentY + itemHeight > pdf.internal.pageSize.getHeight() - 30) {
          // Start a new page before this item to prevent truncation
          pdf.addPage();
          currentY = 30;
          currentX = margin;
          itemCount = 0;
          
          // Add page header on new pages
          pdf.setFontSize(14);
          pdf.text("Complete Items Catalog (continued)", 105, 15, { align: "center" });
          pdf.setFontSize(12);
        }

        // Calculate position for this item
        if (itemCount > 0 && itemCount % itemsPerRow === 0) {
          currentX = margin;
          currentY += itemHeight;
        }

        // Draw item background
        pdf.setFillColor(245, 245, 245);
        pdf.roundedRect(
          currentX,
          currentY,
          itemWidth - 10,
          itemHeight - 10,
          3,
          3,
          "F"
        );

        // Add thumbnail if available
        if (thumbnail) {
          try {
            pdf.addImage(
              thumbnail,
              "JPEG",
              currentX + (itemWidth - imageWidth) / 2 - 5,
              currentY + 5,
              imageWidth,
              imageHeight
            );
          } catch (e) {
            console.error("Error adding image:", e);
          }
        }

        // Add item name
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(10);

        // Center text under the image
        var textX = currentX + (itemWidth - 10) / 2;
        var textY = currentY + imageHeight + 15;

        // Truncate name if too long
        var maxNameLength = 25;
        var displayName =
          name.length > maxNameLength
            ? name.substring(0, maxNameLength) + "..."
            : name;

        pdf.text(displayName, textX, textY, { align: "center" });

        // Move to next position
        currentX += itemWidth;
        itemCount++;
      }

      // Save the PDF
      pdf.save("blueprint3d-complete-catalog.pdf");

      // Hide loading modal and show success message
      $("#pdf-loading-modal").hide();
      $("#pdf-status")
        .removeClass("alert-danger")
        .addClass("alert-success")
        .text("Complete items catalog exported successfully!")
        .show();
      setTimeout(function () {
        $("#pdf-status").fadeOut();
      }, 3000);
    } catch (error) {
      console.error("Error exporting items catalog:", error);
      $("#pdf-loading-modal").hide();
      $("#pdf-status")
        .removeClass("alert-success")
        .addClass("alert-danger")
        .text("Failed to export catalog: " + error.message)
        .show();
    }
  };

  // Export all items to PDF (not just selected ones)
  this.exportAllItemsToPDF = function () {
    if (!this.testPDFLibrary()) {
      alert("Error: jsPDF library not loaded!");
      return;
    }

    try {
      // Show loading modal
      $("#pdf-loading-modal").show();
      $("#pdf-loading-message").text("Generating Items PDF...");

      // Get all items (not just selected ones)
      var allItems = blueprint3d.model.scene.getItems();

      if (allItems.length === 0) {
        $("#pdf-loading-modal").hide();
        $("#pdf-status")
          .removeClass("alert-success")
          .addClass("alert-danger")
          .text("No items found in the scene")
          .show();
        setTimeout(function () {
          $("#pdf-status").fadeOut();
        }, 3000);
        return;
      }

      // Pre-load all thumbnails before generating the PDF
      var thumbnailsToLoad = allItems.length;
      var loadedThumbnails = [];
      var startTime = Date.now();
      var maxWaitTime = 10000; // 10 seconds max wait for thumbnails

      // Function to generate PDF once all thumbnails are loaded
      function generatePDF() {
        // Create a new jsPDF instance
        var { jsPDF } = window.jspdf;
        var pdf = new jsPDF();

        // Add title
        pdf.setFontSize(18);
        pdf.text("Items List", 105, 15, { align: "center" });

        var pageHeight = pdf.internal.pageSize.height;
        var pageWidth = pdf.internal.pageSize.width;
        var margin = 20;
        var thumbnailWidth = 60; // Fixed thumbnail width
        var thumbnailHeight = 60; // Fixed thumbnail height
        var textColumn = pageWidth - margin * 2 - thumbnailWidth - 15; // Width for text column
        var textHeight = 45; // Height for item text info
        var itemSpacing = 15; // Space between items
        var titleHeight = 30; // Space for title
        var itemHeight = Math.max(thumbnailHeight, textHeight) + itemSpacing;
        var availableHeight = pageHeight - margin * 2 - titleHeight;
        var maxItemsPerPage = Math.floor(availableHeight / itemHeight);

        var currentPage = 1;
        var yPosition = margin + titleHeight;

        // Process each item
        for (var i = 0; i < allItems.length; i++) {
          var item = allItems[i];
          var thumbnailData = loadedThumbnails[i];

          // Check if we need a new page
          if (i > 0 && i % maxItemsPerPage === 0) {
            pdf.addPage();
            currentPage++;
            yPosition = margin + titleHeight;
            
            // Add title to new page
            pdf.setFontSize(18);
            pdf.text("Items List (continued) - Page " + currentPage, 105, 15, { align: "center" });
          }

          // Add thumbnail image to PDF if available (positioned to the left)
          var thumbnailX = margin;
          var thumbnailY = yPosition;
          var textX = margin + thumbnailWidth + 15; // Text starts after thumbnail + gap
          var textY = yPosition + 12; // Align text with thumbnail
          
          if (thumbnailData && thumbnailData.imgData) {
            pdf.addImage(
              thumbnailData.imgData,
              "JPEG",
              thumbnailX,
              thumbnailY,
              thumbnailWidth,
              thumbnailHeight
            );
          } else {
            // Add placeholder rectangle for missing thumbnail
            pdf.setFillColor(240, 240, 240);
            pdf.rect(thumbnailX, thumbnailY, thumbnailWidth, thumbnailHeight, 'F');
            
            // Add "No image" text in placeholder
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text("No image", thumbnailX + thumbnailWidth/2, thumbnailY + thumbnailHeight/2, {
              align: "center"
            });
            pdf.setTextColor(0, 0, 0);
          }

          // Add item information with better formatting (positioned next to thumbnail)
          var metadata = item.metadata;
          var name = metadata.itemName || "Item " + (i + 1);

          // Add item number and name with larger font
          pdf.setFontSize(12);
          pdf.setTextColor(0, 0, 0);
          pdf.text((i + 1) + ". " + name, textX, textY);
          textY += 12;

          // Add dimensions with smaller font
          pdf.setFontSize(9);
          pdf.setTextColor(80, 80, 80);
          // var dimensions =
          //   "Size: " +
          //   Math.round(item.getWidth()) + " × " +
          //   Math.round(item.getDepth()) + " × " +
          //   Math.round(item.getHeight()) + " cm";
          // pdf.text(dimensions, textX, textY);
          textY += 10;

          // Add model info if available
          if (metadata.modelUrl) {
            var modelName = metadata.modelUrl.split("/").pop().replace(".js", "");
            pdf.setFontSize(8);
            pdf.setTextColor(120, 120, 120);
            // pdf.text("Model: " + modelName, textX, textY);
            textY += 8;
          }

          // Add separation line below item
          var separatorY = yPosition + itemHeight - itemSpacing + 2;
          pdf.setLineWidth(0.3);
          pdf.setDrawColor(200, 200, 200);
          pdf.line(margin, separatorY, pageWidth - margin, separatorY);

          // Move to position for next item
          yPosition += itemHeight;
        }

        // Save the PDF with all items
        pdf.save("blueprint3d-items-list.pdf");

        // Hide loading modal and show success message
        $("#pdf-loading-modal").hide();
        $("#pdf-status")
          .removeClass("alert-danger")
          .addClass("alert-success")
          .text("All items exported successfully! (" + allItems.length + " items)")
          .show();
        setTimeout(function () {
          $("#pdf-status").fadeOut();
        }, 3000);
      }

      // Add timeout fallback
      setTimeout(function() {
        if (thumbnailsToLoad > 0) {
          console.warn("Timeout reached, generating PDF with loaded thumbnails");
          thumbnailsToLoad = 0;
          generatePDF();
        }
      }, maxWaitTime);

      // If no items need thumbnails, generate PDF immediately  
      if (allItems.length === 0) {
        generatePDF();
        return;
      }

      // Load all thumbnails first
      allItems.forEach(function (item, index) {
        $("#pdf-loading-message").text(
          "Loading thumbnails: " + (index + 1) + " of " + allItems.length
        );

        var thumbnailUrl = scope.getThumbnailUrl(item);
        
        if (thumbnailUrl) {
          // Create an image element to load the thumbnail
          var img = new Image();
          
          // Set CORS to anonymous to allow cross-origin image loading
          img.crossOrigin = "anonymous";

          img.onload = function () {
            try {
              // Create a canvas to draw the image
              var canvas = document.createElement("canvas");
              var maxSize = 200; // Limit size for PDF efficiency
              var scale = Math.min(maxSize / img.width, maxSize / img.height);
              
              canvas.width = img.width * scale;
              canvas.height = img.height * scale;
              var ctx = canvas.getContext("2d");
              
              // Draw image with scaling
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

              // Get the image data
              var imgData = canvas.toDataURL("image/jpeg", 0.8);

              // Store the loaded thumbnail
              loadedThumbnails[index] = {
                imgData: imgData,
                item: item,
              };

              console.log("Thumbnail loaded for item:", item.metadata.itemName, "Size:", canvas.width + "x" + canvas.height);
            } catch (error) {
              console.error("Error processing thumbnail image:", error);
              loadedThumbnails[index] = {
                imgData: null,
                item: item,
              };
            }

            // Check if all thumbnails are loaded
            thumbnailsToLoad--;
            if (thumbnailsToLoad <= 0) {
              generatePDF();
            }
          };

          img.onerror = function (error) {
            console.error("Error loading thumbnail:", thumbnailUrl);
            loadedThumbnails[index] = { item: item };
            thumbnailsToLoad--;
            if (thumbnailsToLoad <= 0) {
              generatePDF();
            }
          };

          // Start loading the image - use absolute path for local files
          if (thumbnailUrl.startsWith("http")) {
            img.src = thumbnailUrl;
          } else {
            img.src = window.location.origin + "/example/" + thumbnailUrl;
          }
        } else {
          // No thumbnail available
          loadedThumbnails[index] = { item: item };
          thumbnailsToLoad--;
          if (thumbnailsToLoad <= 0) {
            generatePDF();
          }
        }
      });
    } catch (error) {
      console.error("Error exporting selected items:", error);
      $("#pdf-loading-modal").hide();
      $("#pdf-status")
        .removeClass("alert-success")
        .addClass("alert-danger")
        .text("Failed to export: " + error.message)
        .show();
      setTimeout(function () {
        $("#pdf-status").fadeOut();
      }, 3000);
    }
  };

  // This section was removed to fix duplicate code

  // Capture 3D view as screenshot and download
  this.capture3DScreenshot = function () {
    try {
      // Force a render to ensure the latest view is captured
      if (blueprint3d.three.render) {
        blueprint3d.three.render();
      }

      // Try multiple methods to get the canvas
      var canvas = null;

      // Method 1: Try to get from renderer.domElement
      if (blueprint3d.three.renderer && blueprint3d.three.renderer.domElement) {
        canvas = blueprint3d.three.renderer.domElement;
        console.log("Canvas found via renderer.domElement");
      }

      // Method 2: Try to find canvas in #viewer
      if (!canvas) {
        canvas = $("#viewer canvas")[0];
        if (canvas) {
          console.log("Canvas found in #viewer");
        }
      }

      // Method 3: Try to find any canvas element
      if (!canvas) {
        canvas = $("canvas")[0];
        if (canvas) {
          console.log("Canvas found via generic selector");
        }
      }

      if (!canvas) {
        console.error("Canvas not found with any method");
        $("#pdf-status")
          .removeClass("alert-success")
          .addClass("alert-danger")
          .text("Failed to capture: Canvas not found")
          .show();
        setTimeout(function () {
          $("#pdf-status").fadeOut();
        }, 3000);
        return;
      }

      // Convert canvas to image
      var imgData = canvas.toDataURL("image/png", 1.0);

      // Create a temporary link to download the image
      var link = document.createElement("a");
      link.download = "blueprint3d-screenshot-" + Date.now() + ".png";
      link.href = imgData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success message
      $("#pdf-status")
        .removeClass("alert-danger")
        .addClass("alert-success")
        .text("Screenshot captured successfully!")
        .show();
      setTimeout(function () {
        $("#pdf-status").fadeOut();
      }, 3000);
    } catch (error) {
      console.error("Error capturing screenshot:", error);
      $("#pdf-status")
        .removeClass("alert-success")
        .addClass("alert-danger")
        .text("Failed to capture screenshot: " + error.message)
        .show();
      setTimeout(function () {
        $("#pdf-status").fadeOut();
      }, 3000);
    }
  };

  // Update the selected items count
  this.updateSelectedItemsCount = function () {
    var items = blueprint3d.model.scene.getItems();
    var selectedItems = items.filter(function (item) {
      return item.selected;
    });

    var count = selectedItems.length;
    $("#selected-items-count").text(count);
  };

  // Clear all selected items
  this.clearSelectedItems = function () {
    var items = blueprint3d.model.scene.getItems();
    items.forEach(function (item) {
      if (item.selected) {
        blueprint3d.three.getController().setSelectedObject(item);
        blueprint3d.three.getController().setSelectedObject(null);
      }
    });
    this.updateSelectedItemsCount();
  };

  function init() {
    // Connect buttons to functions
    $("#export-3d-pdf").click(function () {
      scope.export3DViewToPDF();
    });

    $("#export-items-list").click(function () {
      scope.exportAllItemsToPDF();
    });

    // Optional new button (if present in DOM) to export selected items with screenshots
    $("#export-selected-layout").click(function () {
      scope.exportSelectedItemsLayoutPDF();
    });

    $("#capture-3d-screenshot").click(function () {
      scope.capture3DScreenshot();
    });

    // Optional: export multi-perspective PDF of current 3D design
    $("#export-multi-view-pdf").click(function () {
      scope.exportMultiPerspectivePDF();
    });

    $("#clear-selected-items").click(function () {
      scope.clearSelectedItems();
    });

    // Listen for item selection changes
    if (blueprint3d.three.itemSelectedCallbacks) {
      blueprint3d.three.itemSelectedCallbacks.add(function () {
        scope.updateSelectedItemsCount();
      });

      blueprint3d.three.itemUnselectedCallbacks.add(function () {
        scope.updateSelectedItemsCount();
      });
    }

    // Initial update
    scope.updateSelectedItemsCount();
  }

  init();
};

// Updated initialization code for example.js
// Add this to your $(document).ready() function:
/*
$(document).ready(function() {
  // ... existing code ...
  
  // Initialize PDF exporter
  var pdfExporter = new PDFExporter(blueprint3d);
  
  // Test PDF library on load (optional)
  setTimeout(function() {
    pdfExporter.testPDFLibrary();
  }, 1000);
});
*/
