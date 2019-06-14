var ddvRestFulApi = require('./api.js')
var onAccessKey = require('./lib/onAccessKey.js')
var request = require('./lib/request.js')
var upload = require('./lib/upload/index.js')
var util = require('ddv-restful-api/util')
var session = require('./lib/session.js')

module.exports = ddvRestFulApi.getApi(function (api) {
  api.setHeadersPrefix('x-ddv-')
  api.onAccessKey = onAccessKey
  api.request = request
  api.uploadApi = function (data) {
    return upload(data, api)
  }
  api.util = Object.assign(api.util || {}, util)
  api.session = session
  // eslint-disable-next-line no-undef
  if (typeof define !== 'undefined' && typeof requirejs !== 'undefined') {
    // eslint-disable-next-line no-undef
    define(ddvRestFulApi)
  }
  if (typeof window !== 'undefined' && window.window === window) {
    window.ddvRestFulApi = ddvRestFulApi
  }
})
module.exports['default'] = module.exports
