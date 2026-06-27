import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

export default defineConfig({
  plugins: [
    checker({
      typescript: {
        tsconfigPath: 'tsconfig.mjs.json',
      },
    }),
  ],
  build: {
    ssr: 'jest.config.ts',
    write: false,
    rollupOptions: {
      output: {
        format: 'es',
      },
    },
  },
});
