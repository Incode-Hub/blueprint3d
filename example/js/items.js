// add items to the "Add Items" tab with category organization

$(document).ready(function () {
  // Configuration: set to true for category system, false for original list view
  var useCategorySystem = true;

  // Original items array (preserved from your existing code)
  var originalItems = [
    {
      name: "Closed Door",
      image:
        "models/thumbnails/thumbnail_Screen_Shot_2014-10-27_at_8.04.12_PM.png",
      model: "models/js/closed-door28x80_baked.js",
      type: "7",
    },
    {
      name: "Open Door",
      image:
        "models/thumbnails/thumbnail_Screen_Shot_2014-10-27_at_8.22.46_PM.png",
      model: "models/js/open_door.js",
      type: "7",
    },
    {
      name: "Window",
      image: "models/thumbnails/thumbnail_window.png",
      model: "models/js/whitewindow.js",
      type: "3",
    },
    {
      name: "Chair",
      image: "models/thumbnails/thumbnail_Church-Chair-oak-white_1024x1024.jpg",
      model: "models/js/gus-churchchair-whiteoak.js",
      type: "1",
    },
    {
      name: "Red Chair",
      image: "models/thumbnails/thumbnail_tn-orange.png",
      model: "models/js/ik-ekero-orange_baked.js",
      type: "1",
    },
    {
      name: "Blue Chair",
      image: "models/thumbnails/thumbnail_ekero-blue3.png",
      model: "models/js/ik-ekero-blue_baked.js",
      type: "1",
    },
    {
      name: "Dresser - Dark Wood",
      image: "models/thumbnails/thumbnail_matera_dresser_5.png",
      model: "models/js/DWR_MATERA_DRESSER2.js",
      type: "1",
    },
    {
      name: "Dresser - White",
      image: "models/thumbnails/thumbnail_img25o.jpg",
      model: "models/js/we-narrow6white_baked.js",
      type: "1",
    },
    {
      name: "Bedside table - Shale",
      image: "models/thumbnails/thumbnail_Blu-Dot-Shale-Bedside-Table.jpg",
      model: "models/js/bd-shalebedside-smoke_baked.js",
      type: "1",
    },
    {
      name: "Bedside table - White",
      image: "models/thumbnails/thumbnail_arch-white-oval-nightstand.jpg",
      model: "models/js/cb-archnight-white_baked.js",
      type: "1",
    },
    {
      name: "Wardrobe - White",
      image: "models/thumbnails/thumbnail_TN-ikea-kvikine.png",
      model: "models/js/ik-kivine_baked.js",
      type: "1",
    },
    {
      name: "Full Bed",
      image:
        "models/thumbnails/thumbnail_nordli-bed-frame__0159270_PE315708_S4.JPG",
      model: "models/js/ik_nordli_full.js",
      type: "1",
    },
    {
      name: "Bookshelf",
      image: "models/thumbnails/thumbnail_kendall-walnut-bookcase.jpg",
      model: "models/js/cb-kendallbookcasewalnut_baked.js",
      type: "1",
    },
    {
      name: "Media Console - White",
      image:
        "models/thumbnails/thumbnail_clapboard-white-60-media-console-1.jpg",
      model: "models/js/cb-clapboard_baked.js",
      type: "1",
    },
    {
      name: "Media Console - Black",
      image: "models/thumbnails/thumbnail_moore-60-media-console-1.jpg",
      model: "models/js/cb-moore_baked.js",
      type: "1",
    },
    {
      name: "Sectional - Olive",
      image: "models/thumbnails/thumbnail_img21o.jpg",
      model: "models/js/we-crosby2piece-greenbaked.js",
      type: "1",
    },
    {
      name: "Sofa - Grey",
      image: "models/thumbnails/thumbnail_rochelle-sofa-3.jpg",
      model: "models/js/cb-rochelle-gray_baked.js",
      type: "1",
    },
    {
      name: "Wooden Trunk",
      image: "models/thumbnails/thumbnail_teca-storage-trunk.jpg",
      model: "models/js/cb-tecs_baked.js",
      type: "1",
    },
    {
      name: "Floor Lamp",
      image: "models/thumbnails/thumbnail_ore-white.png",
      model: "models/js/ore-3legged-white_baked.js",
      type: "1",
    },
    {
      name: "Coffee Table - Wood",
      image:
        "models/thumbnails/thumbnail_stockholm-coffee-table__0181245_PE332924_S4.JPG",
      model: "models/js/ik-stockholmcoffee-brown.js",
      type: "1",
    },
    {
      name: "Side Table",
      image:
        "models/thumbnails/thumbnail_Screen_Shot_2014-02-21_at_1.24.58_PM.png",
      model: "models/js/GUSossingtonendtable.js",
      type: "1",
    },
    {
      name: "Dining Table",
      image: "models/thumbnails/thumbnail_scholar-dining-table.jpg",
      model: "models/js/cb-scholartable_baked.js",
      type: "1",
    },
    {
      name: "Dining table",
      image:
        "models/thumbnails/thumbnail_Screen_Shot_2014-01-28_at_6.49.33_PM.png",
      model: "models/js/BlakeAvenuejoshuatreecheftable.js",
      type: "1",
    },
    {
      name: "Blue Rug",
      image: "models/thumbnails/thumbnail_cb-blue-block60x96.png",
      model: "models/js/cb-blue-block-60x96.js",
      type: "8",
    },
    {
      name: "NYC Poster",
      image: "models/thumbnails/thumbnail_nyc2.jpg",
      model: "models/js/nyc-poster2.js",
      type: "2",
    },



    // Kepler Bathroom Models (GLTF format)

    {
      name: "Kepler Toilet Floor Standing (GLTF)",
      image: "gltf/new/Kepler FS Bowl ceramic Handle-1000x808.jpg",
      model: "gltf/new/bathone.json",
      type: "1",
      format: "json",
    },

    {
      name: "Kepler Toilet Floor Standing",
      image: "gltf/new/Ceramics_Kepler Pedestal-1000x808.png",
      model: "gltf/new/unnnantitled.json",
      type: "1",
      format: "json",
    },
  ];

  var itemsDiv = $("#items-wrapper");
  var currentCategory = null;

  // Create categories by filtering original items
  function createCategories(formatFilter) {
    formatFilter = formatFilter || "all";

    // Filter items by format first
    var filteredItems = originalItems.filter(function (item) {
      if (formatFilter === "all") return true;
      return item.format === formatFilter || !item.format; // include items without format specified
    });

    return {
      Furniture: {
        icon: "glyphicon-bed",
        items: filteredItems.filter(function (item) {
          return (
            item.name.indexOf("Chair") !== -1 ||
            item.name.indexOf("Sofa") !== -1 ||
            item.name.indexOf("Sectional") !== -1
          );
        }),
      },

      Storage: {
        icon: "glyphicon-folder-close",
        items: filteredItems.filter(function (item) {
          return (
            item.name.indexOf("Dresser") !== -1 ||
            item.name.indexOf("Wardrobe") !== -1 ||
            item.name.indexOf("Bookshelf") !== -1 ||
            item.name.indexOf("Trunk") !== -1
          );
        }),
      },

      Tables: {
        icon: "glyphicon-th-large",
        items: filteredItems.filter(function (item) {
          return (
            item.name.indexOf("table") !== -1 ||
            item.name.indexOf("Table") !== -1
          );
        }),
      },

      Bedroom: {
        icon: "glyphicon-home",
        items: filteredItems.filter(function (item) {
          return item.name.indexOf("Bed") !== -1;
        }),
      },

      Electronics: {
        icon: "glyphicon-blackboard",
        items: filteredItems.filter(function (item) {
          return item.name.indexOf("Media Console") !== -1;
        }),
      },

      Lighting: {
        icon: "glyphicon-flash",
        items: filteredItems.filter(function (item) {
          return item.name.indexOf("Lamp") !== -1;
        }),
      },

      "Doors & Windows": {
        icon: "glyphicon-log-in",
        items: filteredItems.filter(function (item) {
          return (
            item.name.indexOf("Door") !== -1 ||
            item.name.indexOf("Window") !== -1
          );
        }),
      },

      Decorative: {
        icon: "glyphicon-picture",
        items: filteredItems.filter(function (item) {
          return (
            item.name.indexOf("Rug") !== -1 ||
            item.name.indexOf("Poster") !== -1
          );
        }),
      },

      Bathroom: {
        icon: "glyphicon-tint",
        items: filteredItems.filter(function (item) {
          return (
            item.name.indexOf("Kepler") !== -1 ||
            item.name.indexOf("Bath") !== -1
          );
        }),
      },
    };
  }

  // Function to render original list view
  function showOriginalItems() {
    itemsDiv.empty();

    for (var i = 0; i < originalItems.length; i++) {
      var item = originalItems[i];
      var html =
        '<div class="col-sm-4">' +
        '<a class="thumbnail add-item" model-name="' +
        item.name +
        '" model-url="' +
        item.model +
        '" model-type="' +
        item.type +
        '"><img src="' +
        item.image +
        '" alt="Add Item"> ' +
        item.name +
        "</a></div>";
      itemsDiv.append(html);
    }
  }

  // Function to show categories (main view)
  function showCategories(formatFilter) {
    formatFilter = formatFilter || "all";
    var itemCategories = createCategories(formatFilter);
    itemsDiv.empty();
    currentCategory = null;

    // Add header with toggle button and format selector
    // var headerHtml = '<div class="col-xs-12" style="margin-bottom: 20px;">' +
    //                   '<div class="row">' +
    //                     '<div class="col-xs-6">' +
    //                       '<h4 class="text-center" style="margin: 5px 0; color: #666;">Select a Category</h4>' +
    //                     '</div>' +
    //                     '<div class="col-xs-3 text-center">' +
    //                       '<label style="font-size: 12px; margin: 0;">Model Format:</label><br>' +
    //                       '<div class="btn-group btn-group-xs" data-toggle="buttons">' +
    //                         '<label class="btn btn-default ' + (formatFilter === 'all' ? 'active' : '') + '" id="format-all">' +
    //                           '<input type="radio" name="format" value="all" ' + (formatFilter === 'all' ? 'checked' : '') + '> All' +
    //                         '</label>' +
    //                         '<label class="btn btn-default ' + (formatFilter === 'js' ? 'active' : '') + '" id="format-js">' +
    //                           '<input type="radio" name="format" value="js" ' + (formatFilter === 'js' ? 'checked' : '') + '> JS' +
    //                         '</label>' +
    //                         '<label class="btn btn-default ' + (formatFilter === 'gltf' ? 'active' : '') + '" id="format-gltf">' +
    //                           '<input type="radio" name="format" value="gltf" ' + (formatFilter === 'gltf' ? 'checked' : '') + '> GLTF' +
    //                         '</label>' +
    //                       '</div>' +
    //                     '</div>' +
    //                     '<div class="col-xs-3 text-right">' +
    //                       '<button class="btn btn-xs btn-default" id="toggle-view">' +
    //                         '<span class="glyphicon glyphicon-list"></span> List View' +
    //                       '</button>' +
    //                     '</div>' +
    //                   '</div>' +
    //                 '</div>';
    // itemsDiv.append(headerHtml);

    // Add category folders
    for (var categoryName in itemCategories) {
      var category = itemCategories[categoryName];
      var itemCount = category.items.length;

      if (itemCount > 0) {
        // Only show categories that have items
        var html =
          '<div class="col-sm-6 col-md-4" style="margin-bottom: 15px;">' +
          '<a href="#" class="thumbnail category-folder" data-category="' +
          categoryName +
          '" style="text-align: center; padding: 20px; transition: all 0.2s ease; border: 2px solid #ddd;">' +
          '<div style="font-size: 48px; color: #337ab7; margin-bottom: 10px;">' +
          '<span class="glyphicon ' +
          category.icon +
          '"></span>' +
          "</div>" +
          '<h5 style="margin: 0; font-weight: bold; color: #333;">' +
          categoryName +
          "</h5>" +
          '<small class="text-muted">(' +
          itemCount +
          " items)</small>" +
          "</a>" +
          "</div>";
        itemsDiv.append(html);
      }
    }

    // Add hover effects
    $(".category-folder").hover(
      function () {
        $(this).css({
          "border-color": "#337ab7",
          "box-shadow": "0 4px 8px rgba(0,0,0,0.1)",
          transform: "translateY(-2px)",
        });
      },
      function () {
        $(this).css({
          "border-color": "#ddd",
          "box-shadow": "none",
          transform: "translateY(0)",
        });
      }
    );
  }

  // Function to show items in a category
  function showCategoryItems(categoryName, formatFilter) {
    formatFilter = formatFilter || "all";
    var itemCategories = createCategories(formatFilter);
    itemsDiv.empty();
    currentCategory = categoryName;

    var category = itemCategories[categoryName];

    // Add header with back button, format selector, and toggle
    var headerHtml =
      '<div class="col-xs-12" style="margin-bottom: 20px;">' +
      '<div class="row">' +
      '<div class="col-xs-2">' +
      '<button class="btn btn-default btn-sm" id="back-to-categories">' +
      '<span class="glyphicon glyphicon-arrow-left"></span> Back' +
      "</button>" +
      "</div>" +
      '<div class="col-xs-4">' +
      '<h4 class="text-center" style="margin: 5px 0; color: #666;">' +
      '<span class="glyphicon ' +
      category.icon +
      '"></span> ' +
      categoryName +
      "</h4>" +
      "</div>" +
      // '<div class="col-xs-3 text-center">' +
      //   '<label style="font-size: 12px; margin: 0;">Model Format:</label><br>' +
      //   '<div class="btn-group btn-group-xs" data-toggle="buttons">' +
      //     '<label class="btn btn-default ' + (formatFilter === 'all' ? 'active' : '') + '" id="format-all">' +
      //       '<input type="radio" name="format" value="all" ' + (formatFilter === 'all' ? 'checked' : '') + '> All' +
      //     '</label>' +
      //     '<label class="btn btn-default ' + (formatFilter === 'js' ? 'active' : '') + '" id="format-js">' +
      //       '<input type="radio" name="format" value="js" ' + (formatFilter === 'js' ? 'checked' : '') + '> JS' +
      //     '</label>' +
      //     '<label class="btn btn-default ' + (formatFilter === 'gltf' ? 'active' : '') + '" id="format-gltf">' +
      //       '<input type="radio" name="format" value="gltf" ' + (formatFilter === 'gltf' ? 'checked' : '') + '> GLTF' +
      //     '</label>' +
      //   '</div>' +
      // '</div>' +
      // '<div class="col-xs-3 text-right">' +
      //   '<button class="btn btn-xs btn-default" id="toggle-view">' +
      //     '<span class="glyphicon glyphicon-list"></span> List View' +
      //   '</button>' +
      // '</div>' +
      "</div>" +
      "</div>";
    itemsDiv.append(headerHtml);

    // Add items
    for (var i = 0; i < category.items.length; i++) {
      var item = category.items[i];
      var html =
        '<div class="col-sm-6 col-md-4" style="margin-bottom: 15px;">' +
        '<a class="thumbnail add-item" model-name="' +
        item.name +
        '" model-url="' +
        item.model +
        '" model-type="' +
        item.type +
        '" style="text-align: center; transition: all 0.2s ease;">' +
        '<img src="' +
        item.image +
        '" alt="Add Item" style="max-height: 120px; object-fit: cover;"> ' +
        '<div style="padding: 10px;">' +
        "<strong>" +
        item.name +
        "</strong>" +
        "</div>" +
        "</a>" +
        "</div>";
      itemsDiv.append(html);
    }

    // Add hover effects for items
    $(".add-item").hover(
      function () {
        $(this).css({
          transform: "translateY(-5px) scale(1.02)",
          "box-shadow": "0 4px 12px rgba(0,0,0,0.15)",
        });
      },
      function () {
        $(this).css({
          transform: "translateY(0) scale(1)",
          "box-shadow": "none",
        });
      }
    );
  }

  // Global format filter state
  var currentFormatFilter = "all";

  // Event handlers
  $(document).on("click", ".category-folder", function (e) {
    e.preventDefault();
    var categoryName = $(this).data("category");
    showCategoryItems(categoryName, currentFormatFilter);
  });

  $(document).on("click", "#back-to-categories", function (e) {
    e.preventDefault();
    showCategories(currentFormatFilter);
  });

  $(document).on("click", "#toggle-view", function (e) {
    e.preventDefault();
    useCategorySystem = !useCategorySystem;

    if (useCategorySystem) {
      if (currentCategory) {
        showCategoryItems(currentCategory, currentFormatFilter);
      } else {
        showCategories(currentFormatFilter);
      }
    } else {
      showOriginalItems();
    }
  });

  // Format filter event handlers
  $(document).on("click", 'input[name="format"]', function () {
    currentFormatFilter = $(this).val();

    if (currentCategory) {
      showCategoryItems(currentCategory, currentFormatFilter);
    } else {
      showCategories(currentFormatFilter);
    }
  });

  // Initialize based on configuration
  if (useCategorySystem) {
    showCategories();
  } else {
    showOriginalItems();
  }
});
