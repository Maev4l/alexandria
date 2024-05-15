import webpack from 'webpack';
import { merge } from 'webpack-merge';
import { InjectManifest } from 'workbox-webpack-plugin';
import MomentLocalesPlugin from 'moment-locales-webpack-plugin';
import { EsbuildPlugin } from 'esbuild-loader';
import path from 'path';

import baseConfig from './webpack.config.base.babel';

export default merge(baseConfig, {
  mode: 'production',
  optimization: {
    minimizer: [
      new EsbuildPlugin({
        target: 'es2015', // Syntax to compile
      }),
    ],
  },
  plugins: [
    new InjectManifest({
      swSrc: path.resolve(__dirname, 'src', 'src-sw.js'),
      swDest: 'sw.js',
    }),
    new MomentLocalesPlugin({
      localesToKeep: ['fr'],
    }),
    new webpack.DefinePlugin({
      __DEV__: false,
    }),
  ],
});
