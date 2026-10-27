const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite en web carga SQLite compilado a WebAssembly.
config.resolver.assetExts.push('wasm');

module.exports = config;
