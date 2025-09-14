/**
 * Universal Model Loader (ES5, no bundlers)
 * - Legacy Three JSON v3.x (geometry)    → uses JSONLoader if present, else manual parser
 * - GLB/GLTF files                       → GLTFLoader if present, else iframe bridge
 * - GLB-in-JS UMD modules                → GLTFLoader if present, else iframe bridge
 *
 * The iframe bridge loads modern three@0.128 + GLTFLoader in isolation,
 * decodes a Mesh, and sends raw arrays back; we rebuild a legacy Mesh
 * in the page's (old) THREE namespace for Blueprint3D.
 */
(function (window) {
  'use strict';

  /* ---------- small utils ---------- */
  function filenameToGlobalName(filename) {
    var base = filename.split('/').pop().split('.')[0];
    var g = base.replace(/[^A-Za-z0-9_]/g, '_');
    if (/^[0-9]/.test(g)) g = '_' + g;
    return g;
  }
  function detectModelFormat(text) {
    var t = (text || '').trim();
    return t.charAt(0) === '{' ? 'json' : 'glb-in-js';
  }
  function fetchText(url) {
    // Use fetch if available, otherwise fallback to XMLHttpRequest
    if (typeof fetch !== 'undefined') {
      return fetch(url).then(function (r) {
        if (!r.ok) throw new Error('Fetch failed: ' + r.status + ' ' + r.statusText);
        return r.text();
      });
    } else {
      return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.onload = function() {
          if (xhr.status === 200) {
            resolve(xhr.responseText);
          } else {
            reject(new Error('XHR failed: ' + xhr.status + ' ' + xhr.statusText));
          }
        };
        xhr.onerror = function() {
          reject(new Error('XHR failed'));
        };
        xhr.send();
      });
    }
  }

  /* ---------- iframe bridge (modern GLTF decoder in isolation) ---------- */
  var GLTF_BRIDGE = null;
  function ensureBridge() {
    if (GLTF_BRIDGE) return Promise.resolve(GLTF_BRIDGE);
    return new Promise(function (resolve, reject) {
      var ifr = document.createElement('iframe');
      ifr.style.display = 'none';
      ifr.srcdoc =
        '<!doctype html><meta charset="utf-8">' +
        '<script src="https://unpkg.com/three@0.128.0/build/three.min.js"><\/script>' +
        '<script src="https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js"><\/script>' +
        '<script>' +
        '(function(){' +
        '  function firstMesh(o){var m=null;o.traverse(function(c){if(!m && c.isMesh){m=c;}});return m;}' +
        '  function pack(mesh){' +
        '    var g=mesh.geometry;' +
        '    var idx=g.index?g.index.array:null;' +
        '    var pos=g.attributes.position?g.attributes.position.array:null;' +
        '    var nor=g.attributes.normal?g.attributes.normal.array:null;' +
        '    var uv=g.attributes.uv?g.attributes.uv.array:null;' +
        '    var col=mesh.material&&mesh.material.color?mesh.material.color.getHex():0x8888ff;' +
        '    var mapSrc=(mesh.material&&mesh.material.map&&mesh.material.map.image)?(mesh.material.map.image.currentSrc||mesh.material.map.image.src||null):null;' +
        '    return {indices:idx,positions:pos,normals:nor,uvs:uv,color:col,mapSrc:mapSrc};' +
        '  }' +
        '  function post(id,payload,transfers){ parent.postMessage({__bridge:true,id:id,ok:true,payload:payload}, "*", transfers||[]); }' +
        '  function fail(id,msg){ parent.postMessage({__bridge:true,id:id,ok:false,error:msg+""},"*"); }' +
        '  window.addEventListener("message", function(e){' +
        '    var d=e.data||{}; if(!d.__askBridge) return;' +
        '    var id=d.id, cmd=d.cmd;' +
        '    try{' +
        '      if(cmd==="decode-glb-in-js"){' +
        '        var url=d.url, gname=d.globalName;' +
        '        var s=document.createElement("script"); s.src=url; s.onload=function(){' +
        '          var mod=window[gname]; if(!mod||typeof mod.load!=="function"){ fail(id,"Module load() missing"); return; }' +
        '          var loader = new THREE.GLTFLoader(); /* module may rely on it */' +
        '          Promise.resolve(mod.load(THREE)).then(function(obj){' +
        '            var root=obj&&obj.scene?obj.scene:obj; var m=firstMesh(root); if(!m){fail(id,"No mesh in model"); return;}' +
        '            var packd=pack(m); var transfers=[];' +
        '            if(packd.indices) transfers.push(packd.indices.buffer);' +
        '            if(packd.positions) transfers.push(packd.positions.buffer);' +
        '            if(packd.normals) transfers.push(packd.normals.buffer);' +
        '            if(packd.uvs) transfers.push(packd.uvs.buffer);' +
        '            post(id,packd,transfers);' +
        '          }, function(err){ fail(id,err); });' +
        '        }; s.onerror=function(){ fail(id,"Failed to load module script"); }; document.head.appendChild(s);' +
        '      } else if (cmd==="decode-gltf-like"){' +
        '        var l=new THREE.GLTFLoader();' +
        '        l.load(d.url, function(gltf){ var m=firstMesh(gltf.scene); if(!m){fail(id,"No mesh"); return;} var P=pack(m); var T=[]; if(P.indices)T.push(P.indices.buffer); if(P.positions)T.push(P.positions.buffer); if(P.normals)T.push(P.normals.buffer); if(P.uvs)T.push(P.uvs.buffer); post(id,P,T); }, function(){}, function(err){ fail(id,err); });' +
        '      }' +
        '    }catch(ex){ fail(id,ex); }' +
        '  });' +
        '})();' +
        '<\/script>';
      ifr.onload = function () {
        var idCounter = 1;
        function ask(cmd, data) {
          return new Promise(function (res, rej) {
            var id = idCounter++;
            function onMsg(ev) {
              var m = ev.data || {};
              if (!m.__bridge || m.id !== id) return;
              window.removeEventListener('message', onMsg);
              if (m.ok) res(m.payload);
              else rej(new Error(m.error || 'Bridge error'));
            }
            window.addEventListener('message', onMsg);
            ifr.contentWindow.postMessage(
              Object.assign({ __askBridge: true, id: id, cmd: cmd }, data || {}),
              '*'
            );
          });
        }
        GLTF_BRIDGE = {
          decodeGlbJs: function (url, globalName) { return ask('decode-glb-in-js', { url: url, globalName: globalName }); },
          decodeGltfLike: function (url) { return ask('decode-gltf-like', { url: url }); }
        };
        resolve(GLTF_BRIDGE);
      };
      ifr.onerror = reject;
      document.body.appendChild(ifr);
    });
  }

  /* ---------- build legacy THREE.Mesh from raw arrays ---------- */
  function meshFromArrays(THREE_NS, payload) {
    var indices = payload.indices ? (payload.indices.constructor === Uint32Array ? payload.indices : new Uint32Array(payload.indices)) : null;
    var positions = payload.positions ? (payload.positions.constructor === Float32Array ? payload.positions : new Float32Array(payload.positions)) : null;
    var uvs = payload.uvs ? (payload.uvs.constructor === Float32Array ? payload.uvs : new Float32Array(payload.uvs)) : null;

    var geom = new THREE_NS.Geometry();
    if (!positions || !indices) {
      return new THREE_NS.Mesh(
        new THREE_NS.BoxGeometry(1,1,1),
        new THREE_NS.MeshLambertMaterial({ color: payload.color || 0x8888ff, side: THREE_NS.DoubleSide })
      );
    }
    var vertCount = positions.length / 3;
    for (var i = 0; i < vertCount; i++) {
      geom.vertices.push(new THREE_NS.Vector3(
        positions[i*3+0], positions[i*3+1], positions[i*3+2]
      ));
    }
    geom.faceVertexUvs[0] = [];
    for (var f = 0; f < indices.length; f += 3) {
      var a = indices[f], b = indices[f+1], c = indices[f+2];
      geom.faces.push(new THREE_NS.Face3(a,b,c));
      if (uvs && uvs.length/2 >= vertCount) {
        geom.faceVertexUvs[0].push([
          new THREE_NS.Vector2(uvs[a*2+0], uvs[a*2+1]),
          new THREE_NS.Vector2(uvs[b*2+0], uvs[b*2+1]),
          new THREE_NS.Vector2(uvs[c*2+0], uvs[c*2+1])
        ]);
      }
    }
    geom.computeFaceNormals();
    geom.computeVertexNormals();

    var mat = new THREE_NS.MeshLambertMaterial({ color: payload.color || 0x8888ff, side: THREE_NS.DoubleSide });
    if (payload.mapSrc) {
      try {
        var tex = new THREE_NS.TextureLoader().load(payload.mapSrc);
        tex.flipY = false;
        mat.map = tex; mat.needsUpdate = true;
      } catch (e) {}
    }
    return new THREE_NS.Mesh(geom, mat);
  }

  /* ---------- main API ---------- */
  function loadAnyModel(url, opts) {
    opts = opts || {};
    var onProgress = opts.onProgress || function(){};

    return new Promise(function (resolve, reject) {
      if (typeof THREE === 'undefined') { reject(new Error('THREE.js is not loaded')); return; }

      var ext = url.split('.').pop().toLowerCase();

      // Native GLTF/GLB path if GLTFLoader exists
      if ((ext === 'gltf' || ext === 'glb') && typeof THREE.GLTFLoader !== 'undefined') {
        try {
          var loader = new THREE.GLTFLoader();
          loader.load(url, function (gltf) {
            resolve(gltf.scene || gltf.scenes && gltf.scenes[0] || gltf);
          }, function (xhr) {
            if (xhr && xhr.lengthComputable) onProgress(xhr.loaded, xhr.total);
          }, reject);
          return;
        } catch (e) { /* fall through */ }
      }

      // .js could be legacy JSON or GLB-in-JS
      if (ext === 'js') {
        fetchText(url).then(function (text) {
          var kind = detectModelFormat(text);

          if (kind === 'json') {
            if (typeof THREE.JSONLoader !== 'undefined') {
              var jl = new THREE.JSONLoader();
              jl.load(url, function (geometry, materials) {
                var mat;
                if (materials && materials.length) {
                  if (materials.length === 1) {
                    mat = materials[0];
                  } else {
                    // For Three.js r69, MultiMaterial should exist
                    if (typeof THREE.MultiMaterial !== 'undefined') {
                      mat = new THREE.MultiMaterial(materials);
                    } else {
                      // Fallback to first material
                      mat = materials[0] || new THREE.MeshLambertMaterial({ color: 0x888888 });
                    }
                  }
                } else {
                  mat = new THREE.MeshLambertMaterial({ color: 0x888888 });
                }
                resolve(new THREE.Mesh(geometry, mat));
              }, function (xhr) {
                if (xhr && xhr.lengthComputable) onProgress(xhr.loaded, xhr.total);
              }, reject);
            } else {
              try {
                var json = JSON.parse(text);
                var g = new THREE.Geometry(), v = json.vertices||[], f = json.faces||[], i=0;
                for (var k=0;k<v.length;k+=3) g.vertices.push(new THREE.Vector3(v[k],v[k+1],v[k+2]));
                while (i < f.length) {
                  var type = f[i++]; var isQuad = (type & 1)!==0;
                  if (isQuad) {
                    var a=f[i++], b=f[i++], c=f[i++], d=f[i++]; g.faces.push(new THREE.Face3(a,b,c)); g.faces.push(new THREE.Face3(a,c,d));
                  } else {
                    var a2=f[i++], b2=f[i++], c2=f[i++]; g.faces.push(new THREE.Face3(a2,b2,c2));
                  }
                  if (type & 2) i++;
                  if (type & 4) i += 1;
                  if (type & 8) i += isQuad?4:3;
                  if (type & 16) i += 1;
                  if (type & 32) i += isQuad?4:3;
                  if (type & 64) i += 1;
                  if (type & 128) i += isQuad?4:3;
                }
                g.computeFaceNormals(); g.computeVertexNormals();
                resolve(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x888888 })));
              } catch (e) { reject(e); }
            }
            return;
          }

          // GLB-in-JS UMD
          if (typeof THREE.GLTFLoader !== 'undefined') {
            try {
              var globalName = filenameToGlobalName(url);
              var s = document.createElement('script');
              s.src = url;
              s.onload = function () {
                try {
                  var mod = window[globalName];
                  if (!mod || typeof mod.load !== 'function') return reject(new Error('Module has no load()'));
                  Promise.resolve(mod.load(THREE)).then(function (obj) {
                    resolve(obj && obj.scene ? obj.scene : obj);
                  }, reject);
                } catch (ex) { reject(ex); }
              };
              s.onerror = function(){ reject(new Error('Failed to load module script ' + url)); };
              document.head.appendChild(s);
              return;
            } catch (e) { /* fall through to bridge */ }
          }

          // No GLTFLoader in page → use bridge
          ensureBridge().then(function (b) {
            return b.decodeGlbJs(url, filenameToGlobalName(url));
          }).then(function (payload) {
            resolve(meshFromArrays(THREE, payload));
          }).catch(reject);

        }).catch(reject);
        return;
      }

      // .glb/.gltf via bridge
      if (ext === 'glb' || ext === 'gltf') {
        ensureBridge().then(function (b) {
          return b.decodeGltfLike(url);
        }).then(function (payload) {
          resolve(meshFromArrays(THREE, payload));
        }).catch(reject);
        return;
      }

      reject(new Error('Unsupported model format: ' + ext));
    });
  }

  function addToScene(object3d, scene) {
    object3d.traverse && object3d.traverse(function (c) {
      if (c.isMesh) {
        c.castShadow = true; c.receiveShadow = true;
        if (c.material) {
          if (Array.isArray(c.material)) for (var i=0;i<c.material.length;i++) c.material[i].side = THREE.DoubleSide;
          else c.material.side = THREE.DoubleSide;
        }
      }
    });
    scene.add(object3d);
    return object3d;
  }

  function loadModelWithOverlay(url, scene, cbs) {
    cbs = cbs || {};
    var onStart = cbs.onStart || function(){}, onSuccess = cbs.onSuccess || function(){},
        onError = cbs.onError || function(){}, onProgress = cbs.onProgress || function(){}, onComplete = cbs.onComplete || function(){};
    onStart();
    loadAnyModel(url, { onProgress: onProgress })
      .then(function (obj) { addToScene(obj, scene); onSuccess(obj); })
      .catch(function (e) { console.error(e); onError(e); })
      .then(function () { onComplete(); });
  }

  window.ModelLoader = { loadAnyModel: loadAnyModel, addToScene: addToScene, loadModelWithOverlay: loadModelWithOverlay, filenameToGlobalName: filenameToGlobalName };
})(window);