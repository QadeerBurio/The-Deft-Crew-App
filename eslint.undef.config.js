// eslint.undef.config.js (r8, owner): undefined names only, for app/src. A react-native API used without its import
// ("Property 'InteractionManager' doesn't exist") or a component used in JSX without its import fails the test run
// (tests/app/lint-undef.test.js). Expo's own config gives the parser and the React Native / Expo globals; every other
// rule is off here (style stays with `npm run lint`).
//   npx eslint -c eslint.undef.config.js app/src
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const parts = [expoConfig].flat(Infinity);
const off = {};
for (const c of parts) for (const k of Object.keys(c.rules || {})) off[k] = 'off';
// Expo adds the browser globals (1,000+) for every file. Several share a name with a React Native API (Keyboard, Image,
// Text, Animation...), so a missing import would pass: native files get only the globals below; *.web.* files keep them.
const BROWSER = parts.find((c) => Object.keys(c.languageOptions?.globals || {}).length > 500)?.languageOptions.globals || {};
const native = parts.map((c) => (c.languageOptions?.globals === BROWSER ? { ...c, languageOptions: { ...c.languageOptions, globals: {} } } : c));

module.exports = defineConfig([
  ...native,
  {
    files: ['app/src/**/*.{js,jsx,ts,tsx}'],
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    languageOptions: {
      globals: {
        __DEV__: 'readonly', require: 'readonly', module: 'writable', exports: 'writable', process: 'readonly', global: 'readonly',
        console: 'readonly', fetch: 'readonly', FormData: 'readonly', Headers: 'readonly', Request: 'readonly', Response: 'readonly',
        AbortController: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', Blob: 'readonly', FileReader: 'readonly',
        XMLHttpRequest: 'readonly', WebSocket: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly',
        clearInterval: 'readonly', setImmediate: 'readonly', clearImmediate: 'readonly', requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly', queueMicrotask: 'readonly', Promise: 'readonly', Symbol: 'readonly', Intl: 'readonly',
        atob: 'readonly', btoa: 'readonly', TextEncoder: 'readonly', TextDecoder: 'readonly', performance: 'readonly',
        alert: 'readonly', navigator: 'readonly', __dirname: 'readonly', Buffer: 'readonly',
        window: 'readonly', // React Native defines window (= global); localStorage etc. are not there, so code checks first
      },
    },
    rules: { ...off, 'no-undef': 'error', 'react/jsx-no-undef': 'error' },
  },
  { files: ['app/src/**/*.web.{js,jsx,ts,tsx}'], languageOptions: { globals: BROWSER } },
  { ignores: ['dist/*', 'node_modules/*'] },
]);
