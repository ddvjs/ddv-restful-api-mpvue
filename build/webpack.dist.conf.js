const webpack = require('webpack')
const merge = require('webpack-merge')
const baseWebpackConfig = require('./webpack.base.conf')
const devWebpackConfig = merge(baseWebpackConfig, {
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      output: {
        comments: false // remove all comments
      },
      compress: {
        warnings: false
      }
    })
  ]
})
module.exports = devWebpackConfig
