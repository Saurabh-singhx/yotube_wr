const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude generated_apk folder from Metro bundler, watchman, and packaging
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []),
  /.*\/generated_apk\/.*/,
];

module.exports = config;
