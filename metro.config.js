const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

const defaultBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
    ? [config.resolver.blockList]
    : [];

// Exclude compiled native build artifacts and cache directories from Metro file watching
const nativeBuildDirsRegex = /.*[\/\\](android|ios)[\/\\](build|\.gradle|\.cxx|Pods)[\/\\].*/;

config.resolver.blockList = [...defaultBlockList, nativeBuildDirsRegex];

module.exports = withNativeWind(config, {
  input: './global.css',
  inlineRem: 16,
});
