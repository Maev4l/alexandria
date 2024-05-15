import webpack from 'webpack';

import path from 'path';
import CopyPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import process from 'child_process';
import MomentLocalesPlugin from 'moment-locales-webpack-plugin';

import config from './output.json';
import pack from './package.json';

const commitHash = process.execSync('git rev-parse HEAD').toString().trim();

const appDirectory = path.resolve(__dirname, './');

export default {
  target: 'web',
  entry: [path.join(appDirectory, 'src', 'index.web.js')],
  output: {
    filename: '[name].js',
    path: path.join(appDirectory, '.dist'),
    publicPath: '/',
    clean: true,
  },

  module: {
    rules: [
      {
        test: /\.(jpg|png|woff|woff2|eot|ttf|svg|gif|ico)$/,
        type: 'asset/resource',
      },
      {
        // We are going to update some kind of version in the service worker
        // so the PWA is going to self-update
        // see: https://stackoverflow.com/questions/49739438/when-and-how-does-a-pwa-update-itself#:~:text=In%20essence%2C%20there%20are%20only,a%20changed%20scope%20or%20start_url%20.
        test: /\.js$/,
        loader: 'string-replace-loader',
        options: {
          search: '__HASH_COMMIT__',
          replace: commitHash,
          flags: 'g',
        },
      },
      {
        test: /\.(js|jsx)$/,
        // Add every directory that needs to be compiled by Babel during the build.
        include: [
          path.resolve(appDirectory, 'src'),
          path.resolve(appDirectory, '..', '..', 'node_modules/react-native-vector-icons'),
          path.resolve(appDirectory, '..', '..', 'node_modules/react-native-web-refresh-control'),
        ],
        loader: 'esbuild-loader',
        options: {
          target: 'es2015',
          loader: 'jsx', // allow jsx in .js files
        },
      },
    ],
  },
  resolve: {
    // This will only alias the exact import "react-native"
    alias: {
      'react-native$': 'react-native-web',
    },
    // If you're working on a multi-platform React Native app, web-specific
    // module implementations should be written in files using the extension
    // `.web.js`.
    extensions: ['.web.js', '.js', '.jsx'],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: path.join(appDirectory, 'public', 'index.html'),
      filename: 'index.html',
      inject: 'head',
    }),
    new CopyPlugin({
      patterns: [
        path.join(appDirectory, 'public', 'favicon.ico'),
        path.join(appDirectory, 'public', 'favicon-16x16.png'),
        path.join(appDirectory, 'public', 'favicon-32x32.png'),
        path.join(appDirectory, 'public', 'logo144.svg'),
        path.join(appDirectory, 'public', 'logo144.png'),
        path.join(appDirectory, 'public', 'logo192.svg'),
        path.join(appDirectory, 'public', 'logo512.svg'),
        path.join(appDirectory, 'public', 'logo1024.svg'),
        path.join(appDirectory, 'public', 'manifest.json'),
      ],
    }),
    new webpack.DefinePlugin({
      'process.env': {
        clientId: JSON.stringify(config.alexandriaClientId),
        userPoolId: JSON.stringify(config.alexandriaUserPoolId),
        region: JSON.stringify('eu-central-1'),
        version: JSON.stringify(pack.version),
        commitHash: JSON.stringify(commitHash),
      },
    }),
    new MomentLocalesPlugin({
      localesToKeep: ['fr'],
    }),
    new webpack.ProvidePlugin({
      React: 'react', // autoimatically inject React in our components
    }),
  ],
};
