import path from 'path';
import url from 'url';
import { type Configuration } from 'webpack';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: Configuration = {
  entry: './examples/dns-proxy.ts',
  mode: 'development',
  target: 'node',
  module: {
    rules: [
      {
        test: /\.m?js/,
        resolve: {
          // https://webpack.js.org/configuration/module/#resolvefullyspecified
          fullySpecified: false,
        },
      }, {
        test: /\.m?tsx?$/,
        use: 'ts-loader',
      },
    ],
  },
  // https://github.com/webpack/webpack/issues/4899#issuecomment-609737316
  devtool: 'source-map',
  resolve: {
    extensions: ['.tsx', '.ts', '.mts', '.js', '.mjs'],
  },
  output: {
    filename: 'dns-proxy.cjs',
    path: path.resolve(__dirname, 'dist-webpack'),
  },
};
export default config;
