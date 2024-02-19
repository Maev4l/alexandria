module.exports = {
  extends: ['airbnb', 'prettier'],
  settings: {
    'import/resolver': {
      webpack: {
        config: './packages/web-client/webpack.config.base.babel.js',
      },
    },
  },
  env: {
    browser: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    sourceType: 'module',
  },
  rules: {
    'no-bitwise': 'off',
    'react/forbid-prop-types': 'off',
    'react/require-default-props': 'off',
    'jsx-a11y/label-has-associated-control': 'off',
    'jsx-a11y/label-has-for': 'off',
    'jsx-a11y/alt-text': 'off',
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx'] }],
    'react/prop-types': 'off',
    'import/prefer-default-export': 'off',
    'react/function-component-definition': [2, { namedComponents: 'arrow-function' }],
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off',
    'jsx-a11y/anchor-is-valid': 'off',
    'react/jsx-fragments': 'off',
    'react/jsx-props-no-spreading': [
      2,
      {
        custom: 'ignore',
      },
    ],
    'react/no-unstable-nested-components': 'off',
  },
};
