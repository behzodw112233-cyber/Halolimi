const expo = require('eslint-config-expo/flat');

module.exports = [
  ...expo,
  {
    settings: {
      'import/resolver': {
        node: {
          paths: ['.', '../../node_modules'],
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    rules: {
      'import/no-unresolved': 'off',
    },
  },
];
