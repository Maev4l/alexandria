import webpack from 'webpack';
import { merge } from 'webpack-merge';

import baseConfig from './webpack.config.base.babel';

export default merge(baseConfig, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    port: 8084,
    historyApiFallback: true,
    client: {
      overlay: false,
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      __DEV__: true,
    }),
  ],
});
