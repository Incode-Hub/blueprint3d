# Adding GLTF Models to Blueprint3D

## Current Limitation

Blueprint3D uses **Three.js r69** (legacy version from 2014), which has limited support for modern GLTF files. The application currently works best with:

1. **Legacy Three.js JSON format** (`.js` files with embedded geometry)
2. **Three.js JSON v3 format** (`.json` files)

## Why GLTF Files Don't Work

The GLTF file you're trying to use (`Kepler Basin 70 with half pedestal (1).gltf`) has these issues:

1. **Draco Compression**: Uses `KHR_draco_mesh_compression` extension (required)
2. **Modern Format**: Designed for Three.js r128+, not compatible with r69
3. **BufferGeometry**: Creates `BufferGeometry` instead of legacy `Geometry`

### The Error

```
TypeError: Cannot read properties of undefined (reading 'attributes')
```

This occurs because Three.js r69 doesn't understand the modern geometry format.

## Solutions

### ✅ Option 1: Use Existing JSON Models (Recommended)

You already have working JSON models in `gltf/new/`:

- `keplertoiletFloorstanding.json`
- `keplerbasin70withhalfpedestal.json`

These work perfectly with Blueprint3D!

### Option 2: Convert GLTF to Legacy JSON

Use the **gltf-pipeline** tool to convert your GLTF files:

```bash
# Install the tool
npm install -g gltf-pipeline

# Remove Draco compression
gltf-pipeline -i "Kepler Basin 70 with half pedestal (1).gltf" -o kepler_uncompressed.gltf --draco.uncompressed

# Then use a Three.js converter to create legacy JSON
# (This requires additional tools or custom scripts)
```

### Option 3: Export from Blender

If you have access to the original 3D model in Blender:

1. Open the model in Blender
2. Install the **Three.js Exporter** addon (for legacy format)
3. Export as **Three.js JSON (Legacy)**
4. Use the `.js` format with embedded geometry

### Option 4: Use Online Converters

Try these online tools:

- [gltf.report](https://gltf.report/) - Analyze and optimize GLTF
- [Babylon.js Sandbox](https://sandbox.babylonjs.com/) - Can export to various formats

## Current Items Configuration

Your `items.ts` currently includes:

```typescript
{
    name: "Kepler Toilet Floor Standing",
    image: "gltf/new/Kepler FS Bowl ceramic Handle-1000x808.jpg",
    model: "gltf/new/keplertoiletFloorstanding.json",
    type: "1",
    format: "json",  // ✅ This works!
},
{
    name: "Kepler Basin 70 with half pedestal",
    image: "gltf/new/Ceramics_Kepler Pedestal-1000x808.png",
    model: "gltf/new/keplerbasin70withhalfpedestal.json",
    type: "1",
    format: "json",  // ✅ This works!
},
```

## Recommendation

**Stick with the JSON format models** you already have. They work reliably with Blueprint3D's legacy Three.js version. If you need to add more models, convert them to the Three.js JSON v3 format before adding them to the application.
