// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Production bundles (minified by terser): console.log / console.info / console.debug calls are dropped.
// console.warn and console.error stay (crash and error reports still see them). Development is unchanged.
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  compress: {
    ...(config.transformer.minifierConfig?.compress || {}),
    pure_funcs: ['console.log', 'console.info', 'console.debug'],
  },
};

module.exports = config;
