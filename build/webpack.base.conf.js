const path = require('path')
const webpack = require('webpack')
const ProgressBarPlugin = require('progress-bar-webpack-plugin')

function resolve (dir) {
  return path.join(__dirname, '..', dir)
}

module.exports = {
  devtool: false,
  entry: {
    'ddvRestfulApiWxapp': resolve('lib/index.js')
  },
  output: {
    path: resolve('dist'),
    filename: '[name].js',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  resolve: {
    extensions: [
      '.js',
      '.json'
    ],
    alias: {// 注册模块，以后用的时候可以直接requier("模块名")
      '@': resolve('src')
    }
  },
  externals: [
  ],
  plugins: [
    new ProgressBarPlugin(),
    new webpack.optimize.ModuleConcatenationPlugin()
  ],
  module: {
    rules: [
      {
        test: /\.json$/,
        loaders: 'json-loader'
      },
      {
        test: /\.js$/,
        loaders: [
          'babel-loader?cacheDirectory=true',
          'eslint-loader'
        ],
        exclude: /node_modules/,
        include: [
          resolve('src')
        ]
      }
    ]
  },
  node: {
    // prevent webpack from injecting useless setImmediate polyfill because Vue
    // source contains it (although only uses it if it's native).
    setImmediate: false,
    // prevent webpack from injecting mocks to Node native modules
    // that does not make sense for the client
    dgram: 'empty',
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
    child_process: 'empty'
  }
}
