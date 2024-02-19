import { merge } from "webpack-merge";
import { InjectManifest } from "workbox-webpack-plugin";
import MomentLocalesPlugin from "moment-locales-webpack-plugin";
import path from "path";

import baseConfig from "./webpack.config.base.babel";

export default merge(baseConfig, {
  mode: "production",
  optimization: {
    minimize: true,
  },
  plugins: [
    new InjectManifest({
      swSrc: path.resolve(__dirname, "src", "src-sw.js"),
      swDest: "sw.js",
    }),
    new MomentLocalesPlugin({
      localesToKeep: ["fr"],
    }),
  ],
});
