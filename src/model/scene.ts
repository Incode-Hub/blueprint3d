/// <reference path="../../lib/three.d.ts" />
/// <reference path="../../lib/jQuery.d.ts" />
/// <reference path="../core/utils.ts" />
/// <reference path="../items/factory.ts" />
/// <reference path="../three/loaders/gltf-loader.ts" />

module BP3D.Model {
  /**
   * The Scene is a manager of Items and also links to a ThreeJS scene.
   */
  export class Scene {

    /** The associated ThreeJS scene. */
    private scene: THREE.Scene;

    /** Validate and fix geometry for Three.js v0.69 compatibility */
    private validateGeometry(geometry: THREE.Geometry): boolean {
      if (!geometry) {
        console.warn('Null geometry detected');
        return false;
      }

      // Check if geometry has the required properties
      if (!geometry.vertices || !geometry.faces) {
        console.warn('Geometry missing vertices or faces');
        return false;
      }

      // Ensure geometry is properly computed
      try {
        if (geometry.vertices.length > 0 && geometry.faces.length > 0) {
          geometry.computeFaceNormals();
          geometry.computeVertexNormals();
          geometry.computeBoundingBox();
          geometry.verticesNeedUpdate = true;
        }
        return true;
      } catch (error) {
        console.error('Error validating geometry:', error);
        return false;
      }
    }

    /** */
    private items: Items.Item[] = [];

    /** */
    public needsUpdate = false;

    /** The Json loader. */
    private loader: THREE.JSONLoader;

    /** */
    private itemLoadingCallbacks = $.Callbacks();

    /** Item */
    private itemLoadedCallbacks = $.Callbacks();

    /** Item */
    private itemRemovedCallbacks = $.Callbacks();

    /**
     * Constructs a scene.
     * @param model The associated model.
     * @param textureDir The directory from which to load the textures.
     */
    constructor(private model: Model, private textureDir: string) {
      this.scene = new THREE.Scene();

      // init item loader
      this.loader = new THREE.JSONLoader();
      this.loader.crossOrigin = "";
    }

    /** Adds a non-item, basically a mesh, to the scene.
     * @param mesh The mesh to be added.
     */
    public add(mesh: THREE.Mesh) {
      this.scene.add(mesh);
    }

    /** Removes a non-item, basically a mesh, from the scene.
     * @param mesh The mesh to be removed.
     */
    public remove(mesh: THREE.Mesh) {
      this.scene.remove(mesh);
      Core.Utils.removeValue(this.items, mesh);
    }

    /** Create a simple fallback item when GLTF loading fails */
    private createFallbackItem(itemType: number, metadata, position: THREE.Vector3, rotation: number, scale: THREE.Vector3, fixed: boolean) {
      console.log('Creating fallback item due to GLTF loading failure');

      try {
        // Create a simple red box as fallback
        var fallbackGeometry = new THREE.BoxGeometry(1, 1, 1);

        // Validate the fallback geometry
        if (!this.validateGeometry(fallbackGeometry)) {
          console.error('Even fallback geometry is invalid, skipping item creation');
          return;
        }

        var fallbackMaterial = new THREE.MeshLambertMaterial({
          color: 0xff0000, // Red to indicate it's a fallback
          transparent: true,
          opacity: 0.7
        });

        var item = new (Items.Factory.getClass(itemType))(
          this.model,
          metadata, fallbackGeometry,
          fallbackMaterial,
          position, rotation, scale
        );

        item.fixed = fixed || false;
        this.items.push(item);
        this.add(item);
        item.initObject();
        this.itemLoadedCallbacks.fire(item);

        console.log('Fallback item created successfully');

      } catch (fallbackError) {
        console.error('Failed to create fallback item:', fallbackError);
        // Don't add anything to the scene if we can't even create a fallback
      }
    }

    /** Gets the scene.
     * @returns The scene.
     */
    public getScene(): THREE.Scene {
      return this.scene;
    }

    /** Gets the items.
     * @returns The items.
     */
    public getItems(): Items.Item[] {
      return this.items;
    }

    /** Gets the count of items.
     * @returns The count.
     */
    public itemCount(): number {
      return this.items.length
    }

    /** Removes all items. */
    public clearItems() {
      var items_copy = this.items
      var scope = this;
      this.items.forEach((item) => {
        scope.removeItem(item, true);
      });
      this.items = []
    }

    /**
     * Removes an item.
     * @param item The item to be removed.
     * @param dontRemove If not set, also remove the item from the items list.
     */
    public removeItem(item: Items.Item, dontRemove?: boolean) {
      dontRemove = dontRemove || false;
      // use this for item meshes
      this.itemRemovedCallbacks.fire(item);
      item.removed();
      this.scene.remove(item);
      if (!dontRemove) {
        Core.Utils.removeValue(this.items, item);
      }
    }

    /**
     * Creates an item and adds it to the scene.
     * @param itemType The type of the item given by an enumerator.
     * @param fileName The name of the file to load.
     * @param metadata TODO
     * @param position The initial position.
     * @param rotation The initial rotation around the y axis.
     * @param scale The initial scaling.
     * @param fixed True if fixed.
     */
    public addItem(itemType: number, fileName: string, metadata, position: THREE.Vector3, rotation: number, scale: THREE.Vector3, fixed: boolean) {
      itemType = itemType || 1;
      var scope = this;

      this.itemLoadingCallbacks.fire();

      // Check if this is a GLTF/GLB file
      if (Three.Loaders.isGLTFFile(fileName)) {
        // Handle GLTF loading
        var gltfOptions: Three.Loaders.GLTFLoadOptions = {
          castShadow: true,
          receiveShadow: true
        };

        // Apply height scaling if specified in metadata
        if (metadata && metadata.height) {
          gltfOptions.scaleInches = metadata.height;
        }

        Three.Loaders.loadGLTF(fileName, gltfOptions)
          .then(function(object3d: THREE.Object3D) {
            console.log('GLTF loaded successfully:', fileName);

            try {
              // Validate the loaded GLTF object
              if (!object3d) {
                throw new Error('GLTF object is null or undefined');
              }

              // Create a wrapper mesh that will act as the item
              var bbox = new THREE.Box3().setFromObject(object3d);
              var size = new THREE.Vector3();
              size.subVectors(bbox.max, bbox.min);

              // Ensure minimum size to prevent zero-dimension geometry
              size.x = Math.max(size.x, 0.1);
              size.y = Math.max(size.y, 0.1);
              size.z = Math.max(size.z, 0.1);

              console.log('GLTF object size:', size);

              // Create a simple box geometry that matches the GLTF bounds
              var wrapperGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);

              // Validate and fix the geometry
              if (!scope.validateGeometry(wrapperGeometry)) {
                console.error('Failed to create valid wrapper geometry, using fallback');
                wrapperGeometry = new THREE.BoxGeometry(1, 1, 1);
                scope.validateGeometry(wrapperGeometry);
              }

              var wrapperMaterial = new THREE.MeshLambertMaterial({
                color: 0x888888,
                transparent: true,
                opacity: 0,
                visible: false
              });

              // Create item using the factory
              var item = new (Items.Factory.getClass(itemType))(
                scope.model,
                metadata, wrapperGeometry,
                wrapperMaterial,
                position, rotation, scale
              );

              // Validate the GLTF object before adding
              var hasValidGeometry = false;
              object3d.traverse(function(child) {
                if (child instanceof THREE.Mesh && child.geometry) {
                  var geom = <any>child.geometry; // Cast to any for Three.js v0.69 compatibility
                  if (geom.vertices && geom.vertices.length > 0) {
                    hasValidGeometry = true;
                  }
                }
              });

              if (hasValidGeometry) {
                // Add the GLTF object as a child of the item
                item.add(object3d);

                // Reset GLTF object position since it's now a child
                object3d.position.set(0, 0, 0);

                console.log('GLTF object added to item successfully');
              } else {
                console.warn('GLTF object has no valid geometry, using wrapper only');
              }

              item.fixed = fixed || false;
              scope.items.push(item);
              scope.add(item);
              item.initObject();
              scope.itemLoadedCallbacks.fire(item);

              console.log('GLTF item added to scene successfully');

            } catch (itemCreationError) {
              console.error('Error creating GLTF item:', itemCreationError);
              // Fall back to simple box item
              scope.createFallbackItem(itemType, metadata, position, rotation, scale, fixed);
            }
          })
          .catch(function(error) {
            console.error('Failed to load GLTF model:', fileName, error);
            // Fall back to simple box item
            scope.createFallbackItem(itemType, metadata, position, rotation, scale, fixed);
          });
      } else {
        // Original JSON loading path
        var loaderCallback = function (geometry: THREE.Geometry, materials: THREE.Material[]) {
          var item = new (Items.Factory.getClass(itemType))(
            scope.model,
            metadata, geometry,
            new THREE.MeshFaceMaterial(materials),
            position, rotation, scale
          );
          item.fixed = fixed || false;
          scope.items.push(item);
          scope.add(item);
          item.initObject();
          scope.itemLoadedCallbacks.fire(item);
        }

        this.loader.load(
          fileName,
          loaderCallback,
          undefined // TODO_Ekki
        );
      }
    }
  }
}
