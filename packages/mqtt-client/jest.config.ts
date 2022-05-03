import type { Config } from '@jest/types';

// Sync object
const config: Config.InitialOptions = {
  verbose: true,
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      diagnostics: {
        ignoreCodes: ['TS151001'],
      },
    },
  },
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(mjs|[jt]sx?)$',
  moduleFileExtensions: ['cjs', 'js', 'jsx', 'ts', 'tsx', 'mjs'],
  transformIgnorePatterns: ['/node_modules/', '\\.pnp\\.[^\\/]+$', '/dist/'],
};
export default config;
