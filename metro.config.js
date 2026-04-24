// Extends Expo's default Metro config to bundle 3D assets (GLB/GLTF/OBJ/HDR).
// Required so `require('@/assets/glb/*.glb')` resolves at runtime.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const EXTRA_ASSET_EXTS = ['glb', 'gltf', 'bin', 'obj', 'mtl', 'hdr', 'fbx'];

config.resolver.assetExts = Array.from(
  new Set([...(config.resolver.assetExts ?? []), ...EXTRA_ASSET_EXTS]),
);

module.exports = config;
