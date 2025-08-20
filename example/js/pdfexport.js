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
    if (!item || !item.metadata || !item.metadata.modelUrl) {
      return null;
    }

    try {
      var modelUrl = item.metadata.modelUrl;

      // Extract the model name from the URL
      var modelName = modelUrl.split("/").pop().replace(".js", "");

      // First try to find a matching thumbnail in the items.js format
      for (var i = 0; i < items.length; i++) {
        if (items[i].model === modelName) {
          if (items[i].image) {
            return items[i].image;
          }
          break;
        }
      }

      // Fallback to constructed path
      var thumbnailPath = "models/thumbnails/thumbnail_" + modelName + ".png";

      console.log("Thumbnail path:", thumbnailPath);
      return thumbnailPath;
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

  // Export selected items to PDF
  this.exportSelectedItemsToPDF = function () {
    if (!this.testPDFLibrary()) {
      alert("Error: jsPDF library not loaded!");
      return;
    }

    try {
      // Show loading modal
      $("#pdf-loading-modal").show();
      $("#pdf-loading-message").text("Generating Items PDF...");

      // Get selected items
      var items = blueprint3d.model.scene.getItems();
      var selectedItems = items.filter(function (item) {
        return item.selected;
      });

      if (selectedItems.length === 0) {
        $("#pdf-loading-modal").hide();
        $("#pdf-status")
          .removeClass("alert-success")
          .addClass("alert-danger")
          .text("No items selected")
          .show();
        setTimeout(function () {
          $("#pdf-status").fadeOut();
        }, 3000);
        return;
      }

      // Pre-load all thumbnails before generating the PDF
      var thumbnailsToLoad = selectedItems.length;
      var loadedThumbnails = [];

      // Function to generate PDF once all thumbnails are loaded
      function generatePDF() {
        // Create a new jsPDF instance
        var { jsPDF } = window.jspdf;
        var pdf = new jsPDF();

        // Add title
        pdf.setFontSize(18);
        pdf.text("Selected Items", 105, 15, { align: "center" });

        var pageHeight = pdf.internal.pageSize.height;
        var pageWidth = pdf.internal.pageSize.width;
        var margin = 20;
        var imageWidth = pageWidth - margin * 2;
        var imageHeight = 100;
        var textHeight = 40;
        var itemHeight = imageHeight + textHeight;
        var maxItemsPerPage = Math.floor(
          (pageHeight - margin * 2) / itemHeight
        );

        var currentPage = 1;
        var yPosition = margin + 20;

        // Process each selected item
        for (var i = 0; i < selectedItems.length; i++) {
          var item = selectedItems[i];
          var thumbnailData = loadedThumbnails[i];

          // Check if we need a new page
          if (i > 0 && i % maxItemsPerPage === 0) {
            pdf.addPage();
            currentPage++;
            yPosition = margin + 20;
          }

          // Add thumbnail image to PDF if available
          if (thumbnailData && thumbnailData.imgData) {
            pdf.addImage(
              thumbnailData.imgData,
              "JPEG",
              margin,
              yPosition,
              imageWidth,
              imageHeight
            );
            yPosition += imageHeight + 10;
          } else {
            // If no thumbnail, add placeholder text
            pdf.setFontSize(12);
            pdf.setTextColor(150, 150, 150);
            pdf.text("No image available", pageWidth / 2, yPosition + 50, {
              align: "center",
            });
            yPosition += imageHeight + 10;
            pdf.setTextColor(0, 0, 0);
          }

          // Add item information
          var metadata = item.metadata;
          var name = metadata.itemName || "Item " + (i + 1);

          // Add item name with larger font
          pdf.setFontSize(14);
          pdf.setTextColor(0, 0, 0);
          pdf.text(name, margin, yPosition);
          yPosition += 8;

          // Add dimensions with smaller font
          pdf.setFontSize(12);
          var dimensions =
            "Dimensions: " +
            Math.round(item.getDepth()) +
            " x " +
            Math.round(item.getWidth()) +
            " x " +
            Math.round(item.getHeight());
          pdf.text(dimensions, margin, yPosition);

          // Move to position for next item
          yPosition += textHeight;
        }

        // Save the PDF
        pdf.save("blueprint3d-selected-items.pdf");

        // Hide loading modal and show success message
        $("#pdf-loading-modal").hide();
        $("#pdf-status")
          .removeClass("alert-danger")
          .addClass("alert-success")
          .text("Selected items exported successfully!")
          .show();
        setTimeout(function () {
          $("#pdf-status").fadeOut();
        }, 3000);
      }

      // Load all thumbnails first
      selectedItems.forEach(function (item, index) {
        $("#pdf-loading-message").text(
          "Loading thumbnails: " + (index + 1) + " of " + selectedItems.length
        );

        var thumbnailUrl = scope.getThumbnailUrl(item);
        if (thumbnailUrl) {
          // Create an image element to load the thumbnail
          var img = new Image();

          img.onload = function () {
            // Create a canvas to draw the image
            var canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            // Get the image data
            var imgData = canvas.toDataURL("image/jpeg", 0.85);

            // Store the loaded thumbnail
            loadedThumbnails[index] = {
              imgData: imgData,
              item: item,
            };

            // Check if all thumbnails are loaded
            thumbnailsToLoad--;
            if (thumbnailsToLoad <= 0) {
              generatePDF();
            }
          };

          img.onerror = function () {
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

    $("#export-items-pdf").click(function () {
      scope.exportSelectedItemsToPDF();
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
