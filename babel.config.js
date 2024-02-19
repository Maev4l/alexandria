module.exports = {
  presets: [
    ['module:metro-react-native-babel-preset', { useTransformReactJSXExperimental: true }],
    '@babel/preset-react',
    [
      '@babel/preset-env',
      {
        loose: true,
      },
    ],
  ],
  plugins: [
    [
      '@babel/plugin-transform-react-jsx',
      {
        runtime: 'automatic',
      },
    ],
    [
      'module-resolver',
      {
        alias: {
          '^react-native$': 'react-native-web',
        },
      },
    ],
    '@babel/plugin-transform-object-rest-spread',
    'react-native-web',
    // <--- Silence warnings from webpack -->
    ['@babel/plugin-transform-private-methods', { loose: true }],
    ['@babel/plugin-transform-private-property-in-object', { loose: true }],
    ['@babel/plugin-transform-class-properties', { loose: true }],
    // <--- Silence warnings from webpack -->
  ],
};
