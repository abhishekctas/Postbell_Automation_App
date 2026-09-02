const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

const defaultBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
    ? [config.resolver.blockList]
    : [];

// Exclude compiled native build artifacts and cache directories from Metro file watching
const nativeBuildDirsRegex = /.*[\/\\](android|ios)[\/\\](build|\.gradle)[\/\\].*/;
const rootNativeDirRegex = new RegExp(
  '^' + __dirname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/(android|ios)/.*'
);

config.resolver.blockList = [
  ...defaultBlockList,
  rootNativeDirRegex,
  nativeBuildDirsRegex,
];

module.exports = withNativeWind(config, {
  input: './global.css',
  inlineRem: 16,
});

