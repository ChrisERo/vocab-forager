const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const pageScriptsDirectory = '../src/page-scripts';

module.exports = (env) => {
  let config = {
    mode: env.mode,
    entry: {
      background: path.resolve(__dirname, "..", "src", 'background-scripts', "background.ts"),
      content: path.resolve(__dirname, "..", "src", 'content-scripts', "main.ts"),
      "page-scripts/popup": path.resolve(__dirname, pageScriptsDirectory, "popup.ts"),
      "page-scripts/index": path.resolve(__dirname, pageScriptsDirectory, "index.ts"),
      "page-scripts/new-dict": path.resolve(__dirname, pageScriptsDirectory, "new-dict.ts"),
      "page-scripts/edit-dict": path.resolve(__dirname, pageScriptsDirectory, "edit-dict.ts"),
      "page-scripts/see-sites": path.resolve(__dirname, pageScriptsDirectory, "see-sites.ts"),
    },
    output: {
      path: path.resolve(__dirname, '..', 'extension'),
      filename: '[name].js',
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        { 
          test: /\.ts?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        }
      ],
    },

    plugins: [
      new CopyPlugin({
        patterns: [
          {from: ".", context: "public", globOptions: {ignore: ["**/*.xcf"]}}
        ],
      }),
    ], 
  }

  if (env.mode === 'development') {
    config['devtool'] = 'cheap-module-source-map';
  } else if (env.mode === 'production') {
    let copyLicense = new CopyPlugin({
      patterns: [
        {from: 'LICENSE.md'}
      ]
    });
    config['plugins'].push(copyLicense);
  }

  return config;
};
