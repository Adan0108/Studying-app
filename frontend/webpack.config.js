const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup:      './src/popup/index.jsx',
    options:    './src/options/Options.jsx',
    background: './src/background/background.js',
    timerBar:   './src/content/timerBar.js',
    webBlocker: './src/content/webBlocker.js',
    shimeji:    './src/content/shimeji.js'
  },
  output: {
    filename: '[name].bundle.js',
    path:     path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      { test: /\.jsx?$/,   exclude: /node_modules/, use: 'babel-loader' },
      { test: /\.css$/,    use: ['style-loader','css-loader'] },
      { test: /\.(png|gif)$/, use: 'file-loader' }
    ]
  },
  resolve: { extensions: ['.js','.jsx'] },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/popup.html',
      chunks:   ['popup'],
      filename: 'popup.html'
    }),
    new HtmlWebpackPlugin({
      template: './public/options.html',
      chunks:   ['options'],
      filename: 'options.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json' },
        { from: 'assets', to: 'assets' }
      ]
    })
  ],
  devServer: { static: './dist', hot: true }
};
