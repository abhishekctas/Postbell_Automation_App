const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

const defaultBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
    ? [config.resolver.blockList]
    : [];

config.resolver.blockList = [...defaultBlockList, /.*\/android\/.*/, /.*\/ios\/.*/];

module.exports = withNativeWind(config, {
  input: './global.css',
  inlineRem: 16,
});
