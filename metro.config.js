const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

const defaultBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
    ? [config.resolver.blockList]
    : [];

const rootNativeDirRegex = new RegExp(
  '^' + __dirname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/(android|ios)/.*'
);
config.resolver.blockList = [...defaultBlockList, rootNativeDirRegex];

module.exports = withNativeWind(config, {
  input: './global.css',
  inlineRem: 16,
});
