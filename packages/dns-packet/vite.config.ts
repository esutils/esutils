import path from 'node:path';
import url from 'node:url';
import { defineConfig } from 'vite';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  build: {
    ssr: path.resolve(__dirname, 'examples/dns-proxy.ts'),
    outDir: 'dist-vite',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    rollupOptions: {
      output: {
        format: 'cjs',
        entryFileNames: 'dns-proxy.cjs',
      },
    },
    target: 'node20',
  },
  ssr: {
    noExternal: [/@esutils\//],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.mts', '.js', '.mjs'],
  },
});
