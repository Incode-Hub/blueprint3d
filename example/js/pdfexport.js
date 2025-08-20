/*
 * PDF Export Functionality
 */

var PDFExporter = function(blueprint3d) {
  var blueprint3d = blueprint3d;
  var scope = this;

  // Test if the jsPDF library is loaded
  this.testPDFLibrary = function() {
    if (typeof jsPDF === 'undefined') {
      console.error("jsPDF library not loaded!");
      return false;
    }
    console.log("jsPDF library loaded successfully!");
    return true;
  }

  // Export 3D view to PDF
  this.export3DViewToPDF = function() {
    if (!testPDFLibrary()) {
      alert("Error: jsPDF library not loaded!");
      return;
    }

    try {
      // Create a new jsPDF instance
      var pdf = new jsPDF();

      // Get the WebGL canvas
      var canvas = $("canvas")[0];
      if (!canvas) {
        console.error("Canvas not found");
        return;
      }

      // Convert canvas to image
      var imgData = canvas.toDataURL('image/jpeg', 1.0);

      // Add image to PDF (adjust dimensions as needed)
      var imgProps = pdf.getImageProperties(imgData);
      var pdfWidth = pdf.internal.pageSize.getWidth();
      var pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      // Save the PDF
      pdf.save('blueprint3d-3d-view.pdf');
    } catch (error) {
      console.error("Error exporting 3D view:", error);
      alert("Failed to export 3D view: " + error.message);
    }
  };

  // Export selected items to PDF
  this.exportSelectedItemsToPDF = function() {
    if (!testPDFLibrary()) {
      alert("Error: jsPDF library not loaded!");
      return;
    }

    try {
      // Get selected items
      var items = blueprint3d.three.getItems();
      var selectedItems = items.filter(function(item) {
        return item.selected;
      });

      if (selectedItems.length === 0) {
        alert("No items selected");
        return;
      }

      // Create a new jsPDF instance
      var pdf = new jsPDF();

      // Add title
      pdf.setFontSize(16);
      pdf.text("Selected Items", 10, 10);

      // Add items information
      pdf.setFontSize(12);
      var y = 20;
      selectedItems.forEach(function(item, index) {
        var metadata = item.metadata;
        var name = metadata.itemName || "Item " + (index + 1);
        var dimensions = "Dimensions: " + 
          Math.round(metadata.itemDepth) + " x " + 
          Math.round(metadata.itemWidth) + " x " + 
          Math.round(metadata.itemHeight);

        pdf.text(name, 10, y);
        pdf.text(dimensions, 10, y + 7);
        y += 20;

        // Add page if needed
        if (y > 270 && index < selectedItems.length - 1) {
          pdf.addPage();
          y = 20;
        }
      });

      // Save the PDF
      pdf.save('blueprint3d-selected-items.pdf');
    } catch (error) {
      console.error("Error exporting selected items:", error);
      alert("Failed to export selected items: " + error.message);
    }
  };

  function init() {
    // Connect buttons to functions
    $("#export-3d-pdf").click(export3DViewToPDF);
    $("#export-items-pdf").click(exportSelectedItemsToPDF);
  }

  function testPDFLibrary() {
    if (typeof jsPDF === 'undefined') {
      console.error("jsPDF library not loaded!");
      return false;
    }
    return true;
  }

  function export3DViewToPDF() {
    scope.export3DViewToPDF();
  }

  function exportSelectedItemsToPDF() {
    scope.exportSelectedItemsToPDF();
  }

  init();
}

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