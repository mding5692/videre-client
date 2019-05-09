// webpack.config.js

var webpack = require('webpack');
var path = require('path');
var libraryName = 'Videre';
var outputFile = libraryName + '.js';

var config = {
  entry: __dirname + '/src/index.js',
  devtool: 'source-map',
  output: {
    path: __dirname + '/dist',
    filename: outputFile,
    library: libraryName,
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    loaders: [
        {
            loader: "babel-loader",

            // Skip any files outside of your project's `src` directory
            include: [
                path.resolve(__dirname, 'src'),
            ],

            // Only run `.js` and `.jsx` files through Babel
            test: /\.jsx?$/,

            // Options to configure babel with
            query: {
                presets: ['es2015']
            }
        },
    ]
  },
  resolve: {
    root: path.resolve('./src'),
    extensions: ['', '.js']
  }
};

module.exports = config;
