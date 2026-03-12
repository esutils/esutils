import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import pluginJest from 'eslint-plugin-jest';

export default defineConfig(
  // Global ignores configuration
  {
    ignores: [
      '**/build/**',
      '**/dist/**',
      '**/dist-webpack/**',
      '**/node_modules/**',
      '**/coverage/**',
      'packages/mqtt-packet/test/unsuback_test.ts',
      'packages/mqtt-packet/test/unsubscribe_test.ts',
    ],
  },
  tseslint.configs.recommendedTypeCheckedOnly,
  {
    plugins: { jest: pluginJest },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'inline-type-imports', // Enforces inline type modifiers
          prefer: 'type-imports', // Ensures you use import type when all imports are types
        },
      ],
    },
  },
);
