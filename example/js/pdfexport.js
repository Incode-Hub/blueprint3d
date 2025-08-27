/*
 * PDF Export Functionality
 */

var PDFExporter = function (blueprint3d) {
  var blueprint3d = blueprint3d;
  var scope = this;

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
      var canvas = $(".three").find("canvas")[0];
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
      var canvas = $(".three").find("canvas")[0];
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
            pdf.text("Model: " + modelName, textX, textY);
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
