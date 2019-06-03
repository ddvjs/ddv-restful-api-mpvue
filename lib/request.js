// eslint-disable-next-line no-undef
module.exports = request
// 发送请求
function request (url, body, method, headers, api) {
  method = method || 'GET'
  var _headers = {}

  for (var key in headers) {
    if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
      _headers[key] = headers[key]
    }
  }

  return requestRun(url, body, method, _headers, api)
    .catch(function (e) {
      e.uri = url
      e.method = method
      e.headers = _headers
      url = body = method = _headers = void 0
      return Promise.reject(e)
    })
    .then(function (res) {
      url = body = method = _headers = void 0
      return res
    })
}

// 执行发送请求
function requestRun (url, body, method, headers, api) {
  if (api && typeof api.wsRequest === 'function') {
    var cb = api.wsRequest(url, body, method, headers)

    if (cb && (typeof cb.then === 'function')) {
      return cb
    }
    return Promise.resolve(cb || {})
  } else {
    var serverRes = {}
    return new Promise(function (resolve, reject) {
      wx.request({
        url: url,
        data: body,
        method: method,
        header: headers,
        success: function (res) {
          serverRes.status = res.status || serverRes.status
          serverRes.body = res.data
          serverRes.statusCode = res.statusCode
          serverRes.statusMessage = res.statusText || res.statusMessage
          serverRes.status = serverRes.statusMessage

          serverRes.statusCode >= 200 && serverRes.statusCode < 300 ? resolve(serverRes) : reject(serverRes)
        },
        fail: function (res) {
          serverRes.statusCode = 0
          serverRes.statusMessage = res.errMsg
          serverRes.status = 'wx request fail'
          reject(serverRes)
        }
      })
    })
  }
}
