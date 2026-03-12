import type { Config } from '@jest/types';

// Sync object
const config: Config.InitialOptions = {
  verbose: true,
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    // Process ts/tsx with ts-jest
    '^.+\\.[tj]sx?$': ['ts-jest', { useESM: true }],
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(mts|mjs|([jt]sx?))$',
  transformIgnorePatterns: ['/node_modules/', '\\.pnp\\.[^\\/]+$', '/dist/'],
};
export default config;
