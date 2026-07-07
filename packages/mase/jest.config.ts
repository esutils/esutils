import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  verbose: true,
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { useESM: true }],
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(cjs|mts|mjs|([jt]sx?))$',
  transformIgnorePatterns: ['/node_modules/', '\\.pnp\\.[^\\/]+$', '/dist/'],
};
export default config;
