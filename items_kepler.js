/**
 * Kepler Toilet Item Injector for Blueprint3D
 * Adds Kepler toilet to the items wrapper using existing example.js patterns
 */

$(document).ready(function() {
  console.log('Injecting Kepler items...');

  var itemsWrapper = $('#items-wrapper');

  if (itemsWrapper.length === 0) {
    console.warn('Items wrapper not found, cannot inject Kepler items');
    return;
  }

  // Create Kepler toilet item tiles (both .js and .gltf versions for testing)
  var keplerItems = [
    {
      modelUrl: 'example/models/js/Kepler Toilet Floor Standing.js',
      modelType: '1',
      modelName: 'Kepler Toilet Floor Standing (JS)',
      modelImage: 'example/models/js/Kepler Toilet Floor Standing.png'
    },
    {
      modelUrl: 'example/gltf/Kepler Toilet Floor Standing.gltf',
      modelType: '1',
      modelName: 'Kepler Toilet Floor Standing (GLTF)',
      modelImage: 'example/models/js/Kepler Toilet Floor Standing.png'
    },
    {
      modelUrl: 'example/models/js/Kepler Basin 70 Pedestal.js',
      modelType: '1',
      modelName: 'Kepler Basin 70 Pedestal',
      modelImage: 'example/models/js/Kepler Basin 70 Pedestal.png'
    }
  ];

  // Add each item
  keplerItems.forEach(function(item) {
    var tile = $('<div class="col-sm-4">' +
      '<a href="#" class="thumbnail add-item" ' +
         'model-url="' + item.modelUrl + '" ' +
         'model-type="' + item.modelType + '" ' +
         'model-name="' + item.modelName + '" ' +
         'model-image="' + item.modelImage + '">' +
        '<img src="' + item.modelImage + '" class="img-responsive" alt="' + item.modelName + '">' +
        '<div class="caption">' +
          '<small>' + item.modelName + '</small>' +
        '</div>' +
      '</a>' +
    '</div>');

    itemsWrapper.append(tile);
  });

  console.log('Kepler items injected successfully - existing example.js will handle clicks');
});

console.log('Kepler items script loaded');