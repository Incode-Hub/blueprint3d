const fs = require('fs');
const path = require('path');

// Read the GLTF file
const gltfPath = path.join(__dirname, 'public', 'gltf', 'Kepler Basin 70 with half pedestal (1).gltf');
const outputPath = path.join(__dirname, 'public', 'gltf', 'kepler_basin_70_pedestal_converted.json');

console.log('Reading GLTF file:', gltfPath);

const gltfData = JSON.parse(fs.readFileSync(gltfPath, 'utf8'));

// Extract the first mesh from GLTF
const mesh = gltfData.meshes && gltfData.meshes[0];
if (!mesh) {
  console.error('No mesh found in GLTF file');
  process.exit(1);
}

const primitive = mesh.primitives && mesh.primitives[0];
if (!primitive) {
  console.error('No primitive found in mesh');
  process.exit(1);
}

// Get accessors
const positionAccessor = gltfData.accessors[primitive.attributes.POSITION];
const normalAccessor = primitive.attributes.NORMAL !== undefined ? gltfData.accessors[primitive.attributes.NORMAL] : null;
const uvAccessor = primitive.attributes.TEXCOORD_0 !== undefined ? gltfData.accessors[primitive.attributes.TEXCOORD_0] : null;
const indexAccessor = primitive.indices !== undefined ? gltfData.accessors[primitive.indices] : null;

// Get buffer views
const positionBufferView = gltfData.bufferViews[positionAccessor.bufferView];
const normalBufferView = normalAccessor ? gltfData.bufferViews[normalAccessor.bufferView] : null;
const uvBufferView = uvAccessor ? gltfData.bufferViews[uvAccessor.bufferView] : null;
const indexBufferView = indexAccessor ? gltfData.bufferViews[indexAccessor.bufferView] : null;

// Get buffer data
const bufferUri = gltfData.buffers[0].uri;
let bufferData;

if (bufferUri.startsWith('data:')) {
  // Base64 encoded
  const base64Data = bufferUri.split(',')[1];
  bufferData = Buffer.from(base64Data, 'base64');
} else {
  // External file
  const bufferPath = path.join(path.dirname(gltfPath), bufferUri);
  bufferData = fs.readFileSync(bufferPath);
}

// Extract positions
const positions = [];
const positionOffset = positionBufferView.byteOffset || 0;
for (let i = 0; i < positionAccessor.count; i++) {
  const offset = positionOffset + i * 12; // 3 floats * 4 bytes
  positions.push(
    bufferData.readFloatLE(offset),
    bufferData.readFloatLE(offset + 4),
    bufferData.readFloatLE(offset + 8)
  );
}

// Extract normals if available
let normals = [];
if (normalAccessor && normalBufferView) {
  const normalOffset = normalBufferView.byteOffset || 0;
  for (let i = 0; i < normalAccessor.count; i++) {
    const offset = normalOffset + i * 12;
    normals.push(
      bufferData.readFloatLE(offset),
      bufferData.readFloatLE(offset + 4),
      bufferData.readFloatLE(offset + 8)
    );
  }
}

// Extract UVs if available
let uvs = [];
if (uvAccessor && uvBufferView) {
  const uvOffset = uvBufferView.byteOffset || 0;
  for (let i = 0; i < uvAccessor.count; i++) {
    const offset = uvOffset + i * 8; // 2 floats * 4 bytes
    uvs.push(
      bufferData.readFloatLE(offset),
      bufferData.readFloatLE(offset + 4)
    );
  }
}

// Extract indices
let indices = [];
if (indexAccessor && indexBufferView) {
  const indexOffset = indexBufferView.byteOffset || 0;
  const componentType = indexAccessor.componentType;
  
  for (let i = 0; i < indexAccessor.count; i++) {
    let index;
    if (componentType === 5123) { // UNSIGNED_SHORT
      index = bufferData.readUInt16LE(indexOffset + i * 2);
    } else if (componentType === 5125) { // UNSIGNED_INT
      index = bufferData.readUInt32LE(indexOffset + i * 4);
    } else {
      index = bufferData.readUInt8(indexOffset + i);
    }
    indices.push(index);
  }
}

// Create legacy Three.js JSON format
const legacyJson = {
  metadata: {
    version: 3,
    type: "Geometry",
    generator: "GLTF Converter"
  },
  vertices: positions,
  normals: normals.length > 0 ? normals : undefined,
  uvs: uvs.length > 0 ? [uvs] : undefined,
  faces: []
};

// Convert indices to faces
for (let i = 0; i < indices.length; i += 3) {
  const a = indices[i];
  const b = indices[i + 1];
  const c = indices[i + 2];
  
  // Face type: 0 = triangle, 2 = has material, 8 = has UVs, 32 = has vertex normals
  let faceType = 0;
  if (uvs.length > 0) faceType |= 8;
  if (normals.length > 0) faceType |= 32;
  
  legacyJson.faces.push(faceType, a, b, c);
  
  if (uvs.length > 0) {
    legacyJson.faces.push(a, b, c); // UV indices
  }
  if (normals.length > 0) {
    legacyJson.faces.push(a, b, c); // Normal indices
  }
}

// Write output
fs.writeFileSync(outputPath, JSON.stringify(legacyJson, null, 2));
console.log('Converted GLTF to legacy JSON:', outputPath);
console.log('Vertices:', positions.length / 3);
console.log('Faces:', indices.length / 3);
