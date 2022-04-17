const path = require('path');

module.exports = {
  mode: "production",
  entry: {
    popup: "",
    backgorund: path.resolve(__dirname, "..", "src", "bg-wrapper.ts"),
  },
  output: {
    path: path.resolve(__dirname, '../dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      { 
        test: /\.ts?$/,
	use: 'ts-loader' 
	exclude: /node_modules/,
      }
    ],
  },

  plugins: [
    new CopyPlugin({
      patterns: [{from: ".", to: ".", context: "public"}]
    }),
  ], 
};
