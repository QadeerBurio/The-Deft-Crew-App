// https://docs.expo.dev/guides/using-eslint/
// The ESLint flat config only. (Two Babel configs used to follow in this file; the last
// module.exports won, so ESLint got a Babel config and couldn't run. Babel never read this file:
// it uses babel-preset-expo by default, which adds the Reanimated plugin itself.)
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);
