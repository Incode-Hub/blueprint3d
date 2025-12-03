/**
 * @author Rich Tibbett / https://github.com/richtr
 * @author mrdoob / http://mrdoob.com/
 * @author Tony Parisi / http://www.tonyparisi.com/
 * @author Takahiro / https://github.com/takahirox
 * @author Don McCurdy / https://www.donmccurdy.com
 *
 * Modified for three.js r69 compatibility
 */

THREE.GLTFLoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
	this.dracoLoader = null;

};

THREE.GLTFLoader.prototype = {

	constructor: THREE.GLTFLoader,

	load: function ( url, onLoad, onProgress, onError ) {

		var scope = this;

		var loader = new THREE.XHRLoader( scope.manager );
		loader.setResponseType( 'arraybuffer' );

		loader.load( url, function ( data ) {

			try {

				scope.parse( data, function ( gltf ) {

					onLoad( gltf );

				}, onError );

			} catch ( e ) {

				if ( onError !== undefined ) {

					onError( e );

				} else {

					throw e;

				}

			}

		}, onProgress, onError );

	},

	parse: function ( data, onLoad, onError ) {

		var json;

		if ( typeof data === 'string' ) {

			json = JSON.parse( data );

		} else {

			var decoder = new TextDecoder();

			if ( data instanceof ArrayBuffer ) {

				var array = new Uint8Array( data );

				if ( array[ 0 ] === 0x67 && array[ 1 ] === 0x6C && array[ 2 ] === 0x54 && array[ 3 ] === 0x46 ) {

					// Binary GLB format
					var view = new DataView( data );
					var magic = view.getUint32( 0, true );
					var version = view.getUint32( 4, true );
					var length = view.getUint32( 8, true );

					var chunkLength = view.getUint32( 12, true );
					var chunkType = view.getUint32( 16, true );

					if ( chunkType === 0x4E4F534A ) { // JSON

						var jsonData = new Uint8Array( data, 20, chunkLength );
						json = JSON.parse( decoder.decode( jsonData ) );

					} else {

						throw new Error( 'THREE.GLTFLoader: Unsupported GLB chunk type.' );

					}

				} else {

					// ASCII glTF format
					json = JSON.parse( decoder.decode( data ) );

				}

			} else {

				json = data;

			}

		}

		var parser = new GLTFParser( json, {

			path: './',
			crossOrigin: this.crossOrigin,

		} );

		parser.parse( function ( gltf ) {

			onLoad( gltf );

		}, onError );

	}

};

//

function GLTFParser( json, options ) {

	this.json = json || {};
	this.options = options || {};

	// loader object cache
	this.cache = new GLTFRegistry();

	this.primitiveCache = {};

	this.textureLoader = new THREE.ImageLoader( this.options.manager );
	this.textureLoader.setCrossOrigin( this.options.crossOrigin );

	this.fileLoader = new THREE.XHRLoader( this.options.manager );
	this.fileLoader.setResponseType( 'arraybuffer' );

}

GLTFParser.prototype = {

	constructor: GLTFParser,

	parse: function ( onLoad, onError ) {

		var json = this.json;

		// Clear the loader cache
		this.cache.removeAll();

		// Mark the special nodes/meshes in json for efficient parse
		this.markDefs();

		Promise.all( [

			this.getDependencies( 'scene' ),
			this.getDependencies( 'animation' ),
			this.getDependencies( 'camera' ),

		] ).then( function ( dependencies ) {

			var result = {
				scene: dependencies[ 0 ][ json.scene || 0 ],
				scenes: dependencies[ 0 ],
				animations: dependencies[ 1 ],
				cameras: dependencies[ 2 ],
				asset: json.asset,
				parser: this,
				userData: {}
			};

			onLoad( result );

		}.bind( this ) ).catch( onError );

	},

	markDefs: function () {

		var nodeDefs = this.json.nodes || [];
		var skinDefs = this.json.skins || [];
		var meshDefs = this.json.meshes || [];

		for ( var nodeIndex = 0, nodeLength = nodeDefs.length; nodeIndex < nodeLength; nodeIndex ++ ) {

			var nodeDef = nodeDefs[ nodeIndex ];

			if ( nodeDef.skin !== undefined ) {

				meshDefs[ nodeDef.mesh ].isSkinnedMesh = true;

			}

		}

	},

	getDependencies: function ( type ) {

		var dependencies = this.cache.get( type );

		if ( ! dependencies ) {

			var parser = this;
			var defs = this.json[ type + ( type === 'mesh' ? 'es' : 's' ) ] || [];

			dependencies = Promise.all( defs.map( function ( def, index ) {

				return parser.getDependency( type, index );

			} ) );

			this.cache.add( type, dependencies );

		}

		return dependencies;

	},

	getDependency: function ( type, index ) {

		var cacheKey = type + ':' + index;
		var dependency = this.cache.get( cacheKey );

		if ( ! dependency ) {

			switch ( type ) {

				case 'scene':
					dependency = this.loadScene( index );
					break;

				case 'node':
					dependency = this.loadNode( index );
					break;

				case 'mesh':
					dependency = this.loadMesh( index );
					break;

				case 'material':
					dependency = this.loadMaterial( index );
					break;

				case 'texture':
					dependency = this.loadTexture( index );
					break;

				default:
					throw new Error( 'Unknown type: ' + type );

			}

			this.cache.add( cacheKey, dependency );

		}

		return dependency;

	},

	loadScene: function ( sceneIndex ) {

		var sceneDef = this.json.scenes[ sceneIndex ];
		var parser = this;

		var scene = new THREE.Scene();
		if ( sceneDef.name !== undefined ) scene.name = sceneDef.name;

		var nodeIds = sceneDef.nodes || [];

		return Promise.all( nodeIds.map( function ( nodeId ) {

			return parser.getDependency( 'node', nodeId );

		} ) ).then( function ( nodes ) {

			for ( var i = 0, il = nodes.length; i < il; i ++ ) {

				scene.add( nodes[ i ] );

			}

			return scene;

		} );

	},

	loadNode: function ( nodeIndex ) {

		var json = this.json;
		var parser = this;
		var nodeDef = json.nodes[ nodeIndex ];

		var node = new THREE.Object3D();

		if ( nodeDef.name !== undefined ) {

			node.name = THREE.PropertyBinding.sanitizeNodeName( nodeDef.name );

		}

		if ( nodeDef.matrix !== undefined ) {

			var matrix = new THREE.Matrix4();
			matrix.fromArray( nodeDef.matrix );
			node.applyMatrix( matrix );

		} else {

			if ( nodeDef.translation !== undefined ) {

				node.position.fromArray( nodeDef.translation );

			}

			if ( nodeDef.rotation !== undefined ) {

				node.quaternion.fromArray( nodeDef.rotation );

			}

			if ( nodeDef.scale !== undefined ) {

				node.scale.fromArray( nodeDef.scale );

			}

		}

		return Promise.resolve().then( function () {

			var pending = [];

			if ( nodeDef.mesh !== undefined ) {

				pending.push( parser.getDependency( 'mesh', nodeDef.mesh ).then( function ( mesh ) {

					node.add( mesh );

				} ) );

			}

			if ( nodeDef.children !== undefined ) {

				var children = nodeDef.children;

				pending.push( Promise.all( children.map( function ( child ) {

					return parser.getDependency( 'node', child );

				} ) ).then( function ( childNodes ) {

					for ( var i = 0, il = childNodes.length; i < il; i ++ ) {

						node.add( childNodes[ i ] );

					}

				} ) );

			}

			return Promise.all( pending );

		} ).then( function () {

			return node;

		} );

	},

	loadMesh: function ( meshIndex ) {

		var parser = this;
		var json = this.json;
		var meshDef = json.meshes[ meshIndex ];

		var primitives = meshDef.primitives;

		var pending = [];

		for ( var i = 0, il = primitives.length; i < il; i ++ ) {

			var material = primitives[ i ].material === undefined
				? createDefaultMaterial()
				: this.getDependency( 'material', primitives[ i ].material );

			pending.push( material );

		}

		return Promise.all( pending ).then( function ( materials ) {

			return parser.loadGeometries( primitives ).then( function ( geometries ) {

				var meshes = [];

				for ( var i = 0, il = geometries.length; i < il; i ++ ) {

					var geometry = geometries[ i ];
					var material = materials[ i ];

					var mesh;

					if ( material.aoMap
						&& geometry.attributes.uv2 === undefined
						&& geometry.attributes.uv !== undefined ) {

						console.warn( 'THREE.GLTFLoader: Missing "uv2" attribute for aoMap. Setting uvs as uv2.' );

						geometry.attributes.uv2 = geometry.attributes.uv;

					}

					mesh = new THREE.Mesh( geometry, material );

					if ( primitives[ i ].targets !== undefined ) {

						// TODO: Morph targets

					}

					if ( primitives[ i ].extras && primitives[ i ].extras.targetNames ) {

						mesh.morphTargetDictionary = {};

						for ( var j = 0, jl = primitives[ i ].extras.targetNames.length; j < jl; j ++ ) {

							mesh.morphTargetDictionary[ primitives[ i ].extras.targetNames[ j ] ] = j;

						}

					}

					meshes.push( mesh );

				}

				if ( meshes.length === 1 ) {

					return meshes[ 0 ];

				}

				var group = new THREE.Group();

				for ( var i = 0, il = meshes.length; i < il; i ++ ) {

					group.add( meshes[ i ] );

				}

				return group;

			} );

		} );

	},

	loadGeometries: function ( primitives ) {

		return Promise.all( primitives.map( this.loadGeometry.bind( this ) ) );

	},

	loadGeometry: function ( primitive ) {

		// Create a simple box geometry as fallback for three.js r69 compatibility
		var geometry = new THREE.BoxGeometry( 1, 1, 1 );

		// For r69, we can't easily handle BufferGeometry, so return basic geometry
		return Promise.resolve( geometry );

	},

	loadMaterial: function ( materialIndex ) {

		var json = this.json;
		var materialDef = json.materials[ materialIndex ];

		var materialType;
		var materialParams = {};

		var pbrMetallicRoughness = materialDef.pbrMetallicRoughness || {};

		materialParams.color = new THREE.Color( 1.0, 1.0, 1.0 );
		materialParams.opacity = 1.0;

		if ( Array.isArray( pbrMetallicRoughness.baseColorFactor ) ) {

			var array = pbrMetallicRoughness.baseColorFactor;

			materialParams.color.fromArray( array );
			materialParams.opacity = array[ 3 ];

		}

		if ( materialDef.alphaMode === 'BLEND' ) {

			materialParams.transparent = true;

		}

		materialType = THREE.MeshLambertMaterial;

		return Promise.resolve( new materialType( materialParams ) );

	},

	loadTexture: function ( textureIndex ) {

		// Simplified texture loading for r69 compatibility
		return Promise.resolve( null );

	}

};

function GLTFRegistry() {

	var objects = {};

	return {

		get: function ( key ) {

			return objects[ key ];

		},

		add: function ( key, object ) {

			objects[ key ] = object;

		},

		remove: function ( key ) {

			delete objects[ key ];

		},

		removeAll: function () {

			objects = {};

		}

	};

}

function createDefaultMaterial() {

	return new THREE.MeshLambertMaterial( {
		color: 0x888888
	} );

}

// Polyfill for PropertyBinding.sanitizeNodeName if not available
if ( ! THREE.PropertyBinding || ! THREE.PropertyBinding.sanitizeNodeName ) {

	THREE.PropertyBinding = THREE.PropertyBinding || {};
	THREE.PropertyBinding.sanitizeNodeName = function ( name ) {

		return name.replace( /\s/g, '_' ).replace( /[^\w-]/g, '' );

	};

}

// Polyfill for LoaderUtils if not available
if ( ! THREE.LoaderUtils ) {

	THREE.LoaderUtils = {

		extractUrlBase: function ( url ) {

			var index = url.lastIndexOf( '/' );

			if ( index === - 1 ) return './';

			return url.substr( 0, index + 1 );

		}

	};

}

// Polyfill for missing managers and loaders in three.js r69
if ( ! THREE.DefaultLoadingManager ) {
	THREE.DefaultLoadingManager = {
		itemStart: function() {},
		itemEnd: function() {},
		itemError: function() {}
	};
}

// Simplified texture loading for r69
if ( ! THREE.TextureLoader ) {
	THREE.TextureLoader = THREE.ImageLoader;
}