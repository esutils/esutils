const path = require('path');

module.exports = {
  extends: ['airbnb/base', 'airbnb-typescript/base'],
  plugins: ['jest'],
  env: {
    'jest/globals': true,
  },
  ignorePatterns: ['**/dist/**/*', '**/vendor/*.js'],
  overrides: [
    {
      files: ['packages/mqtt-packet/**/*.ts'],
      rules: {
        'no-bitwise': 'off',
      },
    },
  ],
  rules: {
    'import/no-extraneous-dependencies': [
      'off', // disable first
      // waiting https://github.com/import-js/eslint-plugin-import/issues/2430
      {
        packageDir: [
          path.join(__dirname, './packages/async-semaphore'),
          path.join(__dirname, './packages/deferred'),
          path.join(__dirname, './packages/delay'),
          path.join(__dirname, './packages/dns-packet'),
          path.join(__dirname, './packages/empty'),
          path.join(__dirname, './packages/invert'),
          path.join(__dirname, './packages/mqtt-client'),
          path.join(__dirname, './packages/mqtt-packet'),
        ],
      },
    ],
    "no-param-reassign": ["error", { "props": false }],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-underscore-dangle': [
      'error',
      {
        enforceInMethodNames: true,
        allowAfterThis: true,
      },
    ],
    'import/prefer-default-export': 'off',
  },
  parserOptions: {
    project: './tsconfig.json',
  },
};
