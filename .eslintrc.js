const path = require('path');

module.exports = {
  extends: ['airbnb/base', 'airbnb-typescript/base'],
  plugins: ['jest'],
  env: {
    'jest/globals': true,
  },
  rules: {
    'import/no-extraneous-dependencies': [
      'off', // disable first
      // waiting https://github.com/import-js/eslint-plugin-import/issues/2430
      {
        packageDir: [
          path.join(__dirname, './packages/async-semaphore'),
          path.join(__dirname, './packages/deferred'),
          path.join(__dirname, './packages/delay'),
        ],
      },
    ],
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
