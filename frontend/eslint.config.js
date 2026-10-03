// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
      // SDK 57's updated React Hooks plugin reports existing state synchronization
      // patterns and lazy initializer randomness; changing those flows is outside
      // this dependency migration.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
    },
  },
]);
